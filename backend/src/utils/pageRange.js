/**
 * Shared Page Range Parser Utility
 * Parses and validates page ranges such as '1', '1,3,5', '1-3', '1-3,7-9', '5,2,3'.
 */

/**
 * Parses a page range string into an array of 1-indexed page numbers.
 * 
 * @param {string|number|Array<number>} input - Range string (e.g. '1-3, 5') or number
 * @param {number} totalPages - Total number of pages in the document
 * @param {Object} [options={}]
 * @param {boolean} [options.preserveOrder=false] - Whether to preserve the exact order specified by the user
 * @param {boolean} [options.deduplicate=true] - Whether to remove duplicate page numbers
 * @returns {{ isValid: boolean, pages?: number[], error?: { code: string, message: string } }}
 */
function parsePageRange(input, totalPages, options = {}) {
  const { preserveOrder = false, deduplicate = true } = options;

  if (typeof totalPages !== 'number' || totalPages < 1) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_COUNT',
        message: 'Invalid document total page count.',
      },
    };
  }

  // Handle 'all' keyword
  if (typeof input === 'string' && input.trim().toLowerCase() === 'all') {
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return { isValid: true, pages: allPages };
  }

  if (input === undefined || input === null || input === '') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_RANGE',
        message: 'Page selection parameter is required.',
      },
    };
  }

  const strInput = String(input).trim();
  if (strInput.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_RANGE',
        message: 'Page selection cannot be empty.',
      },
    };
  }

  // Split by comma
  const tokens = strInput.split(',');
  const resultPages = [];

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_PAGE_RANGE',
          message: `Malformed page range syntax near empty segment in '${strInput}'.`,
        },
      };
    }

    if (token.includes('-')) {
      // Range segment, e.g. "1-3"
      const parts = token.split('-');
      if (parts.length !== 2) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_RANGE',
            message: `Invalid range format '${token}'. Use format like '1-3'.`,
          },
        };
      }

      const startStr = parts[0].trim();
      const endStr = parts[1].trim();

      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: `Range values must be positive integers in '${token}'.`,
          },
        };
      }

      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (start === 0 || end === 0) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: 'Page numbers must be 1 or greater (1-indexed). Page 0 is invalid.',
          },
        };
      }

      if (start > totalPages || end > totalPages) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: `Page number out of bounds in '${token}'. Document has only ${totalPages} pages.`,
          },
        };
      }

      if (start <= end) {
        for (let p = start; p <= end; p++) {
          resultPages.push(p);
        }
      } else {
        // Reverse range e.g. 5-3
        for (let p = start; p >= end; p--) {
          resultPages.push(p);
        }
      }
    } else {
      // Single page number
      if (!/^\d+$/.test(token)) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: `Invalid page number '${token}'. Must be a positive integer.`,
          },
        };
      }

      const pageNum = parseInt(token, 10);
      if (pageNum === 0) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: 'Page numbers must be 1 or greater (1-indexed). Page 0 is invalid.',
          },
        };
      }

      if (pageNum > totalPages) {
        return {
          isValid: false,
          error: {
            code: 'INVALID_PAGE_NUMBER',
            message: `Page ${pageNum} exceeds total document pages (${totalPages}).`,
          },
        };
      }

      resultPages.push(pageNum);
    }
  }

  if (resultPages.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_RANGE',
        message: 'No valid pages were selected.',
      },
    };
  }

  let finalPages = resultPages;

  if (deduplicate) {
    if (preserveOrder) {
      // Preserve first occurrence order
      const seen = new Set();
      finalPages = finalPages.filter((p) => {
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      });
    } else {
      finalPages = Array.from(new Set(finalPages)).sort((a, b) => a - b);
    }
  } else if (!preserveOrder) {
    finalPages.sort((a, b) => a - b);
  }

  return {
    isValid: true,
    pages: finalPages,
  };
}

/**
 * Parses split ranges into distinct groups of page numbers.
 * Example: '1-3, 4-6' or ['1-3', '4-6'] => [[1,2,3], [4,5,6]]
 * 
 * @param {string|string[]} input - Split range specification
 * @param {number} totalPages - Total pages in the document
 * @returns {{ isValid: boolean, groups?: number[][], error?: { code: string, message: string } }}
 */
function parseSplitRanges(input, totalPages) {
  if (typeof totalPages !== 'number' || totalPages < 1) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_COUNT',
        message: 'Invalid document total page count.',
      },
    };
  }

  let rangeStrings = [];

  if (Array.isArray(input)) {
    rangeStrings = input.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_PAGE_RANGE',
          message: 'Split range specification cannot be empty.',
        },
      };
    }
    rangeStrings = trimmed.split(';').map((s) => s.trim()).filter(Boolean);
    if (rangeStrings.length === 1 && trimmed.includes(',')) {
      // Check if comma-separated ranges e.g. "1-2, 3-4"
      const commaTokens = trimmed.split(',').map((s) => s.trim());
      const allRanges = commaTokens.every((t) => t.includes('-') || /^\d+$/.test(t));
      if (allRanges) {
        rangeStrings = commaTokens;
      }
    }
  } else {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_RANGE',
        message: 'Invalid split range parameter format.',
      },
    };
  }

  if (rangeStrings.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_PAGE_RANGE',
        message: 'No split ranges were provided.',
      },
    };
  }

  const groups = [];
  for (const rangeStr of rangeStrings) {
    const parsed = parsePageRange(rangeStr, totalPages, { preserveOrder: true, deduplicate: true });
    if (!parsed.isValid) {
      return parsed;
    }
    groups.push(parsed.pages);
  }

  return {
    isValid: true,
    groups,
  };
}

module.exports = {
  parsePageRange,
  parseSplitRanges,
};
