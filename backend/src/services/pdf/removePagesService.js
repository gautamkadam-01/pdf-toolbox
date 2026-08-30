/**
 * Remove Pages Service
 * Removes specified pages from a PDF document while preserving remaining content.
 */

const { PDFDocument } = require('pdf-lib');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parsePageRange } = require('../../utils/pageRange');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Removes specified pages from a PDF.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string|number|Array<number>} pagesToRemove - Pages or ranges to delete (e.g. '2,4', '2-5')
 * @param {string} [originalName='document.pdf']
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function removePages(fileBuffer, pagesToRemove, originalName = 'document.pdf') {
  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Load PDF
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

  // 3. Parse pages to remove
  const parseResult = parsePageRange(pagesToRemove, totalPages, {
    preserveOrder: false,
    deduplicate: true,
  });

  if (!parseResult.isValid) {
    const error = new Error(parseResult.error.message);
    error.code = parseResult.error.code;
    error.status = 400;
    throw error;
  }

  const pagesToDeleteSet = new Set(parseResult.pages); // 1-indexed

  // Prevent removing every page
  if (pagesToDeleteSet.size >= totalPages) {
    const error = new Error('A PDF must contain at least one page.');
    error.code = 'NO_PAGES_REMAIN';
    error.status = 400;
    throw error;
  }

  // 4. Construct new PDF with remaining pages
  const remainingIndices = [];
  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    if (!pagesToDeleteSet.has(pageNum)) {
      remainingIndices.push(i);
    }
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(sourceDoc, remainingIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  const expectedRemainingCount = remainingIndices.length;

  // 5. Generate binary output
  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 6. Output Validation (MANDATORY)
  const validation = await validatePdfOutput(outputBuffer, expectedRemainingCount);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // 7. Save output
  const filePath = await storageService.saveTempFile(outputBuffer, 'removed-pages.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'removed-pages.pdf',
    pageCount: expectedRemainingCount,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  removePages,
};
