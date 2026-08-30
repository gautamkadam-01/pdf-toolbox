/**
 * PDF Toolbox API Client (src/lib/api/pdfApi.ts)
 * Centralized API client for all server-side PDF operations (Phase 3A).
 * Handles structured errors, binary streams, binary magic-byte validation, and download headers.
 */

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Maps error codes to user-friendly UI messages
 */
export function getFriendlyErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred during processing.';
  if (typeof err === 'string') return err;

  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'SERVICE_UNAVAILABLE':
    case 'BACKEND_UNAVAILABLE':
      return 'The PDF processing service is currently unavailable. Please try again shortly.';
    case 'NETWORK_ERROR':
      return 'Network connection issue. Please check your internet connection and try again.';
    case 'PROCESSING_ENGINE_UNAVAILABLE':
      return 'The required document conversion engine is unavailable on the server.';
    case 'INVALID_PDF':
    case 'INVALID_PDF_OUTPUT':
      return 'The document could not be processed as a valid PDF file.';
    case 'INVALID_IMAGE':
      return 'The uploaded image format is invalid or corrupted.';
    case 'FILE_TOO_LARGE':
      return 'The uploaded file exceeds the maximum allowed file size limit.';
    case 'INVALID_PAGE_NUMBER':
      return 'The specified page range or number is invalid for this document.';
    case 'NO_EMBEDDED_IMAGES':
      return 'No embedded raster images were found in this PDF document.';
    case 'EMPTY_OUTPUT':
      return 'The conversion produced an empty output file.';
    case 'UNSUPPORTED_OFFICE_FORMAT':
      return 'The uploaded office document format is unsupported or corrupted.';
    case 'CONVERSION_FAILED':
    case 'PROCESSING_FAILED':
      return message || 'The document conversion failed. Please verify the file and retry.';
    default:
      return message || 'An error occurred while processing the document.';
  }
}

export interface ApiHealthResponse {
  success: boolean;
  service: string;
  status: string;
  timestamp?: string;
  version?: string;
  environment?: string;
}

export interface EngineStatusResponse {
  success: boolean;
  service: string;
  engines: Record<string, {
    available: boolean;
    cliAvailable: boolean;
    engine: string;
  }>;
}

/**
 * Verify backend health
 */
export async function checkApiHealth(): Promise<ApiHealthResponse> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) {
      throw new ApiError(`Health check returned HTTP ${res.status}`, 'HTTP_5XX', res.status);
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Unable to connect to the PDF processing service.',
      'BACKEND_UNAVAILABLE',
      0,
      err.message
    );
  }
}

/**
 * Query conversion engines status
 */
export async function checkEngineStatuses(): Promise<EngineStatusResponse> {
  try {
    const res = await fetch('/api/health/engines', { method: 'GET' });
    if (!res.ok) {
      throw new ApiError(`Engine health check returned HTTP ${res.status}`, 'HTTP_5XX', res.status);
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Unable to query conversion engines.',
      'BACKEND_UNAVAILABLE',
      0,
      err.message
    );
  }
}

export interface CompressResult {
  blob: Blob;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
}

export interface HtmlToPdfOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
}

export interface ExtractImagesResult {
  blob: Blob;
  filename: string;
  isZip: boolean;
  mimeType: string;
}

/**
 * Safely inspects the first 1024 bytes of a binary buffer for standard PDF markers (%PDF-)
 * per ISO 32000 specification, accounting for UTF-8 BOM, leading comments, or whitespace.
 */
function isValidPdfBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;

  // Direct header match (%PDF-)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return true;
  }

  // Scan within the first 1024 bytes for %PDF-
  const scanLimit = Math.min(bytes.length, 1024);
  for (let i = 0; i <= scanLimit - 5; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks for standard ZIP file magic bytes (PK\x03\x04 or PK\x05\x06)
 */
function isZipBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

/**
 * Parses filename from Content-Disposition header safely
 */
function parseFilenameFromHeader(headerValue: string | null, fallback: string): string {
  if (!headerValue) return fallback;
  const match = headerValue.match(/filename="?([^";]+)"?/i);
  return match ? match[1].trim() : fallback;
}

/**
 * Core request dispatcher with comprehensive binary validation and error unwrapping
 */
