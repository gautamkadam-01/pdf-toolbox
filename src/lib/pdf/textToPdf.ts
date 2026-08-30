import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';
import { sanitizeWinAnsi } from './textEncoding';

export interface TextToPdfOptions {
  fontSize?: number;
  lineHeight?: number;
  margin?: number;
}

export async function textToPDF(
  text: string,
  fileName: string = 'document.txt',
  options: TextToPdfOptions = {}
): Promise<ProcessingResult> {
  const content = sanitizeWinAnsi(text.trim());
  if (!content) {
    return {
      success: false,
      files: [],
      error: 'Text input is empty. Please enter or upload text content.',
    };
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = options.fontSize || 10;
    const lineHeight = options.lineHeight || 14;
    const margin = options.margin || 45;

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const maxLineWidth = A4_WIDTH - margin * 2;
    const maxY = A4_HEIGHT - margin;
    const minY = margin;

    // Word wrap function for a paragraph
    const wrapParagraph = (para: string): string[] => {
      if (para.length === 0) return [''];
      const words = para.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxLineWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          // If a single word is wider than maxLineWidth, break it character by character
          if (font.widthOfTextAtSize(word, fontSize) > maxLineWidth) {
            let charLine = '';
            for (const ch of word) {
              if (font.widthOfTextAtSize(charLine + ch, fontSize) <= maxLineWidth) {
                charLine += ch;
              } else {
                lines.push(charLine);
                charLine = ch;
              }
            }
            currentLine = charLine;
          } else {
            currentLine = word;
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    // Split text into paragraphs and wrap each
    const rawParagraphs = content.split(/\r?\n/);
    const allLines: string[] = [];
    for (const para of rawParagraphs) {
      allLines.push(...wrapParagraph(para));
    }

    // Paginate and draw
    let currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let currentY = maxY;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];

      if (currentY - lineHeight < minY) {
        // Create new page
        currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        currentY = maxY;
      }

      if (line) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.12, 0.12, 0.12),
        });
      }

      currentY -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const baseName = fileName.replace(/\.[^/.]+$/, '');

    return {
      success: true,
      files: [
        {
          name: `${baseName || 'text_document'}.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Text to PDF error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to convert text to PDF.',
    };
  }
}
