/**
 * PDF Toolbox - Phase 3A Comprehensive Test Suite
 * Validates Compress, Word/PowerPoint/Excel-to-PDF, HTML-to-PDF, and Extract Images endpoints.
 */

const http = require('http');
const { PDFDocument, rgb } = require('pdf-lib');
const { createCanvas } = require('@napi-rs/canvas');
const JSZip = require('jszip');
const XLSX = require('xlsx');
const app = require('../src/app');

let server;
const TEST_PORT = 5099;

/**
 * Creates a synthetic multi-page test PDF in memory
 */
async function createTestPdf(pageCount = 2, label = 'Phase3 Doc') {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`${label} - Page ${i}`, {
      x: 50,
      y: 200,
      size: 20,
      color: rgb(0.1, 0.2, 0.4),
    });
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Creates a synthetic test PDF with an embedded JPEG image
 */
async function createTestPdfWithImage() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);

  // Create image on canvas
  const canvas = createCanvas(150, 150);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 150, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText('Sample', 25, 80);
  const jpgBuffer = canvas.toBuffer('image/jpeg');

  const embeddedJpg = await doc.embedJpg(jpgBuffer);
  page.drawImage(embeddedJpg, {
    x: 50,
    y: 150,
    width: 150,
    height: 150,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Creates a minimal valid .docx file buffer in memory
 */
async function createSyntheticDocx(text = 'Hello Microsoft Word to PDF Test') {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Creates a synthetic .xlsx spreadsheet buffer in memory
 */
function createSyntheticXlsx() {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Product', 'Q1 Sales', 'Q2 Sales', 'Total'],
    ['Widgets', 1200, 1500, 2700],
    ['Gadgets', 850, 920, 1770],
    ['Tools', 430, 510, 940],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Creates a synthetic .pptx presentation buffer in memory
 */
async function createSyntheticPptx(title = 'Sales Strategy 2026') {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>'
  );
  zip.file(
    'ppt/presentation.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>'
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p><a:p><a:r><a:t>Key Initiative 1: Drive Customer Growth</a:t></a:r></a:p><a:p><a:r><a:t>Key Initiative 2: Enhance Product Quality</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Builds multipart/form-data payload
 */
function buildMultipartBody(files = [], fields = {}, boundary = '----BoundaryPhase3Test987654') {
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
    );
  }

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
 * HTTP helper
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
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            text: () => body.toString('utf8'),
            json: () => {
              try {
                return JSON.parse(body.toString('utf8'));
              } catch (_) {
                return null;
              }
            },
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

// Test Runner
let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    process.stdout.write(`  Testing ${name}... `);
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passed++;
  } catch (err) {
    console.log(`\x1b[31mFAILED\x1b[0m: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function startSuite() {
  console.log('\n=== Starting Phase 3A PDF Suite Tests ===\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    // 1. Compress PDF
    await runTest('POST /api/v1/pdf/compress (medium profile)', async () => {
      const pdfBuf = await createTestPdf(3, 'Compress Test');
      const { body, contentType } = buildMultipartBody(
        [{ buffer: pdfBuf, filename: 'sample.pdf', mimeType: 'application/pdf' }],
        { level: 'medium' }
      );

      const res = await apiRequest(
        { path: '/api/v1/pdf/compress', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.length > 500, 'Must have valid body length');
      assert(res.body.subarray(0, 5).indexOf(Buffer.from('%PDF-')) !== -1, 'Must be valid PDF');
      assert(res.headers['x-original-size'], 'Must include X-Original-Size header');
    });

    // 2. HTML to PDF
    await runTest('POST /api/v1/pdf/html-to-pdf (raw HTML code)', async () => {
      const htmlString = '<html><body><h1>Invoice #1001</h1><p>Customer: Acme Corp</p></body></html>';
      const { body, contentType } = buildMultipartBody([], {
        html: htmlString,
        pageSize: 'A4',
        orientation: 'portrait',
      });

      const res = await apiRequest(
        { path: '/api/v1/pdf/html-to-pdf', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.subarray(0, 5).indexOf(Buffer.from('%PDF-')) !== -1, 'Must be valid PDF');
    });

    // 3. Word to PDF
    await runTest('POST /api/v1/pdf/word-to-pdf (synthetic .docx document)', async () => {
      const docxBuf = await createSyntheticDocx('Testing LibreOffice conversion');
      const { body, contentType } = buildMultipartBody([
        {
          buffer: docxBuf,
          filename: 'test_document.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ]);

      const res = await apiRequest(
        { path: '/api/v1/pdf/word-to-pdf', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.subarray(0, 5).indexOf(Buffer.from('%PDF-')) !== -1, 'Must be valid PDF');
    });

    // 3b. PowerPoint to PDF
    await runTest('POST /api/v1/pdf/powerpoint-to-pdf (synthetic .pptx presentation)', async () => {
      const pptxBuf = await createSyntheticPptx('Q1 Strategy Overview');
      const { body, contentType } = buildMultipartBody([
        {
          buffer: pptxBuf,
          filename: 'strategy.pptx',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
      ]);

      const res = await apiRequest(
        { path: '/api/v1/pdf/powerpoint-to-pdf', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.subarray(0, 5).indexOf(Buffer.from('%PDF-')) !== -1, 'Must be valid PDF');
    });

    // 3c. Excel to PDF
    await runTest('POST /api/v1/pdf/excel-to-pdf (synthetic .xlsx spreadsheet)', async () => {
      const xlsxBuf = createSyntheticXlsx();
      const { body, contentType } = buildMultipartBody([
        {
          buffer: xlsxBuf,
          filename: 'financials.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ]);

      const res = await apiRequest(
        { path: '/api/v1/pdf/excel-to-pdf', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.subarray(0, 5).indexOf(Buffer.from('%PDF-')) !== -1, 'Must be valid PDF');
    });

    // 4. Extract Images
    await runTest('POST /api/v1/pdf/extract-images (embedded raster objects)', async () => {
      const pdfBuf = await createTestPdfWithImage();
      const { body, contentType } = buildMultipartBody([
        { buffer: pdfBuf, filename: 'document_with_images.pdf', mimeType: 'application/pdf' },
      ]);

      const res = await apiRequest(
        { path: '/api/v1/pdf/extract-images', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(
        res.headers['content-type'].includes('image/') ||
          res.headers['content-type'].includes('application/zip'),
        'Must return image or zip'
      );
      assert(res.body.length > 100, 'Must extract non-empty image content');
    });

    // 7. Extract Images 404 when no images exist
    await runTest('POST /api/v1/pdf/extract-images (404 on text-only PDF)', async () => {
      const plainPdf = await createTestPdf(1, 'No images here');
      const { body, contentType } = buildMultipartBody([
        { buffer: plainPdf, filename: 'plain.pdf', mimeType: 'application/pdf' },
      ]);

      const res = await apiRequest(
        { path: '/api/v1/pdf/extract-images', method: 'POST' },
        body,
        contentType
      );

      assert(res.statusCode === 404, `Expected 404 NO_EMBEDDED_IMAGES, got ${res.statusCode}`);
      const json = res.json();
      assert(json && json.error && json.error.code === 'NO_EMBEDDED_IMAGES', 'Must indicate NO_EMBEDDED_IMAGES');
    });
  } finally {
    server.close();
  }

  console.log(`\n=== Phase 3A Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

startSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
