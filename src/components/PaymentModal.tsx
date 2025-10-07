import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@meshsdk/react";
import { Transaction } from "@meshsdk/core";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (txHash: string) => void;
  duration: number;
  prompt: string;
  size: string;
}

interface PriceData {
  adaPrice: number;
  totalCostADA: number;
  totalCostUSD: number;
  duration: number;
  baseCostADA: number;
  perSecondCostUSD: number;
}

const RECEIVING_ADDRESS =
  "addr1qxtne8wp4qdmc9trp7zaaj9fzvxwhpm7veykwu9cdkk7y9m7wsx98ff5dmlg7fufan2thc3uf9yz7mrq56frvhc0mmaqgyjsld";

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  duration,
  prompt,
  size,
}: PaymentModalProps) {
  const { wallet, connected } = useWallet();
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setTxHash] = useState<string | null>(null);

  const fetchPriceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/calculate-price?duration=${duration}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPriceData(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch price data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [duration]);

  // Fetch price data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPriceData();
    }
  }, [isOpen, duration, fetchPriceData]);

  const handlePayment = async () => {
    if (!wallet || !connected || !priceData) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Create transaction
      const tx = new Transaction({ initiator: wallet });

      // Add payment to receiving address
      tx.sendLovelace(
        RECEIVING_ADDRESS,
        Math.floor(priceData.totalCostADA * 1000000).toString() // Convert ADA to lovelace
      );

      // Build and sign transaction
      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      setTxHash(txHash);

      // Process payment on backend
      const paymentResponse = await fetch("/api/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash,
          duration,
          prompt,
          size,
          expectedAmount: Math.floor(priceData.totalCostADA * 1000000),
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.error || "Payment processing failed");
      }

      // Wait for payment confirmation
      await waitForPaymentConfirmation(txHash);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed");
      console.error("Payment error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const waitForPaymentConfirmation = async (txHash: string) => {
    console.log(
      "⏳ [PaymentModal] Starting to wait for payment confirmation..."
    );
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        console.log(
          `🔄 [PaymentModal] Checking payment (attempt ${
            attempts + 1
          }/${maxAttempts})...`
        );
        const response = await fetch(`/api/check-payment?txHash=${txHash}`);
        const data = await response.json();
        console.log("📨 [PaymentModal] Response:", data);

        if (data.confirmed) {
          console.log(
            "✅ [PaymentModal] Payment confirmed! Triggering completion callback..."
          );
          onPaymentComplete(txHash);
          return;
        }

        console.log(
          `⏳ [PaymentModal] Not confirmed yet, waiting 5s... (${
            data.error || "pending"
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      } catch (err) {
        console.error("❌ [PaymentModal] Error checking payment status:", err);
        attempts++;
      }
    }

    console.error("❌ [PaymentModal] Payment confirmation timeout!");
    throw new Error("Payment confirmation timeout");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Payment Required</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : priceData ? (
          <div className="space-y-4">
            {/* Price breakdown */}
            <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Base cost:</span>
                <span className="text-white">{priceData.baseCostADA} ADA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration ({duration}s):</span>
                <span className="text-white">
                  {(
                    ((priceData.totalCostADA - priceData.baseCostADA) *
                      1000000) /
                    1000000
                  ).toFixed(6)}{" "}
                  ADA
                </span>
              </div>
              <div className="border-t border-zinc-700 pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Total:</span>
                  <span className="text-blue-400">
                    {priceData.totalCostADA.toFixed(6)} ADA
                  </span>
                </div>
                <div className="text-right text-xs text-gray-400">
                  ≈ ${priceData.totalCostUSD.toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Receiving address */}
            <div className="bg-zinc-800 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">
                Receiving Address:
              </div>
              <div className="text-xs text-gray-300 font-mono break-all">
                {RECEIVING_ADDRESS}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Payment button */}
            <button
              onClick={handlePayment}
              disabled={!connected || isProcessing}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>
                    Processing Payment
                    <span
                      className="inline-block animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    >
                      .
                    </span>
                    <span
                      className="inline-block animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    >
                      .
                    </span>
                    <span
                      className="inline-block animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    >
                      .
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  Pay {priceData.totalCostADA.toFixed(6)} ADA (No Refunds)
                </>
              )}
            </button>

            {!connected && (
              <p className="text-center text-sm text-gray-400">
                Please connect your wallet first
              </p>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            Failed to load price data
          </div>
        )}
      </div>
    </div>
  );
}
