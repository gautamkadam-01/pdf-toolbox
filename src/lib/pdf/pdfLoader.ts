import { PDFDocument, PDFPage } from 'pdf-lib';
import { pdfjsLib } from './pdfjsSetup';

/**
 * Searches for the standard PDF header marker '%PDF' in the byte array.
 * Returns the byte offset index where '%PDF' begins, or -1 if not found.
 */
export function findPdfHeaderOffset(bytes: Uint8Array): number {
  // Search up to 2MB or whole buffer
  const searchLimit = Math.min(bytes.length - 4, 1024 * 1024 * 2);
  for (let i = 0; i < searchLimit; i++) {
    if (
      bytes[i] === 0x25 && // '%'
      bytes[i + 1] === 0x50 && // 'P'
      bytes[i + 2] === 0x44 && // 'D'
      bytes[i + 3] === 0x46    // 'F'
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Checks if a byte buffer contains image magic signatures (JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF/HEIC)
 */
export function isImageBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;

  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;

  // WebP: RIFF ... WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return true;
    }
  }

  // BMP: 42 4D ('BM')
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;

  // TIFF: II*. or MM.*
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)) {
    return true;
  }

  return false;
}

/**
 * Detects if a buffer contains a Base64-encoded PDF (e.g. data:application/pdf;base64, or JVBERi0...)
 */
export function isBase64Pdf(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 8) return false;

  try {
    const headText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(bytes.length, 256))).trim();
    if (headText.startsWith('data:application/pdf;base64,') || headText.startsWith('JVBERi0')) {
      return true;
    }
  } catch {
    // Ignore text decode errors
  }
  return false;
}

/**
 * Decodes a base64 text buffer to a binary ArrayBuffer
 */
export function decodeBase64Buffer(buffer: ArrayBuffer): ArrayBuffer {
  try {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer)).trim();
    const base64Data = text.includes('base64,') ? text.split('base64,')[1].trim() : text.trim();
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (err) {
    console.warn('Failed to decode base64 buffer:', err);
    return buffer;
  }
}

/**
 * Detects common file signatures (Magic Bytes) to provide friendly diagnostics
 */
export function detectFileType(buffer: ArrayBuffer, fileName?: string): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 4) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'PNG Image';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'JPEG Image';
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return 'GIF Image';
    }
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return 'WebP Image';
    }
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return 'BMP Image';
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return 'ZIP Archive / Office Document';
    }
    const headText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 100)).trim().toLowerCase();
    if (headText.startsWith('<!doctype html') || headText.startsWith('<html') || headText.startsWith('<?xml')) {
      return 'HTML / Web Page';
    }
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ext !== 'pdf') {
      return `${ext.toUpperCase()} document`;
    }
  }

  return 'Unknown / Corrupted format';
}

/**
 * Checks if the buffer contains a valid PDF header signature or base64 PDF
 */
export function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (isBase64Pdf(buffer)) return true;
  const bytes = new Uint8Array(buffer);
  return findPdfHeaderOffset(bytes) !== -1;
}

/**
 * Strips leading bytes/headers before '%PDF' if present
 */
export function sanitizePdfBuffer(buffer: ArrayBuffer): ArrayBuffer {
  if (isBase64Pdf(buffer)) {
    buffer = decodeBase64Buffer(buffer);
  }
  const bytes = new Uint8Array(buffer);
  const offset = findPdfHeaderOffset(bytes);
  if (offset > 0) {
    return buffer.slice(offset);
  }
  return buffer;
}

/**
 * Reconstructs / recovers damaged PDF documents using PDF.js rendering pipeline
 */
