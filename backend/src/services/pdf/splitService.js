/**
 * Split PDF Service
 * Splits a PDF into one or multiple documents based on specified page ranges.
 */

const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parseSplitRanges } = require('../../utils/pageRange');
const { validatePdfOutput, validateZipOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Splits a PDF document by page ranges.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string|string[]} ranges - Page ranges, e.g. '1-3' or '1-2, 3-4' or ['1-2', '3-4']
 * @param {string} [originalName='document.pdf']
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, isZip: boolean, sizeBytes: number }>}
 */
async function splitPdf(fileBuffer, ranges, originalName = 'document.pdf') {
  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Load PDF and get page count
  let sourceDoc;
  try {
    sourceDoc = await PDFDocument.load(fileBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
  } catch (loadErr) {
    const error = new Error(`Failed to load source PDF '${originalName}': ${loadErr.message}`);
    error.code = 'INVALID_PDF';
    error.status = 422;
    throw error;
  }

  const totalPages = sourceDoc.getPageCount();

  // 3. Parse and validate page ranges
  const rangeResult = parseSplitRanges(ranges || `1-${totalPages}`, totalPages);
  if (!rangeResult.isValid) {
    const error = new Error(rangeResult.error.message);
    error.code = rangeResult.error.code;
    error.status = 400;
    throw error;
  }

  const groups = rangeResult.groups;
  const generatedPdfs = [];

  // 4. Generate each sub-PDF
  for (let i = 0; i < groups.length; i++) {
    const pageNumbers = groups[i]; // 1-indexed
    const pageIndices = pageNumbers.map((p) => p - 1); // 0-indexed

    const subDoc = await PDFDocument.create();
    const copiedPages = await subDoc.copyPages(sourceDoc, pageIndices);
    for (const page of copiedPages) {
      subDoc.addPage(page);
    }

    const subPdfBytes = await subDoc.save({ useObjectStreams: true });
    const subPdfBuffer = Buffer.from(subPdfBytes);

    // Mandatory output validation on every sub-PDF
    const subValidation = await validatePdfOutput(subPdfBuffer, pageNumbers.length);
    if (!subValidation.isValid) {
      const error = new Error(`Generated split part ${i + 1} validation failed: ${subValidation.error.message}`);
      error.code = 'OUTPUT_GENERATION_FAILED';
      error.status = 500;
      throw error;
    }

    const padIndex = String(i + 1).padStart(3, '0');
    generatedPdfs.push({
      name: `split-${padIndex}.pdf`,
      buffer: subPdfBuffer,
      pageCount: pageNumbers.length,
    });
  }

  // 5. If single split output, return single PDF
  if (generatedPdfs.length === 1) {
    const singlePdf = generatedPdfs[0];
    const filePath = await storageService.saveTempFile(singlePdf.buffer, singlePdf.name, 'outputs');

    return {
      filePath,
      buffer: singlePdf.buffer,
      filename: singlePdf.name,
      isZip: false,
      sizeBytes: singlePdf.buffer.length,
      pageCount: singlePdf.pageCount,
    };
  }

  // 6. Multiple outputs: bundle into ZIP archive
  const zip = new JSZip();
  for (const item of generatedPdfs) {
    zip.file(item.name, item.buffer);
  }

  const zipUint8 = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const zipBuffer = Buffer.from(zipUint8);

  // Mandatory ZIP validation
  const zipValidation = await validateZipOutput(zipBuffer, generatedPdfs.length);
  if (!zipValidation.isValid) {
    const error = new Error(zipValidation.error.message);
    error.code = 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  const filePath = await storageService.saveTempFile(zipBuffer, 'split-results.zip', 'outputs');

  return {
    filePath,
    buffer: zipBuffer,
    filename: 'split-results.zip',
    isZip: true,
    fileCount: generatedPdfs.length,
    sizeBytes: zipBuffer.length,
  };
}

module.exports = {
  splitPdf,
};
