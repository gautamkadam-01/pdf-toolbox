const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT, 10) || 5000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
const tempDir = path.resolve(__dirname, '../../', process.env.TEMP_DIR || './temp');

// System Binary paths for Phase 3A (Configurable for Docker / local development)
const officeConverterPath = process.env.OFFICE_CONVERTER_PATH || 'libreoffice';
const browserExecutablePath = process.env.BROWSER_EXECUTABLE_PATH || 'chromium';
const ghostscriptPath = process.env.GHOSTSCRIPT_PATH || 'gs';

module.exports = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  port,
  frontendUrl,
  maxFileSizeMb,
  maxFileSizeBytes,
  tempDir,
  uploadsDir: path.join(tempDir, 'uploads'),
  outputsDir: path.join(tempDir, 'outputs'),
  officeConverterPath,
  browserExecutablePath,
  ghostscriptPath,
};

