import { pdfjsLib } from './pdfjsSetup';
import { sanitizePdfBuffer, isImageBuffer } from './pdfLoader';

export interface PageThumbnailInfo {
  pageNumber: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
}

export interface DocumentInfo {
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

/**
 * Reads document information (page count and metadata)
 */
export async function getPdfDocumentInfo(file: File): Promise<DocumentInfo> {
  try {
    const rawBuffer = await file.arrayBuffer();

    if (isImageBuffer(rawBuffer) || file.type.startsWith('image/')) {
      return {
        numPages: 1,
        title: file.name,
      };
    }

    const arrayBuffer = sanitizePdfBuffer(rawBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), stopAtErrors: false });
    const pdfDoc = await loadingTask.promise;
    
    let meta: any = {};
    try {
      const metadataResult = await pdfDoc.getMetadata();
      meta = metadataResult?.info || {};
    } catch {
      // ignore metadata extraction errors on encrypted or malformed meta
    }

    return {
      numPages: pdfDoc.numPages,
      title: meta.Title || '',
      author: meta.Author || '',
      subject: meta.Subject || '',
      keywords: meta.Keywords || '',
      creator: meta.Creator || '',
      producer: meta.Producer || '',
    };
  } catch (err) {
    console.error('Failed to get PDF document info:', err);
    return { numPages: 0 };
  }
}

/**
 * Loads thumbnails for all pages of a PDF up to maxPages (default 50)
 */
export async function loadPdfThumbnails(
  file: File,
  maxPages: number = 50,
  onPageProgress?: (current: number, total: number) => void
): Promise<PageThumbnailInfo[]> {
  try {
    const rawBuffer = await file.arrayBuffer();

    // If file is an image (even if named .pdf), render directly to thumbnail
    if (isImageBuffer(rawBuffer) || file.type.startsWith('image/')) {
      onPageProgress?.(1, 1);
      const blob = new Blob([rawBuffer]);
      const url = URL.createObjectURL(blob);
      return [
        {
          pageNumber: 1,
          dataUrl: url,
          width: 300,
          height: 400,
        },
      ];
    }

    const arrayBuffer = sanitizePdfBuffer(rawBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), stopAtErrors: false });
    const pdfDoc = await loadingTask.promise;
    const totalPages = Math.min(pdfDoc.numPages, maxPages);
    const thumbnails: PageThumbnailInfo[] = [];

    for (let i = 1; i <= totalPages; i++) {
      onPageProgress?.(i, totalPages);
      try {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          } as any).promise;
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          thumbnails.push({
            pageNumber: i,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
          });
        }
      } catch (pageErr) {
        console.warn(`Failed to render thumbnail for page ${i}:`, pageErr);
      }
    }

    return thumbnails;
  } catch (err) {
    console.error('Failed to load PDF thumbnails:', err);
    return [];
  }
}


