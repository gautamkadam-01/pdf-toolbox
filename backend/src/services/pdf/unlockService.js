/**
 * Unlock PDF Service
 * Decrypts password-protected PDF files using AES-256 and RC4 handlers.
 */

const { PDFDocument } = require('pdf-lib');
const { decryptPDF, isEncrypted } = require('@pdfsmaller/pdf-decrypt');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const { validatePdfOutput } = require('../../utils/outputValidation');
const storageService = require('../storageService');

/**
 * Decrypts a password-protected PDF file.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string} password - Password to unlock the document
 * @param {Object} [options={}] - Options (originalName)
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function unlockPdf(fileBuffer, password, options = {}) {
  const originalName = options.originalName || 'document.pdf';

  // 1. Validate file buffer
  if (!fileBuffer || fileBuffer.length === 0) {
    const error = new Error('The uploaded PDF file is empty (0 bytes).');
    error.code = 'EMPTY_FILE';
    error.status = 422;
    throw error;
  }

  // 2. Validate password
  if (!password || typeof password !== 'string' || password.length === 0) {
    const error = new Error('Password is required to unlock this document.');
    error.code = 'INVALID_PASSWORD';
    error.status = 400;
    throw error;
  }

  // 3. Check encryption status
  let enc = null;
  try {
    enc = await isEncrypted(fileBuffer);
  } catch (err) {
    // continue
  }

  let decryptedBytes;
  if (enc && !enc.encrypted) {
    // If not encrypted, return clean unencrypted PDF
    try {
      const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      decryptedBytes = await doc.save();
    } catch (loadErr) {
      const error = new Error(`Failed to process unencrypted PDF: ${loadErr.message}`);
      error.code = 'INVALID_PDF';
      error.status = 422;
      throw error;
    }
  } else {
    // Decrypt with password
    try {
      decryptedBytes = await decryptPDF(new Uint8Array(fileBuffer), password);
    } catch (decErr) {
      const msg = (decErr && decErr.message) || '';
      if (
        msg.toLowerCase().includes('incorrect password') ||
        msg.toLowerCase().includes('does not match') ||
        msg.toLowerCase().includes('invalid password')
      ) {
        const error = new Error('Incorrect password. The provided password does not match this document.');
        error.code = 'INVALID_PASSWORD';
        error.status = 401;
        throw error;
      }
      const error = new Error(`Decryption failed: ${msg}`);
      error.code = 'DECRYPTION_FAILED';
      error.status = 422;
      throw error;
    }
  }

  const outputBuffer = Buffer.from(decryptedBytes);

  // 4. Validate output with PDF engine
  const validation = await validatePdfOutput(outputBuffer);
  if (!validation.isValid) {
    const error = new Error(validation.error.message);
    error.code = validation.error.code || 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  const baseName = originalName.replace(/\.pdf$/i, '');
  const outFilename = `${baseName}_unlocked.pdf`;
  const filePath = await storageService.saveTempFile(outputBuffer, outFilename, 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: outFilename,
    pageCount: validation.pageCount || 1,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  unlockPdf,
};
