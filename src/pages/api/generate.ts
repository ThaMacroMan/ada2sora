import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import formidable from "formidable";
import { getPaymentStatus } from "./process-payment";
import { verifyPayment } from "@/lib/blockfrost";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle form data
  },
};

type GenerateResponse = {
  videoId?: string;
  videoUrl?: string;
  error?: string;
  paymentRequired?: boolean;
};

// Helper to parse form data
const parseForm = (
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: 10 * 1024 * 1024,
    });
    form.parse(
      req,
      (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      }
    );
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Parse form data
    const { fields } = await parseForm(req);

    const prompt = Array.isArray(fields.prompt)
      ? fields.prompt[0]
      : fields.prompt;

    const size = Array.isArray(fields.size) ? fields.size[0] : fields.size;

    const seconds = Array.isArray(fields.seconds)
      ? fields.seconds[0]
      : fields.seconds;

    const txHash = Array.isArray(fields.txHash)
      ? fields.txHash[0]
      : fields.txHash;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Check if payment is confirmed
    if (!txHash) {
      console.log("❌ [generate] No txHash provided");
      return res.status(402).json({
        error: "Payment required",
        paymentRequired: true,
      });
    }

    console.log("🔍 [generate] Verifying payment for txHash:", txHash);

    // First check local cache
    const payment = getPaymentStatus(txHash);
    if (payment?.confirmed) {
      console.log("✅ [generate] Payment confirmed (from cache)");
    } else {
      // If not in cache or not confirmed, verify on blockchain
      console.log(
        "🔗 [generate] Checking blockchain for payment verification..."
      );
      const verification = await verifyPayment(txHash, 0);

      if (!verification.confirmed) {
        console.log(
          "❌ [generate] Payment not confirmed on blockchain:",
          verification.error
        );
        return res.status(402).json({
          error: verification.error || "Payment not confirmed",
          paymentRequired: true,
        });
      }

      console.log("✅ [generate] Payment confirmed on blockchain!");
    }

    // Prepare request parameters
    const generateParams = {
      model: "sora-2" as const,
      prompt: prompt.trim(),
      seconds: (seconds || "4") as "4" | "8" | "12",
      size: size || "1280x720", // Default to 720p landscape if not specified
    };

    console.log("🚀 Starting video generation with params:", generateParams);

    // Generate video with Sora
    console.log("📹 Calling openai.videos.create...");
    const video = await openai.videos.create(
      generateParams as unknown as Parameters<typeof openai.videos.create>[0]
    );
    console.log("✅ Video job created:", JSON.stringify(video, null, 2));

    // Return the video ID for frontend to handle
    console.log("✨ Returning video ID");
    return res.status(200).json({ videoId: video.id });
  } catch (error: unknown) {
    console.error("Error generating video:", error);

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to generate video",
    });
  }
}
