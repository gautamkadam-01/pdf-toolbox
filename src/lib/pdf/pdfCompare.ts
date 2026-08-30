import { pdfjsLib } from './pdfjsSetup';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { sanitizePdfBuffer, findPdfHeaderOffset } from './pdfLoader';
import { sanitizeWinAnsi } from './textEncoding';

export interface PageTextDiff {
  pageNum: number;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  addedLines: string[];
  removedLines: string[];
  modifiedLines: Array<{ oldLine: string; newLine: string }>;
  originalText: string;
  updatedText: string;
  hasExtractableText: boolean;
}

export interface PageVisualDiff {
  pageNum: number;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  differenceScore: number; // 0 (identical) to 1 (completely different)
  hasVisualChanges: boolean;
  diffBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
  originalDataUrl?: string;
  updatedDataUrl?: string;
  diffDataUrl?: string;
  overlayDataUrl?: string;
  width: number;
  height: number;
}

export interface CombinedPageComparison {
  pageIndex: number; // 0-based
  displayPageNum: number; // 1-based
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  hasChanges: boolean;
  textDiff?: PageTextDiff;
  visualDiff?: PageVisualDiff;
  notes: string[];
}

export interface PdfComparisonResult {
  success: boolean;
  error?: string;
  originalFileName: string;
  updatedFileName: string;
  originalPageCount: number;
  updatedPageCount: number;
  totalComparedPages: number;
  addedPageCount: number;
  removedPageCount: number;
  modifiedPageCount: number;
  unchangedPageCount: number;
  totalTextChanges: number;
  totalVisualChanges: number;
  pages: CombinedPageComparison[];
  changedPageIndices: number[]; // 0-based indices of pages with differences
  textComparisonEnabled: boolean;
  visualComparisonEnabled: boolean;
  mode: 'side-by-side' | 'overlay' | 'diff';
  generatedPdfBlob?: Blob;
  reportText: string;
  warningNotice?: string;
}

export interface CompareOptions {
  mode: 'side-by-side' | 'overlay' | 'diff';
  detectTextChanges: boolean;
  detectVisualChanges: boolean;
  sensitivity?: 'low' | 'medium' | 'high';
  scale?: number;
}

/**
 * Validates whether a file is a valid, readable PDF document.
 */
export async function validatePdfFile(file: File): Promise<{ isValid: boolean; error?: string; pageCount?: number }> {
  if (!file) {
    return { isValid: false, error: 'File is missing.' };
  }

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

/**
 * Extracts line-separated text and line items for a given page in a PDF.js document.
 */
async function extractPageTextLines(pdfDoc: any, pageNum: number): Promise<{ text: string; lines: string[] }> {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str: string; hasEOL?: boolean; transform?: number[] }>;

    if (!items || items.length === 0) {
      return { text: '', lines: [] };
    }

    let fullStr = '';
    const rawLines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      currentLine += item.str;
      fullStr += item.str;

      if (item.hasEOL) {
        if (currentLine.trim()) rawLines.push(currentLine.trim());
        currentLine = '';
        fullStr += '\n';
      } else if (i < items.length - 1 && !items[i + 1].str.startsWith(' ') && !item.str.endsWith(' ')) {
        currentLine += ' ';
        fullStr += ' ';
      }
    }

    if (currentLine.trim()) {
      rawLines.push(currentLine.trim());
    }

    return { text: fullStr.trim(), lines: rawLines };
  } catch {
    return { text: '', lines: [] };
  }
}

/**
 * Compares two lists of text lines and identifies added, removed, and modified lines.
 */
function diffTextLines(
  oldLines: string[],
  newLines: string[]
): {
  added: string[];
  removed: string[];
  modified: Array<{ oldLine: string; newLine: string }>;
  changesCount: number;
} {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ oldLine: string; newLine: string }> = [];

  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldL = oldLines[i];
    const newL = newLines[i];

    if (oldL === undefined && newL !== undefined) {
      added.push(newL);
    } else if (oldL !== undefined && newL === undefined) {
      removed.push(oldL);
    } else if (oldL !== newL) {
      // Check if it's a minor line modification vs a completely different inserted line
      if (oldL && newL) {
        modified.push({ oldLine: oldL, newLine: newL });
      } else if (newL) {
        added.push(newL);
      } else if (oldL) {
        removed.push(oldL);
      }
    }
  }

  const changesCount = added.length + removed.length + modified.length;
  return { added, removed, modified, changesCount };
}

