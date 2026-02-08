const fs = require('fs').promises;
const path = require('path');

/**
 * Cleanup temporary file
 * @param {string} filePath - Path to file to delete
 */
const cleanupTempFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        console.log(`Cleaned up temp file: ${path.basename(filePath)}`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Failed to cleanup temp file: ${error.message}`);
        }
    }
};

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
const ensureDir = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
};

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Human readable size
 */
const formatFileSize = (bytes) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

module.exports = {
    cleanupTempFile,
    ensureDir,
    formatFileSize
};
