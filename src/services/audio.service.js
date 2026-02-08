const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Overlay multiple audio tracks with timestamp and volume control
 * @param {Object[]} layers - Audio layers configuration
 * @param {string[]} layers[].files - Local paths to audio files
 * @param {number[]} layers[].startingTimestamps - Start times in seconds
 * @param {number[]} layers[].decibels - Volume adjustments in dB
 * @param {number} totalDuration - Total output duration in seconds
 * @returns {Promise<string>} - Path to merged audio file
 */
const overlayAudio = (layers, totalDuration) => {
    return new Promise((resolve, reject) => {
        if (!layers || layers.length === 0) {
            resolve(null);
            return;
        }

        const outputFileName = `audio_${uuidv4()}.aac`;
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        const outputPath = path.join(tempDir, outputFileName);

        // Flatten all audio files from all layers
        const allAudioInputs = [];
        layers.forEach(layer => {
            layer.files.forEach((file, index) => {
                allAudioInputs.push({
                    file,
                    startTime: layer.startingTimestamps?.[index] || 0,
                    decibel: layer.decibels?.[index] || 0
                });
            });
        });

        if (allAudioInputs.length === 0) {
            resolve(null);
            return;
        }

        // Build FFmpeg command
        const command = ffmpeg();

        // Add all audio inputs
        allAudioInputs.forEach(audio => {
            command.input(audio.file);
        });

        // Build filter complex for audio mixing
        const filterParts = [];
        const mixInputs = [];

        allAudioInputs.forEach((audio, index) => {
            const delayMs = Math.round(audio.startTime * 1000);
            const volumeDb = audio.decibel;

            // Apply delay and volume adjustment
            filterParts.push(
                `[${index}:a]adelay=${delayMs}|${delayMs},volume=${volumeDb}dB[a${index}]`
            );
            mixInputs.push(`[a${index}]`);
        });

        // Mix all audio streams
        const mixFilter = `${mixInputs.join('')}amix=inputs=${allAudioInputs.length}:duration=longest:dropout_transition=2[aout]`;
        filterParts.push(mixFilter);

        command
            .complexFilter(filterParts.join(';'))
            .outputOptions([
                '-map', '[aout]',
                '-c:a', 'aac',
                '-b:a', '192k'
            ])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('Audio overlay started:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Audio processing: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log('Audio overlay completed');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Audio overlay error:', err.message);
                reject(new Error(`Audio overlay failed: ${err.message}`));
            })
            .run();
    });
};

/**
 * Get audio duration
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
const getAudioDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(new Error(`Failed to get audio metadata: ${err.message}`));
                return;
            }
            resolve(metadata.format.duration || 0);
        });
    });
};

module.exports = {
    overlayAudio,
    getAudioDuration
};
