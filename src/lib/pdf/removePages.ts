import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { parsePageRangeStrict } from './pageRangeParser';
import { loadSafePdfDocument } from './pdfLoader';

export async function removePagesFromPDF(file: File, pagesToRemoveStr: string): Promise<ProcessingResult> {
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

    const parsedRange = parsePageRangeStrict(pagesToRemoveStr, totalPages);
    if (!parsedRange.valid || parsedRange.indices.length === 0) {
      return {
        success: false,
        files: [],
        error: parsedRange.error || `No valid pages specified for removal. Document has ${totalPages} pages.`,
      };
    }

    const indicesToRemove = new Set(parsedRange.indices);

    // Calculate remaining pages (every page EXCEPT the ones to remove)
    const indicesToKeep: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      if (!indicesToRemove.has(i)) {
        indicesToKeep.push(i);
      }
    }

    if (indicesToKeep.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Cannot remove all pages from the document. At least one page must remain.',
      };
    }

    if (indicesToKeep.length === totalPages) {
      return {
        success: false,
        files: [],
        error: 'No valid pages were specified for removal. Please provide valid page numbers.',
      };
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, indicesToKeep);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_cleaned.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Remove pages error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to remove pages from PDF.',
    };
  }
}
