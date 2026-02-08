/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large. Maximum size is 100MB.'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected field in upload.'
        });
    }

    // Cloudinary errors
    if (err.message.includes('Cloudinary')) {
        return res.status(502).json({
            success: false,
            message: 'Cloud storage service error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // FFmpeg errors
    if (err.message.includes('FFmpeg') || err.message.includes('processing')) {
        return res.status(422).json({
            success: false,
            message: 'Video processing failed',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
