/**
 * PDF Controller
 * Handles all 8 core server-side PDF operations with robust validation,
 * download headers, structured error reporting, and automatic temporary file cleanup.
 */

const { validatePdfFile } = require('../utils/fileValidation');
const storageService = require('../services/storageService');
const conversionService = require('../services/conversion/conversionService');
const logger = require('../utils/logger');

// Import core manipulation service modules
const { mergePdfs } = require('../services/pdf/mergeService');
const { splitPdf } = require('../services/pdf/splitService');
const { jpgToPdf } = require('../services/pdf/jpgToPdfService');
const { pdfToJpg } = require('../services/pdf/pdfToJpgService');
const { rotatePdf } = require('../services/pdf/rotateService');
const { removePages } = require('../services/pdf/removePagesService');
const { extractPages } = require('../services/pdf/extractPagesService');
const { watermarkPdf } = require('../services/pdf/watermarkService');
const { protectPdf } = require('../services/pdf/protectService');
const { unlockPdf } = require('../services/pdf/unlockService');
const { redactPdf } = require('../services/pdf/redactService');

/**
 * Helper to safely extract single or multiple uploaded files from req
 */
function getUploadedFiles(req) {
  if (req.files) {
    if (Array.isArray(req.files)) {
      return req.files;
    }
    // multer fields object
    const filesArray = [];
    Object.values(req.files).forEach((fieldArr) => {
      if (Array.isArray(fieldArr)) {
        filesArray.push(...fieldArr);
      }
    });
    if (filesArray.length > 0) return filesArray;
  }
  if (req.file) {
    return [req.file];
  }
  return [];
}

/**
 * Sends binary file or JSON response and registers cleanup on finish/close
 */
function sendOperationResponse(req, res, result, defaultMime = 'application/pdf') {
  const mimeType = result.mimeType || (result.isZip ? 'application/zip' : defaultMime);
  const filename = result.filename || 'document.pdf';

  // Ensure temp file is cleaned up after response finishes
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (typeof result.cleanup === 'function') {
      result.cleanup().catch(() => {});
    }
    if (result.filePath) {
      storageService.deleteFile(result.filePath).catch((err) => {
        logger.warn(`Cleanup error for ${result.filePath}: ${err.message}`);
      });
    }
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  // If client explicitly requested JSON metadata
  if (req.query.format === 'json') {
    return res.status(200).json({
      success: true,
      message: 'PDF processed successfully.',
      data: {
        filename,
        mimeType,
        sizeBytes: result.sizeBytes,
        pageCount: result.pageCount,
        fileCount: result.fileCount,
      },
    });
  }

  // Standard binary download response
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (result.sizeBytes) {
    res.setHeader('Content-Length', result.sizeBytes);
  }

  return res.status(200).send(result.buffer);
}

/**
 * Handles controller errors uniformly
 */
function handleControllerError(err, res) {
  logger.error(`PDF Operation Error: ${err.message} (${err.code || 'UNKNOWN'})`);
  const status = err.status || (err.code === 'INVALID_PDF' || err.code === 'INVALID_IMAGE' ? 422 : 400);

  return res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: {
      code: err.code || 'PROCESSING_FAILED',
      message: err.message || 'An unexpected error occurred during PDF processing.',
    },
  });
}

