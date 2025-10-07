import { useState } from "react";
import Head from "next/head";
import { MeshProvider } from "@meshsdk/react";
import WalletConnection from "@/components/WalletConnection";
import PaymentModal from "@/components/PaymentModal";

function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState("1280x720");
  const [videoDuration, setVideoDuration] = useState("4");
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  const handleWalletConnect = () => {
    setWalletConnected(true);
  };

  const handleWalletDisconnect = () => {
    setWalletConnected(false);
    setPaymentTxHash(null);
  };

  const handlePaymentComplete = (txHash: string) => {
    console.log(
      "🎉 [index] Payment complete! Starting video generation with txHash:",
      txHash
    );
    setPaymentTxHash(txHash);
    setShowPaymentModal(false);
    console.log("📹 [index] Calling handleGenerateWithTx()...");
    handleGenerateWithTx(txHash);
  };

  const handleGenerateWithTx = async (txHash: string) => {
    console.log("🎬 [handleGenerateWithTx] Called with txHash:", txHash);

    if (!prompt.trim()) {
      console.log("⚠️ [handleGenerateWithTx] No prompt, returning");
      return;
    }

    if (!walletConnected) {
      console.log("⚠️ [handleGenerateWithTx] Wallet not connected");
      setError("Please connect your wallet first");
      return;
    }

    console.log(
      "✅ [handleGenerateWithTx] All checks passed, starting generation..."
    );
    setIsGenerating(true);
    setError(null);
    setGenerationStatus("Starting");

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("size", videoSize);
      formData.append("seconds", videoDuration);
      formData.append("txHash", txHash);

      console.log(
        "📡 [handleGenerateWithTx] Sending request to /api/generate..."
      );
      // Step 1: Start the video generation
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(
        "📨 [handleGenerateWithTx] Generate API response:",
        response.status,
        data
      );

      if (!response.ok) {
        if (data.paymentRequired) {
          setShowPaymentModal(true);
          return;
        }
        throw new Error(data.error || "Failed to generate video");
      }

      if (!data.videoId) {
        console.error("No videoId in response:", data);
        throw new Error("No video ID returned from API");
      }

      const videoId = data.videoId;
      console.log("Video generation started:", videoId);

      // Step 2: Poll for video completion
      setGenerationStatus("Generating");

      // Poll for video completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (60 * 5s intervals)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks

        try {
          const statusResponse = await fetch(
            `/api/video-status?videoId=${videoId}`
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            setGenerationStatus("Complete!");
            // Step 3: Use the actual video URL from OpenAI or fallback to proxy
            const videoUrl = `/api/video-proxy?videoId=${videoId}`;
            setVideoUrl(videoUrl);
            return;
          } else if (statusData.status === "failed") {
            throw new Error(
              statusData.errorMessage || "Video generation failed"
            );
          }

          // Still processing, continue waiting
          attempts++;
        } catch (error) {
          console.error("Error checking video status:", error);
          attempts++;
        }
      }

      // If we get here, we've exceeded max attempts
      throw new Error("Video generation timed out. Please try again.");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate video";
      setError(errorMessage);
      console.error("Error generating video:", err);
      if (err instanceof Error) {
        console.error("Error stack:", err.stack);
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  const handleVideoSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value;
    setVideoSize(newSize);
  };

  const handleGenerate = async () => {
    console.log("🎬 [handleGenerate] Called with:", {
      prompt,
      walletConnected,
      paymentTxHash,
    });

    if (!prompt.trim()) {
      console.log("⚠️ [handleGenerate] No prompt, returning");
      return;
    }

    if (!walletConnected) {
      console.log("⚠️ [handleGenerate] Wallet not connected");
      setError("Please connect your wallet first");
      return;
    }

    if (!paymentTxHash) {
      console.log("💰 [handleGenerate] No payment, showing payment modal");
      setShowPaymentModal(true);
      return;
    }

    console.log(
      "✅ [handleGenerate] All checks passed, starting generation..."
    );
    setIsGenerating(true);
    setError(null);
    setGenerationStatus("Starting");

    try {
      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("size", videoSize);
      formData.append("seconds", videoDuration);
      formData.append("txHash", paymentTxHash);

      console.log("📡 [handleGenerate] Sending request to /api/generate...");
      // Step 1: Start the video generation
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(
        "📨 [handleGenerate] Generate API response:",
        response.status,
        data
      );

      if (!response.ok) {
        if (data.paymentRequired) {
          setShowPaymentModal(true);
          return;
        }
        throw new Error(data.error || "Failed to generate video");
      }

      if (!data.videoId) {
        console.error("No videoId in response:", data);
        throw new Error("No video ID returned from API");
      }

      const videoId = data.videoId;
      console.log("Video generation started:", videoId);

      // Step 2: Poll for video completion
      setGenerationStatus("Generating");

      // Poll for video completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (60 * 5s intervals)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks

        try {
          const statusResponse = await fetch(
            `/api/video-status?videoId=${videoId}`
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            setGenerationStatus("Complete!");
            // Step 3: Use the actual video URL from OpenAI or fallback to proxy
            const videoUrl = `/api/video-proxy?videoId=${videoId}`;
            setVideoUrl(videoUrl);
            return;
          } else if (statusData.status === "failed") {
            throw new Error(
              statusData.errorMessage || "Video generation failed"
            );
          }

          // Still processing, continue waiting
          attempts++;
        } catch (error) {
          console.error("Error checking video status:", error);
          attempts++;
        }
      }

      // If we get here, we've exceeded max attempts
      throw new Error("Video generation timed out. Please try again.");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate video";
      setError(errorMessage);
      console.error("Error generating video:", err);
      if (err instanceof Error) {
        console.error("Error stack:", err.stack);
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sora-video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading video:", err);
      setError("Failed to download video");
    }
  };

  const handleShareToTwitter = () => {
    if (!videoUrl) return;
    const text = encodeURIComponent(
      `Check out this video I created with Sora! ${prompt}\n\nVideo: ${videoUrl}\n\n#AI #Sora #Cardano`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleCopyLink = async () => {
    if (!videoUrl) return;
    // If it's already a full URL (from OpenAI), use it directly
    // Otherwise, prepend the origin for localhost proxy
    const fullUrl = videoUrl.startsWith("http")
      ? videoUrl
      : `${window.location.origin}${videoUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      // You could add a toast notification here
      console.log("Video link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleReset = () => {
    setVideoUrl(null);
    setPrompt("");
    setError(null);
    setPaymentTxHash(null);
  };

  return (
    <div className="min-h-screen w-full bg-black">
      <Head>
        <title>ada2Sora2</title>
        <meta
          name="description"
          content="Generate stunning videos with AI-powered Sora"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </Head>

      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-12">
        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
              Sora-2 Video Generator
            </h1>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg">
              Turn ADA to AI videos with Sora-2
            </p>
          </div>

          {/* Main Card */}
          <div className="card rounded-2xl p-5 sm:p-8 md:p-10 space-y-5 sm:space-y-6">
            {!videoUrl ? (
              <>
                {/* Wallet Connection */}
                <WalletConnection
                  onConnect={handleWalletConnect}
                  onDisconnect={handleWalletDisconnect}
                />

                {/* Prompt Input */}
                <div className="space-y-2.5 sm:space-y-3">
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Describe your video
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A serene sunset over a calm ocean with dolphins jumping..."
                    className="input-field min-h-[120px] sm:min-h-[140px] resize-none"
                    disabled={isGenerating}
                  />
                </div>

                {/* Video Settings Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Video Orientation Selector */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <label
                      htmlFor="videoSize"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Orientation
                    </label>
                    <div className="relative">
                      <select
                        id="videoSize"
                        value={videoSize}
                        onChange={handleVideoSizeChange}
                        className="input-field pr-10 appearance-none bg-transparent"
                        style={{ backgroundImage: "none" }}
                        disabled={isGenerating}
                      >
                        <option value="1280x720">Landscape (16:9)</option>
                        <option value="720x1280">Portrait (9:16)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <div
                          className={`w-8 h-4 border border-gray-400 bg-gray-600 rounded-sm flex-shrink-0 ${
                            videoSize === "720x1280"
                              ? "rotate-90" // Portrait - same shape, rotated 90°
                              : "" // Landscape - normal orientation
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Video Duration Selector */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <label
                      htmlFor="videoDuration"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Duration
                    </label>
                    <select
                      id="videoDuration"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="input-field"
                      disabled={isGenerating}
                    >
                      <option value="4">4 seconds</option>
                      <option value="8">8 seconds</option>
                      <option value="12">12 seconds</option>
                    </select>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Generate Button with countdown */}
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || !walletConnected}
                  className="relative overflow-hidden btn-primary w-full text-base sm:text-lg"
                >
                  {/* Button content */}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isGenerating ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>
                          {generationStatus || "Starting"}
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
                      "Generate Video"
                    )}
                  </span>
                </button>

                {/* Generation status message */}
                {isGenerating && (
                  <div className="text-center text-sm text-gray-400 mt-2">
                    about 1 minute, do not refresh page
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Video Preview */}
                <div className="space-y-3 sm:space-y-4">
                  <div
                    className={`${
                      videoSize === "720x1280"
                        ? "aspect-[9/16] max-w-sm mx-auto" // Portrait aspect ratio
                        : "aspect-video" // Landscape aspect ratio
                    } rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800`}
                  >
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Prompt Display */}
                  <div className="border border-zinc-800 rounded-xl p-3.5 sm:p-4 bg-zinc-950">
                    <p className="text-xs sm:text-sm text-gray-400">{prompt}</p>
                  </div>

                  {/* Video Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <button
                      onClick={handleDownload}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Link
                    </button>

                    <button
                      onClick={handleShareToTwitter}
                      className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Tweet
                    </button>

                    <button
                      onClick={handleReset}
                      className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      New Video
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePaymentComplete}
          duration={parseInt(videoDuration)}
          prompt={prompt}
          size={videoSize}
        />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <MeshProvider>
      <HomePage />
    </MeshProvider>
  );
}
