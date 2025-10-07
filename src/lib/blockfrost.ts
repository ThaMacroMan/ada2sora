import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

if (!process.env.BLOCKFROST_MAINNET_PROJECTID) {
  throw new Error(
    "BLOCKFROST_MAINNET_PROJECTID is not set in environment variables"
  );
}

export const blockfrost = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_MAINNET_PROJECTID,
});

export const RECEIVING_ADDRESS =
  "addr1qxtne8wp4qdmc9trp7zaaj9fzvxwhpm7veykwu9cdkk7y9m7wsx98ff5dmlg7fufan2thc3uf9yz7mrq56frvhc0mmaqgyjsld";

export async function verifyPayment(
  txHash: string,
  expectedAmountLovelace: number
): Promise<{ confirmed: boolean; amount?: number; error?: string }> {
  try {
    // Get transaction details
    const tx = await blockfrost.txs(txHash);

    // Check if transaction is confirmed (has at least 1 confirmation)
    if (!tx) {
      return { confirmed: false, error: "Transaction not found on blockchain" };
    }

    // Get transaction UTxOs to verify the payment
    const txUtxos = await blockfrost.txsUtxos(txHash);

    // Check if any output goes to our receiving address with correct amount
    const paymentOutput = txUtxos.outputs.find(
      (output) => output.address === RECEIVING_ADDRESS
    );

    if (!paymentOutput) {
      return { confirmed: false, error: "Payment not sent to correct address" };
    }

    // Get the ADA amount (lovelace)
    const amountLovelace = parseInt(
      paymentOutput.amount.find((a) => a.unit === "lovelace")?.quantity || "0"
    );

    // Verify amount (allow 1% variance for fees)
    // If expectedAmount is 0, skip amount verification (just verify transaction exists)
    if (expectedAmountLovelace > 0) {
      const minAmount = expectedAmountLovelace * 0.99;
      if (amountLovelace < minAmount) {
        return {
          confirmed: false,
          amount: amountLovelace,
          error: `Insufficient payment amount. Expected: ${expectedAmountLovelace}, Received: ${amountLovelace}`,
        };
      }
    }

    console.log("✅ [Blockfrost] Payment verified successfully!");
    return { confirmed: true, amount: amountLovelace };
  } catch (error: unknown) {
    console.error("❌ [Blockfrost] Verification error:", error);
    return {
      confirmed: false,
      error:
        error instanceof Error ? error.message : "Failed to verify transaction",
    };
  }
}
