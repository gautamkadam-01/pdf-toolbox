# PDF Toolbox — Backend Core Engine (Phase 2)

Enterprise-grade Node.js/Express PDF processing engine for PDF Toolbox.

---

## 1. Architecture Overview

PDF Toolbox separates concerns across a clean 5-tier architecture:

```
Client (Web / API / curl)
       ↓
Express HTTP Routing & Versioning (/api/v1/pdf/*)
       ↓
Middleware Layer (Helmet, CORS, Morgan, Multer Memory Storage, Upload Validators)
       ↓
PDF Controllers (Validation, Response Formatting, Resource Cleanup)
       ↓
Core PDF Services (pdf-lib, @napi-rs/canvas, pdfjs-dist, JSZip)
       ↓
Storage Abstraction Layer (Local temp directory with automatic lifecycle cleanup)
```

---

## 2. Page Range Syntax Reference

PDF Toolbox operations (`split`, `rotate`, `remove-pages`, `extract-pages`, `watermark`, `to-jpg`) support standard page selection expressions:

| Syntax Expression | Example | Behavior |
| :--- | :--- | :--- |
| Single Page | `3` | Targets only page 3. |
| Page List | `1, 3, 5` | Targets pages 1, 3, and 5. Whitespace is ignored. |
| Inclusive Range | `2-5` | Targets pages 2, 3, 4, and 5. |
| Mixed Combination | `1-3, 5, 8-10` | Targets pages 1, 2, 3, 5, 8, 9, 10. |
| Keyword | `all` | Targets all pages in the document. |
| Custom Order | `5, 2, 3` | (Extract mode): Extracts pages in requested sequence: 5 first, then 2, then 3. |

*Note: All page numbers are 1-indexed. Out-of-bounds page numbers return a structured `400 INVALID_PAGE_NUMBER` error.*

---

## 3. Core PDF Processing Endpoints (All 8 Operations)

### 3.1. Merge PDF
Merges two or more PDF files into a single unified PDF document in the exact upload order.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/merge`
- **Input**: `multipart/form-data` with multiple files (field name `files` or `file`)
- **Parameters**: None
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="merged.pdf"`)
- **Error Codes**: `TOO_FEW_FILES` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/merge \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.pdf" \
  --output merged.pdf
```

---

### 3.2. Split PDF
Splits a PDF into page ranges. If a single range is requested, returns a single PDF. If multiple ranges are specified, returns a ZIP archive containing each named split part.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/split`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `ranges` or `pages` (form-data field or query string): Page ranges to extract into separate documents (e.g. `1-2, 3-5`).
- **Success Response**: 
  - Single range: `Content-Type: application/pdf` (`split-001.pdf`)
  - Multiple ranges: `Content-Type: application/zip` (`split-archive.zip`)
- **Error Codes**: `NO_FILE` (400), `INVALID_PAGE_NUMBER` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/split \
  -F "file=@presentation.pdf" \
  -F "ranges=1-2, 3-5" \
  --output split_results.zip
```

---

### 3.3. JPG to PDF
Converts one or more JPEG or PNG images into a clean, standard PDF document.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/jpg-to-pdf`
- **Input**: `multipart/form-data` with 1+ image files (`files` or `file`)
- **Parameters**:
  - `pageSize` (optional): `'fit'` (matches exact image aspect ratio) or `'a4'` (scales inside standard A4 page). Default is `'fit'`.
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `filename="jpg-to-pdf.pdf"`)
- **Error Codes**: `NO_FILE` (400), `INVALID_IMAGE` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/jpg-to-pdf \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  --output photos.pdf
```

---

### 3.4. PDF to JPG
Renders PDF pages to high-resolution JPEG images. Returns a single JPEG for 1-page extractions or a ZIP archive containing sequenced `page-001.jpg`, `page-002.jpg` files for multi-page documents.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/to-jpg`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `pages` (optional): Pages to render (default `'all'`, e.g. `'1'`, `'1-3'`).
- **Success Response**: 
  - 1 page: `Content-Type: image/jpeg` (`page-001.jpg`)
  - 2+ pages: `Content-Type: application/zip` (`pdf-to-jpg.zip`)
