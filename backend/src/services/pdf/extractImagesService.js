/**
 * Extract Images Service
 * Extracts real embedded raw raster photos and graphics stored inside PDF objects (XObjects).
 * Returns single image or bundled ZIP archive. If no embedded images exist, returns NO_EMBEDDED_IMAGES.
 */

const conversionService = require('../conversion/conversionService');

/**
 * Checks if poppler pdfimages CLI utility is available
 * @returns {Promise<boolean>}
 */
async function isPdfImagesCliAvailable() {
  const adapter = conversionService.getAdapter('extractImages');
  return adapter.isAvailable();
}

/**
 * Extracts embedded images from a PDF document
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string} [originalName='document.pdf'] - Source PDF file name
 * @returns {Promise<{ buffer: Buffer, sizeBytes: number, imageCount: number, isZip: boolean, filename: string, mimeType: string }>}
 */
async function extractImagesFromPdf(fileBuffer, originalName = 'document.pdf') {
  return conversionService.extractImagesFromPdf(fileBuffer, originalName);
}

module.exports = {
  extractImagesFromPdf,
  isPdfImagesCliAvailable,
};

