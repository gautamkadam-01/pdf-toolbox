/**
 * Health Check Routes
 */

const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// GET /api/health
router.get('/', healthController.getHealth);

// GET /api/health/engines
router.get('/engines', healthController.getEngines);

module.exports = router;
