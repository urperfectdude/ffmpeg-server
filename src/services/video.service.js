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

/**
 * Overlay multiple videos at specified timestamps
 * First video in first layer = base timeline
 * @param {Object[]} layers - Video layers configuration
 * @param {string[]} layers[].files - Local paths to video files
 * @param {number[]} layers[].startingTimestamps - Start times in seconds for each video
 * @returns {Promise<string>} - Path to merged video file
 */
const overlayVideos = (layers) => {
    return new Promise(async (resolve, reject) => {
        if (!layers || layers.length === 0) {
            reject(new Error('No video layers provided'));
            return;
        }

        const outputFileName = `merged_${uuidv4()}.mp4`;
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        const outputPath = path.join(tempDir, outputFileName);

        // Flatten all video inputs from all layers
        const allVideoInputs = [];
        layers.forEach(layer => {
            layer.files.forEach((file, index) => {
                allVideoInputs.push({
                    file,
                    startTime: layer.startingTimestamps?.[index] || 0
                });
            });
        });

        if (allVideoInputs.length === 0) {
            reject(new Error('No video files provided'));
            return;
        }

        // If only one video, just process it
        if (allVideoInputs.length === 1) {
            try {
                const result = await processVideo(allVideoInputs[0].file);
                resolve(result);
                return;
            } catch (err) {
                reject(err);
                return;
            }
        }

        // Get base video metadata for dimensions
        let baseWidth = 1920;
        let baseHeight = 1080;
        try {
            const metadata = await getVideoMetadata(allVideoInputs[0].file);
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (videoStream) {
                baseWidth = videoStream.width || 1920;
                baseHeight = videoStream.height || 1080;
            }
        } catch (err) {
            console.warn('Could not get base video metadata, using defaults');
        }

        // Build FFmpeg command
        const command = ffmpeg();

        // Add all video inputs
        allVideoInputs.forEach(video => {
            command.input(video.file);
        });

        // Build filter complex for video overlay
        const filterParts = [];

        // Scale base video and set as starting point
        filterParts.push(`[0:v]scale=${baseWidth}:${baseHeight}:force_original_aspect_ratio=decrease,pad=${baseWidth}:${baseHeight}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[base]`);

        let currentBase = '[base]';

        // Overlay each subsequent video
        for (let i = 1; i < allVideoInputs.length; i++) {
            const video = allVideoInputs[i];
            const startTimeInPts = video.startTime;

            // Scale overlay video to match base dimensions
            filterParts.push(`[${i}:v]scale=${baseWidth}:${baseHeight}:force_original_aspect_ratio=decrease,pad=${baseWidth}:${baseHeight}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS+${startTimeInPts}/TB[v${i}]`);

            // Overlay with enable condition based on timestamp
            const outputLabel = i === allVideoInputs.length - 1 ? '[vout]' : `[tmp${i}]`;
            filterParts.push(`${currentBase}[v${i}]overlay=0:0:enable='between(t,${startTimeInPts},999999)'${outputLabel}`);

            currentBase = `[tmp${i}]`;
        }

        command
            .complexFilter(filterParts.join(';'))
            .outputOptions([
                '-map', '[vout]',
                '-map', '0:a?',
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'medium',
                '-crf', '23',
                '-movflags', '+faststart',
                '-shortest'
            ])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('Video overlay started:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Video processing: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('Video overlay completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Video overlay error:', err.message);
                reject(new Error(`Video overlay failed: ${err.message}`));
            })
            .run();
    });
};

module.exports = {
    processVideo,
    getVideoMetadata,
    createThumbnail,
    overlayVideos
};
