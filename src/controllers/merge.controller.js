const { mergeVideoAudio } = require('../services/merge.service');

/**
 * Merge video and audio layers
 * POST /api/videos/merge
 */
const merge = async (req, res, next) => {
    try {
        const { videoLayers, audioLayers } = req.body;

        // Validate request
        if (!videoLayers && !audioLayers) {
            return res.status(400).json({
                success: false,
                message: 'At least one video or audio layer is required'
            });
        }

        // Validate video layers
        if (videoLayers) {
            if (!Array.isArray(videoLayers)) {
                return res.status(400).json({
                    success: false,
                    message: 'videoLayers must be an array'
                });
            }

            for (const layer of videoLayers) {
                if (!layer.files || !Array.isArray(layer.files) || layer.files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each video layer must have a files array with at least one URL'
                    });
                }
            }
        }

        // Validate audio layers
        if (audioLayers) {
            if (!Array.isArray(audioLayers)) {
                return res.status(400).json({
                    success: false,
                    message: 'audioLayers must be an array'
                });
            }

            for (const layer of audioLayers) {
                if (!layer.files || !Array.isArray(layer.files) || layer.files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each audio layer must have a files array with at least one URL'
                    });
                }
            }
        }

        console.log('Starting merge process...');
        console.log('Video layers:', JSON.stringify(videoLayers, null, 2));
        console.log('Audio layers:', JSON.stringify(audioLayers, null, 2));

        // Process merge
        const result = await mergeVideoAudio({ videoLayers, audioLayers });

        res.status(200).json({
            success: true,
            message: 'Video merged successfully',
            data: result
        });

    } catch (error) {
        console.error('Merge error:', error);
        next(error);
    }
};

module.exports = {
    merge
};
