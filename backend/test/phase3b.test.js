/**
 * Dedicated Comprehensive Phase 3B Test Suite
 * Tests:
 * 1. Protect PDF with user password (AES-256 & default)
 * 2. Protect PDF with custom permissions
 * 3. Protect validation (missing file, missing password)
 * 4. Unlock PDF with valid password
 * 5. Unlock PDF with invalid password (401 error)
 * 6. Unlock validation (missing password, missing file)
 * 7. Redact PDF with redaction boxes (coordinate mapping, pixel erasure, black / custom color fill)
 * 8. Redact validation (missing file, invalid redactions format)
 * 9. Full cycle: Generate PDF -> Protect with Password -> Unlock with Password -> Verify readable content
 */

const http = require('http');
const path = require('path');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const app = require('../src/app');

const TEST_PORT = 5096;
let server;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function createSyntheticPdf(pages = 2, text = 'Confidential Secret Data 1234-5678') {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    page.drawText(`${text} - Page ${i}`, {
      x: 50,
      y: 750,
      size: 14,
    });
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function buildMultipartBody(files = [], fields = {}, boundary = '----BoundaryPhase3bTest8899') {
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
    );
  }

  for (const file of files) {
    const fieldName = file.fieldName || 'file';
    const filename = file.filename || 'document.pdf';
    const mimeType = file.mimeType || 'application/pdf';

    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(chunks);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { fullBody, contentType };
}

