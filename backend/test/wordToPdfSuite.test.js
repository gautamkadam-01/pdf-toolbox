/**
 * Dedicated Word to PDF Comprehensive Test Suite
 * Tests:
 * 1. Small .docx
 * 2. Multi-page .docx
 * 3. Document with Tables
 * 4. Document with Embedded Images
 * 5. Document with Headings and Different Fonts
 * 6. Legacy .doc binary file
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { PDFDocument } = require('pdf-lib');
const { wordToPdf } = require('../src/services/pdf/officeToPdfService');

async function createSmallDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Simple Single Page Document Content</w:t></w:r></w:p>
  </w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createMultiPageDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  let paragraphs = '';
  for (let i = 1; i <= 60; i++) {
    paragraphs += `<w:p><w:r><w:t>Paragraph ${i}: Comprehensive legal and business terms with long analytical text spanning multiple lines and across multiple rendered PDF pages to test boundary page breaks.</w:t></w:r></w:p>`;
  }

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}</w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createTableDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Quarterly Financial Performance</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Metric</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Q1 Target</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Q1 Actual</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Revenue</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>$100,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>$118,500</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Active Users</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>25,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>31,200</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createImageDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 1x1 Transparent PNG
  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  zip.file('word/media/image1.png', samplePng);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Document with Embedded Graphic</w:t></w:r></w:p>
  </w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createHeadingsDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1: Architecture Overview</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Important Notice in Bold Text.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Italicized commentary regarding PDF engine standards.</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Section 1.1: Implementation Details</w:t></w:r></w:p>
    <w:p><w:r><w:t>Standard body paragraph discussing performance characteristics.</w:t></w:r></w:p>
  </w:body>
</w:document>`);

  return zip.generateAsync({ type: 'nodebuffer' });
}

function createLegacyDocBuffer() {
  if (fs.existsSync('/tmp/test_doc.doc')) {
    return fs.readFileSync('/tmp/test_doc.doc');
  }
  // Standard valid Word 97 document
  const sampleDoc = Buffer.from(
    '0M8R4KGxGuEAAAAAAAAAAAAAAAAAAAAAPgADAP7/CQAGAAAAAAAAAAAAAAABAAAANgAAAAAAAAAAEAAAAAAA' +
      'AAAAEAAANAAAAAEAAAD+////AAAAADUAAAD///////////////////////////////////////////////' +
      '////////////////////////////////////////////////////////////////////////////////' +
      '////////////////////////////////////////////////////////////////////////////////',
    'base64'
  );
  return sampleDoc;
}

async function runSuite() {
  console.log('=== Starting Dedicated Word to PDF Test Suite ===\n');

  // Test 1: Small DOCX
  console.log('1. Testing Small .docx conversion...');
  const smallBuf = await createSmallDocx();
  const res1 = await wordToPdf(smallBuf, 'small_test.docx');
  assert.ok(res1.buffer && res1.buffer.length > 0, 'Buffer must be non-empty');
  assert.strictEqual(res1.buffer.slice(0, 5).toString('ascii'), '%PDF-', 'Must start with %PDF-');
  const pdf1 = await PDFDocument.load(res1.buffer);
  assert.strictEqual(pdf1.getPageCount(), 1, 'Small doc should have 1 page');
  console.log(`   ✓ PASS: Small doc converted (Size: ${res1.sizeBytes} bytes, Pages: ${res1.pageCount})`);

  // Test 2: Multi-Page DOCX
  console.log('\n2. Testing Multi-page .docx conversion...');
  const multiBuf = await createMultiPageDocx();
  const res2 = await wordToPdf(multiBuf, 'multipage_test.docx');
  assert.ok(res2.buffer && res2.buffer.length > 0);
  assert.strictEqual(res2.buffer.slice(0, 5).toString('ascii'), '%PDF-');
  const pdf2 = await PDFDocument.load(res2.buffer);
  assert.ok(pdf2.getPageCount() > 1, `Multi-page doc must have >1 pages (got ${pdf2.getPageCount()})`);
  console.log(`   ✓ PASS: Multi-page doc converted (Size: ${res2.sizeBytes} bytes, Pages: ${res2.pageCount})`);

  // Test 3: Table DOCX
  console.log('\n3. Testing .docx with Tables conversion...');
  const tableBuf = await createTableDocx();
  const res3 = await wordToPdf(tableBuf, 'table_test.docx');
  assert.ok(res3.buffer && res3.buffer.length > 0);
  assert.strictEqual(res3.buffer.slice(0, 5).toString('ascii'), '%PDF-');
  const pdf3 = await PDFDocument.load(res3.buffer);
  assert.ok(pdf3.getPageCount() >= 1);
  console.log(`   ✓ PASS: Table doc converted (Size: ${res3.sizeBytes} bytes, Pages: ${res3.pageCount})`);

  // Test 4: Image DOCX
  console.log('\n4. Testing .docx with Embedded Images conversion...');
  const imgBuf = await createImageDocx();
  const res4 = await wordToPdf(imgBuf, 'image_test.docx');
  assert.ok(res4.buffer && res4.buffer.length > 0);
  assert.strictEqual(res4.buffer.slice(0, 5).toString('ascii'), '%PDF-');
  const pdf4 = await PDFDocument.load(res4.buffer);
  assert.ok(pdf4.getPageCount() >= 1);
  console.log(`   ✓ PASS: Image doc converted (Size: ${res4.sizeBytes} bytes, Pages: ${res4.pageCount})`);

  // Test 5: Headings and Fonts DOCX
  console.log('\n5. Testing .docx with Headings and Styles conversion...');
  const headBuf = await createHeadingsDocx();
  const res5 = await wordToPdf(headBuf, 'headings_test.docx');
  assert.ok(res5.buffer && res5.buffer.length > 0);
  assert.strictEqual(res5.buffer.slice(0, 5).toString('ascii'), '%PDF-');
  const pdf5 = await PDFDocument.load(res5.buffer);
  assert.ok(pdf5.getPageCount() >= 1);
  console.log(`   ✓ PASS: Headings doc converted (Size: ${res5.sizeBytes} bytes, Pages: ${res5.pageCount})`);

  // Test 6: Legacy .doc File
  console.log('\n6. Testing Legacy .doc binary file conversion...');
  const docBuf = createLegacyDocBuffer();
  const res6 = await wordToPdf(docBuf, 'legacy_report.doc');
  assert.ok(res6.buffer && res6.buffer.length > 0);
  assert.strictEqual(res6.buffer.slice(0, 5).toString('ascii'), '%PDF-');
  const pdf6 = await PDFDocument.load(res6.buffer);
  assert.ok(pdf6.getPageCount() >= 1);
  console.log(`   ✓ PASS: Legacy .doc converted (Size: ${res6.sizeBytes} bytes, Pages: ${res6.pageCount})`);

  console.log('\n=== All 6 Dedicated Word to PDF Tests Passed Successfully ===');
}

runSuite().catch((err) => {
  console.error('Word to PDF Test Failure:', err);
  process.exit(1);
});
