const videoService = require('../services/video.service');
const cloudinaryService = require('../services/cloudinary.service');
const { cleanupTempFile } = require('../utils/fileUtils');

/**
 * Upload and process video
 */
const uploadVideo = async (req, res, next) => {
    let tempFilePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No video file provided'
            });
        }

        tempFilePath = req.file.path;

        // Process video with FFmpeg (optional processing)
        const processedFilePath = await videoService.processVideo(tempFilePath);

        // Upload to Cloudinary
        const result = await cloudinaryService.uploadVideo(processedFilePath);

        // Cleanup temp files
        await cleanupTempFile(tempFilePath);
        if (processedFilePath !== tempFilePath) {
            await cleanupTempFile(processedFilePath);
        }

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                duration: result.duration,
                width: result.width,
                height: result.height,
                bytes: result.bytes
            }
        });
    } catch (error) {
        // Cleanup on error
        if (tempFilePath) {
            await cleanupTempFile(tempFilePath);
        }
        next(error);
    }
};

/**
 * Get video information
 */
const getVideo = async (req, res, next) => {
    try {
        const { publicId } = req.params;
        const result = await cloudinaryService.getVideoInfo(publicId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete video
 */
const deleteVideo = async (req, res, next) => {
    try {
        const { publicId } = req.params;
        await cloudinaryService.deleteVideo(publicId);

        res.status(200).json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadVideo,
    getVideo,
    deleteVideo
};
