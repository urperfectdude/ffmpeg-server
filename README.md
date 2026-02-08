# FFmpeg Server

A production-ready Node.js backend service for video processing with FFmpeg and Cloudinary integration.

## Features

- 🎬 Video upload and processing with FFmpeg
- ☁️ Cloudinary integration for video storage
- 🔒 File type and size validation
- 📁 Clean modular architecture
- 🏥 Health check endpoint

## Requirements

- Node.js 18+
- Cloudinary account

## Installation

```bash
# Install dependencies
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

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and uptime information.

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

## Project Structure

```
/src
  /routes          # Route definitions
  /controllers     # Request handlers
  /services        # Business logic
  /utils           # Utility functions
/temp              # Temporary file storage
```

## Supported Video Formats

- MP4
- MPEG
- QuickTime (MOV)
- AVI
- WMV
- WebM
- MKV

## File Size Limit

Maximum upload size: **100MB**

## License

ISC
