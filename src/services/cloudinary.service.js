const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload video to Cloudinary
 * @param {string} filePath - Path to video file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadVideo = async (filePath, options = {}) => {
    try {
        const uploadOptions = {
            resource_type: 'video',
            folder: options.folder || 'videos',
            ...options
        };

        const result = await cloudinary.uploader.upload(filePath, uploadOptions);
        return result;
    } catch (error) {
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
};

/**
 * Get video information from Cloudinary
 * @param {string} publicId - Video public ID
 * @returns {Promise<Object>} - Video resource details
 */
const getVideoInfo = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'video'
        });
        return result;
    } catch (error) {
        if (error.http_code === 404) {
            throw new Error('Video not found');
        }
        throw new Error(`Failed to get video info: ${error.message}`);
    }
};

/**
 * Delete video from Cloudinary
 * @param {string} publicId - Video public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteVideo = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'video'
        });
        return result;
    } catch (error) {
        throw new Error(`Failed to delete video: ${error.message}`);
    }
};

/**
 * Generate video transformation URL
 * @param {string} publicId - Video public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} - Transformed video URL
 */
const getTransformedUrl = (publicId, transformations = {}) => {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        ...transformations
    });
};

module.exports = {
    uploadVideo,
    getVideoInfo,
    deleteVideo,
    getTransformedUrl,
    cloudinary
};
