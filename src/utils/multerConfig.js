const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Allowed video MIME types
const ALLOWED_MIME_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/x-matroska'
];

// Max file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `upload_${uniqueId}${extension}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
};

// Multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

module.exports = {
    upload,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE
};
