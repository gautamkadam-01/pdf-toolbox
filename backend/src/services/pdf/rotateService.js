/**
 * Rotate PDF Service
 * Rotates specified or all pages of a PDF document by 90, 180, or 270 degrees.
 */

const { PDFDocument, degrees } = require('pdf-lib');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parsePageRange } = require('../../utils/pageRange');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Rotates pages of a PDF document.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {number|string} rotation - Rotation angle (90, 180, 270, -90, etc.)
 * @param {string|number|Array<number>} [pages='all'] - Page selection
 * @param {string} [originalName='document.pdf']
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function rotatePdf(fileBuffer, rotation, pages = 'all', originalName = 'document.pdf') {
  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Validate rotation angle
  const numRotation = parseInt(rotation, 10);
  if (isNaN(numRotation)) {
    const error = new Error('Rotation angle must be a valid number (e.g. 90, 180, 270).');
    error.code = 'INVALID_ROTATION';
    error.status = 400;
    throw error;
  }

  const normalizedAngle = ((numRotation % 360) + 360) % 360;
  if (![90, 180, 270].includes(normalizedAngle)) {
    const error = new Error('Rotation angle must be 90, 180, or 270 degrees.');
    error.code = 'INVALID_ROTATION';
    error.status = 400;
    throw error;
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
  const pageResult = parsePageRange(pages || 'all', totalPages, {
    preserveOrder: false,
    deduplicate: true,
  });

  if (!pageResult.isValid) {
    const error = new Error(pageResult.error.message);
    error.code = pageResult.error.code;
    error.status = 400;
    throw error;
  }

  const targetPageSet = new Set(pageResult.pages); // 1-indexed set

  // 5. Apply rotation to target pages
  const allPdfPages = sourceDoc.getPages();
  for (let i = 0; i < allPdfPages.length; i++) {
    const pageNumber = i + 1;
    if (targetPageSet.has(pageNumber)) {
      const page = allPdfPages[i];
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + normalizedAngle) % 360;
      page.setRotation(degrees(newRotation));
    }
  }

  // 6. Generate output
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
  const filePath = await storageService.saveTempFile(outputBuffer, 'rotated.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'rotated.pdf',
    pageCount: totalPages,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  rotatePdf,
};
