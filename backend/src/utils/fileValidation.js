/**
 * PDF File Validation Utility
 * Validates existence, size, and binary magic signature (%PDF-)
 */

const { maxFileSizeBytes, maxFileSizeMb } = require('../config/env');

const PDF_MAGIC_BYTES = Buffer.from('%PDF-', 'ascii');

/**
 * Validates a raw PDF Buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} [originalName='document.pdf'] - Original file name for context
 * @returns {{ isValid: boolean, error?: { code: string, message: string } }}
 */
function validatePdfBuffer(buffer, originalName = 'document.pdf') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_FILE',
        message: 'No file buffer was provided for validation.',
      },
    };
  }

  if (buffer.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'EMPTY_FILE',
        message: `The file '${originalName}' is empty (0 bytes).`,
      },
    };
  }

  if (buffer.length > maxFileSizeBytes) {
    return {
      isValid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `The file '${originalName}' exceeds the maximum allowed size of ${maxFileSizeMb}MB.`,
      },
    };
  }

  // Check PDF signature: Must contain '%PDF-' within the first 1024 bytes
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
  const hasPdfSignature = headerSlice.indexOf(PDF_MAGIC_BYTES) !== -1;

  if (!hasPdfSignature) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PDF',
        message: `The file '${originalName}' is not a valid PDF document (missing %PDF- header signature).`,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates a Multer file object
 * @param {Express.Multer.File} file - Multer uploaded file object
 * @returns {{ isValid: boolean, error?: { code: string, message: string } }}
 */
function validatePdfFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_FILE',
        message: 'No file was uploaded.',
      },
    };
  }

  const filename = file.originalname || 'uploaded-file.pdf';

  if (!file.buffer && typeof file.size === 'number' && file.size === 0) {
    return {
      isValid: false,
      error: {
        code: 'EMPTY_FILE',
        message: `The file '${filename}' is empty.`,
      },
    };
  }

  if (file.buffer) {
    return validatePdfBuffer(file.buffer, filename);
  }

  // If stored on disk, validate basic metadata
  if (file.size > maxFileSizeBytes) {
    return {
      isValid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `The file '${filename}' exceeds the maximum allowed size of ${maxFileSizeMb}MB.`,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates an image buffer (JPEG/JPG/PNG)
 * @param {Buffer} buffer - File buffer
 * @param {string} [originalName='image.jpg'] - Original file name
 * @returns {{ isValid: boolean, error?: { code: string, message: string }, format?: string }}
 */
function validateImageBuffer(buffer, originalName = 'image.jpg') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_FILE',
        message: 'No file buffer was provided for image validation.',
      },
    };
  }

  if (buffer.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'EMPTY_FILE',
        message: `The image file '${originalName}' is empty (0 bytes).`,
      },
    };
  }

  if (buffer.length > maxFileSizeBytes) {
    return {
      isValid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `The image '${originalName}' exceeds the maximum allowed size of ${maxFileSizeMb}MB.`,
      },
    };
  }

  if (buffer.length < 4) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_IMAGE',
        message: `The file '${originalName}' is not a valid image file.`,
      },
    };
  }

  // Check JPEG signature: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // Check PNG signature: 89 50 4E 47
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  // Check WebP signature: RIFF....WEBP
  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  // Check TIFF signature: II*\0 (49 49 2A 00) or MM\0* (4D 4D 00 2A)
  const isTiff =
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a);
  // Check BMP signature: BM (42 4D)
  const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4d;
  // Check GIF signature: GIF8 (47 49 46 38)
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;

  if (isJpeg) {
    return { isValid: true, format: 'jpeg' };
  }
  if (isPng) {
    return { isValid: true, format: 'png' };
  }
  if (isWebp) {
    return { isValid: true, format: 'webp' };
  }
  if (isTiff) {
    return { isValid: true, format: 'tiff' };
  }
  if (isBmp) {
    return { isValid: true, format: 'bmp' };
  }
  if (isGif) {
    return { isValid: true, format: 'gif' };
  }

  return {
    isValid: false,
    error: {
      code: 'INVALID_IMAGE',
      message: `The file '${originalName}' is not a recognized image document (supported: JPG, PNG, WebP, TIFF).`,
    },
  };
}

