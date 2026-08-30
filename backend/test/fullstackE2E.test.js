/**
 * Full-Stack End-to-End API Integration & Acceptance Test Suite
 * Validates unified Express/Vite architecture, engine health diagnostics,
 * binary response streaming, magic bytes verification, and all 7 SOON features.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const JSZip = require('jszip');
const XLSX = require('xlsx');
const app = require('../src/app');

let TEST_PORT = 0;
let server;

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        ...options,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          let json = null;
          if (contentType.includes('application/json')) {
            try {
              json = JSON.parse(buffer.toString('utf8'));
            } catch (_) {}
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function buildMultipart(filename, fileBuffer, mimeType = 'application/octet-stream', fields = {}) {
  const boundary = '----PDFToolboxFullStackBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  if (fileBuffer && filename) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(parts);

  return {
    body: fullBody,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length,
    },
  };
}

async function runE2ESuite() {
  console.log('\n======================================================');
  console.log('  PDF TOOLBOX FULL-STACK END-TO-END ACCEPTANCE SUITE  ');
  console.log('======================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  TEST_PORT = server.address().port;
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Checks
    console.log('[1] Testing Master Health & Diagnostic Endpoints:');
    const health = await makeRequest({ path: '/api/health', method: 'GET' });
    assert(health.statusCode === 200, 'GET /api/health returns HTTP 200');
    assert(health.json && health.json.status === 'healthy', 'GET /api/health status is "healthy"');

    const engines = await makeRequest({ path: '/api/health/engines', method: 'GET' });
    assert(engines.statusCode === 200, 'GET /api/health/engines returns HTTP 200');
    assert(engines.json && engines.json.success === true, 'Engines response success is true');
    assert(engines.json.engines.office.available, 'Office conversion engine is available');
    assert(engines.json.engines.html.available, 'HTML conversion engine is available');
    assert(engines.json.engines.compress.available, 'Compression engine is available');
    assert(engines.json.engines['extract-images'].available, 'Image extraction engine is available');

    // 2. SOON Feature 1: Compress PDF
    console.log('\n[2] Testing SOON Feature 1: Compress PDF:');
    const testDoc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = testDoc.addPage([600, 400]);
      page.drawText(`Compression Page ${i + 1}`, { x: 50, y: 350, size: 20 });
    }
    const samplePdfBuf = Buffer.from(await testDoc.save());

    const compReq = buildMultipart('sample.pdf', samplePdfBuf, 'application/pdf', { level: 'medium' });
    const compRes = await makeRequest({ path: '/api/v1/pdf/compress', method: 'POST', headers: compReq.headers }, compReq.body);
    assert(compRes.statusCode === 200, 'POST /api/v1/pdf/compress returns HTTP 200');
    assert(compRes.headers['content-type'].includes('application/pdf'), 'Compress output is application/pdf');
    assert(compRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Compress output starts with %PDF-');
    assert(compRes.headers['x-compressed-size'] !== undefined, 'Compress response includes X-Compressed-Size');

    // 3. SOON Feature 2: Word to PDF
    console.log('\n[3] Testing SOON Feature 2: Word (.docx) to PDF:');
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    );
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>HP Internship Offer Letter Document Content</w:t></w:r></w:p></w:body></w:document>'
    );
    const docxBuf = await zip.generateAsync({ type: 'nodebuffer' });

    const wordReq = buildMultipart('HP_Internship.docx', docxBuf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const wordRes = await makeRequest({ path: '/api/v1/pdf/word-to-pdf', method: 'POST', headers: wordReq.headers }, wordReq.body);
    assert(wordRes.statusCode === 200, 'POST /api/v1/pdf/word-to-pdf returns HTTP 200');
    assert(wordRes.headers['content-type'].includes('application/pdf'), 'Word to PDF output is application/pdf');
    assert(wordRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Word output starts with %PDF-');
    const parsedWordPdf = await PDFDocument.load(wordRes.buffer);
    assert(parsedWordPdf.getPageCount() >= 1, 'Word generated PDF contains >= 1 page');

    // 4. SOON Feature 3: PowerPoint to PDF
    console.log('\n[4] Testing SOON Feature 3: PowerPoint (.pptx) to PDF:');
    const pptxZip = new JSZip();
    pptxZip.file(
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'
    );
    pptxZip.file(
      'ppt/slides/slide1.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Quarterly Financial Results Presentation Slide</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>'
    );
    const pptxBuf = await pptxZip.generateAsync({ type: 'nodebuffer' });

    const pptxReq = buildMultipart('Quarterly_Report.pptx', pptxBuf, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const pptxRes = await makeRequest({ path: '/api/v1/pdf/powerpoint-to-pdf', method: 'POST', headers: pptxReq.headers }, pptxReq.body);
    assert(pptxRes.statusCode === 200, 'POST /api/v1/pdf/powerpoint-to-pdf returns HTTP 200');
    assert(pptxRes.headers['content-type'].includes('application/pdf'), 'PowerPoint output is application/pdf');
    assert(pptxRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'PowerPoint output starts with %PDF-');

    // 5. SOON Feature 4: Excel to PDF
    console.log('\n[5] Testing SOON Feature 4: Excel (.xlsx) to PDF:');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Product ID', 'Item Name', 'Unit Price', 'Quantity', 'Total'],
      ['P-101', 'Office Chair', 120.5, 4, 482.0],
      ['P-102', 'Standing Desk', 350.0, 2, 700.0],
      ['P-103', 'Mechanical Keyboard', 85.0, 10, 850.0],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
    const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const xlsxReq = buildMultipart('Sales_Summary.xlsx', xlsxBuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const xlsxRes = await makeRequest({ path: '/api/v1/pdf/excel-to-pdf', method: 'POST', headers: xlsxReq.headers }, xlsxReq.body);
    assert(xlsxRes.statusCode === 200, 'POST /api/v1/pdf/excel-to-pdf returns HTTP 200');
    assert(xlsxRes.headers['content-type'].includes('application/pdf'), 'Excel output is application/pdf');
    assert(xlsxRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Excel output starts with %PDF-');

    // 6. SOON Feature 5: HTML to PDF
    console.log('\n[6] Testing SOON Feature 5: HTML to PDF:');
    const htmlReq = buildMultipart(null, null, null, {
      html: '<!DOCTYPE html><html><head><title>Invoice #9901</title></head><body><h1>Invoice #9901</h1><p>Client: Acme Corp</p><p>Total Amount: $2,450.00</p></body></html>',
      pageSize: 'A4',
      orientation: 'portrait',
    });
    const htmlRes = await makeRequest({ path: '/api/v1/pdf/html-to-pdf', method: 'POST', headers: htmlReq.headers }, htmlReq.body);
    assert(htmlRes.statusCode === 200, 'POST /api/v1/pdf/html-to-pdf returns HTTP 200');
    assert(htmlRes.headers['content-type'].includes('application/pdf'), 'HTML output is application/pdf');
    assert(htmlRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'HTML output starts with %PDF-');

    // 7. SOON Feature 6: Extract Images
    console.log('\n[7] Testing SOON Feature 6: Extract Images:');
    const imgDoc = await PDFDocument.create();
    const imgPage = imgDoc.addPage([600, 400]);
    // Embed a 1x1 png image
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const embeddedImg = await imgDoc.embedPng(tinyPng);
    imgPage.drawImage(embeddedImg, { x: 50, y: 50, width: 100, height: 100 });
    const imgPdfBuf = Buffer.from(await imgDoc.save());

    const imgReq = buildMultipart('portfolio_with_images.pdf', imgPdfBuf, 'application/pdf');
    const imgRes = await makeRequest({ path: '/api/v1/pdf/extract-images', method: 'POST', headers: imgReq.headers }, imgReq.body);
    assert(imgRes.statusCode === 200, 'POST /api/v1/pdf/extract-images returns HTTP 200');
    assert(imgRes.buffer.length > 0, 'Extracted image buffer is non-empty');
    assert(
      imgRes.headers['content-type'].includes('image/') || imgRes.headers['content-type'].includes('application/zip'),
      'Image extraction returned valid image or zip MIME type'
    );

    // 8. SOON Feature 7: Protect PDF
    console.log('\n[8] Testing SOON Feature 7: Protect PDF:');
    const protectReq = buildMultipart('doc_to_lock.pdf', samplePdfBuf, 'application/pdf', { password: 'E2EPassword999', algorithm: 'AES-256' });
    const protectRes = await makeRequest({ path: '/api/v1/pdf/protect', method: 'POST', headers: protectReq.headers }, protectReq.body);
    assert(protectRes.statusCode === 200, 'POST /api/v1/pdf/protect returns HTTP 200');
    assert(protectRes.headers['content-type'].includes('application/pdf'), 'Protect output is application/pdf');
    assert(protectRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Protected PDF starts with %PDF-');

    // 9. SOON Feature 8: Unlock PDF
    console.log('\n[9] Testing SOON Feature 8: Unlock PDF:');
    const unlockReq = buildMultipart('doc_to_unlock.pdf', protectRes.buffer, 'application/pdf', { password: 'E2EPassword999' });
    const unlockRes = await makeRequest({ path: '/api/v1/pdf/unlock', method: 'POST', headers: unlockReq.headers }, unlockReq.body);
    assert(unlockRes.statusCode === 200, 'POST /api/v1/pdf/unlock returns HTTP 200');
    assert(unlockRes.headers['content-type'].includes('application/pdf'), 'Unlocked output is application/pdf');
    assert(unlockRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Unlocked PDF starts with %PDF-');

    // 10. SOON Feature 9: Redact PDF
    console.log('\n[10] Testing SOON Feature 9: Redact PDF:');
    const redactBoxes = [{ page: 1, x: 50, y: 300, width: 200, height: 40 }];
    const redactReq = buildMultipart('doc_to_redact.pdf', samplePdfBuf, 'application/pdf', { redactions: JSON.stringify(redactBoxes), color: '#000000' });
    const redactRes = await makeRequest({ path: '/api/v1/pdf/redact', method: 'POST', headers: redactReq.headers }, redactReq.body);
    assert(redactRes.statusCode === 200, 'POST /api/v1/pdf/redact returns HTTP 200');
    assert(redactRes.headers['content-type'].includes('application/pdf'), 'Redacted output is application/pdf');
    assert(redactRes.buffer.subarray(0, 5).toString('utf8') === '%PDF-', 'Redacted PDF starts with %PDF-');

    console.log('\n======================================================');
    console.log(`  E2E SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } finally {
    if (server) server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error('Fatal E2E suite failure:', err);
  if (server) server.close();
  process.exit(1);
});
