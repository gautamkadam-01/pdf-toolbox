import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFTool, ProcessedItem } from '../types/tool';
import { DynamicIcon } from './DynamicIcon';
import { PdfPagePreview, PageItem } from './PdfPagePreview';
import {
  mergePDFs,
  splitPDF,
  removePagesFromPDF,
  reorderPDFPages,
  extractPagesFromPDF,
  rotatePDF,
  addWatermarkToPDF,
  addPageNumbersToPDF,
  cropPDF,
  resizePDF,
  imagesToPDF,
  textToPDF,
  renderPdfToImages,
  extractTextFromPDF,
  signPDF,
  editPDFMetadata,
  readPDFMetadata,
  PageDimensionName,
  validatePagePermutation,
  comparePdfDocuments,
  validatePdfFile,
  PdfComparisonResult,
  parsePageRangeStrict,
  protectPdf,
  unlockPdf,
  redactPdf,
  RedactionRegion,
} from '../lib/pdf';
import { PdfCompareViewer } from './PdfCompareViewer';
import { RedactionCanvas } from './RedactionCanvas';
import { loadPdfThumbnails } from '../lib/pdf/thumbnails';
import {
  compressPdf,
  wordToPdf,
  powerpointToPdf,
  excelToPdf,
  htmlToPdf,
  extractImages,
  protectPdfApi,
  unlockPdfApi,
  redactPdfApi,
  getFriendlyErrorMessage,
} from '../lib/api/pdfApi';
import {
  X,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Shield,
  FileText,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Clock,
  Archive,
  Copy,
  Check,
  RotateCw,
  Eye,
  EyeOff,
  Layers,
  FileImage,
  PenTool,
  Hash,
  Stamp,
  Scissors,
  Plus,
  ArrowUpDown,
  RotateCcw,
  GitCompare,
  FileDiff,
  ArrowLeftRight,
  Sparkles,
  FileCheck,
  Image as ImageIcon,
  Type,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  Code,
  Layout,
} from 'lucide-react';

