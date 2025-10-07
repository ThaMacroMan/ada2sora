import type { NextApiRequest, NextApiResponse } from "next";

type PaymentRequest = {
  txHash: string;
  duration: number;
  prompt: string;
  size: string;
  image?: string;
  expectedAmount: number;
};

type PaymentResponse = {
  success: boolean;
  txHash?: string;
  error?: string;
};

// Store pending payments (in production, use a database)
const pendingPayments = new Map<
  string,
  {
    txHash: string;
    duration: number;
    prompt: string;
    size: string;
    image?: string;
    timestamp: number;
    confirmed: boolean;
    expectedAmount: number;
    verifiedAmount?: number;
  }
>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { txHash, duration, prompt, size, image, expectedAmount }: PaymentRequest = req.body;

    if (!txHash || !duration || !prompt || !expectedAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: txHash, duration, prompt, expectedAmount",
      });
    }

    // Store the payment request
    pendingPayments.set(txHash, {
      txHash,
      duration,
      prompt,
      size,
      image,
      timestamp: Date.now(),
      confirmed: false,
      expectedAmount,
    });

    return res.status(200).json({
      success: true,
      txHash,
    });
  } catch (error: unknown) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payment",
    });
  }
}

// Helper function to check payment status
export function getPaymentStatus(txHash: string) {
  const payment = pendingPayments.get(txHash);
  return payment ? { ...payment } : null;
}

// Helper function to clean up old payments
export function cleanupOldPayments() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [txHash, payment] of pendingPayments.entries()) {
    if (payment.timestamp < oneHourAgo) {
      pendingPayments.delete(txHash);
    }
  }
}
