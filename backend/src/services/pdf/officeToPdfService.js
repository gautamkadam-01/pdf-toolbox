/**
 * Office to PDF Service
 * Converts Microsoft Word (.docx, .doc), PowerPoint (.pptx, .ppt), and Excel (.xlsx, .xls)
 * documents into high-fidelity PDF files using centralized ConversionService and OfficeAdapter.
 */

const conversionService = require('../conversion/conversionService');

/**
 * Checks if LibreOffice / soffice binary is accessible
 * @returns {Promise<boolean>}
 */
async function isOfficeConverterAvailable() {
  const adapter = conversionService.getAdapter('office');
  return adapter.isAvailable();
}

/**
 * Generic Office to PDF conversion coordinator
 * @param {Buffer} fileBuffer - Office file buffer
 * @param {string} originalName - Source file name
 * @param {'word'|'powerpoint'|'excel'} type - Document category
 * @returns {Promise<{ buffer: Buffer, sizeBytes: number, pageCount: number, filename: string, mimeType: string }>}
 */
async function convertOfficeToPdf(fileBuffer, originalName = 'document.docx', type = 'word') {
  return conversionService.convertOffice(fileBuffer, originalName, type);
}

/**
 * 2. Word to PDF
 */
async function wordToPdf(fileBuffer, originalName = 'document.docx') {
  return convertOfficeToPdf(fileBuffer, originalName, 'word');
}

/**
 * 3. PowerPoint to PDF
 */
async function powerpointToPdf(fileBuffer, originalName = 'presentation.pptx') {
  return convertOfficeToPdf(fileBuffer, originalName, 'powerpoint');
}

/**
 * 4. Excel to PDF
 */
async function excelToPdf(fileBuffer, originalName = 'spreadsheet.xlsx') {
  return convertOfficeToPdf(fileBuffer, originalName, 'excel');
}

module.exports = {
  convertOfficeToPdf,
  wordToPdf,
  powerpointToPdf,
  excelToPdf,
  isOfficeConverterAvailable,
};