const HTML_TEMPLATES = [
  {
    id: 'document',
    name: 'Clean Document',
    description: 'Minimal article with header and tags',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; background: #ffffff; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { color: #0f172a; font-size: 26px; margin: 0 0 8px 0; }
    p { line-height: 1.6; font-size: 14px; color: #475569; margin: 0 0 12px 0; }
    .badge { display: inline-block; padding: 4px 10px; background: #f0fdf4; color: #166534; border-radius: 6px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Document Title</h1>
    <span class="badge">Verified PDF Layout</span>
  </div>
  <p>Rendered with high fidelity HTML, CSS styling, and customized paper dimensions.</p>
</body>
</html>`,
  },
  {
    id: 'invoice',
    name: 'Modern Invoice',
    description: 'Formatted invoice with table and totals',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; background: #ffffff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .inv-num { color: #64748b; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f8fafc; color: #334155; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .total-box { margin-top: 20px; text-align: right; }
    .total-amount { font-size: 20px; font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">INVOICE</div>
      <div class="inv-num">Invoice #: INV-2026-089</div>
    </div>
    <div style="text-align: right;">
      <strong>Acme Corporation</strong><br>
      <span style="font-size: 12px; color: #64748b;">billing@acme.com</span>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      <tr><td>PDF Processing API License</td><td>1</td><td>$299.00</td><td>$299.00</td></tr>
      <tr><td>Custom Chromium Conversion Engine</td><td>2</td><td>$150.00</td><td>$300.00</td></tr>
    </tbody>
  </table>
  <div class="total-box">
    <div style="font-size: 13px; color: #64748b;">Total Due:</div>
    <div class="total-amount">$599.00 USD</div>
  </div>
</body>
</html>`,
  },
  {
    id: 'report',
    name: 'Executive Report',
    description: 'Multi-section document with highlights',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; line-height: 1.7; padding: 36px; color: #2d3748; }
    .hero { background: #1a202c; color: white; padding: 28px; border-radius: 8px; margin-bottom: 28px; }
    h1 { color: #63b3ed; margin: 0 0 8px 0; font-size: 26px; }
    h2 { color: #2b6cb0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; font-size: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .card { background: #f7fafc; border: 1px solid #edf2f7; padding: 16px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Quarterly Performance Report</h1>
    <p style="margin: 0; color: #a0aec0; font-size: 14px;">High fidelity document generated via PDF Toolbox</p>
  </div>
  <h2>1. Executive Summary</h2>
  <p>All core infrastructure and rendering systems operated at 99.98% reliability with pixel-perfect output fidelity.</p>
  <div class="grid">
    <div class="card">
      <strong>Total Documents:</strong> 128,450<br>
      <span style="font-size: 12px; color: #718096;">+18.4% vs previous quarter</span>
    </div>
    <div class="card">
      <strong>Avg Render Time:</strong> 1.2s<br>
      <span style="font-size: 12px; color: #718096;">Optimized Chromium pipeline</span>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: 'table',
    name: 'Data Table',
    description: 'Structured grid with status tags',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 28px; }
    h2 { color: #0f172a; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; font-size: 12px; text-align: left; }
    th { background: #0f172a; color: white; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .active { background: #dcfce7; color: #15803d; }
  </style>
</head>
<body>
  <h2>System Inventory & Records</h2>
  <table>
    <thead>
      <tr><th>ID</th><th>Service / Module</th><th>Format</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>#001</td><td>Word to PDF Engine</td><td>DOCX</td><td><span class="badge active">Operational</span></td></tr>
      <tr><td>#002</td><td>PowerPoint to PDF</td><td>PPTX</td><td><span class="badge active">Operational</span></td></tr>
      <tr><td>#003</td><td>Excel to PDF Engine</td><td>XLSX</td><td><span class="badge active">Operational</span></td></tr>
      <tr><td>#004</td><td>HTML to PDF Pipeline</td><td>HTML / CSS</td><td><span class="badge active">Operational</span></td></tr>
    </tbody>
  </table>
</body>
</html>`,
  },
];

interface WorkspaceModalProps {
  tool: PDFTool | null;
  onClose: () => void;
  onSaveProcessed: (item: ProcessedItem) => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  tool,
  onClose,
  onSaveProcessed,
}) => {
  // Input State
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // PDF Page Previews state
  const [pageItems, setPageItems] = useState<PageItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [totalPagesCount, setTotalPagesCount] = useState(0);

  // Result state
  const [processedOutputs, setProcessedOutputs] = useState<
    { name: string; url: string; size: number; type: string }[]
  >([]);

  // Extracted text preview state (for PDF to Text)
  const [extractedTextPreview, setExtractedTextPreview] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Specific Tool Settings
  // Split
  const [splitMode, setSplitMode] = useState<'range' | 'every_n' | 'each_page'>('range');
  const [splitRange, setSplitRange] = useState('1-3');
  const [splitEveryN, setSplitEveryN] = useState(2);

  // Remove Pages
  const [removePagesRange, setRemovePagesRange] = useState('');

  // Reorder Pages
  const [reorderSeq, setReorderSeq] = useState('');

  // Extract Pages
  const [extractPagesRange, setExtractPagesRange] = useState('');

  // Rotate
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [rotateTarget, setRotateTarget] = useState<'all' | 'custom'>('all');
  const [rotateCustomPages, setRotateCustomPages] = useState('1');

  // Watermark
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkPosition, setWatermarkPosition] = useState<string>('center');
  const [watermarkTarget, setWatermarkTarget] = useState<'all' | 'first' | 'last' | 'custom'>('all');
  const [watermarkCustomPages, setWatermarkCustomPages] = useState('1');
  const [watermarkFontSize, setWatermarkFontSize] = useState(36);

  // Page Numbers
  const [pageNumberFormat, setPageNumberFormat] = useState('Page {n} of {total}');
  const [pageNumberStart, setPageNumberStart] = useState(1);
  const [pageNumberPos, setPageNumberPos] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left'
  >('bottom-center');
  const [pageNumberFontSize, setPageNumberFontSize] = useState(10);

  // Crop
  const [cropTop, setCropTop] = useState(36);
  const [cropRight, setCropRight] = useState(36);
  const [cropBottom, setCropBottom] = useState(36);
  const [cropLeft, setCropLeft] = useState(36);
  const [cropUnit, setCropUnit] = useState<'pt' | 'mm' | 'in'>('pt');
  const [cropUniform, setCropUniform] = useState(true);
  const [cropTargetMode, setCropTargetMode] = useState<'all' | 'first' | 'last' | 'specific'>('all');
  const [cropPageRange, setCropPageRange] = useState('');

  // Resize
  const [resizePageSize, setResizePageSize] = useState<PageDimensionName>('A4');
  const [resizeOrientation, setResizeOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Images to PDF
  const [imagePageSize, setImagePageSize] = useState<'fit' | 'a4'>('fit');
  const [imagePreviews, setImagePreviews] = useState<{ file: File; url: string }[]>([]);

  // Text to PDF
  const [textInput, setTextInput] = useState('');
  const [textFontSize, setTextFontSize] = useState(10);

  // PDF to Images
  const [imageExportFormat, setImageExportFormat] = useState<'png' | 'jpeg'>('png');

  // Compress PDF
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savedBytes: number;
    savedPercentage: number;
  } | null>(null);

  // HTML to PDF
  const [htmlPageSize, setHtmlPageSize] = useState<'A4' | 'Letter' | 'Legal' | 'A3' | 'A5'>('A4');
  const [htmlOrientation, setHtmlOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [htmlMargin, setHtmlMargin] = useState<number>(10);
  const [htmlInputMode, setHtmlInputMode] = useState<'file' | 'code'>('file');
  const [htmlCodeInput, setHtmlCodeInput] = useState<string>(
    '<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; color: #333; }\n    h1 { color: #dc2626; border-bottom: 2px solid #eee; padding-bottom: 8px; }\n    p { line-height: 1.6; font-size: 14px; }\n  </style>\n</head>\n<body>\n  <h1>PDF Document Header</h1>\n  <p>Rendered directly with HTML, CSS, and clean typography styling.</p>\n</body>\n</html>'
  );

  // PDF Compare
  const [compareOldFile, setCompareOldFile] = useState<File | null>(null);
  const [compareNewFile, setCompareNewFile] = useState<File | null>(null);
  const [compareMode, setCompareMode] = useState<'side-by-side' | 'overlay' | 'diff'>('side-by-side');
  const [compareSensitivity, setCompareSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [compareIgnorePageOrder, setCompareIgnorePageOrder] = useState<boolean>(false);
  const [compareTextChanges, setCompareTextChanges] = useState<boolean>(true);
  const [compareVisualLayout, setCompareVisualLayout] = useState<boolean>(true);
  const [compareNotice, setCompareNotice] = useState<string | null>(null);
  const [compareOldError, setCompareOldError] = useState<string | null>(null);
  const [compareNewError, setCompareNewError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<PdfComparisonResult | null>(null);
  const oldFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const handleSetCompareOldFile = async (f: File) => {
    setCompareOldError(null);
    setCompareNotice(null);
    setCompareResult(null);
    setProcessedOutputs([]);
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setCompareOldError('Invalid PDF file. Please upload a valid PDF document.');
      return;
    }
    const val = await validatePdfFile(f);
    if (!val.isValid) {
      setCompareOldError(val.error || 'Invalid PDF file. Please upload a valid PDF document.');
      return;
    }
    setCompareOldFile(f);
  };

  const handleSetCompareNewFile = async (f: File) => {
    setCompareNewError(null);
    setCompareNotice(null);
    setCompareResult(null);
    setProcessedOutputs([]);
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setCompareNewError('Invalid PDF file. Please upload a valid PDF document.');
      return;
    }
    const val = await validatePdfFile(f);
    if (!val.isValid) {
      setCompareNewError(val.error || 'Invalid PDF file. Please upload a valid PDF document.');
      return;
    }
    setCompareNewFile(f);
  };

  // Metadata
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [metaCreator, setMetaCreator] = useState('PDF Toolbox');

  // Signature
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const [sigInputMode, setSigInputMode] = useState<'draw' | 'upload' | 'type'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigColor, setSigColor] = useState('#000000');
  const [hasSignature, setHasSignature] = useState(false);
  const [sigDataUrl, setSigDataUrl] = useState('');
  const [sigUploadedName, setSigUploadedName] = useState('');
  const [sigTypedText, setSigTypedText] = useState('');
  const [sigTargetPage, setSigTargetPage] = useState<'last' | 'first' | 'all' | 'custom'>('last');
  const [sigCustomPages, setSigCustomPages] = useState('1');
  const [sigPlacement, setSigPlacement] = useState<
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'center'
    | 'top-right'
    | 'top-left'
    | 'top-center'
  >('bottom-right');
  const [sigSize, setSigSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Drag-and-drop reorder state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);

  // Protect PDF state
  const [protectPassword, setProtectPassword] = useState('');
  const [protectConfirmPassword, setProtectConfirmPassword] = useState('');
  const [protectShowPassword, setProtectShowPassword] = useState(false);
  const [protectAlgorithm, setProtectAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [protectAllowPrinting, setProtectAllowPrinting] = useState(true);
  const [protectAllowCopying, setProtectAllowCopying] = useState(false);
  const [protectAllowModifying, setProtectAllowModifying] = useState(false);
  const [protectAllowAnnotating, setProtectAllowAnnotating] = useState(false);

  // Unlock PDF state
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockShowPassword, setUnlockShowPassword] = useState(false);

  // Redact PDF state
  const [redactions, setRedactions] = useState<RedactionRegion[]>([]);
  const [redactColor, setRedactColor] = useState('#000000');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs on unmount or reset
  const cleanupObjectUrls = useCallback(() => {
    createdObjectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
    });
    createdObjectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, [cleanupObjectUrls]);

  // Reset tool state when tool changes
  useEffect(() => {
    if (tool) {
      cleanupObjectUrls();
      setFiles([]);
      setIsProcessing(false);
      setProgress(0);
      setProgressStatus('');
      setProcessedOutputs([]);
      setExtractedTextPreview(null);
      setError(null);
      setTextInput('');
      setPageItems([]);
      setImagePreviews([]);
      setMetaTitle(`${tool.name} Output`);
      setMetaAuthor('PDF Toolbox');
      setMetaSubject('');
      setMetaKeywords('');
      setHasSignature(false);
      setCompressionStats(null);
      setCompressionLevel('medium');
      setHtmlInputMode('file');
      setCropTop(36);
      setCropRight(36);
      setCropBottom(36);
      setCropLeft(36);
      setCropUnit('pt');
      setCropUniform(true);
      setCropTargetMode('all');
      setCropPageRange('');
      setCompareOldFile(null);
      setCompareNewFile(null);
      setCompareMode('side-by-side');
      setCompareSensitivity('medium');
      setCompareIgnorePageOrder(false);
      setCompareTextChanges(true);
      setCompareVisualLayout(true);
      setCompareNotice(null);
      setCompareOldError(null);
      setCompareNewError(null);
      setCompareResult(null);
      setProtectPassword('');
      setProtectConfirmPassword('');
      setProtectShowPassword(false);
      setProtectAlgorithm('AES-256');
      setProtectAllowPrinting(true);
      setProtectAllowCopying(false);
      setProtectAllowModifying(false);
      setProtectAllowAnnotating(false);
      setUnlockPassword('');
      setUnlockShowPassword(false);
      setRedactions([]);
      setRedactColor('#000000');
      if (oldFileInputRef.current) oldFileInputRef.current.value = '';
      if (newFileInputRef.current) newFileInputRef.current.value = '';
      clearSignatureCanvas();
    }
  }, [tool, cleanupObjectUrls]);

  // Focus trap / Keyboard shortcut to close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load PDF page thumbnails and metadata when file is selected
  useEffect(() => {
    let isCancelled = false;

    async function loadDocumentDetails() {
      if (files.length === 0 || !files[0].name.toLowerCase().endsWith('.pdf')) {
        setPageItems([]);
        setTotalPagesCount(0);
        return;
      }

      // Check if this tool benefits from page thumbnails
      const needsPages = [
        'split',
        'remove_pages',
        'reorder_pages',
        'extract_pages',
        'rotate',
        'watermark',
        'page_numbers',
        'sign',
      ].includes(tool?.optionsType || '');

      if (needsPages) {
        setIsLoadingPages(true);
        try {
          const thumbs = await loadPdfThumbnails(files[0], 40);
          if (isCancelled) return;

          setTotalPagesCount(thumbs.length);

          const items: PageItem[] = thumbs.map((t, idx) => ({
            id: `page-item-${t.pageNumber}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
            pageNumber: t.pageNumber,
            displayIndex: idx + 1,
            dataUrl: t.dataUrl,
            rotation: 0,
            selected: tool?.optionsType === 'extract_pages' ? idx === 0 : false,
            markedForRemoval: false,
            isLoading: false,
          }));

          setPageItems(items);

          // Initialize defaults based on loaded pages
          if (tool?.optionsType === 'remove_pages') {
            setRemovePagesRange('');
          } else if (tool?.optionsType === 'reorder_pages') {
            setReorderSeq(items.map((it) => it.pageNumber).join(', '));
          } else if (tool?.optionsType === 'extract_pages') {
            setExtractPagesRange('1');
          } else if (tool?.optionsType === 'split') {
            setSplitRange(items.length > 1 ? `1-${Math.min(3, items.length)}` : '1');
          }
        } catch (e) {
          console.warn('Could not load thumbnails:', e);
        } finally {
          if (!isCancelled) setIsLoadingPages(false);
        }
      }

      // Load existing metadata for metadata editor
      if (tool?.optionsType === 'metadata') {
        try {
          const meta = await readPDFMetadata(files[0]);
          if (!isCancelled) {
            if (meta.title) setMetaTitle(meta.title);
            if (meta.author) setMetaAuthor(meta.author);
            if (meta.subject) setMetaSubject(meta.subject);
            if (meta.keywords) setMetaKeywords(meta.keywords);
            if (meta.creator) setMetaCreator(meta.creator);
          }
        } catch (e) {
          console.warn('Could not read existing metadata:', e);
        }
      }
    }

    loadDocumentDetails();

    return () => {
      isCancelled = true;
    };
  }, [files, tool]);

  // Generate previews for images-to-pdf
  useEffect(() => {
    if (tool?.optionsType === 'from_images' && files.length > 0) {
      const previews = files.map((f) => {
        const url = URL.createObjectURL(f);
        createdObjectUrlsRef.current.push(url);
        return { file: f, url };
      });
      setImagePreviews(previews);
    } else {
      setImagePreviews([]);
    }
  }, [files, tool]);

  const clearSignatureCanvas = () => {
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
      }
    }
    setHasSignature(false);
    setSigDataUrl('');
    setSigUploadedName('');
    setSigTypedText('');
    setProcessedOutputs([]);
    setError(null);
    if (sigFileInputRef.current) {
      sigFileInputRef.current.value = '';
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG or JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setSigDataUrl(dataUrl);
        setSigUploadedName(file.name);
        setHasSignature(true);
        setProcessedOutputs([]);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTypedSignatureChange = (text: string, color: string) => {
    setSigTypedText(text);
    setProcessedOutputs([]);
    setError(null);
    if (!text.trim()) {
      setSigDataUrl('');
      setHasSignature(false);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = 'italic 52px "Brush Script MT", "Dancing Script", "Caveat", "Segoe Script", cursive';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text.trim(), canvas.width / 2, canvas.height / 2);
      const dataUrl = canvas.toDataURL('image/png');
      setSigDataUrl(dataUrl);
      setHasSignature(true);
    } catch {
      // fallback
    }
  };

  // Drag & drop handlers for page reordering
  const handleDragStart = (index: number) => {
    setDraggedPageIndex(index);
    setProcessedOutputs([]);
    setError(null);
  };

  const handleDragOverTarget = (index: number) => {
    if (draggedPageIndex !== null && draggedPageIndex !== index) {
      setDragOverPageIndex((prev) => (prev === index ? prev : index));
    }
  };

  const handleDropTarget = (targetIndex: number) => {
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) {
      setDraggedPageIndex(null);
      setDragOverPageIndex(null);
      return;
    }
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      if (
        draggedPageIndex < 0 ||
        draggedPageIndex >= prev.length ||
        targetIndex < 0 ||
        targetIndex >= prev.length
      ) {
        return prev;
      }
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedPageIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      const reindexed = updated.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
    setDraggedPageIndex(null);
    setDragOverPageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedPageIndex(null);
    setDragOverPageIndex(null);
  };

  if (!tool) return null;

  // File validation function
  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null);
    if (!newFiles || newFiles.length === 0) return;

    const validFiles: File[] = [];
    for (const f of newFiles) {
      if (f.size === 0) {
        setError(`File "${f.name}" is empty (0 bytes).`);
        continue;
      }
      if (f.size > 150 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 150MB browser processing limit.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    if (tool.multipleFiles) {
      setFiles((prev) => [...prev, ...validFiles]);
    } else {
      if (tool.optionsType === 'redact') {
        setRedactions([]);
        setProcessedOutputs([]);
      }
      setFiles([validFiles[0]]);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (tool.optionsType === 'redact') {
      setRedactions([]);
      setProcessedOutputs([]);
    }
  };

  const moveFileOrder = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const next = [...files];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setFiles(next);
    } else if (direction === 'down' && index < files.length - 1) {
      const next = [...files];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setFiles(next);
    }
  };

  // Page interaction handlers
  const handleToggleRemovePage = (pageNum: number) => {
    setPageItems((prev) => {
      const updated = prev.map((item) =>
        item.pageNumber === pageNum ? { ...item, markedForRemoval: !item.markedForRemoval } : item
      );
      const removedNumbers = updated
        .filter((item) => item.markedForRemoval)
        .map((item) => item.pageNumber);
      setRemovePagesRange(removedNumbers.join(', '));
      return updated;
    });
  };

  const handleToggleSelectPage = (pageNum: number) => {
    setPageItems((prev) => {
      const updated = prev.map((item) =>
        item.pageNumber === pageNum ? { ...item, selected: !item.selected } : item
      );
      const selectedNumbers = updated
        .filter((item) => item.selected)
        .map((item) => item.pageNumber);
      
      if (tool.optionsType === 'extract_pages') {
        setExtractPagesRange(selectedNumbers.join(', '));
      } else if (tool.optionsType === 'split') {
        setSplitRange(selectedNumbers.join(', '));
      }
      return updated;
    });
  };

  const handleMovePage = (index: number, direction: 'left' | 'right' | 'first' | 'last') => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      let targetIdx = index;
      if (direction === 'left') targetIdx = index - 1;
      else if (direction === 'right') targetIdx = index + 1;
      else if (direction === 'first') targetIdx = 0;
      else if (direction === 'last') targetIdx = prev.length - 1;

      if (targetIdx < 0 || targetIdx >= prev.length || targetIdx === index) return prev;

      const updated = [...prev];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(targetIdx, 0, movedItem);

      const reindexed = updated.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
  };

  // Quick Sort Actions for Reordering Pages (Single Source of Truth)
  const handleSortAscending = () => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.pageNumber - b.pageNumber);
      const reindexed = sorted.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
  };

  const handleSortDescending = () => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      const sorted = [...prev].sort((a, b) => b.pageNumber - a.pageNumber);
      const reindexed = sorted.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
  };

  const handleReverseOrder = () => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      const reversed = [...prev].reverse();
      const reindexed = reversed.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
  };

  const handleResetOrder = () => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.pageNumber - b.pageNumber);
      const reindexed = sorted.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      return reindexed;
    });
  };

  // Synchronize manual text input with pageItems array
  const handleReorderSeqChange = (val: string) => {
    setReorderSeq(val);
    setProcessedOutputs([]);
    setError(null);

    const parsedNums = val
      .split(/[,;\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (pageItems.length > 0 && parsedNums.length === pageItems.length) {
      const total = pageItems.length;
      const validation = validatePagePermutation(parsedNums, total);
      if (validation.valid) {
        const itemMap = new Map<number, PageItem>();
        pageItems.forEach((it) => itemMap.set(it.pageNumber, it));
        const reorderedItems: PageItem[] = [];
        for (const num of parsedNums) {
          const item = itemMap.get(num);
          if (item) reorderedItems.push(item);
        }
        if (reorderedItems.length === total) {
          const reindexed = reorderedItems.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
          setPageItems(reindexed);
        }
      }
    }
  };

  const applyReorderSeqInput = () => {
    setProcessedOutputs([]);
    setError(null);
    const parsedNums = reorderSeq
      .split(/[,;\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (pageItems.length === 0) return;

    const total = pageItems.length;
    const validation = validatePagePermutation(parsedNums, total);
    if (!validation.valid) {
      setError(validation.error || `Please enter all page numbers from 1 to ${total} exactly once.`);
      return;
    }

    const itemMap = new Map<number, PageItem>();
    pageItems.forEach((it) => itemMap.set(it.pageNumber, it));
    const reorderedItems: PageItem[] = [];
    for (const num of parsedNums) {
      const item = itemMap.get(num);
      if (item) reorderedItems.push(item);
    }
    if (reorderedItems.length === total) {
      const reindexed = reorderedItems.map((item, idx) => ({ ...item, displayIndex: idx + 1 }));
      setPageItems(reindexed);
      setReorderSeq(reindexed.map((it) => it.pageNumber).join(', '));
      setError(null);
    }
  };

  const handleRotatePage = (pageNum: number) => {
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) =>
      prev.map((item) => {
        if (item.pageNumber === pageNum) {
          const nextRot = ((item.rotation || 0) + 90) % 360;
          return { ...item, rotation: nextRot };
        }
        return item;
      })
    );
  };

  const handleRotateAllPages = (angle: 90 | 180 | 270) => {
    setRotationAngle(angle);
    setProcessedOutputs([]);
    setError(null);
    setPageItems((prev) =>
      prev.map((item) => ({ ...item, rotation: ((item.rotation || 0) + angle) % 360 }))
    );
  };

  const handleSelectRotateAngle = (angle: 90 | 180 | 270) => {
    setRotationAngle(angle);
    setProcessedOutputs([]);
    setError(null);
    if (rotateTarget === 'all') {
      setPageItems((prev) => prev.map((item) => ({ ...item, rotation: angle })));
    } else {
      const parsed = parsePageRangeStrict(rotateCustomPages, pageItems.length);
      if (parsed.valid) {
        const targetSet = new Set(parsed.indices);
        setPageItems((prev) =>
          prev.map((item, idx) => ({ ...item, rotation: targetSet.has(idx) ? angle : 0 }))
        );
      }
    }
  };

  const handleSelectRotateTarget = (target: 'all' | 'custom') => {
    setRotateTarget(target);
    setProcessedOutputs([]);
    setError(null);
    if (target === 'all') {
      setPageItems((prev) => prev.map((item) => ({ ...item, rotation: rotationAngle })));
    } else {
      const parsed = parsePageRangeStrict(rotateCustomPages, pageItems.length);
      const targetSet = new Set(parsed.valid ? parsed.indices : []);
      setPageItems((prev) =>
        prev.map((item, idx) => ({ ...item, rotation: targetSet.has(idx) ? rotationAngle : 0 }))
      );
    }
  };

  const handleRotateCustomPagesChange = (val: string) => {
    setRotateCustomPages(val);
    setProcessedOutputs([]);
    setError(null);
    const parsed = parsePageRangeStrict(val, pageItems.length);
    if (parsed.valid) {
      const targetSet = new Set(parsed.indices);
      setPageItems((prev) =>
        prev.map((item, idx) => ({ ...item, rotation: targetSet.has(idx) ? rotationAngle : 0 }))
      );
    }
  };

  // Reset workspace to initial clean state
  const handleResetWorkspace = () => {
    cleanupObjectUrls();
    setFiles([]);
    setIsProcessing(false);
    setProgress(0);
    setProgressStatus('');
    setProcessedOutputs([]);
    setExtractedTextPreview(null);
    setError(null);
    setTextInput('');
    setPageItems([]);
    setImagePreviews([]);
    setHasSignature(false);
    setCompressionStats(null);
    setCompressionLevel('medium');
    setHtmlInputMode('file');
    setCropTop(36);
    setCropRight(36);
    setCropBottom(36);
    setCropLeft(36);
    setCropUnit('pt');
    setCropUniform(true);
    setCropTargetMode('all');
    setCropPageRange('');
    setCompareOldFile(null);
    setCompareNewFile(null);
    setCompareMode('side-by-side');
    setCompareSensitivity('medium');
    setCompareIgnorePageOrder(false);
    setCompareTextChanges(true);
    setCompareVisualLayout(true);
    setCompareNotice(null);
    setCompareOldError(null);
    setCompareNewError(null);
    setCompareResult(null);
    setPageNumberFormat('Page {n} of {total}');
    setPageNumberStart(1);
    setPageNumberPos('bottom-center');
    setPageNumberFontSize(10);
    if (oldFileInputRef.current) oldFileInputRef.current.value = '';
    if (newFileInputRef.current) newFileInputRef.current.value = '';
    clearSignatureCanvas();
  };

  // Signature Pointer Events (Mouse, Touch, Pen)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
      setSigDataUrl(canvas.toDataURL('image/png'));
    }
    setIsDrawing(false);
  };

  // Extract Pages Handlers & Synchronizers
  const handleExtractPagesRangeChange = (val: string) => {
    setExtractPagesRange(val);
    setProcessedOutputs([]);
    setError(null);
    if (pageItems.length > 0) {
      if (!val.trim()) {
        setPageItems((prev) => prev.map((item) => ({ ...item, selected: false })));
      } else {
        const parsed = parsePageRangeStrict(val, pageItems.length);
        if (parsed.valid) {
          const selectedIdxSet = new Set(parsed.indices);
          setPageItems((prev) =>
            prev.map((item, idx) => ({
              ...item,
              selected: selectedIdxSet.has(idx),
            }))
          );
        }
      }
    }
  };

  const handleSelectAllExtractPages = () => {
    setProcessedOutputs([]);
    setError(null);
    const total = pageItems.length;
    if (total <= 0) return;
    const range = total === 1 ? '1' : `1-${total}`;
    setExtractPagesRange(range);
    setPageItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const handleDeselectAllExtractPages = () => {
    setProcessedOutputs([]);
    setError(null);
    setExtractPagesRange('');
    setPageItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  const handleExtractOddPages = () => {
    setProcessedOutputs([]);
    setError(null);
    const odds = pageItems.filter((_, idx) => (idx + 1) % 2 === 1).map((p) => p.pageNumber);
    const range = odds.join(', ');
    setExtractPagesRange(range);
    setPageItems((prev) =>
      prev.map((item, idx) => ({ ...item, selected: (idx + 1) % 2 === 1 }))
    );
  };

  const handleExtractEvenPages = () => {
    setProcessedOutputs([]);
    setError(null);
    const evens = pageItems.filter((_, idx) => (idx + 1) % 2 === 0).map((p) => p.pageNumber);
    const range = evens.join(', ');
    setExtractPagesRange(range);
    setPageItems((prev) =>
      prev.map((item, idx) => ({ ...item, selected: (idx + 1) % 2 === 0 }))
    );
  };

  const handleExtractFirstHalf = () => {
    setProcessedOutputs([]);
    setError(null);
    const total = pageItems.length;
    if (total <= 0) return;
    const half = Math.ceil(total / 2);
    const range = half === 1 ? '1' : `1-${half}`;
    setExtractPagesRange(range);
    setPageItems((prev) =>
      prev.map((item, idx) => ({ ...item, selected: idx < half }))
    );
  };

  const handleExtractSecondHalf = () => {
    setProcessedOutputs([]);
    setError(null);
    const total = pageItems.length;
    if (total <= 0) return;
    const half = Math.ceil(total / 2);
    const start = half + 1;
    const range = start > total ? `${total}` : start === total ? `${total}` : `${start}-${total}`;
    setExtractPagesRange(range);
    setPageItems((prev) =>
      prev.map((item, idx) => ({ ...item, selected: idx >= half }))
    );
  };

  const handleClearHtmlCode = () => {
    setHtmlCodeInput('');
    setProcessedOutputs([]);
    setError(null);
  };

  const handleResetHtmlSample = () => {
    setHtmlCodeInput(HTML_TEMPLATES[0].code);
    setProcessedOutputs([]);
    setError(null);
  };

  const handleSelectHtmlTemplate = (templateId: string) => {
    const tmpl = HTML_TEMPLATES.find((t) => t.id === templateId) || HTML_TEMPLATES[0];
    setHtmlCodeInput(tmpl.code);
    setProcessedOutputs([]);
    setError(null);
  };

  const handleLoadUploadedFileToCode = async () => {
    if (files.length === 0) return;
    try {
      const text = await files[0].text();
      setHtmlCodeInput(text);
      setHtmlInputMode('code');
      setProcessedOutputs([]);
      setError(null);
    } catch {
      setError('Could not read HTML file text content.');
    }
  };

  // Main Processing Execution Engine
  const executeOperation = async () => {
    if (tool.status === 'coming-soon') {
      setError('This tool is currently in development and will be available in an upcoming release.');
      return;
    }

    // Mode-aware input validation
    if (tool.optionsType === 'pdf_compare') {
      if (!compareOldFile && !compareNewFile) {
        setError('Please upload the original PDF.');
        setCompareOldError('Please upload the original PDF.');
        return;
      }
      if (!compareOldFile) {
        setError('Please upload the original PDF.');
        setCompareOldError('Please upload the original PDF.');
        return;
      }
      if (!compareNewFile) {
        setError('Please upload the updated PDF.');
        setCompareNewError('Please upload the updated PDF.');
        return;
      }
      if (!compareTextChanges && !compareVisualLayout) {
        setError('Select at least one comparison method.');
        return;
      }
    } else if (tool.optionsType === 'html_to_pdf') {
      if (htmlInputMode === 'file') {
        if (files.length === 0) {
          setError('Please select an HTML file to proceed.');
          return;
        }
        const fileName = files[0].name.toLowerCase();
        if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
          setError('Please select a valid HTML file (.html or .htm) to proceed.');
          return;
        }
      } else if (htmlInputMode === 'code') {
        if (!htmlCodeInput || !htmlCodeInput.trim()) {
          setError('Enter HTML/CSS code before processing.');
          return;
        }
      }
    } else if (tool.optionsType === 'from_text') {
      const textData = textInput || (files[0] ? await files[0].text() : '');
      if (!textData.trim()) {
        setError('Please enter or upload text to compile into PDF.');
        return;
      }
    } else {
      if (files.length === 0) {
        setError('Please select at least one document to proceed.');
        return;
      }
    }

    setIsProcessing(true);
    setProgress(15);
    setProgressStatus('Initializing local processing engine...');
    setError(null);
    setProcessedOutputs([]);

    try {
      let result;

      switch (tool.optionsType) {
        case 'merge':
          if (files.length < 2) {
            setError('Please add at least 2 PDF files to merge.');
            setIsProcessing(false);
            return;
          }
          setProgress(40);
          setProgressStatus(`Merging ${files.length} PDF documents...`);
          result = await mergePDFs(files);
          break;

        case 'split':
          setProgress(40);
          setProgressStatus('Splitting PDF pages...');
          result = await splitPDF(files[0], {
            mode: splitMode,
            rangeStr: splitRange,
            everyN: splitEveryN,
          });
          break;

        case 'remove_pages': {
          setProgress(40);
          setProgressStatus('Removing specified pages...');
          const pagesToRemove = removePagesRange.trim() ||
            pageItems.filter((p) => p.markedForRemoval).map((p) => p.pageNumber).join(', ');
          
          if (!pagesToRemove) {
            setError('Please select at least one page to remove.');
            setIsProcessing(false);
            return;
          }
          result = await removePagesFromPDF(files[0], pagesToRemove);
          break;
        }

        case 'reorder_pages': {
          setProgress(40);
          setProgressStatus('Reordering PDF page structure...');
          
          let orderNumbers: number[] = [];
          if (pageItems.length > 0) {
            orderNumbers = pageItems.map((p) => p.pageNumber);
          } else {
            orderNumbers = reorderSeq
              .split(/[,;\s]+/)
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n));
          }

          if (orderNumbers.length === 0) {
            setError('Please specify the desired page order sequence.');
            setIsProcessing(false);
            return;
          }

          result = await reorderPDFPages(files[0], orderNumbers);
          break;
        }

        case 'extract_pages': {
          setProgress(40);
          setProgressStatus('Extracting selected pages...');
          const pagesToExtract = extractPagesRange.trim() ||
            pageItems.filter((p) => p.selected).map((p) => p.pageNumber).join(', ');
          
          if (!pagesToExtract) {
            setError('Select at least one page to extract.');
            setIsProcessing(false);
            return;
          }

          const pageRotMap: { [sourceZeroIdx: number]: number } = {};
          pageItems.forEach((item) => {
            pageRotMap[item.pageNumber - 1] = item.rotation || 0;
          });

          result = await extractPagesFromPDF(files[0], pagesToExtract, pageRotMap);
          break;
        }

        case 'rotate': {
          setProgress(40);
          setProgressStatus(`Rotating document pages...`);
          // Pass individual page rotations if user rotated single thumbnails
          const pageRotMap: { [sourceZeroIdx: number]: number } = {};
          pageItems.forEach((item) => {
            pageRotMap[item.pageNumber - 1] = item.rotation || 0;
          });

          result = await rotatePDF(files[0], {
            angle: rotationAngle,
            targetPages: rotateTarget,
            pageRangeStr: rotateCustomPages,
            pageRotations: pageRotMap,
          });
          break;
        }

        case 'watermark':
          setProgress(40);
          setProgressStatus('Applying watermark...');
          result = await addWatermarkToPDF(files[0], {
            text: watermarkText,
            opacity: watermarkOpacity,
            angle: watermarkRotation,
            position: watermarkPosition,
            fontSize: watermarkFontSize,
            targetPages: watermarkTarget,
            pageRangeStr: watermarkCustomPages,
          });
          break;

        case 'page_numbers':
          setProgress(40);
          setProgressStatus('Stamping page numbers...');
          result = await addPageNumbersToPDF(files[0], {
            format: pageNumberFormat,
            startNumber: pageNumberStart,
            position: pageNumberPos,
            fontSize: pageNumberFontSize,
          });
          break;

        case 'crop':
          if (cropTargetMode === 'specific') {
            if (!cropPageRange.trim()) {
              setError('Please enter a valid page range to crop (e.g. 1-3, 5).');
              setIsProcessing(false);
              return;
            }
            const rangeCheck = parsePageRangeStrict(cropPageRange, pageItems.length || 9999);
            if (!rangeCheck.valid) {
              setError(rangeCheck.error || 'Invalid page range specified.');
              setIsProcessing(false);
              return;
            }
          }
          setProgress(40);
          setProgressStatus('Adjusting PDF page margins and boundaries...');
          result = await cropPDF(files[0], {
            margins: {
              top: cropTop,
              right: cropRight,
              bottom: cropBottom,
              left: cropLeft,
            },
            targetMode: cropTargetMode,
            pageRange: cropPageRange,
            unit: cropUnit,
          });
          break;

        case 'resize':
          setProgress(40);
          setProgressStatus(`Resizing document to ${resizePageSize}...`);
          result = await resizePDF(files[0], {
            pageSize: resizePageSize,
            orientation: resizeOrientation,
          });
          break;

        case 'from_images':
          if (files.length === 0) {
            setError('Please upload at least one image file.');
            setIsProcessing(false);
            return;
          }
          setProgress(40);
          setProgressStatus(`Compiling ${files.length} images into PDF...`);
          result = await imagesToPDF(files, { pageSize: imagePageSize });
          break;

        case 'from_text': {
          setProgress(40);
          setProgressStatus('Formatting and compiling text into PDF pages...');
          const textData = textInput || (files[0] ? await files[0].text() : '');
          if (!textData.trim()) {
            setError('Please enter or upload text to compile into PDF.');
            setIsProcessing(false);
            return;
          }
          result = await textToPDF(textData, files[0]?.name || 'document.txt', {
            fontSize: textFontSize,
          });
          break;
        }

        case 'to_images':
          result = await renderPdfToImages(
            files[0],
            { format: imageExportFormat, scale: 2.0 },
            (pct, status) => {
              setProgress(pct);
              setProgressStatus(status);
            }
          );
          break;

        case 'to_text': {
          result = await extractTextFromPDF(files[0], (pct, status) => {
            setProgress(pct);
            setProgressStatus(status);
          });
          if (result.success && result.files[0]) {
            const txt = await result.files[0].blob.text();
            setExtractedTextPreview(txt);
          }
          break;
        }

        case 'sign': {
          setProgress(40);
          setProgressStatus('Embedding visual signature stamp onto document...');
          if (!hasSignature || !sigDataUrl) {
            setError('Please draw, upload, or type your signature before applying.');
            setIsProcessing(false);
            return;
          }

          result = await signPDF(files[0], {
            signatureDataUrl: sigDataUrl,
            hasSignature: true,
            targetPage: sigTargetPage,
            customPages: sigTargetPage === 'custom' ? sigCustomPages : undefined,
            position: sigPlacement,
            size: sigSize,
          });
          break;
        }

        case 'metadata':
          setProgress(40);
          setProgressStatus('Updating document metadata properties...');
          result = await editPDFMetadata(files[0], {
            title: metaTitle,
            author: metaAuthor,
            subject: metaSubject,
            keywords: metaKeywords,
            creator: metaCreator,
          });
          break;

        case 'compress': {
          setProgress(35);
          setProgressStatus(`Compressing PDF with ${compressionLevel} profile...`);
          const compRes = await compressPdf(files[0], compressionLevel);
          setCompressionStats({
            originalSize: compRes.originalSize,
            compressedSize: compRes.compressedSize,
            savedBytes: compRes.savedBytes,
            savedPercentage: compRes.savedPercentage,
          });
          result = {
            success: true,
            files: [{ name: compRes.filename, blob: compRes.blob, type: 'application/pdf' }],
          };
          break;
        }

        case 'word_to_pdf': {
          setProgress(35);
          setProgressStatus('Converting Word document into PDF layout...');
          const wRes = await wordToPdf(files[0]);
          result = {
            success: true,
            files: [{ name: wRes.filename, blob: wRes.blob, type: 'application/pdf' }],
          };
          break;
        }

        case 'powerpoint_to_pdf': {
          setProgress(35);
          setProgressStatus('Converting PowerPoint presentation into PDF slides...');
          const pRes = await powerpointToPdf(files[0]);
          result = {
            success: true,
            files: [{ name: pRes.filename, blob: pRes.blob, type: 'application/pdf' }],
          };
          break;
        }

        case 'excel_to_pdf': {
          setProgress(35);
          setProgressStatus('Rendering Excel spreadsheet worksheets to PDF tables...');
          const eRes = await excelToPdf(files[0]);
          result = {
            success: true,
            files: [{ name: eRes.filename, blob: eRes.blob, type: 'application/pdf' }],
          };
          break;
        }

        case 'html_to_pdf': {
          setProgress(35);
          setProgressStatus('Rendering HTML markup to paginated PDF document...');
          const inputPayload = htmlInputMode === 'code' ? htmlCodeInput : files[0];
          const hRes = await htmlToPdf(inputPayload, {
            pageSize: htmlPageSize,
            orientation: htmlOrientation,
            margin: htmlMargin,
          });

          if (!hRes.blob || hRes.blob.size === 0) {
            throw new Error('HTML to PDF rendering produced an empty document.');
          }

          result = {
            success: true,
            files: [{ name: hRes.filename, blob: hRes.blob, type: 'application/pdf' }],
          };
          break;
        }

        case 'pdf_compare': {
          if (!compareOldFile) {
            setCompareOldError('Please upload the original PDF.');
            setError('Please upload the original PDF.');
            setIsProcessing(false);
            return;
          }
          if (!compareNewFile) {
            setCompareNewError('Please upload the updated PDF.');
            setError('Please upload the updated PDF.');
            setIsProcessing(false);
            return;
          }
          if (!compareTextChanges && !compareVisualLayout) {
            setError('Select at least one comparison method.');
            setIsProcessing(false);
            return;
          }

          setProgress(15);
          setProgressStatus('Loading and validating PDF structures...');

          const compResult = await comparePdfDocuments(
            compareOldFile,
            compareNewFile,
            {
              mode: compareMode,
              detectTextChanges: compareTextChanges,
              detectVisualChanges: compareVisualLayout,
              sensitivity: compareSensitivity,
            },
            (pct, status) => {
              setProgress(pct);
              setProgressStatus(status);
            }
          );

          setCompareResult(compResult);

          const outputFiles = [];
          if (compResult.generatedPdfBlob) {
            const origBase = compareOldFile.name.replace(/\.pdf$/i, '');
            const newBase = compareNewFile.name.replace(/\.pdf$/i, '');
            outputFiles.push({
              name: `comparison_${origBase}_vs_${newBase}.pdf`,
              blob: compResult.generatedPdfBlob,
              type: 'application/pdf',
            });
          }
          if (compResult.reportText) {
            outputFiles.push({
              name: `comparison_audit_report.txt`,
              blob: new Blob([compResult.reportText], { type: 'text/plain;charset=utf-8' }),
              type: 'text/plain',
            });
          }

          result = {
            success: true,
            files: outputFiles,
          };
          break;
        }

        case 'extract_images': {
          setProgress(35);
          setProgressStatus('Extracting raw raster images and graphics from PDF...');
          const imgRes = await extractImages(files[0]);
          result = {
            success: true,
            files: [{ name: imgRes.filename, blob: imgRes.blob, type: imgRes.mimeType }],
          };
          break;
        }

        case 'protect': {
          if (!protectPassword.trim()) {
            setError('Please enter a password to encrypt and protect this document.');
            setIsProcessing(false);
            return;
          }
          if (protectPassword !== protectConfirmPassword) {
            setError('The confirmed password does not match. Please verify and re-type.');
            setIsProcessing(false);
            return;
          }
          setProgress(35);
          setProgressStatus(`Encrypting document using ${protectAlgorithm} cipher...`);
          try {
            const protRes = await protectPdf(files[0], {
              password: protectPassword,
              confirmPassword: protectConfirmPassword,
              algorithm: protectAlgorithm,
              allowPrinting: protectAllowPrinting,
              allowCopying: protectAllowCopying,
              allowModifying: protectAllowModifying,
              allowAnnotating: protectAllowAnnotating,
            });
            if (!protRes.success) {
              throw new Error(protRes.error || 'Failed to protect PDF');
            }
            result = protRes;
          } catch (clientErr: any) {
            console.warn('Client-side protection failed, attempting backend fallback:', clientErr);
            setProgress(60);
            setProgressStatus('Finalizing cryptographic protection...');
            const protApiRes = await protectPdfApi(files[0], protectPassword, {
              algorithm: protectAlgorithm,
              allowPrinting: protectAllowPrinting,
              allowCopying: protectAllowCopying,
              allowModifying: protectAllowModifying,
              allowAnnotating: protectAllowAnnotating,
            });
            result = {
              success: true,
              files: [{ name: protApiRes.filename, blob: protApiRes.blob, type: 'application/pdf' }],
            };
          }
          break;
        }

        case 'unlock': {
          if (!unlockPassword.trim()) {
            setError('Please enter the password to decrypt and unlock this PDF document.');
            setIsProcessing(false);
            return;
          }
          setProgress(35);
          setProgressStatus('Authenticating password and decrypting PDF streams...');
          try {
            const unRes = await unlockPdf(files[0], { password: unlockPassword });
            if (!unRes.success) {
              throw new Error(unRes.error || 'Failed to unlock PDF');
            }
            result = unRes;
          } catch (clientErr: any) {
            console.warn('Client-side unlock failed, attempting backend fallback:', clientErr);
            setProgress(60);
            setProgressStatus('Verifying decryption keys...');
            const unApiRes = await unlockPdfApi(files[0], unlockPassword);
            result = {
              success: true,
              files: [{ name: unApiRes.filename, blob: unApiRes.blob, type: 'application/pdf' }],
            };
          }
          break;
        }

        case 'redact': {
          if (redactions.length === 0) {
            setError('Please draw at least one redaction blackout rectangle on the document preview before applying.');
            setIsProcessing(false);
            return;
          }
          setProgress(25);
          setProgressStatus('Permanently rasterizing marked areas and destroying sensitive underlying data...');
          try {
            const redRes = await redactPdf(files[0], {
              redactions,
              color: redactColor,
            });
            if (!redRes.success) {
              throw new Error(redRes.error || 'Failed to redact PDF');
            }
            result = redRes;
          } catch (clientErr: any) {
            console.warn('Client-side redaction failed, attempting backend fallback:', clientErr);
            setProgress(60);
            setProgressStatus('Sanitizing and rasterizing sensitive content...');
            const redApiRes = await redactPdfApi(files[0], redactions, { color: redactColor });
            result = {
              success: true,
              files: [{ name: redApiRes.filename, blob: redApiRes.blob, type: 'application/pdf' }],
            };
          }
          break;
        }

        default:
          setError('This tool is under active development.');
          setIsProcessing(false);
          return;
      }

      if (!result.success || result.files.length === 0) {
        setError(result.error || 'Failed to process document.');
        setIsProcessing(false);
        return;
      }

      setProgress(100);
      setProgressStatus('Processing complete!');

      // Create object URLs and register for cleanup
      const outputItems = result.files.map((fileObj) => {
        const url = URL.createObjectURL(fileObj.blob);
        createdObjectUrlsRef.current.push(url);
        return {
          name: fileObj.name,
          url,
          size: fileObj.blob.size,
          type: fileObj.type,
        };
      });

      setProcessedOutputs(outputItems);

      // Save to recent history (metadata only)
      if (outputItems.length > 0) {
        onSaveProcessed({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          toolId: tool.id,
          toolName: tool.name,
          fileName: outputItems[0].name,
          fileSize: outputItems[0].size,
          timestamp: Date.now(),
          downloadUrl: outputItems[0].url,
        });
      }
    } catch (err: any) {
      console.error('Workspace execution error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const isComingSoon = tool.status === 'coming-soon';

  return (
    <div
      id="workspace-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
    >
      <div
        id="workspace-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 sm:my-8"
      >
        {/* 1. TOOL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: tool.accentColor }}
            >
              <DynamicIcon name={tool.iconName} size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="workspace-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {tool.name}
                </h3>
                {isComingSoon && (
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Coming Soon
                  </span>
                )}
                {tool.status === 'beta' && (
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Beta
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{tool.shortDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {files.length > 0 && !isProcessing && (
              <button
                type="button"
                onClick={handleResetWorkspace}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors font-medium flex items-center gap-1.5"
                title="Reset workspace"
              >
                <RefreshCw size={13} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              id="close-workspace-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2. DOCUMENT WORKSPACE BODY */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-white">
          {/* A. Coming Soon State */}
          {isComingSoon ? (
            <div className="p-8 sm:p-12 text-center bg-amber-50/60 border border-amber-200/80 rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                <Clock size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-bold text-amber-950">
                  {tool.name} is on the Development Roadmap
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {tool.fullDesc}
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-amber-700">
                  <span className="px-2.5 py-1 bg-amber-100/80 rounded-full border border-amber-200">
                    100% Client-Side Engine
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100/80 rounded-full border border-amber-200">
                    No Server Uploads
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors"
                >
                  Back to Tool Directory
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* B. Error Notice Banner */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Document Notice</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="p-1 text-red-400 hover:text-red-700 rounded"
                    aria-label="Dismiss error"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* C. Dedicated PDF Compare Dual-Document Upload Layout */}
              {tool.optionsType === 'pdf_compare' && (
                <div className="space-y-4">
                  <input
                    ref={oldFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSetCompareOldFile(f);
                    }}
                    className="hidden"
                    id="compare-old-file-input"
                  />
                  <input
                    ref={newFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSetCompareNewFile(f);
                    }}
                    className="hidden"
                    id="compare-new-file-input"
                  />

                  {/* Compare Notice Alert Banner */}
                  {compareNotice && (
                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3 text-sky-800 text-xs animate-in fade-in">
                      <GitCompare size={16} className="shrink-0 mt-0.5 text-sky-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-sky-900">PDF Comparison Engine</p>
                        <p className="mt-0.5 text-sky-700">{compareNotice}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompareNotice(null)}
                        className="p-1 text-sky-400 hover:text-sky-700 rounded transition-colors"
                        aria-label="Dismiss notice"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Side-by-Side Upload Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Original Document (v1.0) */}
                    <div className="flex flex-col bg-slate-50/80 border border-slate-200 rounded-2xl p-4 transition-all">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                            1
                          </span>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Original Version
                            </h4>
                            <p className="text-[11px] text-slate-500">Baseline PDF document</p>
                          </div>
                        </div>
                        {compareOldFile && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded-md">
                            Loaded
                          </span>
                        )}
                      </div>

                      {!compareOldFile ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dropped = e.dataTransfer.files?.[0];
                            if (dropped) handleSetCompareOldFile(dropped);
                          }}
                          onClick={() => oldFileInputRef.current?.click()}
                          className="flex-1 min-h-[140px] border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/20 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              oldFileInputRef.current?.click();
                            }
                          }}
                        >
                          <div className="w-10 h-10 bg-slate-100 group-hover:bg-sky-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                            <Upload size={18} className="text-slate-500 group-hover:text-sky-600" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Upload Original PDF
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Click to browse or drag & drop (.pdf)
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <FileCheck size={20} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate" title={compareOldFile.name}>
                                {compareOldFile.name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                {(compareOldFile.size / 1024).toFixed(1)} KB • Original Document
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => oldFileInputRef.current?.click()}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw size={12} />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareOldFile(null);
                                setCompareOldError(null);
                                setCompareNotice(null);
                                setCompareResult(null);
                                if (oldFileInputRef.current) oldFileInputRef.current.value = '';
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {compareOldError && (
                        <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 text-red-700 text-[11px]">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{compareOldError}</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Updated Document (v2.0) */}
                    <div className="flex flex-col bg-slate-50/80 border border-slate-200 rounded-2xl p-4 transition-all">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">
                            2
                          </span>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Updated Version
                            </h4>
                            <p className="text-[11px] text-slate-500">Revised PDF document</p>
                          </div>
                        </div>
                        {compareNewFile && (
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-semibold rounded-md">
                            Loaded
                          </span>
                        )}
                      </div>

                      {!compareNewFile ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dropped = e.dataTransfer.files?.[0];
                            if (dropped) handleSetCompareNewFile(dropped);
                          }}
                          onClick={() => newFileInputRef.current?.click()}
                          className="flex-1 min-h-[140px] border-2 border-dashed border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/20 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              newFileInputRef.current?.click();
                            }
                          }}
                        >
                          <div className="w-10 h-10 bg-slate-100 group-hover:bg-sky-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                            <Upload size={18} className="text-slate-500 group-hover:text-sky-600" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Upload Updated PDF
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Click to browse or drag & drop (.pdf)
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                              <FileCheck size={20} className="text-sky-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate" title={compareNewFile.name}>
                                {compareNewFile.name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                {(compareNewFile.size / 1024).toFixed(1)} KB • Updated Document
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => newFileInputRef.current?.click()}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw size={12} />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareNewFile(null);
                                setCompareNewError(null);
                                setCompareNotice(null);
                                setCompareResult(null);
                                if (newFileInputRef.current) newFileInputRef.current.value = '';
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {compareNewError && (
                        <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 text-red-700 text-[11px]">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{compareNewError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary / Readiness Banner */}
                  <div className="p-3.5 bg-slate-100/70 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <GitCompare size={15} className="text-slate-500" />
                      <span>
                        {!compareOldFile && !compareNewFile
                          ? 'Select both original and updated PDF files to compare.'
                          : compareOldFile && compareNewFile
                          ? 'Both documents loaded. Ready to run side-by-side comparison.'
                          : '1 of 2 documents loaded. Upload the second file to proceed.'}
                      </span>
                    </div>
                    {compareOldFile && compareNewFile && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>Ready</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* C. HTML Source Input Selector & Code Editor (when tool is html_to_pdf) */}
              {tool.optionsType === 'html_to_pdf' && (
                <div className="space-y-4">
                  <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <FileCode size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">HTML Input Method</h4>
                        <p className="text-[11px] text-slate-500">
                          {htmlInputMode === 'file'
                            ? 'Upload an HTML/HTM file to render into PDF'
                            : 'Write or paste custom HTML markup with inline/embedded CSS'}
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex p-1 bg-slate-200/80 rounded-xl shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setHtmlInputMode('file');
                          setError(null);
                          setProcessedOutputs([]);
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                          htmlInputMode === 'file'
                            ? 'bg-white text-teal-800 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload size={13} />
                        <span>Upload HTML File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHtmlInputMode('code');
                          setError(null);
                          setProcessedOutputs([]);
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                          htmlInputMode === 'code'
                            ? 'bg-white text-teal-800 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Code size={13} />
                        <span>Enter HTML Code</span>
                      </button>
                    </div>
                  </div>

                  {htmlInputMode === 'code' && (
                    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Code size={15} className="text-teal-600" />
                          <span className="text-xs font-bold text-slate-800">HTML & CSS Code Editor</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md font-semibold">
                            {htmlCodeInput.length} chars • {htmlCodeInput.split('\n').length} lines
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleResetHtmlSample}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline px-2 py-0.5"
                          >
                            Reset Default
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={handleClearHtmlCode}
                            className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline px-2 py-0.5"
                          >
                            Clear Code
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className="text-[11px] font-mono text-slate-500 mr-1">Quick Templates:</span>
                          {HTML_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => handleSelectHtmlTemplate(tmpl.id)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 rounded-lg transition-colors shadow-2xs"
                              title={tmpl.description}
                            >
                              {tmpl.name}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={11}
                          value={htmlCodeInput}
                          onChange={(e) => {
                            setHtmlCodeInput(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-hidden resize-y text-slate-800"
                          placeholder="<!DOCTYPE html><html><head><style>body { font-family: sans-serif; }</style></head><body><h1>Document</h1></body></html>"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* D. File Upload Drop Zone (unless text-to-pdf, html-to-pdf in code mode, or pdf_compare) */}
              {tool.optionsType !== 'from_text' && tool.optionsType !== 'pdf_compare' && !(tool.optionsType === 'html_to_pdf' && htmlInputMode === 'code') && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={tool.accepts}
                    multiple={tool.multipleFiles}
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="tool-file-upload-input"
                  />

                  {files.length === 0 ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-red-500 bg-slate-50/60 hover:bg-red-50/20 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      aria-label="Upload files drop zone"
                    >
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform">
                        <Upload size={24} className="text-slate-600 group-hover:text-red-600" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Click to select or drag & drop files here
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {tool.acceptsDesc} • Processed locally in your browser
                      </p>
                    </div>
                  ) : (
                    /* D. Multi-File List with Reordering Controls */
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-500" />
                          <span>Uploaded Files ({files.length})</span>
                        </span>
                        <div className="flex items-center gap-3">
                          {tool.multipleFiles && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                            >
                              <Plus size={13} />
                              <span>Add more</span>
                            </button>
                          )}
                          {tool.optionsType === 'html_to_pdf' && (
                            <button
                              type="button"
                              onClick={handleLoadUploadedFileToCode}
                              className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200"
                              title="Edit uploaded HTML file in code editor"
                            >
                              <Code size={12} />
                              <span>Edit in Code Editor</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setFiles([])}
                            className="text-xs text-slate-500 hover:text-red-600 transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {files.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white border border-slate-200/90 rounded-xl text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <FileText size={16} className="text-red-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">{file.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {tool.optionsType === 'html_to_pdf' && (
                                <button
                                  type="button"
                                  onClick={handleLoadUploadedFileToCode}
                                  className="px-2 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg mr-1 border border-teal-200"
                                >
                                  Open in Editor
                                </button>
                              )}
                              {tool.multipleFiles && (
                                <>
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveFileOrder(idx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                                    title="Move up"
                                    aria-label={`Move ${file.name} up`}
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === files.length - 1}
                                    onClick={() => moveFileOrder(idx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                                    title="Move down"
                                    aria-label={`Move ${file.name} down`}
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded ml-1"
                                title="Remove file"
                                aria-label={`Remove file ${file.name}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Redaction Canvas (when tool is redact-pdf and file is uploaded) */}
              {tool.optionsType === 'redact' && files.length > 0 && (
                <div className="space-y-3">
                  <RedactionCanvas
                    file={files[0]}
                    redactions={redactions}
                    onAddRedaction={(reg) => {
                      setRedactions((prev) => [...prev, reg]);
                      setProcessedOutputs([]);
                      setError(null);
                    }}
                    onRemoveRedaction={(id) => {
                      setRedactions((prev) => prev.filter((r) => r.id !== id));
                      setProcessedOutputs([]);
                      setError(null);
                    }}
                    onClearAllRedactions={() => {
                      setRedactions([]);
                      setProcessedOutputs([]);
                      setError(null);
                    }}
                    color={redactColor}
                    onChangeColor={(c) => setRedactColor(c)}
                  />
                </div>
              )}

              {/* E. Visual PDF Page Preview Grid (for page manipulation tools) */}
              {pageItems.length > 0 && tool.optionsType !== 'redact' && (
                <div className="space-y-3 p-4 sm:p-5 bg-slate-50/70 border border-slate-200/90 rounded-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Layers size={14} className="text-red-500" />
                        <span>Document Pages ({pageItems.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {tool.optionsType === 'remove_pages' && 'Click any page to toggle its removal.'}
                        {tool.optionsType === 'reorder_pages' && 'Use arrow buttons to adjust page sequence.'}
                        {tool.optionsType === 'rotate' && 'Click individual page buttons to rotate +90°.'}
                        {tool.optionsType === 'split' && 'Select pages to include in the split range.'}
                        {tool.optionsType === 'extract_pages' && 'Click pages you want to extract.'}
                        {tool.optionsType === 'watermark' && 'Preview of pages ready for watermark stamp.'}
                      </p>
                    </div>

                    {/* Quick batch actions */}
                    {tool.optionsType === 'extract_pages' && pageItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllExtractPages}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Select all pages"
                        >
                          <CheckSquare size={12} />
                          <span>Select All</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllExtractPages}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Deselect all pages"
                        >
                          <Square size={12} />
                          <span>Deselect All</span>
                        </button>
                      </div>
                    )}

                    {tool.optionsType === 'rotate' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">Rotate all:</span>
                        {([90, 180, 270] as const).map((ang) => (
                          <button
                            key={ang}
                            type="button"
                            onClick={() => handleRotateAllPages(ang)}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                          >
                            +{ang}°
                          </button>
                        ))}
                      </div>
                    )}

                    {tool.optionsType === 'reorder_pages' && pageItems.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-500 mr-1">Sort:</span>
                        <button
                          type="button"
                          onClick={handleSortAscending}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Sort ascending (1 to N)"
                        >
                          <ArrowUp size={12} />
                          <span>1 → {pageItems.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSortDescending}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Sort descending (N to 1)"
                        >
                          <ArrowDown size={12} />
                          <span>{pageItems.length} → 1</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleReverseOrder}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Reverse sequence"
                        >
                          <ArrowUpDown size={12} />
                          <span>Reverse</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetOrder}
                          className="px-2.5 py-1 text-xs font-mono font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Reset to original order"
                        >
                          <RotateCcw size={12} />
                          <span>Reset</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1">
                    {pageItems.map((page, idx) => (
                      <PdfPagePreview
                        key={page.id}
                        page={page}
                        mode={
                          tool.optionsType === 'remove_pages'
                            ? 'remove'
                            : tool.optionsType === 'reorder_pages'
                            ? 'reorder'
                            : tool.optionsType === 'rotate'
                            ? 'rotate'
                            : tool.optionsType === 'extract_pages' || tool.optionsType === 'split'
                            ? 'select'
                            : 'view'
                        }
                        onToggleSelect={
                          tool.optionsType === 'remove_pages'
                            ? handleToggleRemovePage
                            : handleToggleSelectPage
                        }
                        onMoveLeft={() => handleMovePage(idx, 'left')}
                        onMoveRight={() => handleMovePage(idx, 'right')}
                        onRotate={handleRotatePage}
                        canMoveLeft={idx > 0}
                        canMoveRight={idx < pageItems.length - 1}
                        totalCount={pageItems.length}
                        isDragging={draggedPageIndex === idx}
                        isDragOver={dragOverPageIndex === idx}
                        onDragStart={handleDragStart}
                        onDragOverTarget={handleDragOverTarget}
                        onDropTarget={handleDropTarget}
                        onDragEnd={handleDragEnd}
                        watermarkOverlay={
                          tool.optionsType === 'watermark'
                            ? {
                                text: watermarkText,
                                opacity: watermarkOpacity,
                                angle: watermarkRotation,
                                position: watermarkPosition,
                                targetPages: watermarkTarget,
                                pageRangeStr: watermarkCustomPages,
                                totalCount: pageItems.length,
                              }
                            : undefined
                        }
                        signatureOverlay={
                          tool.optionsType === 'sign' && hasSignature && sigDataUrl
                            ? {
                                dataUrl: sigDataUrl,
                                targetPage: sigTargetPage,
                                customPages: sigTargetPage === 'custom' ? sigCustomPages : undefined,
                                totalCount: pageItems.length,
                                position: sigPlacement,
                                size: sigSize,
                              }
                            : undefined
                        }
                        cropMarginOverlay={
                          tool.optionsType === 'crop'
                            ? (() => {
                                if (cropTargetMode === 'first' && page.displayIndex !== 1) return undefined;
                                if (cropTargetMode === 'last' && page.displayIndex !== pageItems.length) return undefined;
                                if (cropTargetMode === 'specific' && cropPageRange.trim()) {
                                  const parsed = parsePageRangeStrict(cropPageRange, pageItems.length);
                                  if (!parsed.valid || !parsed.indices.includes(page.displayIndex - 1)) return undefined;
                                }
                                return {
                                  top: cropTop,
                                  right: cropRight,
                                  bottom: cropBottom,
                                  left: cropLeft,
                                };
                              })()
                            : undefined
                        }
                        pageNumberOverlay={
                          tool.optionsType === 'page_numbers'
                            ? {
                                format: pageNumberFormat,
                                startNumber: pageNumberStart,
                                position: pageNumberPos,
                                fontSize: pageNumberFontSize,
                                totalCount: pageItems.length,
                              }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* F. TOOL CONTROLS (Tool-Specific Variations) */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Sliders size={14} className="text-red-500" />
                  <span>Tool Parameters</span>
                </h4>

                {/* 1. Split PDF options */}
                {tool.optionsType === 'split' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="splitMode"
                          checked={splitMode === 'range'}
                          onChange={() => {
                            setSplitMode('range');
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Extract Range(s)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="splitMode"
                          checked={splitMode === 'every_n'}
                          onChange={() => {
                            setSplitMode('every_n');
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Every N Pages</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="splitMode"
                          checked={splitMode === 'each_page'}
                          onChange={() => {
                            setSplitMode('each_page');
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Single Pages (ZIP)</span>
                      </label>
                    </div>

                    {splitMode === 'range' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Page Selection Range (e.g. 1-3 or 1-2, 3-5 or click thumbnails above):
                        </label>
                        <input
                          type="text"
                          value={splitRange}
                          onChange={(e) => {
                            setSplitRange(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          placeholder="e.g. 1-3 or 1-2, 3-5"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                        />

                        {pageItems.length > 1 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Presets:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSplitRange(`1-${pageItems.length}`);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
                            >
                              All (1-{pageItems.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const oddPages = pageItems.filter((_, idx) => (idx + 1) % 2 !== 0).map((p) => p.pageNumber).join(', ');
                                setSplitRange(oddPages);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
                            >
                              Odd Pages
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const evenPages = pageItems.filter((_, idx) => (idx + 1) % 2 === 0).map((p) => p.pageNumber).join(', ');
                                setSplitRange(evenPages || '2');
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
                            >
                              Even Pages
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const mid = Math.ceil(pageItems.length / 2);
                                setSplitRange(`1-${mid}`);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
                            >
                              First Half
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const mid = Math.ceil(pageItems.length / 2);
                                setSplitRange(`${mid + 1}-${pageItems.length}`);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors"
                            >
                              Second Half
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {splitMode === 'every_n' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Split into chunks of N pages:
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={1}
                            max={pageItems.length || 999}
                            value={splitEveryN}
                            onChange={(e) => {
                              setSplitEveryN(Math.max(1, parseInt(e.target.value, 10) || 1));
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-center"
                          />
                          <span className="text-xs text-slate-600">
                            pages per document
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Will split {pageItems.length || 'the'} pages into{' '}
                          <strong>
                            {Math.ceil((pageItems.length || 1) / Math.max(1, splitEveryN))} separate PDF document(s)
                          </strong>{' '}
                          packaged into a ZIP bundle.
                        </p>
                      </div>
                    )}

                    {splitMode === 'each_page' && (
                      <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                        Every single page of the document ({pageItems.length || 'all'} pages) will be extracted into its own individual 1-page PDF file in a downloadable ZIP archive.
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Remove Pages options */}
                {tool.optionsType === 'remove_pages' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pages to Remove (or click thumbnails above):
                    </label>
                    <input
                      type="text"
                      value={removePagesRange}
                      onChange={(e) => setRemovePagesRange(e.target.value)}
                      placeholder="e.g. 2, 4 or click thumbnails above"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {removePagesRange.trim()
                        ? `Output PDF will retain remaining pages excluding (${removePagesRange}).`
                        : 'Click any page thumbnail above or enter page numbers to remove.'}
                    </p>
                  </div>
                )}

                {/* 3. Reorder Pages options */}
                {tool.optionsType === 'reorder_pages' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          New Page Order Sequence:
                        </label>
                        {pageItems.length > 0 && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {pageItems.length} pages total
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={reorderSeq}
                          onChange={(e) => handleReorderSeqChange(e.target.value)}
                          placeholder="e.g. 3, 1, 2"
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                        />
                        <button
                          type="button"
                          onClick={applyReorderSeqInput}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
                        >
                          Apply Order
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Drag thumbnails above, use the navigation arrow buttons, or enter a comma-separated sequence.
                      </p>
                    </div>

                    {pageItems.length > 1 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
                        <span className="text-[11px] font-semibold text-slate-600">Quick Actions:</span>
                        <button
                          type="button"
                          onClick={handleSortAscending}
                          className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                        >
                          Ascending (1..{pageItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={handleSortDescending}
                          className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                        >
                          Descending ({pageItems.length}..1)
                        </button>
                        <button
                          type="button"
                          onClick={handleReverseOrder}
                          className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                        >
                          Reverse
                        </button>
                        <button
                          type="button"
                          onClick={handleResetOrder}
                          className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                        >
                          Reset to Original
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Extract Pages options */}
                {tool.optionsType === 'extract_pages' && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Pages to Extract:
                        </label>
                        {pageItems.length > 0 && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {pageItems.filter((p) => p.selected).length} of {pageItems.length} selected
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={extractPagesRange}
                        onChange={(e) => handleExtractPagesRangeChange(e.target.value)}
                        placeholder="e.g. 1, 3, 5-7"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden font-mono"
                      />
                    </div>

                    {pageItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-mono text-slate-500 mr-1">Presets:</span>
                        <button
                          type="button"
                          onClick={handleSelectAllExtractPages}
                          className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-md transition-colors"
                        >
                          All Pages
                        </button>
                        <button
                          type="button"
                          onClick={handleExtractOddPages}
                          className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-md transition-colors"
                        >
                          Odd Pages
                        </button>
                        <button
                          type="button"
                          onClick={handleExtractEvenPages}
                          className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-md transition-colors"
                        >
                          Even Pages
                        </button>
                        {pageItems.length > 2 && (
                          <>
                            <button
                              type="button"
                              onClick={handleExtractFirstHalf}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-md transition-colors"
                            >
                              1st Half
                            </button>
                            <button
                              type="button"
                              onClick={handleExtractSecondHalf}
                              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-md transition-colors"
                            >
                              2nd Half
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleDeselectAllExtractPages}
                          className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition-colors"
                        >
                          Clear Selection
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Rotate options */}
                {tool.optionsType === 'rotate' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Target Angle:</span>
                      {([90, 180, 270] as const).map((angle) => (
                        <button
                          key={angle}
                          type="button"
                          onClick={() => handleSelectRotateAngle(angle)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            rotationAngle === angle
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          +{angle}°
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="rotateTarget"
                          checked={rotateTarget === 'all'}
                          onChange={() => handleSelectRotateTarget('all')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>All Pages</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="rotateTarget"
                          checked={rotateTarget === 'custom'}
                          onChange={() => handleSelectRotateTarget('custom')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span>Specific Pages</span>
                      </label>
                    </div>

                    {rotateTarget === 'custom' && (
                      <input
                        type="text"
                        value={rotateCustomPages}
                        onChange={(e) => handleRotateCustomPagesChange(e.target.value)}
                        placeholder="e.g. 1, 3-5"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                      />
                    )}
                  </div>
                )}

                {/* 6. Watermark options */}
                {tool.optionsType === 'watermark' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Watermark Text
                        </label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => {
                            setWatermarkText(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Opacity ({Math.round(watermarkOpacity * 100)}%)
                        </label>
                        <input
                          type="range"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={watermarkOpacity}
                          onChange={(e) => {
                            setWatermarkOpacity(parseFloat(e.target.value));
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full mt-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Angle ({watermarkRotation}°)
                        </label>
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          step="15"
                          value={watermarkRotation}
                          onChange={(e) => {
                            setWatermarkRotation(parseInt(e.target.value, 10));
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full mt-2"
                        />
                      </div>
                    </div>

                    {/* Font Size & Position */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="block text-xs font-semibold text-slate-700 mb-1.5">Font Size:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: 'Small (24pt)', size: 24 },
                            { label: 'Medium (36pt)', size: 36 },
                            { label: 'Large (48pt)', size: 48 },
                            { label: 'X-Large (64pt)', size: 64 },
                          ].map((fs) => (
                            <button
                              key={fs.size}
                              type="button"
                              onClick={() => {
                                setWatermarkFontSize(fs.size);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                                watermarkFontSize === fs.size
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {fs.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-slate-700 mb-1.5">Position:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'center',
                            'top',
                            'bottom',
                            'top-left',
                            'top-right',
                            'bottom-left',
                            'bottom-right',
                          ].map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                setWatermarkPosition(pos);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium capitalize transition-all ${
                                watermarkPosition === pos
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pos.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Target Pages */}
                    <div className="pt-1 border-t border-slate-200/60 space-y-2">
                      <span className="block text-xs font-semibold text-slate-700">Target Pages:</span>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="watermarkTarget"
                            checked={watermarkTarget === 'all'}
                            onChange={() => {
                              setWatermarkTarget('all');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>All Pages</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="watermarkTarget"
                            checked={watermarkTarget === 'first'}
                            onChange={() => {
                              setWatermarkTarget('first');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>First Page Only</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="watermarkTarget"
                            checked={watermarkTarget === 'last'}
                            onChange={() => {
                              setWatermarkTarget('last');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>Last Page Only</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="watermarkTarget"
                            checked={watermarkTarget === 'custom'}
                            onChange={() => {
                              setWatermarkTarget('custom');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>Specific Pages</span>
                        </label>
                      </div>

                      {watermarkTarget === 'custom' && (
                        <input
                          type="text"
                          value={watermarkCustomPages}
                          onChange={(e) => {
                            setWatermarkCustomPages(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          placeholder="e.g. 1, 3-5"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 7. Page Numbers options */}
                {tool.optionsType === 'page_numbers' && (
                  <div className="space-y-3">
                    {/* Format Pattern & Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Format Pattern:
                        </label>
                        <span className="text-[10px] font-mono text-slate-500">
                          {'{n}'} = page, {'{total}'} = count
                        </span>
                      </div>
                      <input
                        type="text"
                        value={pageNumberFormat}
                        onChange={(e) => {
                          setPageNumberFormat(e.target.value);
                          setProcessedOutputs([]);
                          setError(null);
                        }}
                        placeholder="e.g. Page {n} of {total}"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[11px] font-semibold text-slate-600">Presets:</span>
                        {[
                          'Page {n} of {total}',
                          '{n} / {total}',
                          'Page {n}',
                          '{n}',
                          '- {n} -',
                        ].map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => {
                              setPageNumberFormat(fmt);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className={`px-2 py-1 text-[11px] font-mono rounded-lg transition-all ${
                              pageNumberFormat === fmt
                                ? 'bg-red-600 text-white font-bold shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position & Start Number & Font Size Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/70">
                      {/* Position */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Position on Page:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: 'Top Left', value: 'top-left' as const },
                            { label: 'Top Center', value: 'top-center' as const },
                            { label: 'Top Right', value: 'top-right' as const },
                            { label: 'Bottom Left', value: 'bottom-left' as const },
                            { label: 'Bottom Center', value: 'bottom-center' as const },
                            { label: 'Bottom Right', value: 'bottom-right' as const },
                          ].map((pos) => (
                            <button
                              key={pos.value}
                              type="button"
                              onClick={() => {
                                setPageNumberPos(pos.value);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`px-2 py-1.5 text-[11px] font-medium rounded-lg text-center transition-all ${
                                pageNumberPos === pos.value
                                  ? 'bg-red-600 text-white font-bold shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Start Number & Font Size */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Start Number:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99999}
                            value={pageNumberStart}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setPageNumberStart(val);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Font Size:
                          </label>
                          <div className="flex items-center gap-1">
                            {[8, 10, 12, 14].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setPageNumberFontSize(size);
                                  setProcessedOutputs([]);
                                  setError(null);
                                }}
                                className={`flex-1 py-1 text-[11px] font-mono rounded-lg transition-all ${
                                  pageNumberFontSize === size
                                    ? 'bg-red-600 text-white font-bold shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {size}pt
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. Crop options */}
                {tool.optionsType === 'crop' && (
                  <div className="space-y-3.5">
                    {/* Target Pages */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Apply Crop To:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'all', label: 'All Pages' },
                          { id: 'first', label: 'First Page' },
                          { id: 'last', label: 'Last Page' },
                          { id: 'specific', label: 'Specific Pages' },
                        ].map((tgt) => (
                          <button
                            key={tgt.id}
                            type="button"
                            onClick={() => {
                              setCropTargetMode(tgt.id as any);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className={`py-1.5 px-2 text-xs rounded-xl font-bold transition-all ${
                              cropTargetMode === tgt.id
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {tgt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {cropTargetMode === 'specific' && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700">
                            Page Range / Numbers:
                          </label>
                          <span className="text-[11px] font-mono text-slate-500">Total: {pageItems.length} pages</span>
                        </div>
                        <input
                          type="text"
                          value={cropPageRange}
                          onChange={(e) => {
                            setCropPageRange(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          placeholder="e.g. 1-3, 5, 8"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                        />
                      </div>
                    )}

                    {/* Margin Mode Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Margin Trim Setup (PDF Points / pt):
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCropUniform(true);
                              setProcessedOutputs([]);
                            }}
                            className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-colors ${
                              cropUniform
                                ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            Equal Sides
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCropUniform(false);
                              setProcessedOutputs([]);
                            }}
                            className={`px-2 py-0.5 text-[11px] font-mono rounded-md border transition-colors ${
                              !cropUniform
                                ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            Custom Sides
                          </button>
                        </div>
                      </div>

                      {cropUniform ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {[
                              { label: '0 pt (None)', val: 0 },
                              { label: '18 pt (0.25")', val: 18 },
                              { label: '36 pt (0.5")', val: 36 },
                              { label: '54 pt (0.75")', val: 54 },
                              { label: '72 pt (1.0")', val: 72 },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setCropTop(preset.val);
                                  setCropRight(preset.val);
                                  setCropBottom(preset.val);
                                  setCropLeft(preset.val);
                                  setProcessedOutputs([]);
                                  setError(null);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                                  cropTop === preset.val && cropRight === preset.val && cropBottom === preset.val && cropLeft === preset.val
                                    ? 'bg-red-600 text-white shadow-xs font-bold'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[11px] font-mono text-slate-500">Uniform:</span>
                              <input
                                type="number"
                                min={0}
                                max={200}
                                value={cropTop}
                                onChange={(e) => {
                                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setCropTop(v);
                                  setCropRight(v);
                                  setCropBottom(v);
                                  setCropLeft(v);
                                  setProcessedOutputs([]);
                                  setError(null);
                                }}
                                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Top (pt):</label>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={cropTop}
                              onChange={(e) => {
                                setCropTop(Math.max(0, parseInt(e.target.value, 10) || 0));
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Right (pt):</label>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={cropRight}
                              onChange={(e) => {
                                setCropRight(Math.max(0, parseInt(e.target.value, 10) || 0));
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bottom (pt):</label>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={cropBottom}
                              onChange={(e) => {
                                setCropBottom(Math.max(0, parseInt(e.target.value, 10) || 0));
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Left (pt):</label>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={cropLeft}
                              onChange={(e) => {
                                setCropLeft(Math.max(0, parseInt(e.target.value, 10) || 0));
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Crops outer boundaries according to target page dimensions (red dashed crop boundary shown in thumbnail view above).
                    </p>
                  </div>
                )}

                {/* 9. Resize options */}
                {tool.optionsType === 'resize' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Target Standard Page Size:
                        </label>
                        <select
                          value={resizePageSize}
                          onChange={(e) => setResizePageSize(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                        >
                          <option value="A4">A4 (210 × 297 mm)</option>
                          <option value="Letter">US Letter (8.5 × 11 in)</option>
                          <option value="Legal">US Legal (8.5 × 14 in)</option>
                          <option value="A3">A3 (297 × 420 mm)</option>
                          <option value="A5">A5 (148 × 210 mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Orientation:
                        </label>
                        <div className="flex gap-2">
                          {(['portrait', 'landscape'] as const).map((orient) => (
                            <button
                              key={orient}
                              type="button"
                              onClick={() => setResizeOrientation(orient)}
                              className={`flex-1 py-2 text-xs rounded-xl font-bold capitalize transition-colors ${
                                resizeOrientation === orient
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {orient}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      * Note: Resize PDF adjusts physical page dimensions and scaling. (To reduce file size, use Compress PDF).
                    </p>
                  </div>
                )}

                {/* 10. Images to PDF options */}
                {tool.optionsType === 'from_images' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Page Size / Layout:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setImagePageSize('fit')}
                        className={`px-4 py-2 text-xs rounded-xl font-bold ${
                          imagePageSize === 'fit'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        Fit to Image Dimensions
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagePageSize('a4')}
                        className={`px-4 py-2 text-xs rounded-xl font-bold ${
                          imagePageSize === 'a4'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        Standard A4 with Margins
                      </button>
                    </div>
                  </div>
                )}

                {/* 11. Text to PDF options */}
                {tool.optionsType === 'from_text' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Input Text / Notes / Code:
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {textInput.length} chars • ~{Math.ceil(textInput.length / 2500)} page(s)
                        </span>
                        <select
                          value={textFontSize}
                          onChange={(e) => setTextFontSize(parseInt(e.target.value, 10))}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value={9}>Small (9pt)</option>
                          <option value={10}>Standard (10pt)</option>
                          <option value={12}>Medium (12pt)</option>
                          <option value={14}>Large (14pt)</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type or paste your text content here. Long text will automatically be formatted with word-wrapping and paginated cleanly across pages..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* 12. PDF to Images options */}
                {tool.optionsType === 'to_images' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Export Image Format:
                    </label>
                    <div className="flex gap-2">
                      {(['png', 'jpeg'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setImageExportFormat(fmt)}
                          className={`px-4 py-2 text-xs rounded-xl font-bold uppercase ${
                            imageExportFormat === fmt
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          {fmt === 'jpeg' ? 'JPG (Fast / Small)' : 'PNG (Lossless HD)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 13. Sign PDF options */}
                {tool.optionsType === 'sign' && (
                  <div className="space-y-4">
                    {/* Mode Selector Tabs */}
                    <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSigInputMode('draw');
                          clearSignatureCanvas();
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          sigInputMode === 'draw'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PenTool size={13} />
                        <span>Draw</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSigInputMode('upload');
                          clearSignatureCanvas();
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          sigInputMode === 'upload'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ImageIcon size={13} />
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSigInputMode('type');
                          clearSignatureCanvas();
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          sigInputMode === 'type'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Type size={13} />
                        <span>Type Name</span>
                      </button>
                    </div>

                    {/* Mode 1: Draw Mode */}
                    {sigInputMode === 'draw' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Draw signature below:
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5" title="Ink Color">
                              {[
                                { color: '#000000', label: 'Black' },
                                { color: '#1E40AF', label: 'Blue' },
                                { color: '#DC2626', label: 'Red' },
                                { color: '#15803D', label: 'Green' },
                              ].map((ink) => (
                                <button
                                  key={ink.color}
                                  type="button"
                                  onClick={() => {
                                    setSigColor(ink.color);
                                    setProcessedOutputs([]);
                                    setError(null);
                                  }}
                                  className={`w-4 h-4 rounded-full ring-2 transition-all ${
                                    sigColor === ink.color ? 'ring-red-500 scale-110' : 'ring-transparent'
                                  }`}
                                  style={{ backgroundColor: ink.color }}
                                  aria-label={`${ink.label} ink`}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={clearSignatureCanvas}
                              className="text-xs text-red-600 hover:underline font-medium"
                            >
                              Clear canvas
                            </button>
                          </div>
                        </div>

                        <canvas
                          ref={sigCanvasRef}
                          width={600}
                          height={150}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                          style={{ touchAction: 'none' }}
                          className="w-full h-32 bg-white border border-slate-300 rounded-xl cursor-crosshair shadow-2xs"
                        />
                      </div>
                    )}

                    {/* Mode 2: Upload Image Mode */}
                    {sigInputMode === 'upload' && (
                      <div className="space-y-2">
                        <input
                          ref={sigFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleSignatureUpload}
                          className="hidden"
                          id="sig-file-upload-input"
                        />
                        {!hasSignature ? (
                          <label
                            htmlFor="sig-file-upload-input"
                            className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-red-500 hover:bg-red-50/20 rounded-xl cursor-pointer transition-all bg-white text-center"
                          >
                            <ImageIcon className="text-slate-400 mb-2" size={24} />
                            <span className="text-xs font-semibold text-slate-700">
                              Click to upload signature stamp image
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5">
                              PNG with transparent background recommended
                            </span>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-3">
                              {sigDataUrl && (
                                <img
                                  src={sigDataUrl}
                                  alt="Uploaded Signature"
                                  className="h-10 max-w-32 object-contain bg-slate-50 rounded border border-slate-200 p-1"
                                />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-slate-800 truncate max-w-40">
                                  {sigUploadedName || 'Uploaded image'}
                                </p>
                                <span className="text-[10px] text-emerald-600 font-medium">Image Loaded</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={clearSignatureCanvas}
                              className="text-xs text-red-600 hover:underline font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 3: Type Name Mode */}
                    {sigInputMode === 'type' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">
                            Type full name or initials:
                          </label>
                          <div className="flex items-center gap-1.5" title="Ink Color">
                            {[
                              { color: '#000000', label: 'Black' },
                              { color: '#1E40AF', label: 'Blue' },
                              { color: '#DC2626', label: 'Red' },
                              { color: '#15803D', label: 'Green' },
                            ].map((ink) => (
                              <button
                                key={ink.color}
                                type="button"
                                onClick={() => {
                                  setSigColor(ink.color);
                                  handleTypedSignatureChange(sigTypedText, ink.color);
                                }}
                                className={`w-4 h-4 rounded-full ring-2 transition-all ${
                                  sigColor === ink.color ? 'ring-red-500 scale-110' : 'ring-transparent'
                                }`}
                                style={{ backgroundColor: ink.color }}
                                aria-label={`${ink.label} ink`}
                              />
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={sigTypedText}
                          onChange={(e) => handleTypedSignatureChange(e.target.value, sigColor)}
                          placeholder="e.g. Johnathan Doe"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                        />
                        {sigTypedText.trim() && (
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                            <span
                              style={{
                                color: sigColor,
                                fontFamily: 'Brush Script MT, Dancing Script, Caveat, Segoe Script, cursive',
                                fontSize: '28px',
                              }}
                            >
                              {sigTypedText}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Target Page & Position & Size Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Stamp Target */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Stamp Page(s):
                        </label>
                        <select
                          value={sigTargetPage}
                          onChange={(e) => {
                            setSigTargetPage(e.target.value as any);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        >
                          <option value="last">Last Page Only</option>
                          <option value="first">First Page Only</option>
                          <option value="all">All Pages</option>
                          <option value="custom">Specific Range</option>
                        </select>
                        {sigTargetPage === 'custom' && (
                          <input
                            type="text"
                            value={sigCustomPages}
                            onChange={(e) => {
                              setSigCustomPages(e.target.value);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            placeholder="e.g. 1, 3-5"
                            className="w-full mt-1.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                          />
                        )}
                      </div>

                      {/* Position */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Position:
                        </label>
                        <select
                          value={sigPlacement}
                          onChange={(e) => {
                            setSigPlacement(e.target.value as any);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-center">Bottom Center</option>
                          <option value="center">Center</option>
                          <option value="top-right">Top Right</option>
                          <option value="top-left">Top Left</option>
                          <option value="top-center">Top Center</option>
                        </select>
                      </div>

                      {/* Size */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Signature Size:
                        </label>
                        <div className="flex gap-1">
                          {(['small', 'medium', 'large'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setSigSize(s);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-colors ${
                                sigSize === s
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {s === 'small' ? 'Sm' : s === 'medium' ? 'Med' : 'Lg'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      * Applies a visual signature stamp onto the selected pages. You can preview the stamp position live on the document thumbnails above.
                    </p>
                  </div>
                )}

                {/* 14. Edit Metadata options */}
                {tool.optionsType === 'metadata' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Document Title
                      </label>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={metaAuthor}
                        onChange={(e) => setMetaAuthor(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={metaSubject}
                        onChange={(e) => setMetaSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Keywords (comma separated)
                      </label>
                      <input
                        type="text"
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value)}
                        placeholder="invoice, report, legal"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 15. Compress PDF options */}
                {tool.optionsType === 'compress' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Compression Profile:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'low',
                          title: 'Basic / High Quality',
                          desc: 'Light stream optimization. 10-25% reduction with crystal-clear vector & image fidelity.',
                        },
                        {
                          id: 'medium',
                          title: 'Recommended / Balanced',
                          desc: 'Optimal 150 DPI image downsampling. 40-70% size reduction for emails & web sharing.',
                        },
                        {
                          id: 'high',
                          title: 'Maximum / Smallest',
                          desc: 'Aggressive 72 DPI compression. 70-90% reduction for compact storage & archival.',
                        },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setCompressionLevel(lvl.id as any)}
                          className={`p-3 text-left rounded-xl border transition-all ${
                            compressionLevel === lvl.id
                              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{lvl.title}</span>
                            {compressionLevel === lvl.id && (
                              <CheckCircle2 size={14} className="text-amber-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{lvl.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 16. Word to PDF options */}
                {tool.optionsType === 'word_to_pdf' && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <FileText size={16} className="text-emerald-600" />
                      <span>Microsoft Word Conversion Engine</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Converts .docx and .doc documents directly into standard paginated PDF. Typography, margins, tables, embedded graphics, and headers are accurately preserved.
                    </p>
                  </div>
                )}

                {/* 17. PowerPoint to PDF options */}
                {tool.optionsType === 'powerpoint_to_pdf' && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <Layers size={16} className="text-emerald-600" />
                      <span>PowerPoint Presentation Engine</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Converts .pptx and .ppt presentation slide decks into sequential, high-resolution PDF slide pages ready for distribution and presentation.
                    </p>
                  </div>
                )}

                {/* 18. Excel to PDF options */}
                {tool.optionsType === 'excel_to_pdf' && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <Sliders size={16} className="text-emerald-600" />
                      <span>Excel Workbook & Spreadsheet Converter</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Renders .xlsx and .xls sheets into cleanly bordered, printable PDF spreadsheets with automated table pagination and gridline rendering.
                    </p>
                  </div>
                )}

                {/* 19. HTML to PDF options */}
                {tool.optionsType === 'html_to_pdf' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Layout size={16} className="text-teal-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Page Geometry & Layout Settings
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 font-semibold">
                        {htmlPageSize} • {htmlOrientation === 'portrait' ? 'Portrait' : 'Landscape'} • {htmlMargin}mm margins
                      </span>
                    </div>

                    {/* Paper Size & Orientation Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Paper Size */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Paper Standard / Dimensions:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {[
                            { id: 'A4', label: 'A4', desc: '210 × 297 mm' },
                            { id: 'Letter', label: 'Letter', desc: '8.5 × 11 in' },
                            { id: 'Legal', label: 'Legal', desc: '8.5 × 14 in' },
                            { id: 'A3', label: 'A3', desc: '297 × 420 mm' },
                            { id: 'A5', label: 'A5', desc: '148 × 210 mm' },
                          ].map((size) => (
                            <button
                              key={size.id}
                              type="button"
                              onClick={() => {
                                setHtmlPageSize(size.id as any);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`p-2 rounded-xl text-left border transition-all ${
                                htmlPageSize === size.id
                                  ? 'bg-teal-50/90 border-teal-500 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                              }`}
                            >
                              <div className="font-bold text-xs">{size.label}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{size.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Orientation */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Page Orientation:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHtmlOrientation('portrait');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                              htmlOrientation === 'portrait'
                                ? 'bg-teal-50/90 border-teal-500 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="w-6 h-8 rounded border-2 border-current flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-mono">P</span>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-xs">Portrait</div>
                              <div className="text-[10px] text-slate-500">Vertical orientation</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setHtmlOrientation('landscape');
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                              htmlOrientation === 'landscape'
                                ? 'bg-teal-50/90 border-teal-500 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="w-8 h-6 rounded border-2 border-current flex items-center justify-center shrink-0">
                              <span className="text-[8px] font-mono">L</span>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-xs">Landscape</div>
                              <div className="text-[10px] text-slate-500">Horizontal orientation</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Margin Setup & Visual Live Layout Diagram */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
                      {/* Margin Setup */}
                      <div className="md:col-span-8 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            Page Margins:
                          </label>
                          <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {htmlMargin} mm
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={40}
                            step={1}
                            value={htmlMargin}
                            onChange={(e) => {
                              setHtmlMargin(parseInt(e.target.value, 10) || 0);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            className="flex-1 accent-teal-600 cursor-pointer"
                          />
                          <div className="w-20 shrink-0 flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={htmlMargin}
                              onChange={(e) => {
                                setHtmlMargin(Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)));
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                            />
                            <span className="text-xs text-slate-500 font-mono">mm</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-mono text-slate-500 mr-1">Presets:</span>
                          {[
                            { label: '0 mm (None)', val: 0 },
                            { label: '5 mm (Compact)', val: 5 },
                            { label: '10 mm (Standard)', val: 10 },
                            { label: '15 mm (Spacious)', val: 15 },
                            { label: '20 mm (Wide)', val: 20 },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => {
                                setHtmlMargin(preset.val);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                                htmlMargin === preset.val
                                  ? 'bg-teal-600 border-teal-600 text-white font-bold shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visual Live Layout Diagram */}
                      <div className="md:col-span-4 bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          Page Preview
                        </div>
                        <div
                          className={`bg-white border-2 border-slate-400 rounded-sm shadow-xs transition-all flex items-center justify-center relative ${
                            htmlOrientation === 'portrait'
                              ? 'w-16 h-24'
                              : 'w-24 h-16'
                          }`}
                        >
                          {/* Inner margin box */}
                          <div
                            className="border border-dashed border-teal-500/70 bg-teal-50/40 rounded-xs flex items-center justify-center transition-all"
                            style={{
                              width: `${Math.max(20, 100 - (htmlMargin * 2))}%`,
                              height: `${Math.max(20, 100 - (htmlMargin * 2))}%`,
                            }}
                          >
                            <span className="text-[8px] font-mono font-bold text-teal-700">
                              {htmlPageSize}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-2">
                          {htmlPageSize} • {htmlOrientation} • {htmlMargin}mm
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 20. PDF Compare options */}
                {tool.optionsType === 'pdf_compare' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Comparison Mode:
                        </label>
                        <select
                          value={compareMode}
                          onChange={(e) => {
                            setCompareMode(e.target.value as any);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                        >
                          <option value="side-by-side">Side-by-Side Visual Diff</option>
                          <option value="overlay">Transparent Overlay Diff</option>
                          <option value="diff">High-Contrast Change Highlighting</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Diff Detection Sensitivity:
                        </label>
                        <div className="flex gap-1.5">
                          {(['low', 'medium', 'high'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => {
                                setCompareSensitivity(lvl);
                                setProcessedOutputs([]);
                                setError(null);
                              }}
                              className={`flex-1 py-1.5 text-xs rounded-xl font-bold capitalize transition-all ${
                                compareSensitivity === lvl
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={compareTextChanges}
                          onChange={(e) => {
                            setCompareTextChanges(e.target.checked);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span>Detect text content modifications</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={compareVisualLayout}
                          onChange={(e) => {
                            setCompareVisualLayout(e.target.checked);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span>Compare visual layout and elements</span>
                      </label>
                    </div>

                    <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center gap-2.5 text-xs text-sky-800">
                      <Sparkles size={16} className="text-sky-600 shrink-0" />
                      <span>
                        PDF Compare performs deep pixel-level and text-flow difference analysis to detect additions, deletions, and structural styling adjustments between two versions.
                      </span>
                    </div>
                  </div>
                )}

                {/* 21. Extract Images options */}
                {tool.optionsType === 'extract_images' && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-bold text-indigo-800">
                      <FileImage size={16} className="text-indigo-600" />
                      <span>Lossless Embedded Object Extractor</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Extracts real embedded bitmap and photo objects stored inside PDF object streams (rather than page screenshot rendering). Single image downloads directly; multiple images are bundled in a clean ZIP archive.
                    </p>
                  </div>
                )}

                {/* 22. Protect PDF options */}
                {tool.optionsType === 'protect' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Encryption Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setProtectShowPassword(!protectShowPassword)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            {protectShowPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                            <span>{protectShowPassword ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={protectShowPassword ? 'text' : 'password'}
                            value={protectPassword}
                            onChange={(e) => {
                              setProtectPassword(e.target.value);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            placeholder="Enter secure password"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                          />
                          <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={protectShowPassword ? 'text' : 'password'}
                            value={protectConfirmPassword}
                            onChange={(e) => {
                              setProtectConfirmPassword(e.target.value);
                              setProcessedOutputs([]);
                              setError(null);
                            }}
                            placeholder="Re-enter password"
                            className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden ${
                              protectConfirmPassword && protectPassword !== protectConfirmPassword
                                ? 'border-red-400 bg-red-50/20'
                                : 'border-slate-300'
                            }`}
                          />
                          <Key size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        </div>
                        {protectConfirmPassword && protectPassword !== protectConfirmPassword && (
                          <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    {/* Encryption Algorithm & Permissions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Encryption Standard:
                        </label>
                        <select
                          value={protectAlgorithm}
                          onChange={(e) => setProtectAlgorithm(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                        >
                          <option value="AES-256">AES-256 Bit (Modern & Recommended)</option>
                          <option value="RC4">RC4-128 Bit (Legacy Compatibility)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Document Access Permissions:
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-white border border-slate-200 rounded-lg">
                            <input
                              type="checkbox"
                              checked={protectAllowPrinting}
                              onChange={(e) => setProtectAllowPrinting(e.target.checked)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span>Allow Print</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-white border border-slate-200 rounded-lg">
                            <input
                              type="checkbox"
                              checked={protectAllowCopying}
                              onChange={(e) => setProtectAllowCopying(e.target.checked)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span>Allow Copy</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-white border border-slate-200 rounded-lg">
                            <input
                              type="checkbox"
                              checked={protectAllowModifying}
                              onChange={(e) => setProtectAllowModifying(e.target.checked)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span>Allow Edit</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 bg-white border border-slate-200 rounded-lg">
                            <input
                              type="checkbox"
                              checked={protectAllowAnnotating}
                              onChange={(e) => setProtectAllowAnnotating(e.target.checked)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span>Allow Comments</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
                      <ShieldCheck size={16} className="text-red-600 shrink-0" />
                      <span>
                        Protected documents require the chosen password to open in Adobe Acrobat, Chrome, Apple Preview, and all standard PDF readers.
                      </span>
                    </div>
                  </div>
                )}

                {/* 23. Unlock PDF options */}
                {tool.optionsType === 'unlock' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Current Document Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setUnlockShowPassword(!unlockShowPassword)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {unlockShowPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span>{unlockShowPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={unlockShowPassword ? 'text' : 'password'}
                          value={unlockPassword}
                          onChange={(e) => {
                            setUnlockPassword(e.target.value);
                            setProcessedOutputs([]);
                            setError(null);
                          }}
                          placeholder="Enter the password used to protect this document"
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <Unlock size={15} className="absolute left-3 top-3 text-slate-400" />
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        Unlocking authenticates the security key and creates an unencrypted version with all password prompts and editing permissions permanently removed.
                      </span>
                    </div>
                  </div>
                )}

                {/* 24. Redact PDF options */}
                {tool.optionsType === 'redact' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Redaction Box Color
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Selected color will replace redacted visual regions and background content.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { color: '#000000', label: 'Black' },
                          { color: '#FFFFFF', label: 'White' },
                          { color: '#991B1B', label: 'Dark Red' },
                          { color: '#374151', label: 'Charcoal' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setRedactColor(c.color)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                              redactColor === c.color
                                ? 'border-red-500 ring-2 ring-red-500/20 bg-white'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Permanent Data Destruction:</span> Redacted areas are converted to flattened raster pixels. All underlying text, vector shapes, search indexes, and hidden metadata within the marked boxes are completely destroyed and cannot be retrieved.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* G. Truthful Progress Indicator */}
              {isProcessing && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-red-600" />
                      <span>{progressStatus}</span>
                    </span>
                    <span className="font-mono text-red-600">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* H. Extracted Text Viewer (For PDF to Text tool) */}
              {extractedTextPreview && (
                <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-slate-700">
                      Extracted Text Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(extractedTextPreview);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedText ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedText ? 'Copied!' : 'Copy text'}</span>
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-mono text-slate-800 whitespace-pre-wrap">
                    {extractedTextPreview}
                  </pre>
                </div>
              )}

              {/* I. PDF Compare Interactive Diff Viewer */}
              {tool.optionsType === 'pdf_compare' && compareResult && (
                <div className="animate-in fade-in duration-300">
                  <PdfCompareViewer
                    comparison={compareResult}
                    onDownloadPdf={() => {
                      if (compareResult.generatedPdfBlob) {
                        const origBase = (compareOldFile?.name || 'original').replace(/\.pdf$/i, '');
                        const newBase = (compareNewFile?.name || 'updated').replace(/\.pdf$/i, '');
                        const url = URL.createObjectURL(compareResult.generatedPdfBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `comparison_${origBase}_vs_${newBase}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }
                    }}
                    onDownloadReport={() => {
                      if (compareResult.reportText) {
                        const blob = new Blob([compareResult.reportText], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'comparison_audit_report.txt';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }
                    }}
                  />
                </div>
              )}

              {/* J. Processed Results Download List */}
              {processedOutputs.length > 0 && (
                <div className="space-y-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl animate-in fade-in">
                  <div className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>
                        Ready for Download ({processedOutputs.length} output file
                        {processedOutputs.length > 1 ? 's' : ''})
                      </span>
                    </span>
                    {compressionStats && (
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full">
                        {compressionStats.savedPercentage > 0
                          ? `Saved ${compressionStats.savedPercentage}% (${(
                              compressionStats.savedBytes /
                              1024 /
                              1024
                            ).toFixed(2)} MB)`
                          : 'Optimized PDF Stream'}
                      </span>
                    )}
                  </div>

                  {compressionStats && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-white/90 border border-emerald-200 rounded-xl text-center">
                      <div>
                        <div className="text-[10px] uppercase font-mono text-slate-500">Original</div>
                        <div className="text-xs font-bold text-slate-800">
                          {(compressionStats.originalSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-mono text-slate-500">Compressed</div>
                        <div className="text-xs font-bold text-emerald-700">
                          {(compressionStats.compressedSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-mono text-slate-500">Reduction</div>
                        <div className="text-xs font-bold text-emerald-600">
                          {compressionStats.savedPercentage > 0 ? `-${compressionStats.savedPercentage}%` : 'Optimal'}
                        </div>
                      </div>
                    </div>
                  )}

                  {processedOutputs.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          {item.type.includes('zip') ? <Archive size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                            {(item.size / 1024 / 1024).toFixed(2)} MB • {item.type}
                          </p>
                        </div>
                      </div>

                      <a
                        href={item.url}
                        download={item.name}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
                      >
                        <Download size={15} />
                        <span>Download Result</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. ACTION BAR FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
            <Shield size={14} className="text-emerald-600" />
            <span>
              {[
                'compress',
                'word_to_pdf',
                'powerpoint_to_pdf',
                'excel_to_pdf',
                'html_to_pdf',
                'extract_images',
              ].includes(tool.optionsType || '')
                ? 'High-Speed Native Engine • Secure Sandbox Processing'
                : '100% In-Browser Execution • Zero Server Uploads'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              {isComingSoon ? 'Close' : 'Cancel'}
            </button>

            {!isComingSoon && (
              <button
                type="button"
                id="execute-process-btn"
                onClick={executeOperation}
                disabled={
                  isProcessing ||
                  (tool.optionsType === 'pdf_compare'
                    ? !compareOldFile || !compareNewFile
                    : tool.optionsType === 'html_to_pdf'
                    ? htmlInputMode === 'file'
                      ? files.length === 0
                      : !htmlCodeInput || !htmlCodeInput.trim()
                    : tool.optionsType === 'from_text'
                    ? !textInput.trim() && files.length === 0
                    : files.length === 0)
                }
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Apply {tool.name}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
