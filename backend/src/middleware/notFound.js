/**
 * 404 Not Found Middleware
 * Handles all requests to undefined routes and returns structured JSON.
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    },
  });
}

module.exports = notFoundHandler;
