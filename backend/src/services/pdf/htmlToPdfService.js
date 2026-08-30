/**
 * HTML to PDF Service
 * Renders HTML/CSS documents or raw markup into crisp paginated PDF documents using
 * centralized ConversionService and HtmlAdapter.
 */

const conversionService = require('../conversion/conversionService');

/**
 * Checks if Chromium / Chrome browser binary is accessible
 * @returns {Promise<boolean>}
 */
async function isBrowserAvailable() {
  const adapter = conversionService.getAdapter('html');
  return adapter.isAvailable();
}

/**
 * Converts HTML buffer or string to PDF
 * 
 * @param {Buffer|string} htmlContent - HTML file buffer or raw string
 * @param {Object} options - Conversion settings
 * @param {string} [options.pageSize='A4'] - Paper size (A4, Letter, Legal, A3, A5)
 * @param {'portrait'|'landscape'} [options.orientation='portrait'] - Orientation
 * @param {number} [options.margin=10] - Margins in mm
 * @param {string} [originalName='document.html'] - Original file name
 * @returns {Promise<{ buffer: Buffer, sizeBytes: number, pageCount: number, filename: string, mimeType: string }>}
 */
async function htmlToPdf(htmlContent, options = {}, originalName = 'document.html') {
  return conversionService.htmlToPdf(htmlContent, options, originalName);
}

module.exports = {
  htmlToPdf,
  isBrowserAvailable,
};

