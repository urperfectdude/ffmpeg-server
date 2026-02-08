require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const healthRoutes = require('./routes/health.routes');
const videoRoutes = require('./routes/video.routes');
const { errorHandler } = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: '🚀 FFmpeg Server is running successfully!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      uploadVideo: 'POST /api/videos/upload',
      getVideo: 'GET /api/videos/:publicId',
      deleteVideo: 'DELETE /api/videos/:publicId'
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/videos', videoRoutes);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Video API: http://localhost:${PORT}/api/videos`);
});

module.exports = app;
