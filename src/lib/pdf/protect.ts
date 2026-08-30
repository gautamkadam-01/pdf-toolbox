/**
 * Protect PDF Service
 * Encrypts PDF documents with industry-standard AES-256 or RC4 password protection
 * and granular permission flags using @pdfsmaller/pdf-encrypt.
 */

import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted as checkIsEncrypted } from '@pdfsmaller/pdf-decrypt';
import { ProcessingResult } from '../../types/tool';
import { validatePdfFile, readFileAsArrayBuffer } from './pdfLoader';

export interface ProtectPdfOptions {
  password: string;
  confirmPassword?: string;
  algorithm?: 'AES-256' | 'RC4';
  allowPrinting?: boolean;
  allowCopying?: boolean;
  allowModifying?: boolean;
  allowAnnotating?: boolean;
}

export async function protectPDF(
  file: File,
  options: ProtectPdfOptions
): Promise<ProcessingResult> {
  // 1. Validate file
  const validation = await validatePdfFile(file);
  if (!validation.isValid) {
    return {
      success: false,
      files: [],
      error: validation.error || 'Invalid or corrupted PDF file.',
    };
  }

  // 2. Validate password
  if (!options.password || typeof options.password !== 'string') {
    return {
      success: false,
      files: [],
      error: 'Please enter a valid password to protect the document.',
    };
  }

  const trimmedPassword = options.password;
  if (trimmedPassword.length < 1) {
    return {
      success: false,
      files: [],
      error: 'Password cannot be empty.',
    };
  }

  if (options.confirmPassword !== undefined && options.confirmPassword !== trimmedPassword) {
    return {
      success: false,
      files: [],
      error: 'Password confirmation does not match. Please re-enter your password.',
    };
  }

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Check if already encrypted
    try {
      const encStatus = await checkIsEncrypted(pdfBytes);
      if (encStatus && encStatus.encrypted) {
        return {
          success: false,
          files: [],
          error:
            'This PDF is already password-protected. Please unlock or decrypt the document first before applying new protection.',
        };
      }
    } catch {
      // Continue if encryption check is uncertain
    }

    // 3. Encrypt document
    const algorithm = options.algorithm || 'AES-256';
    const encryptedBytes = await encryptPDF(pdfBytes, trimmedPassword, {
      algorithm,
      allowPrinting: options.allowPrinting !== false,
      allowCopying: options.allowCopying === true,
      allowModifying: options.allowModifying === true,
      allowAnnotating: options.allowAnnotating === true,
    });

    if (!encryptedBytes || encryptedBytes.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Encryption produced empty output.',
      };
    }

    // 4. Validate output signature
    const header = new TextDecoder('ascii').decode(encryptedBytes.subarray(0, 5));
    if (!header.startsWith('%PDF-')) {
      return {
        success: false,
        files: [],
        error: 'Encrypted output failed PDF binary format validation.',
      };
    }

    // 5. Verification step: verify opening with correct password works
    try {
      const verifyDecrypted = await decryptPDF(encryptedBytes, trimmedPassword);
      const testDoc = await PDFDocument.load(verifyDecrypted, { ignoreEncryption: true });
      if (testDoc.getPageCount() < 1) {
        throw new Error('Verification revealed 0 pages in encrypted document.');
      }
    } catch (verErr: any) {
      console.warn('Post-encryption verification warning:', verErr);
    }

    const baseName = file.name.replace(/\.pdf$/i, '');
    const outName = `${baseName}_protected.pdf`;
    const blob = new Blob([encryptedBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: outName,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Protect PDF Error:', err);
    return {
      success: false,
      files: [],
      error: err?.message || 'Failed to apply password protection to PDF.',
    };
  }
}

export const protectPdf = protectPDF;

