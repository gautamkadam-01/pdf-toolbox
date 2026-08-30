import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { convertBufferToPngBuffer } from './pdfLoader';

export interface ImagesToPdfOptions {
  pageSize?: 'fit' | 'a4';
  margin?: number; // in points
}

// Helper to convert any image file (including WebP/BMP/PNG/JPEG) to a standard JPEG or PNG ArrayBuffer
async function imageFileToEmbeddableBuffer(file: File): Promise<{ buffer: ArrayBuffer; format: 'png' | 'jpeg'; width: number; height: number }> {
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

  if (isPng || isJpg) {
    const buffer = await file.arrayBuffer();
    // Read dimensions via Image element
    const dims = await getImageDimensions(file);
    return {
      buffer,
      format: isPng ? 'png' : 'jpeg',
      width: dims.width,
      height: dims.height,
    };
  }

  // For WebP or other formats, convert to PNG via Canvas
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image to blob'));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve({
          buffer,
          format: 'png',
          width: canvas.width,
          height: canvas.height,
        });
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image file: ${file.name}`));
    };
    img.src = url;
  });
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 800, height: 600 });
    };
    img.src = url;
  });
}

export async function imagesToPDF(files: File[], options: ImagesToPdfOptions = {}): Promise<ProcessingResult> {
  if (!files || files.length === 0) {
    return {
      success: false,
      files: [],
      error: 'Please select at least one image file (JPG, PNG, WebP).',
    };
  }

  try {
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { buffer, format, width, height } = await imageFileToEmbeddableBuffer(file);

      let embeddedImg;
      try {
        embeddedImg =
          format === 'png' ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);
      } catch (embedErr) {
        console.warn(`Direct embed failed for "${file.name}", using canvas fallback:`, embedErr);
        const fallbackPng = await convertBufferToPngBuffer(buffer, file.name);
        embeddedImg = await pdfDoc.embedPng(fallbackPng);
      }

      if (options.pageSize === 'a4') {
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const margin = options.margin ?? 36;
        const printableWidth = A4_WIDTH - margin * 2;
        const printableHeight = A4_HEIGHT - margin * 2;

        const scale = Math.min(printableWidth / width, printableHeight / height, 1);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const x = margin + (printableWidth - drawWidth) / 2;
        const y = margin + (printableHeight - drawHeight) / 2;

        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(embeddedImg, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      } else {
        // Fit exactly to image dimensions
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const baseName = files[0]?.name ? files[0].name.replace(/\.[^/.]+$/, '') : 'converted_images';
    const outputName = files.length === 1 ? `${baseName}_converted.pdf` : 'converted_images.pdf';

    return {
      success: true,
      files: [
        {
          name: outputName,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Images to PDF error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to convert images to PDF.',
    };
  }
}

