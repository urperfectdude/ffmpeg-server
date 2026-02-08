const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const { upload } = require('../utils/multerConfig');

// POST /api/videos/upload - Upload and process video
router.post('/upload', upload.single('video'), videoController.uploadVideo);

// GET /api/videos/:publicId - Get video info from Cloudinary
router.get('/:publicId', videoController.getVideo);

// DELETE /api/videos/:publicId - Delete video from Cloudinary
router.delete('/:publicId', videoController.deleteVideo);

module.exports = router;
