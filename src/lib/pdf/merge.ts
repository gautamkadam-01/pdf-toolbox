import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { loadSafePdfDocument, isPdfBuffer, isImageBuffer, embedImageToPdfPage } from './pdfLoader';

export async function mergePDFs(files: File[]): Promise<ProcessingResult> {
  if (files.length < 2) {
    return {
      success: false,
      files: [],
      error: 'Please select at least 2 PDF files to merge.',
    };
  }

  try {
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = await file.arrayBuffer();

      if (
        isImageBuffer(buffer) ||
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|bmp|gif|tiff|avif|heic)$/i.test(file.name)
      ) {
        // Image attachment mixed into merge sequence (even if named .pdf)
        await embedImageToPdfPage(mergedPdf, buffer, file.name);
      } else if (isPdfBuffer(buffer)) {
        // Standard or recoverable PDF document
        const pdfDoc = await loadSafePdfDocument(buffer, file.name);
        const pageIndices = pdfDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else {
        // Try safe load with all automatic recovery paths (base64, PDF.js, image wraps)
        const pdfDoc = await loadSafePdfDocument(buffer, file.name);
        const pageIndices = pdfDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return {
        success: false,
        files: [],
        error: 'The merged document resulted in 0 pages. Please verify the uploaded files.',
      };
    }

    const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const baseName = files[0].name.replace(/\.[^/.]+$/, '');

    return {
      success: true,
      files: [
        {
          name: `merged_${baseName}.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Merge error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to merge PDF files. One or more files may be corrupted or password-protected.',
    };
  }
}


