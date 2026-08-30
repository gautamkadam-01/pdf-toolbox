import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { validatePagePermutation } from './pageRangeParser';
import { loadSafePdfDocument } from './pdfLoader';

export async function reorderPDFPages(file: File, orderedPageNumbers: number[]): Promise<ProcessingResult> {
  try {
    const sourceDoc = await loadSafePdfDocument(file);
    const totalPages = sourceDoc.getPageCount();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'The uploaded PDF document contains no pages.',
      };
    }

    // Validate page numbers (1-indexed input converted to 0-indexed)
    const validation = validatePagePermutation(orderedPageNumbers, totalPages);
    if (!validation.valid) {
      return {
        success: false,
        files: [],
        error: validation.error || `Invalid page order for a ${totalPages}-page document.`,
      };
    }

    const zeroIndexedOrder: number[] = orderedPageNumbers.map((num) => num - 1);

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, zeroIndexedOrder);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save({ useObjectStreams: true });

    // Output binary verification
    if (pdfBytes.length < 10) {
      throw new Error('Generated PDF is empty.');
    }
    const signature = String.fromCharCode(...pdfBytes.slice(0, 5));
    if (!signature.startsWith('%PDF-')) {
      throw new Error('Generated file does not have a valid PDF header signature.');
    }
    const verifyDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    if (verifyDoc.getPageCount() !== totalPages) {
      throw new Error(`Output page count mismatch: expected ${totalPages}, got ${verifyDoc.getPageCount()}`);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_reordered.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Reorder error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to reorder PDF pages.',
    };
  }
}