async function sendApiRequest(
  endpoint: string,
  formData: FormData,
  expectedType: 'pdf' | 'zip' | 'any' = 'any'
): Promise<{ blob: Blob; response: Response; filename: string }> {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
  } catch (netErr: any) {
    console.error(`[API Network Error] ${endpoint}:`, netErr);
    if (!navigator.onLine) {
      throw new ApiError('No internet connection. Please verify your network.', 'NETWORK_ERROR', 0);
    }
    throw new ApiError(
      'Unable to connect to the PDF processing service. Please verify that the backend server is running.',
      'BACKEND_UNAVAILABLE',
      0,
      netErr.message
    );
  }

  const contentType = response.headers.get('Content-Type') || '';

  // Handle server HTTP error responses
  if (!response.ok) {
    let errorCode = response.status >= 500 ? 'HTTP_5XX' : 'HTTP_4XX';
    let errorMessage = `Server returned status ${response.status}`;

    if (contentType.includes('application/json')) {
      try {
        const json = await response.json();
        if (json?.error) {
          errorCode = json.error.code || errorCode;
          errorMessage = json.error.message || errorMessage;
        }
      } catch (_) {}
    } else {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch (_) {}
    }

    console.error(`[API Error ${response.status}] ${endpoint}: ${errorCode} - ${errorMessage}`);
    throw new ApiError(errorMessage, errorCode, response.status);
  }

  // If server returned JSON instead of binary data on 200
  if (contentType.includes('application/json')) {
    try {
      const json = await response.json();
      if (json && json.success === false) {
        throw new ApiError(
          json.error?.message || 'Processing failed.',
          json.error?.code || 'PROCESSING_FAILED',
          400
        );
      }
      throw new ApiError(
        'Server returned an unexpected JSON response instead of document binary.',
        'INVALID_RESPONSE',
        500
      );
    } catch (parseErr: any) {
      if (parseErr instanceof ApiError) throw parseErr;
      throw new ApiError(
        'Server returned invalid response data.',
        'INVALID_RESPONSE',
        500
      );
    }
  }

  const disposition = response.headers.get('Content-Disposition');
  const rawBlob = await response.blob();

  // Validate non-empty binary blob
  if (!rawBlob || rawBlob.size === 0) {
    throw new ApiError(
      'The generated document output is empty (0 bytes).',
      'EMPTY_OUTPUT',
      500
    );
  }

  // Inspect binary header bytes (up to 1024 bytes)
  const headerSlice = await rawBlob.slice(0, Math.min(rawBlob.size, 1024)).arrayBuffer();
  const headerBytes = new Uint8Array(headerSlice);
  const hasPdfMagic = isValidPdfBuffer(headerBytes);
  const hasZipMagic = isZipBuffer(headerBytes);

  let defaultFallback = 'document.pdf';
  if (expectedType === 'zip' || hasZipMagic || contentType.includes('application/zip')) {
    defaultFallback = 'archive.zip';
  } else if (contentType.includes('image/png')) {
    defaultFallback = 'image.png';
  } else if (contentType.includes('image/jpeg')) {
    defaultFallback = 'image.jpg';
  } else if (contentType.includes('text/plain')) {
    defaultFallback = 'output.txt';
  } else if (hasPdfMagic || expectedType === 'pdf' || contentType.includes('application/pdf')) {
    defaultFallback = 'document.pdf';
  } else {
    defaultFallback = 'output.bin';
  }

  const filename = parseFilenameFromHeader(disposition, defaultFallback);

  // Check if output is declared as PDF or contains valid PDF structure
  const isDeclaredPdf =
    expectedType === 'pdf' ||
    contentType.includes('application/pdf') ||
    (filename.toLowerCase().endsWith('.pdf') && !hasZipMagic && !contentType.startsWith('image/') && !contentType.includes('zip'));

  if (isDeclaredPdf || hasPdfMagic) {
    if (!hasPdfMagic) {
      // Check if response is actually an HTML error page
      const textPreview = new TextDecoder('utf-8', { fatal: false }).decode(headerBytes.slice(0, 300));
      if (textPreview.includes('<!DOCTYPE') || textPreview.includes('<html')) {
        throw new ApiError(
          'Server returned an HTML response instead of a valid PDF document.',
          'INVALID_SERVER_RESPONSE',
          response.status || 500
        );
      }
      throw new ApiError(
        'The generated output does not contain valid PDF binary data.',
        'INVALID_PDF_OUTPUT',
        500
      );
    }

    // Wrap in explicit application/pdf Blob
    const validatedBlob = new Blob([rawBlob], { type: 'application/pdf' });
    const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    return { blob: validatedBlob, response, filename: finalFilename };
  }

  // Explicit ZIP validation
  const isZip =
    expectedType === 'zip' ||
    hasZipMagic ||
    contentType.includes('application/zip') ||
    filename.toLowerCase().endsWith('.zip');

  if (isZip) {
    const validatedBlob = new Blob([rawBlob], { type: 'application/zip' });
    const finalFilename = filename.toLowerCase().endsWith('.zip') ? filename : `${filename}.zip`;
    return { blob: validatedBlob, response, filename: finalFilename };
  }

  // Image responses (e.g. from single-image extract-images)
  if (contentType.startsWith('image/') || filename.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
    const mime = contentType.startsWith('image/') ? contentType : 'image/png';
    const validatedBlob = new Blob([rawBlob], { type: mime });
    return { blob: validatedBlob, response, filename };
  }

  return { blob: rawBlob, response, filename };
}

