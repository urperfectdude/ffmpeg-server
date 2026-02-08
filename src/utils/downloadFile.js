const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

/**
 * Convert Google Drive sharing URL to direct download URL
 * @param {string} url - Google Drive URL
 * @returns {string} - Direct download URL
 */
const convertGoogleDriveUrl = (url) => {
    // Handle various Google Drive URL formats
    // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // Format 2: https://drive.google.com/open?id=FILE_ID
    // Format 3: https://drive.google.com/uc?id=FILE_ID

    let fileId = null;

    // Extract file ID from /file/d/FILE_ID/ format
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        fileId = fileMatch[1];
    }

    // Extract file ID from ?id=FILE_ID format
    if (!fileId) {
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) {
            fileId = idMatch[1];
        }
    }

    if (fileId) {
        // Use the direct download URL format
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    return url; // Return original if not a Google Drive URL
};

/**
 * Check if URL is a Google Drive URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
const isGoogleDriveUrl = (url) => {
    return url.includes('drive.google.com');
};

/**
 * Download a file from a public URL to the temp directory
 * @param {string} url - Public URL to download from
 * @param {string} [extension] - Optional file extension override
 * @returns {Promise<string>} - Path to downloaded file
 */
const downloadFile = (url, extension = null) => {
    return new Promise((resolve, reject) => {
        try {
            // Convert Google Drive URLs to direct download format
            let downloadUrl = url;
            if (isGoogleDriveUrl(url)) {
                downloadUrl = convertGoogleDriveUrl(url);
                console.log('Converted Google Drive URL:', downloadUrl);
            }

            const parsedUrl = new URL(downloadUrl);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            // Determine file extension
            const urlPath = parsedUrl.pathname;
            let ext = extension || path.extname(urlPath);
            if (!ext || ext === '' || ext === '.') {
                ext = '.mp4'; // Default for Google Drive and unknown sources
            }

            // Generate unique filename
            const filename = `download_${uuidv4()}${ext}`;
            const tempDir = path.join(__dirname, '..', '..', 'temp');
            const filePath = path.join(tempDir, filename);

            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const file = fs.createWriteStream(filePath);

            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const request = protocol.get(downloadUrl, options, (response) => {
                // Handle redirects (Google Drive uses these)
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    file.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    console.log('Following redirect to:', response.headers.location);
                    return downloadFile(response.headers.location, extension)
                        .then(resolve)
                        .catch(reject);
                }

                // Check for Google Drive virus scan warning page
                // This happens for larger files - we need to confirm download
                if (response.headers['content-type']?.includes('text/html')) {
                    let htmlBody = '';
                    response.on('data', chunk => htmlBody += chunk);
                    response.on('end', () => {
                        file.close();
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }

                        // Look for confirm token in the HTML
                        const confirmMatch = htmlBody.match(/confirm=([a-zA-Z0-9_-]+)/);
                        if (confirmMatch && isGoogleDriveUrl(url)) {
                            const confirmUrl = `${downloadUrl}&confirm=${confirmMatch[1]}`;
                            console.log('Confirming Google Drive download...');
                            return downloadFile(confirmUrl, extension)
                                .then(resolve)
                                .catch(reject);
                        }

                        reject(new Error('Failed to download: Received HTML instead of file. The file may not be publicly accessible.'));
                    });
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
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

            // Set timeout (longer for large files)
            request.setTimeout(120000, () => {
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
    downloadFiles,
    convertGoogleDriveUrl,
    isGoogleDriveUrl
};
