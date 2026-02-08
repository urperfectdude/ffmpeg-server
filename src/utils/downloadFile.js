const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

/**
 * Download a file from a public URL to the temp directory
 * @param {string} url - Public URL to download from
 * @param {string} [extension] - Optional file extension override
 * @returns {Promise<string>} - Path to downloaded file
 */
const downloadFile = (url, extension = null) => {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            // Determine file extension
            const urlPath = parsedUrl.pathname;
            const ext = extension || path.extname(urlPath) || '.mp4';

            // Generate unique filename
            const filename = `download_${uuidv4()}${ext}`;
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            const filePath = path.join(tempDir, filename);

            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const file = fs.createWriteStream(filePath);

            const request = protocol.get(url, (response) => {
                // Handle redirects
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    fs.unlinkSync(filePath);
                    return downloadFile(response.headers.location, extension)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(filePath);
                    reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded: ${filename}`);
                    resolve(filePath);
                });
            });

            request.on('error', (err) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(new Error(`Download failed: ${err.message}`));
            });

            file.on('error', (err) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(new Error(`File write failed: ${err.message}`));
            });

            // Set timeout
            request.setTimeout(60000, () => {
                request.destroy();
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(new Error('Download timeout'));
            });

        } catch (err) {
            reject(new Error(`Invalid URL: ${err.message}`));
        }
    });
};

/**
 * Download multiple files from URLs
 * @param {string[]} urls - Array of public URLs
 * @returns {Promise<string[]>} - Array of local file paths
 */
const downloadFiles = async (urls) => {
    const downloadPromises = urls.map(url => downloadFile(url));
    return Promise.all(downloadPromises);
};

module.exports = {
    downloadFile,
    downloadFiles
};
