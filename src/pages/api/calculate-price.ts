import type { NextApiRequest, NextApiResponse } from "next";

type PriceResponse = {
  adaPrice: number;
  totalCostADA: number;
  totalCostUSD: number;
  duration: number;
  baseCostADA: number;
  perSecondCostUSD: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PriceResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      adaPrice: 0,
      totalCostADA: 0,
      totalCostUSD: 0,
      duration: 0,
      baseCostADA: 0,
      perSecondCostUSD: 0,
      error: "Method not allowed",
    });
  }

  try {
    const { duration } = req.query;
    const videoDuration = parseInt(duration as string) || 4;

    // Constants
    const BASE_COST_ADA = 1; // 1 ADA base cost
    const PER_SECOND_COST_USD = 0.1; // 10 cents per second

    // Get ADA price from CoinGecko
    const coingeckoResponse = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd"
    );

    if (!coingeckoResponse.ok) {
      throw new Error("Failed to fetch ADA price from CoinGecko");
    }

    const priceData = await coingeckoResponse.json();
    const adaPrice = priceData.cardano.usd;

    // Calculate costs
    const perSecondCostADA = PER_SECOND_COST_USD / adaPrice;
    const totalCostADA = BASE_COST_ADA + perSecondCostADA * videoDuration;
    const totalCostUSD =
      BASE_COST_ADA * adaPrice + PER_SECOND_COST_USD * videoDuration;

    return res.status(200).json({
      adaPrice,
      totalCostADA: Math.round(totalCostADA * 1000000) / 1000000, // Round to 6 decimal places
      totalCostUSD: Math.round(totalCostUSD * 100) / 100, // Round to 2 decimal places
      duration: videoDuration,
      baseCostADA: BASE_COST_ADA,
      perSecondCostUSD: PER_SECOND_COST_USD,
    });
  } catch (error: unknown) {
    console.error("Error calculating price:", error);
    return res.status(500).json({
      adaPrice: 0,
      totalCostADA: 0,
      totalCostUSD: 0,
      duration: 0,
      baseCostADA: 0,
      perSecondCostUSD: 0,
      error:
        error instanceof Error ? error.message : "Failed to calculate price",
    });
  }
}