async function recoverPdfViaPdfjs(buffer: ArrayBuffer): Promise<PDFDocument> {
  const sanitized = sanitizePdfBuffer(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(sanitized),
    useSystemFonts: true,
    stopAtErrors: false,
  });
  const pdfDoc = await loadingTask.promise;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64Data = dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const embeddedImg = await newPdf.embedJpg(imageBytes);

    const origWidth = viewport.width / 2.0;
    const origHeight = viewport.height / 2.0;
    const newPage = newPdf.addPage([origWidth, origHeight]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: origWidth,
      height: origHeight,
    });
  }

  return newPdf;
}

/**
 * Wraps an image buffer or file into a clean 1-page PDF document
 */
export async function createPdfFromImageBuffer(
  buffer: ArrayBuffer,
  fileName?: string
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const isPng = new Uint8Array(buffer)[0] === 0x89;
  const isJpg = new Uint8Array(buffer)[0] === 0xff && new Uint8Array(buffer)[1] === 0xd8;

  let embeddedImage;
  let dims = { width: 800, height: 600 };

  try {
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(buffer);
      dims = { width: embeddedImage.width, height: embeddedImage.height };
    } else if (isJpg) {
      embeddedImage = await pdfDoc.embedJpg(buffer);
      dims = { width: embeddedImage.width, height: embeddedImage.height };
    } else {
      throw new Error('Unsupported direct embed');
    }
  } catch {
    // Fallback: Convert via HTML5 Canvas
    const pngBuffer = await convertBufferToPngBuffer(buffer, fileName);
    embeddedImage = await pdfDoc.embedPng(pngBuffer);
    dims = { width: embeddedImage.width, height: embeddedImage.height };
  }

  const page = pdfDoc.addPage([dims.width, dims.height]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: dims.width,
    height: dims.height,
  });

  return pdfDoc;
}

/**
 * Robustly loads a PDFDocument with automatic header recovery, base64 decoding,
 * image-wrapping, and PDF.js fallback recovery for corrupted or damaged PDFs.
 */
export async function loadSafePdfDocument(
  fileOrBuffer: File | ArrayBuffer,
  fileName?: string,
  options: { ignoreEncryption?: boolean; parseSpeed?: any; throwOnInvalidObject?: boolean } = {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  }
): Promise<PDFDocument> {
  const name = fileName || (fileOrBuffer instanceof File ? fileOrBuffer.name : 'Document.pdf');
  let originalBuffer: ArrayBuffer;

  if (fileOrBuffer instanceof File) {
    originalBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    originalBuffer = fileOrBuffer;
  }

  if (originalBuffer.byteLength === 0) {
    throw new Error(`File "${name}" is empty (0 bytes).`);
  }

  // 1. Check for Base64 PDF encoding
  if (isBase64Pdf(originalBuffer)) {
    originalBuffer = decodeBase64Buffer(originalBuffer);
  }

  // 2. Check if the file is actually an image (e.g. JPG, PNG, WebP named .pdf or uploaded to PDF tool)
  if (isImageBuffer(originalBuffer)) {
    try {
      return await createPdfFromImageBuffer(originalBuffer, name);
    } catch (imgErr) {
      console.warn(`Failed to auto-embed image "${name}" as PDF:`, imgErr);
    }
  }

  // 3. Find standard PDF header
  const bytes = new Uint8Array(originalBuffer);
  const headerOffset = findPdfHeaderOffset(bytes);

  if (headerOffset === -1) {
    // Attempt fallback recovery via PDF.js before giving up
    try {
      return await recoverPdfViaPdfjs(originalBuffer);
    } catch {
      const detected = detectFileType(originalBuffer, name);
      throw new Error(
        `"${name}" is not a valid PDF document (detected: ${detected}). Please ensure you upload valid PDF files.`
      );
    }
  }

  // Strip leading junk or server headers if %PDF is offset
  const cleanedBuffer = headerOffset > 0 ? originalBuffer.slice(headerOffset) : originalBuffer;

  try {
    return await PDFDocument.load(cleanedBuffer, options);
  } catch (err: any) {
    console.warn(`pdf-lib standard load failed for "${name}", attempting PDF.js recovery:`, err);
    const message = err.message || '';
    if (message.toLowerCase().includes('password') || message.toLowerCase().includes('encrypt')) {
      throw new Error(`"${name}" is encrypted or password-protected. Please unlock it first.`);
    }

    // Attempt resilient recovery via PDF.js
    try {
      return await recoverPdfViaPdfjs(cleanedBuffer);
    } catch (recoveryErr: any) {
      console.error(`Failed to parse and recover PDF document "${name}":`, recoveryErr);
      throw new Error(
        `Failed to parse PDF "${name}": ${message || 'The file may be corrupted or damaged.'}`
      );
    }
  }
}

