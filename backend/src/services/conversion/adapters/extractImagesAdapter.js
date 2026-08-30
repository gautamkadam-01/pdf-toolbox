/**
 * Extract Images Engine Adapter
 * Extracts embedded raster images and graphics from PDF documents using Poppler pdfimages CLI or PDF.js AST scanner.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const EngineAdapter = require('../engineAdapter');
const { validatePdfBuffer } = require('../../../utils/fileValidation');
const logger = require('../../../utils/logger');

let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

class ExtractImagesAdapter extends EngineAdapter {
  constructor() {
    super('extract-images');
  }

  /**
   * Checks if pdfimages CLI is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return new Promise((resolve) => {
      execFile('pdfimages', ['-v'], (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Extracts raw JPEG streams by scanning DCTDecode marker patterns in PDF binary
   */
  extractJpegStreamsFast(pdfBuffer) {
    const images = [];
    const soi = Buffer.from([0xff, 0xd8, 0xff]);
    const eoi = Buffer.from([0xff, 0xd9]);

    let offset = 0;
    while (offset < pdfBuffer.length - 4) {
      const start = pdfBuffer.indexOf(soi, offset);
      if (start === -1) break;

      const end = pdfBuffer.indexOf(eoi, start + 3);
      if (end === -1) break;

      const fullEnd = end + 2;
      const imgLen = fullEnd - start;

      if (imgLen > 256) {
        const jpgBuf = pdfBuffer.subarray(start, fullEnd);
        images.push({
          buffer: Buffer.from(jpgBuf),
          ext: 'jpg',
          mimeType: 'image/jpeg',
          index: images.length + 1,
        });
      }
      offset = fullEnd;
    }
    return images;
  }

  /**
   * PDF.js Operator List Image Extractor
   */
  async extractImagesViaPdfjs(pdfBuffer) {
    const pdfjs = await getPdfjs();
    const uint8 = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument({ data: uint8, disableFontFace: true });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const extractedImages = [];
    let imageCounter = 1;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const ops = await page.getOperatorList();
      const fnArray = ops.fnArray;
      const argsArray = ops.argsArray;

      for (let i = 0; i < fnArray.length; i++) {
        const fn = fnArray[i];
        const args = argsArray[i];

        if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
          const objId = args[0];
          try {
            const imgObj = await new Promise((resolve) => {
              if (page.objs && page.objs.has(objId)) {
                return resolve(page.objs.get(objId));
              }
              if (page.commonObjs && page.commonObjs.has(objId)) {
                return resolve(page.commonObjs.get(objId));
              }
              if (page.objs && page.objs.get) {
                page.objs.get(objId, resolve);
              } else {
                resolve(null);
              }
            });

            if (imgObj && imgObj.data && imgObj.width && imgObj.height) {
              const width = imgObj.width;
              const height = imgObj.height;
              const rawData = imgObj.data;

              const { createCanvas } = require('@napi-rs/canvas');
              const canvas = createCanvas(width, height);
              const ctx = canvas.getContext('2d');
              const imgData = ctx.createImageData(width, height);

              if (rawData.length === width * height * 4) {
                imgData.data.set(rawData);
              } else if (rawData.length === width * height * 3) {
                let srcIdx = 0;
                let destIdx = 0;
                while (srcIdx < rawData.length) {
                  imgData.data[destIdx] = rawData[srcIdx];
                  imgData.data[destIdx + 1] = rawData[srcIdx + 1];
                  imgData.data[destIdx + 2] = rawData[srcIdx + 2];
                  imgData.data[destIdx + 3] = 255;
                  srcIdx += 3;
                  destIdx += 4;
                }
              } else if (rawData.length === width * height) {
                let srcIdx = 0;
                let destIdx = 0;
                while (srcIdx < rawData.length) {
                  const val = rawData[srcIdx];
                  imgData.data[destIdx] = val;
                  imgData.data[destIdx + 1] = val;
                  imgData.data[destIdx + 2] = val;
                  imgData.data[destIdx + 3] = 255;
                  srcIdx += 1;
                  destIdx += 4;
                }
              }

              ctx.putImageData(imgData, 0, 0);
              const pngBuffer = canvas.toBuffer('image/png');
              extractedImages.push({
                buffer: pngBuffer,
                ext: 'png',
                mimeType: 'image/png',
                page: pageNum,
                index: imageCounter++,
              });
            }
          } catch (_) {}
        }
      }
    }

    return extractedImages;
  }

  /**
   * Main convert lifecycle implementation
   */
  async convert(context) {
    const { input, originalName = 'document.pdf', workspaceDir } = context;

    const validation = validatePdfBuffer(input, originalName);
    if (!validation.isValid) {
      const err = new Error(validation.error.message);
      err.code = validation.error.code;
      err.status = 422;
      throw err;
    }

    let extractedImages = [];

    const hasCli = await this.isAvailable();
    if (hasCli) {
      const inputPdfDisk = path.join(workspaceDir, 'extract_input.pdf');
      const imgPrefix = path.join(workspaceDir, 'img');
      await fs.promises.writeFile(inputPdfDisk, input);

      try {
        await new Promise((resolve, reject) => {
          execFile('pdfimages', ['-png', inputPdfDisk, imgPrefix], { timeout: 45000 }, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        const files = await fs.promises.readdir(workspaceDir);
        const imgFiles = files
          .filter((f) => /^img-\d+\.(png|jpg|jpeg|ppm|pbm)$/i.test(f))
          .sort();

        for (let i = 0; i < imgFiles.length; i++) {
          const f = imgFiles[i];
          const imgBuf = await fs.promises.readFile(path.join(workspaceDir, f));
          const ext = path.extname(f).replace('.', '').toLowerCase();
          extractedImages.push({
            buffer: imgBuf,
            ext,
            mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
            index: i + 1,
          });
        }
      } catch (cliErr) {
        logger.warn(`pdfimages CLI extraction error: ${cliErr.message}, running native AST scanner`);
      }
    }

    if (extractedImages.length === 0) {
      const directJpegs = this.extractJpegStreamsFast(input);
      if (directJpegs.length > 0) {
        extractedImages = directJpegs;
      }
    }

    if (extractedImages.length === 0) {
      try {
        const jsImages = await this.extractImagesViaPdfjs(input);
        if (jsImages.length > 0) {
          extractedImages = jsImages;
        }
      } catch (_) {}
    }

    if (extractedImages.length === 0) {
      const notFoundErr = new Error('No embedded images were found in this PDF.');
      notFoundErr.code = 'NO_EMBEDDED_IMAGES';
      notFoundErr.status = 404;
      throw notFoundErr;
    }

    const baseName = path.basename(originalName, path.extname(originalName)) || 'document';

    if (extractedImages.length === 1) {
      const single = extractedImages[0];
      const filename = `${baseName}_image_1.${single.ext}`;
      return {
        buffer: single.buffer,
        sizeBytes: single.buffer.length,
        imageCount: 1,
        filename,
        mimeType: single.mimeType,
        isZip: false,
      };
    }

    const zip = new JSZip();
    for (const img of extractedImages) {
      const padNum = String(img.index).padStart(3, '0');
      zip.file(`${baseName}_image_${padNum}.${img.ext}`, img.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const filename = `${baseName}_images.zip`;
    return {
      buffer: zipBuffer,
      sizeBytes: zipBuffer.length,
      imageCount: extractedImages.length,
      filename,
      mimeType: 'application/zip',
      isZip: true,
    };
  }
}

module.exports = ExtractImagesAdapter;
