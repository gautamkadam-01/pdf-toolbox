/**
 * Unlock PDF Service
 * Decrypts password-protected PDF files using @pdfsmaller/pdf-decrypt,
 * supporting AES-256 and RC4 encryption algorithms.
 */

import { PDFDocument } from 'pdf-lib';
import { decryptPDF, isEncrypted as checkIsEncrypted } from '@pdfsmaller/pdf-decrypt';
import { ProcessingResult } from '../../types/tool';
import { readFileAsArrayBuffer } from './pdfLoader';

export interface UnlockPdfOptions {
  password: string;
}

export async function unlockPDF(
  file: File,
  options: UnlockPdfOptions
): Promise<ProcessingResult> {
  // 1. Validate file extension / size
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return {
      success: false,
      files: [],
      error: 'Please select a valid PDF document to unlock.',
    };
  }

  if (file.size === 0) {
    return {
      success: false,
      files: [],
      error: 'The uploaded file is empty (0 bytes).',
    };
  }

  // 2. Validate password
  if (!options.password || typeof options.password !== 'string') {
    return {
      success: false,
      files: [],
      error: 'Please enter the password required to unlock this document.',
    };
  }

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfBytes = new Uint8Array(arrayBuffer);

    // 3. Check encryption status
    let encInfo: any = null;
    try {
      encInfo = await checkIsEncrypted(pdfBytes);
    } catch {
      // ignore
    }

    if (encInfo && !encInfo.encrypted) {
      // Document is not encrypted, return clean unencrypted version
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const cleanBytes = await doc.save();
      const baseName = file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_unlocked.pdf`;
      const blob = new Blob([cleanBytes], { type: 'application/pdf' });

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
    }

    // 4. Attempt Decryption
    let decryptedBytes: Uint8Array;
    try {
      decryptedBytes = await decryptPDF(pdfBytes, options.password);
    } catch (decErr: any) {
      const errMsg = decErr?.message || '';
      if (
        errMsg.toLowerCase().includes('incorrect password') ||
        errMsg.toLowerCase().includes('password does not match') ||
        errMsg.toLowerCase().includes('invalid password')
      ) {
        return {
          success: false,
          files: [],
          error: 'Incorrect password. The entered password does not match this protected document.',
        };
      }
      return {
        success: false,
        files: [],
        error: `Decryption failed: ${errMsg}`,
      };
    }

    if (!decryptedBytes || decryptedBytes.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Decryption output was empty.',
      };
    }

    // 5. Verify output can be loaded and read cleanly without password
    const verifiedDoc = await PDFDocument.load(decryptedBytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: false,
    });

    const pageCount = verifiedDoc.getPageCount();
    if (pageCount < 1) {
      return {
        success: false,
        files: [],
        error: 'Unlocked document contains no valid pages.',
      };
    }

    const baseName = file.name.replace(/\.pdf$/i, '');
    const outName = `${baseName}_unlocked.pdf`;
    const blob = new Blob([decryptedBytes], { type: 'application/pdf' });

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
    console.error('Unlock PDF Error:', err);
    return {
      success: false,
      files: [],
      error: err?.message || 'Failed to unlock password-protected PDF.',
    };
  }
}

export const unlockPdf = unlockPDF;