/**
 * Renders a PDF page to an offscreen Canvas with given scale.
 */
async function renderPageToCanvas(pdfDoc: any, pageNum: number, scale: number = 1.5): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas 2d context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as any).promise;

  return canvas;
}

/**
 * Computes pixel differences between two canvas images and produces visual diff outputs.
 */
function computeVisualDiff(
  oldCanvas: HTMLCanvasElement | null,
  newCanvas: HTMLCanvasElement | null,
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): {
  diffScore: number;
  diffCount: number;
  diffBoundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
  diffCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
} {
  const width = Math.max(oldCanvas?.width || 0, newCanvas?.width || 0) || 800;
  const height = Math.max(oldCanvas?.height || 0, newCanvas?.height || 0) || 1100;

  // Sensitivity thresholds
  let deltaThreshold = 40;
  let minDiffScore = 0.0005;
  if (sensitivity === 'high') {
    deltaThreshold = 25;
    minDiffScore = 0.0002;
  } else if (sensitivity === 'low') {
    deltaThreshold = 60;
    minDiffScore = 0.0015;
  }

  // 1. Difference Canvas (High-contrast magenta/cyan highlight)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true })!;
  diffCtx.fillStyle = '#ffffff';
  diffCtx.fillRect(0, 0, width, height);

  // 2. Overlay Canvas (Alpha blended tint)
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: true })!;
  overlayCtx.fillStyle = '#ffffff';
  overlayCtx.fillRect(0, 0, width, height);

  if (!oldCanvas && newCanvas) {
    // Completely added page
    diffCtx.drawImage(newCanvas, 0, 0);
    // Draw green "ADDED" highlight border
    diffCtx.strokeStyle = 'rgba(16, 185, 129, 0.9)';
    diffCtx.lineWidth = 6;
    diffCtx.strokeRect(3, 3, width - 6, height - 6);

    overlayCtx.drawImage(newCanvas, 0, 0);
    return {
      diffScore: 1.0,
      diffCount: width * height,
      diffBoundingBoxes: [{ x: 0, y: 0, width, height }],
      diffCanvas,
      overlayCanvas,
    };
  }

  if (oldCanvas && !newCanvas) {
    // Completely removed page
    diffCtx.drawImage(oldCanvas, 0, 0);
    // Draw red "REMOVED" highlight border
    diffCtx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    diffCtx.lineWidth = 6;
    diffCtx.strokeRect(3, 3, width - 6, height - 6);

    overlayCtx.drawImage(oldCanvas, 0, 0);
    return {
      diffScore: 1.0,
      diffCount: width * height,
      diffBoundingBoxes: [{ x: 0, y: 0, width, height }],
      diffCanvas,
      overlayCanvas,
    };
  }

  if (!oldCanvas || !newCanvas) {
    return {
      diffScore: 0,
      diffCount: 0,
      diffBoundingBoxes: [],
      diffCanvas,
      overlayCanvas,
    };
  }

  // Draw base updated image slightly dimmed on diffCanvas
  diffCtx.globalAlpha = 0.35;
  diffCtx.drawImage(newCanvas, 0, 0);
  diffCtx.globalAlpha = 1.0;

  // Build Overlay Canvas: Old in soft Red tint, New in soft Cyan/Green tint
  overlayCtx.save();
  overlayCtx.globalAlpha = 0.6;
  overlayCtx.drawImage(oldCanvas, 0, 0);
  overlayCtx.globalCompositeOperation = 'difference';
  overlayCtx.drawImage(newCanvas, 0, 0);
  overlayCtx.restore();

  // Create normalized offscreen canvases for pixel sampling to avoid IndexSizeError with different aspect ratios
  const normOldCanvas = document.createElement('canvas');
  normOldCanvas.width = width;
  normOldCanvas.height = height;
  const normOldCtx = normOldCanvas.getContext('2d', { willReadFrequently: true })!;
  normOldCtx.fillStyle = '#ffffff';
  normOldCtx.fillRect(0, 0, width, height);
  normOldCtx.drawImage(oldCanvas, 0, 0);

  const normNewCanvas = document.createElement('canvas');
  normNewCanvas.width = width;
  normNewCanvas.height = height;
  const normNewCtx = normNewCanvas.getContext('2d', { willReadFrequently: true })!;
  normNewCtx.fillStyle = '#ffffff';
  normNewCtx.fillRect(0, 0, width, height);
  normNewCtx.drawImage(newCanvas, 0, 0);

  const oldImg = normOldCtx.getImageData(0, 0, width, height);
  const newImg = normNewCtx.getImageData(0, 0, width, height);
  const diffImg = diffCtx.getImageData(0, 0, width, height);

  const oldData = oldImg.data;
  const newData = newImg.data;
  const diffData = diffImg.data;

  let changedPixels = 0;
  const totalPixels = width * height;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  // Sample grid to identify changed blocks
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dr = Math.abs(oldData[idx] - newData[idx]);
      const dg = Math.abs(oldData[idx + 1] - newData[idx + 1]);
      const db = Math.abs(oldData[idx + 2] - newData[idx + 2]);
      const da = Math.abs(oldData[idx + 3] - newData[idx + 3]);

      // Pixel difference threshold
      if (dr + dg + db + da > deltaThreshold) {
        changedPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Highlight pixel on diff canvas with vibrant red/magenta
        diffData[idx] = 239; // R
        diffData[idx + 1] = 68; // G
        diffData[idx + 2] = 68; // B
        diffData[idx + 3] = 240; // Alpha
      }
    }
  }

  diffCtx.putImageData(diffImg, 0, 0);

  const diffScore = changedPixels / (totalPixels || 1);
  const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];

  if (diffScore > minDiffScore && changedPixels > 30 && maxX >= minX && maxY >= minY) {
    // Add padded bounding box
    const pad = 8;
    const boxX = Math.max(0, minX - pad);
    const boxY = Math.max(0, minY - pad);
    const boxW = Math.min(width - boxX, maxX - minX + pad * 2);
    const boxH = Math.min(height - boxY, maxY - minY + pad * 2);
    boxes.push({ x: boxX, y: boxY, width: boxW, height: boxH });

    // Draw high-contrast bounding box on diffCanvas
    diffCtx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    diffCtx.lineWidth = 2.5;
    diffCtx.setLineDash([6, 4]);
    diffCtx.strokeRect(boxX, boxY, boxW, boxH);
    diffCtx.setLineDash([]);
  }

  return {
    diffScore,
    diffCount: changedPixels,
    diffBoundingBoxes: boxes,
    diffCanvas,
    overlayCanvas,
  };
}

