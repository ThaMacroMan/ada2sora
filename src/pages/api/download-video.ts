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

    console.log(`🎬 Downloading video: ${videoId}`);

    // Download the video content using the SDK
    const content = await openai.videos.downloadContent(videoId);
    const arrayBuffer = await content.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      `✅ Video downloaded successfully, size: ${buffer.length} bytes`
    );

    // Set appropriate headers for video streaming
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="video-${videoId}.mp4"`
    );

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error("Error downloading video:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to download video",
    });
  }
}
