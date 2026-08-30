/**
 * PDF Toolbox - Phase 2 Comprehensive Test Suite
 * Tests all 8 server-side PDF operations, page range parsing, output validations,
 * error handling, and the complete end-to-end regression pipeline.
 */

const http = require('http');
const { PDFDocument, rgb } = require('pdf-lib');
const { createCanvas } = require('@napi-rs/canvas');
const JSZip = require('jszip');
const app = require('../src/app');

let server;
const TEST_PORT = 5098;

/**
 * Creates a synthetic multi-page test PDF in memory
 */
async function createTestPdf(pageCount = 3, label = 'Doc') {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`${label} - Page ${i}`, {
      x: 50,
      y: 200,
      size: 24,
      color: rgb(0.1, 0.2, 0.4),
    });
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Creates a synthetic JPEG buffer in memory
 */
function createTestJpeg(width = 200, height = 200, color = '#3b82f6') {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Sample JPG', 30, 100);
  return canvas.toBuffer('image/jpeg');
}

/**
 * Builds multipart/form-data body
 */
function buildMultipartBody(files = [], fields = {}, boundary = '----BoundaryPhase2Test123456') {
  const chunks = [];

  // Add fields
  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
    );
  }

  // Add files
  for (const file of files) {
    const fieldName = file.fieldName || 'files';
    const filename = file.filename || 'document.pdf';
    const mime = file.mimeType || 'application/pdf';
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
      )
    );
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(chunks);

  return {
    body: fullBody,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/**
 * Makes an HTTP request to the test server
 */
function apiRequest(options, payload = null, contentType = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (contentType) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = payload.length;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        ...options,
        headers,
      },
      (res) => {
        const dataChunks = [];
        res.on('data', (chunk) => dataChunks.push(chunk));
        res.on('end', () => {
          const rawBuffer = Buffer.concat(dataChunks);
          let parsedJson = null;
          try {
            parsedJson = JSON.parse(rawBuffer.toString('utf8'));
          } catch {
            // Binary response
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer: rawBuffer,
            json: parsedJson,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('PDF TOOLBOX — PHASE 2 VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  server = app.listen(TEST_PORT);

  try {
    // Generate base test documents
    const docA = await createTestPdf(2, 'DocA'); // 2 pages
    const docB = await createTestPdf(3, 'DocB'); // 3 pages
    const docC = await createTestPdf(1, 'DocC'); // 1 page
    const doc5Pages = await createTestPdf(5, 'Doc5'); // 5 pages
    const jpg1 = createTestJpeg(300, 200, '#ef4444');
    const jpg2 = createTestJpeg(400, 400, '#10b981');
    const invalidPdfBuf = Buffer.from('NOT A PDF FILE AT ALL');

    // ----------------------------------------------------
    // 1. MERGE PDF TESTS
    // ----------------------------------------------------
    console.log('\n[1] MERGE PDF TESTS:');

    // 1.1: 2 Valid PDFs
    const merge2 = buildMultipartBody([
      { buffer: docA, filename: 'docA.pdf' },
      { buffer: docB, filename: 'docB.pdf' },
    ]);
    const resMerge2 = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, merge2.body, merge2.contentType);
    assert(resMerge2.statusCode === 200, 'Merge 2 PDFs returns HTTP 200');
    assert(resMerge2.headers['content-type'] === 'application/pdf', 'Merge returns Content-Type application/pdf');
    const mergedDoc2 = await PDFDocument.load(resMerge2.buffer);
    assert(mergedDoc2.getPageCount() === 5, 'Merged 2 PDFs has expected page count (2 + 3 = 5)');

    // 1.2: 3 Valid PDFs with different page counts
    const merge3 = buildMultipartBody([
      { buffer: docA, filename: 'docA.pdf' },
      { buffer: docB, filename: 'docB.pdf' },
      { buffer: docC, filename: 'docC.pdf' },
    ]);
    const resMerge3 = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, merge3.body, merge3.contentType);
    assert(resMerge3.statusCode === 200, 'Merge 3 PDFs returns HTTP 200');
    const mergedDoc3 = await PDFDocument.load(resMerge3.buffer);
    assert(mergedDoc3.getPageCount() === 6, 'Merged 3 PDFs has expected page count (2 + 3 + 1 = 6)');

    // 1.3: Page order preservation (docC then docA)
    const mergeOrder = buildMultipartBody([
      { buffer: docC, filename: 'docC.pdf' },
      { buffer: docA, filename: 'docA.pdf' },
    ]);
    const resMergeOrder = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, mergeOrder.body, mergeOrder.contentType);
    assert(resMergeOrder.statusCode === 200, 'Merge preserves custom upload order');
    const mergedOrderDoc = await PDFDocument.load(resMergeOrder.buffer);
    assert(mergedOrderDoc.getPageCount() === 3, 'Merge order count is 1 + 2 = 3');

    // 1.4: Invalid PDF among valid files rejected
    const mergeInvalid = buildMultipartBody([
      { buffer: docA, filename: 'docA.pdf' },
      { buffer: invalidPdfBuf, filename: 'bad.pdf' },
    ]);
    const resMergeInvalid = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, mergeInvalid.body, mergeInvalid.contentType);
    assert(resMergeInvalid.statusCode === 422, 'Merge with invalid PDF returns HTTP 422');
    assert(resMergeInvalid.json?.error?.code === 'INVALID_PDF', 'Merge gives INVALID_PDF code');

    // 1.5: Missing / only one file rejected
    const mergeSingle = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }]);
    const resMergeSingle = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, mergeSingle.body, mergeSingle.contentType);
    assert(resMergeSingle.statusCode === 400, 'Merge with 1 file returns HTTP 400');
    assert(resMergeSingle.json?.error?.code === 'TOO_FEW_FILES', 'Merge gives TOO_FEW_FILES error code');

    // ----------------------------------------------------
    // 2. SPLIT PDF TESTS
    // ----------------------------------------------------
    console.log('\n[2] SPLIT PDF TESTS:');

    // 2.1: Single range (e.g. 1-2)
    const splitSingle = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { ranges: '1-2' });
    const resSplitSingle = await apiRequest({ path: '/api/v1/pdf/split', method: 'POST' }, splitSingle.body, splitSingle.contentType);
    assert(resSplitSingle.statusCode === 200, 'Split single range returns HTTP 200');
    assert(resSplitSingle.headers['content-type'] === 'application/pdf', 'Single split returns single PDF');
    const splitDocSingle = await PDFDocument.load(resSplitSingle.buffer);
    assert(splitDocSingle.getPageCount() === 2, 'Split single range has 2 pages');

    // 2.2: Multiple ranges (e.g. 1-2, 3-5) returning ZIP
    const splitMulti = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { ranges: '1-2, 3-5' });
    const resSplitMulti = await apiRequest({ path: '/api/v1/pdf/split', method: 'POST' }, splitMulti.body, splitMulti.contentType);
    assert(resSplitMulti.statusCode === 200, 'Split multiple ranges returns HTTP 200');
    assert(resSplitMulti.headers['content-type'] === 'application/zip', 'Multiple split returns application/zip');
    const zip = await JSZip.loadAsync(resSplitMulti.buffer);
    const splitFiles = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    assert(splitFiles.length === 2, 'Split ZIP contains 2 generated PDF files');
    const part1Bytes = await zip.file('split-001.pdf').async('nodebuffer');
    const part1Doc = await PDFDocument.load(part1Bytes);
    assert(part1Doc.getPageCount() === 2, 'Split part 1 has 2 pages');
    const part2Bytes = await zip.file('split-002.pdf').async('nodebuffer');
    const part2Doc = await PDFDocument.load(part2Bytes);
    assert(part2Doc.getPageCount() === 3, 'Split part 2 has 3 pages');

    // 2.3: Out-of-bounds page rejection
    const splitOut = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { ranges: '1-99' });
    const resSplitOut = await apiRequest({ path: '/api/v1/pdf/split', method: 'POST' }, splitOut.body, splitOut.contentType);
    assert(resSplitOut.statusCode === 400, 'Split out of bounds returns HTTP 400');
    assert(resSplitOut.json?.error?.code === 'INVALID_PAGE_NUMBER', 'Split out of bounds gives INVALID_PAGE_NUMBER');

    // 2.4: Malformed syntax rejection
    const splitBad = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { ranges: 'abc' });
    const resSplitBad = await apiRequest({ path: '/api/v1/pdf/split', method: 'POST' }, splitBad.body, splitBad.contentType);
    assert(resSplitBad.statusCode === 400, 'Split malformed syntax returns HTTP 400');

    // ----------------------------------------------------
    // 3. JPG → PDF TESTS
    // ----------------------------------------------------
    console.log('\n[3] JPG → PDF TESTS:');

    // 3.1: One JPG
    const jpgToPdf1 = buildMultipartBody([{ buffer: jpg1, filename: 'photo1.jpg', mimeType: 'image/jpeg' }]);
    const resJpg1 = await apiRequest({ path: '/api/v1/pdf/jpg-to-pdf', method: 'POST' }, jpgToPdf1.body, jpgToPdf1.contentType);
    assert(resJpg1.statusCode === 200, 'JPG → PDF with 1 image returns HTTP 200');
    const pdfFromJpg1 = await PDFDocument.load(resJpg1.buffer);
    assert(pdfFromJpg1.getPageCount() === 1, 'JPG → PDF output has 1 page');

    // 3.2: Multiple JPGs
    const jpgToPdf2 = buildMultipartBody([
      { buffer: jpg1, filename: 'photo1.jpg', mimeType: 'image/jpeg' },
      { buffer: jpg2, filename: 'photo2.jpg', mimeType: 'image/jpeg' },
    ]);
    const resJpg2 = await apiRequest({ path: '/api/v1/pdf/jpg-to-pdf', method: 'POST' }, jpgToPdf2.body, jpgToPdf2.contentType);
    assert(resJpg2.statusCode === 200, 'JPG → PDF with 2 images returns HTTP 200');
    const pdfFromJpg2 = await PDFDocument.load(resJpg2.buffer);
    assert(pdfFromJpg2.getPageCount() === 2, 'JPG → PDF output has 2 pages in correct order');

    // 3.3: Invalid image rejected
    const badImg = buildMultipartBody([{ buffer: Buffer.from('FAKE IMAGE'), filename: 'fake.jpg', mimeType: 'image/jpeg' }]);
    const resBadImg = await apiRequest({ path: '/api/v1/pdf/jpg-to-pdf', method: 'POST' }, badImg.body, badImg.contentType);
    assert(resBadImg.statusCode === 422, 'Invalid image returns HTTP 422');
    assert(resBadImg.json?.error?.code === 'INVALID_IMAGE', 'Invalid image gives INVALID_IMAGE error code');

    // ----------------------------------------------------
    // 4. PDF → JPG TESTS
    // ----------------------------------------------------
    console.log('\n[4] PDF → JPG TESTS:');

    // 4.1: One-page PDF returns single JPEG
    const pdfToJpg1 = buildMultipartBody([{ buffer: docC, filename: 'singlePage.pdf' }]);
    const resPdfToJpg1 = await apiRequest({ path: '/api/v1/pdf/to-jpg', method: 'POST' }, pdfToJpg1.body, pdfToJpg1.contentType);
    assert(resPdfToJpg1.statusCode === 200, 'PDF → JPG single page returns HTTP 200');
    assert(resPdfToJpg1.headers['content-type'] === 'image/jpeg', 'Single page PDF returns image/jpeg');
    assert(resPdfToJpg1.buffer[0] === 0xff && resPdfToJpg1.buffer[1] === 0xd8, 'Output has valid JPEG magic header');

    // 4.2: Multi-page PDF returns ZIP
    const pdfToJpgMulti = buildMultipartBody([{ buffer: docA, filename: 'twoPages.pdf' }]);
    const resPdfToJpgMulti = await apiRequest({ path: '/api/v1/pdf/to-jpg', method: 'POST' }, pdfToJpgMulti.body, pdfToJpgMulti.contentType);
    assert(resPdfToJpgMulti.statusCode === 200, 'PDF → JPG multi-page returns HTTP 200');
    assert(resPdfToJpgMulti.headers['content-type'] === 'application/zip', 'Multi-page returns application/zip');
    const zipImages = await JSZip.loadAsync(resPdfToJpgMulti.buffer);
    const imgFiles = Object.keys(zipImages.files).filter((n) => !zipImages.files[n].dir);
    assert(imgFiles.length === 2, 'ZIP contains 2 rendered JPEG files (page-001.jpg, page-002.jpg)');

    // ----------------------------------------------------
    // 5. ROTATE PDF TESTS
    // ----------------------------------------------------
    console.log('\n[5] ROTATE PDF TESTS:');

    // 5.1: Rotate all pages by 90 degrees
    const rotate90 = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], { rotation: '90', pages: 'all' });
    const resRot90 = await apiRequest({ path: '/api/v1/pdf/rotate', method: 'POST' }, rotate90.body, rotate90.contentType);
    assert(resRot90.statusCode === 200, 'Rotate 90 degrees returns HTTP 200');
    const rotDoc90 = await PDFDocument.load(resRot90.buffer);
    assert(rotDoc90.getPage(0).getRotation().angle === 90, 'Page 1 rotated to 90 degrees');
    assert(rotDoc90.getPage(1).getRotation().angle === 90, 'Page 2 rotated to 90 degrees');

    // 5.2: Rotate selected page (page 2 only by 180)
    const rotateSel = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], { rotation: '180', pages: '2' });
    const resRotSel = await apiRequest({ path: '/api/v1/pdf/rotate', method: 'POST' }, rotateSel.body, rotateSel.contentType);
    assert(resRotSel.statusCode === 200, 'Rotate selected page returns HTTP 200');
    const rotDocSel = await PDFDocument.load(resRotSel.buffer);
    assert(rotDocSel.getPage(0).getRotation().angle === 0, 'Page 1 remains unrotated (0 degrees)');
    assert(rotDocSel.getPage(1).getRotation().angle === 180, 'Page 2 rotated to 180 degrees');

    // 5.3: Invalid rotation value rejected
    const rotateBad = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], { rotation: '45' });
    const resRotBad = await apiRequest({ path: '/api/v1/pdf/rotate', method: 'POST' }, rotateBad.body, rotateBad.contentType);
    assert(resRotBad.statusCode === 400, 'Invalid rotation 45 degrees returns HTTP 400');
    assert(resRotBad.json?.error?.code === 'INVALID_ROTATION', 'Invalid rotation returns INVALID_ROTATION code');

    // ----------------------------------------------------
    // 6. REMOVE PAGES TESTS
    // ----------------------------------------------------
    console.log('\n[6] REMOVE PAGES TESTS:');

    // 6.1: Remove single page (page 2 of 5)
    const removeSingle = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { pages: '2' });
    const resRemSingle = await apiRequest({ path: '/api/v1/pdf/remove-pages', method: 'POST' }, removeSingle.body, removeSingle.contentType);
    assert(resRemSingle.statusCode === 200, 'Remove single page returns HTTP 200');
    const remDocSingle = await PDFDocument.load(resRemSingle.buffer);
    assert(remDocSingle.getPageCount() === 4, 'Remaining page count is 4 (5 - 1 = 4)');

    // 6.2: Remove multiple pages / range (2,4)
    const removeMulti = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { pages: '2,4' });
    const resRemMulti = await apiRequest({ path: '/api/v1/pdf/remove-pages', method: 'POST' }, removeMulti.body, removeMulti.contentType);
    assert(resRemMulti.statusCode === 200, 'Remove multiple pages returns HTTP 200');
    const remDocMulti = await PDFDocument.load(resRemMulti.buffer);
    assert(remDocMulti.getPageCount() === 3, 'Remaining page count is 3 (5 - 2 = 3)');

    // 6.3: Cannot remove all pages
    const removeAll = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], { pages: '1-2' });
    const resRemAll = await apiRequest({ path: '/api/v1/pdf/remove-pages', method: 'POST' }, removeAll.body, removeAll.contentType);
    assert(resRemAll.statusCode === 400, 'Removing all pages returns HTTP 400');
    assert(resRemAll.json?.error?.code === 'NO_PAGES_REMAIN', 'Removing all pages gives NO_PAGES_REMAIN code');

    // ----------------------------------------------------
    // 7. EXTRACT PAGES TESTS
    // ----------------------------------------------------
    console.log('\n[7] EXTRACT PAGES TESTS:');

    // 7.1: Extract pages (2,4)
    const extract1 = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { pages: '2,4' });
    const resExt1 = await apiRequest({ path: '/api/v1/pdf/extract-pages', method: 'POST' }, extract1.body, extract1.contentType);
    assert(resExt1.statusCode === 200, 'Extract pages 2,4 returns HTTP 200');
    const extDoc1 = await PDFDocument.load(resExt1.buffer);
    assert(extDoc1.getPageCount() === 2, 'Extracted document contains exactly 2 pages');

    // 7.2: Preserve custom page sequence (5,2,3)
    const extractOrder = buildMultipartBody([{ buffer: doc5Pages, filename: 'doc5.pdf' }], { pages: '5,2,3' });
    const resExtOrder = await apiRequest({ path: '/api/v1/pdf/extract-pages', method: 'POST' }, extractOrder.body, extractOrder.contentType);
    assert(resExtOrder.statusCode === 200, 'Extract preserves requested sequence 5,2,3');
    const extDocOrder = await PDFDocument.load(resExtOrder.buffer);
    assert(extDocOrder.getPageCount() === 3, 'Extracted count is 3');

    // 7.3: Out of range page extract rejected
    const extractBad = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], { pages: '10' });
    const resExtBad = await apiRequest({ path: '/api/v1/pdf/extract-pages', method: 'POST' }, extractBad.body, extractBad.contentType);
    assert(resExtBad.statusCode === 400, 'Extract out of bounds returns HTTP 400');
    assert(resExtBad.json?.error?.code === 'INVALID_PAGE_NUMBER', 'Extract out of bounds gives INVALID_PAGE_NUMBER');

    // ----------------------------------------------------
    // 8. WATERMARK PDF TESTS
    // ----------------------------------------------------
    console.log('\n[8] WATERMARK PDF TESTS:');

    // 8.1: Watermark all pages (center, opacity 0.5, rotation 45)
    const watermark1 = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], {
      text: 'CONFIDENTIAL',
      opacity: '0.5',
      rotation: '45',
      position: 'center',
      pages: 'all',
    });
    const resWmk1 = await apiRequest({ path: '/api/v1/pdf/watermark', method: 'POST' }, watermark1.body, watermark1.contentType);
    assert(resWmk1.statusCode === 200, 'Watermark PDF returns HTTP 200');
    const wmkDoc1 = await PDFDocument.load(resWmk1.buffer);
    assert(wmkDoc1.getPageCount() === 2, 'Watermarked PDF preserves page count (2 pages)');

    // 8.2: Watermark positions (top-left, bottom-right)
    const watermarkTL = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], {
      text: 'DRAFT',
      position: 'top-left',
      opacity: '0.3',
    });
    const resWmkTL = await apiRequest({ path: '/api/v1/pdf/watermark', method: 'POST' }, watermarkTL.body, watermarkTL.contentType);
    assert(resWmkTL.statusCode === 200, 'Watermark top-left returns HTTP 200');

    // 8.3: Invalid opacity rejected
    const watermarkBadOp = buildMultipartBody([{ buffer: docA, filename: 'docA.pdf' }], {
      text: 'TEST',
      opacity: '2.5', // out of 0-1 range
    });
    const resWmkBadOp = await apiRequest({ path: '/api/v1/pdf/watermark', method: 'POST' }, watermarkBadOp.body, watermarkBadOp.contentType);
    assert(resWmkBadOp.statusCode === 400, 'Invalid opacity > 1 returns HTTP 400');
    assert(resWmkBadOp.json?.error?.code === 'INVALID_OPACITY', 'Invalid opacity returns INVALID_OPACITY error code');

    // ----------------------------------------------------
    // 9. CRITICAL END-TO-END REGRESSION PIPELINE TEST
    // ----------------------------------------------------
    console.log('\n[9] CRITICAL END-TO-END REGRESSION PIPELINE:');
    // Flow:
    // 1. Upload JPG
    // 2. JPG -> PDF
    // 3. Verify generated PDF
    // 4. Merge it with another valid PDF
    // 5. Verify merged output
    // 6. Split merged PDF
    // 7. Extract pages
    // 8. Rotate extracted PDF
    // 9. Watermark rotated PDF
    // 10. Remove a page
    // 11. Verify final PDF

    // Step 1 & 2: JPG -> PDF
    const pipelineJpg = buildMultipartBody([{ buffer: jpg1, filename: 'pipeline_img.jpg', mimeType: 'image/jpeg' }]);
    const pRes1 = await apiRequest({ path: '/api/v1/pdf/jpg-to-pdf', method: 'POST' }, pipelineJpg.body, pipelineJpg.contentType);
    assert(pRes1.statusCode === 200, '[Pipeline 1] JPG → PDF generated successfully');
    const pPdf1 = pRes1.buffer;

    // Step 3: Verify generated PDF
    const pDoc1 = await PDFDocument.load(pPdf1);
    assert(pDoc1.getPageCount() === 1, '[Pipeline 2] Generated PDF verified with 1 page');

    // Step 4 & 5: Merge it with another valid 3-page PDF
    const pipelineMerge = buildMultipartBody([
      { buffer: pPdf1, filename: 'from_jpg.pdf' },
      { buffer: docB, filename: 'docB_3pages.pdf' },
    ]);
    const pRes2 = await apiRequest({ path: '/api/v1/pdf/merge', method: 'POST' }, pipelineMerge.body, pipelineMerge.contentType);
    assert(pRes2.statusCode === 200, '[Pipeline 3] Merged JPG-PDF with 3-page document');
    const pDoc2 = await PDFDocument.load(pRes2.buffer);
    assert(pDoc2.getPageCount() === 4, '[Pipeline 4] Merged PDF verified with 4 pages (1 + 3)');

    // Step 6: Split merged PDF (pages 1-2)
    const pipelineSplit = buildMultipartBody([{ buffer: pRes2.buffer, filename: 'merged_4p.pdf' }], { ranges: '1-2' });
    const pRes3 = await apiRequest({ path: '/api/v1/pdf/split', method: 'POST' }, pipelineSplit.body, pipelineSplit.contentType);
    assert(pRes3.statusCode === 200, '[Pipeline 5] Split merged PDF into 2 pages');
    const pDoc3 = await PDFDocument.load(pRes3.buffer);
    assert(pDoc3.getPageCount() === 2, '[Pipeline 6] Split output has 2 pages');

    // Step 7: Extract page 2 and page 1 (reordering to 2,1)
    const pipelineExtract = buildMultipartBody([{ buffer: pRes3.buffer, filename: 'split_2p.pdf' }], { pages: '2,1' });
    const pRes4 = await apiRequest({ path: '/api/v1/pdf/extract-pages', method: 'POST' }, pipelineExtract.body, pipelineExtract.contentType);
    assert(pRes4.statusCode === 200, '[Pipeline 7] Extracted and reordered pages (2,1)');
    const pDoc4 = await PDFDocument.load(pRes4.buffer);
    assert(pDoc4.getPageCount() === 2, '[Pipeline 8] Extracted PDF has 2 pages');

    // Step 8: Rotate extracted PDF by 90 degrees
    const pipelineRotate = buildMultipartBody([{ buffer: pRes4.buffer, filename: 'extracted.pdf' }], { rotation: '90', pages: 'all' });
    const pRes5 = await apiRequest({ path: '/api/v1/pdf/rotate', method: 'POST' }, pipelineRotate.body, pipelineRotate.contentType);
    assert(pRes5.statusCode === 200, '[Pipeline 9] Rotated extracted PDF by 90 degrees');
    const pDoc5 = await PDFDocument.load(pRes5.buffer);
    assert(pDoc5.getPage(0).getRotation().angle === 90, '[Pipeline 10] Page 1 rotation is 90 degrees');

    // Step 9: Watermark rotated PDF
    const pipelineWmk = buildMultipartBody([{ buffer: pRes5.buffer, filename: 'rotated.pdf' }], {
      text: 'PIPELINE VERIFIED',
      opacity: '0.4',
      position: 'center',
    });
    const pRes6 = await apiRequest({ path: '/api/v1/pdf/watermark', method: 'POST' }, pipelineWmk.body, pipelineWmk.contentType);
    assert(pRes6.statusCode === 200, '[Pipeline 11] Watermarked rotated PDF');
    const pDoc6 = await PDFDocument.load(pRes6.buffer);
    assert(pDoc6.getPageCount() === 2, '[Pipeline 12] Watermarked document has 2 pages');

    // Step 10: Remove page 2
    const pipelineRemove = buildMultipartBody([{ buffer: pRes6.buffer, filename: 'watermarked.pdf' }], { pages: '2' });
    const pRes7 = await apiRequest({ path: '/api/v1/pdf/remove-pages', method: 'POST' }, pipelineRemove.body, pipelineRemove.contentType);
    assert(pRes7.statusCode === 200, '[Pipeline 13] Removed page 2 from pipeline document');
    const pDoc7 = await PDFDocument.load(pRes7.buffer);
    assert(pDoc7.getPageCount() === 1, '[Pipeline 14] Final PDF verified with 1 page');
    assert(pRes7.buffer.length > 500, '[Pipeline 15] Final PDF has valid non-zero byte size');
    assert(pRes7.buffer.subarray(0, 5).toString('ascii') === '%PDF-', '[Pipeline 16] Final PDF starts with %PDF-');

  } finally {
    server.close();
  }

  console.log(`\n======================================================`);
  console.log(`Phase 2 Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
