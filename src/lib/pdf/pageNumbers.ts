import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { loadSafePdfDocument } from './pdfLoader';
import { sanitizeWinAnsi } from './textEncoding';

export interface PageNumberOptions {
  format: string; // e.g. "Page {n} of {total}", "{n}", "Page {n}", "{n} / {total}"
  startNumber: number;
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
  fontSize: number;
}

export async function addPageNumbersToPDF(file: File, options: PageNumberOptions): Promise<ProcessingResult> {
  try {
    const pdfDoc = await loadSafePdfDocument(file);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'The uploaded PDF document contains no pages.',
      };
    }

    const startNum = isNaN(options.startNumber) || options.startNumber < 1 ? 1 : Math.floor(options.startNumber);
    const format = sanitizeWinAnsi(options.format?.trim() || 'Page {n} of {total}');
    const fontSize = isNaN(options.fontSize) || options.fontSize <= 0 ? 10 : options.fontSize;

    pages.forEach((page, idx) => {
      const currentNumber = startNum + idx;
      const rawText = format
        .replace(/\{n\}|\{page\}/gi, String(currentNumber))
        .replace(/\{total\}|\{count\}/gi, String(totalPages));
      const text = sanitizeWinAnsi(rawText);

      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Safe responsive margins relative to page dimensions
      const marginX = Math.max(16, Math.min(36, width * 0.05));
      const marginY = Math.max(16, Math.min(30, height * 0.05));

      let x = (width - textWidth) / 2;
      let y = marginY;

      switch (options.position) {
        case 'top-left':
          x = marginX;
          y = height - marginY - textHeight;
          break;
        case 'top-center':
          x = (width - textWidth) / 2;
          y = height - marginY - textHeight;
          break;
        case 'top-right':
          x = width - textWidth - marginX;
          y = height - marginY - textHeight;
          break;
        case 'bottom-left':
          x = marginX;
          y = marginY;
          break;
        case 'bottom-right':
          x = width - textWidth - marginX;
          y = marginY;
          break;
        case 'bottom-center':
        default:
          x = (width - textWidth) / 2;
          y = marginY;
          break;
      }

      // Safe bounds clamping so text never falls outside page boundaries
      x = Math.max(6, Math.min(x, width - textWidth - 6));
      y = Math.max(6, Math.min(y, height - textHeight - 6));

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Output binary validation
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
          name: `${baseName}_numbered.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Page numbers error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to add page numbers to PDF.',
    };
  }
}

