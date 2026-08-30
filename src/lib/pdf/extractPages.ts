import { degrees, PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { parsePageRangeStrict } from './pageRangeParser';
import { loadSafePdfDocument } from './pdfLoader';

export async function extractPagesFromPDF(
  file: File,
  pagesToExtractStr: string,
  pageRotations?: { [pageIndex: number]: number }
): Promise<ProcessingResult> {
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

    const parsedRange = parsePageRangeStrict(pagesToExtractStr, totalPages);
    if (!parsedRange.valid || parsedRange.indices.length === 0) {
      return {
        success: false,
        files: [],
        error: parsedRange.error || `No valid pages specified for extraction. Document has ${totalPages} pages.`,
      };
    }

    const indicesToExtract = parsedRange.indices;

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, indicesToExtract);

    copiedPages.forEach((page, i) => {
      const sourceIndex = indicesToExtract[i];
      if (pageRotations && pageRotations[sourceIndex]) {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + pageRotations[sourceIndex]) % 360));
      }
      newDoc.addPage(page);
    });

    const pdfBytes = await newDoc.save({ useObjectStreams: true });

    // Rigorous output validation
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('PDF extraction engine produced an empty document.');
    }

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    if (header !== '%PDF-') {
      throw new Error('Extracted PDF output failed signature verification.');
    }

    // Verify document can be re-opened and page count matches
    const verificationDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const extractedCount = verificationDoc.getPageCount();
    if (extractedCount !== indicesToExtract.length) {
      throw new Error(
        `Extracted document validation failed: expected ${indicesToExtract.length} pages, got ${extractedCount}.`
      );
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_extracted.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Extract pages error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to extract pages from PDF.',
    };
  }
}
