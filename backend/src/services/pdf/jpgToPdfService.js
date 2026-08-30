/**
 * JPG to PDF Service
 * Converts one or more JPEG images into a valid multi-page PDF document.
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { validateImageBuffer } = require('../../utils/fileValidation');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Converts images into a standard PDF document.
 * 
 * @param {Array<{ buffer: Buffer, originalname?: string }>} imageFiles - Uploaded image files
 * @param {Object} [options={}] - Options (e.g. pageSize: 'fit' | 'a4')
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function jpgToPdf(imageFiles, options = {}) {
  if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
    const error = new Error('Please provide at least one image file.');
    error.code = 'NO_FILE';
    error.status = 400;
    throw error;
  }

  // 1. Validate all input images first
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const name = file.originalname || `image_${i + 1}.jpg`;
    const validation = validateImageBuffer(file.buffer, name);
    if (!validation.isValid) {
      const error = new Error(validation.error.message);
      error.code = validation.error.code;
      error.status = 422;
      throw error;
    }
  }

  const pdfDoc = await PDFDocument.create();

  // 2. Process each image in exact received order
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const name = file.originalname || `image_${i + 1}.jpg`;
    let imageBuffer = file.buffer;

    let embeddedImage;
    let dims = { width: 595.28, height: 841.89 }; // Default A4 dimensions

    try {
      const isPng = imageBuffer.length >= 4 && imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
      const isJpg = imageBuffer.length >= 3 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;

      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(imageBuffer);
      } else if (isJpg) {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      } else {
        throw new Error('Unsupported image encoding');
      }
      dims = { width: embeddedImage.width, height: embeddedImage.height };
    } catch (embedErr) {
      // Fallback: rasterize/convert image via Canvas
      try {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const cleanJpgBuffer = canvas.toBuffer('image/jpeg');
        embeddedImage = await pdfDoc.embedJpg(cleanJpgBuffer);
        dims = { width: img.width, height: img.height };
      } catch (canvasErr) {
        const error = new Error(`Failed to embed image '${name}': ${canvasErr.message}`);
        error.code = 'INVALID_IMAGE';
        error.status = 422;
        throw error;
      }
    }

    if (options.pageSize === 'a4') {
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      const scale = Math.min((A4_WIDTH - 40) / dims.width, (A4_HEIGHT - 40) / dims.height, 1);
      const scaledWidth = dims.width * scale;
      const scaledHeight = dims.height * scale;
      const x = (A4_WIDTH - scaledWidth) / 2;
      const y = (A4_HEIGHT - scaledHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    } else {
      // Fit page to image dimensions
      const page = pdfDoc.addPage([dims.width, dims.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
      });
    }
  }

  // 3. Generate PDF bytes
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);

  // 4. Output Validation (MANDATORY)
  const validation = await validatePdfOutput(outputBuffer, imageFiles.length);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // 5. Save output file
  const filePath = await storageService.saveTempFile(outputBuffer, 'jpg-to-pdf.pdf', 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: 'jpg-to-pdf.pdf',
    pageCount: imageFiles.length,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  jpgToPdf,
};
