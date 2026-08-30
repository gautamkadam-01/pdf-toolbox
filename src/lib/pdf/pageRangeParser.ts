export interface ParseRangeResult {
  valid: boolean;
  indices: number[]; // 0-indexed
  error?: string;
}

/**
 * Strict parser for page range strings (e.g., "1-3, 5, 7-9").
 * Strictly rejects invalid tokens, out-of-range pages, inverted ranges, and empty inputs.
 * NEVER falls back to page 1 silently.
 */
export function parsePageRangeStrict(rangeStr: string, totalPages: number): ParseRangeResult {
  const cleanStr = (rangeStr || '').trim();
  if (!cleanStr) {
    return {
      valid: false,
      indices: [],
      error: 'Please enter a page range (e.g. 1-3, 5).',
    };
  }

  if (totalPages <= 0) {
    return {
      valid: false,
      indices: [],
      error: 'The document does not contain any valid pages.',
    };
  }

  const parts = cleanStr.split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 0) {
    return {
      valid: false,
      indices: [],
      error: 'Please enter a valid page number or range.',
    };
  }

  const rawIndices: number[] = [];
  const seen = new Set<number>();

  for (const part of parts) {
    // Check for single number
    if (/^\d+$/.test(part)) {
      const num = parseInt(part, 10);
      if (num < 1) {
        return {
          valid: false,
          indices: [],
          error: `Page number "${num}" is invalid. Page numbers must start from 1.`,
        };
      }
      if (num > totalPages) {
        return {
          valid: false,
          indices: [],
          error: `Page "${num}" is out of bounds for a ${totalPages}-page document.`,
        };
      }
      const zeroIdx = num - 1;
      if (!seen.has(zeroIdx)) {
        seen.add(zeroIdx);
        rawIndices.push(zeroIdx);
      }
    } else if (/^\d+-\d+$/.test(part)) {
      const [sStr, eStr] = part.split('-');
      const start = parseInt(sStr, 10);
      const end = parseInt(eStr, 10);

      if (start < 1) {
        return {
          valid: false,
          indices: [],
          error: `Range start "${start}" is invalid. Page numbers must start from 1.`,
        };
      }
      if (end > totalPages) {
        return {
          valid: false,
          indices: [],
          error: `Range end "${end}" exceeds the document's total page count of ${totalPages}.`,
        };
      }
      if (start > end) {
        return {
          valid: false,
          indices: [],
          error: `Invalid range "${part}": start page (${start}) cannot be greater than end page (${end}).`,
        };
      }
      for (let i = start; i <= end; i++) {
        const zeroIdx = i - 1;
        if (!seen.has(zeroIdx)) {
          seen.add(zeroIdx);
          rawIndices.push(zeroIdx);
        }
      }
    } else {
      return {
        valid: false,
        indices: [],
        error: `Invalid page expression "${part}". Use valid formats like 1, 1-3, or 1,3,5.`,
      };
    }
  }

  if (rawIndices.length === 0) {
    return {
      valid: false,
      indices: [],
      error: `No valid pages were found in range "${rangeStr}".`,
    };
  }

  return {
    valid: true,
    indices: rawIndices,
  };
}

export interface ParseSplitGroupsResult {
  valid: boolean;
  groups: number[][]; // Array of 0-indexed page indices for each split document
  error?: string;
}

/**
 * Parses split range expressions into distinct sub-document page groups.
 * Examples:
 * - "1-3" => [[0, 1, 2]]
 * - "1-2, 3-5" or "1-2; 3-5" => [[0, 1], [2, 3, 4]]
 * - "1, 3, 5" => [[0, 2, 4]]
 */
export function parseSplitGroupsStrict(rangeStr: string, totalPages: number): ParseSplitGroupsResult {
  const cleanStr = (rangeStr || '').trim();
  if (!cleanStr) {
    return {
      valid: false,
      groups: [],
      error: 'Please specify one or more page ranges to split.',
    };
  }

  if (totalPages <= 0) {
    return {
      valid: false,
      groups: [],
      error: 'The document does not contain any valid pages.',
    };
  }

  // Check if semicolon-separated ranges
  let groupStrings: string[] = [];
  if (cleanStr.includes(';')) {
    groupStrings = cleanStr.split(';').map((s) => s.trim()).filter(Boolean);
  } else {
    // Check if comma-separated ranges e.g. "1-2, 3-4" or "1, 2, 3"
    // If every item is a range or single number:
    // If the expression has ranges like "1-2, 3-4", we split on commas into distinct groups
    const rawTokens = cleanStr.split(',').map((s) => s.trim()).filter(Boolean);
    const hasMultipleHyphens = rawTokens.filter((t) => t.includes('-')).length > 1;
    if (hasMultipleHyphens) {
      groupStrings = rawTokens;
    } else {
      // Single group with multiple pages or single range
      groupStrings = [cleanStr];
    }
  }

  const groups: number[][] = [];
  for (const groupStr of groupStrings) {
    const parsed = parsePageRangeStrict(groupStr, totalPages);
    if (!parsed.valid || parsed.indices.length === 0) {
      return {
        valid: false,
        groups: [],
        error: parsed.error || `Invalid split range "${groupStr}".`,
      };
    }
    groups.push(parsed.indices);
  }

  return {
    valid: true,
    groups,
  };
}

/**
 * Validates that an array of 1-indexed page numbers is a strict permutation of 1..totalPages
 * (every page appears exactly once, no duplicates, no missing pages).
 */
export function validatePagePermutation(
  orderedPageNumbers: number[],
  totalPages: number
): { valid: boolean; error?: string } {
  if (totalPages <= 0) {
    return { valid: false, error: 'Document has no pages.' };
  }

  if (orderedPageNumbers.length !== totalPages) {
    return {
      valid: false,
      error: `Reordered list must contain exactly ${totalPages} pages (received ${orderedPageNumbers.length}).`,
    };
  }

  const seen = new Set<number>();
  for (const num of orderedPageNumbers) {
    if (typeof num !== 'number' || isNaN(num) || num < 1 || num > totalPages) {
      return {
        valid: false,
        error: `Page "${num}" is invalid for a ${totalPages}-page document.`,
      };
    }
    if (seen.has(num)) {
      return {
        valid: false,
        error: `Duplicate page "${num}" detected. Each page must appear exactly once in the reordered output.`,
      };
    }
    seen.add(num);
  }

  return { valid: true };
}
