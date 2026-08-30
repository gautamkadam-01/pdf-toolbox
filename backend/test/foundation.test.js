/**
 * Backend Foundation Verification Suite
 * Tests health checks, routing, file validation, error masking, and placeholders.
 */

const http = require('http');
const app = require('../src/app');
const { validatePdfBuffer } = require('../src/utils/fileValidation');
const storageService = require('../src/services/storageService');

let server;
const TEST_PORT = 5099;

function makeRequest(options, data = null, isMultipart = false, boundary = '') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        ...options,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, rawBody: body });
          }
        });
      }
    );

    req.on('error', reject);

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n--- Running Backend Foundation Verification Tests ---\n');
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

  // 1. Unit Tests for PDF Validator
  console.log('\n[1] Testing fileValidation.js Unit Logic:');
  const validPdfBuf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const invalidBuf = Buffer.from('This is plain text with a .pdf name.');
  const emptyBuf = Buffer.alloc(0);

  assert(validatePdfBuffer(validPdfBuf).isValid === true, 'Valid PDF buffer returns isValid: true');
  assert(validatePdfBuffer(invalidBuf).isValid === false, 'Invalid header buffer returns isValid: false');
  assert(validatePdfBuffer(invalidBuf).error.code === 'INVALID_PDF', 'Invalid header gives INVALID_PDF code');
  assert(validatePdfBuffer(emptyBuf).isValid === false, 'Empty buffer returns isValid: false');
  assert(validatePdfBuffer(emptyBuf).error.code === 'EMPTY_FILE', 'Empty buffer gives EMPTY_FILE code');

  // 2. Storage Service Directory Test
  console.log('\n[2] Testing Storage Service:');
  storageService.ensureDirectories();
  const testPath = await storageService.saveTempFile(validPdfBuf, 'test.pdf', 'uploads');
  assert(typeof testPath === 'string' && testPath.includes('test.pdf'), 'saveTempFile returns valid file path');
  const deleted = await storageService.deleteFile(testPath);
  assert(deleted === true, 'deleteFile cleanly removes temporary file');

  // 3. HTTP Server Tests
  console.log('\n[3] Testing HTTP API Endpoints:');
  server = app.listen(TEST_PORT);

  // Test 3.1: Health Check
  const healthRes = await makeRequest({ path: '/api/health', method: 'GET' });
  assert(healthRes.statusCode === 200, 'GET /api/health returns HTTP 200');
  assert(healthRes.body.status === 'healthy', 'GET /api/health returns status "healthy"');
  assert(healthRes.body.service === 'PDF Toolbox API', 'GET /api/health returns correct service name');

  // Test 3.1b: Engines Health Check
  const enginesRes = await makeRequest({ path: '/api/health/engines', method: 'GET' });
  assert(enginesRes.statusCode === 200, 'GET /api/health/engines returns HTTP 200');
  assert(enginesRes.body.success === true, 'GET /api/health/engines returns success: true');
  assert(typeof enginesRes.body.engines === 'object', 'GET /api/health/engines returns engine map');
  assert(enginesRes.body.engines.office.available === true, 'Office engine is available');
  assert(enginesRes.body.engines.html.available === true, 'HTML engine is available');
  assert(enginesRes.body.engines.compress.available === true, 'Compress engine is available');

  // Test 3.2: Not Found Route
  const notFoundRes = await makeRequest({ path: '/api/v1/non-existent-route', method: 'GET' });
  assert(notFoundRes.statusCode === 404, 'GET /api/v1/non-existent returns HTTP 404');
  assert(notFoundRes.body.error.code === 'RESOURCE_NOT_FOUND', '404 handler returns RESOURCE_NOT_FOUND code');

  // Test 3.3: Protect Endpoint Validation
  const protectMissingRes = await makeRequest({ path: '/api/v1/pdf/protect', method: 'POST' });
  assert(protectMissingRes.statusCode === 400, 'POST /api/v1/pdf/protect returns HTTP 400 on missing file');
  assert(protectMissingRes.body.error.code === 'NO_FILE', 'Missing file returns NO_FILE error code');

  // Test 3.4: Multipart PDF Validation with Real %PDF- stream
  const boundary = '----WebKitFormBoundaryTest123456';
  const multipartBodyValid = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    validPdfBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const validUploadRes = await makeRequest(
    {
      path: '/api/v1/pdf/validate',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartBodyValid.length,
      },
    },
    multipartBodyValid
  );
  assert(validUploadRes.statusCode === 200, 'POST /api/v1/pdf/validate with real PDF returns HTTP 200');
  assert(validUploadRes.body.success === true, 'Upload response indicates success: true');

  // Test 3.5: Multipart PDF Validation with Fake / Invalid PDF
  const multipartBodyInvalid = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fake.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    invalidBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const invalidUploadRes = await makeRequest(
    {
      path: '/api/v1/pdf/validate',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartBodyInvalid.length,
      },
    },
    multipartBodyInvalid
  );
  assert(invalidUploadRes.statusCode === 422, 'POST /api/v1/pdf/validate with fake PDF returns HTTP 422 (Unprocessable)');
  assert(invalidUploadRes.body.error.code === 'INVALID_PDF', 'Fake PDF returns INVALID_PDF error code');

  // Close test server
  server.close();

  console.log(`\n=========================================`);
  console.log(`Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`=========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