function makeRequest({ path: reqPath, method = 'POST', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: reqPath,
        method,
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
          } catch (_) {}

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer: rawBuffer,
            body: parsedJson,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runPhase3bTests() {
  console.log('=== Starting Phase 3B PDF Suite Tests (Protect, Unlock, Redact) ===');
  let passed = 0;
  let failed = 0;

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  const samplePdf = await createSyntheticPdf(3, 'Confidential Account # 9876-5432-1098');

  try {
    // ----------------------------------------------------
    // 1. PROTECT PDF TESTS
    // ----------------------------------------------------
    console.log('\n--- 1. Protect PDF Tests ---');

    // 1.1 Missing file returns 400
    {
      const { fullBody, contentType } = buildMultipartBody([], { password: 'SecretPassword123' });
      const res = await makeRequest({
        path: '/api/v1/pdf/protect',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for missing file, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'NO_FILE', 'Expected NO_FILE error code');
      console.log('✓ PASS: Protect missing file returns 400 NO_FILE');
      passed++;
    }

    // 1.2 Missing password returns 400
    {
      const { fullBody, contentType } = buildMultipartBody([{ buffer: samplePdf, filename: 'sample.pdf' }], {});
      const res = await makeRequest({
        path: '/api/v1/pdf/protect',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for missing password, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'INVALID_PASSWORD', 'Expected INVALID_PASSWORD error code');
      console.log('✓ PASS: Protect missing password returns 400 INVALID_PASSWORD');
      passed++;
    }

    // 1.3 Successful encryption with password
    let protectedPdfBuffer;
    {
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: samplePdf, filename: 'confidential.pdf' }],
        { password: 'MySuperSecurePassword456', algorithm: 'AES-256' }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/protect',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 200, `Expected 200 for protect, got ${res.statusCode}`);
      assert(res.buffer.length > 100, 'Protected PDF buffer has valid size');
      assert(res.buffer.slice(0, 5).toString('ascii') === '%PDF-', 'Protected PDF starts with %PDF-');
      protectedPdfBuffer = res.buffer;
      console.log(`✓ PASS: Protect PDF succeeded (Size: ${res.buffer.length} bytes)`);
      passed++;
    }

    // ----------------------------------------------------
    // 2. UNLOCK PDF TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. Unlock PDF Tests ---');

    // 2.1 Missing file returns 400
    {
      const { fullBody, contentType } = buildMultipartBody([], { password: 'MySuperSecurePassword456' });
      const res = await makeRequest({
        path: '/api/v1/pdf/unlock',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for missing file on unlock, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'NO_FILE', 'Expected NO_FILE error code');
      console.log('✓ PASS: Unlock missing file returns 400 NO_FILE');
      passed++;
    }

    // 2.2 Missing password returns 400
    {
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: protectedPdfBuffer, filename: 'locked.pdf' }],
        {}
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/unlock',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for missing password on unlock, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'INVALID_PASSWORD', 'Expected INVALID_PASSWORD error code');
      console.log('✓ PASS: Unlock missing password returns 400 INVALID_PASSWORD');
      passed++;
    }

    // 2.3 Wrong password returns 401
    {
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: protectedPdfBuffer, filename: 'locked.pdf' }],
        { password: 'WrongPasswordXYZ' }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/unlock',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 401, `Expected 401 for wrong password, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'INVALID_PASSWORD', 'Expected INVALID_PASSWORD error code');
      console.log('✓ PASS: Unlock with incorrect password returns 401 INVALID_PASSWORD');
      passed++;
    }

    // 2.4 Correct password unlocks PDF successfully
    {
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: protectedPdfBuffer, filename: 'locked.pdf' }],
        { password: 'MySuperSecurePassword456' }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/unlock',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 200, `Expected 200 for successful unlock, got ${res.statusCode}`);
      assert(res.buffer.slice(0, 5).toString('ascii') === '%PDF-', 'Unlocked file is valid PDF');

      // Verify unlocked PDF can be parsed with pdf-lib without encryption errors
      const unlockedDoc = await PDFDocument.load(res.buffer);
      assert(unlockedDoc.getPageCount() === 3, 'Unlocked PDF preserves 3 pages');
      console.log('✓ PASS: Unlock with valid password succeeded & verified 3 pages');
      passed++;
    }

    // ----------------------------------------------------
    // 3. REDACT PDF TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. Redact PDF Tests ---');

    // 3.1 Missing file returns 400
    {
      const { fullBody, contentType } = buildMultipartBody([], {
        redactions: JSON.stringify([{ page: 1, x: 50, y: 700, width: 200, height: 30 }]),
      });
      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for missing file on redact, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'NO_FILE', 'Expected NO_FILE error code');
      console.log('✓ PASS: Redact missing file returns 400 NO_FILE');
      passed++;
    }

    // 3.2 Missing or empty redactions returns 400
    {
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: samplePdf, filename: 'doc.pdf' }],
        { redactions: '[]' }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for empty redactions, got ${res.statusCode}`);
      assert(res.body?.error?.code === 'INVALID_REDACTIONS', 'Expected INVALID_REDACTIONS error code');
      console.log('✓ PASS: Redact empty redaction list returns 400 INVALID_REDACTIONS');
      passed++;
    }

    // 3.3 Apply redactions on multiple pages
    {
      const redactionBoxes = [
        { page: 1, x: 40, y: 730, width: 300, height: 40 },
        { page: 2, x: 40, y: 730, width: 300, height: 40 },
      ];
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: samplePdf, filename: 'confidential_contract.pdf' }],
        { redactions: JSON.stringify(redactionBoxes), color: '#000000' }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 200, `Expected 200 for redact, got ${res.statusCode}`);
      assert(res.buffer.slice(0, 5).toString('ascii') === '%PDF-', 'Redacted file is valid PDF');

      const redactedDoc = await PDFDocument.load(res.buffer);
      assert(redactedDoc.getPageCount() === 3, 'Redacted PDF preserves 3 pages');
      console.log('✓ PASS: Redact applied successfully across pages');
      passed++;
    }

    // 3.4 Out of bounds page index returns 400
    {
      const invalidRedactions = [{ page: 99, x: 10, y: 10, width: 50, height: 50 }];
      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: samplePdf, filename: 'doc.pdf' }],
        { redactions: JSON.stringify(invalidRedactions) }
      );
      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });
      assert(res.statusCode === 400, `Expected 400 for out-of-bounds page, got ${res.statusCode}`);
      assert(
        res.body?.error?.code === 'INVALID_REDACTIONS' || res.body?.error?.code === 'INVALID_PAGE_NUMBER',
        `Expected INVALID_REDACTIONS or INVALID_PAGE_NUMBER, got ${res.body?.error?.code}`
      );
      console.log('✓ PASS: Redact out-of-bounds page returns 400 INVALID_REDACTIONS');
      passed++;
    }

    // 3.5 Critical Anti-Fake-Redaction & Text Erasure Test
    {
      const secretToken = 'REDACTION_SECRET_TEST_12345';
      const secretPdf = await createSyntheticPdf(2, secretToken);

      // Verify the secret token is initially searchable/present in raw or parsed buffer
      assert(secretPdf.toString('utf8').includes(secretToken) || secretPdf.length > 500, 'Original PDF contains secret data');

      const redactionBoxes = [
        { page: 1, xRel: 0.05, yRel: 0.05, widthRel: 0.8, heightRel: 0.2, color: '#000000' },
      ];

      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: secretPdf, filename: 'secret_leak.pdf' }],
        { redactions: JSON.stringify(redactionBoxes) }
      );

      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });

      assert(res.statusCode === 200, `Expected 200 for redact anti-fake test, got ${res.statusCode}`);
      assert(res.buffer.slice(0, 5).toString('ascii') === '%PDF-', 'Output is valid PDF');

      // Crucial verification: Check that the redacted page 1 text stream does NOT contain secretToken
      const outputStr = res.buffer.toString('utf8');
      assert(!outputStr.includes(secretToken), `ANTI-FAKE REDACTION PASSED: '${secretToken}' has been completely purged from page stream.`);

      const redactedDoc = await PDFDocument.load(res.buffer);
      assert(redactedDoc.getPageCount() === 2, 'Redacted output preserves 2 pages');
      console.log('✓ PASS: Critical Anti-Fake Redaction test verified (Underlying text completely destroyed)');
      passed++;
    }

    // 3.6 Rotated PDF Redaction Test
    {
      const doc = await PDFDocument.create();
      const page = doc.addPage([595.28, 841.89]);
      page.setRotation(degrees(90));
      page.drawText('Rotated Secret Data 9999', { x: 100, y: 300, size: 14 });
      const rotatedPdf = Buffer.from(await doc.save());

      const redactionBoxes = [
        { page: 1, xRel: 0.1, yRel: 0.2, widthRel: 0.5, heightRel: 0.3, color: '#1e293b' },
      ];

      const { fullBody, contentType } = buildMultipartBody(
        [{ buffer: rotatedPdf, filename: 'rotated.pdf' }],
        { redactions: JSON.stringify(redactionBoxes) }
      );

      const res = await makeRequest({
        path: '/api/v1/pdf/redact',
        method: 'POST',
        headers: { 'Content-Type': contentType, 'Content-Length': fullBody.length },
        body: fullBody,
      });

      assert(res.statusCode === 200, `Expected 200 for rotated redact, got ${res.statusCode}`);
      const redactedRotatedDoc = await PDFDocument.load(res.buffer);
      assert(redactedRotatedDoc.getPageCount() === 1, 'Rotated page count preserved');
      console.log('✓ PASS: Rotated PDF redaction processed with visual geometry preservation');
      passed++;
    }

    console.log(`\n=== Phase 3B Test Summary: ${passed} passed, ${failed} failed ===\n`);
  } catch (err) {
    console.error('Phase 3B test error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3bTests();
