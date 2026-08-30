import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';

export type PageDimensionName = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';

const STANDARD_PAGE_SIZES: Record<PageDimensionName, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612.0, 792.0],
  Legal: [612.0, 1008.0],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
};

export interface ResizeOptions {
  pageSize: PageDimensionName;
  orientation: 'portrait' | 'landscape';
}

export async function resizePDF(file: File, options: ResizeOptions): Promise<ProcessingResult> {
  try {
    const buffer = await file.arrayBuffer();
    const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();
    const baseName = file.name.replace(/\.pdf$/i, '');

    const [stdWidth, stdHeight] = STANDARD_PAGE_SIZES[options.pageSize] || STANDARD_PAGE_SIZES.A4;
    const targetWidth = options.orientation === 'landscape' ? Math.max(stdWidth, stdHeight) : Math.min(stdWidth, stdHeight);
    const targetHeight = options.orientation === 'landscape' ? Math.min(stdWidth, stdHeight) : Math.max(stdWidth, stdHeight);

    const pageCount = sourceDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const [embeddedPage] = await newDoc.embedPdf(sourceDoc, [i]);
      const newPage = newDoc.addPage([targetWidth, targetHeight]);

      const scaleX = targetWidth / embeddedPage.width;
      const scaleY = targetHeight / embeddedPage.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledWidth = embeddedPage.width * scale;
      const scaledHeight = embeddedPage.height * scale;
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;

      newPage.drawPage(embeddedPage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    const pdfBytes = await newDoc.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_resized_${options.pageSize.toLowerCase()}.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Resize error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to resize PDF pages.',
    };
  }
}
