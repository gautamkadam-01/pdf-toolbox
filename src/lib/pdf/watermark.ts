import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { parsePageRangeStrict } from './pageRangeParser';
import { loadSafePdfDocument, findPdfHeaderOffset } from './pdfLoader';
import { sanitizeWinAnsi } from './textEncoding';

export type WatermarkPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface WatermarkOptions {
  text: string;
  opacity: number; // 0.05 - 1.0
  angle: number; // -90 to 90
  fontSize?: number;
  position: WatermarkPosition | string;
  targetPages: 'all' | 'first' | 'last' | 'custom';
  pageRangeStr?: string;
  color?: { r: number; g: number; b: number };
}

export async function addWatermarkToPDF(file: File, options: WatermarkOptions): Promise<ProcessingResult> {
  try {
    if (!file || file.size === 0) {
      return {
        success: false,
        files: [],
        error: `File "${file?.name || 'document.pdf'}" is empty (0 bytes).`,
      };
    }

    const rawText = (options.text || '').trim();
    const text = sanitizeWinAnsi(rawText);
    if (!text) {
      return {
        success: false,
        files: [],
        error: 'Watermark text cannot be empty. Please enter text to apply.',
      };
    }

    const pdfDoc = await loadSafePdfDocument(file);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
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

    // Determine target page indices
    let targetIndices: number[] = [];
    if (options.targetPages === 'all') {
      targetIndices = pages.map((_, i) => i);
    } else if (options.targetPages === 'first') {
      targetIndices = [0];
    } else if (options.targetPages === 'last') {
      targetIndices = [totalPages - 1];
    } else {
      const parsedRange = parsePageRangeStrict(options.pageRangeStr || '', totalPages);
      if (!parsedRange.valid || parsedRange.indices.length === 0) {
        return {
          success: false,
          files: [],
          error: parsedRange.error || `Invalid page range for ${totalPages}-page document.`,
        };
      }
      targetIndices = parsedRange.indices;
    }

    const targetSet = new Set(targetIndices);
    const opacity = Math.max(0.05, Math.min(1.0, options.opacity !== undefined ? options.opacity : 0.25));
    const angle = options.angle !== undefined ? options.angle : 45;
    const fontSize = options.fontSize || 36;
    const color = options.color
      ? rgb(options.color.r, options.color.g, options.color.b)
      : rgb(0.85, 0.2, 0.2); // standard watermark red

    // Angle in radians for center rotation math
    const rad = (angle * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    pages.forEach((page, idx) => {
      if (targetSet.has(idx)) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        // Desired watermark center (cx, cy)
        let cx = width / 2;
        let cy = height / 2;
        const padding = Math.max(20, Math.min(width, height) * 0.08);

        switch (options.position) {
          case 'top':
          case 'top-center':
            cx = width / 2;
            cy = height - padding - textHeight / 2;
            break;
          case 'top-left':
            cx = padding + textWidth / 2;
            cy = height - padding - textHeight / 2;
            break;
          case 'top-right':
            cx = width - padding - textWidth / 2;
            cy = height - padding - textHeight / 2;
            break;
          case 'bottom':
          case 'bottom-center':
            cx = width / 2;
            cy = padding + textHeight / 2;
            break;
          case 'bottom-left':
            cx = padding + textWidth / 2;
            cy = padding + textHeight / 2;
            break;
          case 'bottom-right':
            cx = width - padding - textWidth / 2;
            cy = padding + textHeight / 2;
            break;
          case 'center':
          default:
            cx = width / 2;
            cy = height / 2;
            break;
        }

        // Rotate around center: calculate (drawX, drawY) for pdf-lib's bottom-left origin rotation
        const dx = (textWidth / 2) * cosAngle - (textHeight / 2) * sinAngle;
        const dy = (textWidth / 2) * sinAngle + (textHeight / 2) * cosAngle;

        const drawX = cx - dx;
        const drawY = cy - dy;

        page.drawText(text, {
          x: drawX,
          y: drawY,
          size: fontSize,
          font,
          color,
          opacity,
          rotate: degrees(angle),
        });
      }
    });

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Validate binary output
    if (!pdfBytes || pdfBytes.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Failed to generate watermarked PDF: output buffer is empty.',
      };
    }

    const headerOffset = findPdfHeaderOffset(new Uint8Array(pdfBytes));
    if (headerOffset === -1) {
      return {
        success: false,
        files: [],
        error: 'Generated file is missing standard %PDF- header signature.',
      };
    }

    // Verify PDF reloadability and page count
    let reloadedDoc: PDFDocument;
    try {
      reloadedDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, throwOnInvalidObject: false });
    } catch (reloadErr: any) {
      return {
        success: false,
        files: [],
        error: `Output PDF validation failed: ${reloadErr.message}`,
      };
    }

    if (reloadedDoc.getPageCount() !== totalPages) {
      return {
        success: false,
        files: [],
        error: `Page count mismatch: expected ${totalPages} pages, but output has ${reloadedDoc.getPageCount()}.`,
      };
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_watermarked.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Watermark error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to apply watermark to PDF.',
    };
  }
}

