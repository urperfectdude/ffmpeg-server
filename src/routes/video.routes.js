const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const mergeController = require('../controllers/merge.controller');
const separateController = require('../controllers/separate.controller');
const { upload } = require('../utils/multerConfig');

// POST /api/videos/upload - Upload and process video
router.post('/upload', upload.single('video'), videoController.uploadVideo);

// POST /api/videos/merge - Merge video and audio layers
router.post('/merge', mergeController.merge);

// POST /api/videos/separate - Separate video and audio tracks
router.post('/separate', separateController.separate);

// GET /api/videos/:publicId - Get video info from Cloudinary
router.get('/:publicId', videoController.getVideo);

// DELETE /api/videos/:publicId - Delete video from Cloudinary
router.delete('/:publicId', videoController.deleteVideo);

module.exports = router;
