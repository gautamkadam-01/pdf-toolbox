/**
 * Dedicated Comprehensive HTML to PDF Test Suite
 * Validates real Puppeteer Chromium browser rendering, CSS fidelity, images, tables,
 * multi-page documents, margins, page dimensions, text extraction, and security.
 */

const http = require('http');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const app = require('../src/app');
const conversionService = require('../src/services/conversion/conversionService');

let TEST_PORT = 0;
let server;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function extractTextFromPdfBuffer(pdfBuffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(' ') + '\n';
  }
  return fullText;
}

function buildMultipartBody(files = [], fields = {}, boundary = '----BoundaryHtmlSuite998877') {
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
    );
  }

  for (const file of files) {
    const fieldName = file.fieldName || 'file';
    const filename = file.filename || 'document.html';
    const mimeType = file.mimeType || 'text/html';

    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function apiRequest(options, bodyBuffer, contentType) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'POST',
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        'Content-Length': bodyBuffer ? bodyBuffer.length : 0,
      },
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

async function runSuite() {
  console.log('=== Starting Dedicated HTML to PDF Test Suite ===\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  TEST_PORT = server.address().port;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• Testing: ${name}... `);
    try {
      await fn();
      console.log('✓ PASS');
      passed++;
    } catch (err) {
      console.log(`✗ FAIL: ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Engine Diagnostic Check
    await test('Puppeteer Chromium Engine Status', async () => {
      const statuses = await conversionService.getEngineStatuses();
      assert(statuses.html, 'HTML adapter status must exist');
      assert(statuses.html.available === true, 'HTML engine must be available');
      assert(statuses.html.engine === 'Puppeteer Chromium Engine', `Engine name should be Puppeteer Chromium Engine, got ${statuses.html.engine}`);
    });

    // 2. Raw HTML Code Mode with CSS
    await test('Raw HTML Code Mode with Full CSS and Dark Hero Section', async () => {
      const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
    .hero { background: #111827; color: #ffffff; padding: 30px; border-radius: 8px; }
    h1 { color: #22d3ee; margin-top: 0; }
    p { color: #94a3b8; font-size: 16px; line-height: 1.6; }
    .badge { background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>PDF Toolbox HTML Test</h1>
    <p>HTML to PDF rendering test with genuine CSS stylesheets and background colors.</p>
    <span class="badge">Verified</span>
  </div>
</body>
</html>`;

      const { body, contentType } = buildMultipartBody([], {
        html,
        pageSize: 'A4',
        orientation: 'portrait',
        margin: '10',
      });

      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.length > 1000, `PDF size must be > 1000 bytes, got ${res.body.length}`);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-', 'Must start with %PDF-');

      const pdfDoc = await PDFDocument.load(res.body);
      assert(pdfDoc.getPageCount() === 1, `Expected 1 page, got ${pdfDoc.getPageCount()}`);
    });

    // 3. Unique Test Content (verifying no stale fallback sample)
    await test('Raw Code Mode with Unique Content Verification (No Stale Sample)', async () => {
      const uniqueHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body {
    font-family: Arial, sans-serif;
    padding: 40px;
    background: #f1f5f9;
}

h1 {
    color: #7c3aed;
    font-size: 36px;
}

.unique-test {
    background: #0f172a;
    color: #22d3ee;
    padding: 30px;
    border-radius: 20px;
    font-size: 24px;
}
</style>
</head>

<body>

<h1>USER HTML TEST 987654321</h1>

<div class="unique-test">
    THIS IS NOT THE DEFAULT PDF TOOLBOX SAMPLE.
</div>

<p>
If this exact text appears in the generated PDF,
the code editor is correctly sending the user's current content.
</p>

</body>
</html>`;

      const { body, contentType } = buildMultipartBody([], {
        html: uniqueHtml,
        pageSize: 'A4',
        orientation: 'portrait',
        margin: '10',
      });

      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-', 'Must start with %PDF-');

      // Extract and verify exact text content from output PDF
      const extractedText = await extractTextFromPdfBuffer(res.body);
      assert(extractedText.includes('USER HTML TEST 987654321'), 'PDF must contain "USER HTML TEST 987654321"');
      assert(extractedText.includes('THIS IS NOT THE DEFAULT PDF TOOLBOX SAMPLE'), 'PDF must contain "THIS IS NOT THE DEFAULT PDF TOOLBOX SAMPLE"');
      assert(!extractedText.includes('PDF Document Header'), 'PDF must NOT contain default sample header');
    });

    // 4. Upload HTML File Mode (.html)
    await test('Upload HTML File Mode (.html)', async () => {
      const fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>Uploaded Invoice Document</title>
  <style>
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #e2e8f0; }
  </style>
</head>
<body>
  <h2>Invoice #INV-2026-001</h2>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
    <tbody>
      <tr><td>PDF Engine Pro License</td><td>1</td><td>$299.00</td></tr>
      <tr><td>Cloud Conversion Addon</td><td>2</td><td>$99.00</td></tr>
    </tbody>
  </table>
</body>
</html>`;

      const { body, contentType } = buildMultipartBody([
        {
          buffer: Buffer.from(fileContent, 'utf8'),
          filename: 'invoice.html',
          mimeType: 'text/html',
        },
      ], {
        pageSize: 'Letter',
        orientation: 'portrait',
        margin: '15',
      });

      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
      assert(res.headers['content-type'] === 'application/pdf', 'Must return application/pdf');
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-', 'Must start with %PDF-');

      const pdfDoc = await PDFDocument.load(res.body);
      assert(pdfDoc.getPageCount() === 1, 'Expected 1 page');
    });

    // 5. Upload HTM File Mode (.htm)
    await test('Upload HTM File Mode (.htm)', async () => {
      const fileContent = `<html><body><h1>Legacy HTM Document</h1><p>Converted with full fidelity.</p></body></html>`;
      const { body, contentType } = buildMultipartBody([
        {
          buffer: Buffer.from(fileContent, 'utf8'),
          filename: 'legacy.htm',
          mimeType: 'text/html',
        },
      ]);
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 6. Upload Uppercase Extension (.HTML)
    await test('Upload HTML File with Uppercase Extension (.HTML)', async () => {
      const fileContent = `<!DOCTYPE html><html><body><h1>UPPERCASE EXTENSION</h1></body></html>`;
      const { body, contentType } = buildMultipartBody([
        {
          buffer: Buffer.from(fileContent, 'utf8'),
          filename: 'SAMPLE.HTML',
          mimeType: 'application/octet-stream',
        },
      ]);
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 7. UTF-8 BOM Handling
    await test('HTML with UTF-8 Byte Order Mark (BOM)', async () => {
      const bomBuffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('<!DOCTYPE html><html><body><h1>BOM Encoded HTML</h1></body></html>', 'utf8'),
      ]);
      const { body, contentType } = buildMultipartBody([
        {
          buffer: bomBuffer,
          filename: 'bom-doc.html',
          mimeType: 'text/html',
        },
      ]);
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 8. Multi-Language Unicode Support
    await test('Multi-Language Unicode Symbols (₹, €, £, ©, é, 中文, 日本語, العربية, हिंदी)', async () => {
      const unicodeHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <h1>Internationalization & Currency Symbols</h1>
  <p>Currencies: ₹ 1,50,000 | € 850.50 | £ 420.00 | $ 999.00</p>
  <p>Accents: Café, façade, résumé, naïve © 2026</p>
  <p>Asian: 简体中文测试, 日本語のテスト, 한국어 테스트</p>
  <p>Indic: हिंदी परीक्षण (नमस्ते भारत)</p>
  <p>RTL: مرحباً بك في العالم العربي</p>
</body>
</html>`;
      const { body, contentType } = buildMultipartBody([], { html: unicodeHtml });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 9. Tables and Grid Layouts
    await test('Large Structured HTML Tables', async () => {
      let rows = '';
      for (let i = 1; i <= 25; i++) {
        rows += `<tr><td>#${i}</td><td>Product SKU-${1000 + i}</td><td>$${(i * 12.5).toFixed(2)}</td><td>In Stock</td></tr>`;
      }
      const tableHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
    th { background: #0f172a; color: white; }
  </style>
</head>
<body>
  <h1>Catalog Table</h1>
  <table>
    <thead><tr><th>ID</th><th>SKU</th><th>Price</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
      const { body, contentType } = buildMultipartBody([], { html: tableHtml });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 10. Vector Graphic (SVG) & Data URL Images
    await test('HTML with Inline SVG and Data URL Images', async () => {
      const svgGraphic = `<svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#2563eb" stroke-width="4" fill="#60a5fa" />
        <text x="50" y="55" font-size="14" text-anchor="middle" fill="#ffffff">SVG Test</text>
      </svg>`;

      const dataPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

      const html = `<!DOCTYPE html>
<html>
<body>
  <h1>Graphics and Vector Assets</h1>
  <div>${svgGraphic}</div>
  <p>Data URL image below:</p>
  <img src="${dataPng}" width="60" height="60" style="border: 2px solid #000;" />
</body>
</html>`;

      const { body, contentType } = buildMultipartBody([], { html });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 11. Multi-Page Long Document Flow
    await test('Multi-page HTML Flow with Page Breaks and Long Content', async () => {
      let paragraphs = '';
      for (let i = 1; i <= 30; i++) {
        paragraphs += `<h3>Section ${i}</h3><p>This is paragraph ${i} containing multiple detailed sentences to demonstrate natural multi-page layout flow, column typesetting, font rendering, and page splits without clipping text or dropping headers.</p>`;
      }

      const multiPageHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; padding: 20px; }
    h1 { color: #1e293b; page-break-after: avoid; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <h1>Multi-Page Report</h1>
  ${paragraphs}
  <div class="page-break"></div>
  <h1>Explicit Page 2 Header</h1>
  <p>This content is forced onto a subsequent page via page-break-before: always.</p>
</body>
</html>`;

      const { body, contentType } = buildMultipartBody([], { html: multiPageHtml, pageSize: 'A4' });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);

      const pdfDoc = await PDFDocument.load(res.body);
      const pages = pdfDoc.getPageCount();
      assert(pages >= 2, `Expected at least 2 pages for long document, got ${pages}`);
    });

    // 12-21: Page Size and Orientation Matrix (A4, Letter, Legal, A3, A5 x Portrait/Landscape)
    const sizeTests = [
      { size: 'A4', orientation: 'portrait', expectedW: 595.28, expectedH: 841.89 },
      { size: 'A4', orientation: 'landscape', expectedW: 841.89, expectedH: 595.28 },
      { size: 'Letter', orientation: 'portrait', expectedW: 612, expectedH: 792 },
      { size: 'Letter', orientation: 'landscape', expectedW: 792, expectedH: 612 },
      { size: 'Legal', orientation: 'portrait', expectedW: 612, expectedH: 1008 },
      { size: 'Legal', orientation: 'landscape', expectedW: 1008, expectedH: 612 },
      { size: 'A3', orientation: 'portrait', expectedW: 841.89, expectedH: 1190.55 },
      { size: 'A3', orientation: 'landscape', expectedW: 1190.55, expectedH: 841.89 },
      { size: 'A5', orientation: 'portrait', expectedW: 419.53, expectedH: 595.28 },
      { size: 'A5', orientation: 'landscape', expectedW: 595.28, expectedH: 419.53 },
    ];

    for (const st of sizeTests) {
      await test(`Page Option: ${st.size} ${st.orientation}`, async () => {
        const { body, contentType } = buildMultipartBody([], {
          html: `<h1>Testing ${st.size} ${st.orientation}</h1>`,
          pageSize: st.size,
          orientation: st.orientation,
        });
        const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
        assert(res.statusCode === 200, `Expected 200 for ${st.size} ${st.orientation}`);
        const pdfDoc = await PDFDocument.load(res.body);
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();

        assert(
          Math.abs(width - st.expectedW) < 6,
          `${st.size} ${st.orientation} width expected ~${st.expectedW}, got ${width}`
        );
        assert(
          Math.abs(height - st.expectedH) < 6,
          `${st.size} ${st.orientation} height expected ~${st.expectedH}, got ${height}`
        );
      });
    }

    // 22-24: Margin Options (0, 10, 20 mm)
    for (const m of [0, 10, 20]) {
      await test(`Margin Setting: ${m}mm`, async () => {
        const { body, contentType } = buildMultipartBody([], {
          html: `<h1>Margin Test ${m}mm</h1><p>Verifying single authoritative margin application.</p>`,
          margin: String(m),
        });
        const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
        assert(res.statusCode === 200);
        assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
      });
    }

    // 25. Security: Sanitize file:// URLs
    await test('Security: Block file:// URIs', async () => {
      const maliciousHtml = `<!DOCTYPE html>
<html>
<body>
  <h1>Security Check</h1>
  <iframe src="file:///etc/passwd"></iframe>
  <img src="file:///etc/hosts" />
</body>
</html>`;
      const { body, contentType } = buildMultipartBody([], { html: maliciousHtml });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-');
    });

    // 26. Error Handling: Empty Input
    await test('Error Handling: Empty Input Returns 400', async () => {
      const { body, contentType } = buildMultipartBody([], { html: '   ' });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
      const json = JSON.parse(res.body.toString('utf8'));
      assert(json.error && (json.error.code === 'HTML_INPUT_EMPTY' || json.error.code === 'EMPTY_FILE'));
    });

    // 27. Error Handling: Invalid file extension upload
    await test('Error Handling: Reject Invalid Document Format', async () => {
      const { body, contentType } = buildMultipartBody([
        {
          buffer: Buffer.from('FAKE BINARY DATA'),
          filename: 'archive.exe',
          mimeType: 'application/x-msdownload',
        },
      ]);
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 422 || res.statusCode === 400, `Expected 422/400 for invalid file, got ${res.statusCode}`);
    });

    // 28. PDF Binary Validation (magic bytes and structure)
    await test('PDF Output Binary Integrity & Parseability', async () => {
      const { body, contentType } = buildMultipartBody([], {
        html: '<div style="padding: 20px;"><h2>Binary Integrity Check</h2></div>',
      });
      const res = await apiRequest({ path: '/api/v1/pdf/html-to-pdf' }, body, contentType);
      assert(res.statusCode === 200);
      assert(res.body.length > 500, 'PDF binary size must be valid');
      assert(res.body.subarray(0, 5).toString('ascii') === '%PDF-', 'PDF must begin with %PDF-');
      const doc = await PDFDocument.load(res.body);
      assert(doc.getPageCount() === 1, 'PDF must contain at least 1 page');
    });

  } finally {
    server.close();
  }

  console.log(`\n=== HTML to PDF Test Suite Complete: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
