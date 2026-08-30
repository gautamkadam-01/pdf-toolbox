/**
 * Watermark PDF Service
 * Applies a customizable text watermark to all or selected pages of a PDF document.
 */

const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parsePageRange } = require('../../utils/pageRange');
const { validatePdfOutput } = require('../../utils/outputValidation');
const { sanitizeWinAnsi } = require('../../utils/textEncoding');
const storageService = require('../storageService');

const VALID_POSITIONS = new Set([
  'center',
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);

/**
 * Applies a text watermark to specified pages of a PDF.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {Object} options - Watermark options
 * @param {string} options.text - Watermark text
 * @param {number|string} [options.opacity=0.3] - Opacity between 0.0 and 1.0
 * @param {number|string} [options.rotation=45] - Rotation in degrees
 * @param {string} [options.position='center'] - Watermark placement
 * @param {string|number|Array<number>} [options.pages='all'] - Target pages
 * @param {number|string} [options.fontSize=48] - Font size in pt
 * @param {string} [options.color] - Optional hex color
 * @param {string} [originalName='document.pdf']
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function watermarkPdf(fileBuffer, options = {}, originalName = 'document.pdf') {
  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Validate watermark parameters
  const text = (options.text || '').trim();
  if (!text) {
    const error = new Error('Watermark text parameter is required.');
    error.code = 'INVALID_WATERMARK_TEXT';
    error.status = 400;
    throw error;
  }

  // Opacity: 0.0 to 1.0
  let opacity = 0.3;
  if (options.opacity !== undefined && options.opacity !== null && options.opacity !== '') {
    opacity = parseFloat(options.opacity);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      const error = new Error('Opacity must be a decimal number between 0.0 and 1.0.');
      error.code = 'INVALID_OPACITY';
      error.status = 400;
      throw error;
    }
  }

  // Rotation: degrees
  let rotationDeg = 45;
  if (options.rotation !== undefined && options.rotation !== null && options.rotation !== '') {
    rotationDeg = parseFloat(options.rotation);
    if (isNaN(rotationDeg)) {
      const error = new Error('Rotation must be a valid number in degrees.');
      error.code = 'INVALID_ROTATION';
      error.status = 400;
      throw error;
    }
  }

  // Position
  const rawPosition = (options.position || 'center').toLowerCase().trim();
  const position = VALID_POSITIONS.has(rawPosition) ? rawPosition : 'center';

  // Font Size
  let fontSize = 48;
  if (options.fontSize) {
    const parsedSize = parseFloat(options.fontSize);
    if (!isNaN(parsedSize) && parsedSize > 4 && parsedSize <= 144) {
      fontSize = parsedSize;
    }
  }

  // 3. Load PDF
  let sourceDoc;
  try {
    sourceDoc = await PDFDocument.load(fileBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
  } catch (loadErr) {
    const error = new Error(`Failed to load PDF '${originalName}': ${loadErr.message}`);
    error.code = 'INVALID_PDF';
    error.status = 422;
    throw error;
  }

  const totalPages = sourceDoc.getPageCount();

  // 4. Parse page selection
  const pageResult = parsePageRange(options.pages || 'all', totalPages, {
    preserveOrder: false,
    deduplicate: true,
  });

  if (!pageResult.isValid) {
    const error = new Error(pageResult.error.message);
    error.code = pageResult.error.code;
    error.status = 400;
    throw error;
  }

  const targetPagesSet = new Set(pageResult.pages); // 1-indexed

  // 5. Embed font & sanitize text for WinAnsi safety
  const safeText = sanitizeWinAnsi(text);
  const helveticaFont = await sourceDoc.embedFont(StandardFonts.HelveticaBold);
  const textWidth = helveticaFont.widthOfTextAtSize(safeText, fontSize);
  const textHeight = helveticaFont.heightAtSize(fontSize);

  const pages = sourceDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    if (!targetPagesSet.has(pageNum)) continue;

    const page = pages[i];
    const { width, height } = page.getSize();

    let cx = width / 2;
    let cy = height / 2;
    const padding = 50;

    switch (position) {
      case 'top':
      case 'top-center':
        cx = width / 2;
        cy = height - padding - fontSize / 2;
        break;
      case 'top-left':
        cx = padding + textWidth / 2;
        cy = height - padding - fontSize / 2;
        break;
      case 'top-right':
        cx = width - padding - textWidth / 2;
        cy = height - padding - fontSize / 2;
        break;
      case 'bottom':
      case 'bottom-center':
        cx = width / 2;
        cy = padding + fontSize / 2;
        break;
      case 'bottom-left':
        cx = padding + textWidth / 2;
        cy = padding + fontSize / 2;
        break;
      case 'bottom-right':
        cx = width - padding - textWidth / 2;
        cy = padding + fontSize / 2;
        break;
      case 'center':
      default:
        cx = width / 2;
        cy = height / 2;
        break;
    }

    // pdf-lib rotates text around its bottom-left origin.
    // Shift the bottom-left coordinate so rotation occurs around the intended center (cx, cy).
    const rad = (rotationDeg * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    const halfW = textWidth / 2;
    const halfH = textHeight / 2;

    const drawX = cx - (halfW * cosAngle - halfH * sinAngle);
    const drawY = cy - (halfW * sinAngle + halfH * cosAngle);

    page.drawText(safeText, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotationDeg),
    });
  }

  // 6. Generate binary output
  const pdfBytes = await sourceDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 7. Output Validation (MANDATORY)
  const validation = await validatePdfOutput(outputBuffer, totalPages);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // 8. Save output
  const filePath = await storageService.saveTempFile(outputBuffer, 'watermarked.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'watermarked.pdf',
    pageCount: totalPages,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  watermarkPdf,
};
