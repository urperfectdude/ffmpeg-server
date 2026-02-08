const { separateVideoAudio } = require('../services/separate.service');

/**
 * Separate video and audio from a video file
 * POST /api/videos/separate
 */
const separate = async (req, res, next) => {
    try {
        const { videoUrl } = req.body;

        // Validate request
        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'videoUrl is required'
            });
        }

        // Validate URL format
        try {
            new URL(videoUrl);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Invalid videoUrl format'
            });
        }

        console.log('Starting separation process...');
        console.log('Video URL:', videoUrl);

        // Process separation
        const result = await separateVideoAudio(videoUrl);

        res.status(200).json({
            success: true,
            message: 'Video and audio separated successfully',
            data: result
        });

    } catch (error) {
        console.error('Separate error:', error);
        next(error);
    }
};

module.exports = {
    separate
};
