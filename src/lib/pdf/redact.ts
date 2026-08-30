/**
 * Redact PDF Service
 * Permanently and structurally purges sensitive data from PDF pages.
 * Eradicates underlying text streams, vector paths, and image objects from
 * redacted regions by permanently fusing solid redaction blocks into the page.
 */

import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { validatePdfFile, readFileAsArrayBuffer } from './pdfLoader';
import { pdfjsLib } from './pdfjsSetup';

export interface RedactionRegion {
  id: string;
  pageNumber: number; // 1-indexed
  xRel: number; // 0..1 relative to page width (from left)
  yRel: number; // 0..1 relative to page height (from top)
  widthRel: number; // 0..1 relative to page width
  heightRel: number; // 0..1 relative to page height
  color?: string; // default '#000000'
}

export interface RedactPdfOptions {
  redactions: RedactionRegion[];
  color?: string;
}

export async function redactPDF(
  file: File,
  options: RedactPdfOptions
): Promise<ProcessingResult> {
  // 1. Validate file
  const validation = await validatePdfFile(file);
  if (!validation.isValid) {
    return {
      success: false,
      files: [],
      error: validation.error || 'Invalid PDF file.',
    };
  }

  const redactions = options.redactions || [];
  if (redactions.length === 0) {
    return {
      success: false,
      files: [],
      error: 'Please mark at least one area or region on the document to redact.',
    };
  }

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Load source document with pdf-lib
    const sourceDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });

    const totalPages = sourceDoc.getPageCount();
    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'PDF contains no pages to redact.',
      };
    }

    // Group redactions by pageNumber
    const redactionsByPage = new Map<number, RedactionRegion[]>();
    for (const r of redactions) {
      if (r.pageNumber >= 1 && r.pageNumber <= totalPages) {
        const list = redactionsByPage.get(r.pageNumber) || [];
        list.push(r);
        redactionsByPage.set(r.pageNumber, list);
      }
    }

    if (redactionsByPage.size === 0) {
      return {
        success: false,
        files: [],
        error: 'No valid redaction regions matched the document pages.',
      };
    }

    // Load PDF.js for rendering redacted pages
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes,
      useSystemFonts: true,
      disableFontFace: false,
      verbosity: 0,
    });
    const pdfjsDoc = await loadingTask.promise;

    // Create new target document
    const newDoc = await PDFDocument.create();

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageNum = pageIdx + 1;
      const pageRedactions = redactionsByPage.get(pageNum);

      if (!pageRedactions || pageRedactions.length === 0) {
        // Untouched page: copy original vector page directly
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageIdx]);
        newDoc.addPage(copiedPage);
      } else {
        // Redacted page: render at high resolution, draw solid redaction blocks,
        // and replace with permanently flattened high-fidelity image.
        const pdfjsPage = await pdfjsDoc.getPage(pageNum);
        const scale = 2.5; // High resolution ~200-300 DPI for crisp typography
        const viewport = pdfjsPage.getViewport({ scale });

        const visualWidth = viewport.width / scale;
        const visualHeight = viewport.height / scale;

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          throw new Error('Failed to create 2D canvas context for page rendering.');
        }

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        await (pdfjsPage.render({
          canvasContext: ctx,
          viewport,
          canvas,
        } as any)).promise;

        // Permanently draw redaction blocks onto the canvas pixels
        for (const r of pageRedactions) {
          const xRel = typeof r.xRel === 'number' 
            ? r.xRel 
            : ((r as any).x && visualWidth ? (r as any).x / visualWidth : 0);
          
          const yRel = typeof r.yRel === 'number'
            ? r.yRel
            : ((r as any).y && visualHeight 
                ? ((r as any).origin === 'bottom-left' 
                    ? (visualHeight - (r as any).y - ((r as any).height || 0)) / visualHeight 
                    : (r as any).y / visualHeight) 
                : 0);

          const widthRel = typeof r.widthRel === 'number'
            ? r.widthRel
            : ((r as any).width && visualWidth ? (r as any).width / visualWidth : 0.1);

          const heightRel = typeof r.heightRel === 'number'
            ? r.heightRel
            : ((r as any).height && visualHeight ? (r as any).height / visualHeight : 0.05);

          const rx = Math.max(0, Math.min(1, xRel)) * canvas.width;
          const ry = Math.max(0, Math.min(1, yRel)) * canvas.height;
          const rw = Math.max(0, Math.min(1 - xRel, widthRel)) * canvas.width;
          const rh = Math.max(0, Math.min(1 - yRel, heightRel)) * canvas.height;

          ctx.fillStyle = r.color || options.color || '#000000';
          ctx.fillRect(rx, ry, rw, rh);
        }

        // Convert canvas to image data
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const imgData = await fetch(imgDataUrl).then((res) => res.arrayBuffer());
        const embeddedImage = await newDoc.embedJpg(imgData);

        // Add page with visual dimensions and draw the flattened image
        const newPage = newDoc.addPage([visualWidth, visualHeight]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: visualWidth,
          height: visualHeight,
        });
      }
    }

    const savedBytes = await newDoc.save();
    const baseName = file.name.replace(/\.pdf$/i, '');
    const outName = `${baseName}_redacted.pdf`;
    const blob = new Blob([savedBytes], { type: 'application/pdf' });

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
    console.error('Redact PDF Error:', err);
    return {
      success: false,
      files: [],
      error: err?.message || 'Failed to redact PDF document.',
    };
  }
}

export const redactPdf = redactPDF;

