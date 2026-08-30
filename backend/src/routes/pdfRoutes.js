/**
 * Versioned PDF Routes (/api/v1/pdf)
 * Mounts all 8 core PDF operations and validation endpoints
 */

const express = require('express');
const pdfController = require('../controllers/pdfController');
const { pdfFields, imageFields, officeFields, htmlFields, anyUpload } = require('../middleware/upload');

const router = express.Router();

// 0. PDF upload & signature validation endpoint
router.post('/validate', pdfFields(), pdfController.validateUpload);

// 1. Merge PDF
router.post('/merge', pdfFields(), pdfController.merge);

// 2. Split PDF
router.post('/split', pdfFields(), pdfController.split);

// 3. JPG to PDF
router.post('/jpg-to-pdf', imageFields(), pdfController.jpgToPdf);

// 4. PDF to JPG
router.post('/to-jpg', pdfFields(), pdfController.toJpg);

// 5. Rotate PDF
router.post('/rotate', pdfFields(), pdfController.rotate);

// 6. Remove Pages
router.post('/remove-pages', pdfFields(), pdfController.removePages);

// 7. Extract Pages
router.post('/extract-pages', pdfFields(), pdfController.extractPages);

// 8. Watermark PDF
router.post('/watermark', pdfFields(), pdfController.watermark);

// 9. Compress PDF (Phase 3A)
router.post('/compress', pdfFields(), pdfController.compress);

// 10. Word to PDF (Phase 3A)
router.post('/word-to-pdf', officeFields(), pdfController.wordToPdf);

// 11. PowerPoint to PDF (Phase 3A)
router.post('/powerpoint-to-pdf', officeFields(), pdfController.powerpointToPdf);

// 12. Excel to PDF (Phase 3A)
router.post('/excel-to-pdf', officeFields(), pdfController.excelToPdf);

// 13. HTML to PDF (Phase 3A)
router.post('/html-to-pdf', htmlFields(), pdfController.htmlToPdf);

// 14. Extract Images (Phase 3A)
router.post('/extract-images', pdfFields(), pdfController.extractImages);

// 15. Protect PDF
router.post('/protect', pdfFields(), pdfController.protect);

// 16. Unlock PDF
router.post('/unlock', pdfFields(), pdfController.unlock);

// 17. Redact PDF
router.post('/redact', pdfFields(), pdfController.redact);

module.exports = router;

