import { pdfjsLib } from './pdfjsSetup';
import JSZip from 'jszip';
import { ProcessingResult } from '../../types/tool';
import { sanitizePdfBuffer } from './pdfLoader';

export interface PdfToImagesOptions {
  format?: 'png' | 'jpeg';
  scale?: number; // e.g. 1.5 or 2.0 for higher DPI
}

export async function renderPdfToImages(
  file: File,
  options: PdfToImagesOptions = {},
  onProgress?: (percent: number, status: string) => void
): Promise<ProcessingResult> {
  try {
    const format = options.format || 'png';
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const scale = options.scale || 2.0; // 2x for sharp render
    const baseName = file.name.replace(/\.pdf$/i, '');

    onProgress?.(10, 'Loading PDF document with PDF.js engine...');
    const rawBuffer = await file.arrayBuffer();
    const arrayBuffer = sanitizePdfBuffer(rawBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;


    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'The PDF document contains no pages.',
      };
    }

    const renderedBlobs: { name: string; blob: Blob }[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        15 + Math.round((pageNum / totalPages) * 70),
        `Rendering page ${pageNum} of ${totalPages}...`
      );

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get 2D rendering canvas context');
      }

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as any).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to export canvas to ${format} blob`));
        }, mimeType, 0.92);
      });

      const pad = String(pageNum).padStart(String(totalPages).length, '0');
      renderedBlobs.push({
        name: `${baseName}_page_${pad}.${ext}`,
        blob,
      });
    }

    // Single page output vs Multi-page ZIP archive
    if (renderedBlobs.length === 1) {
      return {
        success: true,
        files: [
          {
            name: renderedBlobs[0].name,
            blob: renderedBlobs[0].blob,
            type: mimeType,
          },
        ],
      };
    }

    onProgress?.(90, 'Packaging image archive (ZIP)...');
    const zip = new JSZip();
    for (const item of renderedBlobs) {
      zip.file(item.name, item.blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_images_${ext}.zip`,
          blob: zipBlob,
          type: 'application/zip',
        },
      ],
    };
  } catch (err: any) {
    console.error('PDF to Images error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to render PDF to images. Ensure the PDF is not password protected.',
    };
  }
}
