/**
 * Reusable File Upload Middleware
 * Configures Multer with controlled size limits and preliminary MIME checks.
 */

const multer = require('multer');
const { maxFileSizeBytes } = require('../config/env');

// Memory storage is used for secure validation and streamable in-memory buffers
const storage = multer.memoryStorage();

const allowedPdfMimeTypes = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'text/x-pdf',
  'application/octet-stream',
]);

const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/octet-stream',
]);

const allowedOfficeMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'application/zip',
]);

const allowedHtmlMimeTypes = new Set([
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/octet-stream',
]);

const pdfFileFilter = (req, file, cb) => {
  const isPdfExt = /\.pdf$/i.test(file.originalname);
  const isPdfMime = allowedPdfMimeTypes.has((file.mimetype || '').toLowerCase());

  if (isPdfExt || isPdfMime) {
    return cb(null, true);
  }

  const error = new Error(`Only PDF documents are accepted. Received MIME: '${file.mimetype}'.`);
  error.code = 'INVALID_MIME_TYPE';
  error.status = 400;
  return cb(error, false);
};

const imageFileFilter = (req, file, cb) => {
  const isImageExt = /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.originalname);
  const isImageMime = allowedImageMimeTypes.has((file.mimetype || '').toLowerCase());

  if (isImageExt || isImageMime) {
    return cb(null, true);
  }

  const error = new Error(`Only image files (JPEG, PNG, WebP) are accepted. Received MIME: '${file.mimetype}'.`);
  error.code = 'INVALID_MIME_TYPE';
  error.status = 400;
  return cb(error, false);
};

const officeFileFilter = (req, file, cb) => {
  const isOfficeExt = /\.(docx?|pptx?|xlsx?)$/i.test(file.originalname);
  const isOfficeMime = allowedOfficeMimeTypes.has((file.mimetype || '').toLowerCase());

  if (isOfficeExt || isOfficeMime) {
    return cb(null, true);
  }

  const error = new Error(`Only Microsoft Office documents (.docx, .doc, .pptx, .ppt, .xlsx, .xls) are accepted.`);
  error.code = 'INVALID_MIME_TYPE';
  error.status = 400;
  return cb(error, false);
};

const htmlFileFilter = (req, file, cb) => {
  const isHtmlExt = /\.(html?|xhtml)$/i.test(file.originalname);
  const isHtmlMime = allowedHtmlMimeTypes.has((file.mimetype || '').toLowerCase());

  if (isHtmlExt || isHtmlMime) {
    return cb(null, true);
  }

  const error = new Error(`Only HTML files (.html, .htm) are accepted.`);
  error.code = 'INVALID_MIME_TYPE';
  error.status = 400;
  return cb(error, false);
};

const anyFileFilter = (req, file, cb) => {
  cb(null, true);
};

const pdfUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: pdfFileFilter,
});

const imageUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: imageFileFilter,
});

const officeUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: officeFileFilter,
});

const htmlUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: htmlFileFilter,
});

const flexibleUpload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes },
  fileFilter: anyFileFilter,
});

module.exports = {
  upload: pdfUpload,
  singlePdf: (fieldName = 'file') => pdfUpload.single(fieldName),
  multiplePdfs: (fieldName = 'files', maxCount = 50) => pdfUpload.array(fieldName, maxCount),
  pdfFields: () => pdfUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 50 },
    { name: 'document', maxCount: 1 },
  ]),
  imageFields: () => imageUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 50 },
    { name: 'images', maxCount: 50 },
    { name: 'image', maxCount: 1 },
  ]),
  officeFields: () => officeUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
    { name: 'document', maxCount: 1 },
  ]),
  htmlFields: () => htmlUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
    { name: 'html', maxCount: 1 },
  ]),
  anyUpload: () => flexibleUpload.any(),
};
