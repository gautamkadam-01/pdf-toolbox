/**
 * Health Controller
 * Provides health checks for load balancers, monitoring, Docker, and CI/CD pipelines.
 */

const { nodeEnv } = require('../config/env');
const conversionService = require('../services/conversion/conversionService');

const healthController = {
  /**
   * GET /api/health
   */
  getHealth: (req, res) => {
    res.status(200).json({
      success: true,
      service: 'PDF Toolbox API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: nodeEnv,
    });
  },

  /**
   * GET /api/health/engines
   */
  getEngines: async (req, res) => {
    try {
      const engines = await conversionService.getEngineStatuses();
      res.status(200).json({
        success: true,
        service: 'PDF Toolbox API',
        engines,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: err.message,
        },
      });
    }
  },
};

module.exports = healthController;
