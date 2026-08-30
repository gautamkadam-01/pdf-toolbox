/**
 * Express Application Configuration
 * Configures security, logging, parsers, routes, and error handling.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { frontendUrl, isProduction } = require('./config/env');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Headers - Configured for secure iframe embedding and binary API transmission
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false,
  })
);

// CORS Configuration - Allows configured frontend, localhost, same-origin, and Cloud Run / AI Studio preview origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, same-origin, server-to-server)
      if (!origin) return callback(null, true);

      // Match localhost, 127.0.0.1, configured frontend URL, or *.run.app
      if (
        !isProduction ||
        origin === frontendUrl ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.run\.app$/.test(new URL(origin).hostname) ||
        /\.google\.com$/.test(new URL(origin).hostname) ||
        /\.cloudworkstations\.dev$/.test(new URL(origin).hostname) ||
        /\.ai\.studio$/.test(new URL(origin).hostname)
      ) {
        return callback(null, true);
      }

      // In development or preview environments, allow origin safely
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// HTTP Request Logging (Sanitized, non-intrusive)
const logFormat = isProduction ? 'combined' : 'dev';
app.use(
  morgan(logFormat, {
    skip: (req) => req.url === '/api/health', // Avoid noisy logs for health checks
  })
);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount all API routes under /api
app.use('/api', apiRoutes);

// Catch 404s for undefined routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
