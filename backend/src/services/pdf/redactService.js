/**
 * Redact PDF Service
 * Permanently purges and redacts sensitive data from PDF pages.
 * Eradicates underlying text, OCR glyphs, vector lines, and image objects
 * by fusing solid redaction blocks permanently into the page canvas.
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas } = require('@napi-rs/canvas');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

/**
 * Redacts specified regions in a PDF document.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {Array<Object>|string} redactions - Redaction regions or JSON string
 * @param {Object} [options={}] - Redaction options (color, originalName)
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function redactPdf(fileBuffer, redactions, options = {}) {
  const originalName = options.originalName || 'document.pdf';

  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Parse redactions
  let parsedRedactions = redactions;
  if (typeof redactions === 'string') {
    try {
      parsedRedactions = JSON.parse(redactions);
    } catch (parseErr) {
      const error = new Error('Invalid JSON format for redactions array.');
      error.code = 'INVALID_REDACTIONS';
      error.status = 400;
      throw error;
    }
  }

  if (!Array.isArray(parsedRedactions) || parsedRedactions.length === 0) {
    const error = new Error('At least one redaction region must be specified.');
    error.code = 'INVALID_REDACTIONS';
    error.status = 400;
    throw error;
  }

  // 3. Load source document with pdf-lib
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
  if (totalPages === 0) {
    const error = new Error('PDF contains 0 pages.');
    error.code = 'INVALID_PDF';
    error.status = 422;
    throw error;
  }

  // Group valid redactions by page
  const redactionsByPage = new Map();
  for (const r of parsedRedactions) {
    const pageNum = parseInt(r.pageNumber || r.page || 1, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      const list = redactionsByPage.get(pageNum) || [];
      list.push(r);
      redactionsByPage.set(pageNum, list);
    }
  }

  if (redactionsByPage.size === 0) {
    const error = new Error('No redactions matched valid page numbers in the document.');
    error.code = 'INVALID_REDACTIONS';
    error.status = 400;
    throw error;
  }

  // 4. Render and redact pages
  const pdfjsLib = await getPdfjs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });
  const pdfjsDoc = await loadingTask.promise;

  const newDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const pageRedactions = redactionsByPage.get(pageNum);

    if (!pageRedactions || pageRedactions.length === 0) {
      // Untouched page: copy original vector page directly
      const [copiedPage] = await newDoc.copyPages(sourceDoc, [i]);
      newDoc.addPage(copiedPage);
    } else {
      // Redacted page: render at high resolution, apply solid redaction blocks,
      // and replace with permanently flattened high-fidelity image.
      const page = await pdfjsDoc.getPage(pageNum);
      const scale = 2.5; // ~200-300 DPI high resolution
      const viewport = page.getViewport({ scale });

      const visualWidth = viewport.width / scale;
      const visualHeight = viewport.height / scale;

      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');

      // Set white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // Draw permanent solid redaction rectangles directly on canvas pixels
      for (const r of pageRedactions) {
        const xRel = typeof r.xRel === 'number' 
          ? r.xRel 
          : (typeof r.x === 'number' ? r.x / (r.pageWidth || visualWidth) : 0);
        
        const yRel = typeof r.yRel === 'number'
          ? r.yRel
          : (typeof r.y === 'number' 
              ? (r.origin === 'bottom-left' 
                  ? (visualHeight - r.y - (r.height || 0)) / visualHeight 
                  : r.y / (r.pageHeight || visualHeight))
              : 0);

        const widthRel = typeof r.widthRel === 'number'
          ? r.widthRel
          : (typeof r.width === 'number' ? r.width / (r.pageWidth || visualWidth) : 0.1);

        const heightRel = typeof r.heightRel === 'number'
          ? r.heightRel
          : (typeof r.height === 'number' ? r.height / (r.pageHeight || visualHeight) : 0.05);

        const rx = Math.max(0, Math.min(1, xRel)) * canvas.width;
        const ry = Math.max(0, Math.min(1, yRel)) * canvas.height;
        const rw = Math.max(0, Math.min(1 - xRel, widthRel)) * canvas.width;
        const rh = Math.max(0, Math.min(1 - yRel, heightRel)) * canvas.height;

        ctx.fillStyle = r.color || options.color || '#000000';
        ctx.fillRect(rx, ry, rw, rh);
      }

      const jpegBuffer = canvas.toBuffer('image/jpeg');
      const embeddedImage = await newDoc.embedJpg(jpegBuffer);

      const newPage = newDoc.addPage([visualWidth, visualHeight]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: visualWidth,
        height: visualHeight,
      });
    }
  }

  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 5. Output Validation
  const validation = await validatePdfOutput(outputBuffer, totalPages);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  const baseName = originalName.replace(/\.pdf$/i, '');
  const outFilename = `${baseName}_redacted.pdf`;
  const filePath = await storageService.saveTempFile(outputBuffer, outFilename, 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: outFilename,
    pageCount: totalPages,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  redactPdf,
};
