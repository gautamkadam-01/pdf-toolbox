/**
 * Centralized Conversion & Processing Service
 * Orchestrates file conversion workflows across all supported engines and adapters.
 * Manages dedicated temporary workspaces, input/output validation, and guaranteed resource cleanup.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { tempDir } = require('../../config/env');
const { validatePdfOutput } = require('../../utils/outputValidation');
const logger = require('../../utils/logger');

// Engine Adapters
const OfficeAdapter = require('./adapters/officeAdapter');
const CompressAdapter = require('./adapters/compressAdapter');
const HtmlAdapter = require('./adapters/htmlAdapter');
const ExtractImagesAdapter = require('./adapters/extractImagesAdapter');

class ConversionService {
  constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  /**
   * Registers default engine adapters
   */
  registerDefaultAdapters() {
    this.registerAdapter('office', new OfficeAdapter());
    this.registerAdapter('compress', new CompressAdapter());
    this.registerAdapter('html', new HtmlAdapter());
    this.registerAdapter('extract-images', new ExtractImagesAdapter());
  }

  /**
   * Registers a conversion engine adapter
   * @param {string} key
   * @param {import('./engineAdapter')} adapter
   */
  registerAdapter(key, adapter) {
    this.adapters.set(key.toLowerCase(), adapter);
  }

  /**
   * Retrieves an adapter by key
   * @param {string} key
   * @returns {import('./engineAdapter')}
   */
  getAdapter(key) {
    const adapter = this.adapters.get(key.toLowerCase());
    if (!adapter) {
      throw new Error(`Unsupported conversion operation: '${key}'.`);
    }
    return adapter;
  }

  /**
   * Creates a dedicated temporary workspace directory
   * @param {string} prefix
   * @returns {Promise<string>}
   */
  async createWorkspace(prefix = 'pdf-toolbox-work-') {
    const baseDir = tempDir && fs.existsSync(tempDir) ? tempDir : os.tmpdir();
    const fullPrefix = path.join(baseDir, prefix);
    return fs.promises.mkdtemp(fullPrefix);
  }

  /**
   * Cleans up a workspace directory recursively
   * @param {string} workspaceDir
   */
  async cleanupWorkspace(workspaceDir) {
    if (!workspaceDir || !fs.existsSync(workspaceDir)) return;
    try {
      await fs.promises.rm(workspaceDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn(`Failed to clean up workspace ${workspaceDir}: ${err.message}`);
    }
  }

  /**
   * Executes a conversion operation inside an isolated, auto-cleaned workspace
   * 
   * @param {string} adapterKey - 'office' | 'compress' | 'html' | 'ocr' | 'extract-images'
   * @param {Object} params
   * @param {Buffer|string} params.input - Raw file buffer or string payload
   * @param {string} params.originalName - Source filename
   * @param {Object} [params.options] - Adapter-specific conversion options
   * @returns {Promise<Object>} Output metadata including raw binary buffer
   */
  async execute(adapterKey, params) {
    const adapter = this.getAdapter(adapterKey);
    const workspaceDir = await this.createWorkspace(`pdf-${adapterKey}-`);

    try {
      const context = {
        input: params.input,
        originalName: params.originalName || 'document',
        workspaceDir,
        options: params.options || {},
      };

      const result = await adapter.convert(context);

      // Validate output buffer integrity
      if (!result.buffer || !Buffer.isBuffer(result.buffer) || result.buffer.length === 0) {
        throw new Error(`Engine '${adapter.name}' produced an empty or invalid binary buffer.`);
      }

      // If output is a PDF, perform strict PDF binary validation
      if (result.mimeType === 'application/pdf' || (result.filename && result.filename.toLowerCase().endsWith('.pdf'))) {
        const validated = await validatePdfOutput(result.buffer, result.filename);
        result.pageCount = validated.pageCount;
        result.sizeBytes = validated.sizeBytes;
      }

      // Attach workspace cleanup helper to result for deferred response cleanup if needed
      result.cleanup = async () => {
        await this.cleanupWorkspace(workspaceDir);
      };

      return result;
    } catch (err) {
      // Guaranteed cleanup on error
      await this.cleanupWorkspace(workspaceDir);
      throw err;
    }
  }

  /**
   * Diagnostic capability check across all registered adapters
   * @returns {Promise<Object>}
   */
  async getEngineStatuses() {
    const statuses = {};
    for (const [key, adapter] of this.adapters.entries()) {
      let isCli = false;
      try {
        if (typeof adapter.isAvailable === 'function') {
          isCli = await adapter.isAvailable();
        }
      } catch (_) {}

      let engineName = 'built-in / pure-js';
      let isAvailable = true;

      if (key === 'office') {
        engineName = isCli ? 'LibreOffice CLI Engine' : 'Pure-JS (mammoth / xlsx / JSZip / pdf-lib)';
        isAvailable = true;
      } else if (key === 'compress') {
        engineName = isCli ? 'Ghostscript CLI Engine' : 'Pure-JS (pdf-lib)';
        isAvailable = true;
      } else if (key === 'html') {
        engineName = isCli ? 'Puppeteer Chromium Engine' : 'HTML Engine Unavailable';
        isAvailable = isCli;
      } else if (key === 'extract-images') {
        engineName = 'PDF.js Object Parser (pdfjs-dist)';
        isAvailable = true;
      }

      statuses[key] = {
        available: isAvailable,
        cliAvailable: isCli,
        engine: engineName,
        ...(key === 'html' && !isAvailable ? { code: 'HTML_ENGINE_UNAVAILABLE' } : {}),
      };
    }
    return statuses;
  }

  /**
   * Specialized Convenience: Convert Office Document (.docx, .pptx, .xlsx)
   */
  async convertOffice(fileBuffer, originalName = 'document.docx', type = 'word') {
    const docType = typeof type === 'string' ? type : (type && type.type ? type.type : 'word');
    return this.execute('office', {
      input: fileBuffer,
      originalName: typeof originalName === 'string' ? originalName : 'document.docx',
      options: { type: docType },
    });
  }

  /**
   * Specialized Convenience: Compress PDF
   */
  async compressPdf(fileBuffer, param2 = 'medium', param3 = 'document.pdf') {
    let level = 'medium';
    let originalName = 'document.pdf';

    if (['low', 'medium', 'high'].includes(param2)) {
      level = param2;
      originalName = typeof param3 === 'string' ? param3 : 'document.pdf';
    } else if (typeof param2 === 'string') {
      originalName = param2;
      level = typeof param3 === 'string' && ['low', 'medium', 'high'].includes(param3) ? param3 : 'medium';
    }

    return this.execute('compress', {
      input: fileBuffer,
      originalName,
      options: { level },
    });
  }

  /**
   * Specialized Convenience: Convert HTML to PDF
   */
  async convertHtml(htmlInput, param2 = {}, param3 = 'document.html') {
    let options = {};
    let originalName = 'document.html';

    if (typeof param2 === 'string') {
      originalName = param2;
      options = typeof param3 === 'object' && param3 !== null ? param3 : {};
    } else if (typeof param2 === 'object' && param2 !== null) {
      options = param2;
      originalName = typeof param3 === 'string' ? param3 : 'document.html';
    }

    return this.execute('html', {
      input: htmlInput,
      originalName,
      options,
    });
  }

  /**
   * Alias for convertHtml
   */
  async htmlToPdf(htmlInput, param2, param3) {
    return this.convertHtml(htmlInput, param2, param3);
  }

  /**
   * Specialized Convenience: Extract Images from PDF
   */
  async extractImages(pdfBuffer, originalName = 'document.pdf') {
    return this.execute('extract-images', {
      input: pdfBuffer,
      originalName: typeof originalName === 'string' ? originalName : 'document.pdf',
    });
  }

  /**
   * Alias for extractImages
   */
  async extractImagesFromPdf(pdfBuffer, originalName = 'document.pdf') {
    return this.extractImages(pdfBuffer, originalName);
  }
}

// Export singleton instance
module.exports = new ConversionService();