/**
 * Generates a valid multi-page PDF document containing the comparison result
 * starting with %PDF- and embedded high-resolution visual diff pages and summary report.
 */
async function generateComparisonPdf(
  comparison: PdfComparisonResult,
  pageRenderings: Array<{
    pageNum: number;
    sideBySideCanvas?: HTMLCanvasElement;
    diffCanvas?: HTMLCanvasElement;
    overlayCanvas?: HTMLCanvasElement;
  }>
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  // 1. Cover / Audit Summary Page
  const summaryPage = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width: pW, height: pH } = summaryPage.getSize();

  // Header Banner
  summaryPage.drawRectangle({
    x: 0,
    y: pH - 110,
    width: pW,
    height: 110,
    color: rgb(0.04, 0.12, 0.28), // Deep slate navy
  });

  summaryPage.drawText('PDF COMPARISON AUDIT REPORT', {
    x: 40,
    y: pH - 50,
    size: 20,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  summaryPage.drawText(`Generated on ${new Date().toLocaleString()} • PDF Toolbox Engine`, {
    x: 40,
    y: pH - 75,
    size: 10,
    font: helveticaFont,
    color: rgb(0.8, 0.88, 0.98),
  });

  let currentY = pH - 145;

  // File metadata block
  summaryPage.drawRectangle({
    x: 40,
    y: currentY - 60,
    width: pW - 80,
    height: 75,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.93),
    borderWidth: 1,
  });

  summaryPage.drawText('COMPARED DOCUMENTS', {
    x: 55,
    y: currentY - 5,
    size: 9,
    font: helveticaBold,
    color: rgb(0.3, 0.4, 0.5),
  });

  const origName = sanitizeWinAnsi(comparison.originalFileName || 'document_1.pdf');
  const updName = sanitizeWinAnsi(comparison.updatedFileName || 'document_2.pdf');

  summaryPage.drawText(`Original (Baseline): ${origName} (${comparison.originalPageCount} pages)`, {
    x: 55,
    y: currentY - 25,
    size: 10,
    font: helveticaFont,
    color: rgb(0.1, 0.15, 0.2),
  });

  summaryPage.drawText(`Updated (Revised):  ${updName} (${comparison.updatedPageCount} pages)`, {
    x: 55,
    y: currentY - 45,
    size: 10,
    font: helveticaFont,
    color: rgb(0.1, 0.15, 0.2),
  });

  currentY -= 95;

  // Comparison Metrics Grid
  summaryPage.drawText('COMPARISON SUMMARY METRICS', {
    x: 40,
    y: currentY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  currentY -= 20;

  const metrics = [
    { label: 'Comparison Mode', value: comparison.mode.toUpperCase() },
    { label: 'Total Pages Evaluated', value: String(comparison.totalComparedPages) },
    { label: 'Modified Pages', value: String(comparison.modifiedPageCount) },
    { label: 'Unchanged Pages', value: String(comparison.unchangedPageCount) },
    { label: 'Added Pages', value: String(comparison.addedPageCount) },
    { label: 'Removed Pages', value: String(comparison.removedPageCount) },
    { label: 'Text Difference Events', value: comparison.textComparisonEnabled ? String(comparison.totalTextChanges) : 'Disabled' },
    { label: 'Visual Difference Events', value: comparison.visualComparisonEnabled ? String(comparison.totalVisualChanges) : 'Disabled' },
  ];

  metrics.forEach((m, idx) => {
    const rowY = currentY - idx * 22;
    summaryPage.drawRectangle({
      x: 40,
      y: rowY - 14,
      width: pW - 80,
      height: 20,
      color: idx % 2 === 0 ? rgb(0.98, 0.98, 0.99) : rgb(1, 1, 1),
    });

    summaryPage.drawText(sanitizeWinAnsi(m.label), {
      x: 55,
      y: rowY - 9,
      size: 10,
      font: helveticaFont,
      color: rgb(0.25, 0.3, 0.35),
    });

    summaryPage.drawText(sanitizeWinAnsi(m.value), {
      x: pW - 160,
      y: rowY - 9,
      size: 10,
      font: helveticaBold,
      color: rgb(0.08, 0.12, 0.2),
    });
  });

  currentY -= metrics.length * 22 + 25;

  // Page breakdown list
  summaryPage.drawText('PAGE-BY-PAGE AUDIT BREAKDOWN', {
    x: 40,
    y: currentY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  currentY -= 20;

  comparison.pages.slice(0, 14).forEach((page) => {
    const statusColor =
      page.status === 'unchanged'
        ? rgb(0.1, 0.6, 0.3)
        : page.status === 'modified'
        ? rgb(0.85, 0.45, 0.05)
        : page.status === 'added'
        ? rgb(0.1, 0.5, 0.85)
        : rgb(0.85, 0.15, 0.15);

    summaryPage.drawText(`Page ${page.displayPageNum}: [${page.status.toUpperCase()}]`, {
      x: 55,
      y: currentY,
      size: 9.5,
      font: helveticaBold,
      color: statusColor,
    });

    const note = sanitizeWinAnsi(page.notes.join(', ') || 'No differences detected.');
    summaryPage.drawText(note.slice(0, 70), {
      x: 180,
      y: currentY,
      size: 9,
      font: helveticaFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    currentY -= 18;
  });

  // Footer on summary page
  summaryPage.drawText('Generated by PDF Toolbox • High-Fidelity PDF Compare Engine', {
    x: 40,
    y: 25,
    size: 8.5,
    font: helveticaFont,
    color: rgb(0.5, 0.55, 0.6),
  });

  // 2. Append Visual Diff Pages for each compared page
  for (const pageRendering of pageRenderings) {
    let targetCanvas: HTMLCanvasElement | undefined;
    if (comparison.mode === 'side-by-side') {
      targetCanvas = pageRendering.sideBySideCanvas || pageRendering.diffCanvas;
    } else if (comparison.mode === 'overlay') {
      targetCanvas = pageRendering.overlayCanvas || pageRendering.diffCanvas;
    } else {
      targetCanvas = pageRendering.diffCanvas;
    }

    if (!targetCanvas) continue;

    const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1];
    const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const embeddedImg = await pdfDoc.embedJpg(imgBytes);

    // Calculate dimensions to fit neatly on standard A4 page or landscape
    const isLandscape = embeddedImg.width > embeddedImg.height;
    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;

    const diffPage = pdfDoc.addPage([pageWidth, pageHeight]);

    // Top banner on diff page
    diffPage.drawRectangle({
      x: 0,
      y: pageHeight - 35,
      width: pageWidth,
      height: 35,
      color: rgb(0.95, 0.96, 0.98),
    });

    const pageInfo = comparison.pages[pageRendering.pageNum - 1];
    const statusText = pageInfo ? `Page ${pageRendering.pageNum} — Status: ${pageInfo.status.toUpperCase()} (${comparison.mode.toUpperCase()})` : `Page ${pageRendering.pageNum}`;

    diffPage.drawText(sanitizeWinAnsi(statusText), {
      x: 25,
      y: pageHeight - 23,
      size: 10,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    const margin = 25;
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - 45 - margin;

    const scale = Math.min(availWidth / embeddedImg.width, availHeight / embeddedImg.height);
    const renderWidth = embeddedImg.width * scale;
    const renderHeight = embeddedImg.height * scale;
    const posX = margin + (availWidth - renderWidth) / 2;
    const posY = margin + (availHeight - renderHeight) / 2;

    diffPage.drawImage(embeddedImg, {
      x: posX,
      y: posY,
      width: renderWidth,
      height: renderHeight,
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  if (!pdfBytes || pdfBytes.length === 0) {
    throw new Error('Comparison report generation produced an empty file.');
  }
  const header = String.fromCharCode(...pdfBytes.slice(0, 5));
  if (header !== '%PDF-') {
    throw new Error('Generated comparison report failed PDF binary header verification.');
  }

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Main PDF Compare pipeline function.
 */
export async function comparePdfDocuments(
  originalFile: File,
  updatedFile: File,
  options: CompareOptions,
  onProgress?: (percent: number, status: string) => void
): Promise<PdfComparisonResult> {
  // 1. Validation checks
  if (!originalFile) {
    throw new Error('Please upload the original PDF.');
  }
  if (!updatedFile) {
    throw new Error('Please upload the updated PDF.');
  }
  if (!options.detectTextChanges && !options.detectVisualChanges) {
    throw new Error('Select at least one comparison method.');
  }

  onProgress?.(5, 'Validating original and updated PDF documents...');

  const origValidation = await validatePdfFile(originalFile);
  if (!origValidation.isValid) {
    throw new Error(`Original Document Error: ${origValidation.error || 'Invalid PDF file.'}`);
  }

  const updatedValidation = await validatePdfFile(updatedFile);
  if (!updatedValidation.isValid) {
    throw new Error(`Updated Document Error: ${updatedValidation.error || 'Invalid PDF file.'}`);
  }

  onProgress?.(15, 'Loading PDF documents into comparison engine...');

  const [origRaw, updatedRaw] = await Promise.all([
    originalFile.arrayBuffer(),
    updatedFile.arrayBuffer(),
  ]);

  const [origClean, updatedClean] = [
    sanitizePdfBuffer(origRaw),
    sanitizePdfBuffer(updatedRaw),
  ];

  const [origDoc, updatedDoc] = await Promise.all([
    pdfjsLib.getDocument({ data: new Uint8Array(origClean), useSystemFonts: true }).promise,
    pdfjsLib.getDocument({ data: new Uint8Array(updatedClean), useSystemFonts: true }).promise,
  ]);

  const origPageCount = origDoc.numPages;
  const updatedPageCount = updatedDoc.numPages;
  const totalComparedPages = Math.max(origPageCount, updatedPageCount);

  let totalTextChanges = 0;
  let totalVisualChanges = 0;
  let addedPageCount = 0;
  let removedPageCount = 0;
  let modifiedPageCount = 0;
  let unchangedPageCount = 0;

  const pages: CombinedPageComparison[] = [];
  const changedPageIndices: number[] = [];
  const pageRenderings: Array<{
    pageNum: number;
    sideBySideCanvas?: HTMLCanvasElement;
    diffCanvas?: HTMLCanvasElement;
    overlayCanvas?: HTMLCanvasElement;
  }> = [];

  let littleOrNoTextWarning = false;
  let totalExtractedChars = 0;

  // 2. Iterate and compare page-by-page
  for (let i = 0; i < totalComparedPages; i++) {
    const pageNum = i + 1;
    const progressPercent = 20 + Math.round((i / totalComparedPages) * 60);
    onProgress?.(progressPercent, `Comparing page ${pageNum} of ${totalComparedPages}...`);

    const hasOriginal = pageNum <= origPageCount;
    const hasUpdated = pageNum <= updatedPageCount;

    let pageStatus: 'unchanged' | 'modified' | 'added' | 'removed' = 'unchanged';
    const notes: string[] = [];

    let textDiff: PageTextDiff | undefined;
    let visualDiff: PageVisualDiff | undefined;

    // A. Text Comparison (if enabled)
    if (options.detectTextChanges) {
      const origTextData = hasOriginal ? await extractPageTextLines(origDoc, pageNum) : { text: '', lines: [] };
      const updatedTextData = hasUpdated ? await extractPageTextLines(updatedDoc, pageNum) : { text: '', lines: [] };

      totalExtractedChars += origTextData.text.length + updatedTextData.text.length;

      const hasText = origTextData.text.length > 0 || updatedTextData.text.length > 0;

      if (!hasOriginal && hasUpdated) {
        textDiff = {
          pageNum,
          status: 'added',
          addedLines: updatedTextData.lines,
          removedLines: [],
          modifiedLines: [],
          originalText: '',
          updatedText: updatedTextData.text,
          hasExtractableText: hasText,
        };
        totalTextChanges += updatedTextData.lines.length;
      } else if (hasOriginal && !hasUpdated) {
        textDiff = {
          pageNum,
          status: 'removed',
          addedLines: [],
          removedLines: origTextData.lines,
          modifiedLines: [],
          originalText: origTextData.text,
          updatedText: '',
          hasExtractableText: hasText,
        };
        totalTextChanges += origTextData.lines.length;
      } else {
        const lineDiff = diffTextLines(origTextData.lines, updatedTextData.lines);
        textDiff = {
          pageNum,
          status: lineDiff.changesCount > 0 ? 'modified' : 'unchanged',
          addedLines: lineDiff.added,
          removedLines: lineDiff.removed,
          modifiedLines: lineDiff.modified,
          originalText: origTextData.text,
          updatedText: updatedTextData.text,
          hasExtractableText: hasText,
        };
        totalTextChanges += lineDiff.changesCount;
      }
    }

    // B. Visual Comparison (if enabled or needed for rendering)
    let origCanvas: HTMLCanvasElement | null = null;
    let updatedCanvas: HTMLCanvasElement | null = null;

    if (hasOriginal) {
      origCanvas = await renderPageToCanvas(origDoc, pageNum, options.scale || 1.4);
    }
    if (hasUpdated) {
      updatedCanvas = await renderPageToCanvas(updatedDoc, pageNum, options.scale || 1.4);
    }

    // Create Side-by-Side Canvas
    const sbsCanvas = document.createElement('canvas');
    const sbsWidth = (origCanvas?.width || updatedCanvas?.width || 600) * 2 + 30;
    const sbsHeight = Math.max(origCanvas?.height || 0, updatedCanvas?.height || 0) + 50;
    sbsCanvas.width = sbsWidth;
    sbsCanvas.height = sbsHeight;
    const sbsCtx = sbsCanvas.getContext('2d')!;
    sbsCtx.fillStyle = '#f8fafc';
    sbsCtx.fillRect(0, 0, sbsWidth, sbsHeight);

    // Draw header labels
    sbsCtx.font = 'bold 16px sans-serif';
    sbsCtx.fillStyle = '#334155';
    sbsCtx.fillText(`Original (Page ${pageNum})`, 20, 30);
    sbsCtx.fillText(`Updated (Page ${pageNum})`, (origCanvas?.width || 600) + 30, 30);

    if (origCanvas) {
      sbsCtx.drawImage(origCanvas, 15, 45);
    } else {
      sbsCtx.fillStyle = '#f1f5f9';
      sbsCtx.fillRect(15, 45, updatedCanvas?.width || 600, updatedCanvas?.height || 800);
      sbsCtx.fillStyle = '#94a3b8';
      sbsCtx.fillText('[Page does not exist in original version]', 40, 200);
    }

    if (updatedCanvas) {
      sbsCtx.drawImage(updatedCanvas, (origCanvas?.width || 600) + 25, 45);
    } else {
      sbsCtx.fillStyle = '#f1f5f9';
      sbsCtx.fillRect((origCanvas?.width || 600) + 25, 45, origCanvas?.width || 600, origCanvas?.height || 800);
      sbsCtx.fillStyle = '#94a3b8';
      sbsCtx.fillText('[Page removed in updated version]', (origCanvas?.width || 600) + 50, 200);
    }

    const { diffScore, diffCount, diffBoundingBoxes, diffCanvas, overlayCanvas } = computeVisualDiff(
      origCanvas,
      updatedCanvas,
      options.sensitivity
    );

    const minDiffScore = options.sensitivity === 'high' ? 0.0002 : options.sensitivity === 'low' ? 0.0015 : 0.0005;
    const hasVisualChanges = options.detectVisualChanges ? diffScore > minDiffScore : false;
    if (hasVisualChanges) {
      totalVisualChanges++;
    }

    const originalDataUrl = origCanvas ? origCanvas.toDataURL('image/png') : undefined;
    const updatedDataUrl = updatedCanvas ? updatedCanvas.toDataURL('image/png') : undefined;
    const diffDataUrl = diffCanvas.toDataURL('image/png');
    const overlayDataUrl = overlayCanvas.toDataURL('image/png');

    visualDiff = {
      pageNum,
      status: !hasOriginal ? 'added' : !hasUpdated ? 'removed' : hasVisualChanges ? 'modified' : 'unchanged',
      differenceScore: diffScore,
      hasVisualChanges,
      diffBoundingBoxes,
      originalDataUrl,
      updatedDataUrl,
      diffDataUrl,
      overlayDataUrl,
      width: Math.max(origCanvas?.width || 0, updatedCanvas?.width || 0),
      height: Math.max(origCanvas?.height || 0, updatedCanvas?.height || 0),
    };

    pageRenderings.push({
      pageNum,
      sideBySideCanvas: sbsCanvas,
      diffCanvas,
      overlayCanvas,
    });

    // Determine overall page status
    if (!hasOriginal && hasUpdated) {
      pageStatus = 'added';
      addedPageCount++;
      notes.push(`Newly added page in updated version`);
    } else if (hasOriginal && !hasUpdated) {
      pageStatus = 'removed';
      removedPageCount++;
      notes.push(`Page removed in updated version`);
    } else {
      const textChanged = textDiff?.status === 'modified';
      const visualChanged = visualDiff?.hasVisualChanges;

      if (textChanged || visualChanged) {
        pageStatus = 'modified';
        modifiedPageCount++;
        if (textChanged) notes.push(`${textDiff?.modifiedLines.length || 0} modified text lines, +${textDiff?.addedLines.length || 0} additions, -${textDiff?.removedLines.length || 0} deletions`);
        if (visualChanged) notes.push(`Visual layout difference (${(diffScore * 100).toFixed(1)}% altered)`);
      } else {
        pageStatus = 'unchanged';
        unchangedPageCount++;
        notes.push('Content and layout identical');
      }
    }

    const isPageChanged = pageStatus !== 'unchanged';
    if (isPageChanged) {
      changedPageIndices.push(i);
    }

    pages.push({
      pageIndex: i,
      displayPageNum: pageNum,
      status: pageStatus,
      hasChanges: isPageChanged,
      textDiff,
      visualDiff,
      notes,
    });
  }

  // Check if scanned document warning applies
  if (options.detectTextChanges && totalExtractedChars < 15 && totalComparedPages > 0) {
    littleOrNoTextWarning = true;
  }

  // 3. Build Result Object
  const reportLines: string[] = [
    `============================================================`,
    `               PDF COMPARE AUDIT REPORT                     `,
    `============================================================`,
    `Original Document : ${originalFile.name} (${origPageCount} pages)`,
    `Updated Document  : ${updatedFile.name} (${updatedPageCount} pages)`,
    `Comparison Mode   : ${options.mode}`,
    `Comparison Date   : ${new Date().toISOString()}`,
    `------------------------------------------------------------`,
    `SUMMARY STATISTICS:`,
    `  • Total Pages Evaluated : ${totalComparedPages}`,
    `  • Added Pages           : ${addedPageCount}`,
    `  • Removed Pages         : ${removedPageCount}`,
    `  • Modified Pages        : ${modifiedPageCount}`,
    `  • Unchanged Pages       : ${unchangedPageCount}`,
    `  • Text Differences      : ${options.detectTextChanges ? totalTextChanges : 'Skipped'}`,
    `  • Visual Differences    : ${options.detectVisualChanges ? totalVisualChanges : 'Skipped'}`,
    `------------------------------------------------------------`,
    `PAGE BREAKDOWN:`,
  ];

  pages.forEach((p) => {
    reportLines.push(`  Page ${p.displayPageNum}: [${p.status.toUpperCase()}] - ${p.notes.join('; ')}`);
  });
  reportLines.push(`============================================================\n`);

  const reportText = reportLines.join('\n');

  onProgress?.(85, 'Generating high-contrast comparison PDF result...');

  const partialResult: PdfComparisonResult = {
    success: true,
    originalFileName: originalFile.name,
    updatedFileName: updatedFile.name,
    originalPageCount: origPageCount,
    updatedPageCount: updatedPageCount,
    totalComparedPages,
    addedPageCount,
    removedPageCount,
    modifiedPageCount,
    unchangedPageCount,
    totalTextChanges,
    totalVisualChanges,
    pages,
    changedPageIndices,
    textComparisonEnabled: options.detectTextChanges,
    visualComparisonEnabled: options.detectVisualChanges,
    mode: options.mode,
    reportText,
    warningNotice: littleOrNoTextWarning
      ? 'This PDF contains little or no extractable text. Text comparison may be limited; visual comparison will still be performed.'
      : undefined,
  };

  const pdfBlob = await generateComparisonPdf(partialResult, pageRenderings);
  partialResult.generatedPdfBlob = pdfBlob;

  onProgress?.(100, 'Comparison completed successfully!');
  return partialResult;
}
