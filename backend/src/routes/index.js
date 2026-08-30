/**
 * Master Application Router
 * Mounts health checks and versioned API modules
 */

const express = require('express');
const healthRoutes = require('./healthRoutes');
const pdfRoutes = require('./pdfRoutes');

const router = express.Router();

// Unversioned Health check endpoint: /api/health
router.use('/health', healthRoutes);

// Direct PDF route alias for compatibility: /api/pdf/...
router.use('/pdf', pdfRoutes);

// Version 1 API Routes: /api/v1/...
const v1Router = express.Router();
v1Router.use('/pdf', pdfRoutes);

// Mount versioned sub-routers
router.use('/v1', v1Router);

module.exports = router;
