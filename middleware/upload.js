const multer = require('multer');
const path = require('path');

// Store files in memory (Buffer) — no disk writes needed since we parse and discard
const storage = multer.memoryStorage();

// Only allow .csv files, enforce a 2 MB size limit
const uploadCSV = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only .csv files are allowed'));
    }
    if (file.mimetype !== 'text/csv' && file.mimetype !== 'application/vnd.ms-excel') {
      return cb(new Error('Invalid file MIME type. Expected text/csv'));
    }
    cb(null, true);
  }
});

module.exports = { uploadCSV };
