import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { ProcessingResult } from '../../types/tool';
import { parsePageRangeStrict, parseSplitGroupsStrict } from './pageRangeParser';
import { loadSafePdfDocument } from './pdfLoader';

export { parsePageRangeStrict, parseSplitGroupsStrict };

export interface SplitOptions {
  mode: 'range' | 'every_n' | 'each_page';
  rangeStr?: string;
  everyN?: number; // e.g. split every 2 pages
}

export async function splitPDF(file: File, options: SplitOptions): Promise<ProcessingResult> {
  try {
    const sourceDoc = await loadSafePdfDocument(file);
    const totalPages = sourceDoc.getPageCount();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    if (totalPages === 0) {
      return {
        success: false,
        files: [],
        error: 'The uploaded PDF document contains no pages.',
      };
    }

    // 1. Determine split groups (array of 0-indexed page indices for each resulting document)
    const groups: number[][] = [];

    if (options.mode === 'each_page') {
      for (let i = 0; i < totalPages; i++) {
        groups.push([i]);
      }
    } else if (options.mode === 'every_n') {
      const n = typeof options.everyN === 'number' && options.everyN >= 1 ? Math.floor(options.everyN) : 1;
      if (n < 1) {
        return {
          success: false,
          files: [],
          error: 'Split size N must be at least 1.',
        };
      }
      for (let i = 0; i < totalPages; i += n) {
        const chunk: number[] = [];
        for (let j = i; j < Math.min(totalPages, i + n); j++) {
          chunk.push(j);
        }
        groups.push(chunk);
      }
    } else {
      // Range mode
      const rawRange = (options.rangeStr || '').trim();
      if (!rawRange) {
        return {
          success: false,
          files: [],
          error: 'Please specify one or more page ranges to split.',
        };
      }

      const parsed = parseSplitGroupsStrict(rawRange, totalPages);
      if (!parsed.valid || parsed.groups.length === 0) {
        return {
          success: false,
          files: [],
          error: parsed.error || `Specified page range "${rawRange}" is invalid for this ${totalPages}-page document.`,
        };
      }
      groups.push(...parsed.groups);
    }

    if (groups.length === 0) {
      return {
        success: false,
        files: [],
        error: 'No valid split groups were determined.',
      };
    }

    // 2. Generate and verify each sub-PDF
    const generatedPdfs: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

    for (let idx = 0; idx < groups.length; idx++) {
      const pageIndices = groups[idx];
      if (pageIndices.length === 0) continue;

      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((p) => subDoc.addPage(p));

      const subBytes = await subDoc.save({ useObjectStreams: true });

      // Binary verification on sub-PDF
      if (subBytes.length < 10) {
        throw new Error(`Generated split part ${idx + 1} is empty.`);
      }
      const sig = String.fromCharCode(...subBytes.slice(0, 5));
      if (!sig.startsWith('%PDF-')) {
        throw new Error(`Generated split part ${idx + 1} does not have a valid PDF header signature.`);
      }

      const verifyDoc = await PDFDocument.load(subBytes, { ignoreEncryption: true });
      if (verifyDoc.getPageCount() !== pageIndices.length) {
        throw new Error(
          `Split part ${idx + 1} page count mismatch: expected ${pageIndices.length}, got ${verifyDoc.getPageCount()}`
        );
      }

      const padIndex = String(idx + 1).padStart(String(groups.length).length > 1 ? 2 : 1, '0');
      let partName = `${baseName}_part_${padIndex}.pdf`;
      if (options.mode === 'each_page') {
        const padPage = String(pageIndices[0] + 1).padStart(String(totalPages).length, '0');
        partName = `${baseName}_page_${padPage}.pdf`;
      }

      generatedPdfs.push({
        name: partName,
        bytes: subBytes,
        pageCount: pageIndices.length,
      });
    }

    if (generatedPdfs.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Failed to generate any output PDFs from split configuration.',
      };
    }

    // 3. Return Single PDF or Multi-file ZIP Bundle
    if (generatedPdfs.length === 1) {
      const single = generatedPdfs[0];
      const blob = new Blob([single.bytes], { type: 'application/pdf' });
      return {
        success: true,
        files: [
          {
            name: `${baseName}_split.pdf`,
            blob,
            type: 'application/pdf',
          },
        ],
      };
    }

    // Multi-part ZIP bundle
    const zip = new JSZip();
    for (const item of generatedPdfs) {
      zip.file(item.name, item.bytes);
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    if (zipBlob.size < 20) {
      throw new Error('Generated ZIP bundle is empty.');
    }

    return {
      success: true,
      files: [
        {
          name: `${baseName}_split_results.zip`,
          blob: zipBlob,
          type: 'application/zip',
        },
      ],
    };
  } catch (err: any) {
    console.error('Split error:', err);
    return {
      success: false,
      files: [],
      error: err.message || 'Failed to split PDF. Ensure the file is a valid, unencrypted PDF.',
    };
  }
}
