/**
 * Protect PDF Service
 * Encrypts PDF documents with AES-256 or RC4 password protection.
 */

const { PDFDocument } = require('pdf-lib');
const { encryptPDF, isEncrypted } = require('@pdfsmaller/pdf-encrypt');
const { decryptPDF } = require('@pdfsmaller/pdf-decrypt');
const { validatePdfBuffer } = require('../../utils/fileValidation');
const storageService = require('../storageService');

/**
 * Encrypts a PDF file with password protection.
 * 
 * @param {Buffer} fileBuffer - Input PDF buffer
 * @param {string} password - User password for encryption
 * @param {Object} [options={}] - Encryption options (algorithm, permissions, originalName)
 * @returns {Promise<{ filePath: string, buffer: Buffer, filename: string, pageCount: number, sizeBytes: number }>}
 */
async function protectPdf(fileBuffer, password, options = {}) {
  const originalName = options.originalName || 'document.pdf';

  // 1. Validate input file
  const inputValidation = validatePdfBuffer(fileBuffer, originalName);
  if (!inputValidation.isValid) {
    const error = new Error(inputValidation.error.message);
    error.code = inputValidation.error.code;
    error.status = 422;
    throw error;
  }

  // 2. Validate password
  if (!password || typeof password !== 'string' || password.length === 0) {
    const error = new Error('A valid, non-empty password is required to protect the PDF document.');
    error.code = 'INVALID_PASSWORD';
    error.status = 400;
    throw error;
  }

  // 3. Check if already encrypted
  try {
    const enc = await isEncrypted(fileBuffer);
    if (enc && enc.encrypted) {
      const error = new Error('This PDF is already password-protected. Unlock it before applying new protection.');
      error.code = 'ALREADY_ENCRYPTED';
      error.status = 400;
      throw error;
    }
  } catch (checkErr) {
    if (checkErr.code === 'ALREADY_ENCRYPTED') throw checkErr;
  }

  // 4. Determine page count
  let pageCount = 1;
  try {
    const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    pageCount = doc.getPageCount();
  } catch (loadErr) {
    // ignore
  }

  // 5. Encrypt PDF
  const algorithm = options.algorithm === 'RC4' ? 'RC4' : 'AES-256';
  let encryptedBytes;
  try {
    encryptedBytes = await encryptPDF(new Uint8Array(fileBuffer), password, {
      algorithm,
      allowPrinting: options.allowPrinting !== false,
      allowCopying: options.allowCopying === true,
      allowModifying: options.allowModifying === true,
      allowAnnotating: options.allowAnnotating === true,
    });
  } catch (encErr) {
    const error = new Error(`Encryption failed: ${encErr.message}`);
    error.code = 'ENCRYPTION_FAILED';
    error.status = 500;
    throw error;
  }

  const outputBuffer = Buffer.from(encryptedBytes);

  // 6. Verify output
  if (!outputBuffer || outputBuffer.length === 0) {
    const error = new Error('Encryption produced empty output.');
    error.code = 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  const header = outputBuffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    const error = new Error('Protected output failed %PDF- binary header validation.');
    error.code = 'OUTPUT_GENERATION_FAILED';
    error.status = 500;
    throw error;
  }

  // Verify that test decryption works with password
  try {
    await decryptPDF(outputBuffer, password);
  } catch (verErr) {
    console.warn('Protected output verification check failed:', verErr);
  }

  const baseName = originalName.replace(/\.pdf$/i, '');
  const outFilename = `${baseName}_protected.pdf`;
  const filePath = await storageService.saveTempFile(outputBuffer, outFilename, 'outputs');

  return {
    filePath,
    buffer: outputBuffer,
    filename: outFilename,
    pageCount,
    sizeBytes: outputBuffer.length,
  };
}

module.exports = {
  protectPdf,
};
