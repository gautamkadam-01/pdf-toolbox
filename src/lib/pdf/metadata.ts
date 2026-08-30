import { PDFDocument } from 'pdf-lib';
import { ProcessingResult } from '../../types/tool';

export interface MetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string; // Comma separated
  creator?: string;
  producer?: string;
}

export async function readPDFMetadata(file: File): Promise<{
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  pageCount: number;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const kw = pdfDoc.getKeywords();
    const keywordsStr = Array.isArray(kw) ? (kw as string[]).join(', ') : (typeof kw === 'string' ? kw : '');
    return {
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      keywords: keywordsStr,
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      pageCount: pdfDoc.getPageCount(),
    };
  } catch (err) {
    console.error('Error reading PDF metadata:', err);
    return {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      pageCount: 0,
    };
  }
}

export async function editPDFMetadata(file: File, options: MetadataOptions): Promise<ProcessingResult> {
  try {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const baseName = file.name.replace(/\.pdf$/i, '');

    if (options.title !== undefined) {
      pdfDoc.setTitle(options.title.trim());
    }
    if (options.author !== undefined) {
      pdfDoc.setAuthor(options.author.trim());
    }
    if (options.subject !== undefined) {
      pdfDoc.setSubject(options.subject.trim());
    }
    if (options.keywords !== undefined) {
      const keywordsArray = options.keywords
        .split(/[,;]+/)
        .map((k) => k.trim())
        .filter(Boolean);
      pdfDoc.setKeywords(keywordsArray);
    }
    if (options.creator !== undefined) {
      pdfDoc.setCreator(options.creator.trim());
    }
    if (options.producer !== undefined) {
      pdfDoc.setProducer(options.producer.trim());
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      files: [
        {
          name: `${baseName}_metadata_updated.pdf`,
          blob,
          type: 'application/pdf',
        },
      ],
    };
  } catch (err: any) {
    console.error('Metadata edit error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to update PDF metadata.',
    };
  }
}
