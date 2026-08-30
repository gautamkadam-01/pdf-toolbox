/**
 * Output Validation Utility
 * Enforces mandatory post-generation validation for all generated PDFs and ZIPs.
 * Ensures no zero-byte or corrupted files reach the client.
 */

const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const fs = require('fs');

const PDF_MAGIC_BYTES = Buffer.from('%PDF-', 'ascii');

/**
 * Validates a generated PDF output buffer or file path.
 * 
 * @param {Buffer|Uint8Array|string} output - PDF bytes or path to generated file
 * @param {number|null} [expectedPageCount=null] - Expected number of pages (optional)
 * @returns {Promise<{ isValid: boolean, error?: { code: string, message: string }, pageCount?: number, sizeBytes: number }>}
 */
async function validatePdfOutput(output, expectedPageCount = null) {
  let buffer;

  try {
    if (typeof output === 'string') {
      if (!fs.existsSync(output)) {
        return {
          isValid: false,
          sizeBytes: 0,
          error: {
            code: 'OUTPUT_GENERATION_FAILED',
            message: 'Generated PDF output file does not exist on disk.',
          },
        };
      }
      buffer = await fs.promises.readFile(output);
    } else if (Buffer.isBuffer(output) || output instanceof Uint8Array) {
      buffer = Buffer.from(output);
    } else {
      return {
        isValid: false,
        sizeBytes: 0,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Invalid output payload format provided for validation.',
        },
      };
    }

    // 1. Output exists and size > 0
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        sizeBytes: 0,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Generated PDF is empty (0 bytes).',
        },
      };
    }

    // 2. Begins with %PDF- (checked in header slice)
    const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
    if (headerSlice.indexOf(PDF_MAGIC_BYTES) === -1) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Generated output does not contain a valid %PDF- header signature.',
        },
      };
    }

    // 3. Can be loaded and parsed by PDF engine without throwing
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
    } catch (parseErr) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: `Generated PDF structure is corrupted or unparsable: ${parseErr.message}`,
        },
      };
    }

    const actualPageCount = pdfDoc.getPageCount();

    if (actualPageCount === 0) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Generated PDF contains 0 pages.',
        },
      };
    }

    // 4. Expected page count check if requested
    if (expectedPageCount !== null && actualPageCount !== expectedPageCount) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        pageCount: actualPageCount,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: `Generated PDF page count mismatch. Expected ${expectedPageCount} pages, but got ${actualPageCount}.`,
        },
      };
    }

    return {
      isValid: true,
      sizeBytes: buffer.length,
      pageCount: actualPageCount,
    };
  } catch (err) {
    return {
      isValid: false,
      sizeBytes: buffer ? buffer.length : 0,
      error: {
        code: 'OUTPUT_GENERATION_FAILED',
        message: `Validation failed: ${err.message}`,
      },
    };
  }
}

/**
 * Validates a generated ZIP archive output buffer or file path.
 * 
 * @param {Buffer|Uint8Array|string} output - ZIP bytes or path
 * @param {number} [minEntries=1] - Minimum expected entries in ZIP
 * @returns {Promise<{ isValid: boolean, error?: { code: string, message: string }, fileCount?: number, sizeBytes: number }>}
 */
async function validateZipOutput(output, minEntries = 1) {
  let buffer;

  try {
    if (typeof output === 'string') {
      if (!fs.existsSync(output)) {
        return {
          isValid: false,
          sizeBytes: 0,
          error: {
            code: 'OUTPUT_GENERATION_FAILED',
            message: 'Generated ZIP output file does not exist on disk.',
          },
        };
      }
      buffer = await fs.promises.readFile(output);
    } else if (Buffer.isBuffer(output) || output instanceof Uint8Array) {
      buffer = Buffer.from(output);
    } else {
      return {
        isValid: false,
        sizeBytes: 0,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Invalid ZIP output payload format provided for validation.',
        },
      };
    }

    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        sizeBytes: 0,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Generated ZIP archive is empty (0 bytes).',
        },
      };
    }

    // Check ZIP magic signature: 50 4B 03 04 or 50 4B 05 06 (empty zip)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: 'Generated output does not contain a valid ZIP archive signature.',
        },
      };
    }

    // Load with JSZip to verify entry integrity
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

    if (files.length < minEntries) {
      return {
        isValid: false,
        sizeBytes: buffer.length,
        error: {
          code: 'OUTPUT_GENERATION_FAILED',
          message: `Generated ZIP contains ${files.length} files, expected at least ${minEntries}.`,
        },
      };
    }

    return {
      isValid: true,
      sizeBytes: buffer.length,
      fileCount: files.length,
    };
  } catch (err) {
    return {
      isValid: false,
      sizeBytes: buffer ? buffer.length : 0,
      error: {
        code: 'OUTPUT_GENERATION_FAILED',
        message: `ZIP validation failed: ${err.message}`,
      },
    };
  }
}

/**
 * Validates a generated JPEG image buffer.
 * 
 * @param {Buffer|Uint8Array} buffer - Image bytes
 * @returns {{ isValid: boolean, error?: { code: string, message: string }, sizeBytes: number }}
 */
function validateJpegOutput(buffer) {
  if (!buffer || buffer.length < 4) {
    return {
      isValid: false,
      sizeBytes: buffer ? buffer.length : 0,
      error: {
        code: 'OUTPUT_GENERATION_FAILED',
        message: 'Generated image is empty or invalid.',
      },
    };
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    return {
      isValid: false,
      sizeBytes: buffer.length,
      error: {
        code: 'OUTPUT_GENERATION_FAILED',
        message: 'Generated image does not have a valid JPEG header signature.',
      },
    };
  }

  return {
    isValid: true,
    sizeBytes: buffer.length,
  };
}

module.exports = {
  validatePdfOutput,
  validateZipOutput,
  validateJpegOutput,
};
