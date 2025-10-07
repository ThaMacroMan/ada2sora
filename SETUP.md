# Sora Video Generator Setup

## Prerequisites

- Node.js 18+ installed
- OpenAI API key with Sora access

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- ✅ Text-to-video generation with OpenAI Sora
- ✅ Optional image upload for reference/context
- ✅ Video preview and playback
- ✅ Download generated videos
- ✅ Share to Twitter/X
- ✅ Dark mode UI
- ✅ Mobile-optimized design

## API Endpoint

### POST `/api/generate`

Generates a video using OpenAI's Sora model.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `prompt` (required): Text description of the video
  - `image` (optional): Reference image file

**Response:**

```json
{
  "videoUrl": "https://..."
}
```

## Environment Variables

| Variable         | Description         | Required |
| ---------------- | ------------------- | -------- |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes      |

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **API**: OpenAI Sora API
- **File Upload**: Formidable
- **Styling**: Tailwind CSS with custom dark theme
