/**
 * Office to PDF Engine Adapter
 * Handles Word (.docx, .doc), PowerPoint (.pptx, .ppt), and Excel (.xlsx, .xls) -> PDF.
 * Uses LibreOffice CLI if available, with robust pure-JS fallbacks (mammoth, xlsx, JSZip + pdf-lib).
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const EngineAdapter = require('../engineAdapter');
const { officeConverterPath } = require('../../../config/env');
const { validateOfficeBuffer } = require('../../../utils/fileValidation');
const { sanitizeWinAnsi } = require('../../../utils/textEncoding');
const logger = require('../../../utils/logger');

class OfficeAdapter extends EngineAdapter {
  constructor() {
    super('office-to-pdf');
  }

  /**
   * Checks if LibreOffice binary is executable
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const binaries = [officeConverterPath, 'libreoffice', 'soffice'].filter(Boolean);
    for (const bin of binaries) {
      if (typeof bin !== 'string') continue;
      const ok = await new Promise((resolve) => {
        try {
          execFile(bin, ['--version'], (err) => resolve(!err));
        } catch (_) {
          resolve(false);
        }
      });
      if (ok) return true;
    }
    return false;
  }

  /**
   * Resolves the working LibreOffice binary name
   * @returns {Promise<string>}
   */
  async resolveBinary() {
    const binaries = [officeConverterPath, 'libreoffice', 'soffice'].filter(Boolean);
    for (const bin of binaries) {
      if (typeof bin !== 'string') continue;
      const ok = await new Promise((resolve) => {
        try {
          execFile(bin, ['--version'], (err) => resolve(!err));
        } catch (_) {
          resolve(false);
        }
      });
      if (ok) return bin;
    }
    return officeConverterPath || 'libreoffice';
  }

  /**
   * Runs LibreOffice CLI conversion in headless mode
   */
  async runCliConversion(inputPath, outputDir, options = {}) {
    const binary = await this.resolveBinary();
    const userProfileDir = path.join(outputDir, 'lo_profile');
    await fs.promises.mkdir(userProfileDir, { recursive: true });

    const docType = options.type || 'word';
    let filter = 'pdf';
    if (docType === 'word') filter = 'pdf:writer_pdf_Export';
    else if (docType === 'excel') filter = 'pdf:calc_pdf_Export';
    else if (docType === 'powerpoint') filter = 'pdf:impress_pdf_Export';

    const args = [
      '--headless',
      '--invisible',
      '--nodefault',
      '--nofirststartwizard',
      '--nolockcheck',
      '--nologo',
      `-env:UserInstallation=file://${userProfileDir.replace(/\\/g, '/')}`,
      '--convert-to',
      filter,
      '--outdir',
      outputDir,
      inputPath,
    ];

    return new Promise((resolve, reject) => {
      execFile(binary, args, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`LibreOffice CLI conversion failed: ${error.message} (stderr: ${stderr})`);
          if (error.killed || error.code === 'ETIMEDOUT') {
            const timeoutErr = new Error('The document conversion process timed out.');
            timeoutErr.code = 'PROCESS_TIMEOUT';
            timeoutErr.status = 504;
            return reject(timeoutErr);
          }
          const convErr = new Error('The Word document could not be converted by the document engine.');
          convErr.code = docType === 'word' ? 'WORD_CONVERSION_FAILED' : 'OFFICE_CONVERSION_FAILED';
          convErr.status = 502;
          return reject(convErr);
        }
        resolve();
      });
    });
  }

  /**
   * Word (.docx/.doc) pure-JS fallback
   */
  async convertDocxFallback(fileBuffer, originalName) {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    const pageWidth = 595.28; // Standard A4 Width
    const pageHeight = 841.89; // Standard A4 Height
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const baseName = path.basename(originalName, path.extname(originalName)) || 'Document';

    const checkPageBreak = (neededHeight) => {
      if (y - neededHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
        return true;
      }
      return false;
    };

    const drawWrappedText = (text, options = {}) => {
      const safeText = sanitizeWinAnsi(text);
      const font = options.font || fontRegular;
      const size = options.size || 11;
      const lineHeight = options.lineHeight || size * 1.45;
      const color = options.color || rgb(0.15, 0.18, 0.22);
      const indent = options.indent || 0;
      const maxWidth = contentWidth - indent;
      const safePrefix = options.prefix ? sanitizeWinAnsi(options.prefix) : '';

      const words = safeText.split(/\s+/);
      let line = '';
      let isFirstLine = true;

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && line) {
          checkPageBreak(lineHeight);
          const drawX = margin + indent;
          if (isFirstLine && safePrefix) {
            page.drawText(safePrefix, {
              x: margin + indent - font.widthOfTextAtSize(safePrefix, size) - 2,
              y,
              size,
              font: options.prefixFont || font,
              color: options.prefixColor || color,
            });
          }
          page.drawText(line, { x: drawX, y, size, font, color });
          y -= lineHeight;
          line = word;
          isFirstLine = false;
        } else {
          line = testLine;
        }
      }

      if (line) {
        checkPageBreak(lineHeight);
        const drawX = margin + indent;
        if (isFirstLine && safePrefix) {
          page.drawText(safePrefix, {
            x: margin + indent - font.widthOfTextAtSize(safePrefix, size) - 2,
            y,
            size,
            font: options.prefixFont || font,
            color: options.prefixColor || color,
          });
        }
        page.drawText(line, { x: drawX, y, size, font, color });
        y -= lineHeight;
      }
    };

    let structuredHtml = '';
    const embeddedMedia = new Map();

    try {
      const zip = await JSZip.loadAsync(fileBuffer);
      const mediaFiles = Object.keys(zip.files).filter((name) => /^word\/media\//i.test(name));
      for (const mediaPath of mediaFiles) {
        const ext = path.extname(mediaPath).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          const mediaBuf = await zip.files[mediaPath].async('nodebuffer');
          embeddedMedia.set(path.basename(mediaPath), {
            buffer: mediaBuf,
            mime: ext === '.png' ? 'image/png' : 'image/jpeg',
          });
        }
      }
    } catch (_) {}

    try {
      const htmlResult = await mammoth.convertToHtml(
        { buffer: fileBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            return image.read('base64').then((base64Data) => ({
              src: `data:${image.contentType};base64,${base64Data}`,
            }));
          }),
        }
      );
      structuredHtml = htmlResult.value || '';
    } catch (_) {}

    if (structuredHtml && structuredHtml.trim()) {
      const blockRegex = /<(h[1-6]|p|table|ul|ol|blockquote|img)[^>]*>([\s\S]*?)<\/\1>|<img[^>]+src="([^">]+)"[^>]*\/?>/gi;
      let match;

      while ((match = blockRegex.exec(structuredHtml)) !== null) {
        const tag = (match[1] || 'img').toLowerCase();
        const content = match[2] || '';
        const imgSrc = match[3] || '';

        if (tag.startsWith('h')) {
          const cleanText = content.replace(/<[^>]+>/g, '').trim();
          if (!cleanText) continue;
          const level = parseInt(tag.charAt(1), 10);
          const headingSize = level === 1 ? 16 : level === 2 ? 14 : 12;
          const headingLineHeight = headingSize + 8;

          y -= 8;
          checkPageBreak(headingLineHeight + 10);
          drawWrappedText(cleanText, {
            font: fontBold,
            size: headingSize,
            lineHeight: headingLineHeight,
            color: rgb(0.1, 0.15, 0.28),
          });
          y -= 4;
        } else if (tag === 'p') {
          const isBold = /<strong>|<b>/i.test(content);
          const isItalic = /<em>|<i>/i.test(content);
          const curFont = isBold && isItalic ? fontBoldItalic : isBold ? fontBold : isItalic ? fontItalic : fontRegular;
          const cleanText = content.replace(/<[^>]+>/g, '').trim();

          if (cleanText) {
            drawWrappedText(cleanText, {
              font: curFont,
              size: 11,
              lineHeight: 16,
              color: rgb(0.18, 0.2, 0.25),
            });
            y -= 4;
          }
        } else if (tag === 'ul' || tag === 'ol') {
          const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
          items.forEach((item, idx) => {
            const itemText = item.replace(/<[^>]+>/g, '').trim();
            if (itemText) {
              const prefix = tag === 'ol' ? `${idx + 1}. ` : '• ';
              drawWrappedText(itemText, {
                font: fontRegular,
                size: 10.5,
                lineHeight: 15,
                indent: 14,
                prefix,
                color: rgb(0.2, 0.22, 0.28),
              });
              y -= 2;
            }
          });
          y -= 4;
        } else if (tag === 'table') {
          const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
          if (rows.length > 0) {
            const tableData = rows.map((r) => {
              const cells = r.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
              return cells.map((c) => c.replace(/<[^>]+>/g, '').trim());
            });

            const maxCols = Math.min(8, Math.max(...tableData.map((r) => r.length), 1));
            const colWidth = contentWidth / maxCols;
            const rowHeight = 22;

            y -= 8;
            for (let rIdx = 0; rIdx < tableData.length; rIdx++) {
              const rowCells = tableData[rIdx];
              checkPageBreak(rowHeight + 10);
              const isHeaderRow = rIdx === 0;

              page.drawRectangle({
                x: margin,
                y: y - rowHeight + 14,
                width: contentWidth,
                height: rowHeight,
                color: isHeaderRow ? rgb(0.92, 0.94, 0.98) : rIdx % 2 === 1 ? rgb(0.98, 0.98, 0.99) : rgb(1, 1, 1),
              });

              page.drawLine({
                start: { x: margin, y: y - rowHeight + 14 },
                end: { x: margin + contentWidth, y: y - rowHeight + 14 },
                thickness: isHeaderRow ? 1.2 : 0.6,
                color: rgb(0.8, 0.83, 0.88),
              });

              for (let cIdx = 0; cIdx < maxCols; cIdx++) {
                let cellText = sanitizeWinAnsi((rowCells[cIdx] || '').trim());
                const cellFont = isHeaderRow ? fontBold : fontRegular;
                const cellFontSize = 9.5;

                while (cellText.length > 0 && cellFont.widthOfTextAtSize(cellText, cellFontSize) > colWidth - 10) {
                  cellText = cellText.slice(0, -1);
                }
                if (cellText.length < sanitizeWinAnsi(rowCells[cIdx] || '').length && cellText.length > 2) {
                  cellText = cellText.slice(0, -2) + '..';
                }

                if (cellText) {
                  page.drawText(cellText, {
                    x: margin + cIdx * colWidth + 6,
                    y: y - rowHeight + 18,
                    size: cellFontSize,
                    font: cellFont,
                    color: isHeaderRow ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.22, 0.28),
                  });
                }
              }
              y -= rowHeight;
            }
            y -= 8;
          }
        }
      }
    }

    if (pdfDoc.getPageCount() === 1 && y === pageHeight - margin) {
      let rawLines = [];
      try {
        const rawRes = await mammoth.extractRawText({ buffer: fileBuffer });
        if (rawRes.value) {
          rawLines = rawRes.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        }
      } catch (_) {}

      if (rawLines.length === 0) {
        rawLines = ['[Document conversion completed]'];
      }

      for (const line of rawLines) {
        drawWrappedText(line, { font: fontRegular, size: 11, lineHeight: 16 });
        y -= 4;
      }
    }

    const totalPages = pdfDoc.getPageCount();
    const safeBaseName = sanitizeWinAnsi(baseName);
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(safeBaseName, {
        x: margin,
        y: pageHeight - margin / 2,
        size: 8,
        font: fontRegular,
        color: rgb(0.55, 0.58, 0.65),
      });

      const pageStr = `Page ${i + 1} of ${totalPages}`;
      const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 8.5);
      p.drawText(pageStr, {
        x: (pageWidth - pageStrWidth) / 2,
        y: margin / 2,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.62),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Excel (.xlsx/.xls) pure-JS fallback
   */
  async convertExcelFallback(fileBuffer, originalName) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      throw new Error('The uploaded Excel spreadsheet contains no worksheets.');
    }

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 841.89; // Landscape A4
    const pageHeight = 595.28;
    const margin = 40;

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!data || data.length === 0) continue;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      page.drawRectangle({
        x: margin,
        y: y - 10,
        width: pageWidth - margin * 2,
        height: 30,
        color: rgb(0.12, 0.45, 0.25),
      });

      const safeSheetName = sanitizeWinAnsi(sheetName) || 'Sheet';
      page.drawText(`Sheet: ${safeSheetName}`, {
        x: margin + 12,
        y: y + 2,
        size: 14,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      y -= 38;

      const maxCols = Math.min(10, Math.max(...data.map((r) => (Array.isArray(r) ? r.length : 0)), 1));
      const colWidth = (pageWidth - margin * 2) / maxCols;
      const rowHeight = 20;

      for (let rIdx = 0; rIdx < data.length; rIdx++) {
        const row = data[rIdx];
        if (!Array.isArray(row)) continue;

        if (y < margin + rowHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        const isHeader = rIdx === 0;
        if (isHeader) {
          page.drawRectangle({
            x: margin,
            y: y - 5,
            width: pageWidth - margin * 2,
            height: rowHeight,
            color: rgb(0.9, 0.93, 0.96),
          });
        } else if (rIdx % 2 === 1) {
          page.drawRectangle({
            x: margin,
            y: y - 5,
            width: pageWidth - margin * 2,
            height: rowHeight,
            color: rgb(0.97, 0.98, 0.99),
          });
        }

        for (let cIdx = 0; cIdx < maxCols; cIdx++) {
          const rawVal = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]).trim() : '';
          const val = sanitizeWinAnsi(rawVal);
          const xPos = margin + cIdx * colWidth;

          let displayText = val;
          while (displayText.length > 0 && fontRegular.widthOfTextAtSize(displayText, 9) > colWidth - 8) {
            displayText = displayText.slice(0, -1);
          }
          if (displayText.length < val.length && displayText.length > 2) {
            displayText = displayText.slice(0, -2) + '..';
          }

          if (displayText) {
            page.drawText(displayText, {
              x: xPos + 4,
              y,
              size: isHeader ? 9.5 : 8.5,
              font: isHeader ? fontBold : fontRegular,
              color: isHeader ? rgb(0.1, 0.15, 0.2) : rgb(0.2, 0.23, 0.28),
            });
          }

          page.drawLine({
            start: { x: xPos, y: y - 5 },
            end: { x: xPos, y: y - 5 + rowHeight },
            thickness: 0.5,
            color: rgb(0.85, 0.87, 0.9),
          });
        }

        page.drawLine({
          start: { x: margin + maxCols * colWidth, y: y - 5 },
          end: { x: margin + maxCols * colWidth, y: y - 5 + rowHeight },
          thickness: 0.5,
          color: rgb(0.85, 0.87, 0.9),
        });

        page.drawLine({
          start: { x: margin, y: y - 5 },
          end: { x: margin + maxCols * colWidth, y: y - 5 },
          thickness: 0.5,
          color: rgb(0.85, 0.87, 0.9),
        });

        y -= rowHeight;
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawText('Empty Spreadsheet', { x: margin, y: pageHeight - margin, size: 14, font: fontBold });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * PowerPoint (.pptx/.ppt) pure-JS fallback
   */
  async convertPowerPointFallback(fileBuffer, originalName) {
    const zip = await JSZip.loadAsync(fileBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const slideWidth = 960;
    const slideHeight = 540;
    const margin = 50;

    if (slideFiles.length === 0) {
      const page = pdfDoc.addPage([slideWidth, slideHeight]);
      page.drawText('Presentation', { x: margin, y: slideHeight / 2, size: 24, font: fontBold });
    } else {
      for (let sIdx = 0; sIdx < slideFiles.length; sIdx++) {
        const slidePath = slideFiles[sIdx];
        const xmlContent = await zip.files[slidePath].async('string');

        const textMatches = xmlContent.match(/<a:t>([^<]+)<\/a:t>/g) || [];
        const textRuns = textMatches
          .map((m) => m.replace(/<\/?a:t>/g, '').trim())
          .filter((t) => t.length > 0);

        const page = pdfDoc.addPage([slideWidth, slideHeight]);

        page.drawRectangle({
          x: 0,
          y: 0,
          width: slideWidth,
          height: slideHeight,
          color: rgb(0.96, 0.97, 0.99),
        });

        page.drawRectangle({
          x: 0,
          y: slideHeight - 8,
          width: slideWidth,
          height: 8,
          color: rgb(0.85, 0.25, 0.2),
        });

        const rawTitle = textRuns.length > 0 ? textRuns[0] : `Slide ${sIdx + 1}`;
        const title = sanitizeWinAnsi(rawTitle);
        page.drawText(title, {
          x: margin,
          y: slideHeight - margin - 20,
          size: 24,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.25),
        });

        page.drawLine({
          start: { x: margin, y: slideHeight - margin - 28 },
          end: { x: slideWidth - margin, y: slideHeight - margin - 28 },
          thickness: 1.5,
          color: rgb(0.8, 0.83, 0.88),
        });

        let curY = slideHeight - margin - 65;
        const bodyRuns = textRuns.slice(1);

        for (const run of bodyRuns) {
          if (curY < margin + 30) break;

          page.drawCircle({
            x: margin + 8,
            y: curY + 4,
            size: 3,
            color: rgb(0.85, 0.25, 0.2),
          });

          const safeRun = sanitizeWinAnsi(run);
          const words = safeRun.split(' ');
          let line = '';
          for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (fontRegular.widthOfTextAtSize(test, 13) > slideWidth - margin * 2 - 30) {
              page.drawText(line, {
                x: margin + 22,
                y: curY,
                size: 13,
                font: fontRegular,
                color: rgb(0.2, 0.25, 0.3),
              });
              curY -= 20;
              line = w;
            } else {
              line = test;
            }
          }
          if (line) {
            page.drawText(line, {
              x: margin + 22,
              y: curY,
              size: 13,
              font: fontRegular,
              color: rgb(0.2, 0.25, 0.3),
            });
            curY -= 26;
          }
        }

        page.drawText(`${sIdx + 1} / ${slideFiles.length}`, {
          x: slideWidth - margin - 40,
          y: margin / 2,
          size: 10,
          font: fontRegular,
          color: rgb(0.5, 0.55, 0.6),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Main convert lifecycle implementation
   */
  async convert(context) {
    const { input, originalName = 'document.docx', workspaceDir, options = {} } = context;
    const type = options.type || 'word';

    const validation = validateOfficeBuffer(input, originalName, type);
    if (!validation.isValid) {
      const err = new Error(validation.error.message);
      err.code = validation.error.code;
      err.status = 422;
      throw err;
    }

    const ext = path.extname(originalName) || (type === 'word' ? '.docx' : type === 'powerpoint' ? '.pptx' : '.xlsx');
    const safeBaseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_') || 'document';
    let outputBuffer = null;

    const isCliAvailable = await this.isAvailable();
    if (isCliAvailable) {
      const inputDir = path.join(workspaceDir, 'input');
      const outputDir = path.join(workspaceDir, 'output');
      await fs.promises.mkdir(inputDir, { recursive: true });
      await fs.promises.mkdir(outputDir, { recursive: true });

      const inputFilePath = path.join(inputDir, `${safeBaseName}${ext}`);
      const expectedPdfPath = path.join(outputDir, `${safeBaseName}.pdf`);

      await fs.promises.writeFile(inputFilePath, input);
      try {
        await this.runCliConversion(inputFilePath, outputDir, { type });

        if (fs.existsSync(expectedPdfPath)) {
          outputBuffer = await fs.promises.readFile(expectedPdfPath);
        } else {
          const files = await fs.promises.readdir(outputDir);
          const pdfFile = files.find((f) => f.toLowerCase().endsWith('.pdf'));
          if (pdfFile) {
            outputBuffer = await fs.promises.readFile(path.join(outputDir, pdfFile));
          }
        }
      } catch (cliErr) {
        logger.warn(`Office CLI conversion failed: ${cliErr.message}, attempting native engine fallback`);
      }
    }

    if (!outputBuffer || outputBuffer.length === 0) {
      if (type === 'powerpoint') {
        outputBuffer = await this.convertPowerPointFallback(input, originalName);
      } else if (type === 'excel') {
        outputBuffer = await this.convertExcelFallback(input, originalName);
      } else if (type === 'word') {
        outputBuffer = await this.convertDocxFallback(input, originalName);
      }
    }

    if (!outputBuffer || outputBuffer.length === 0) {
      const notFoundErr = new Error('No PDF was produced by the conversion engine.');
      notFoundErr.code = 'OUTPUT_NOT_FOUND';
      notFoundErr.status = 502;
      throw notFoundErr;
    }

    // Validate generated PDF output
    if (outputBuffer.length < 5 || outputBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      const invalidPdfErr = new Error('The conversion produced an invalid PDF.');
      invalidPdfErr.code = 'INVALID_PDF_OUTPUT';
      invalidPdfErr.status = 502;
      throw invalidPdfErr;
    }

    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(outputBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      if (pageCount < 1) {
        throw new Error('PDF has 0 pages');
      }
    } catch (parseErr) {
      const invalidPdfErr = new Error('The conversion produced an unparseable or corrupted PDF.');
      invalidPdfErr.code = 'INVALID_PDF_OUTPUT';
      invalidPdfErr.status = 502;
      throw invalidPdfErr;
    }

    const filename = `${safeBaseName}.pdf`;

    return {
      buffer: outputBuffer,
      sizeBytes: outputBuffer.length,
      pageCount,
      filename,
      mimeType: 'application/pdf',
      isZip: false,
    };
  }
}

module.exports = OfficeAdapter;
