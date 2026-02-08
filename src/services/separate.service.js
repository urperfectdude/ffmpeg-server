const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const { downloadFile } = require('../utils/downloadFile');
const { uploadVideo } = require('./cloudinary.service');
const { cleanupTempFile } = require('../utils/fileUtils');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Separate video and audio from a video file
 * @param {string} videoUrl - Public URL to video file
 * @returns {Promise<Object>} - Object with video and audio Cloudinary URLs
 */
const separateVideoAudio = async (videoUrl) => {
    const tempFiles = [];

    try {
        // Download the video
        console.log('Downloading video...');
        const inputPath = await downloadFile(videoUrl);
        tempFiles.push(inputPath);

        const tempDir = path.join(__dirname, '..', '..', 'temp');

        // Extract video only (no audio)
        console.log('Extracting video track...');
        const videoOnlyPath = await extractVideoTrack(inputPath, tempDir);
        tempFiles.push(videoOnlyPath);

        // Extract audio only
        console.log('Extracting audio track...');
        const audioOnlyPath = await extractAudioTrack(inputPath, tempDir);
        tempFiles.push(audioOnlyPath);

        // Upload video to Cloudinary
        console.log('Uploading video to Cloudinary...');
        const videoResult = await uploadVideo(videoOnlyPath, {
            folder: 'separated/videos',
            resource_type: 'video'
        });

        // Upload audio to Cloudinary
        console.log('Uploading audio to Cloudinary...');
        const audioResult = await uploadVideo(audioOnlyPath, {
            folder: 'separated/audio',
            resource_type: 'video' // Cloudinary uses 'video' for audio too
        });

        // Cleanup temp files
        console.log('Cleaning up temp files...');
        for (const file of tempFiles) {
            await cleanupTempFile(file);
        }

        return {
            video: {
                publicId: videoResult.public_id,
                url: videoResult.secure_url,
                format: videoResult.format,
                duration: videoResult.duration,
                width: videoResult.width,
                height: videoResult.height
            },
            audio: {
                publicId: audioResult.public_id,
                url: audioResult.secure_url,
                format: audioResult.format,
                duration: audioResult.duration
            }
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
 * Extract video track only (remove audio) - uses stream copy for speed
 * @param {string} inputPath - Path to input video
 * @param {string} tempDir - Temp directory path
 * @returns {Promise<string>} - Path to video-only file
 */
const extractVideoTrack = (inputPath, tempDir) => {
    return new Promise((resolve, reject) => {
        const outputFileName = `video_only_${uuidv4()}.mp4`;
        const outputPath = path.join(tempDir, outputFileName);

        ffmpeg(inputPath)
            .outputOptions([
                '-an',           // Remove audio
                '-c:v', 'copy',  // Copy video stream (no re-encoding)
                '-movflags', '+faststart'
            ])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('Extracting video:', cmd);
            })
            .on('end', () => {
                console.log('Video extraction completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                reject(new Error(`Video extraction failed: ${err.message}`));
            })
            .run();
    });
};

/**
 * Extract audio track only - uses stream copy for speed
 * @param {string} inputPath - Path to input video
 * @param {string} tempDir - Temp directory path
 * @returns {Promise<string>} - Path to audio-only file
 */
const extractAudioTrack = (inputPath, tempDir) => {
    return new Promise((resolve, reject) => {
        // Use m4a container for copied AAC audio, or mp3 if we need to transcode
        const outputFileName = `audio_only_${uuidv4()}.m4a`;
        const outputPath = path.join(tempDir, outputFileName);

        ffmpeg(inputPath)
            .outputOptions([
                '-vn',           // Remove video
                '-c:a', 'copy'   // Copy audio stream (no re-encoding)
            ])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('Extracting audio:', cmd);
            })
            .on('end', () => {
                console.log('Audio extraction completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                // If copy fails (incompatible codec), fallback to transcoding
                console.log('Stream copy failed, falling back to transcoding...');
                extractAudioTrackTranscode(inputPath, tempDir)
                    .then(resolve)
                    .catch(reject);
            })
            .run();
    });
};

/**
 * Extract audio with transcoding (fallback)
 */
const extractAudioTrackTranscode = (inputPath, tempDir) => {
    return new Promise((resolve, reject) => {
        const outputFileName = `audio_only_${uuidv4()}.mp3`;
        const outputPath = path.join(tempDir, outputFileName);

        ffmpeg(inputPath)
            .outputOptions([
                '-vn',
                '-c:a', 'libmp3lame',
                '-b:a', '192k'
            ])
            .output(outputPath)
            .on('end', () => {
                console.log('Audio transcoding completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                reject(new Error(`Audio extraction failed: ${err.message}`));
            })
            .run();
    });
};

module.exports = {
    separateVideoAudio
};
