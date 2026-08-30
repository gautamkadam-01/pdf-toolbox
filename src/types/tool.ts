export type ToolCategory =
  | 'organize'
  | 'edit_optimize'
  | 'convert_to_pdf'
  | 'convert_from_pdf'
  | 'security_forms';

export type ToolStatus = 'available' | 'beta' | 'coming-soon';

export type BadgeType = 'popular' | 'new' | 'pro' | 'updated';

export interface PDFTool {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  category: ToolCategory;
  iconName: string;
  status: ToolStatus;
  badge?: BadgeType;
  accentColor: string;
  accepts: string;
  acceptsDesc: string;
  multipleFiles?: boolean;
  maxFiles?: number;
  optionsType?:
    | 'merge'
    | 'split'
    | 'remove_pages'
    | 'reorder_pages'
    | 'extract_pages'
    | 'compress'
    | 'rotate'
    | 'watermark'
    | 'page_numbers'
    | 'crop'
    | 'resize'
    | 'from_images'
    | 'word_to_pdf'
    | 'powerpoint_to_pdf'
    | 'excel_to_pdf'
    | 'html_to_pdf'
    | 'from_text'
    | 'to_images'
    | 'to_text'
    | 'pdf_compare'
    | 'extract_images'
    | 'protect'
    | 'unlock'
    | 'sign'
    | 'redact'
    | 'metadata';
}

export interface CategoryInfo {
  id: ToolCategory;
  title: string;
  description: string;
  iconName: string;
  color: string;
}

export interface ProcessedItem {
  id: string;
  toolId: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  downloadUrl: string;
  previewUrl?: string;
  pageCount?: number;
}

export interface ProcessedFile {
  name: string;
  blob: Blob;
  type: string;
}

export interface ProcessingResult {
  success: boolean;
  files: ProcessedFile[];
  error?: string;
}
