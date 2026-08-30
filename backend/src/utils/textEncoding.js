/**
 * Universal WinAnsi text encoding sanitizer for pdf-lib standard fonts (Helvetica, Times, Courier).
 * Prevents "WinAnsi cannot encode ..." runtime exceptions by mapping Unicode symbols,
 * normalizing accented characters, and replacing unsupported codepoints with safe equivalents.
 */

// Exact set of Unicode codepoints supported by pdf-lib's WinAnsi encoding table
const WIN_ANSI_SUPPORTED_CODES = new Set([
  // Basic ASCII printable characters (0x20 to 0x7E)
  ...Array.from({ length: 95 }, (_, i) => 0x20 + i),
  // Latin-1 Supplement (0xA0 to 0xFF)
  ...Array.from({ length: 96 }, (_, i) => 0xa0 + i),
  // Windows-1252 / WinAnsi specific codepoints
  0x0152, // Œ
  0x0153, // œ
  0x0160, // Š
  0x0161, // š
  0x0178, // Ÿ
  0x017d, // Ž
  0x017e, // ž
  0x0192, // ƒ
  0x02c6, // ˆ
  0x02dc, // ˜
  0x2013, // – (en dash)
  0x2014, // — (em dash)
  0x2018, // ‘
  0x2019, // ’
  0x201a, // ‚
  0x201c, // “
  0x201d, // ”
  0x201e, // „
  0x2020, // †
  0x2021, // ‡
  0x2022, // • (bullet)
  0x2026, // … (ellipsis)
  0x2030, // ‰
  0x2039, // ‹
  0x203a, // ›
  0x20ac, // € (Euro)
  0x2122, // ™ (Trademark)
]);

// Map of common Unicode characters to clean ASCII/WinAnsi equivalents
const UNICODE_TRANSLITERATION_MAP = {
  // Currency symbols
  '\u20B9': 'Rs.', // ₹ Indian Rupee
  '\u20BA': 'TL',  // ₺ Turkish Lira
  '\u20BD': 'RUB', // ₽ Russian Ruble
  '\u20A9': 'KRW', // ₩ Korean Won
  '\u20AB': 'VND', // ₫ Vietnamese Dong
  '\u0E3F': 'THB', // ฿ Thai Baht
  '\u20AA': 'ILS', // ₪ Israeli Shekel
  '\u20B4': 'UAH', // ₴ Ukrainian Hryvnia
  '\u20B1': 'PHP', // ₱ Philippine Peso
  '\u20A6': 'NGN', // ₦ Nigerian Naira
  '\u20BF': 'BTC', // ₿ Bitcoin
  '\u20A8': 'Rs',  // ₨ Rupee sign
  '\u09F3': 'BDT', // ৳ Bengali Taka

  // Bullets & Symbols
  '\u25AA': '*',
  '\u25AB': '*',
  '\u25CF': '*',
  '\u25CB': 'o',
  '\u25A0': '*',
  '\u25A1': '*',
  '\u25C6': '*',
  '\u25C7': '*',
  '\u2713': '[v]', // Checkmark ✓
  '\u2714': '[v]', // Heavy checkmark ✔
  '\u2717': '[x]', // Ballot X ✗
  '\u2718': '[x]', // Heavy ballot X ✘
  '\u274C': '[x]', // Cross mark ❌
  '\u2705': '[v]', // White heavy check mark ✅

  // Math & Operators
  '\u2264': '<=',  // ≤
  '\u2265': '>=',  // ≥
  '\u2260': '!=',  // ≠
  '\u2248': '~',   // ≈
  '\u2261': '==',  // ≡
  '\u221E': 'inf', // ∞
  '\u2211': 'sum', // ∑
  '\u221A': 'sqrt',// √
  '\u00B1': '+/-', // ±
  '\u00D7': 'x',   // ×
  '\u00F7': '/',   // ÷

  // Arrows
  '\u2192': '->',
  '\u2190': '<-',
  '\u2194': '<->',
  '\u2191': '^',
  '\u2193': 'v',
  '\u21D2': '=>',
  '\u21D0': '<=',
  '\u21D4': '<=>',

  // Fractions
  '\u2153': '1/3',
  '\u2154': '2/3',
  '\u2155': '1/5',
  '\u2156': '2/5',
  '\u2157': '3/5',
  '\u2158': '4/5',
  '\u2159': '1/6',
  '\u215A': '5/6',
  '\u215B': '1/8',
  '\u215C': '3/8',
  '\u215D': '5/8',
  '\u215E': '7/8',

  // Whitespace & Invisible characters
  '\u00A0': ' ',
  '\u2000': ' ',
  '\u2001': ' ',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2004': ' ',
  '\u2005': ' ',
  '\u2006': ' ',
  '\u2007': ' ',
  '\u2008': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u202F': ' ',
  '\u205F': ' ',
  '\u3000': ' ',
  '\u200B': '',
  '\u200C': '',
  '\u200D': '',
  '\uFEFF': '',
  '\t': '    ',
  '\r': '',
};

/**
 * Sanitizes arbitrary text strings so they can be safely encoded using pdf-lib StandardFonts
 * (Helvetica, Times Roman, Courier) without throwing WinAnsi encoding errors.
 *
 * @param {string|number|null|undefined} input - Text to sanitize
 * @returns {string} - Guaranteed WinAnsi-safe string
 */
function sanitizeWinAnsi(input) {
  if (input === undefined || input === null) return '';
  let str = String(input);
  if (str.length === 0) return '';

  // 1. Replace mapped Unicode characters
  for (const [key, replacement] of Object.entries(UNICODE_TRANSLITERATION_MAP)) {
    if (str.includes(key)) {
      str = str.split(key).join(replacement);
    }
  }

  // 2. Normalize and strip unencodable diacritics / non-WinAnsi characters
  let output = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.codePointAt(0);

    if (WIN_ANSI_SUPPORTED_CODES.has(code)) {
      output += char;
    } else {
      // Try decomposing accented characters to base Latin
      const normalized = char.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      let allSupported = true;
      for (const normChar of normalized) {
        if (!WIN_ANSI_SUPPORTED_CODES.has(normChar.codePointAt(0))) {
          allSupported = false;
          break;
        }
      }

      if (allSupported && normalized.length > 0) {
        output += normalized;
      } else {
        // Fallback for emojis, CJK, Arabic, Cyrillic or unsupported glyphs
        output += '?';
      }
    }
  }

  return output;
}

module.exports = {
  sanitizeWinAnsi,
  WIN_ANSI_SUPPORTED_CODES,
  UNICODE_TRANSLITERATION_MAP,
};
