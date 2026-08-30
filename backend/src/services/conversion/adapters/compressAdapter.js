/**
 * Compress PDF Engine Adapter
 * Optimizes PDF size via Ghostscript CLI with graceful fallback to pdf-lib object stream re-serializer.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const EngineAdapter = require('../engineAdapter');
const { ghostscriptPath } = require('../../../config/env');
const { validatePdfBuffer } = require('../../../utils/fileValidation');
const logger = require('../../../utils/logger');

const GS_PRESETS = {
  high: '/screen', // ~72 dpi
  medium: '/ebook', // ~150 dpi
  low: '/printer', // ~300 dpi
};

class CompressAdapter extends EngineAdapter {
  constructor() {
    super('compress-pdf');
  }

  /**
   * Checks if Ghostscript binary is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const binaries = [ghostscriptPath, 'gs', 'gswin64c', 'gswin32c'].filter(Boolean);
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
   * Runs Ghostscript CLI compression
   */
  async runGhostscriptCompress(inputPath, outputPath, level = 'medium') {
    const gsSetting = GS_PRESETS[level] || GS_PRESETS.medium;
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${gsSetting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    return new Promise((resolve, reject) => {
      execFile(ghostscriptPath, args, { timeout: 45000 }, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`Ghostscript compression failed: ${error.message} (stderr: ${stderr})`);
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Fallback compression using pdf-lib
   */
  async runPdfLibCompress(inputBuffer) {
    const pdfDoc = await PDFDocument.load(inputBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    return Buffer.from(compressedBytes);
  }

  /**
   * Main convert lifecycle implementation
   */
  async convert(context) {
    const { input, originalName = 'document.pdf', workspaceDir, options = {} } = context;
    const level = options.level || 'medium';

    const validation = validatePdfBuffer(input, originalName);
    if (!validation.isValid) {
      const err = new Error(validation.error.message);
      err.code = validation.error.code;
      err.status = 422;
      throw err;
    }

    const originalSize = input.length;
    let finalBuffer = null;

    const tempIn = path.join(workspaceDir, 'comp_in.pdf');
    const tempOut = path.join(workspaceDir, 'comp_out.pdf');

    const hasGs = await this.isAvailable();
    if (hasGs) {
      await fs.promises.writeFile(tempIn, input);
      try {
        await this.runGhostscriptCompress(tempIn, tempOut, level);
        if (fs.existsSync(tempOut)) {
          finalBuffer = await fs.promises.readFile(tempOut);
        }
      } catch (gsErr) {
        logger.warn(`Ghostscript execution error, using native fallback: ${gsErr.message}`);
      }
    }

    if (!finalBuffer) {
      finalBuffer = await this.runPdfLibCompress(input);
    }

    const compressedSize = finalBuffer.length;
    const isSmaller = compressedSize < originalSize;
    const savedBytes = isSmaller ? originalSize - compressedSize : 0;
    const savedPercentage = originalSize > 0 ? parseFloat(((savedBytes / originalSize) * 100).toFixed(2)) : 0;

    const baseName = path.basename(originalName, path.extname(originalName)) || 'document';
    const filename = `${baseName}_compressed.pdf`;

    return {
      buffer: finalBuffer,
      sizeBytes: finalBuffer.length,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercentage,
      isSmaller,
      filename,
      mimeType: 'application/pdf',
      isZip: false,
    };
  }
}

module.exports = CompressAdapter;
