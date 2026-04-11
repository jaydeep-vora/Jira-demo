const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File is too large. Maximum size is 2 MB',
      LIMIT_FILE_COUNT: 'Too many files. Only one file is allowed',
      LIMIT_UNEXPECTED_FILE: 'Unexpected field name. Use "file" as the form field name'
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || err.message
    });
  }

  // Multer fileFilter custom errors (thrown as plain Error)
  if (err.message && (err.message.includes('.csv') || err.message.includes('MIME type'))) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errors: err.errors.map(e => ({
        field: e.path,
        message: `${e.path} already exists`
      }))
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
