import type { NextApiRequest, NextApiResponse } from "next";
import { getPaymentStatus } from "./process-payment";
import { verifyPayment } from "@/lib/blockfrost";

type PaymentStatusResponse = {
  confirmed: boolean;
  txHash?: string;
  amount?: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentStatusResponse>
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ confirmed: false, error: "Method not allowed" });
  }

  try {
    const { txHash } = req.query;

    if (!txHash || typeof txHash !== "string") {
      return res.status(400).json({
        confirmed: false,
        error: "Transaction hash is required",
      });
    }

    const payment = getPaymentStatus(txHash);

    // If payment exists in our system and is already confirmed, return cached result
    if (payment?.confirmed) {
      return res.status(200).json({
        confirmed: true,
        txHash: payment.txHash,
        amount: payment.verifiedAmount,
      });
    }

    // Verify on blockchain using Blockfrost
    // Even if we don't have local record, we can verify the transaction exists
    const expectedAmount = payment?.expectedAmount || 0;
    const verification = await verifyPayment(txHash, expectedAmount);

    if (verification.confirmed && payment) {
      // Update payment status in our system if we have the record
      payment.confirmed = true;
      payment.verifiedAmount = verification.amount;
    }

    return res.status(200).json({
      confirmed: verification.confirmed,
      txHash: txHash,
      amount: verification.amount,
      error: verification.error,
    });
  } catch (error: unknown) {
    console.error("❌ [check-payment] Error:", error);
    return res.status(500).json({
      confirmed: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check payment status",
    });
  }
}
