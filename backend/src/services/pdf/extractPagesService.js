/**
 * Extract Pages Service
 * Extracts specified pages from a PDF into a new document, preserving requested page order.
 */

const { PDFDocument } = require('pdf-lib');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parsePageRange } = require('../../utils/pageRange');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Extracts specified pages from a PDF.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string|number|Array<number>} pagesToExtract - Pages or ranges to extract (e.g. '1,3,5', '5,2,3')
 * @param {string} [originalName='document.pdf']
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function extractPages(fileBuffer, pagesToExtract, originalName = 'document.pdf') {
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

  // 3. Parse page selection, preserving requested order
  const parseResult = parsePageRange(pagesToExtract, totalPages, {
    preserveOrder: true,
    deduplicate: false,
  });

  if (!parseResult.isValid) {
    const error = new Error(parseResult.error.message);
    error.code = parseResult.error.code;
    error.status = 400;
    throw error;
  }

  const selectedPages = parseResult.pages; // 1-indexed array in requested sequence
  const pageIndices = selectedPages.map((p) => p - 1);

  // 4. Construct new PDF with extracted pages
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  const expectedPageCount = selectedPages.length;

  // 5. Generate binary output
  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 6. Output Validation (MANDATORY)
  const validation = await validatePdfOutput(outputBuffer, expectedPageCount);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // 7. Save output
  const filePath = await storageService.saveTempFile(outputBuffer, 'extracted-pages.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'extracted-pages.pdf',
    pageCount: expectedPageCount,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  extractPages,
};
