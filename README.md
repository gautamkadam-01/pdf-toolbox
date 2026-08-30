# PDF Toolbox

A modern, fast, private, and 100% browser-native PDF utility platform.

## Key Features

- **100% In-Browser Execution**: All document processing, page extraction, merging, reordering, and text rendering occurs locally in the user's browser using `pdf-lib` and `pdfjs-dist`. Zero files or document data are uploaded to external servers.
- **Visual PDF Page Preview System**: Interactive page thumbnail grid for intuitive page manipulation (Remove, Reorder, Split, Extract, and Rotate).
- **26 Comprehensive Tools**:
  - **Organize**: Merge PDF, Split PDF, Remove Pages, Reorder Pages, Extract Pages, Rotate PDF, Crop Margins, Resize PDF.
  - **Convert**: PDF to JPG/PNG, JPG/PNG to PDF, PDF to TXT, TXT to PDF, Word to PDF, PowerPoint to PDF, Excel to PDF, HTML to PDF.
  - **Edit & Annotate**: Watermark PDF, Page Numbers, Sign PDF, Edit Metadata, Redact PDF.
  - **Security & Optimize**: Compress PDF, OCR PDF, Protect PDF, Unlock PDF, Extract Images.
- **Interactive Document Studio**: Quick access command palette (`⌘K` / `Ctrl+K`), live recent document history, drag-and-drop workspace, and responsive design.

## Architecture

- **Framework**: React 18 + Vite + TypeScript + Tailwind CSS
- **PDF Engine**: `pdf-lib` for document compilation, merging, metadata, and stamping; `pdfjs-dist` for high-fidelity canvas rendering and text extraction.
- **Archive Generator**: `JSZip` for multi-file bundle creation (split pages, rendered image sets).
- **Icons**: `lucide-react`