/**
 * Embeds an image file or buffer into a PDF Document page
 */
export async function embedImageToPdfPage(
  pdfDoc: PDFDocument,
  fileOrBuffer: File | ArrayBuffer,
  fileName?: string
): Promise<PDFPage> {
  let arrayBuffer: ArrayBuffer;
  let name = fileName || 'image.jpg';
  let mime = '';

  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
    name = fileOrBuffer.name;
    mime = fileOrBuffer.type;
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const isPng = mime === 'image/png' || name.toLowerCase().endsWith('.png') || (new Uint8Array(arrayBuffer)[0] === 0x89);
  const isJpg =
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    name.toLowerCase().endsWith('.jpg') ||
    name.toLowerCase().endsWith('.jpeg') ||
    (new Uint8Array(arrayBuffer)[0] === 0xff && new Uint8Array(arrayBuffer)[1] === 0xd8);

  let embeddedImage;

  try {
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } else if (isJpg) {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      const pngBuffer = await convertBufferToPngBuffer(arrayBuffer, name);
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }
  } catch (embedErr) {
    // If native embed fails (e.g. CMYK/progressive JPEG), convert via HTML5 Canvas
    console.warn(`Direct embed failed for "${name}", converting via canvas:`, embedErr);
    const pngBuffer = await convertBufferToPngBuffer(arrayBuffer, name);
    embeddedImage = await pdfDoc.embedPng(pngBuffer);
  }

  const { width: imgWidth, height: imgHeight } = embeddedImage;
  const page = pdfDoc.addPage([imgWidth, imgHeight]);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width: imgWidth,
    height: imgHeight,
  });

  return page;
}

export async function convertBufferToPngBuffer(buffer: ArrayBuffer, fileName: string = 'image.png'): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to initialize canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to convert image to PNG'));
          return;
        }
        resolve(await pngBlob.arrayBuffer());
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image file: ${fileName}`));
    };
    img.src = url;
  });
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

export async function validatePdfFile(file: File): Promise<{ isValid: boolean; error?: string; pageCount?: number }> {
  if (file.size === 0) {
    return { isValid: false, error: `"${file.name}" is empty (0 bytes).` };
  }

  try {
    const rawBuffer = await file.arrayBuffer();
    if (rawBuffer.byteLength < 5) {
      return { isValid: false, error: `"${file.name}" is too small to be a valid PDF.` };
    }

    const headerOffset = findPdfHeaderOffset(new Uint8Array(rawBuffer));
    if (headerOffset === -1) {
      return {
        isValid: false,
        error: `"${file.name}" does not contain a valid PDF signature (%PDF-).`,
      };
    }

    const sanitized = sanitizePdfBuffer(rawBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(sanitized),
      useSystemFonts: true,
      stopAtErrors: false,
    });
    const pdfDoc = await loadingTask.promise;

    if (pdfDoc.numPages <= 0) {
      return { isValid: false, error: `"${file.name}" contains 0 pages.` };
    }

    return { isValid: true, pageCount: pdfDoc.numPages };
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
      return { isValid: false, error: `"${file.name}" is password-protected. Please unlock it first.` };
    }
    return { isValid: false, error: `Unable to read "${file.name}". The document may be corrupted or invalid.` };
  }
}


