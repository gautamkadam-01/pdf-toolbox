/**
 * Compress PDF Service
 * Optimizes and compresses PDF documents using Ghostscript with graceful fallback to pdf-lib.
 * Measures real byte reductions honestly and preserves document validity and page integrity.
 */

const conversionService = require('../conversion/conversionService');

/**
 * Checks if Ghostscript binary is available on the system
 * @returns {Promise<boolean>}
 */
async function isGhostscriptAvailable() {
  const adapter = conversionService.getAdapter('compress');
  return adapter.isAvailable();
}

/**
 * Compresses a PDF file and computes accurate reduction statistics
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {'low'|'medium'|'high'} [level='medium'] - Target compression strength
 * @param {string} [originalName='document.pdf'] - Original file name
 * @returns {Promise<{ buffer: Buffer, sizeBytes: number, originalSize: number, compressedSize: number, savedBytes: number, savedPercentage: number, pageCount: number, filename: string, isSmaller: boolean }>}
 */
async function compressPdf(fileBuffer, level = 'medium', originalName = 'document.pdf') {
  return conversionService.compressPdf(fileBuffer, level, originalName);
}

module.exports = {
  compressPdf,
  isGhostscriptAvailable,
};

