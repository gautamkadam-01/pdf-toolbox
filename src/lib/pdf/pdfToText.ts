import { pdfjsLib } from './pdfjsSetup';
import { ProcessingResult } from '../../types/tool';
import { sanitizePdfBuffer } from './pdfLoader';

export async function extractTextFromPDF(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<ProcessingResult> {
  try {
    onProgress?.(15, 'Reading PDF structure...');
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

    const pageTexts: string[] = [];
    let totalExtractedLength = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        20 + Math.round((pageNum / totalPages) * 70),
        `Extracting text from page ${pageNum} of ${totalPages}...`
      );

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as Array<{ str: string; hasEOL?: boolean }>;
      let pageStr = '';

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        pageStr += item.str;
        if (item.hasEOL) {
          pageStr += '\n';
        } else if (i < items.length - 1 && !items[i + 1].str.startsWith(' ') && !item.str.endsWith(' ')) {
          pageStr += ' ';
        }
      }

      const trimmed = pageStr.trim();
      totalExtractedLength += trimmed.length;

      pageTexts.push(
        `============================================================\n` +
        `PAGE ${pageNum} OF ${totalPages}\n` +
        `============================================================\n\n` +
        (trimmed.length > 0 ? trimmed : `[No selectable text found on page ${pageNum}.]`) +
        `\n\n`
      );
    }

    if (totalExtractedLength === 0) {
      return {
        success: false,
        files: [],
        error: 'No extractable text characters were found in this document. Please ensure the PDF contains selectable digital text.',
      };
    }

    const fullTextContent = pageTexts.join('\n');
    const blob = new Blob([fullTextContent], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.pdf$/i, '');

    return {
      success: true,
      files: [
        {
          name: `${baseName}_extracted_text.txt`,
          blob,
          type: 'text/plain',
        },
      ],
    };
  } catch (err: any) {
    console.error('PDF to text extraction error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to extract text from PDF. The document may be protected or contain corrupted fonts.',
    };
  }
}
