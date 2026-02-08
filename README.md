# FFmpeg Server

A production-ready Node.js backend service for video processing with FFmpeg and Cloudinary integration.

## Features

- 🎬 Video upload and processing with FFmpeg
- 🎞️ **Video layer overlay** - Composite multiple videos at specified timestamps
- 🎵 **Audio layer mixing** - Mix multiple audio tracks with decibel and timestamp control
- ✂️ **Video/Audio separation** - Extract video and audio tracks separately
- ☁️ Cloudinary integration for video storage
- 🔗 Download and process files from public URLs
- 🔒 File type and size validation
- 📁 Clean modular architecture
- 🏥 Health check endpoint

## Requirements

- Node.js 18+
- Cloudinary account

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Usage

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

## API Endpoints

### Health Check
```
GET /health
```

### Upload Video
```
POST /api/videos/upload
Content-Type: multipart/form-data

Body:
- video: Video file (mp4, mpeg, quicktime, avi, wmv, webm, mkv)
```

### Get Video Info
```
GET /api/videos/:publicId
```

### Delete Video
```
DELETE /api/videos/:publicId
```

---

## 🎬 Merge API (Video/Audio Overlay)

### Endpoint
```
POST /api/videos/merge
Content-Type: application/json
```

### Request Body

```json
{
  "videoLayers": [
    {
      "files": ["https://example.com/vid1.mp4", "https://example.com/vid2.mp4"],
      "startingTimestamps": [0, 3]
    }
  ],
  "audioLayers": [
    {
      "files": ["https://example.com/aud1.mp3", "https://example.com/aud2.mp3"],
      "startingTimestamps": [0, 4],
      "decibels": [0, -5]
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `videoLayers[].files` | `string[]` | Array of public URLs to video files |
| `videoLayers[].startingTimestamps` | `number[]` | When each video starts (in seconds), overlaid on first video's frame |
| `audioLayers[].files` | `string[]` | Array of public URLs to audio files |
| `audioLayers[].startingTimestamps` | `number[]` | When each audio starts (in seconds) |
| `audioLayers[].decibels` | `number[]` | Volume adjustment per audio (0 = original, -5 = quieter, +5 = louder) |

### Example cURL Request

```bash
curl -X POST https://ffmpeg-server.up.railway.app/api/videos/merge \
  -H "Content-Type: application/json" \
  -d '{
    "videoLayers": [
      {
        "files": [
          "https://example.com/background.mp4",
          "https://example.com/overlay.mp4"
        ],
        "startingTimestamps": [0, 2]
      }
    ],
    "audioLayers": [
      {
        "files": [
          "https://example.com/bgm.mp3",
          "https://example.com/voiceover.mp3"
        ],
        "startingTimestamps": [0, 1],
        "decibels": [-10, 0]
      }
    ]
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Video merged successfully",
  "data": {
    "url": "https://res.cloudinary.com/xxx/video/upload/merged_abc123.mp4",
    "publicId": "videos/merged_abc123",
    "duration": 15.5,
    "format": "mp4"
  }
}
```

---

## ✂️ Separate API (Extract Video & Audio)

Separates a video file into separate video-only and audio-only tracks.

### Endpoint
```
POST /api/videos/separate
Content-Type: application/json
```

### Request Body

```json
{
  "videoUrl": "https://example.com/video.mp4"
}
```

### Example cURL Request

```bash
curl -X POST https://ffmpeg-server.up.railway.app/api/videos/separate \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/video.mp4"
  }'
```

### Example Response

```json
{
  "success": true,
  "message": "Video and audio separated successfully",
  "data": {
    "video": {
      "publicId": "separated/videos/video_only_abc123",
      "url": "https://res.cloudinary.com/xxx/video/upload/video_only_abc123.mp4",
      "format": "mp4",
      "duration": 30.5,
      "width": 1920,
      "height": 1080
    },
    "audio": {
      "publicId": "separated/audio/audio_only_abc123",
      "url": "https://res.cloudinary.com/xxx/video/upload/audio_only_abc123.m4a",
      "format": "m4a",
      "duration": 30.5
    }
  }
}
```

---

## Project Structure

```
/src
  /routes          # Route definitions
  /controllers     # Request handlers
  /services        # Business logic (FFmpeg, Cloudinary, audio, merge, separate)
  /utils           # Utility functions (multer, file download, error handling)
/temp              # Temporary file storage
```

## Supported Formats

**Video:** MP4, MPEG, QuickTime (MOV), AVI, WMV, WebM, MKV  
**Audio:** MP3, WAV, AAC, OGG, FLAC, M4A

## File Size Limit

Maximum upload size: **100MB**

## License

ISC
