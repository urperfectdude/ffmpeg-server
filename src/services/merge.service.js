const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const { downloadFiles } = require('../utils/downloadFile');
const { overlayVideos, getVideoMetadata } = require('./video.service');
const { overlayAudio } = require('./audio.service');
const { uploadVideo } = require('./cloudinary.service');
const { cleanupTempFile } = require('../utils/fileUtils');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Merge video and audio layers
 * @param {Object} config - Merge configuration
 * @param {Object[]} config.videoLayers - Video layers
 * @param {Object[]} config.audioLayers - Audio layers
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const mergeVideoAudio = async (config) => {
    const { videoLayers, audioLayers } = config;
    const tempFiles = [];

    try {
        // Download all video files
        let videoFilePaths = [];
        if (videoLayers && videoLayers.length > 0) {
            for (const layer of videoLayers) {
                const paths = await downloadFiles(layer.files);
                tempFiles.push(...paths);
                layer.files = paths; // Replace URLs with local paths
                videoFilePaths.push(...paths);
            }
        }

        // Download all audio files
        if (audioLayers && audioLayers.length > 0) {
            for (const layer of audioLayers) {
                const paths = await downloadFiles(layer.files);
                tempFiles.push(...paths);
                layer.files = paths; // Replace URLs with local paths
            }
        }

        // Process video layers (overlay)
        let processedVideoPath = null;
        if (videoLayers && videoLayers.length > 0) {
            console.log('Processing video layers...');
            processedVideoPath = await overlayVideos(videoLayers);
            tempFiles.push(processedVideoPath);
        }

        // Get video duration for audio processing
        let totalDuration = 60; // default
        if (processedVideoPath) {
            try {
                const metadata = await getVideoMetadata(processedVideoPath);
                totalDuration = metadata.format.duration || 60;
            } catch (err) {
                console.warn('Could not get video duration:', err.message);
            }
        }

        // Process audio layers (overlay with decibel control)
        let processedAudioPath = null;
        if (audioLayers && audioLayers.length > 0) {
            console.log('Processing audio layers...');
            processedAudioPath = await overlayAudio(audioLayers, totalDuration);
            if (processedAudioPath) {
                tempFiles.push(processedAudioPath);
            }
        }

        // Combine video and audio
        let finalOutputPath = processedVideoPath;
        if (processedVideoPath && processedAudioPath) {
            console.log('Combining video and audio...');
            finalOutputPath = await combineVideoAudio(processedVideoPath, processedAudioPath);
            tempFiles.push(finalOutputPath);
        } else if (!processedVideoPath && processedAudioPath) {
            // Audio only - just use the audio file
            finalOutputPath = processedAudioPath;
        }

        if (!finalOutputPath) {
            throw new Error('No output generated - provide at least video or audio layers');
        }

        // Upload to Cloudinary
        console.log('Uploading to Cloudinary...');
        const result = await uploadVideo(finalOutputPath, {
            folder: 'merged',
            resource_type: 'video'
        });

        // Cleanup temp files
        console.log('Cleaning up temp files...');
        for (const file of tempFiles) {
            await cleanupTempFile(file);
        }

        return {
            publicId: result.public_id,
            url: result.secure_url,
            format: result.format,
            duration: result.duration,
            width: result.width,
            height: result.height,
            bytes: result.bytes
        };

    } catch (error) {
        // Cleanup on error
        for (const file of tempFiles) {
            await cleanupTempFile(file);
        }
        throw error;
    }
};

/**
 * Combine video and audio tracks
 * @param {string} videoPath - Path to video file
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<string>} - Path to combined output
 */
const combineVideoAudio = (videoPath, audioPath) => {
    return new Promise((resolve, reject) => {
        const outputFileName = `final_${uuidv4()}.mp4`;
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        const outputPath = path.join(tempDir, outputFileName);

        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                '-movflags', '+faststart'
            ])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('Combining video+audio:', cmd);
            })
            .on('end', () => {
                console.log('Video+audio combined');
                resolve(outputPath);
            })
            .on('error', (err) => {
                reject(new Error(`Failed to combine video and audio: ${err.message}`));
            })
            .run();
    });
};

module.exports = {
    mergeVideoAudio
};
