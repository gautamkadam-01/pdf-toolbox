/**
 * Unicode and WinAnsi Encoding Test Suite
 * Verifies that Excel, Word, PowerPoint, and Watermark operations handle non-WinAnsi
 * characters (like ₹ Indian Rupee, ₩ Won, ₺ Lira, emojis, CJK, Arabic) cleanly without crashing.
 */

const assert = require('assert');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const { PDFDocument } = require('pdf-lib');
const OfficeAdapter = require('../src/services/conversion/adapters/officeAdapter');
const { watermarkPdf } = require('../src/services/pdf/watermarkService');
const { sanitizeWinAnsi } = require('../src/utils/textEncoding');

async function runTests() {
  console.log('=== Starting Unicode & WinAnsi Encoding Verification Suite ===\n');
  const officeAdapter = new OfficeAdapter();

  // Test 1: sanitizeWinAnsi unit tests
  console.log('• Test 1: sanitizeWinAnsi unit tests...');
  assert.strictEqual(sanitizeWinAnsi('Price: ₹1500'), 'Price: Rs.1500');
  assert.strictEqual(sanitizeWinAnsi('Total: ₩500 / ₺100 / ₽50'), 'Total: KRW500 / TL100 / RUB50');
  assert.strictEqual(sanitizeWinAnsi('Math: 10 ≤ 20 ≠ 30 ≥ 5'), 'Math: 10 <= 20 != 30 >= 5');
  assert.strictEqual(sanitizeWinAnsi('Accented: résumé, naïve, façade'), 'Accented: résumé, naïve, façade');
  assert.strictEqual(sanitizeWinAnsi(null), '');
  assert.strictEqual(sanitizeWinAnsi(undefined), '');
  console.log('  ✓ PASS: sanitizeWinAnsi maps and cleans strings properly\n');

  // Test 2: Excel with ₹ (Indian Rupee) and unicode data
  console.log('• Test 2: Excel to PDF fallback with ₹ (Indian Rupee), currencies, accents, and emojis...');
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Item', 'Price', 'Currency', 'Notes'],
    ['Product A', '₹ 2,499.00', 'INR', 'Special Discount ₹ 250 off!'],
    ['Product B', '₩ 35,000', 'KRW', 'Imported item • High quality'],
    ['Product C', '₺ 450.50', 'TL', 'Turkish Delight 🍫'],
    ['Product D', '125.00 €', 'EUR', 'Café & Résumé included'],
    ['Product E', '50.00 £', 'GBP', 'London branch — 20% off'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, '₹ Rupee Sheet');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const excelPdfBuffer = await officeAdapter.convertExcelFallback(xlsxBuffer, 'budget_₹_2026.xlsx');

  assert(Buffer.isBuffer(excelPdfBuffer), 'Excel output should be a Buffer');
  assert(excelPdfBuffer.slice(0, 5).toString() === '%PDF-', 'Excel PDF should start with %PDF-');

  const loadedExcelPdf = await PDFDocument.load(excelPdfBuffer);
  assert(loadedExcelPdf.getPageCount() >= 1, 'Excel PDF should have at least 1 page');
  console.log(`  ✓ PASS: Excel with ₹ converted successfully (${excelPdfBuffer.length} bytes, ${loadedExcelPdf.getPageCount()} page(s))\n`);

  // Test 3: PowerPoint fallback with ₹ and symbols
  console.log('• Test 3: PowerPoint fallback with ₹ and symbols...');
  const pptZip = new JSZip();
  pptZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  pptZip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Financial Report 2026: ₹ 100 Crore Revenue</a:t></a:r></a:p>
              <a:p><a:r><a:t>• Target achieved: ₹ 1,50,00,000 in Q1</a:t></a:r></a:p>
              <a:p><a:r><a:t>• International sales: ₩ 50M and ₺ 100k</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`);

  const pptxBuffer = await pptZip.generateAsync({ type: 'nodebuffer' });
  const pptPdfBuffer = await officeAdapter.convertPowerPointFallback(pptxBuffer, 'presentation_₹.pptx');

  assert(Buffer.isBuffer(pptPdfBuffer), 'PowerPoint output should be a Buffer');
  assert(pptPdfBuffer.slice(0, 5).toString() === '%PDF-', 'PowerPoint PDF should start with %PDF-');
  const loadedPptPdf = await PDFDocument.load(pptPdfBuffer);
  assert(loadedPptPdf.getPageCount() >= 1, 'PPT PDF should have at least 1 page');
  console.log(`  ✓ PASS: PowerPoint with ₹ converted successfully (${pptPdfBuffer.length} bytes, ${loadedPptPdf.getPageCount()} page(s))\n`);

  // Test 4: Watermark with ₹
  console.log('• Test 4: Watermark PDF with ₹ and non-WinAnsi text...');
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([595, 842]);
  const basePdfBytes = await baseDoc.save();

  const watermarked = await watermarkPdf(Buffer.from(basePdfBytes), {
    text: 'CONFIDENTIAL • ₹ 5,00,000 CLAIM',
    opacity: 0.4,
    rotation: 45,
  });

  assert(Buffer.isBuffer(watermarked.buffer), 'Watermark output should be a Buffer');
  assert(watermarked.buffer.slice(0, 5).toString() === '%PDF-', 'Watermarked PDF should start with %PDF-');
  const loadedWmPdf = await PDFDocument.load(watermarked.buffer);
  assert(loadedWmPdf.getPageCount() === 1, 'Watermarked PDF should have 1 page');
  console.log(`  ✓ PASS: Watermark with ₹ applied successfully (${watermarked.buffer.length} bytes)\n`);

  console.log('=== All Unicode & WinAnsi Encoding Tests Passed! ===\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