const pdfController = {
  /**
   * POST /api/v1/pdf/validate
   * Validates an uploaded PDF file buffer against magic bytes and size constraints
   */
  validateUpload: (req, res) => {
    const files = getUploadedFiles(req);
    const file = files[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'No file was provided in the upload request.',
        },
      });
    }

    const validation = validatePdfFile(file);

    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        error: validation.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'PDF file is valid.',
      fileInfo: {
        originalName: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
    });
  },

  /**
   * 1. POST /api/v1/pdf/merge
   * Merges multiple PDF files into one
   */
  merge: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_FEW_FILES',
            message: 'Merge operation requires at least two PDF files.',
          },
        });
      }

      const result = await mergePdfs(files);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 2. POST /api/v1/pdf/split
   * Splits a PDF document by page ranges
   */
  split: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for split operation.',
          },
        });
      }

      const ranges = req.body.ranges || req.body.pages || req.query.ranges || req.query.pages || '1';
      const result = await splitPdf(file.buffer, ranges, file.originalname);
      return sendOperationResponse(req, res, result, result.isZip ? 'application/zip' : 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 3. POST /api/v1/pdf/jpg-to-pdf
   * Converts one or more JPEG images into a PDF
   */
  jpgToPdf: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'At least one image file is required.',
          },
        });
      }

      const pageSize = req.body.pageSize || req.query.pageSize || 'fit';
      const result = await jpgToPdf(files, { pageSize });
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 4. POST /api/v1/pdf/to-jpg
   * Renders PDF pages to JPEG images (single image or ZIP)
   */
  toJpg: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for PDF to JPG conversion.',
          },
        });
      }

      const pages = req.body.pages || req.query.pages || 'all';
      const result = await pdfToJpg(file.buffer, pages, file.originalname);
      return sendOperationResponse(req, res, result, result.mimeType);
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 5. POST /api/v1/pdf/rotate
   * Rotates specified pages of a PDF
   */
  rotate: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for rotate operation.',
          },
        });
      }

      const angle = req.body.rotation ?? req.body.angle ?? req.query.rotation ?? req.query.angle ?? 90;
      const pages = req.body.pages || req.query.pages || 'all';

      const result = await rotatePdf(file.buffer, angle, pages, file.originalname);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 6. POST /api/v1/pdf/remove-pages
   * Removes requested pages from a PDF
   */
  removePages: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for page removal.',
          },
        });
      }

      const pages = req.body.pages || req.query.pages;
      if (!pages) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGE_RANGE',
            message: 'Pages parameter is required (e.g. pages=2,4).',
          },
        });
      }

      const result = await removePages(file.buffer, pages, file.originalname);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 7. POST /api/v1/pdf/extract-pages
   * Extracts requested pages into a new PDF
   */
  extractPages: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for page extraction.',
          },
        });
      }

      const pages = req.body.pages || req.query.pages;
      if (!pages) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGE_RANGE',
            message: 'Pages parameter is required (e.g. pages=1,3,5).',
          },
        });
      }

      const result = await extractPages(file.buffer, pages, file.originalname);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 8. POST /api/v1/pdf/watermark
   * Applies text watermark to PDF pages
   */
  watermark: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for watermarking.',
          },
        });
      }

      const options = {
        text: req.body.text ?? req.query.text,
        opacity: req.body.opacity ?? req.query.opacity,
        rotation: req.body.rotation ?? req.query.rotation,
        position: req.body.position ?? req.query.position,
        pages: req.body.pages ?? req.query.pages,
        fontSize: req.body.fontSize ?? req.query.fontSize,
      };

      const result = await watermarkPdf(file.buffer, options, file.originalname);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 9. POST /api/v1/pdf/compress
   * Compresses PDF documents and returns reduction stats
   */
  compress: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required for compression.',
          },
        });
      }

      const level = req.body.level || req.query.level || 'medium';
      const result = await conversionService.compressPdf(file.buffer, level, file.originalname);

      // Return reduction stats in response headers
      res.setHeader('X-Original-Size', String(result.originalSize || file.buffer.length));
      res.setHeader('X-Compressed-Size', String(result.compressedSize || result.sizeBytes));
      if (result.savedBytes !== undefined) res.setHeader('X-Saved-Bytes', String(result.savedBytes));
      if (result.savedPercentage !== undefined) res.setHeader('X-Saved-Percentage', String(result.savedPercentage));

      if (req.query.format === 'json') {
        return res.status(200).json({
          success: true,
          message: 'PDF compressed successfully.',
          data: {
            filename: result.filename,
            originalSize: result.originalSize || file.buffer.length,
            compressedSize: result.compressedSize || result.sizeBytes,
            savedBytes: result.savedBytes,
            savedPercentage: result.savedPercentage,
            pageCount: result.pageCount,
          },
        });
      }

      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 10. POST /api/v1/pdf/word-to-pdf
   * Converts Word documents (.docx, .doc) to PDF
   */
  wordToPdf: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A Word document (.docx or .doc) is required.',
          },
        });
      }

      const result = await conversionService.convertOffice(file.buffer, file.originalname, 'word');
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 11. POST /api/v1/pdf/powerpoint-to-pdf
   * Converts PowerPoint presentations (.pptx, .ppt) to PDF
   */
  powerpointToPdf: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PowerPoint presentation (.pptx or .ppt) is required.',
          },
        });
      }

      const result = await conversionService.convertOffice(file.buffer, file.originalname, 'powerpoint');
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 12. POST /api/v1/pdf/excel-to-pdf
   * Converts Excel spreadsheets (.xlsx, .xls) to PDF
   */
  excelToPdf: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'An Excel spreadsheet (.xlsx or .xls) is required.',
          },
        });
      }

      const result = await conversionService.convertOffice(file.buffer, file.originalname, 'excel');
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 13. POST /api/v1/pdf/html-to-pdf
   * Renders HTML documents or raw markup into PDF
   */
  htmlToPdf: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      let htmlContent = file ? file.buffer : (req.body.html || req.body.content || '');
      const originalName = file ? file.originalname : 'webpage.html';

      if (!htmlContent || (typeof htmlContent === 'string' && !htmlContent.trim())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'HTML_INPUT_EMPTY',
            message: 'HTML content or a .html file is required.',
          },
        });
      }

      let margin = 10;
      if (req.body.margin !== undefined && req.body.margin !== null && req.body.margin !== '') {
        const parsed = parseInt(req.body.margin, 10);
        if (!isNaN(parsed) && parsed >= 0) margin = parsed;
      } else if (req.query.margin !== undefined && req.query.margin !== null && req.query.margin !== '') {
        const parsed = parseInt(req.query.margin, 10);
        if (!isNaN(parsed) && parsed >= 0) margin = parsed;
      }

      const options = {
        pageSize: req.body.pageSize || req.query.pageSize || 'A4',
        orientation: req.body.orientation || req.query.orientation || 'portrait',
        margin,
      };

      const result = await conversionService.convertHtml(htmlContent, options, originalName);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 14. POST /api/v1/pdf/extract-images
   * Extracts embedded raster images from PDF objects
   */
  extractImages: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required to extract images.',
          },
        });
      }

      const result = await conversionService.extractImages(file.buffer, file.originalname);
      return sendOperationResponse(req, res, result, result.mimeType);
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 15. POST /api/v1/pdf/protect
   * Encrypts a PDF document with password protection
   */
  protect: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required to apply password protection.',
          },
        });
      }

      const password = req.body.password || req.query.password;
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'A valid password is required to protect the document.',
          },
        });
      }

      const options = {
        algorithm: req.body.algorithm || req.query.algorithm || 'AES-256',
        allowPrinting: req.body.allowPrinting !== 'false' && req.body.allowPrinting !== false,
        allowCopying: req.body.allowCopying === 'true' || req.body.allowCopying === true,
        allowModifying: req.body.allowModifying === 'true' || req.body.allowModifying === true,
        allowAnnotating: req.body.allowAnnotating === 'true' || req.body.allowAnnotating === true,
        originalName: file.originalname,
      };

      const result = await protectPdf(file.buffer, password, options);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 16. POST /api/v1/pdf/unlock
   * Decrypts a password-protected PDF document
   */
  unlock: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required to unlock.',
          },
        });
      }

      const password = req.body.password || req.query.password;
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Password is required to unlock this document.',
          },
        });
      }

      const options = {
        originalName: file.originalname,
      };

      const result = await unlockPdf(file.buffer, password, options);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },

  /**
   * 17. POST /api/v1/pdf/redact
   * Permanently redacts specified areas on PDF pages
   */
  redact: async (req, res) => {
    try {
      const files = getUploadedFiles(req);
      const file = files[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'A PDF file is required to redact.',
          },
        });
      }

      let redactions = req.body.redactions;
      if (!redactions && req.body.regions) redactions = req.body.regions;

      if (!redactions) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REDACTIONS',
            message: 'Redaction regions are required.',
          },
        });
      }

      const options = {
        color: req.body.color || '#000000',
        originalName: file.originalname,
      };

      const result = await redactPdf(file.buffer, redactions, options);
      return sendOperationResponse(req, res, result, 'application/pdf');
    } catch (err) {
      return handleControllerError(err, res);
    }
  },
};

module.exports = pdfController;
