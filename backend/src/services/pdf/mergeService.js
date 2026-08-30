/**
 * Merge PDF Service
 * Merges two or more PDF files in the exact sequence received.
 */

const { PDFDocument } = require('pdf-lib');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Merges multiple PDF files into a single document.
 * 
 * @param {Array<{ buffer: Buffer, originalname?: string }>} files - Uploaded files
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function mergePdfs(files) {
  if (!files || !Array.isArray(files) || files.length < 2) {
    const error = new Error('Merge requires at least two PDF files.');
    error.code = 'TOO_FEW_FILES';
    error.status = 400;
    throw error;
  }

  // 1. Validate all input files first
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.originalname || `file_${i + 1}.pdf`;
    const validation = validatePdfBuffer(file.buffer, name);
    if (!validation.isValid) {
      const error = new Error(validation.error.message);
      error.code = validation.error.code;
      error.status = 422;
      throw error;
    }
  }

  // 2. Process and merge in exact received order
  const mergedDoc = await PDFDocument.create();
  let expectedTotalPages = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.originalname || `file_${i + 1}.pdf`;

    let sourceDoc;
    try {
      sourceDoc = await PDFDocument.load(file.buffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
    } catch (loadErr) {
      const error = new Error(`Failed to read PDF '${name}': ${loadErr.message}`);
      error.code = 'INVALID_PDF';
      error.status = 422;
      throw error;
    }

    const pageIndices = sourceDoc.getPageIndices();
    expectedTotalPages += pageIndices.length;

    const copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  // 3. Generate binary output
  const pdfBytes = await mergedDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 4. Output Validation (MANDATORY)
  const validation = await validatePdfOutput(outputBuffer, expectedTotalPages);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // 5. Save output via storage abstraction
  const filePath = await storageService.saveTempFile(outputBuffer, 'merged.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'merged.pdf',
    pageCount: expectedTotalPages,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  mergePdfs,
};
