/**
 * Centralized Error Handling Middleware
 * Ensures all errors return consistent, sanitized JSON responses.
 */

const multer = require('multer');
const logger = require('../utils/logger');
const { maxFileSizeMb } = require('../config/env');

function errorHandler(err, req, res, next) {
  // Log internal details to server console
  logger.error(`Error processing ${req.method} ${req.originalUrl}:`, {
    name: err.name,
    message: err.message,
    code: err.code,
  });

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Uploaded file exceeds the maximum allowed size limit of ${maxFileSizeMb}MB.`,
        },
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNEXPECTED_FILE_FIELD',
          message: `Unexpected file field '${err.field}'. Please check the upload field name.`,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: err.message || 'File upload failed.',
      },
    });
  }

  // Handle invalid JSON body payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
      },
    });
  }

  // Handle custom application errors (e.g. status 400, 422, etc.)
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST');
  const message = statusCode >= 500 ? 'An unexpected internal server error occurred.' : err.message;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
    },
  });
}

module.exports = errorHandler;
