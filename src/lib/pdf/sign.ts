import { PDFDocument, degrees } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { loadSafePdfDocument } from './pdfLoader';
import { parsePageRangeStrict } from './pageRangeParser';

export type SignPlacement =
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'center'
  | 'top-right'
  | 'top-left'
  | 'top-center';

export interface SignPdfOptions {
  signatureDataUrl: string;
  hasSignature: boolean;
  targetPage?: 'first' | 'last' | 'all' | 'custom' | number;
  customPages?: string | number; // e.g. "2, 4" or "1-3" or 2
  position?: SignPlacement | { xRatio: number; yRatio: number; width?: number; height?: number };
  size?: 'small' | 'medium' | 'large' | number;
  opacity?: number; // 0.1 to 1.0
  rotation?: number; // degrees: 0, 90, 180, 270
}

export async function signPDF(file: File, options: SignPdfOptions): Promise<ProcessingResult> {
  if (!options.hasSignature || !options.signatureDataUrl || options.signatureDataUrl.length < 50) {
    return {
      success: false,
      files: [],
      error: 'Please draw or upload a signature before applying.',
    };
  }

  try {
    const pdfDoc = await loadSafePdfDocument(file);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'PDF has no pages to sign.',
      };
    }

    // 1. Determine target page indices (0-indexed)
    const targetIndices: number[] = [];

    if (options.targetPage === 'all') {
      for (let i = 0; i < totalPages; i++) {
        targetIndices.push(i);
      }
    } else if (options.targetPage === 'first') {
      targetIndices.push(0);
    } else if (options.targetPage === 'last' || options.targetPage === undefined) {
      targetIndices.push(totalPages - 1);
    } else if (options.targetPage === 'custom' || typeof options.targetPage === 'number') {
      if (typeof options.customPages === 'string' && options.customPages.trim()) {
        const parsed = parsePageRangeStrict(options.customPages, totalPages);
        if (!parsed.valid || parsed.indices.length === 0) {
          return {
            success: false,
            files: [],
            error: parsed.error || `Target page "${options.customPages}" is invalid for this ${totalPages}-page document.`,
          };
        }
        targetIndices.push(...parsed.indices);
      } else {
        const pageNum = typeof options.customPages === 'number'
          ? options.customPages
          : typeof options.targetPage === 'number'
          ? options.targetPage
          : 1;

        if (pageNum < 1 || pageNum > totalPages) {
          return {
            success: false,
            files: [],
            error: `Page ${pageNum} does not exist. This document contains ${totalPages} pages.`,
          };
        }
        targetIndices.push(pageNum - 1);
      }
    } else {
      targetIndices.push(totalPages - 1);
    }

    if (targetIndices.length === 0) {
      return {
        success: false,
        files: [],
        error: 'No valid target pages were selected for signature placement.',
      };
    }

    // 2. Fetch and embed signature image buffer
    const sigResponse = await fetch(options.signatureDataUrl);
    const sigArrayBuffer = await sigResponse.arrayBuffer();
    const sigBytes = new Uint8Array(sigArrayBuffer);

    if (sigBytes.length < 10) {
      return {
        success: false,
        files: [],
        error: 'Invalid or empty signature image data.',
      };
    }

    let embeddedSig;
    // Check if JPEG signature (0xFF 0xD8)
    if (sigBytes[0] === 0xff && sigBytes[1] === 0xd8) {
      embeddedSig = await pdfDoc.embedJpg(sigBytes);
    } else {
      // Default to PNG
      try {
        embeddedSig = await pdfDoc.embedPng(sigBytes);
      } catch {
        embeddedSig = await pdfDoc.embedJpg(sigBytes);
      }
    }

    const { width: origWidth, height: origHeight } = embeddedSig;
    const aspect = origHeight > 0 && origWidth > 0 ? origHeight / origWidth : 0.4;

    // Determine requested base width
    let requestedWidth = 180;
    if (options.size === 'small') {
      requestedWidth = 120;
    } else if (options.size === 'medium') {
      requestedWidth = 180;
    } else if (options.size === 'large') {
      requestedWidth = 240;
    } else if (typeof options.size === 'number' && options.size > 20) {
      requestedWidth = options.size;
    }

    const opacity = typeof options.opacity === 'number' ? Math.max(0.05, Math.min(1, options.opacity)) : 1.0;
    const rotationDeg = typeof options.rotation === 'number' ? options.rotation : 0;

    // 3. Draw signature stamp on all target pages
    for (const pageIdx of targetIndices) {
      const page = pages[pageIdx];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Clamp signature width so it doesn't exceed 60% of page
      const sigWidth = Math.min(requestedWidth, pageWidth * 0.6);
      const sigHeight = sigWidth * aspect;

      // Dynamic margins relative to page size
      const marginX = Math.max(16, Math.min(36, pageWidth * 0.05));
      const marginY = Math.max(16, Math.min(36, pageHeight * 0.05));

      let x = pageWidth - sigWidth - marginX;
      let y = marginY;

      const pos = options.position;

      if (typeof pos === 'string') {
        switch (pos) {
          case 'bottom-left':
            x = marginX;
            y = marginY;
            break;
          case 'bottom-center':
            x = (pageWidth - sigWidth) / 2;
            y = marginY;
            break;
          case 'bottom-right':
            x = pageWidth - sigWidth - marginX;
            y = marginY;
            break;
          case 'center':
            x = (pageWidth - sigWidth) / 2;
            y = (pageHeight - sigHeight) / 2;
            break;
          case 'top-left':
            x = marginX;
            y = pageHeight - sigHeight - marginY;
            break;
          case 'top-center':
            x = (pageWidth - sigWidth) / 2;
            y = pageHeight - sigHeight - marginY;
            break;
          case 'top-right':
            x = pageWidth - sigWidth - marginX;
            y = pageHeight - sigHeight - marginY;
            break;
          default:
            x = pageWidth - sigWidth - marginX;
            y = marginY;
            break;
        }
      } else if (pos && typeof pos === 'object') {
        const xRatio = typeof pos.xRatio === 'number' ? pos.xRatio : 0.85;
        const yRatio = typeof pos.yRatio === 'number' ? pos.yRatio : 0.05;
        x = xRatio * (pageWidth - sigWidth);
        y = yRatio * (pageHeight - sigHeight);
      }

      // Safe bounds clamping inside page
      const safeX = Math.max(5, Math.min(pageWidth - sigWidth - 5, x));
      const safeY = Math.max(5, Math.min(pageHeight - sigHeight - 5, y));

      page.drawImage(embeddedSig, {
        x: safeX,
        y: safeY,
        width: sigWidth,
        height: sigHeight,
        opacity,
        ...(rotationDeg !== 0 ? { rotate: degrees(rotationDeg) } : {}),
      });
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

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
    const baseName = file.name.replace(/\.pdf$/i, '');

    return {
      success: true,
      files: [
        {
          name: `${baseName}_signed.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Sign PDF error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to apply signature to PDF.',
    };
  }
}
