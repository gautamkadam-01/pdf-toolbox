/**
 * HTML to PDF Engine Adapter
 * Renders HTML markup/files to paginated, print-quality PDF using headless Chromium (Puppeteer).
 */

const crypto = require('crypto');
const path = require('path');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const EngineAdapter = require('../engineAdapter');
const { browserExecutablePath } = require('../../../config/env');
const { validateHtmlBuffer } = require('../../../utils/fileValidation');
const logger = require('../../../utils/logger');

class HtmlAdapter extends EngineAdapter {
  constructor() {
    super('html-to-pdf');
    this._testedAvailability = null;
  }

  /**
   * Checks if Puppeteer / Chromium browser is accessible and can launch
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const browser = await this.launchBrowser({ timeout: 10000 });
      await browser.close();
      this._testedAvailability = true;
      return true;
    } catch (err) {
      logger.warn(`HTML rendering engine availability check failed: ${err.message}`);
      this._testedAvailability = false;
      return false;
    }
  }

  /**
   * Launches Puppeteer browser with hardened sandbox arguments
   */
  async launchBrowser(customOptions = {}) {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-zygote',
        '--disable-extensions',
      ],
      timeout: 30000,
      ...customOptions,
    };

    if (browserExecutablePath && browserExecutablePath !== 'chromium') {
      launchOptions.executablePath = browserExecutablePath;
    }

    try {
      return await puppeteer.launch(launchOptions);
    } catch (err) {
      logger.error(`Failed to launch Chromium browser engine: ${err.message}`);
      const unavailableErr = new Error('The HTML rendering engine is unavailable.');
      unavailableErr.code = 'HTML_ENGINE_UNAVAILABLE';
      unavailableErr.status = 503;
      unavailableErr.details = err.message;
      throw unavailableErr;
    }
  }

  /**
   * Sanitizes HTML content against file:// local inclusions and local filesystem disclosure
   */
  sanitizeHtmlContent(html) {
    if (typeof html !== 'string') return '';
    return html.replace(/file:\/\//gi, 'blocked://');
  }

  /**
   * Prepares and normalizes the HTML document for print rendering:
   * 1. Normalizes BOM
   * 2. Preserves user HTML
   * 3. Adds UTF-8 charset if missing
   * 4. Adds controlled print styles (sets @page margin to 0 to avoid double-margin, letting Puppeteer be authoritative)
   * 5. Preserves existing head/body
   * 6. Wraps fragments safely when necessary
   */
  prepareHtmlDocument(rawHtml, pageSize = 'A4', orientation = 'portrait') {
    let html = typeof rawHtml === 'string' ? rawHtml : String(rawHtml || '');

    // 1. Normalize UTF-8 BOM if present
    if (html.charCodeAt(0) === 0xFEFF) {
      html = html.slice(1);
    }

    const standardSize = ['A4', 'Letter', 'Legal', 'A3', 'A5'].includes(pageSize) ? pageSize : 'A4';
    const orient = orientation === 'landscape' ? 'landscape' : 'portrait';

    // Controlled print styles:
    // Notice @page margin is set to 0 !important so that Puppeteer page.pdf({ margin: ... })
    // serves as the single authoritative margin controller, completely avoiding double-margins.
    const printStyle = `
<style id="pdf-toolbox-print-engine-style">
@page {
  size: ${standardSize} ${orient} !important;
  margin: 0 !important;
}
@media print {
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>`;

    const hasDoctype = /<!doctype\s+html/i.test(html);
    const hasHtmlTag = /<html[\s>]/i.test(html);
    const hasHeadTag = /<head[\s>]/i.test(html);
    const hasCharset = /<meta[^>]+charset/i.test(html);

    const charsetTag = hasCharset ? '' : '<meta charset="UTF-8">\n';

    if (hasHeadTag && html.includes('</head>')) {
      // Inject charset (if missing) and print styles inside existing <head>
      html = html.replace('</head>', `${charsetTag}${printStyle}\n</head>`);
    } else if (hasHtmlTag && html.includes('<body')) {
      // Has <html> and <body>, insert <head> before <body>
      html = html.replace(/<body/i, `<head>\n${charsetTag}${printStyle}\n</head>\n<body`);
    } else if (hasHtmlTag) {
      // Has <html> but no <head> or <body>
      html = html.replace(/<html[^>]*>/i, `$&<head>\n${charsetTag}${printStyle}\n</head>`);
    } else {
      // HTML fragment: wrap completely and safely
      const doctypePrefix = hasDoctype ? '' : '<!DOCTYPE html>\n';
      html = `${doctypePrefix}<html>\n<head>\n${charsetTag}${printStyle}\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }

    return html;
  }

  /**
   * Main convert lifecycle implementation using Chromium
   */
  async convert(context) {
    const { input, originalName = 'document.html', options = {} } = context;

    const validation = validateHtmlBuffer(input, originalName);
    if (!validation.isValid) {
      const err = new Error(validation.error.message);
      err.code = validation.error.code;
      err.status = 422;
      throw err;
    }

    const rawHtml = validation.cleanString || (Buffer.isBuffer(input) ? input.toString('utf8') : String(input));
    const sanitized = this.sanitizeHtmlContent(rawHtml);

    const pageSize = options.pageSize || 'A4';
    const orientation = options.orientation || 'portrait';
    const marginMm = typeof options.margin === 'number' && !isNaN(options.margin) ? options.margin : 10;
    const isLandscape = orientation === 'landscape';

    const preparedHtml = this.prepareHtmlDocument(sanitized, pageSize, orientation);

    // Safe diagnostic log in non-production
    if (process.env.NODE_ENV !== 'production') {
      const hash = crypto.createHash('sha256').update(rawHtml).digest('hex').slice(0, 12);
      logger.info(`[HTML->PDF Engine] Converting document: length=${rawHtml.length} chars, hash=${hash}, size=${pageSize}, orient=${orientation}, margin=${marginMm}mm`);
    }

    let browser = null;
    let page = null;
    let pdfBuffer = null;

    try {
      browser = await this.launchBrowser();
      page = await browser.newPage();

      // Security: Intercept requests to abort any attempt to access file:// protocol
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url().toLowerCase();
        if (url.startsWith('file:') || url.startsWith('gopher:') || url.startsWith('ftp:')) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Emulate print media type
      await page.emulateMediaType('print');

      // Set HTML content with readiness wait
      await page.setContent(preparedHtml, {
        waitUntil: 'networkidle0',
        timeout: 25000,
      }).catch((e) => {
        // Fallback gracefully if networkidle0 times out on continuous remote resources
        logger.warn(`Network idle wait completed with notice: ${e.message}, proceeding to render`);
      });

      // Wait for fonts to finish loading if document.fonts is supported
      try {
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await Promise.race([
              document.fonts.ready,
              new Promise((res) => setTimeout(res, 2000)),
            ]);
          }
        });
      } catch (_) {}

      // Brief layout stabilization
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Generate PDF with exact page options and full background color/image rendering
      const standardFormat = ['A4', 'Letter', 'Legal', 'A3', 'A5'].includes(pageSize) ? pageSize : 'A4';
      const pdfUint8Array = await page.pdf({
        format: standardFormat,
        landscape: isLandscape,
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: `${marginMm}mm`,
          right: `${marginMm}mm`,
          bottom: `${marginMm}mm`,
          left: `${marginMm}mm`,
        },
        timeout: 30000,
      });

      pdfBuffer = Buffer.from(pdfUint8Array);
    } catch (err) {
      if (err.code === 'HTML_ENGINE_UNAVAILABLE') {
        throw err;
      }
      if (err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('timed out')) {
        const timeoutErr = new Error('The HTML rendering operation timed out.');
        timeoutErr.code = 'HTML_RENDER_TIMEOUT';
        timeoutErr.status = 504;
        throw timeoutErr;
      }

      logger.error(`Chromium HTML to PDF render error: ${err.message}`);
      const renderErr = new Error('Failed to render HTML document to PDF.');
      renderErr.code = 'HTML_RENDER_FAILED';
      renderErr.status = 502;
      renderErr.details = err.message;
      throw renderErr;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (_) {}
      }
      if (browser) {
        try {
          await browser.close();
        } catch (_) {}
      }
    }

    // Validate generated PDF output
    if (!pdfBuffer || pdfBuffer.length === 0) {
      const notFoundErr = new Error('No PDF was produced by the HTML rendering engine.');
      notFoundErr.code = 'OUTPUT_NOT_FOUND';
      notFoundErr.status = 502;
      throw notFoundErr;
    }

    if (pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      const invalidPdfErr = new Error('The conversion produced an invalid PDF.');
      invalidPdfErr.code = 'INVALID_PDF_OUTPUT';
      invalidPdfErr.status = 502;
      throw invalidPdfErr;
    }

    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
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

    const safeBaseName = path.basename(originalName, path.extname(originalName)) || 'webpage';
    const filename = `${safeBaseName}.pdf`;

    return {
      buffer: pdfBuffer,
      sizeBytes: pdfBuffer.length,
      pageCount,
      filename,
      mimeType: 'application/pdf',
      isZip: false,
    };
  }
}

module.exports = HtmlAdapter;

