import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "Video ID is required" });
    }

    console.log(`🎬 Proxying video content for: ${videoId}`);

    // Get the video content from OpenAI
    const videoResponse = await openai.videos.downloadContent(videoId);

    // Set appropriate headers
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // Stream the video content to the client
    if (videoResponse.body) {
      const reader = videoResponse.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    res.end();
  } catch (error: any) {
    console.error("Error proxying video:", error);
    return res.status(500).json({
      error: error?.message || "Failed to proxy video content",
    });
  }
}
