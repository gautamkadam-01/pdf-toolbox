import { PDFDocument, degrees } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { parsePageRangeStrict } from './pageRangeParser';
import { loadSafePdfDocument, findPdfHeaderOffset } from './pdfLoader';

export interface RotateOptions {
  angle: 90 | 180 | 270 | -90 | number;
  targetPages?: 'all' | 'custom';
  pageRangeStr?: string;
  pageRotations?: { [pageIndex: number]: number };
}

export async function rotatePDF(file: File, options: RotateOptions): Promise<ProcessingResult> {
  try {
    if (!file || file.size === 0) {
      return {
        success: false,
        files: [],
        error: `File "${file?.name || 'document.pdf'}" is empty (0 bytes).`,
      };
    }

    const pdfDoc = await loadSafePdfDocument(file);
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

    // Determine target page indices if specified via range string
    let targetSet: Set<number>;
    if (options.targetPages === 'custom') {
      const parsedRange = parsePageRangeStrict(options.pageRangeStr || '', totalPages);
      if (!parsedRange.valid || parsedRange.indices.length === 0) {
        return {
          success: false,
          files: [],
          error: parsedRange.error || `Invalid page range for ${totalPages}-page document.`,
        };
      }
      targetSet = new Set(parsedRange.indices);
    } else {
      targetSet = new Set(pages.map((_, i) => i));
    }

    const baseDelta = ((Math.round(options.angle || 0) % 360) + 360) % 360;
    const hasExplicitRotations = options.pageRotations && Object.keys(options.pageRotations).length > 0;

    // Apply rotation composition per page
    const expectedRotations: number[] = [];
    pages.forEach((page, idx) => {
      let delta = 0;
      if (hasExplicitRotations) {
        delta = options.pageRotations![idx] ?? 0;
      } else if (targetSet.has(idx)) {
        delta = baseDelta;
      }

      const normalizedDelta = ((Math.round(delta) % 360) + 360) % 360;
      const currentAngle = page.getRotation().angle || 0;
      const newAngle = ((currentAngle + normalizedDelta) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
      expectedRotations.push(newAngle);
    });

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Validate binary output
    if (!pdfBytes || pdfBytes.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Failed to generate PDF: output buffer is empty.',
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

    // Verify PDF can be reloaded safely
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

    // Verify target rotations match in generated binary
    const reloadedPages = reloadedDoc.getPages();
    for (let i = 0; i < totalPages; i++) {
      const actualRot = ((reloadedPages[i].getRotation().angle % 360) + 360) % 360;
      const expectedRot = expectedRotations[i];
      if (actualRot !== expectedRot) {
        return {
          success: false,
          files: [],
          error: `Rotation verification failed for page ${i + 1}: expected ${expectedRot}°, got ${actualRot}°.`,
        };
      }
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_rotated.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Rotate error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to rotate PDF pages.',
    };
  }
}

