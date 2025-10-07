import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type StatusResponse = {
  status: string;
  progress?: number;
  error?: string;
  errorMessage?: string | null;
  videoUrl?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ status: "error", error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ status: "error", error: "OpenAI API key not configured" });
    }

    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res
        .status(400)
        .json({ status: "error", error: "Video ID is required" });
    }

    console.log(`📊 Checking status for video: ${videoId}`);
    const video = await openai.videos.retrieve(videoId);
    console.log(
      `✅ Status: ${video.status}, Progress: ${(video as any).progress || 0}`
    );

    // Log full video object for debugging
    console.log("📋 Full video object:", JSON.stringify(video, null, 2));

    // If failed, log the full error details
    if (video.status === "failed") {
      console.error(
        "❌ Video failed. Full details:",
        JSON.stringify(video, null, 2)
      );
    }

    // Get the video URL if completed
    let videoUrl = undefined;
    if (video.status === "completed") {
      try {
        // The video object should have a url property when completed
        videoUrl = (video as any).url;
        if (videoUrl) {
          console.log(`🔗 Video URL: ${videoUrl}`);
        } else {
          console.log("⚠️ No video URL found in video object");
        }
      } catch (error) {
        console.error("Error getting video URL:", error);
      }
    }

    return res.status(200).json({
      status: video.status,
      progress: (video as any).progress || 0,
      errorMessage: (video as any).error?.message || null,
      videoUrl: videoUrl,
    });
  } catch (error: any) {
    console.error("Error checking video status:", error);
    return res.status(500).json({
      status: "error",
      error: error?.message || "Failed to check video status",
    });
  }
}
