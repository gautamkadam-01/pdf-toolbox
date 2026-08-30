import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const backendApp = require('./backend/src/app.js');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'backend-api-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?'))) {
            backendApp(req, res, next);
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});

