/**
 * Application Logger
 * Provides structured logging without exposing sensitive data or binary contents.
 */

const { isDevelopment } = require('../config/env');

const formatTime = () => new Date().toISOString();

const logger = {
  info: (message, meta = {}) => {
    console.log(`[${formatTime()}] [INFO] ${message}`, Object.keys(meta).length ? meta : '');
  },

  warn: (message, meta = {}) => {
    console.warn(`[${formatTime()}] [WARN] ${message}`, Object.keys(meta).length ? meta : '');
  },

  error: (message, meta = {}) => {
    console.error(`[${formatTime()}] [ERROR] ${message}`, Object.keys(meta).length ? meta : '');
  },

  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.debug(`[${formatTime()}] [DEBUG] ${message}`, Object.keys(meta).length ? meta : '');
    }
  },
};

module.exports = logger;
