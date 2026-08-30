/**
 * PDF to JPG Service
 * Renders PDF document pages into high-resolution JPEG images.
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas } = require('@napi-rs/canvas');
const JSZip = require('jszip');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { parsePageRange } = require('../../utils/pageRange');
const { validateZipOutput, validateJpegOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Dynamically loads legacy PDF.js build for server-side rasterization
 */
let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

/**
 * Renders pages of a PDF to JPEG images.
 * 
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {string|number|Array<number>} [pages='all'] - Page selection
 * @param {string} [originalName='document.pdf']
 * @param {Object} [options={}] - Options (e.g. scale: 2.0, quality: 0.92)
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, isZip: boolean, mimeType: string, pageCount: number, sizeBytes: number }>}
 */
async function pdfToJpg(fileBuffer, pages = 'all', originalName = 'document.pdf', options = {}) {
  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Load PDF to get total page count
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

  // 3. Parse and validate target page numbers
  const pageRangeResult = parsePageRange(pages || 'all', totalPages, {
    preserveOrder: true,
    deduplicate: true,
  });

  if (!pageRangeResult.isValid) {
    const error = new Error(pageRangeResult.error.message);
    error.code = pageRangeResult.error.code;
    error.status = 400;
    throw error;
  }

  const targetPages = pageRangeResult.pages; // 1-indexed array
  const pdfjsLib = await getPdfjs();

  // 4. Load PDF with PDF.js for rendering
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdfjsDoc = await loadingTask.promise;
  const renderedImages = [];
  const scale = typeof options.scale === 'number' ? options.scale : 2.0;

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    try {
      const page = await pdfjsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const context = canvas.getContext('2d');

      // Set white background
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const jpegBuffer = canvas.toBuffer('image/jpeg');

      // Validate JPEG output
      const imgValidation = validateJpegOutput(jpegBuffer);
      if (!imgValidation.isValid) {
        throw new Error(imgValidation.error.message);
      }

      const padNum = String(pageNum).padStart(3, '0');
      renderedImages.push({
        name: `page-${padNum}.jpg`,
        buffer: jpegBuffer,
      });
    } catch (renderErr) {
      const error = new Error(`Failed to render page ${pageNum} to image: ${renderErr.message}`);
      error.code = 'PROCESSING_FAILED';
      error.status = 500;
      throw error;
    }
  }

  // 5. If single page rendered, return single JPEG
  if (renderedImages.length === 1) {
    const singleImage = renderedImages[0];
    const filePath = await storageService.saveTempFile(singleImage.buffer, singleImage.name, 'outputs');

    return {
      filePath,
      buffer: singleImage.buffer,
      filename: singleImage.name,
      isZip: false,
      mimeType: 'image/jpeg',
      pageCount: 1,
      sizeBytes: singleImage.buffer.length,
    };
  }

  // 6. Multiple pages: bundle into ZIP
  const zip = new JSZip();
  for (const img of renderedImages) {
    zip.file(img.name, img.buffer);
  }

  const zipUint8 = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const zipBuffer = Buffer.from(zipUint8);

  const zipValidation = await validateZipOutput(zipBuffer, renderedImages.length);
  if (!zipValidation.isValid) {
    const error = new Error(zipValidation.error.message);
    error.code = 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  const filePath = await storageService.saveTempFile(zipBuffer, 'pdf-to-jpg.zip', 'outputs');

  return {
    filePath,
    buffer: zipBuffer,
    filename: 'pdf-to-jpg.zip',
    isZip: true,
    mimeType: 'application/zip',
    pageCount: renderedImages.length,
    sizeBytes: zipBuffer.length,
  };
}

module.exports = {
  pdfToJpg,
};
