import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { loadSafePdfDocument } from './pdfLoader';
import { parsePageRangeStrict } from './pageRangeParser';

export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropOptions {
  marginPoints?: number; // Uniform margin in pt (backward compatible)
  margins?: CropMargins; // Individual side margins in pt
  targetMode?: 'all' | 'first' | 'last' | 'specific';
  pageRange?: string; // e.g. "1, 3, 5-7"
  unit?: 'pt' | 'mm' | 'in';
}

/**
 * Convert values to PDF points (1 in = 72 pt, 1 mm = 72 / 25.4 pt = 2.83465 pt).
 */
export function convertToPoints(val: number, unit: 'pt' | 'mm' | 'in' = 'pt'): number {
  if (val <= 0) return 0;
  if (unit === 'in') return val * 72;
  if (unit === 'mm') return val * (72 / 25.4);
  return val;
}

/**
 * Crops margins from PDF pages with precision boundary math and output verification.
 */
export async function cropPDF(file: File, options: CropOptions): Promise<ProcessingResult> {
  try {
    if (!file) {
      return {
        success: false,
        files: [],
        error: 'No PDF file provided for cropping.',
      };
    }

    const unit = options.unit || 'pt';

    // Normalize margins
    let topPt = 0;
    let rightPt = 0;
    let bottomPt = 0;
    let leftPt = 0;

    if (options.margins) {
      topPt = convertToPoints(Math.max(0, options.margins.top || 0), unit);
      rightPt = convertToPoints(Math.max(0, options.margins.right || 0), unit);
      bottomPt = convertToPoints(Math.max(0, options.margins.bottom || 0), unit);
      leftPt = convertToPoints(Math.max(0, options.margins.left || 0), unit);
    } else if (typeof options.marginPoints === 'number') {
      const uniform = convertToPoints(Math.max(0, options.marginPoints), unit);
      topPt = uniform;
      rightPt = uniform;
      bottomPt = uniform;
      leftPt = uniform;
    } else {
      topPt = 36;
      rightPt = 36;
      bottomPt = 36;
      leftPt = 36;
    }

    // Verify at least one margin is non-negative
    if (topPt < 0 || rightPt < 0 || bottomPt < 0 || leftPt < 0) {
      return {
        success: false,
        files: [],
        error: 'Crop margins cannot be negative.',
      };
    }

    const pdfDoc = await loadSafePdfDocument(file);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    const baseName = file.name.replace(/\.pdf$/i, '');

    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'The uploaded PDF document contains no pages.',
      };
    }

    // Determine target page indices (0-based)
    let targetIndices: Set<number> = new Set();
    const targetMode = options.targetMode || 'all';

    if (targetMode === 'all') {
      for (let i = 0; i < totalPages; i++) targetIndices.add(i);
    } else if (targetMode === 'first') {
      targetIndices.add(0);
    } else if (targetMode === 'last') {
      targetIndices.add(totalPages - 1);
    } else if (targetMode === 'specific') {
      if (!options.pageRange || !options.pageRange.trim()) {
        return {
          success: false,
          files: [],
          error: 'Please enter a valid page range to crop (e.g. 1-3, 5).',
        };
      }
      const parsed = parsePageRangeStrict(options.pageRange, totalPages);
      if (!parsed.valid || parsed.indices.length === 0) {
        return {
          success: false,
          files: [],
          error: parsed.error || 'Invalid page range specified.',
        };
      }
      parsed.indices.forEach((idx) => targetIndices.add(idx));
    }

    if (targetIndices.size === 0) {
      return {
        success: false,
        files: [],
        error: 'No valid pages selected for cropping.',
      };
    }

    // Apply crop to target pages
    for (let i = 0; i < totalPages; i++) {
      if (!targetIndices.has(i)) continue;

      const page = pages[i];
      const effectiveBox = page.getCropBox() || page.getMediaBox();
      const originX = effectiveBox.x || 0;
      const originY = effectiveBox.y || 0;
      const origWidth = effectiveBox.width;
      const origHeight = effectiveBox.height;

      // Handle page visual rotation (0, 90, 180, 270)
      const pageRotation = ((page.getRotation().angle % 360) + 360) % 360;

      let pdfTop = topPt;
      let pdfRight = rightPt;
      let pdfBottom = bottomPt;
      let pdfLeft = leftPt;

      if (pageRotation === 90) {
        // Visual top is PDF right, visual right is PDF bottom, visual bottom is PDF left, visual left is PDF top
        pdfRight = topPt;
        pdfBottom = rightPt;
        pdfLeft = bottomPt;
        pdfTop = leftPt;
      } else if (pageRotation === 180) {
        // Inverted orientation
        pdfBottom = topPt;
        pdfLeft = rightPt;
        pdfTop = bottomPt;
        pdfRight = leftPt;
      } else if (pageRotation === 270) {
        // Visual top is PDF left, visual right is PDF top, visual bottom is PDF right, visual left is PDF bottom
        pdfLeft = topPt;
        pdfTop = rightPt;
        pdfRight = bottomPt;
        pdfBottom = leftPt;
      }

      // If all margins are 0, preserve original box
      if (pdfTop === 0 && pdfRight === 0 && pdfBottom === 0 && pdfLeft === 0) {
        continue;
      }

      const newWidth = origWidth - pdfLeft - pdfRight;
      const newHeight = origHeight - pdfTop - pdfBottom;

      if (newWidth <= 15 || newHeight <= 15) {
        return {
          success: false,
          files: [],
          error: `Crop margins (left: ${Math.round(leftPt)}pt, right: ${Math.round(rightPt)}pt, top: ${Math.round(topPt)}pt, bottom: ${Math.round(bottomPt)}pt) are too large for page ${i + 1} (${Math.round(origWidth)}×${Math.round(origHeight)} pt). Minimum residual dimension is 15pt.`,
        };
      }

      // Coordinate conversion: PDF origin is bottom-left
      // x = originX + pdfLeft
      // y = originY + pdfBottom
      const cropX = originX + pdfLeft;
      const cropY = originY + pdfBottom;

      page.setCropBox(cropX, cropY, newWidth, newHeight);
      page.setMediaBox(cropX, cropY, newWidth, newHeight);
      page.setBleedBox(cropX, cropY, newWidth, newHeight);
      page.setTrimBox(cropX, cropY, newWidth, newHeight);
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Rigorous binary validation
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('PDF cropping operation produced an empty file.');
    }

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    if (header !== '%PDF-') {
      throw new Error('Cropped PDF output failed signature verification.');
    }

    // Verify document can be reloaded and page count is preserved
    const verifyDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    if (verifyDoc.getPageCount() !== totalPages) {
      throw new Error(`Verification failed: expected ${totalPages} pages after crop, got ${verifyDoc.getPageCount()}.`);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_cropped.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Crop error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to crop PDF margins.',
    };
  }
}