- **Error Codes**: `NO_FILE` (400), `INVALID_PAGE_NUMBER` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/to-jpg \
  -F "file=@report.pdf" \
  --output rendered_pages.zip
```

---

### 3.5. Rotate PDF
Rotates specified or all pages of a PDF document by 90, 180, or 270 degrees.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/rotate`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `rotation` or `angle` (required): `90`, `180`, or `270`
  - `pages` (optional): Pages to rotate (default `'all'`, or `'1,3'`, `'2-4'`)
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `filename="rotated.pdf"`)
- **Error Codes**: `INVALID_ROTATION` (400), `INVALID_PAGE_NUMBER` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/rotate \
  -F "file=@document.pdf" \
  -F "rotation=90" \
  -F "pages=all" \
  --output rotated.pdf
```

---

### 3.6. Remove Pages
Deletes specified pages or ranges from a PDF while preserving all other pages and document structure.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/remove-pages`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `pages` (required): Pages to delete (e.g. `'2'`, `'2,4'`, `'1-3'`)
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `filename="removed-pages.pdf"`)
- **Error Codes**: `NO_PAGES_REMAIN` (400), `INVALID_PAGE_NUMBER` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/remove-pages \
  -F "file=@document.pdf" \
  -F "pages=2,4" \
  --output pruned.pdf
```

---

### 3.7. Extract Pages
Extracts specified pages into a new PDF document in the exact requested sequence.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/extract-pages`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `pages` (required): Pages to extract (e.g. `'1,3,5'`, `'5,2,1'`)
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `filename="extracted-pages.pdf"`)
- **Error Codes**: `INVALID_PAGE_RANGE` (400), `INVALID_PAGE_NUMBER` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/extract-pages \
  -F "file=@handbook.pdf" \
  -F "pages=1,3-5" \
  --output excerpt.pdf
```

---

### 3.8. Watermark PDF
Applies custom text watermarks with adjustable position, opacity, and rotation across all or selected pages.

- **Method**: `POST`
- **Route**: `/api/v1/pdf/watermark`
- **Input**: `multipart/form-data` with 1 PDF file
- **Parameters**:
  - `text` (required): Watermark string (e.g. `'CONFIDENTIAL'`, `'DRAFT'`)
  - `opacity` (optional): Decimal between `0.0` and `1.0` (default `0.3`)
  - `rotation` (optional): Angle in degrees (default `45`)
  - `position` (optional): `'center'`, `'top-left'`, `'top-center'`, `'top-right'`, `'bottom-left'`, `'bottom-center'`, `'bottom-right'` (default `'center'`)
  - `pages` (optional): Target pages (default `'all'`, or `'1,3'`)
- **Success Response**: Binary PDF stream (`Content-Type: application/pdf`, `filename="watermarked.pdf"`)
- **Error Codes**: `INVALID_WATERMARK_TEXT` (400), `INVALID_OPACITY` (400), `INVALID_PDF` (422)
- **Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/pdf/watermark \
  -F "file=@agreement.pdf" \
  -F "text=CONFIDENTIAL" \
  -F "opacity=0.4" \
  -F "position=center" \
  --output watermarked.pdf
```

---

## 4. Standard Error Response Schema

All error responses return structured JSON:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAGE_NUMBER",
    "message": "Page number out of bounds in '1-99'. Document has only 5 pages."
  }
}
```

Common Error Codes:
- `MISSING_FILE` / `NO_FILE` (400)
- `TOO_FEW_FILES` (400)
- `INVALID_PAGE_RANGE` (400)
- `INVALID_PAGE_NUMBER` (400)
- `INVALID_ROTATION` (400)
- `INVALID_OPACITY` (400)
- `NO_PAGES_REMAIN` (400)
- `INVALID_PDF` (422)
- `INVALID_IMAGE` (422)
- `OUTPUT_GENERATION_FAILED` (500)

---

## 5. Running Tests

```bash
cd backend
npm test
```

Executes:
1. `foundation.test.js`: 18/18 foundation, health, validation, and security tests.
2. `phase2.test.js`: 75/75 tests covering all 8 operations, edge cases, error conditions, and the 16-step critical regression pipeline.
