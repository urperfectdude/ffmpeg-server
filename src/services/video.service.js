const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Set ffmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Process video using FFmpeg
 * @param {string} inputPath - Path to input video file
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Path to processed video
 */
const processVideo = (inputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        const outputFileName = `processed_${uuidv4()}.mp4`;
        const outputPath = path.join(path.dirname(inputPath), outputFileName);

        const command = ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',      // Video codec
                '-c:a aac',          // Audio codec
                '-movflags +faststart', // Optimize for web streaming
                '-preset medium',    // Encoding speed/quality balance
                '-crf 23'            // Quality (lower = better, 18-28 recommended)
            ]);

        // Apply optional processing
        if (options.resolution) {
            command.size(options.resolution);
        }

        if (options.duration) {
            command.duration(options.duration);
        }

        command
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log('FFmpeg started:', commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Processing: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('FFmpeg processing completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err.message);
                reject(new Error(`Video processing failed: ${err.message}`));
            })
            .run();
    });
};

/**
 * Get video metadata
 * @param {string} filePath - Path to video file
 * @returns {Promise<Object>} - Video metadata
 */
const getVideoMetadata = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get metadata: ${err.message}`));
                return;
            }
            resolve(metadata);
        });
    });
};

/**
 * Create video thumbnail
 * @param {string} inputPath - Path to video file
 * @param {number} timestamp - Timestamp in seconds for thumbnail
 * @returns {Promise<string>} - Path to thumbnail
 */
const createThumbnail = (inputPath, timestamp = 1) => {
    return new Promise((resolve, reject) => {
        const outputFileName = `thumb_${uuidv4()}.jpg`;
        const outputPath = path.join(path.dirname(inputPath), outputFileName);

        ffmpeg(inputPath)
            .screenshots({
                timestamps: [timestamp],
                filename: outputFileName,
                folder: path.dirname(inputPath),
                size: '320x240'
            })
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                reject(new Error(`Thumbnail creation failed: ${err.message}`));
            });
    });
};

module.exports = {
    processVideo,
    getVideoMetadata,
    createThumbnail
};