/**
 * 1. Compress PDF (POST /api/v1/pdf/compress)
 */
export async function compressPdf(
  file: File,
  level: 'low' | 'medium' | 'high' = 'medium'
): Promise<CompressResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('level', level);

  const { blob, response, filename } = await sendApiRequest('/api/v1/pdf/compress', formData, 'pdf');

  const origSizeHeader = response.headers.get('X-Original-Size');
  const compSizeHeader = response.headers.get('X-Compressed-Size');
  const savedPctHeader = response.headers.get('X-Saved-Percentage');
  const savedBytesHeader = response.headers.get('X-Saved-Bytes');

  const originalSize = origSizeHeader ? parseInt(origSizeHeader, 10) : file.size;
  const compressedSize = compSizeHeader ? parseInt(compSizeHeader, 10) : blob.size;
  const savedBytes = savedBytesHeader ? parseInt(savedBytesHeader, 10) : Math.max(0, originalSize - compressedSize);
  const savedPercentage = savedPctHeader
    ? parseFloat(savedPctHeader)
    : originalSize > 0
    ? parseFloat(((savedBytes / originalSize) * 100).toFixed(2))
    : 0;

  return {
    blob,
    filename,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercentage,
  };
}

/**
 * 2. Word to PDF (POST /api/v1/pdf/word-to-pdf)
 */
export async function wordToPdf(file: File): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/word-to-pdf', formData, 'pdf');
  return { blob, filename };
}

/**
 * 3. PowerPoint to PDF (POST /api/v1/pdf/powerpoint-to-pdf)
 */
export async function powerpointToPdf(file: File): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/powerpoint-to-pdf', formData, 'pdf');
  return { blob, filename };
}

/**
 * 4. Excel to PDF (POST /api/v1/pdf/excel-to-pdf)
 */
export async function excelToPdf(file: File): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/excel-to-pdf', formData, 'pdf');
  return { blob, filename };
}

/**
 * 5. HTML to PDF (POST /api/v1/pdf/html-to-pdf)
 */
export async function htmlToPdf(
  fileOrHtml: File | string,
  options: HtmlToPdfOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();

  if (typeof fileOrHtml === 'string') {
    formData.append('html', fileOrHtml);
  } else {
    formData.append('file', fileOrHtml);
  }

  if (options.pageSize) formData.append('pageSize', options.pageSize);
  if (options.orientation) formData.append('orientation', options.orientation);
  if (typeof options.margin === 'number') formData.append('margin', String(options.margin));

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/html-to-pdf', formData, 'pdf');
  return { blob, filename };
}

/**
 * 6. Extract Images (POST /api/v1/pdf/extract-images)
 */
export async function extractImages(file: File): Promise<ExtractImagesResult> {
  const formData = new FormData();
  formData.append('file', file);

  const { blob, filename, response } = await sendApiRequest('/api/v1/pdf/extract-images', formData, 'any');
  const mimeType = response.headers.get('Content-Type') || (filename.endsWith('.zip') ? 'application/zip' : 'image/png');
  const isZip = mimeType.includes('zip') || filename.endsWith('.zip');

  return { blob, filename, isZip, mimeType };
}

/**
 * 7. Protect PDF (POST /api/v1/pdf/protect)
 */
export async function protectPdfApi(
  file: File,
  password: string,
  options: {
    algorithm?: 'AES-256' | 'RC4';
    allowPrinting?: boolean;
    allowCopying?: boolean;
    allowModifying?: boolean;
    allowAnnotating?: boolean;
  } = {}
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  if (options.algorithm) formData.append('algorithm', options.algorithm);
  if (options.allowPrinting !== undefined) formData.append('allowPrinting', String(options.allowPrinting));
  if (options.allowCopying !== undefined) formData.append('allowCopying', String(options.allowCopying));
  if (options.allowModifying !== undefined) formData.append('allowModifying', String(options.allowModifying));
  if (options.allowAnnotating !== undefined) formData.append('allowAnnotating', String(options.allowAnnotating));

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/protect', formData, 'pdf');
  return { blob, filename };
}

/**
 * 8. Unlock PDF (POST /api/v1/pdf/unlock)
 */
export async function unlockPdfApi(
  file: File,
  password: string
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/unlock', formData, 'pdf');
  return { blob, filename };
}

/**
 * 9. Redact PDF (POST /api/v1/pdf/redact)
 */
export async function redactPdfApi(
  file: File,
  redactions: any[],
  options: { color?: string } = {}
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('redactions', JSON.stringify(redactions));
  if (options.color) formData.append('color', options.color);

  const { blob, filename } = await sendApiRequest('/api/v1/pdf/redact', formData, 'pdf');
  return { blob, filename };
}