/**
 * Validates an Office document buffer (DOCX, DOC, PPTX, PPT, XLSX, XLS)
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - File name
 * @param {'word'|'powerpoint'|'excel'|'any'} docType - Expected document type
 * @returns {{ isValid: boolean, error?: { code: string, message: string }, format?: string }}
 */
function validateOfficeBuffer(buffer, originalName = 'document.docx', docType = 'any') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_FILE',
        message: 'No file buffer was provided for document validation.',
      },
    };
  }

  if (buffer.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'EMPTY_FILE',
        message: `The document file '${originalName}' is empty (0 bytes).`,
      },
    };
  }

  if (buffer.length > maxFileSizeBytes) {
    return {
      isValid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `The document '${originalName}' exceeds the maximum allowed size of ${maxFileSizeMb}MB.`,
      },
    };
  }

  // Modern Office formats (docx, pptx, xlsx) are ZIP archives starting with 50 4B
  const isZipBased = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  // Legacy Office formats (doc, ppt, xls) are OLE Compound Files starting with D0 CF 11 E0
  const isOleBased = buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;

  const ext = (originalName.split('.').pop() || '').toLowerCase();

  if (!isZipBased && !isOleBased) {
    const errorCode = docType === 'word' || ext === 'docx' || ext === 'doc' ? 'INVALID_WORD_DOCUMENT' : 'INVALID_DOCUMENT';
    return {
      isValid: false,
      error: {
        code: errorCode,
        message: `The file '${originalName}' is not a valid Microsoft Office document.`,
      },
    };
  }

  if (docType === 'word' && ext !== 'docx' && ext !== 'doc') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_WORD_DOCUMENT',
        message: `Expected a Word document (.docx or .doc), but received '${originalName}'.`,
      },
    };
  }

  return { isValid: true, format: ext };
}

/**
 * Validates an HTML document buffer or string
 * @param {Buffer|string} bufferOrString - File buffer or string
 * @param {string} originalName - File name
 * @returns {{ isValid: boolean, error?: { code: string, message: string }, cleanString?: string }}
 */
function validateHtmlBuffer(bufferOrString, originalName = 'document.html') {
  if (!bufferOrString) {
    return {
      isValid: false,
      error: {
        code: 'HTML_INPUT_EMPTY',
        message: 'No HTML content was provided for validation.',
      },
    };
  }

  let str = Buffer.isBuffer(bufferOrString) ? bufferOrString.toString('utf8') : String(bufferOrString);
  
  // Normalize UTF-8 BOM if present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  if (!str.trim()) {
    return {
      isValid: false,
      error: {
        code: 'HTML_INPUT_EMPTY',
        message: `The HTML document '${originalName}' is empty.`,
      },
    };
  }

  if (Buffer.byteLength(str) > maxFileSizeBytes) {
    return {
      isValid: false,
      error: {
        code: 'HTML_FILE_TOO_LARGE',
        message: `The HTML document '${originalName}' exceeds the maximum allowed size of ${maxFileSizeMb}MB.`,
      },
    };
  }

  // If a filename is provided with extension, check extension validity (case-insensitive)
  if (originalName && originalName.includes('.')) {
    const ext = originalName.split('.').pop().toLowerCase();
    const nonHtmlExtensions = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'exe'];
    if (nonHtmlExtensions.includes(ext)) {
      return {
        isValid: false,
        error: {
          code: 'HTML_FILE_INVALID',
          message: `The file '${originalName}' is not a valid HTML document (received .${ext}).`,
        },
      };
    }
  }

  return { isValid: true, cleanString: str };
}

module.exports = {
  validatePdfBuffer,
  validatePdfFile,
  validateImageBuffer,
  validateOfficeBuffer,
  validateHtmlBuffer,
  PDF_MAGIC_BYTES,
};

