import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const backendApp = require('./backend/src/app.js');
const storageService = require('./backend/src/services/storageService.js');
const logger = require('./backend/src/utils/logger.js');

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize temporary storage directories
  storageService.ensureDirectories();

  // Mount backend API routes directly under /api
  app.use((req, res, next) => {
    const url = req.url || '';
    const path = req.path || '';
    const origUrl = req.originalUrl || '';
    const isApi =
      url === '/api' ||
      url.startsWith('/api/') ||
      url.startsWith('/api?') ||
      path === '/api' ||
      path.startsWith('/api/') ||
      origUrl === '/api' ||
      origUrl.startsWith('/api/') ||
      origUrl.startsWith('/api?');

    if (isApi) {
      return backendApp(req, res, (err: any) => {
        if (err) {
          logger.error(`API handling error for ${req.method} ${origUrl || url}:`, err);
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: {
                code: err.code || 'INTERNAL_SERVER_ERROR',
                message: err.message || 'An unexpected internal server error occurred.',
              },
            });
          }
        }
        if (!res.headersSent) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'ENDPOINT_NOT_FOUND',
              message: `API endpoint '${req.method} ${origUrl || url}' was not found.`,
            },
          });
        }
      });
    }
    next();
  });

  // Vite development middleware vs production static file serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`=========================================`);
    logger.info(`PDF Toolbox Unified Server Started`);
    logger.info(`Port        : ${PORT}`);
    logger.info(`Environment : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health Check: http://localhost:${PORT}/api/health`);
    logger.info(`API Base    : http://localhost:${PORT}/api/v1`);
    logger.info(`=========================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error initializing PDF Toolbox server:', err);
  process.exit(1);
});
