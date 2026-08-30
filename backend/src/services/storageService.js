/**
 * Storage Service Abstraction
 * Manages local temporary files for uploads and outputs.
 * Designed to be seamlessly replaced with an AWS S3 / Cloud Storage provider in future phases.
 */

const fs = require('fs');
const path = require('path');
const { tempDir, uploadsDir, outputsDir } = require('../config/env');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensures all required local directories exist
   */
  ensureDirectories() {
    const dirs = [tempDir, uploadsDir, outputsDir];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Saves a buffer to a temporary file
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Target filename
   * @param {'uploads' | 'outputs'} [folder='uploads'] - Subfolder inside temp
   * @returns {Promise<string>} Full file path
   */
  async saveTempFile(buffer, filename, folder = 'uploads') {
    this.ensureDirectories();
    const targetDir = folder === 'outputs' ? outputsDir : uploadsDir;
    const sanitizedName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(targetDir, sanitizedName);

    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Safely deletes a file if it exists
   * @param {string} filePath - Absolute or relative path to file
   * @returns {Promise<boolean>}
   */
  async deleteFile(filePath) {
    if (!filePath) return false;
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    } catch (err) {
      logger.warn(`Failed to delete temporary file ${filePath}: ${err.message}`);
    }
    return false;
  }

  /**
   * Cleans up files older than maxAgeMs in temp directories
   * @param {number} [maxAgeMs=3600000] - Default: 1 hour (3600000 ms)
   */
  async cleanupOldFiles(maxAgeMs = 3600000) {
    const now = Date.now();
    const dirs = [uploadsDir, outputsDir];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = await fs.promises.stat(fullPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(fullPath);
            logger.debug(`Cleaned up stale temp file: ${file}`);
          }
        }
      } catch (err) {
        logger.warn(`Error during temp storage cleanup in ${dir}: ${err.message}`);
      }
    }
  }
}

// Export singleton instance
module.exports = new StorageService();
