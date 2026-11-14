// Protected core LaTeX, KaTeX, and Vectoria commands that layout .sty files sometimes redefine;
// we never allow low-level preamble layout hacks (like \dimexpr minipage macros) to clobber semantic renderers.
const PROTECTED_COMMANDS = new Set([
  'part', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph',
  'begin', 'end', 'item', 'label', 'ref', 'eqref', 'cite', 'url', 'href', 'texorpdfstring',
  'textbf', 'textit', 'emph', 'underline', 'uline', 'sout', 'texttt', 'textsc', 'textsf', 'textrm', 'textnormal',
  'textsuperscript', 'textsubscript', 'textcolor', 'color', 'colorbox', 'fcolorbox', 'hl',
  'includegraphics', 'caption', 'centering', 'maketitle', 'tableofcontents',
  'boxpair', 'bai', 'loigiai', 'lgiai',
  'multicolumn', 'multirow', 'parbox', 'resizebox', 'scalebox', 'rotatebox', 'raisebox',
  'fbox', 'makebox', 'framebox', 'mbox', 'hbox', 'phantom', 'hphantom', 'vphantom', 'rule',
  'toprule', 'midrule', 'bottomrule', 'cmidrule', 'cline', 'hline',
  'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'prod', 'int', 'oint', 'lim', 'left', 'right',
  'vec', 'hat', 'bar', 'tilde', 'overline', 'mathbf', 'mathbb', 'mathcal', 'mathscr', 'mathfrak',
  'mathrm', 'operatorname', 'text', 'quad', 'qquad', 'hbar',
  'thesection', 'thesubsection', 'thechapter', 'theequation', 'theenumi', 'thefigure', 'thetable',
  'arraystretch', 'baselinestretch', 'parindent', 'parskip', 'tabcolsep', 'fboxsep', 'fboxrule'
]);

// Core structural, math, table, list, and font environments that must never be hijacked by theorem/userEnv renaming
const STRUCTURAL_CORE_ENV_NAMES = new Set([
  'document', 'comment',
  'itemize', 'itemize*', 'enumerate', 'enumerate*', 'description', 'description*', 'tasks',
  'figure', 'figure*', 'table', 'table*', 'subfigure', 'subtable', 'wrapfigure', 'wraptable',
  'sidewaysfigure', 'sidewaystable',
  'tabular', 'tabular*', 'tabularx', 'tabulary', 'longtable', 'supertabular', 'xltabular',
  'center', 'flushleft', 'flushright', 'multicols', 'minipage',
  'quote', 'quotation', 'verse', 'abstract',
  'framed', 'mdframed', 'shaded', 'boxed', 'leftbar',
  'verbatim', 'lstlisting', 'minted', 'allintypewriter',
  'subequations', 'empheq', 'appendix', 'subappendices',
  'spacing', 'doublespace', 'onehalfspace', 'singlespace', 'sloppypar', 'samepage', 'adjustwidth', 'changemargin',
  'tcolorbox', 'proof',
  'equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*',
  'aligned', 'gathered', 'eqnarray', 'eqnarray*', 'flalign', 'flalign*', 'alignat', 'alignat*', 'split',
  'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix', 'Bmatrix', 'matrix', 'smallmatrix', 'cases', 'dcases', 'rcases', 'array',
  'tikzpicture', 'titlepage',
  'tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge'
]);

const CANONICAL_ACADEMIC_DEFAULT_LABELS = {
  dn: 'Định nghĩa',
  dl: 'Định lý',
  bode: 'Bổ đề',
  menhde: 'Mệnh đề',
  tc: 'Tính chất',
  hq: 'Hệ quả',
  vd: 'Ví dụ',
  bt: 'Bài tập',
  btmau: 'Bài tập mẫu',
  sol: 'Lời giải',
  note: 'Chú ý',
  nx: 'Nhận xét'
};

// Comprehensive xcolor + dvipsnames + svgnames palette mapped to exact RGB triples [r, g, b]
const XCOLOR_BASE_RGB = {
  black: [17, 24, 28],
  white: [255, 255, 255],
  red: [220, 38, 38],
  deepred: [142, 23, 40],
  darkred: [153, 27, 27],
  brickred: [182, 50, 28],
  firebrick: [178, 34, 34],
  indianred: [205, 92, 92],
  maroon: [128, 0, 32],
  crimson: [190, 18, 60],
  mahogany: [169, 44, 29],
  orangered: [237, 59, 19],
  redorange: [242, 96, 53],
  salmon: [246, 146, 137],
  carnationpink: [242, 130, 180],
  flamingo: [247, 142, 136],
  coral: [255, 127, 80],
  tomato: [255, 99, 71],
  blue: [29, 78, 216],
  darkblue: [30, 58, 138],
  navy: [0, 0, 128],
  navyblue: [0, 70, 173],
  royalblue: [29, 78, 216],
  midnightblue: [25, 25, 112],
  steelblue: [70, 130, 180],
  dodgerblue: [30, 144, 255],
  cornflowerblue: [65, 176, 228],
  skyblue: [98, 196, 228],
  processblue: [0, 176, 240],
  cerulean: [2, 132, 199],
  turquoise: [21, 181, 196],
  aquamarine: [0, 181, 190],
  bluegreen: [21, 181, 176],
  cadetblue: [116, 114, 154],
  periwinkle: [121, 119, 184],
  tealblue: [13, 148, 136],
  cyan: [8, 145, 178],
  teal: [13, 148, 136],
  green: [22, 163, 74],
  darkgreen: [21, 128, 61],
  forestgreen: [21, 128, 61],
  pinegreen: [0, 139, 114],
  seagreen: [46, 139, 87],
  mediumseagreen: [60, 179, 113],
  junglegreen: [0, 169, 154],
  olivegreen: [60, 128, 49],
  olive: [101, 163, 13],
  lime: [101, 163, 13],
  limegreen: [140, 198, 62],
  yellowgreen: [152, 204, 112],
  springgreen: [198, 220, 103],
  greenyellow: [216, 230, 117],
  chartreuse: [127, 255, 0],
  emerald: [5, 150, 105],
  magenta: [209, 18, 112],
  pink: [219, 39, 119],
  hotpink: [255, 105, 180],
  deeppink: [255, 20, 147],
  mediumvioletred: [199, 21, 133],
  rubinered: [206, 1, 123],
  wildstrawberry: [238, 41, 103],
   rhodamine: [239, 84, 159],
  mulberry: [169, 60, 147],
  redviolet: [161, 36, 107],
  fuchsia: [140, 54, 140],
  lavender: [244, 158, 196],
  thistle: [216, 131, 183],
  orchid: [175, 114, 176],
  darkorchid: [164, 83, 138],
  purple: [147, 51, 234],
  royalpurple: [97, 63, 153],
  blueviolet: [71, 57, 146],
  darkviolet: [148, 0, 211],
  mediumpurple: [147, 112, 219],
  slateblue: [106, 90, 205],
  violet: [124, 58, 237],
  plum: [134, 25, 143],
  indigo: [79, 70, 229],
  orange: [234, 88, 12],
  darkorange: [255, 140, 0],
  burntorange: [194, 65, 12],
  bittersweet: [192, 79, 23],
  peach: [247, 150, 90],
  apricot: [251, 185, 130],
  melon: [248, 158, 123],
  yelloworange: [250, 162, 26],
  tan: [218, 157, 118],
  wheat: [245, 222, 179],
  sandybrown: [244, 164, 96],
  peru: [205, 133, 63],
  sienna: [160, 82, 45],
  chocolate: [210, 105, 30],
  rawsienna: [151, 64, 6],
  brown: [146, 64, 14],
  sepia: [112, 66, 20],
  yellow: [202, 138, 4],
  gold: [218, 165, 32],
  khaki: [240, 230, 140],
  goldenrod: [217, 119, 6],
  dandelion: [217, 119, 6],
  amber: [217, 119, 6],
  ivory: [255, 255, 240],
  beige: [245, 245, 220],
  aliceblue: [240, 248, 255],
  azure: [240, 255, 255],
  mintcream: [245, 255, 250],
  whitesmoke: [245, 245, 245],
  slategray: [112, 128, 144],
  slategrey: [112, 128, 144],
  gray: [104, 112, 118],
  grey: [104, 112, 118],
  darkgray: [64, 64, 64],
  darkgrey: [64, 64, 64],
  lightgray: [180, 186, 192],
  lightgrey: [180, 186, 192]
};

export function extractBalancedBraces(str, openBraceIndex) {
  if (!str || openBraceIndex < 0 || openBraceIndex >= str.length || str[openBraceIndex] !== '{') {
    return null;
  }
  let depth = 0;
  for (let i = openBraceIndex; i < str.length; i++) {
    if (str[i] === '\\') {
      let backslashes = 0;
      while (i < str.length && str[i] === '\\') {
        backslashes++;
        i++;
      }
      if (backslashes % 2 !== 0) {
        continue;
      }
      if (i >= str.length) break;
    }
    if (str[i] === '{') {
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(openBraceIndex + 1, i),
          endIndex: i
        };
      }
    }
  }
  return null;
}

// Brace-aware bracket extractor: ignores '[' and ']' nested inside '{...}' (e.g. [label={\arabic*]}])
export function extractBalancedBrackets(str, openBracketIndex) {
  if (!str || openBracketIndex < 0 || openBracketIndex >= str.length || str[openBracketIndex] !== '[') {
    return null;
  }
  let bracketDepth = 0;
  let braceDepth = 0;
  for (let i = openBracketIndex; i < str.length; i++) {
    if (str[i] === '\\') {
      let backslashes = 0;
      while (i < str.length && str[i] === '\\') {
        backslashes++;
        i++;
      }
      if (backslashes % 2 !== 0) {
        continue;
      }
      if (i >= str.length) break;
    }
    if (str[i] === '{') {
      braceDepth++;
      continue;
    }
    if (str[i] === '}') {
      if (braceDepth > 0) braceDepth--;
      continue;
    }
    if (braceDepth === 0) {
      if (str[i] === '[') {
        bracketDepth++;
      } else if (str[i] === ']') {
        bracketDepth--;
        if (bracketDepth === 0) {
          return {
            content: str.substring(openBracketIndex + 1, i),
            endIndex: i
          };
        }
      }
    }
  }
  return null;
}

function skipWhitespace(str, idx) {
  let i = idx;
  while (i < str.length && /\s/.test(str[i])) i++;
  return i;
}

function hexToRgbTriple(hexStr) {
  const clean = (hexStr || '').replace(/^#/, '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return null;
}

function rgbTripleToHex([r, g, b]) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

function lookupSingleColorRgb(name, colorTable) {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.startsWith('#')) {
    return hexToRgbTriple(trimmed);
  }
  const low = trimmed.toLowerCase();
  if (colorTable && colorTable.has(low)) {
    const mapped = colorTable.get(low);
    const parsed = hexToRgbTriple(mapped);
    if (parsed) return parsed;
  }
  const compact = low.replace(/[\s_-]+/g, '');
  if (XCOLOR_BASE_RGB[compact]) {
    return XCOLOR_BASE_RGB[compact];
  }
  return null;
}

// Resolve full xcolor expressions including optional [model] (HTML, RGB, rgb, cmyk, gray) and mixes like "red!70!black"
export function resolveLatexColorToCss(rawColorExpr, colorTable = null, colorModel = '') {
  if (!rawColorExpr) return 'inherit';
  const expr = String(rawColorExpr).trim();
  if (!expr) return 'inherit';
  if (expr.startsWith('#') || expr.startsWith('rgb') || expr.startsWith('var(')) {
    return expr;
  }

  const rawModel = String(colorModel || '').trim();
  const modelLow = rawModel.toLowerCase();
  if (modelLow) {
    if (modelLow === 'html') {
      const hex = expr.replace(/^#/, '').trim();
      if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
      if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
      }
    } else if (rawModel === 'RGB') {
      const parts = expr.split(',').map((s) => Math.max(0, Math.min(255, parseInt(s.trim(), 10) || 0)));
      if (parts.length === 3) return rgbTripleToHex(parts);
    } else if (modelLow === 'rgb') {
      const nums = expr.split(',').map((s) => parseFloat(s.trim()) || 0);
      if (nums.length === 3) {
        const scale = nums.some((v) => v > 1.001) ? 1 : 255;
        return rgbTripleToHex(nums.map((v) => Math.max(0, Math.min(255, Math.round(v * scale)))));
      }
    } else if (modelLow === 'cmyk') {
      const parts = expr.split(',').map((s) => Math.max(0, Math.min(1, parseFloat(s.trim()) || 0)));
      if (parts.length === 4) {
        const [c, m, y, k] = parts;
        return rgbTripleToHex([
          255 * (1 - c) * (1 - k),
          255 * (1 - m) * (1 - k),
          255 * (1 - y) * (1 - k)
        ]);
      }
    } else if (modelLow === 'gray') {
      const v = Math.max(0, Math.min(255, Math.round((parseFloat(expr) || 0) * 255)));
      return rgbTripleToHex([v, v, v]);
    }
  }

  // Handle xcolor '!' mixing chain: c0 ! p1 ! c1 ! p2 ! c2 ...
  if (expr.includes('!')) {
    const tokens = expr.split('!').map((s) => s.trim()).filter(Boolean);
    if (tokens.length >= 2) {
      let currentRgb = lookupSingleColorRgb(tokens[0], colorTable) || [17, 24, 28];
      let idx = 1;
      while (idx < tokens.length) {
        const pct = Math.max(0, Math.min(100, parseFloat(tokens[idx])));
        if (isNaN(pct)) break;
        const w = pct / 100;
        const nextColorName = idx + 1 < tokens.length ? tokens[idx + 1] : 'white';
        const targetRgb = lookupSingleColorRgb(nextColorName, colorTable) || [255, 255, 255];
        currentRgb = [
          currentRgb[0] * w + targetRgb[0] * (1 - w),
          currentRgb[1] * w + targetRgb[1] * (1 - w),
          currentRgb[2] * w + targetRgb[2] * (1 - w)
        ];
        idx += 2;
      }
      return rgbTripleToHex(currentRgb);
    }
  }

  const low = expr.toLowerCase();
  if (colorTable && colorTable.has(low)) {
    return colorTable.get(low);
  }
  const rgb = lookupSingleColorRgb(expr, colorTable);
  if (rgb) {
    return rgbTripleToHex(rgb);
  }
  if (/^[0-9a-fA-F]{6}$/.test(expr)) {
    return `#${low}`;
  }
  return low;
}

export function isChromaticHexColor(cssCol) {
  const rgb = hexToRgbTriple(cssCol);
  if (!rgb) return false;
  return Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) >= 25;
}

export function computeDarkThemeTextColor(cssCol) {
  if (!cssCol || cssCol === 'inherit') return '';
  const rgb = hexToRgbTriple(cssCol);
  if (!rgb) return cssCol;
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  if (lum >= 0.48) return cssCol;
  return rgbTripleToHex([
    Math.min(255, Math.round(rgb[0] * 0.65 + 115)),
    Math.min(255, Math.round(rgb[1] * 0.65 + 125)),
    Math.min(255, Math.round(rgb[2] * 0.65 + 135))
  ]);
}

function extractColorFromTexSnippet(snippet, colorTable) {
  if (!snippet) return '';
  const m = /\\(?:textcolor|color)\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}/.exec(snippet);
  if (!m) return '';
  const resolved = resolveLatexColorToCss(m[2], colorTable, m[1] || '');
  return resolved && resolved !== 'inherit' ? resolved : '';
}

function classifyAcademicLabelToCanonicalEnv(displayLabel, envName, fallbackToTc = false) {
  const norm = `${displayLabel || ''} ${envName || ''}`.toLowerCase();
  if (/định\s*nghĩa|dinh\s*nghia|definition|\bdn\b|\bdinhnghia\b/.test(norm)) return 'dn';
  if (/bổ\s*đề|bo\s*de|lemma|\bbd\b|\bbode\b/.test(norm)) return 'bode';
  if (/định\s*lý|định\s*lí|dinh\s*ly|theorem|\bdl\b|\bthm\b|\bdinhly\b/.test(norm)) return 'dl';
  if (/mệnh\s*đề|menh\s*de|proposition|khẳng\s*định|\bmd\b|\bmde\b|\bprop\b|\bmenhde\b/.test(norm)) return 'menhde';
  if (/tính\s*chất|tinh\s*chat|propert|\btc\b|\btinhchat\b/.test(norm)) return 'tc';
  if (/hệ\s*quả|he\s*qua|corollar|\bhq\b|\bhequa\b/.test(norm)) return 'hq';
  if (/ví\s*dụ|vi\s*du|example|\bvd\b|\bvidu\b/.test(norm)) return 'vd';
  if (/bài\s*tập\s*mẫu|bai\s*tap\s*mau|\bbtmau\b/.test(norm)) return 'btmau';
  if (/bài\s*tập|bài\s*toán|câu\s*hỏi|exercise|problem|\bbt\b|\bex\b|\bbtoan\b|\bbaitap\b|\bcauhoi\b|\bquestion\b/.test(norm)) return 'bt';
  if (/lời\s*giải|chứng\s*minh|solution|\bsol\b|\bloigiai\b/.test(norm)) return 'sol';
  if (/chú\s*ý|lưu\s*ý|ghi\s*chú|note|cảnh\s*báo|\bcy\b|\bchuy\b|\bghichu\b|\bluuy\b/.test(norm)) return 'note';
  if (/nhận\s*xét|nhan\s*xet|remark|\bnx\b|\bnhanxet\b/.test(norm)) return 'nx';
  return fallbackToTc ? 'tc' : null;
}

function isSafeMacroBody(body) {
  if (!body) return true;
  // Block low-level TeX layout / register / catcode / mathpalette primitives from exploding into web DOM / KaTeX
  if (
    /\\(?:makeatletter|catcode|csname|expandafter|@ifnextchar|@startsection|renewcommand|newcommand|DeclareRobustCommand|dimexpr|numexpr|ifthenelse|ifx|ifnum|vbox|vtop|setbox|mathpalette|rlap|llap)/.test(
      body
    )
  ) {
    return false;
  }
  return true;
}

// Extract clean math symbol fallback for common StackExchange \mathpalette raised-symbol idioms (e.g. \rchi -> \chi)
function resolveMathPaletteFallback(cmdName, rawBody, sourceText) {
  if (!rawBody || !rawBody.includes('\\mathpalette')) return null;
  if (/^(?:rchi|upchi|varrchi)$/i.test(cmdName)) return '\\chi';
  const mHelper = /\\mathpalette\s*\\([a-zA-Z]+)\s*\\relax/.exec(rawBody);
  if (mHelper && sourceText) {
    const helperName = mHelper[1];
    const helperRe = new RegExp(`\\\\(?:newcommand|def)\\*?\\s*(?:\\{\\\\${helperName}\\}|\\\\${helperName})(?:\\s*\\[\\d+\\])?\\s*\\{([^}]*\\$([^$]+)\\$[^}]*)\\}`);
    const hm = helperRe.exec(sourceText);
    if (hm && hm[2]) {
      const cleanedSym = hm[2].replace(/#[1-9]/g, '').trim();
      if (/^\\[a-zA-Z]+$/.test(cleanedSym)) return cleanedSym;
    }
  }
  return null;
}

function parseNewcommands(sourceText, macroTable) {
  const regex = /\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand)\*?\s*/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let cmdName = '';

    if (sourceText[cursor] === '{') {
      const cmdGroup = extractBalancedBraces(sourceText, cursor);
      if (!cmdGroup) continue;
      cmdName = cmdGroup.content.trim().replace(/^\\/, '');
      cursor = cmdGroup.endIndex + 1;
    } else if (sourceText[cursor] === '\\') {
      const mCmd = /^\\([a-zA-Z]+)\b/.exec(sourceText.slice(cursor));
      if (!mCmd) continue;
      cmdName = mCmd[1];
      cursor += mCmd[0].length;
    } else {
      continue;
    }

    if (!cmdName || !/^[a-zA-Z]+$/.test(cmdName) || PROTECTED_COMMANDS.has(cmdName)) {
      continue;
    }

    cursor = skipWhitespace(sourceText, cursor);
    let numArgs = 0;
    let defaultOpt = null;

    if (sourceText[cursor] === '[') {
      const argCountBr = extractBalancedBrackets(sourceText, cursor);
      if (!argCountBr) continue;
      const parsedCount = parseInt(argCountBr.content.trim(), 10);
      if (!isNaN(parsedCount) && parsedCount >= 0 && parsedCount <= 9) {
        numArgs = parsedCount;
      }
      cursor = skipWhitespace(sourceText, argCountBr.endIndex + 1);

      if (sourceText[cursor] === '[') {
        const optBr = extractBalancedBrackets(sourceText, cursor);
        if (optBr) {
          defaultOpt = optBr.content;
          cursor = skipWhitespace(sourceText, optBr.endIndex + 1);
        }
      }
    }

    if (sourceText[cursor] !== '{') continue;
    const bodyGroup = extractBalancedBraces(sourceText, cursor);
    if (!bodyGroup) continue;

    if (isSafeMacroBody(bodyGroup.content)) {
      macroTable.set(cmdName, {
        name: cmdName,
        numArgs,
        defaultOpt,
        body: bodyGroup.content.trim()
      });
    } else if (numArgs === 0) {
      const fallbackSym = resolveMathPaletteFallback(cmdName, bodyGroup.content, sourceText);
      if (fallbackSym) {
        macroTable.set(cmdName, {
          name: cmdName,
          numArgs: 0,
          defaultOpt: null,
          body: fallbackSym
        });
      }
    }
    regex.lastIndex = bodyGroup.endIndex + 1;
  }
}

// Parse xparse commands: \NewDocumentCommand{\cmd}{m O{default} m}{body}
function parseXparseDocumentCommands(sourceText, macroTable) {
  const regex = /\\(?:NewDocumentCommand|RenewDocumentCommand|ProvideDocumentCommand|DeclareDocumentCommand)\s*/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let cmdName = '';
    if (sourceText[cursor] === '{') {
      const g = extractBalancedBraces(sourceText, cursor);
      if (!g) continue;
      cmdName = g.content.trim().replace(/^\\/, '');
      cursor = skipWhitespace(sourceText, g.endIndex + 1);
    } else if (sourceText[cursor] === '\\') {
      const mc = /^\\([a-zA-Z]+)\b/.exec(sourceText.slice(cursor));
      if (!mc) continue;
      cmdName = mc[1];
      cursor = skipWhitespace(sourceText, cursor + mc[0].length);
    } else {
      continue;
    }

    if (sourceText[cursor] !== '{') continue;
    const specGrp = extractBalancedBraces(sourceText, cursor);
    if (!specGrp) continue;
    cursor = skipWhitespace(sourceText, specGrp.endIndex + 1);
    if (sourceText[cursor] !== '{') continue;
    const bodyGrp = extractBalancedBraces(sourceText, cursor);
    if (!bodyGrp) continue;

    regex.lastIndex = bodyGrp.endIndex + 1;
    if (!cmdName || !/^[a-zA-Z]+$/.test(cmdName) || PROTECTED_COMMANDS.has(cmdName)) continue;
    if (!isSafeMacroBody(bodyGrp.content)) continue;

    // Parse simple xparse arg specifiers (m, O{def}, o)
    const spec = specGrp.content.trim();
    const argTokens = [];
    let sIdx = 0;
    let supported = true;
    while (sIdx < spec.length) {
      if (/\s/.test(spec[sIdx])) {
        sIdx++;
        continue;
      }
      const ch = spec[sIdx];
      if (ch === 'm') {
        argTokens.push({ kind: 'm' });
        sIdx++;
      } else if (ch === 'o') {
        argTokens.push({ kind: 'o', def: '' });
        sIdx++;
      } else if (ch === 'O') {
        const bPos = skipWhitespace(spec, sIdx + 1);
        if (spec[bPos] === '{') {
          const defG = extractBalancedBraces(spec, bPos);
          if (defG) {
            argTokens.push({ kind: 'O', def: defG.content });
            sIdx = defG.endIndex + 1;
            continue;
          }
        }
        supported = false;
        break;
      } else {
        supported = false;
        break;
      }
    }

    if (!supported) continue;
    // Support standard 0..9 mandatory args or 1 leading optional + N mandatory args
    const firstIsOpt = argTokens.length > 0 && (argTokens[0].kind === 'O' || argTokens[0].kind === 'o');
    const restAllMandatory = argTokens.slice(firstIsOpt ? 1 : 0).every((t) => t.kind === 'm');
    if (!restAllMandatory) continue;

    macroTable.set(cmdName, {
      name: cmdName,
      numArgs: argTokens.length,
      defaultOpt: firstIsOpt ? argTokens[0].def : null,
      body: bodyGrp.content.trim()
    });
  }
}

// Parse mathtools \DeclarePairedDelimiter{\abs}{\lvert}{\rvert}
function parseDeclarePairedDelimiters(sourceText, macroTable) {
  const regex = /\\DeclarePairedDelimiter\s*/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let cmdName = '';
    if (sourceText[cursor] === '{') {
      const g = extractBalancedBraces(sourceText, cursor);
      if (!g) continue;
      cmdName = g.content.trim().replace(/^\\/, '');
      cursor = skipWhitespace(sourceText, g.endIndex + 1);
    } else if (sourceText[cursor] === '\\') {
      const mc = /^\\([a-zA-Z]+)\b/.exec(sourceText.slice(cursor));
      if (!mc) continue;
      cmdName = mc[1];
      cursor = skipWhitespace(sourceText, cursor + mc[0].length);
    } else {
      continue;
    }

    if (sourceText[cursor] !== '{') continue;
    const leftGrp = extractBalancedBraces(sourceText, cursor);
    if (!leftGrp) continue;
    cursor = skipWhitespace(sourceText, leftGrp.endIndex + 1);
    if (sourceText[cursor] !== '{') continue;
    const rightGrp = extractBalancedBraces(sourceText, cursor);
    if (!rightGrp) continue;

    regex.lastIndex = rightGrp.endIndex + 1;
    if (cmdName && /^[a-zA-Z]+$/.test(cmdName) && !PROTECTED_COMMANDS.has(cmdName)) {
      const lDelim = leftGrp.content.trim() || '.';
      const rDelim = rightGrp.content.trim() || '.';
      macroTable.set(cmdName, {
        name: cmdName,
        numArgs: 1,
        defaultOpt: null,
        allowStar: true,
        body: `\\left${lDelim} #1 \\right${rDelim}`
      });
    }
  }
}

function parseDeclareMathOperators(sourceText, macroTable) {
  const regex = /\\DeclareMathOperator(\*)?\s*/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    const isStar = Boolean(match[1]);
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let cmdName = '';

    if (sourceText[cursor] === '{') {
      const cmdGroup = extractBalancedBraces(sourceText, cursor);
      if (!cmdGroup) continue;
      cmdName = cmdGroup.content.trim().replace(/^\\/, '');
      cursor = skipWhitespace(sourceText, cmdGroup.endIndex + 1);
    } else if (sourceText[cursor] === '\\') {
      const mCmd = /^\\([a-zA-Z]+)\b/.exec(sourceText.slice(cursor));
      if (!mCmd) continue;
      cmdName = mCmd[1];
      cursor = skipWhitespace(sourceText, cursor + mCmd[0].length);
    } else {
      continue;
    }

    if (sourceText[cursor] !== '{') continue;
    const textGroup = extractBalancedBraces(sourceText, cursor);
    if (!textGroup) continue;

    if (cmdName && /^[a-zA-Z]+$/.test(cmdName) && !PROTECTED_COMMANDS.has(cmdName)) {
      const opCmd = isStar ? '\\operatorname*' : '\\operatorname';
      macroTable.set(cmdName, {
        name: cmdName,
        numArgs: 0,
        defaultOpt: null,
        body: `${opCmd}{${textGroup.content.trim()}}`
      });
    }
    regex.lastIndex = textGroup.endIndex + 1;
  }
}

function parseTexDefs(sourceText, macroTable) {
  const regex = /\\def\s*\\([a-zA-Z]+)((?:#[1-9])*)\s*\{/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    const cmdName = match[1];
    const paramSpec = match[2] || '';
    if (!cmdName || PROTECTED_COMMANDS.has(cmdName)) continue;

    const braceIdx = sourceText.indexOf('{', match.index + match[0].length - 1);
    const bodyGroup = extractBalancedBraces(sourceText, braceIdx);
    if (!bodyGroup) continue;

    const numArgs = paramSpec ? paramSpec.length / 2 : 0;
    if (isSafeMacroBody(bodyGroup.content) && !macroTable.has(cmdName)) {
      macroTable.set(cmdName, {
        name: cmdName,
        numArgs,
        defaultOpt: null,
        body: bodyGroup.content.trim()
      });
    }
    regex.lastIndex = bodyGroup.endIndex + 1;
  }
}

export function latexDimToPx(dimStr, fallbackPx = 8) {
  if (dimStr === null || dimStr === undefined) return fallbackPx;
  const raw = String(dimStr).trim().replace(/^\{|\}$/g, '').trim();
  if (!raw) return fallbackPx;
  const m = /^([+-]?\d*(?:\.\d+)?)\s*(pt|mm|cm|in|ex|em|bp|px)?$/i.exec(raw);
  if (!m || m[1] === '' || m[1] === '.' || m[1] === '+' || m[1] === '-') return fallbackPx;
  const val = parseFloat(m[1]);
  if (isNaN(val)) return fallbackPx;
  if (val <= 0) return 0;
  const unit = (m[2] || 'pt').toLowerCase();
  if (unit === 'mm') return Math.round(val * 3.8 * 10) / 10;
  if (unit === 'cm') return Math.round(val * 37.8 * 10) / 10;
  if (unit === 'in') return Math.round(val * 96 * 10) / 10;
  if (unit === 'em') return Math.round(val * 16 * 10) / 10;
  if (unit === 'ex') return Math.round(val * 7.5 * 10) / 10;
  if (unit === 'px') return Math.round(val * 10) / 10;
  // pt or bp
  return Math.round(val * 1.35 * 10) / 10;
}

export function splitTopLevelCommaOptions(optStr) {
  const parts = [];
  if (!optStr) return parts;
  let depth = 0;
  let start = 0;
  for (let i = 0; i < optStr.length; i++) {
    const ch = optStr[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      if (depth > 0) depth--;
    } else if (ch === ',' && depth === 0) {
      const piece = optStr.substring(start, i).trim();
      if (piece) parts.push(piece);
      start = i + 1;
    }
  }
  const tail = optStr.substring(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function stripOuterBracesOnce(str) {
  if (!str) return '';
  const t = str.trim();
  if (t.startsWith('{') && t.endsWith('}')) {
    const g = extractBalancedBraces(t, 0);
    if (g && g.endIndex === t.length - 1) return g.content.trim();
  }
  return t;
}

export function computeDarkThemeBoxColors(colbackCss, colframeCss) {
  const frameRgb = hexToRgbTriple(colframeCss) || [100, 116, 139];
  const frameLum = (0.299 * frameRgb[0] + 0.587 * frameRgb[1] + 0.114 * frameRgb[2]) / 255;
  const darkFrame =
    frameLum < 0.24
      ? rgbTripleToHex([
          Math.min(255, frameRgb[0] + 115),
          Math.min(255, frameRgb[1] + 120),
          Math.min(255, frameRgb[2] + 130)
        ])
      : colframeCss && colframeCss !== 'inherit'
      ? colframeCss
      : '#64748b';

  if (!colbackCss || colbackCss === 'transparent' || colbackCss === 'none') {
    return { darkBg: 'transparent', darkFrame };
  }

  const backRgb = hexToRgbTriple(colbackCss);
  if (!backRgb) {
    return { darkBg: `rgba(${frameRgb[0]}, ${frameRgb[1]}, ${frameRgb[2]}, 0.12)`, darkFrame };
  }

  const backLum = (0.299 * backRgb[0] + 0.587 * backRgb[1] + 0.114 * backRgb[2]) / 255;
  if (backLum <= 0.35) {
    return { darkBg: colbackCss, darkFrame };
  }

  // Derive subtle dark-mode tint from colframe (if chromatic) or colback
  const frameSpread = Math.max(...frameRgb) - Math.min(...frameRgb);
  const backSpread = Math.max(...backRgb) - Math.min(...backRgb);
  const tintRgb = frameSpread >= 18 ? frameRgb : backSpread >= 12 ? backRgb : [148, 163, 184];
  const alpha = frameSpread >= 18 || backSpread >= 12 ? 0.13 : 0.08;
  return {
    darkBg: `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${alpha})`,
    darkFrame
  };
}

function parseTcbAndMdfStyles(sourceText, boxStyleDefs) {
  if (!sourceText) return;
  let m;
  // 1. \tcbset{ ... }
  const tcbSetRe = /\\tcbset\s*\{/g;
  const globalTcbOpts = [];
  while ((m = tcbSetRe.exec(sourceText)) !== null) {
    const bIdx = sourceText.lastIndexOf('{', m.index + m[0].length);
    const grp = extractBalancedBraces(sourceText, bIdx);
    if (!grp) continue;
    tcbSetRe.lastIndex = grp.endIndex + 1;
    const entries = splitTopLevelCommaOptions(grp.content);
    for (const entry of entries) {
      const styleDefMatch = /^([a-zA-Z0-9_@/\s-]+?)\s*\/\.(?:style|code)(?:\s+2\s+args)?\s*=\s*([\s\S]+)$/.exec(entry);
      if (styleDefMatch) {
        const sName = styleDefMatch[1].trim();
        const sBody = stripOuterBracesOnce(styleDefMatch[2]);
        if (sName) {
          const prev = boxStyleDefs.get(sName);
          boxStyleDefs.set(sName, prev ? `${prev}, ${sBody}` : sBody);
        }
      } else if (!entry.includes('/.')) {
        globalTcbOpts.push(entry);
      }
    }
  }
  if (globalTcbOpts.length > 0) {
    boxStyleDefs.set('__tcb_default__', globalTcbOpts.join(', '));
  }

  // 2. \mdfdefinestyle{name}{opts} & \mdfsetup{opts}
  const mdfDefRe = /\\mdfdefinestyle\s*\{([^}]+)\}\s*\{/g;
  while ((m = mdfDefRe.exec(sourceText)) !== null) {
    const sName = m[1].trim();
    const bIdx = sourceText.lastIndexOf('{', m.index + m[0].length);
    const grp = extractBalancedBraces(sourceText, bIdx);
    if (!grp) continue;
    mdfDefRe.lastIndex = grp.endIndex + 1;
    if (sName) boxStyleDefs.set(sName, grp.content.trim());
  }

  const mdfSetupRe = /\\mdfsetup\s*\{/g;
  const globalMdfOpts = [];
  while ((m = mdfSetupRe.exec(sourceText)) !== null) {
    const bIdx = sourceText.lastIndexOf('{', m.index + m[0].length);
    const grp = extractBalancedBraces(sourceText, bIdx);
    if (!grp) continue;
    mdfSetupRe.lastIndex = grp.endIndex + 1;
    if (grp.content.trim()) globalMdfOpts.push(grp.content.trim());
  }
  if (globalMdfOpts.length > 0) {
    boxStyleDefs.set('__mdf_default__', globalMdfOpts.join(', '));
  }
}

function extractColorFromTikzStyleToken(tikzSpec, colorTable) {
  if (!tikzSpec) return null;
  const ignore = new Set([
    'draw', 'fill', 'solid', 'dashed', 'densely dashed', 'loosely dashed',
    'dotted', 'densely dotted', 'loosely dotted', 'thin', 'very thin', 'ultra thin',
    'semithick', 'thick', 'very thick', 'ultra thick', 'rounded corners', 'sharp corners'
  ]);
  const tokens = splitTopLevelCommaOptions(stripOuterBracesOnce(tikzSpec));
  for (const tok of tokens) {
    const cleanTok = tok.replace(/^(?:draw|color)\s*=\s*/i, '').trim();
    if (!cleanTok || ignore.has(cleanTok.toLowerCase()) || /^(?:line\s*width|opacity)/i.test(cleanTok)) continue;
    const resolved = resolveLatexColorToCss(cleanTok, colorTable);
    if (resolved && resolved.startsWith('#')) return resolved;
  }
  return null;
}

export function parseBoxVisualOptions(rawOpts, colorTable = null, boxStyleDefs = null, engine = 'tcolorbox', meta = {}) {
  const isMdf = engine === 'mdframed';
  const isLeftbar = engine === 'leftbar';
  const isFramedPlain = engine === 'framed';
  const isShaded = engine === 'shaded';

  const state = {
    engine,
    colback: isMdf || isLeftbar || isFramedPlain ? 'transparent' : isShaded ? '#f1f5f9' : '#f3f5f8',
    colframe: '#475569',
    colbacktitle: null,
    coltitle: '#ffffff',
    radiusPx: isMdf || isLeftbar || isFramedPlain || isShaded ? 0 : 8,
    topRulePx: isLeftbar || isShaded ? 0 : 1.5,
    rightRulePx: isLeftbar || isShaded ? 0 : 1.5,
    bottomRulePx: isLeftbar || isShaded ? 0 : 1.5,
    leftRulePx: isLeftbar ? 3.5 : isShaded ? 0 : 1.5,
    headerMode: meta.hasTitle ? 'bar' : 'inline',
    rawTitleTemplate: ''
  };

  const visitedStyles = new Set();

  const applyOptionList = (optString) => {
    if (!optString) return;
    const entries = splitTopLevelCommaOptions(optString);
    for (const entry of entries) {
      const eqIdx = (() => {
        let d = 0;
        for (let i = 0; i < entry.length; i++) {
          if (entry[i] === '\\') {
            i++;
            continue;
          }
          if (entry[i] === '{') d++;
          else if (entry[i] === '}') {
            if (d > 0) d--;
          } else if (entry[i] === '=' && d === 0) return i;
        }
        return -1;
      })();

      const key = (eqIdx === -1 ? entry : entry.substring(0, eqIdx)).trim();
      const keyLow = key.toLowerCase();
      const rawVal = eqIdx === -1 ? '' : entry.substring(eqIdx + 1).trim();
      const val = stripOuterBracesOnce(rawVal);

      // Expand named style if present in boxStyleDefs
      if (eqIdx === -1 && boxStyleDefs && boxStyleDefs.has(key) && !visitedStyles.has(key)) {
        visitedStyles.add(key);
        applyOptionList(boxStyleDefs.get(key));
        continue;
      }
      if ((keyLow === 'style' || keyLow === 'mdfstyle') && val && boxStyleDefs && boxStyleDefs.has(val) && !visitedStyles.has(val)) {
        visitedStyles.add(val);
        applyOptionList(boxStyleDefs.get(val));
        continue;
      }

      if (keyLow === 'empty' || keyLow === 'blank' || keyLow === 'blanker' || keyLow === 'blankest') {
        state.colback = 'transparent';
        state.topRulePx = 0;
        state.rightRulePx = 0;
        state.bottomRulePx = 0;
        state.leftRulePx = 0;
        state.radiusPx = 0;
        continue;
      }

      if (keyLow === 'frame hidden' || (keyLow === 'hidealllines' && val.toLowerCase() !== 'false')) {
        state.topRulePx = 0;
        state.rightRulePx = 0;
        state.bottomRulePx = 0;
        state.leftRulePx = 0;
        continue;
      }

      if (keyLow === 'interior hidden' || (keyLow === 'opacityback' && parseFloat(val) === 0)) {
        state.colback = 'transparent';
        continue;
      }

      if (keyLow === 'sharp corners') {
        if (!val || val === 'all' || val === 'downhill' || val === 'uphill') {
          state.radiusPx = 0;
        }
        continue;
      }

      if (keyLow === 'rounded corners') {
        state.radiusPx = Math.max(state.radiusPx, val ? latexDimToPx(val, 8) : 8);
        continue;
      }

      if (keyLow === 'arc' || keyLow === 'outer arc' || keyLow === 'roundcorner') {
        const px = Math.max(0, Math.min(24, latexDimToPx(val, 8)));
        state.radiusPx = px;
        continue;
      }

      if (keyLow === 'boxrule' || keyLow === 'linewidth' || keyLow === ' framerule') {
        const w = Math.max(0, Math.min(10, latexDimToPx(val, 1.5)));
        state.topRulePx = w;
        state.rightRulePx = w;
        state.bottomRulePx = w;
        state.leftRulePx = w;
        continue;
      }

      if (keyLow === 'leftrule') {
        state.leftRulePx = Math.max(0, Math.min(12, latexDimToPx(val, 3)));
        continue;
      }
      if (keyLow === 'rightrule') {
        state.rightRulePx = Math.max(0, Math.min(12, latexDimToPx(val, 1.5)));
        continue;
      }
      if (keyLow === 'toprule') {
        state.topRulePx = Math.max(0, Math.min(12, latexDimToPx(val, 1.5)));
        continue;
      }
      if (keyLow === 'bottomrule') {
        state.bottomRulePx = Math.max(0, Math.min(12, latexDimToPx(val, 1.5)));
        continue;
      }

      if (keyLow === 'topline' && val.toLowerCase() === 'false') {
        state.topRulePx = 0;
        continue;
      }
      if (keyLow === 'rightline' && val.toLowerCase() === 'false') {
        state.rightRulePx = 0;
        continue;
      }
      if (keyLow === 'bottomline' && val.toLowerCase() === 'false') {
        state.bottomRulePx = 0;
        continue;
      }
      if (keyLow === 'leftline' && val.toLowerCase() === 'false') {
        state.leftRulePx = 0;
        continue;
      }

      if (keyLow.startsWith('borderline')) {
        // borderline west={2pt}{0pt}{blue!75!black}
        const groups = [];
        let cur = 0;
        while (cur < rawVal.length && groups.length < 3) {
          const bPos = rawVal.indexOf('{', cur);
          if (bPos === -1) break;
          const g = extractBalancedBraces(rawVal, bPos);
          if (!g) break;
          groups.push(g.content.trim());
          cur = g.endIndex + 1;
        }
        const bw = Math.max(1.5, Math.min(12, latexDimToPx(groups[0] || '2.5pt', 3)));
        if (keyLow === 'borderline west') state.leftRulePx = Math.max(state.leftRulePx, bw);
        else if (keyLow === 'borderline east') state.rightRulePx = Math.max(state.rightRulePx, bw);
        else if (keyLow === 'borderline north') state.topRulePx = Math.max(state.topRulePx, bw);
        else if (keyLow === 'borderline south') state.bottomRulePx = Math.max(state.bottomRulePx, bw);
        else {
          state.topRulePx = Math.max(state.topRulePx, bw);
          state.rightRulePx = Math.max(state.rightRulePx, bw);
          state.bottomRulePx = Math.max(state.bottomRulePx, bw);
          state.leftRulePx = Math.max(state.leftRulePx, bw);
        }
        const bCol = extractColorFromTikzStyleToken(groups[2] || '', colorTable);
        if (bCol) state.colframe = bCol;
        continue;
      }

      if (keyLow === 'colback' || keyLow === 'backgroundcolor' || keyLow === 'InnerBackgroundColor'.toLowerCase()) {
        const c = resolveLatexColorToCss(val, colorTable);
        if (c && c !== 'inherit') state.colback = c;
        continue;
      }

      if (keyLow === 'colframe' || keyLow === 'linecolor') {
        const c = resolveLatexColorToCss(val, colorTable);
        if (c && c !== 'inherit') state.colframe = c;
        continue;
      }

      if (keyLow === 'colbacktitle' || keyLow === 'frametitlebackgroundcolor') {
        const c = resolveLatexColorToCss(val, colorTable);
        if (c && c !== 'inherit') state.colbacktitle = c;
        continue;
      }

      if (keyLow === 'coltitle' || keyLow === 'frametitlefontcolor') {
        const c = resolveLatexColorToCss(val, colorTable);
        if (c && c !== 'inherit') state.coltitle = c;
        continue;
      }

      if (keyLow === 'title' || keyLow === 'frametitle') {
        state.rawTitleTemplate = val;
        if (state.headerMode !== 'boxed-pill') state.headerMode = 'bar';
        continue;
      }

      if (keyLow.startsWith('attach boxed title')) {
        state.headerMode = 'boxed-pill';
        continue;
      }

      if (keyLow === 'boxed title style' && val) {
        const innerEntries = splitTopLevelCommaOptions(val);
        for (const ie of innerEntries) {
          const mCol = /^colback\s*=\s*([\s\S]+)$/i.exec(ie.trim());
          if (mCol) {
            const c = resolveLatexColorToCss(stripOuterBracesOnce(mCol[1]), colorTable);
            if (c && c !== 'inherit') state.colbacktitle = c;
          }
        }
        continue;
      }

      if (keyLow === 'detach title') {
        state.headerMode = 'inline';
        continue;
      }
    }
  };

  if (boxStyleDefs) {
    if (!isMdf && boxStyleDefs.has('__tcb_default__')) {
      applyOptionList(boxStyleDefs.get('__tcb_default__'));
    } else if (isMdf && boxStyleDefs.has('__mdf_default__')) {
      applyOptionList(boxStyleDefs.get('__mdf_default__'));
    }
  }
  applyOptionList(rawOpts);

  if (!state.colbacktitle) {
    state.colbacktitle = state.colframe;
  }

  const hasAnyBorder =
    state.topRulePx > 0 || state.rightRulePx > 0 || state.bottomRulePx > 0 || state.leftRulePx > 0;
  const hasTintedBg =
    state.colback !== 'transparent' &&
    state.colback !== 'none' &&
    state.colback.toLowerCase() !== '#ffffff';
  const isVisibleFrame = hasAnyBorder || hasTintedBg || state.headerMode !== 'inline';
  const { darkBg, darkFrame } = computeDarkThemeBoxColors(state.colback, state.colframe);

  return {
    ...state,
    darkBg,
    darkFrame,
    isVisibleFrame
  };
}

function parseXparseArgSpecCounts(specStr) {
  const spec = (specStr || '').trim();
  let sIdx = 0;
  const tokens = [];
  while (sIdx < spec.length) {
    if (/\s/.test(spec[sIdx])) {
      sIdx++;
      continue;
    }
    const ch = spec[sIdx];
    if (ch === 'm') {
      tokens.push({ kind: 'm' });
      sIdx++;
    } else if (ch === 'o' || ch === 'g') {
      tokens.push({ kind: 'o', def: '' });
      sIdx++;
    } else if (ch === 'O' || ch === 'D' || ch === 'G') {
      let next = skipWhitespace(spec, sIdx + 1);
      if (ch === 'D' && next + 2 <= spec.length) next = skipWhitespace(spec, next + 2);
      if (spec[next] === '{') {
        const g = extractBalancedBraces(spec, next);
        if (g) {
          tokens.push({ kind: 'O', def: g.content });
          sIdx = g.endIndex + 1;
          continue;
        }
      }
      sIdx++;
    } else if (ch === 'd') {
      sIdx += 3;
    } else {
      sIdx++;
    }
  }
  const hasOptionalFirstArg = tokens.length > 0 && (tokens[0].kind === 'o' || tokens[0].kind === 'O');
  const defaultOpt = hasOptionalFirstArg ? tokens[0].def : null;
  const mandatoryArgsCount = tokens.filter((t) => t.kind === 'm').length;
  return {
    numArgs: tokens.length,
    hasOptionalFirstArg,
    defaultOpt,
    mandatoryArgsCount
  };
}

function cleanDisplayLabelFromTitleTemplate(rawTitle) {
  if (!rawTitle) return '';
  let s = rawTitle
    .replace(/#[1-9]/g, '')
    .replace(/\\thetcbcounter\b/g, '')
    .replace(/\\the[a-zA-Z]+\b/g, '')
    .replace(/~/g, ' ');
  s = unwrapTexFormattingToPlainText(s);
  s = s.replace(/^[\s.:;()[\]-]+|[\s.:;()[\]-]+$/g, '').trim();
  return s;
}

function parseCustomTheoremsAndEnvironments(sourceText, customEnvs, userEnvs, macroTable, colorTable, boxStyleDefs) {
  if (!sourceText) return;
  const events = [];
  let match;

  const amsthmStyleMap = new Map([
    ['plain', { bodyFontStyle: 'italic', labelColor: '' }],
    ['definition', { bodyFontStyle: 'normal', labelColor: '' }],
    ['remark', { bodyFontStyle: 'normal', labelColor: '' }]
  ]);
  let activeTheoremStyle = 'plain';

  // A0. \newtheoremstyle{name}{spaceabove}{spacebelow}{bodyfont}{indent}{headfont}{headpunct}{headspace}{headspec}
  const newThmStyleRe = /\\newtheoremstyle\s*\{([^}]+)\}/g;
  while ((match = newThmStyleRe.exec(sourceText)) !== null) {
    const sName = match[1].trim();
    let cur = skipWhitespace(sourceText, match.index + match[0].length);
    const groups = [];
    for (let g = 0; g < 8; g++) {
      cur = skipWhitespace(sourceText, cur);
      if (sourceText[cur] !== '{') break;
      const grp = extractBalancedBraces(sourceText, cur);
      if (!grp) break;
      groups.push(grp.content);
      cur = grp.endIndex + 1;
    }
    newThmStyleRe.lastIndex = cur;
    if (sName && groups.length >= 5) {
      const bodyFontRaw = groups[2] || '';
      const headFontRaw = groups[4] || '';
      const headSpecRaw = groups[7] || '';
      events.push({
        pos: match.index,
        apply: () => {
          const bodyFontStyle = /\\(?:itshape|slshape|em)\b/.test(bodyFontRaw) ? 'italic' : 'normal';
          const labelColor =
            extractColorFromTexSnippet(headFontRaw, colorTable) ||
            extractColorFromTexSnippet(headSpecRaw, colorTable) ||
            '';
          amsthmStyleMap.set(sName, { bodyFontStyle, labelColor });
        }
      });
    }
  }

  // A0b. \theoremstyle{name}
  const thmStyleSwitchRe = /\\theoremstyle\s*\{([^}]+)\}/g;
  while ((match = thmStyleSwitchRe.exec(sourceText)) !== null) {
    const stName = match[1].trim();
    if (stName) {
      events.push({
        pos: match.index,
        apply: () => {
          activeTheoremStyle = stName;
        }
      });
    }
  }

  // A. \newtheorem*{envName}[shared]{DisplayLabel}[within]
  const thmRegex = /\\newtheorem(\*)?\s*\{([a-zA-Z0-9_*]+)\}/g;
  while ((match = thmRegex.exec(sourceText)) !== null) {
    const isStar = Boolean(match[1]) || match[2].endsWith('*');
    const envName = match[2].replace(/\*$/, '').trim();
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let sharedCounter = '';
    if (sourceText[cursor] === '[') {
      const shared = extractBalancedBrackets(sourceText, cursor);
      if (shared) {
        sharedCounter = shared.content.trim();
        cursor = skipWhitespace(sourceText, shared.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const labelGroup = extractBalancedBraces(sourceText, cursor);
    if (!labelGroup) continue;
    let endCursor = labelGroup.endIndex + 1;
    let within = '';
    const afterLbl = skipWhitespace(sourceText, endCursor);
    if (sourceText[afterLbl] === '[') {
      const withinBr = extractBalancedBrackets(sourceText, afterLbl);
      if (withinBr) {
        within = withinBr.content.trim();
        endCursor = withinBr.endIndex + 1;
      }
    }
    thmRegex.lastIndex = endCursor;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const rawLabelTex = labelGroup.content;
    const displayLabel = unwrapTexFormattingToPlainText(rawLabelTex).trim();
    events.push({
      pos: match.index,
      apply: () => {
        const canonicalEnv = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, true);
        const stInfo = amsthmStyleMap.get(activeTheoremStyle) || {
          bodyFontStyle: ['vd', 'nx', 'bt', 'btmau', 'note', 'sol'].includes(canonicalEnv) ? 'normal' : 'italic',
          labelColor: ''
        };
        const inlineLblCol = extractColorFromTexSnippet(rawLabelTex, colorTable);
        const labelColor = inlineLblCol || stInfo.labelColor || '';
        const darkLabelColor = labelColor ? computeDarkThemeTextColor(labelColor) : '';
        customEnvs.set(envName, {
          envName,
          label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalEnv] || envName,
          canonicalEnv,
          hasCounter: !isStar,
          sharedCounter,
          within,
          labelColor,
          darkLabelColor,
          bodyFontStyle: stInfo.bodyFontStyle,
          isFramed: false,
          boxStyle: null
        });
      }
    });
  }

  // B. \newtcbtheorem / \renewtcbtheorem / \NewTcbTheorem / \DeclareTcbTheorem
  const tcbThmRegex = /\\(?:new|renew|Provide|Declare)tcbtheorem\s*|\\(?:New|Renew|Provide|Declare)TcbTheorem\s*/g;
  while ((match = tcbThmRegex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let initStr = '';
    if (sourceText[cursor] === '[') {
      const initOpt = extractBalancedBrackets(sourceText, cursor);
      if (initOpt) {
        initStr = initOpt.content;
        cursor = skipWhitespace(sourceText, initOpt.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envGroup = extractBalancedBraces(sourceText, cursor);
    if (!envGroup) continue;
    cursor = skipWhitespace(sourceText, envGroup.endIndex + 1);
    if (sourceText[cursor] !== '{') continue;
    const labelGroup = extractBalancedBraces(sourceText, cursor);
    if (!labelGroup) continue;

    const envName = envGroup.content.trim();
    const rawLabelTex = labelGroup.content;
    const displayLabel = unwrapTexFormattingToPlainText(rawLabelTex).trim();
    let styleStr = '';
    let labelPrefix = '';
    let afterLabel = skipWhitespace(sourceText, labelGroup.endIndex + 1);
    if (sourceText[afterLabel] === '{') {
      const styleGrp = extractBalancedBraces(sourceText, afterLabel);
      if (styleGrp) {
        styleStr = styleGrp.content;
        afterLabel = styleGrp.endIndex + 1;
        const afterStyle = skipWhitespace(sourceText, afterLabel);
        if (sourceText[afterStyle] === '{') {
          const prefGrp = extractBalancedBraces(sourceText, afterStyle);
          if (prefGrp) {
            labelPrefix = prefGrp.content.trim();
            afterLabel = prefGrp.endIndex + 1;
          }
        }
      }
    }
    tcbThmRegex.lastIndex = afterLabel;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    events.push({
      pos: match.index,
      apply: () => {
        const canonicalEnv = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, true);
        const hasCounter = !/\bno\s+counter\b/i.test(initStr);
        const withinM = /\bnumber\s+within\s*=\s*([a-zA-Z]+)/i.exec(initStr);
        const boxStyle = parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: true });
        const inlineLblCol = extractColorFromTexSnippet(rawLabelTex, colorTable);
        const explicitColTitle =
          boxStyle.headerMode === 'inline' && /\bcoltitle\s*=/i.test(styleStr) ? boxStyle.coltitle : '';
        const labelColor = inlineLblCol || explicitColTitle || '';
        const darkLabelColor = labelColor ? computeDarkThemeTextColor(labelColor) : '';
        const bodyFontStyle = /\bfontupper\s*=\s*[^,}]*\\(?:itshape|slshape)\b/.test(styleStr) ? 'italic' : 'normal';
        customEnvs.set(envName, {
          envName,
          label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalEnv] || envName,
          canonicalEnv,
          hasCounter,
          within: withinM ? withinM[1].trim() : '',
          labelColor,
          darkLabelColor,
          bodyFontStyle,
          isTcbTheorem: true,
          hasOptionalFirstArg: true,
          mandatoryArgsCount: 2,
          labelPrefix,
          rawTcbOptions: styleStr,
          isFramed: boxStyle.isVisibleFrame,
          boxStyle
        });
      }
    });
  }

  // C. \newtcolorbox / \renewtcolorbox (supports optional [init options] BEFORE {envName}!)
  const tcbBoxRegex = /\\(?:new|renew)tcolorbox\s*/g;
  while ((match = tcbBoxRegex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let initStr = '';
    if (sourceText[cursor] === '[') {
      const initBr = extractBalancedBrackets(sourceText, cursor);
      if (initBr) {
        initStr = initBr.content;
        cursor = skipWhitespace(sourceText, initBr.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envGrp = extractBalancedBraces(sourceText, cursor);
    if (!envGrp) continue;
    const envName = envGrp.content.trim();
    cursor = skipWhitespace(sourceText, envGrp.endIndex + 1);

    let numArgs = 0;
    let defaultOpt = null;
    if (sourceText[cursor] === '[') {
      const cntBr = extractBalancedBrackets(sourceText, cursor);
      if (cntBr) {
        const parsed = parseInt(cntBr.content.trim(), 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 9) numArgs = parsed;
        cursor = skipWhitespace(sourceText, cntBr.endIndex + 1);
        if (sourceText[cursor] === '[') {
          const defBr = extractBalancedBrackets(sourceText, cursor);
          if (defBr) {
            defaultOpt = defBr.content;
            cursor = skipWhitespace(sourceText, defBr.endIndex + 1);
          }
        }
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const styleGrp = extractBalancedBraces(sourceText, cursor);
    if (!styleGrp) continue;
    tcbBoxRegex.lastIndex = styleGrp.endIndex + 1;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const styleStr = styleGrp.content;
    const hasOptionalFirstArg = defaultOpt !== null;
    const mandatoryArgsCount = Math.max(0, numArgs - (hasOptionalFirstArg ? 1 : 0));

    events.push({
      pos: match.index,
      apply: () => {
        const prelimBox = parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: false });
        const rawTitle = prelimBox.rawTitleTemplate;
        const displayLabel = cleanDisplayLabelFromTitleTemplate(rawTitle);
        const hasTitle = Boolean(rawTitle);
        const boxStyle = hasTitle
          ? parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: true })
          : prelimBox;
        const hasCounter =
          /\b(?:auto\s+counter|use\s+counter)\b/i.test(initStr) ||
          /\\thetcbcounter\b|\\the[a-zA-Z]+/.test(rawTitle || '');
        const canonicalMatch = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, false);
        if (canonicalMatch) {
          customEnvs.set(envName, {
            envName,
            label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
            canonicalEnv: canonicalMatch,
            hasCounter,
            numArgs,
            defaultOpt,
            hasOptionalFirstArg,
            mandatoryArgsCount,
            rawTcbOptions: styleStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        } else {
          customEnvs.set(envName, {
            envName,
            label: displayLabel || '',
            canonicalEnv: 'tcolorbox',
            isPureTcolorbox: true,
            hasCounter: false,
            numArgs,
            defaultOpt,
            hasOptionalFirstArg,
            mandatoryArgsCount,
            rawTcbOptions: styleStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        }
      }
    });
  }

  // D. \NewTColorBox / \RenewTColorBox / \DeclareTColorBox / \ProvideTColorBox (xparse arg spec)
  const xTcbRegex = /\\(?:New|Renew|Declare|Provide)TColorBox\s*/g;
  while ((match = xTcbRegex.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let initStr = '';
    if (sourceText[cursor] === '[') {
      const initBr = extractBalancedBrackets(sourceText, cursor);
      if (initBr) {
        initStr = initBr.content;
        cursor = skipWhitespace(sourceText, initBr.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envGrp = extractBalancedBraces(sourceText, cursor);
    if (!envGrp) continue;
    const envName = envGrp.content.trim();
    cursor = skipWhitespace(sourceText, envGrp.endIndex + 1);
    if (sourceText[cursor] !== '{') continue;
    const specGrp = extractBalancedBraces(sourceText, cursor);
    if (!specGrp) continue;
    cursor = skipWhitespace(sourceText, specGrp.endIndex + 1);
    if (sourceText[cursor] !== '{') continue;
    const styleGrp = extractBalancedBraces(sourceText, cursor);
    if (!styleGrp) continue;
    xTcbRegex.lastIndex = styleGrp.endIndex + 1;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const styleStr = styleGrp.content;
    const argMeta = parseXparseArgSpecCounts(specGrp.content);

    events.push({
      pos: match.index,
      apply: () => {
        const prelimBox = parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: false });
        const rawTitle = prelimBox.rawTitleTemplate;
        const displayLabel = cleanDisplayLabelFromTitleTemplate(rawTitle);
        const boxStyle = rawTitle
          ? parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: true })
          : prelimBox;
        const hasCounter =
          /\b(?:auto\s+counter|use\s+counter)\b/i.test(initStr) ||
          /\\thetcbcounter\b|\\the[a-zA-Z]+/.test(rawTitle || '');
        const canonicalMatch = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, false);
        if (canonicalMatch) {
          customEnvs.set(envName, {
            envName,
            label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
            canonicalEnv: canonicalMatch,
            hasCounter,
            ...argMeta,
            rawTcbOptions: styleStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        } else {
          customEnvs.set(envName, {
            envName,
            label: displayLabel || '',
            canonicalEnv: 'tcolorbox',
            isPureTcolorbox: true,
            hasCounter: false,
            ...argMeta,
            rawTcbOptions: styleStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        }
      }
    });
  }

  // E. \tcolorboxenvironment{envName}{options}
  const tcbEnvWrapRegex = /\\tcolorboxenvironment\s*\{([a-zA-Z0-9_*]+)\}\s*\{/g;
  while ((match = tcbEnvWrapRegex.exec(sourceText)) !== null) {
    const envName = match[1].replace(/\*$/, '').trim();
    const bIdx = sourceText.lastIndexOf('{', match.index + match[0].length);
    const styleGrp = extractBalancedBraces(sourceText, bIdx);
    if (!styleGrp) continue;
    tcbEnvWrapRegex.lastIndex = styleGrp.endIndex + 1;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const styleStr = styleGrp.content;
    events.push({
      pos: match.index,
      apply: () => {
        const boxStyle = parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: false });
        const existing = customEnvs.get(envName);
        if (existing) {
          existing.isFramed = boxStyle.isVisibleFrame;
          existing.boxStyle = boxStyle;
          existing.rawTcbOptions = styleStr;
        } else {
          const canonicalMatch = classifyAcademicLabelToCanonicalEnv('', envName, false);
          if (canonicalMatch) {
            customEnvs.set(envName, {
              envName,
              label: CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
              canonicalEnv: canonicalMatch,
              hasCounter: true,
              rawTcbOptions: styleStr,
              isFramed: boxStyle.isVisibleFrame,
              boxStyle
            });
          } else {
            customEnvs.set(envName, {
              envName,
              label: '',
              canonicalEnv: 'tcolorbox',
              isPureTcolorbox: true,
              hasCounter: false,
              rawTcbOptions: styleStr,
              isFramed: boxStyle.isVisibleFrame,
              boxStyle
            });
          }
        }
      }
    });
  }

  // F. mdframed: \newmdtheoremenv[opts]{env}[shared]{Label}[within], \newmdenv[opts]{env}, \surroundwithmdframed[opts]{env}
  const mdfThmRe = /\\newmdtheoremenv\s*/g;
  while ((match = mdfThmRe.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let optsStr = '';
    if (sourceText[cursor] === '[') {
      const br = extractBalancedBrackets(sourceText, cursor);
      if (br) {
        optsStr = br.content;
        cursor = skipWhitespace(sourceText, br.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envG = extractBalancedBraces(sourceText, cursor);
    if (!envG) continue;
    const envName = envG.content.trim().replace(/\*$/, '');
    cursor = skipWhitespace(sourceText, envG.endIndex + 1);
    if (sourceText[cursor] === '[') {
      const sh = extractBalancedBrackets(sourceText, cursor);
      if (sh) cursor = skipWhitespace(sourceText, sh.endIndex + 1);
    }
    if (sourceText[cursor] !== '{') continue;
    const lblG = extractBalancedBraces(sourceText, cursor);
    if (!lblG) continue;
    mdfThmRe.lastIndex = lblG.endIndex + 1;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const displayLabel = unwrapTexFormattingToPlainText(lblG.content).trim();
    events.push({
      pos: match.index,
      apply: () => {
        const canonicalEnv = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, true);
        const boxStyle = parseBoxVisualOptions(optsStr, colorTable, boxStyleDefs, 'mdframed', { hasTitle: false });
        customEnvs.set(envName, {
          envName,
          label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalEnv] || envName,
          canonicalEnv,
          hasCounter: !envG.content.trim().endsWith('*'),
          rawTcbOptions: optsStr,
          isFramed: boxStyle.isVisibleFrame,
          boxStyle
        });
      }
    });
  }

  const mdfEnvRe = /\\(newmdenv|surroundwithmdframed)\s*/g;
  while ((match = mdfEnvRe.exec(sourceText)) !== null) {
    const kind = match[1];
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let optsStr = '';
    if (sourceText[cursor] === '[') {
      const br = extractBalancedBrackets(sourceText, cursor);
      if (br) {
        optsStr = br.content;
        cursor = skipWhitespace(sourceText, br.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envG = extractBalancedBraces(sourceText, cursor);
    if (!envG) continue;
    mdfEnvRe.lastIndex = envG.endIndex + 1;
    const envName = envG.content.trim().replace(/\*$/, '');
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    events.push({
      pos: match.index,
      apply: () => {
        const boxStyle = parseBoxVisualOptions(optsStr, colorTable, boxStyleDefs, 'mdframed', { hasTitle: false });
        const existing = customEnvs.get(envName);
        if (kind === 'surroundwithmdframed' && existing) {
          existing.isFramed = boxStyle.isVisibleFrame;
          existing.boxStyle = boxStyle;
          return;
        }
        const canonicalMatch = classifyAcademicLabelToCanonicalEnv('', envName, false);
        if (canonicalMatch) {
          customEnvs.set(envName, {
            envName,
            label: existing?.label || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
            canonicalEnv: canonicalMatch,
            hasCounter: existing ? existing.hasCounter : kind === 'surroundwithmdframed',
            rawTcbOptions: optsStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        } else {
          customEnvs.set(envName, {
            envName,
            label: '',
            canonicalEnv: 'tcolorbox',
            isPureTcolorbox: true,
            hasCounter: false,
            rawTcbOptions: optsStr,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
        }
      }
    });
  }

  // G. \newenvironment / \renewenvironment / \NewEnviron / \RenewEnviron / \NewDocumentEnvironment
  const newEnvRegex =
    /\\(newenvironment|renewenvironment|NewEnviron|RenewEnviron|NewDocumentEnvironment|RenewDocumentEnvironment|ProvideDocumentEnvironment|DeclareDocumentEnvironment)\*?\s*/g;
  while ((match = newEnvRegex.exec(sourceText)) !== null) {
    const declCmd = match[1];
    const isEnvironPkg = declCmd === 'NewEnviron' || declCmd === 'RenewEnviron';
    const isXparseEnv = declCmd.endsWith('DocumentEnvironment');
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    if (sourceText[cursor] !== '{') continue;
    const nameGrp = extractBalancedBraces(sourceText, cursor);
    if (!nameGrp) continue;
    const envName = nameGrp.content.trim().replace(/\*$/, '');
    cursor = skipWhitespace(sourceText, nameGrp.endIndex + 1);

    let numArgs = 0;
    let defaultOpt = null;
    let hasOptionalFirstArg = false;
    let mandatoryArgsCount = 0;

    if (isXparseEnv) {
      if (sourceText[cursor] !== '{') continue;
      const specG = extractBalancedBraces(sourceText, cursor);
      if (!specG) continue;
      const parsedSpec = parseXparseArgSpecCounts(specG.content);
      numArgs = parsedSpec.numArgs;
      defaultOpt = parsedSpec.defaultOpt;
      hasOptionalFirstArg = parsedSpec.hasOptionalFirstArg;
      mandatoryArgsCount = parsedSpec.mandatoryArgsCount;
      cursor = skipWhitespace(sourceText, specG.endIndex + 1);
    } else if (sourceText[cursor] === '[') {
      const cntBr = extractBalancedBrackets(sourceText, cursor);
      if (cntBr) {
        const parsed = parseInt(cntBr.content.trim(), 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 9) numArgs = parsed;
        cursor = skipWhitespace(sourceText, cntBr.endIndex + 1);
        if (sourceText[cursor] === '[') {
          const defBr = extractBalancedBrackets(sourceText, cursor);
          if (defBr) {
            defaultOpt = defBr.content;
            hasOptionalFirstArg = true;
            cursor = skipWhitespace(sourceText, defBr.endIndex + 1);
          }
        }
        mandatoryArgsCount = Math.max(0, numArgs - (hasOptionalFirstArg ? 1 : 0));
      }
    }

    if (sourceText[cursor] !== '{') continue;
    const beginGrp = extractBalancedBraces(sourceText, cursor);
    if (!beginGrp) continue;
    cursor = skipWhitespace(sourceText, beginGrp.endIndex + 1);

    let beginCode = beginGrp.content;
    let endCode = '';
    if (isEnvironPkg) {
      const bodyTokenIdx = beginCode.indexOf('\\BODY');
      if (bodyTokenIdx !== -1) {
        endCode = beginCode.substring(bodyTokenIdx + 5);
        beginCode = beginCode.substring(0, bodyTokenIdx);
      } else {
        continue;
      }
      newEnvRegex.lastIndex = beginGrp.endIndex + 1;
    } else {
      if (sourceText[cursor] !== '{') continue;
      const endGrp = extractBalancedBraces(sourceText, cursor);
      if (!endGrp) continue;
      endCode = endGrp.content;
      newEnvRegex.lastIndex = endGrp.endIndex + 1;
    }

    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    events.push({
      pos: match.index,
      apply: () => {
        // Detect if beginCode wraps tcolorbox / mdframed / framed / shaded / leftbar / tikz rounded box / another framed customEnv
        const innerBoxMatch = /\\begin\s*\{(tcolorbox|mdframed|framed|shaded|leftbar)\}/.exec(beginCode);
        const tikzRoundedMatch =
          !innerBoxMatch && /\\begin\s*\{tikzpicture\}/.test(beginCode) && /rounded\s*corners|draw\s*=/.test(beginCode);

        let delegatedFramedEnv = null;
        let delegatedThmEnv = null;
        const innerEnvIter = /\\begin\s*\{([a-zA-Z0-9_*@]+)\}/g;
        let ieMatch;
        while ((ieMatch = innerEnvIter.exec(beginCode)) !== null) {
          const iName = ieMatch[1].replace(/\*$/, '').trim();
          const info = customEnvs.get(iName);
          if (info) {
            if (!delegatedFramedEnv && info.isFramed && info.boxStyle) delegatedFramedEnv = info;
            if (!delegatedThmEnv && info.label && !info.isPureTcolorbox) delegatedThmEnv = info;
          }
        }

        if (innerBoxMatch || tikzRoundedMatch || delegatedFramedEnv) {
          let innerEngine = 'tcolorbox';
          let innerOpts = '';
          let inheritedBoxStyle = null;

          if (innerBoxMatch) {
            innerEngine = innerBoxMatch[1];
            const afterInner = skipWhitespace(beginCode, innerBoxMatch.index + innerBoxMatch[0].length);
            if (beginCode[afterInner] === '[') {
              const br = extractBalancedBrackets(beginCode, afterInner);
              if (br) innerOpts = br.content;
            }
          } else if (tikzRoundedMatch) {
            const rcM = /rounded\s*corners(?:\s*=\s*([^,\]]+))?/.exec(beginCode);
            const drawM = /draw\s*=\s*([^,\]]+)/.exec(beginCode);
            const fillM = /fill\s*=\s*([^,\]]+)/.exec(beginCode);
            const synth = [];
            if (rcM) synth.push(`arc=${(rcM[1] || '6pt').trim()}`);
            if (drawM) synth.push(`colframe=${drawM[1].trim()}`);
            if (fillM) synth.push(`colback=${fillM[1].trim()}`);
            innerOpts = synth.join(', ');
          } else if (delegatedFramedEnv) {
            innerOpts = delegatedFramedEnv.rawTcbOptions || '';
            inheritedBoxStyle = delegatedFramedEnv.boxStyle;
          }

          const prelimBox =
            inheritedBoxStyle ||
            parseBoxVisualOptions(innerOpts, colorTable, boxStyleDefs, innerEngine, { hasTitle: false });
          const rawTitle = prelimBox.rawTitleTemplate || '';
          let boldInnerTex = '';
          const boldIdxM = /\\textbf\s*\{/.exec(beginCode);
          if (boldIdxM) {
            const bOpen = beginCode.indexOf('{', boldIdxM.index);
            const bGrp = bOpen !== -1 ? extractBalancedBraces(beginCode, bOpen) : null;
            if (bGrp) boldInnerTex = bGrp.content;
          }
          const extractedLbl =
            cleanDisplayLabelFromTitleTemplate(rawTitle) ||
            cleanDisplayLabelFromTitleTemplate(boldInnerTex) ||
            (delegatedThmEnv ? delegatedThmEnv.label : '');
          const extractedLblCol =
            extractColorFromTexSnippet(rawTitle, colorTable) ||
            extractColorFromTexSnippet(boldInnerTex, colorTable) ||
            (delegatedThmEnv ? delegatedThmEnv.labelColor || '' : '');
          const darkLabelColor = extractedLblCol ? computeDarkThemeTextColor(extractedLblCol) : '';
          const bodyFontStyle =
            (delegatedThmEnv && delegatedThmEnv.bodyFontStyle) ||
            (/\\(?:itshape|slshape)\b/.test(beginCode) ? 'italic' : '');

          const boxStyle =
            !inheritedBoxStyle && rawTitle
              ? parseBoxVisualOptions(innerOpts, colorTable, boxStyleDefs, innerEngine, { hasTitle: true })
              : prelimBox;

          const canonicalMatch =
            (delegatedThmEnv && delegatedThmEnv.canonicalEnv) ||
            classifyAcademicLabelToCanonicalEnv(extractedLbl, envName, false);

          if (canonicalMatch) {
            const hasCounter =
              Boolean(delegatedThmEnv && delegatedThmEnv.hasCounter) ||
              /\\refstepcounter|\\stepcounter|\\the[a-zA-Z]+/.test(beginCode) ||
              /\\thetcbcounter\b|\\the[a-zA-Z]+/.test(rawTitle);
            customEnvs.set(envName, {
              envName,
              label: extractedLbl || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
              canonicalEnv: canonicalMatch,
              hasCounter,
              labelColor: extractedLblCol,
              darkLabelColor,
              bodyFontStyle:
                bodyFontStyle ||
                (['vd', 'nx', 'bt', 'btmau', 'note', 'sol'].includes(canonicalMatch) ? 'normal' : 'italic'),
              numArgs,
              defaultOpt,
              hasOptionalFirstArg,
              mandatoryArgsCount,
              rawTcbOptions: innerOpts,
              isFramed: boxStyle.isVisibleFrame,
              boxStyle
            });
            return;
          }

          customEnvs.set(envName, {
            envName,
            label: extractedLbl || '',
            canonicalEnv: 'tcolorbox',
            isPureTcolorbox: true,
            hasCounter: false,
            numArgs,
            defaultOpt,
            hasOptionalFirstArg,
            mandatoryArgsCount,
            rawTcbOptions: innerOpts,
            isFramed: boxStyle.isVisibleFrame,
            boxStyle
          });
          return;
        }

        if (isSafeMacroBody(beginCode) && isSafeMacroBody(endCode)) {
          userEnvs.set(envName, {
            envName,
            numArgs,
            defaultOpt,
            hasOptionalFirstArg,
            mandatoryArgsCount,
            beginCode: beginCode.trim(),
            endCode: endCode.trim()
          });
        }
      }
    });
  }

  // H. \newtcbox{\cmd}[args][default]{options} -> inline colored badge macro
  const tcboxRe = /\\(?:new|renew)tcbox\s*/g;
  while ((match = tcboxRe.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    if (sourceText[cursor] === '[') {
      const initB = extractBalancedBrackets(sourceText, cursor);
      if (initB) cursor = skipWhitespace(sourceText, initB.endIndex + 1);
    }
    let cmdName = '';
    if (sourceText[cursor] === '{') {
      const g = extractBalancedBraces(sourceText, cursor);
      if (!g) continue;
      cmdName = g.content.trim().replace(/^\\/, '');
      cursor = skipWhitespace(sourceText, g.endIndex + 1);
    } else if (sourceText[cursor] === '\\') {
      const mc = /^\\([a-zA-Z]+)\b/.exec(sourceText.slice(cursor));
      if (!mc) continue;
      cmdName = mc[1];
      cursor = skipWhitespace(sourceText, cursor + mc[0].length);
    } else {
      continue;
    }
    let numArgs = 1;
    let defaultOpt = null;
    if (sourceText[cursor] === '[') {
      const cB = extractBalancedBrackets(sourceText, cursor);
      if (cB) {
        const parsed = parseInt(cB.content.trim(), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) numArgs = parsed;
        cursor = skipWhitespace(sourceText, cB.endIndex + 1);
        if (sourceText[cursor] === '[') {
          const dB = extractBalancedBrackets(sourceText, cursor);
          if (dB) {
            defaultOpt = dB.content;
            cursor = skipWhitespace(sourceText, dB.endIndex + 1);
          }
        }
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const styleG = extractBalancedBraces(sourceText, cursor);
    if (!styleG) continue;
    tcboxRe.lastIndex = styleG.endIndex + 1;
    if (!cmdName || PROTECTED_COMMANDS.has(cmdName)) continue;

    const styleStr = styleG.content;
    events.push({
      pos: match.index,
      apply: () => {
        const bs = parseBoxVisualOptions(styleStr, colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: false });
        const contentParam = defaultOpt !== null && numArgs >= 2 ? '#2' : '#1';
        const bg = bs.colback === 'transparent' ? '#f8fafc' : bs.colback;
        macroTable.set(cmdName, {
          name: cmdName,
          numArgs,
          defaultOpt,
          body: `\\fcolorbox{${bs.colframe}}{${bg}}{${contentParam}}`
        });
      }
    });
  }

  // I. etoolbox hooks: \BeforeBeginEnvironment{env}{\begin{tcolorbox}[...]} / \AtBeginEnvironment{env}{...}
  const hookEnvRe = /\\(?:BeforeBeginEnvironment|AtBeginEnvironment)\s*\{([a-zA-Z0-9_*]+)\}\s*\{/g;
  while ((match = hookEnvRe.exec(sourceText)) !== null) {
    const envName = match[1].replace(/\*$/, '').trim();
    const bIdx = sourceText.lastIndexOf('{', match.index + match[0].length);
    const hookGrp = extractBalancedBraces(sourceText, bIdx);
    if (!hookGrp) continue;
    hookEnvRe.lastIndex = hookGrp.endIndex + 1;
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    const hookCode = hookGrp.content;
    events.push({
      pos: match.index,
      apply: () => {
        const innerBoxM = /\\begin\s*\{(tcolorbox|mdframed|framed|shaded|leftbar)\}/.exec(hookCode);
        let boxStyle = null;
        let optsStr = '';
        if (innerBoxM) {
          const eng = innerBoxM[1];
          const afterM = skipWhitespace(hookCode, innerBoxM.index + innerBoxM[0].length);
          if (hookCode[afterM] === '[') {
            const br = extractBalancedBrackets(hookCode, afterM);
            if (br) optsStr = br.content;
          }
          boxStyle = parseBoxVisualOptions(optsStr, colorTable, boxStyleDefs, eng, { hasTitle: false });
        } else {
          const custM = /\\begin\s*\{([a-zA-Z0-9_*]+)\}/.exec(hookCode);
          if (custM) {
            const refInfo = customEnvs.get(custM[1].replace(/\*$/, '').trim());
            if (refInfo && refInfo.isFramed && refInfo.boxStyle) {
              boxStyle = refInfo.boxStyle;
              optsStr = refInfo.rawTcbOptions || '';
            }
          }
        }
        if (!boxStyle) return;
        const existing = customEnvs.get(envName);
        if (existing) {
          existing.isFramed = boxStyle.isVisibleFrame;
          existing.boxStyle = boxStyle;
          existing.rawTcbOptions = optsStr;
        } else {
          const canonicalMatch = classifyAcademicLabelToCanonicalEnv('', envName, false);
          if (canonicalMatch) {
            customEnvs.set(envName, {
              envName,
              label: CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalMatch] || envName,
              canonicalEnv: canonicalMatch,
              hasCounter: true,
              rawTcbOptions: optsStr,
              isFramed: boxStyle.isVisibleFrame,
              boxStyle
            });
          }
        }
      }
    });
  }

  // J. thmtools: \declaretheoremstyle[...]{styleName} & \declaretheorem[...]{envName}
  const thmToolStyleMap = new Map();
  const declThmStyleRe = /\\declaretheoremstyle\s*/g;
  while ((match = declThmStyleRe.exec(sourceText)) !== null) {
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let styleOpts = '';
    if (sourceText[cursor] === '[') {
      const br = extractBalancedBrackets(sourceText, cursor);
      if (br) {
        styleOpts = br.content;
        cursor = skipWhitespace(sourceText, br.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const nameG = extractBalancedBraces(sourceText, cursor);
    if (!nameG) continue;
    declThmStyleRe.lastIndex = nameG.endIndex + 1;
    const sName = nameG.content.trim();
    if (sName) {
      events.push({
        pos: match.index,
        apply: () => thmToolStyleMap.set(sName, styleOpts)
      });
    }
  }

  const declThmRe = /\\declaretheorem(\*)?\s*/g;
  while ((match = declThmRe.exec(sourceText)) !== null) {
    const isStarCmd = Boolean(match[1]);
    let cursor = skipWhitespace(sourceText, match.index + match[0].length);
    let thmOpts = '';
    if (sourceText[cursor] === '[') {
      const br = extractBalancedBrackets(sourceText, cursor);
      if (br) {
        thmOpts = br.content;
        cursor = skipWhitespace(sourceText, br.endIndex + 1);
      }
    }
    if (sourceText[cursor] !== '{') continue;
    const envG = extractBalancedBraces(sourceText, cursor);
    if (!envG) continue;
    declThmRe.lastIndex = envG.endIndex + 1;
    const envName = envG.content.trim().replace(/\*$/, '');
    if (!envName || STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;

    events.push({
      pos: match.index,
      apply: () => {
        let mergedOpts = thmOpts;
        const stM = /\bstyle\s*=\s*([a-zA-Z0-9_-]+)/.exec(thmOpts);
        if (stM && thmToolStyleMap.has(stM[1])) {
          mergedOpts = `${thmToolStyleMap.get(stM[1])}, ${thmOpts}`;
        }
        let displayLabel = '';
        let hasCounter = !isStarCmd;
        let isFramed = false;
        let boxStyle = null;
        let rawBoxOpts = '';
        let labelColor = '';
        let bodyFontStyle = '';
        let within = '';
        let sharedCounter = '';

        const entries = splitTopLevelCommaOptions(mergedOpts);
        for (const ent of entries) {
          const eq = ent.indexOf('=');
          const k = (eq === -1 ? ent : ent.slice(0, eq)).trim().toLowerCase();
          const v = eq === -1 ? '' : stripOuterBracesOnce(ent.slice(eq + 1).trim());
          if ((k === 'name' || k === 'title' || k === 'heading') && v) {
            const c = extractColorFromTexSnippet(v, colorTable);
            if (c) labelColor = c;
            displayLabel = unwrapTexFormattingToPlainText(v).trim();
          } else if (k === 'headfont' && v) {
            const c = extractColorFromTexSnippet(v, colorTable);
            if (c) labelColor = c;
          } else if (k === 'bodyfont' && v) {
            bodyFontStyle = /\\(?:itshape|slshape|em)\b/.test(v) ? 'italic' : 'normal';
          } else if ((k === 'numberwithin' || k === 'within' || k === 'parent') && v) {
            within = v.trim();
          } else if ((k === 'sibling' || k === 'numberlike' || k === 'sharenumber') && v) {
            sharedCounter = v.trim();
          } else if (k === 'numbered' && (v === 'no' || v === 'false')) {
            hasCounter = false;
          } else if (k === 'mdframed') {
            rawBoxOpts = v;
            boxStyle = parseBoxVisualOptions(v, colorTable, boxStyleDefs, 'mdframed', { hasTitle: false });
            isFramed = boxStyle.isVisibleFrame;
          } else if (k === 'shaded') {
            const bgM = /bgcolor\s*=\s*([^,\s}]+)/.exec(v);
            const shOpts = bgM ? `colback=${bgM[1]}, frame hidden` : '';
            boxStyle = parseBoxVisualOptions(shOpts, colorTable, boxStyleDefs, 'shaded', { hasTitle: false });
            isFramed = boxStyle.isVisibleFrame;
          } else if (k === 'thmbox') {
            boxStyle = parseBoxVisualOptions('colback=white, colframe=black, sharp corners', colorTable, boxStyleDefs, 'tcolorbox', { hasTitle: false });
            isFramed = true;
          }
        }
        const canonicalEnv = classifyAcademicLabelToCanonicalEnv(displayLabel, envName, true);
        customEnvs.set(envName, {
          envName,
          label: displayLabel || CANONICAL_ACADEMIC_DEFAULT_LABELS[canonicalEnv] || envName,
          canonicalEnv,
          hasCounter,
          within,
          sharedCounter,
          labelColor,
          darkLabelColor: labelColor ? computeDarkThemeTextColor(labelColor) : '',
          bodyFontStyle:
            bodyFontStyle ||
            (['vd', 'nx', 'bt', 'btmau', 'note', 'sol'].includes(canonicalEnv) ? 'normal' : 'italic'),
          rawTcbOptions: rawBoxOpts,
          isFramed,
          boxStyle
        });
      }
    });
  }

  // Execute all declarations in exact document order
  events.sort((a, b) => a.pos - b.pos);
  for (const ev of events) {
    ev.apply();
  }

  // Common Vietnamese textbook & Olympiad fallback aliases (only when not explicitly declared in preamble)
  const commonVnAliases = [
    { envName: 'ex', label: 'Bài tập', canonicalEnv: 'bt', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'btoan', label: 'Bài toán', canonicalEnv: 'bt', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'cauhoi', label: 'Câu hỏi', canonicalEnv: 'bt', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'problem', label: 'Bài toán', canonicalEnv: 'bt', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'question', label: 'Câu hỏi', canonicalEnv: 'bt', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'md', label: 'Mệnh đề', canonicalEnv: 'menhde', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'mde', label: 'Mệnh đề', canonicalEnv: 'menhde', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'bd', label: 'Bổ đề', canonicalEnv: 'bode', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'cy', label: 'Chú ý', canonicalEnv: 'note', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'chuy', label: 'Chú ý', canonicalEnv: 'note', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true },
    { envName: 'luuy', label: 'Lưu ý', canonicalEnv: 'note', hasCounter: true, isFramed: false, boxStyle: null, isDefaultAlias: true }
  ];
  for (const al of commonVnAliases) {
    if (!customEnvs.has(al.envName) && !userEnvs.has(al.envName)) {
      customEnvs.set(al.envName, al);
    }
  }
}

function parseDefineColors(sourceText, colorTable) {
  // 1. \definecolor / \providecolor
  const regex = /\\(?:definecolor|providecolor)\s*\{([^}]+)\}\s*\{([^}]+)\}\s*\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(sourceText)) !== null) {
    const name = match[1].trim().toLowerCase();
    const model = match[2].trim().toLowerCase();
    const spec = match[3].trim();

    if (model === 'html') {
      const hex = spec.replace(/^#/, '').trim();
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        colorTable.set(name, `#${hex.toLowerCase()}`);
      }
    } else if (match[2].trim() === 'RGB') {
      const parts = spec.split(',').map((s) => Math.max(0, Math.min(255, parseInt(s.trim(), 10) || 0)));
      if (parts.length === 3) {
        colorTable.set(name, rgbTripleToHex(parts));
      }
    } else if (model === 'rgb') {
      const parts = spec
        .split(',')
        .map((s) => Math.max(0, Math.min(255, Math.round((parseFloat(s.trim()) || 0) * 255))));
      if (parts.length === 3) {
        colorTable.set(name, rgbTripleToHex(parts));
      }
    } else if (model === 'cmyk') {
      const parts = spec.split(',').map((s) => Math.max(0, Math.min(1, parseFloat(s.trim()) || 0)));
      if (parts.length === 4) {
        const [c, m, y, k] = parts;
        colorTable.set(
          name,
          rgbTripleToHex([
            255 * (1 - c) * (1 - k),
            255 * (1 - m) * (1 - k),
            255 * (1 - y) * (1 - k)
          ])
        );
      }
    } else if (model === 'gray') {
      const v = Math.max(0, Math.min(255, Math.round((parseFloat(spec) || 0) * 255)));
      colorTable.set(name, rgbTripleToHex([v, v, v]));
    }
  }

  // 2. \colorlet{alias}{colorExpr} (2 passes to resolve chained \colorlet aliases)
  for (let pass = 0; pass < 2; pass++) {
    const letRegex = /\\colorlet\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}\s*\{([^}]+)\}/g;
    while ((match = letRegex.exec(sourceText)) !== null) {
      const alias = match[1].trim().toLowerCase();
      const expr = match[2].trim();
      const resolved = resolveLatexColorToCss(expr, colorTable);
      if (resolved && resolved.startsWith('#')) {
        colorTable.set(alias, resolved);
      }
    }
  }
}

function sanitizeLabelAnchorId(rawKey) {
  return String(rawKey || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '-');
}

export function splitTopLevelLatexRows(mathBody) {
  const rows = [];
  if (!mathBody) return rows;
  let envDepth = 0;
  let braceDepth = 0;
  let rowStart = 0;
  let i = 0;
  while (i < mathBody.length) {
    if (mathBody[i] === '\\') {
      if (mathBody[i + 1] === '\\' && envDepth === 0 && braceDepth === 0) {
        rows.push({ text: mathBody.slice(rowStart, i), localOffset: rowStart });
        i += 2;
        while (i < mathBody.length && (mathBody[i] === ' ' || mathBody[i] === '\t' || mathBody[i] === '*')) i++;
        if (mathBody[i] === '[') {
          const obr = extractBalancedBrackets(mathBody, i);
          if (obr) i = obr.endIndex + 1;
        }
        rowStart = i;
        continue;
      }
      const envM = /^\\(begin|end)\s*\{[^}]+\}/.exec(mathBody.slice(i));
      if (envM) {
        if (envM[1] === 'begin') envDepth++;
        else if (envDepth > 0) envDepth--;
        i += envM[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (mathBody[i] === '{') braceDepth++;
    else if (mathBody[i] === '}' && braceDepth > 0) braceDepth--;
    i++;
  }
  rows.push({ text: mathBody.slice(rowStart), localOffset: rowStart });
  return rows;
}

function extractGlobalLabels(masterBodyTex, layoutConfig = null, customEnvs = null) {
  const labels = new Map();
  if (!masterBodyTex) return labels;

  // Mask out \begin{comment}...\end{comment} and \iffalse...\fi while keeping exact character offsets
  const masked = masterBodyTex
    .replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, (m) => ' '.repeat(m.length))
    .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, (m) => ' '.repeat(m.length));

  const initC = layoutConfig?.initialCounters || {};
  const docClass = layoutConfig?.docClass || 'article';
  const eqWithin =
    layoutConfig?.equationWithin !== undefined
      ? layoutConfig.equationWithin
      : docClass === 'report' || docClass === 'book'
        ? 'chapter'
        : '';

  let chap = initC.chapter || 0;
  let sec = initC.section || 0;
  let subsec = initC.subsection || 0;
  let subsubsec = initC.subsubsection || 0;
  let eq = initC.equation || 0;
  let fig = initC.figure || 0;
  let tbl = initC.table || 0;
  let boxCounters = {};
  let seq = 1;
  let currentTarget = null;

  const formatEq = (n) => {
    if (eqWithin === 'chapter' && chap > 0) return `${chap}.${n}`;
    if (eqWithin === 'section' && sec > 0) return `${chap > 0 ? `${chap}.${sec}` : `${sec}`}.${n}`;
    return `${n}`;
  };

  const tokenRe =
    /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{([a-zA-Z0-9_*]+)\}(?:\s*\{([+-]?\d+)\})?|\\(chapter|section|subsection|subsubsection)(\*)?(?![a-zA-Z@])|\\begin\s*\{([a-zA-Z0-9_*]+)\}|\\label\s*\{([^}]+)\}/g;

  let m;
  while ((m = tokenRe.exec(masked)) !== null) {
    const pos = m.index;

    // 1. Counter mutations
    if (m[1]) {
      const op = m[1];
      const cName = m[2].trim();
      const val = m[3] !== undefined ? parseInt(m[3], 10) : 0;
      const applyOp = (prev) => {
        if (op === 'setcounter' && !Number.isNaN(val)) return val;
        if (op === 'addtocounter' && !Number.isNaN(val)) return prev + val;
        if (op === 'stepcounter' || op === 'refstepcounter') return prev + 1;
        return prev;
      };
      if (cName === 'chapter') {
        chap = applyOp(chap);
        if (op === 'stepcounter' || op === 'refstepcounter') {
          sec = 0;
          subsec = 0;
          subsubsec = 0;
          boxCounters = {};
          if (eqWithin === 'chapter') eq = 0;
        }
      } else if (cName === 'section') {
        sec = applyOp(sec);
        if (op === 'stepcounter' || op === 'refstepcounter') {
          subsec = 0;
          subsubsec = 0;
          if (eqWithin === 'section') eq = 0;
        }
      } else if (cName === 'subsection') {
        subsec = applyOp(subsec);
        if (op === 'stepcounter' || op === 'refstepcounter') subsubsec = 0;
      } else if (cName === 'subsubsection') {
        subsubsec = applyOp(subsubsec);
      } else if (cName === 'equation') {
        eq = applyOp(eq);
      } else if (cName === 'figure') {
        fig = applyOp(fig);
      } else if (cName === 'table') {
        tbl = applyOp(tbl);
      } else {
        const cInfo = customEnvs?.get(cName);
        const bucket = cInfo?.sharedCounter
          ? customEnvs?.get(cInfo.sharedCounter)?.canonicalEnv || cInfo.sharedCounter
          : cInfo?.canonicalEnv || cName;
        boxCounters[bucket] = applyOp(boxCounters[bucket] || 0);
      }
      continue;
    }

    // 2. Headings
    if (m[4]) {
      const hType = m[4];
      const isStar = Boolean(m[5]);
      if (!isStar) {
        if (hType === 'chapter') {
          chap++;
          sec = 0;
          subsec = 0;
          subsubsec = 0;
          boxCounters = {};
          if (eqWithin === 'chapter') eq = 0;
          currentTarget = { formattedNum: `${chap}`, anchorId: `h-${pos}`, kind: 'chapter' };
        } else if (hType === 'section') {
          sec++;
          subsec = 0;
          subsubsec = 0;
          if (eqWithin === 'section') eq = 0;
          currentTarget = {
            formattedNum: chap > 0 ? `${chap}.${sec}` : `${sec}`,
            anchorId: `h-${pos}`,
            kind: 'section'
          };
        } else if (hType === 'subsection') {
          subsec++;
          subsubsec = 0;
          const sBase = sec || 1;
          currentTarget = {
            formattedNum: chap > 0 ? `${chap}.${sBase}.${subsec}` : `${sBase}.${subsec}`,
            anchorId: `h-${pos}`,
            kind: 'subsection'
          };
        } else if (hType === 'subsubsection') {
          subsubsec++;
          const sBase = sec || 1;
          const ssBase = subsec || 1;
          currentTarget = {
            formattedNum:
              chap > 0 ? `${chap}.${sBase}.${ssBase}.${subsubsec}` : `${sBase}.${ssBase}.${subsubsec}`,
            anchorId: `h-${pos}`,
            kind: 'subsubsection'
          };
        }
      }
      continue;
    }

    // 3. Environment openers
    if (m[6]) {
      const rawEnv = m[6];
      const isStarEnv = rawEnv.endsWith('*');
      const baseEnv = rawEnv.replace(/\*$/, '');

      // Unstarred numbered math environments: equation, align, gather, multline, flalign, alignat, eqnarray
      if (!isStarEnv && /^(?:equation|align|gather|multline|flalign|alignat|eqnarray)$/.test(baseEnv)) {
        const endRe = new RegExp(`\\\\end\\s*\\{${baseEnv}\\}`, 'g');
        endRe.lastIndex = pos + m[0].length;
        const endM = endRe.exec(masked);
        if (endM) {
          const mathInner = masked.slice(pos + m[0].length, endM.index);
          const rows = baseEnv === 'equation' || baseEnv === 'multline'
            ? [{ text: mathInner, localOffset: 0 }]
            : splitTopLevelLatexRows(mathInner);
          for (const row of rows) {
            if (!row.text.trim()) continue;
            const tagM = /\\tag\*?\s*\{([^}]*)\}/.exec(row.text);
            const hasNoTag = /\\(?:notag|nonumber)\b/.test(row.text);
            let rowFormatted = '';
            if (tagM) {
              rowFormatted = unwrapTexFormattingToPlainText(tagM[1]).trim();
            } else if (!hasNoTag) {
              eq++;
              rowFormatted = formatEq(eq);
            }
            const lblRe = /\\label\s*\{([^}]+)\}/g;
            let lm;
            while ((lm = lblRe.exec(row.text)) !== null) {
              const key = lm[1].trim();
              if (key && !labels.has(key)) {
                const absOfs = pos + m[0].length + row.localOffset + lm.index;
                const curSeq = seq++;
                labels.set(key, {
                  key,
                  offset: absOfs,
                  globalSeq: curSeq,
                  formattedNum: rowFormatted || `${curSeq}`,
                  anchorId: `eq-lbl-${sanitizeLabelAnchorId(key)}`,
                  kind: 'equation'
                });
              }
            }
          }
          tokenRe.lastIndex = endM.index + endM[0].length;
          continue;
        }
      }

      if (!isStarEnv && baseEnv === 'figure') {
        fig++;
        currentTarget = {
          formattedNum: eqWithin === 'chapter' && chap > 0 ? `${chap}.${fig}` : `${fig}`,
          anchorId: `fig-${pos}`,
          kind: 'figure'
        };
        continue;
      }
      if (!isStarEnv && baseEnv === 'table') {
        tbl++;
        currentTarget = {
          formattedNum: eqWithin === 'chapter' && chap > 0 ? `${chap}.${tbl}` : `${tbl}`,
          anchorId: `tbl-${pos}`,
          kind: 'table'
        };
        continue;
      }

      if (!isStarEnv) {
        const cInfo = customEnvs?.get(baseEnv);
        const canon = cInfo?.canonicalEnv || (CANONICAL_ACADEMIC_DEFAULT_LABELS[baseEnv] ? baseEnv : '');
        const isCountedBox =
          canon &&
          canon !== 'sol' &&
          canon !== 'note' &&
          !cInfo?.isPureTcolorbox &&
          (cInfo ? cInfo.hasCounter !== false : true);
        if (isCountedBox) {
          const bucket = cInfo?.sharedCounter
            ? customEnvs?.get(cInfo.sharedCounter)?.canonicalEnv || cInfo.sharedCounter
            : canon;
          boxCounters[bucket] = (boxCounters[bucket] || 0) + 1;
          const cnt = boxCounters[bucket];
          currentTarget = {
            formattedNum: chap > 0 ? `${chap}.${cnt}` : `${cnt}`,
            anchorId: `box-${pos}`,
            kind: 'theorem'
          };
        }
      }
      continue;
    }

    // 4. \label{key} outside numbered math environments
    if (m[7]) {
      const key = m[7].trim();
      if (key && !labels.has(key)) {
        const curSeq = seq++;
        labels.set(key, {
          key,
          offset: pos,
          globalSeq: curSeq,
          formattedNum: currentTarget ? currentTarget.formattedNum : `${curSeq}`,
          anchorId: currentTarget ? currentTarget.anchorId : `lbl-${sanitizeLabelAnchorId(key)}`,
          kind: currentTarget ? currentTarget.kind : 'generic'
        });
      }
    }
  }

  return labels;
}

function extractDocumentMetadata(combinedSource) {
  const meta = { title: '', author: '', date: '' };
  if (!combinedSource) return meta;
  for (const field of ['title', 'author', 'date']) {
    const r = new RegExp(`\\\\${field}(?:\\s*\\[[^\\]]*\\])?\\s*\\{`);
    const m = r.exec(combinedSource);
    if (m) {
      const braceIdx = combinedSource.indexOf('{', m.index + field.length + 1);
      const grp = braceIdx !== -1 ? extractBalancedBraces(combinedSource, braceIdx) : null;
      if (grp) meta[field] = grp.content.trim();
    }
  }
  return meta;
}

function extractDocumentLayoutAndCounters(rawPreambleText, masterBodyTex, colorTable) {
  const pre = rawPreambleText || '';
  const body = masterBodyTex || '';
  const combined = `${pre}\n${body}`;

  const persistedDocCfg = parseVectoriaDocConfigComments(combined);

  // 1. Document class detection
  let docClass = '';
  const dcRe = /\\documentclass(?:\s*\[[\s\S]*?\])?\s*\{([^}]+)\}/g;
  let dcm;
  while ((dcm = dcRe.exec(combined)) !== null) {
    const rawCls = dcm[1].trim().toLowerCase();
    if (!rawCls || rawCls === 'subfiles' || rawCls === 'standalone') continue;
    if (rawCls.includes('report') || rawCls === 'scrreprt') docClass = 'report';
    else if (rawCls.includes('book') || rawCls === 'scrbook' || rawCls === 'memoir') docClass = 'book';
    else if (rawCls.includes('article') || rawCls === 'scrartcl' || rawCls === 'amsart') docClass = 'article';
    else docClass = rawCls;
    break;
  }
  if (!docClass) {
    docClass = /\\chapter\*?(?![a-zA-Z@])/.test(body) ? 'report' : 'article';
  }

  // 2. Default tocdepth & equationWithin: report/book = 2 (up to subsection) & equation within chapter
  let tocDepth = docClass === 'report' || docClass === 'book' ? 2 : 3;
  let equationWithin = docClass === 'report' || docClass === 'book' ? 'chapter' : '';
  const counterWithinMap = {};

  for (const nwm of combined.matchAll(/\\(?:numberwithin|counterwithin)\*?\s*\{([^}]+)\}\s*\{([^}]+)\}/g)) {
    const childCnt = nwm[1].trim();
    const parentCnt = nwm[2].trim();
    if (childCnt && parentCnt) {
      counterWithinMap[childCnt] = parentCnt;
      if (childCnt === 'equation') equationWithin = parentCnt;
    }
  }
  for (const nwom of combined.matchAll(/\\counterwithout\*?\s*\{([^}]+)\}\s*\{([^}]+)\}/g)) {
    const childCnt = nwom[1].trim();
    if (childCnt === 'equation') equationWithin = '';
    delete counterWithinMap[childCnt];
  }

  const initialCounters = {
    part: 0,
    chapter: 0,
    section: 0,
    subsection: 0,
    subsubsection: 0,
    equation: 0
  };

  // Scan preamble counter initializations (\setcounter, \addtocounter, \stepcounter)
  const cntRe = /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{([a-zA-Z0-9_*]+)\}(?:\s*\{([+-]?\d+)\})?/g;
  let cm;
  while ((cm = cntRe.exec(pre)) !== null) {
    const op = cm[1];
    const name = cm[2].trim();
    const val = cm[3] !== undefined ? parseInt(cm[3], 10) : 0;
    if (name === 'tocdepth') {
      if (op === 'setcounter' && !Number.isNaN(val)) tocDepth = val;
      else if (op === 'addtocounter' && !Number.isNaN(val)) tocDepth += val;
      else if (op === 'stepcounter' || op === 'refstepcounter') tocDepth += 1;
      continue;
    }
    const prev = initialCounters[name] || 0;
    if (op === 'setcounter' && !Number.isNaN(val)) initialCounters[name] = val;
    else if (op === 'addtocounter' && !Number.isNaN(val)) initialCounters[name] = prev + val;
    else if (op === 'stepcounter' || op === 'refstepcounter') initialCounters[name] = prev + 1;
  }

  // 3. Parse hyperref link coloring (\usepackage[...]{hyperref} & \hypersetup{...})
  const hyperrefConfig = {
    colorlinks: Boolean(persistedDocCfg.hyperrefLinkColor),
    hidelinks: false,
    linkcolor: persistedDocCfg.hyperrefLinkColor || '',
    toccolor: '',
    urlcolor: persistedDocCfg.hyperrefUrlColor || persistedDocCfg.hyperrefLinkColor || '',
    citecolor: persistedDocCfg.hyperrefCiteColor || persistedDocCfg.hyperrefLinkColor || ''
  };
  const applyHyperOpts = (optText) => {
    if (!optText) return;
    const entries = splitTopLevelCommaOptions(optText);
    for (const ent of entries) {
      const eqIdx = ent.indexOf('=');
      const k = (eqIdx === -1 ? ent : ent.slice(0, eqIdx)).trim().toLowerCase();
      const v = eqIdx === -1 ? '' : stripOuterBracesOnce(ent.slice(eqIdx + 1).trim());
      if (k === 'colorlinks') {
        hyperrefConfig.colorlinks = v.toLowerCase() !== 'false';
      } else if (k === 'hidelinks') {
        if (v.toLowerCase() !== 'false') {
          hyperrefConfig.hidelinks = true;
          hyperrefConfig.colorlinks = false;
        }
      } else if (k === 'allcolors' && v && v !== '.') {
        const c = resolveLatexColorToCss(v, colorTable);
        hyperrefConfig.linkcolor = c;
        hyperrefConfig.urlcolor = c;
        hyperrefConfig.citecolor = c;
      } else if (k === 'linkcolor' && v && v !== '.') {
        hyperrefConfig.linkcolor = resolveLatexColorToCss(v, colorTable);
      } else if (k === 'toccolor' && v && v !== '.') {
        hyperrefConfig.toccolor = resolveLatexColorToCss(v, colorTable);
      } else if (k === 'urlcolor' && v && v !== '.') {
        hyperrefConfig.urlcolor = resolveLatexColorToCss(v, colorTable);
      } else if (k === 'citecolor' && v && v !== '.') {
        hyperrefConfig.citecolor = resolveLatexColorToCss(v, colorTable);
      }
    }
  };
  for (const hm of combined.matchAll(/\\(?:usepackage|RequirePackage)\s*\[((?:[^[\]{}]|\{[^}]*\})*)\]\s*\{[^}]*\bhyperref\b[^}]*\}/g)) {
    applyHyperOpts(hm[1]);
  }
  const hsRe = /\\hypersetup\s*\{/g;
  let hsm;
  while ((hsm = hsRe.exec(combined)) !== null) {
    const bPos = combined.indexOf('{', hsm.index);
    const grp = bPos !== -1 ? extractBalancedBraces(combined, bPos) : null;
    if (!grp) continue;
    applyHyperOpts(grp.content);
    hsRe.lastIndex = grp.endIndex + 1;
  }
  if (hyperrefConfig.colorlinks && !hyperrefConfig.hidelinks && !hyperrefConfig.linkcolor) {
    hyperrefConfig.linkcolor = '#dc2626';
  }

  // 4. Parse titlesec \titleformat{\chapter}[shape]{format} if explicitly customized
  const chapterFormat = {
    shape: 'display',
    align: 'left',
    uppercase: false,
    color: ''
  };
  const tfRe = /\\titleformat\s*\{\s*\\chapter\s*\}/g;
  let tfm;
  while ((tfm = tfRe.exec(combined)) !== null) {
    let cur = skipWhitespace(combined, tfm.index + tfm[0].length);
    if (combined[cur] === '[') {
      const sBr = extractBalancedBrackets(combined, cur);
      if (sBr) {
        chapterFormat.shape = sBr.content.trim().toLowerCase() || 'display';
        cur = skipWhitespace(combined, sBr.endIndex + 1);
      }
    }
    if (combined[cur] === '{') {
      const fmtGrp = extractBalancedBraces(combined, cur);
      if (fmtGrp) {
        const fmt = fmtGrp.content;
        if (/\\(?:centering|filcenter)\b/.test(fmt)) chapterFormat.align = 'center';
        else if (/\\(?:raggedleft|filleft)\b/.test(fmt)) chapterFormat.align = 'right';
        else if (/\\(?:raggedright|filright)\b/.test(fmt)) chapterFormat.align = 'left';
        if (/\\(?:MakeUppercase|uppercase)\b/.test(fmt)) chapterFormat.uppercase = true;
        const colM = /\\color\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}/.exec(fmt);
        if (colM) chapterFormat.color = resolveLatexColorToCss(colM[2], colorTable, colM[1] || '');
        tfRe.lastIndex = fmtGrp.endIndex + 1;
      }
    }
  }

  return {
    docClass,
    tocDepth,
    equationWithin,
    counterWithinMap,
    initialCounters,
    hyperrefConfig,
    chapterFormat
  };
}

function extractManuscriptTocEntries(masterBodyTex, layoutConfig, rawPreambleText = '') {
  const entries = [];
  if (!masterBodyTex) return entries;

  const exclNames = ['comment'];
  const combinedForExcl = `${rawPreambleText || ''}\n${masterBodyTex}`;
  for (const em of combinedForExcl.matchAll(/\\excludecomment\s*\{([a-zA-Z0-9_*]+)\}/g)) {
    const nm = em[1].trim();
    if (nm && !exclNames.includes(nm)) exclNames.push(nm);
  }

  let masked = masterBodyTex;
  for (const nm of exclNames) {
    const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blkRe = new RegExp(`\\\\begin\\s*\\{${esc}\\}[\\s\\S]*?\\\\end\\s*\\{${esc}\\}`, 'g');
    masked = masked.replace(blkRe, (m) => ' '.repeat(m.length));
  }
  masked = masked
    .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, (m) => ' '.repeat(m.length))
    .replace(/(^|[^\\])%[^\r\n]*/g, (_m, p1) => p1);

  const tocLevelMap = {
    part: -1,
    chapter: 0,
    section: 1,
    subsection: 2,
    subsubsection: 3
  };
  const initC = layoutConfig?.initialCounters || {};
  const liveCounters = {
    part: initC.part || 0,
    chapter: initC.chapter || 0,
    section: initC.section || 0,
    subsection: initC.subsection || 0,
    subsubsection: initC.subsubsection || 0
  };
  let liveTocDepth = typeof layoutConfig?.tocDepth === 'number' ? layoutConfig.tocDepth : 2;

  const scanRe =
    /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{([a-zA-Z0-9_*]+)\}(?:\s*\{([+-]?\d+)\})?|\\(part|chapter|section|subsection|subsubsection)(\*)?(?![a-zA-Z@])|\\(addcontentsline)(?![a-zA-Z@])/g;

  let m;
  while ((m = scanRe.exec(masked)) !== null) {
    if (m[1]) {
      const op = m[1];
      const cName = m[2].trim();
      const val = m[3] !== undefined ? parseInt(m[3], 10) : 0;
      if (cName === 'tocdepth') {
        if (op === 'setcounter' && !Number.isNaN(val)) liveTocDepth = val;
        else if (op === 'addtocounter' && !Number.isNaN(val)) liveTocDepth += val;
        else if (op === 'stepcounter' || op === 'refstepcounter') liveTocDepth += 1;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(liveCounters, cName)) {
        if (op === 'setcounter' && !Number.isNaN(val)) {
          liveCounters[cName] = val;
        } else if (op === 'addtocounter' && !Number.isNaN(val)) {
          liveCounters[cName] += val;
        } else if (op === 'stepcounter' || op === 'refstepcounter') {
          liveCounters[cName] += 1;
          if (cName === 'chapter') {
            liveCounters.section = 0;
            liveCounters.subsection = 0;
            liveCounters.subsubsection = 0;
          } else if (cName === 'section') {
            liveCounters.subsection = 0;
            liveCounters.subsubsection = 0;
          } else if (cName === 'subsection') {
            liveCounters.subsubsection = 0;
          }
        }
      }
      continue;
    }

    if (m[4]) {
      const cmdBase = m[4];
      const isStar = Boolean(m[5]);
      let cur = skipWhitespace(masked, m.index + m[0].length);
      let shortOptTitle = null;
      if (masked[cur] === '[') {
        const optBr = extractBalancedBrackets(masked, cur);
        if (optBr) {
          shortOptTitle = optBr.content.trim();
          cur = skipWhitespace(masked, optBr.endIndex + 1);
        }
      }
      if (masked[cur] !== '{') continue;
      const titleGrp = extractBalancedBraces(masked, cur);
      if (!titleGrp) continue;
      scanRe.lastIndex = titleGrp.endIndex + 1;

      const cleanTitle = unwrapTexFormattingToPlainText(titleGrp.content);
      const hasHardPrefix =
        /^(?:chương|chapter|phần|part|bài|câu\s*hỏi|problem)\b/i.test(cleanTitle) ||
        /^[0-9]+(\.[0-9]+)+\s+/.test(cleanTitle);

      let numLabel = '';
      if (!isStar) {
        if (cmdBase === 'part') {
          liveCounters.part++;
        } else if (cmdBase === 'chapter') {
          liveCounters.chapter++;
          liveCounters.section = 0;
          liveCounters.subsection = 0;
          liveCounters.subsubsection = 0;
          if (!hasHardPrefix) numLabel = `${liveCounters.chapter}`;
        } else if (cmdBase === 'section') {
          liveCounters.section++;
          liveCounters.subsection = 0;
          liveCounters.subsubsection = 0;
          if (!hasHardPrefix) {
            numLabel =
              liveCounters.chapter > 0
                ? `${liveCounters.chapter}.${liveCounters.section}`
                : `${liveCounters.section}`;
          }
        } else if (cmdBase === 'subsection') {
          liveCounters.subsection++;
          liveCounters.subsubsection = 0;
          const effSec = liveCounters.section || 1;
          if (!hasHardPrefix) {
            numLabel =
              liveCounters.chapter > 0
                ? `${liveCounters.chapter}.${effSec}.${liveCounters.subsection}`
                : `${effSec}.${liveCounters.subsection}`;
          }
        } else if (cmdBase === 'subsubsection') {
          liveCounters.subsubsection++;
          const effSec = liveCounters.section || 1;
          const effSub = liveCounters.subsection || 1;
          if (!hasHardPrefix) {
            numLabel =
              liveCounters.chapter > 0
                ? `${liveCounters.chapter}.${effSec}.${effSub}.${liveCounters.subsubsection}`
                : `${effSec}.${effSub}.${liveCounters.subsubsection}`;
          }
        }

        const tocLvlNum = tocLevelMap[cmdBase] ?? 99;
        if (tocLvlNum <= liveTocDepth) {
          const tocRaw =
            shortOptTitle !== null && shortOptTitle !== '' ? shortOptTitle : titleGrp.content.trim();
          entries.push({
            type: cmdBase,
            levelNum: tocLvlNum,
            numLabel,
            rawTitle: tocRaw,
            cleanTitle: unwrapTexFormattingToPlainText(tocRaw) || cleanTitle,
            isManualAdd: false
          });
        }
      }
      continue;
    }

    if (m[6] === 'addcontentsline') {
      const cur1 = skipWhitespace(masked, m.index + m[0].length);
      if (masked[cur1] !== '{') continue;
      const g1 = extractBalancedBraces(masked, cur1);
      if (!g1) continue;
      const cur2 = skipWhitespace(masked, g1.endIndex + 1);
      if (masked[cur2] !== '{') continue;
      const g2 = extractBalancedBraces(masked, cur2);
      if (!g2) continue;
      const cur3 = skipWhitespace(masked, g2.endIndex + 1);
      if (masked[cur3] !== '{') continue;
      const g3 = extractBalancedBraces(masked, cur3);
      if (!g3) continue;

      scanRe.lastIndex = g3.endIndex + 1;
      const tocFile = g1.content.trim().toLowerCase();
      const tocLevel = g2.content.trim().toLowerCase();
      const tocTitle = g3.content.trim();
      const lvlNum = tocLevelMap[tocLevel] ?? 1;
      if (tocFile === 'toc' && lvlNum <= liveTocDepth && tocTitle) {
        entries.push({
          type: tocLevel,
          levelNum: lvlNum,
          numLabel: '',
          rawTitle: tocTitle,
          cleanTitle: unwrapTexFormattingToPlainText(tocTitle) || tocTitle,
          isManualAdd: true
        });
      }
    }
  }

  return entries;
}

export function parsePreambleAndGlobals(rawPreambleText, masterBodyTex) {
  const macroTable = new Map();
  const customEnvs = new Map();
  const userEnvs = new Map();
  const colorTable = new Map();
  const boxStyleDefs = new Map();

  const combined = `${rawPreambleText || ''}\n${masterBodyTex || ''}`;

  // Seed customEnvs from any persisted % @vectoria-box-style comments (e.g. when re-opening slicer on a saved lesson)
  const persistedStyles = parseVectoriaBoxStyleComments(combined);
  for (const [canon, entry] of Object.entries(persistedStyles)) {
    if (entry && typeof entry === 'object') {
      customEnvs.set(canon, {
        envName: canon,
        canonicalEnv: canon,
        label: entry.label || CANONICAL_ACADEMIC_DEFAULT_LABELS[canon] || canon,
        hasCounter: entry.hasCounter !== false,
        labelColor: entry.labelColor || '',
        darkLabelColor: entry.darkLabelColor || (entry.labelColor ? computeDarkThemeTextColor(entry.labelColor) : ''),
        bodyFontStyle: entry.bodyFontStyle || '',
        isFramed: Boolean(entry.isFramed && entry.boxStyle),
        boxStyle: entry.boxStyle || null
      });
    }
  }

  // Parse colors and tcolorbox/mdframed styles FIRST so theorem/box environments resolve exact hex colors
  parseDefineColors(combined, colorTable);
  parseTcbAndMdfStyles(combined, boxStyleDefs);

  parseNewcommands(combined, macroTable);
  parseXparseDocumentCommands(combined, macroTable);
  parseDeclarePairedDelimiters(combined, macroTable);
  parseDeclareMathOperators(combined, macroTable);
  parseTexDefs(combined, macroTable);
  parseCustomTheoremsAndEnvironments(combined, customEnvs, userEnvs, macroTable, colorTable, boxStyleDefs);

  const docMeta = extractDocumentMetadata(combined);
  const layoutConfig = extractDocumentLayoutAndCounters(rawPreambleText, masterBodyTex, colorTable);
  const globalLabels = extractGlobalLabels(masterBodyTex, layoutConfig, customEnvs);
  const tocEntries = extractManuscriptTocEntries(masterBodyTex, layoutConfig, rawPreambleText);

  return {
    macroTable,
    customEnvs,
    userEnvs,
    colorTable,
    boxStyleDefs,
    globalLabels,
    tocEntries,
    docMeta,
    layoutConfig,
    docClass: layoutConfig.docClass,
    tocDepth: layoutConfig.tocDepth,
    equationWithin: layoutConfig.equationWithin,
    counterWithinMap: layoutConfig.counterWithinMap,
    initialCounters: layoutConfig.initialCounters,
    hyperrefConfig: layoutConfig.hyperrefConfig,
    chapterFormat: layoutConfig.chapterFormat
  };
}

// Convert siunitx unit macro sequence (e.g. "\kilogram\meter\per\second\squared") into clean KaTeX math
const SI_PREFIX_MAP = {
  tera: 'T', giga: 'G', mega: 'M', kilo: 'k', hecto: 'h', deca: 'da',
  deci: 'd', centi: 'c', milli: 'm', nano: 'n', pico: 'p', femto: 'f', atto: 'a'
};

const SI_UNIT_MAP = {
  meter: 'm', metre: 'm', gram: 'g', second: 's', ampere: 'A', kelvin: 'K', mole: 'mol', candela: 'cd',
  hertz: 'Hz', newton: 'N', pascal: 'Pa', joule: 'J', watt: 'W', coulomb: 'C', volt: 'V',
  farad: 'F', siemens: 'S', weber: 'Wb', tesla: 'T', henry: 'H', lumen: 'lm', lux: 'lx',
  becquerel: 'Bq', gray: 'Gy', sievert: 'Sv', katal: 'kat',
  liter: 'L', litre: 'L', minute: 'min', hour: 'h', day: 'd', year: 'yr',
  electronvolt: 'eV', bar: 'bar', atm: 'atm', radian: 'rad', steradian: 'sr',
  km: 'km', cm: 'cm', mm: 'mm', nm: 'nm', pm: 'pm', fm: 'fm',
  kg: 'kg', mg: 'mg', ms: 'ms', ns: 'ns', ps: 'ps',
  kHz: 'kHz', MHz: 'MHz', GHz: 'GHz', kJ: 'kJ', MJ: 'MJ', kW: 'kW', MW: 'MW',
  mV: 'mV', kV: 'kV', mA: 'mA', keV: 'keV', MeV: 'MeV', GeV: 'GeV', TeV: 'TeV',
  m: 'm', g: 'g', s: 's', A: 'A', K: 'K', N: 'N', J: 'J', W: 'W', V: 'V', C: 'C', F: 'F', T: 'T', H: 'H', L: 'L'
};

function formatSiNumberToKatex(rawNum) {
  if (!rawNum) return '';
  let n = rawNum.trim().replace(/,/g, '.');
  // Scientific notation 1.38e-23 or 2.5E6
  const sci = /^([+-]?\d+(?:\.\d+)?(?:\(\d+\))?)\s*[eE]\s*([+-]?\d+)$/.exec(n);
  if (sci) {
    const exp = sci[2].replace(/^\+/, '');
    return `${sci[1]} \\times 10^{${exp}}`;
  }
  n = n.replace(/\+-|\\pm/g, '\\pm ');
  return n;
}

function formatSiUnitToKatex(rawUnit) {
  if (!rawUnit) return '';
  let u = rawUnit.trim();
  if (!u) return '';

  // If unit string has no backslash macros (e.g. "m/s^2" or "kg.m/s^2"), wrap plain letters in \mathrm
  if (!u.includes('\\')) {
    const parts = u.replace(/\./g, '\\cdot ');
    return `\\mathrm{${parts}}`.replace(/\\mathrm\{([^}]*)\\cdot ([^}]*)\}/g, '\\mathrm{$1}\\cdot\\mathrm{$2}');
  }

  // Tokenize siunitx unit macros
  const out = [];
  let pendingPrefix = '';
  let pendingPer = false;
  const tokRe = /\\([a-zA-Z]+)|([./^0-9+-]+)|([a-zA-Z]+)/g;
  let m;
  while ((m = tokRe.exec(u)) !== null) {
    if (m[1]) {
      const cmd = m[1];
      if (cmd === 'micro' || cmd === 'um') {
        if (cmd === 'um') {
          const piece = `${pendingPer ? '/' : ''}\\mu\\mathrm{m}`;
          out.push(piece);
          pendingPer = false;
        } else {
          pendingPrefix = '\\mu ';
        }
        continue;
      }
      if (SI_PREFIX_MAP[cmd]) {
        pendingPrefix = `\\mathrm{${SI_PREFIX_MAP[cmd]}}`;
        continue;
      }
      if (cmd === 'per') {
        pendingPer = true;
        continue;
      }
      if (cmd === 'squared') {
        out.push('^{2}');
        continue;
      }
      if (cmd === 'cubed') {
        out.push('^{3}');
        continue;
      }
      if (cmd === 'tothe') {
        const bPos = skipWhitespace(u, tokRe.lastIndex);
        if (u[bPos] === '{') {
          const g = extractBalancedBraces(u, bPos);
          if (g) {
            out.push(`^{${g.content}}`);
            tokRe.lastIndex = g.endIndex + 1;
            continue;
          }
        }
      }
      if (cmd === 'ohm' || cmd === 'Omega') {
        out.push(`${pendingPer ? '/' : ''}${pendingPrefix}\\Omega`);
        pendingPrefix = '';
        pendingPer = false;
        continue;
      }
      if (cmd === 'celsius' || cmd === 'degreeCelsius') {
        out.push(`${pendingPer ? '/' : ''}^\\circ\\mathrm{C}`);
        pendingPrefix = '';
        pendingPer = false;
        continue;
      }
      if (cmd === 'degree' || cmd === 'arcdegree') {
        out.push('^\\circ');
        continue;
      }
      if (cmd === 'angstrom') {
        out.push(`${pendingPer ? '/' : ''}\\text{\\AA}`);
        pendingPer = false;
        continue;
      }
      if (cmd === 'percent') {
        out.push('\\%');
        continue;
      }
      if (SI_UNIT_MAP[cmd]) {
        const unitSym = `${pendingPrefix}\\mathrm{${SI_UNIT_MAP[cmd]}}`;
        if (pendingPer) {
          out.push(`/${unitSym}`);
          pendingPer = false;
        } else {
          if (out.length > 0 && !out[out.length - 1].startsWith('/')) out.push('\\cdot ');
          out.push(unitSym);
        }
        pendingPrefix = '';
        continue;
      }
      // Fallback unknown command inside unit
      out.push(`\\mathrm{${cmd}}`);
    } else if (m[2]) {
      const sym = m[2].replace(/\./g, '\\cdot ');
      out.push(sym);
    } else if (m[3]) {
      out.push(`\\mathrm{${m[3]}}`);
    }
  }
  return out.join('');
}

// Transpile siunitx & physics package commands into pure KaTeX-compatible LaTeX
// (Respects math vs prose context: in prose wraps \SI / \num / \si / \ang in $...$; inside math emits raw KaTeX)
export function transpilePhysicsAndSiunitx(texInput, inMathContext = false) {
  if (!texInput || !texInput.includes('\\')) return texInput || '';

  let s = texInput;

  const wrapMathIfProse = (mathExpr, currentlyInMath) =>
    currentlyInMath ? mathExpr : `$${mathExpr}$`;

  // Helper to replace command with optional [opt], optional *, and N brace args while tracking $...$ math parity
  const replaceBalancedCmd = (src, cmdNames, arity, builderFn) => {
    const pattern = new RegExp(`\\\\(${cmdNames.join('|')})(\\*)?(?![a-zA-Z@])`, 'g');
    let out = '';
    let last = 0;
    let inlineDollarParity = false;
    let dispDollar = false;
    let scanPos = 0;

    const advanceMathStateTo = (targetIdx) => {
      while (scanPos < targetIdx) {
        if (src[scanPos] === '\\') {
          const next = src[scanPos + 1];
          if (next === '[') dispDollar = true;
          else if (next === ']') dispDollar = false;
          else if (next === '(') inlineDollarParity = true;
          else if (next === ')') inlineDollarParity = false;
          scanPos += 2;
          continue;
        }
        if (src[scanPos] === '$') {
          if (src[scanPos + 1] === '$') {
            dispDollar = !dispDollar;
            scanPos += 2;
            continue;
          }
          inlineDollarParity = !inlineDollarParity;
        }
        scanPos++;
      }
    };

    let m;
    while ((m = pattern.exec(src)) !== null) {
      advanceMathStateTo(m.index);
      const isMathHere = inMathContext || inlineDollarParity || dispDollar;
      const cmd = m[1];
      const isStar = Boolean(m[2]);
      let cur = skipWhitespace(src, m.index + m[0].length);
      let optVal = null;
      if (src[cur] === '[') {
        const obr = extractBalancedBrackets(src, cur);
        if (obr) {
          optVal = obr.content.trim();
          cur = skipWhitespace(src, obr.endIndex + 1);
        }
      }

      const braceArgs = [];
      for (let k = 0; k < arity; k++) {
        const ws = skipWhitespace(src, cur);
        if (src[ws] === '{') {
          const g = extractBalancedBraces(src, ws);
          if (g) {
            braceArgs.push(g.content);
            cur = g.endIndex + 1;
            continue;
          }
        }
        break;
      }

      const rep = builderFn(cmd, isStar, optVal, braceArgs, isMathHere, cur, src);
      if (rep === null) continue;

      const finalEnd = typeof rep === 'object' ? rep.nextCursor : cur;
      const repStr = typeof rep === 'object' ? rep.text : rep;
      out += src.substring(last, m.index) + repStr;
      last = finalEnd;
      pattern.lastIndex = finalEnd;
    }
    out += src.substring(last);
    return out;
  };

  // 1. siunitx: \SIrange{v1}{v2}{unit}, \qtyrange{v1}{v2}{unit}
  s = replaceBalancedCmd(s, ['SIrange', 'qtyrange'], 3, (_c, _st, _opt, args, isM) => {
    if (args.length < 3) return null;
    const u = formatSiUnitToKatex(args[2]);
    return wrapMathIfProse(`${formatSiNumberToKatex(args[0])}\\text{ - }${formatSiNumberToKatex(args[1])}\\,${u}`, isM);
  });

  // 2. siunitx: \numrange{v1}{v2}
  s = replaceBalancedCmd(s, ['numrange'], 2, (_c, _st, _opt, args, isM) => {
    if (args.length < 2) return null;
    return wrapMathIfProse(`${formatSiNumberToKatex(args[0])}\\text{ - }${formatSiNumberToKatex(args[1])}`, isM);
  });

  // 3. siunitx: \SI{val}{unit} & \qty{val}{unit} (Note: physics also has 1-arg \qty{expr} / \qty(expr)!)
  s = replaceBalancedCmd(s, ['SI', 'qty'], 2, (cmd, _st, _opt, args, isM, cur, src) => {
    if (args.length === 2) {
      const numK = formatSiNumberToKatex(args[0]);
      const unitK = formatSiUnitToKatex(args[1]);
      return wrapMathIfProse(unitK ? `${numK}\\,${unitK}` : numK, isM);
    }
    if (cmd === 'qty' && args.length === 1) {
      return `\\left(${args[0]}\\right)`;
    }
    if (cmd === 'qty' && args.length === 0) {
      const ws = skipWhitespace(src, cur);
      if (src[ws] === '(') {
        let depth = 0;
        for (let p = ws; p < src.length; p++) {
          if (src[p] === '(') depth++;
          else if (src[p] === ')') {
            depth--;
            if (depth === 0) {
              return { text: `\\left(${src.substring(ws + 1, p)}\\right)`, nextCursor: p + 1 };
            }
          }
        }
      }
      if (src[ws] === '[') {
        const br = extractBalancedBrackets(src, ws);
        if (br) return { text: `\\left[${br.content}\\right]`, nextCursor: br.endIndex + 1 };
      }
    }
    return null;
  });

  // 4. siunitx: \si{unit}, \unit{unit}, \num{val}, \ang{deg}
  s = replaceBalancedCmd(s, ['si', 'unit'], 1, (_c, _st, _opt, args, isM) => {
    if (args.length < 1) return null;
    return wrapMathIfProse(formatSiUnitToKatex(args[0]), isM);
  });
  s = replaceBalancedCmd(s, ['num'], 1, (_c, _st, _opt, args, isM) => {
    if (args.length < 1) return null;
    return wrapMathIfProse(formatSiNumberToKatex(args[0]), isM);
  });
  s = replaceBalancedCmd(s, ['ang'], 1, (_c, _st, _opt, args, isM) => {
    if (args.length < 1) return null;
    const parts = args[0].split(';').map((p) => p.trim());
    if (parts.length === 3) {
      return wrapMathIfProse(`${parts[0] || 0}^\\circ${parts[1] ? `${parts[1]}'` : ''}${parts[2] ? `${parts[2]}''` : ''}`, isM);
    }
    return wrapMathIfProse(`${formatSiNumberToKatex(args[0])}^\\circ`, isM);
  });

  // 5. physics derivatives: \dv[n]{f}{x}, \dv{x}, \pdv[n]{f}{x}, \pdv{f}{x}{y}, \fdv{F}{g}
  s = replaceBalancedCmd(s, ['dv', 'pdv', 'fdv'], 3, (cmd, _st, opt, args) => {
    if (args.length === 0) return null;
    const sym = cmd === 'pdv' ? '\\partial' : cmd === 'fdv' ? '\\delta' : '\\mathrm{d}';
    const ord = opt ? `^{${opt}}` : '';
    if (args.length === 1) {
      return `\\frac{${sym}${ord}}{${sym} ${args[0]}${ord}}`;
    }
    if (args.length === 2) {
      return `\\frac{${sym}${ord} ${args[0]}}{${sym} ${args[1]}${ord}}`;
    }
    // 3 args: mixed second partial \pdv{f}{x}{y}
    return `\\frac{${sym}^{2} ${args[0]}}{${sym} ${args[1]}\\,${sym} ${args[2]}}`;
  });

  // 6. physics differential \dd[n]{x} or \dd x, vectors \vb, \va, \vu, delimiters \abs, \norm, \eval, \order, \qq
  s = replaceBalancedCmd(s, ['dd'], 1, (_c, _st, opt, args, _isM, cur, src) => {
    const ord = opt ? `^{${opt}}` : '';
    if (args.length === 1) {
      return `\\,\\mathrm{d}${ord}${args[0]}`;
    }
    const ws = skipWhitespace(src, cur);
    const tokM = /^(\\[a-zA-Z]+|[a-zA-Z])/.exec(src.slice(ws));
    if (tokM) {
      return { text: `\\,\\mathrm{d}${ord}${tokM[1]}`, nextCursor: ws + tokM[1].length };
    }
    return `\\mathrm{d}${ord}`;
  });

  s = replaceBalancedCmd(s, ['vb', 'va', 'vu', 'abs', 'norm', 'eval', 'order', 'qq'], 1, (cmd, _st, _opt, args) => {
    if (args.length < 1) return null;
    const a = args[0];
    if (cmd === 'vb') return `\\mathbf{${a}}`;
    if (cmd === 'va') return `\\vec{${a}}`;
    if (cmd === 'vu') return `\\hat{\\mathbf{${a}}}`;
    if (cmd === 'abs') return `\\left| ${a} \\right|`;
    if (cmd === 'norm') return `\\left\\| ${a} \\right\\|`;
    if (cmd === 'eval') return `\\left. ${a} \\right|`;
    if (cmd === 'order') return `\\mathcal{O}\\left(${a}\\right)`;
    if (cmd === 'qq') return `\\quad\\text{${a.trim()}}\\quad`;
    return null;
  });

  return s;
}

function expandSinglePass(text, macroTable) {
  if (!text || !macroTable || macroTable.size === 0) return { out: text, changed: false };

  let result = '';
  let i = 0;
  let changed = false;

  while (i < text.length) {
    if (text[i] !== '\\') {
      result += text[i];
      i++;
      continue;
    }

    const declCheck =
      /^\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand|DeclareMathOperator|DeclarePairedDelimiter|NewDocumentCommand|RenewDocumentCommand|ProvideDocumentCommand|DeclareDocumentCommand|newtcbox|renewtcbox)\*?\b/.exec(
        text.slice(i)
      );
    if (declCheck) {
      result += declCheck[0];
      i += declCheck[0].length;
      continue;
    }

    const cmdMatch = /^\\([a-zA-Z]+)(\*)?(?![a-zA-Z@])/.exec(text.slice(i));
    if (!cmdMatch) {
      result += text[i];
      i++;
      continue;
    }

    const cmdName = cmdMatch[1];
    const hasStar = Boolean(cmdMatch[2]);
    const macro = macroTable.get(cmdName);
    if (!macro || (hasStar && !macro.allowStar)) {
      result += cmdMatch[0];
      i += cmdMatch[0].length;
      continue;
    }

    let cursor = i + cmdMatch[0].length;
    const args = [];
    let aborted = false;

    if (macro.numArgs === 0) {
      if (text[cursor] === '{' && text[cursor + 1] === '}') {
        cursor += 2;
      }
      result += macro.body;
      i = cursor;
      changed = true;
      continue;
    }

    let requiredCount = macro.numArgs;
    if (macro.defaultOpt !== null) {
      const nextNonWs = skipWhitespace(text, cursor);
      if (text[nextNonWs] === '[') {
        const optGrp = extractBalancedBrackets(text, nextNonWs);
        if (optGrp) {
          args.push(optGrp.content);
          cursor = optGrp.endIndex + 1;
        } else {
          args.push(macro.defaultOpt);
        }
      } else {
        args.push(macro.defaultOpt);
      }
      requiredCount = macro.numArgs - 1;
    }

    for (let a = 0; a < requiredCount; a++) {
      cursor = skipWhitespace(text, cursor);
      if (cursor >= text.length) {
        aborted = true;
        break;
      }
      if (text[cursor] === '{') {
        const grp = extractBalancedBraces(text, cursor);
        if (!grp) {
          aborted = true;
          break;
        }
        args.push(grp.content);
        cursor = grp.endIndex + 1;
      } else if (text[cursor] === '\\') {
        const singleToken = /^\\([a-zA-Z]+|.)/.exec(text.slice(cursor));
        if (!singleToken) {
          aborted = true;
          break;
        }
        args.push(singleToken[0]);
        cursor += singleToken[0].length;
      } else {
        args.push(text[cursor]);
        cursor += 1;
      }
    }

    if (aborted) {
      result += cmdMatch[0];
      i += cmdMatch[0].length;
      continue;
    }

    let expanded = macro.body;
    expanded = expanded.replace(/#([1-9])/g, (full, digit) => {
      const idx = parseInt(digit, 10) - 1;
      return idx >= 0 && idx < args.length ? args[idx] : full;
    });

    result += expanded;
    i = cursor;
    changed = true;
  }

  return { out: result, changed };
}

export function expandMacrosSafely(texText, macroTable, maxPasses = 12) {
  if (!texText) return '';
  let current = stripBodyDeclarations(texText);
  if (!macroTable || macroTable.size === 0) return current;

  for (let pass = 0; pass < maxPasses; pass++) {
    const { out, changed } = expandSinglePass(current, macroTable);
    current = out;
    if (!changed) break;
  }
  return current;
}

export function stripBodyDeclarations(texText) {
  if (!texText) return '';
  let out = texText;

  // 0. Strip dead \iffalse ... \fi blocks
  out = out.replace(/\\iffalse\b[\s\S]*?\\fi\b/g, '');

  // 1. Strip balanced macro declarations (\newcommand, \DeclareRobustCommand, \NewDocumentCommand, \DeclarePairedDelimiter, \DeclareMathOperator, \newtcbox)
  const declRegex =
    /\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand|DeclareMathOperator|DeclarePairedDelimiter|NewDocumentCommand|RenewDocumentCommand|ProvideDocumentCommand|DeclareDocumentCommand|newtcbox|renewtcbox)\*?\s*/g;
  let m;
  const spansToRemove = [];
  while ((m = declRegex.exec(out)) !== null) {
    const cmdText = m[0];
    const isXparseOrPaired = /DocumentCommand|DeclarePairedDelimiter/.test(cmdText);
    const isTcbox = /tcbox/.test(cmdText);
    let cursor = skipWhitespace(out, m.index + cmdText.length);
    if (isTcbox && out[cursor] === '[') {
      const initB = extractBalancedBrackets(out, cursor);
      if (initB) cursor = skipWhitespace(out, initB.endIndex + 1);
    }
    if (out[cursor] === '{') {
      const g1 = extractBalancedBraces(out, cursor);
      if (!g1) continue;
      cursor = skipWhitespace(out, g1.endIndex + 1);
    } else if (out[cursor] === '\\') {
      const mc = /^\\[a-zA-Z]+/.exec(out.slice(cursor));
      if (!mc) continue;
      cursor = skipWhitespace(out, cursor + mc[0].length);
    } else {
      continue;
    }
    while (out[cursor] === '[') {
      const br = extractBalancedBrackets(out, cursor);
      if (!br) break;
      cursor = skipWhitespace(out, br.endIndex + 1);
    }
    if (isXparseOrPaired && out[cursor] === '{') {
      const specG = extractBalancedBraces(out, cursor);
      if (!specG) continue;
      cursor = skipWhitespace(out, specG.endIndex + 1);
    }
    if (out[cursor] === '{') {
      const bodyGrp = extractBalancedBraces(out, cursor);
      if (bodyGrp) {
        spansToRemove.push([m.index, bodyGrp.endIndex + 1]);
        declRegex.lastIndex = bodyGrp.endIndex + 1;
      }
    }
  }

  for (let i = spansToRemove.length - 1; i >= 0; i--) {
    const [s, e] = spansToRemove[i];
    out = out.substring(0, s) + out.substring(e);
  }

  // 2. Strip balanced \def\foo#1{...}
  const defRe = /\\def\s*\\[a-zA-Z]+(?:#[1-9])*\s*\{/g;
  const defSpans = [];
  while ((m = defRe.exec(out)) !== null) {
    const bIdx = out.indexOf('{', m.index + m[0].length - 1);
    const g = extractBalancedBraces(out, bIdx);
    if (g) {
      defSpans.push([m.index, g.endIndex + 1]);
      defRe.lastIndex = g.endIndex + 1;
    }
  }
  for (let i = defSpans.length - 1; i >= 0; i--) {
    out = out.substring(0, defSpans[i][0]) + out.substring(defSpans[i][1]);
  }

  // 3. Strip balanced environment/box declarations inside body (\newenvironment, \newtcolorbox, \NewTColorBox, \newtcbtheorem, \tcolorboxenvironment, \NewEnviron, \newmdtheoremenv, \newmdenv, \surroundwithmdframed, \mdfdefinestyle)
  const envDeclRe =
    /\\(newenvironment|renewenvironment|NewEnviron|RenewEnviron|NewDocumentEnvironment|RenewDocumentEnvironment|ProvideDocumentEnvironment|DeclareDocumentEnvironment|newtcolorbox|renewtcolorbox|NewTColorBox|RenewTColorBox|DeclareTColorBox|ProvideTColorBox|newtcbtheorem|renewtcbtheorem|NewTcbTheorem|RenewTcbTheorem|DeclareTcbTheorem|ProvideTcbTheorem|tcolorboxenvironment|newmdtheoremenv|newmdenv|surroundwithmdframed|mdfdefinestyle)\*?\s*/g;
  const envDeclSpans = [];
  while ((m = envDeclRe.exec(out)) !== null) {
    const kind = m[1];
    let cur = skipWhitespace(out, m.index + m[0].length);
    if (out[cur] === '[') {
      const initB = extractBalancedBrackets(out, cur);
      if (initB) cur = skipWhitespace(out, initB.endIndex + 1);
    }
    if (out[cur] !== '{') continue;
    const nameG = extractBalancedBraces(out, cur);
    if (!nameG) continue;
    cur = skipWhitespace(out, nameG.endIndex + 1);
    while (out[cur] === '[') {
      const optB = extractBalancedBrackets(out, cur);
      if (!optB) break;
      cur = skipWhitespace(out, optB.endIndex + 1);
    }
    let expectedBraces = 1;
    if (kind === 'newmdenv' || kind === 'surroundwithmdframed') expectedBraces = 0;
    else if (kind === 'newenvironment' || kind === 'renewenvironment' || kind.endsWith('TColorBox')) expectedBraces = 2;
    else if (kind.endsWith('DocumentEnvironment') || kind.toLowerCase().endsWith('tcbtheorem')) expectedBraces = 3;

    let ok = true;
    for (let b = 0; b < expectedBraces; b++) {
      cur = skipWhitespace(out, cur);
      if (out[cur] !== '{') {
        ok = false;
        break;
      }
      const bg = extractBalancedBraces(out, cur);
      if (!bg) {
        ok = false;
        break;
      }
      cur = bg.endIndex + 1;
    }
    if (ok) {
      // Optional trailing [within] on \newmdtheoremenv
      const afterWs = skipWhitespace(out, cur);
      if (kind === 'newmdtheoremenv' && out[afterWs] === '[') {
        const wB = extractBalancedBrackets(out, afterWs);
        if (wB) cur = wB.endIndex + 1;
      }
      envDeclSpans.push([m.index, cur]);
      envDeclRe.lastIndex = cur;
    }
  }
  for (let i = envDeclSpans.length - 1; i >= 0; i--) {
    out = out.substring(0, envDeclSpans[i][0]) + out.substring(envDeclSpans[i][1]);
  }

  // 4. Strip balanced package setup commands in body (\tcbset, \mdfsetup, \tikzset, \pgfplotsset, \sisetup, \captionsetup, \setlist, \tcbuselibrary)
  const setupRe = /\\(?:tcbset|tcbuselibrary|mdfsetup|tikzset|pgfplotsset|sisetup|captionsetup|setlist)\s*(?:\[[^\]]*\])?\s*\{/g;
  const setupSpans = [];
  while ((m = setupRe.exec(out)) !== null) {
    const bIdx = out.lastIndexOf('{', m.index + m[0].length);
    const g = extractBalancedBraces(out, bIdx);
    if (g) {
      setupSpans.push([m.index, g.endIndex + 1]);
      setupRe.lastIndex = g.endIndex + 1;
    }
  }
  for (let i = setupSpans.length - 1; i >= 0; i--) {
    out = out.substring(0, setupSpans[i][0]) + out.substring(setupSpans[i][1]);
  }

  out = out.replace(/\\newtheorem\*?\s*\{[^}]*\}(?:\s*\[[^\]]*\])?\s*\{[^}]*\}(?:\s*\[[^\]]*\])?/g, '');
  out = out.replace(/\\(?:definecolor|providecolor)\s*\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}/g, '');
  out = out.replace(/\\colorlet\s*(?:\[[^\]]*\])?\s*\{[^}]*\}\s*\{[^}]*\}/g, '');
  return out;
}

// Safely strip LaTeX formatting commands (\textcolor{c}{x}->x, \texorpdfstring{a}{b}->a, \textbf{x}->x) to clean plain text
export function unwrapTexFormattingToPlainText(rawStr) {
  if (!rawStr) return '';
  let s = rawStr;

  for (let pass = 0; pass < 8; pass++) {
    let changed = false;

    // 2-arg commands where 1st arg is discarded (\textcolor{col}{text}, \href{url}{text}, \colorbox{bg}{text})
    for (const cmd of ['textcolor', 'href', 'colorbox']) {
      const idx = s.indexOf(`\\${cmd}`);
      if (idx !== -1) {
        const re = new RegExp(`\\\\${cmd}\\s*\\{`, 'g');
        let res = '';
        let last = 0;
        let m;
        while ((m = re.exec(s)) !== null) {
          const b1 = s.indexOf('{', m.index);
          const g1 = extractBalancedBraces(s, b1);
          if (!g1) continue;
          const b2 = skipWhitespace(s, g1.endIndex + 1);
          if (s[b2] !== '{') continue;
          const g2 = extractBalancedBraces(s, b2);
          if (!g2) continue;
          res += s.substring(last, m.index) + g2.content;
          last = g2.endIndex + 1;
          re.lastIndex = last;
          changed = true;
        }
        res += s.substring(last);
        s = res;
      }
    }

    // \texorpdfstring{texTitle}{pdfFallback} -> keep texTitle so math variables stay intact
    if (s.includes('\\texorpdfstring')) {
      const re = /\\texorpdfstring\s*\{/g;
      let res = '';
      let last = 0;
      let m;
      while ((m = re.exec(s)) !== null) {
        const b1 = s.indexOf('{', m.index);
        const g1 = extractBalancedBraces(s, b1);
        if (!g1) continue;
        const b2 = skipWhitespace(s, g1.endIndex + 1);
        if (s[b2] !== '{') continue;
        const g2 = extractBalancedBraces(s, b2);
        if (!g2) continue;
        res += s.substring(last, m.index) + g1.content;
        last = g2.endIndex + 1;
        re.lastIndex = last;
        changed = true;
      }
      res += s.substring(last);
      s = res;
    }

    // \color{col} declaration -> strip completely (including {col}!)
    const afterColor = s.replace(/\\color\s*(?:\[[^\]]*\])?\s*\{[^{}]*\}/g, '');
    if (afterColor !== s) {
      s = afterColor;
      changed = true;
    }

    // 1-arg wrapper commands -> keep inner content
    const afterOne = s.replace(
      /\\(?:textbf|textit|emph|underline|uline|sout|texttt|textsc|textsf|textrm|textnormal|textsl|textsuperscript|textsubscript|mathrm|mathbf|mathbb|mathcal|text|mbox|fbox|hl|enquote|ensuremath|tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\s*\{([^{}]*)\}/g,
      '$1'
    );
    if (afterOne !== s) {
      s = afterOne;
      changed = true;
    }

    if (!changed) break;
  }

  return s
    .replace(/\\begin\s*\{[^}]*\}/g, ' ')
    .replace(/\\end\s*\{[^}]*\}/g, ' ')
    .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
    .replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildShortExcerpt(texSlice, maxLen = 62) {
  if (!texSlice) return 'Đoạn trống';
  const preCleaned = texSlice
    .replace(/(^|[^\\])%[^\r\n]*/g, '$1 ')
    .replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, ' ')
    .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, ' ')
    .replace(/\\begin\s*\{(?:p|b|B|v|V|small)?matrix\*?\}[\s\S]*?\\end\s*\{(?:p|b|B|v|V|small)?matrix\*?\}/g, '[...]')
    .replace(/\\begin\s*\{array\}[\s\S]*?\\end\s*\{array\}/g, '[...]')
    .replace(/\\(?:setcounter|addtocounter|setlength|addtolength)\s*\{[^}]*\}\s*\{[^}]*\}/g, ' ')
    .replace(/\\(?:stepcounter|refstepcounter|newcounter)\s*\{[^}]*\}(?:\s*\[[^\]]*\])?/g, ' ')
    .replace(/\\addcontentsline\s*\{[^}]*\}\s*\{[^}]*\}\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ')
    .replace(/\\(?:pagestyle|thispagestyle|pagenumbering|label|vspace|hspace|addvspace)\*?\s*\{[^}]*\}/g, ' ')
    .replace(/\\tableofcontents(?![a-zA-Z@])/g, ' Mục lục · ')
    .replace(/\\begin\s*\{[^}]+\}(?:\[[^\]]*\])?(?:\([^)]*\))?(?:\{[^}]*\})*/g, ' ')
    .replace(/\\end\s*\{[^}]+\}/g, ' ')
    .replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]*\}/g, ' Hình minh họa ');
  const cleaned = unwrapTexFormattingToPlainText(preCleaned)
    .replace(/\\\(|\\\)|\\\[|\\\]|\$\$/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\\\\*?(?:\s*\[[^\]]*\])?/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, ' ')
    .replace(/[{}&]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s*·\s*)+$/, '')
    .trim();
  if (!cleaned) return 'Khối công thức hoặc hình học';
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

function serializeBoxVisualOptionsToTcbOpts(bs, titleOverride = '') {
  const parts = [
    `colback=${bs.colback}`,
    `colframe=${bs.colframe}`,
    `colbacktitle=${bs.colbacktitle || bs.colframe}`,
    `coltitle=${bs.coltitle || '#ffffff'}`,
    `arc=${bs.radiusPx}px`,
    `toprule=${bs.topRulePx}px`,
    `rightrule=${bs.rightRulePx}px`,
    `bottomrule=${bs.bottomRulePx}px`,
    `leftrule=${bs.leftRulePx}px`
  ];
  if (bs.headerMode === 'boxed-pill') parts.push('attach boxed title');
  else if (bs.headerMode === 'inline') parts.push('detach title');
  const finalTitle = titleOverride || cleanDisplayLabelFromTitleTemplate(bs.rawTitleTemplate);
  if (finalTitle) {
    parts.push(`title={${finalTitle}}`);
  }
  return parts.join(', ');
}

function expandUserEnvironmentInstances(srcText, userEnvs) {
  if (!srcText || !userEnvs || userEnvs.size === 0) return srcText;
  let out = srcText;
  for (const [envName, uInfo] of userEnvs.entries()) {
    if (STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;
    const escaped = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenRe = new RegExp(`\\\\(begin|end)\\s*\\{${escaped}\\}`, 'g');
    for (let guard = 0; guard < 200; guard++) {
      tokenRe.lastIndex = 0;
      let openMatch = null;
      let depth = 0;
      let closeMatch = null;
      let m;
      while ((m = tokenRe.exec(out)) !== null) {
        if (m[1] === 'begin') {
          if (depth === 0) openMatch = m;
          depth++;
        } else {
          if (depth > 0) {
            depth--;
            if (depth === 0 && openMatch) {
              closeMatch = m;
              break;
            }
          }
        }
      }
      if (!openMatch || !closeMatch) break;

      let cursor = skipWhitespace(out, openMatch.index + openMatch[0].length);
      const args = [];
      if (uInfo.hasOptionalFirstArg) {
        if (out[cursor] === '[') {
          const br = extractBalancedBrackets(out, cursor);
          if (br) {
            args.push(br.content);
            cursor = br.endIndex + 1;
          } else {
            args.push(uInfo.defaultOpt || '');
          }
        } else {
          args.push(uInfo.defaultOpt || '');
        }
      }
      for (let k = 0; k < (uInfo.mandatoryArgsCount || 0); k++) {
        const ws = skipWhitespace(out, cursor);
        if (out[ws] === '{') {
          const g = extractBalancedBraces(out, ws);
          if (g) {
            args.push(g.content);
            cursor = g.endIndex + 1;
          }
        }
      }

      const subParams = (tmpl) =>
        (tmpl || '')
          .replace(/#([1-9])/g, (full, d) => {
            const idx = parseInt(d, 10) - 1;
            return idx >= 0 && idx < args.length ? args[idx] : '';
          })
          .replace(/\\(?:selectfont|normalfont)\b/g, '');

      const innerBody = out.substring(cursor, closeMatch.index);
      const expanded = `\n${subParams(uInfo.beginCode)}\n${innerBody}\n${subParams(uInfo.endCode)}\n`;
      out = out.substring(0, openMatch.index) + expanded + out.substring(closeMatch.index + closeMatch[0].length);
    }
  }
  return out;
}

function unwrapEnsureMathTokens(src) {
  if (!src || !src.includes('\\ensuremath')) return src;
  const re = /\\ensuremath\s*\{/g;
  let out = '';
  let last = 0;
  let inlineParity = false;
  let dispParity = false;
  let scanPos = 0;
  const advanceTo = (target) => {
    while (scanPos < target) {
      if (src[scanPos] === '\\') {
        const nx = src[scanPos + 1];
        if (nx === '[') dispParity = true;
        else if (nx === ']') dispParity = false;
        else if (nx === '(') inlineParity = true;
        else if (nx === ')') inlineParity = false;
        scanPos += 2;
        continue;
      }
      if (src[scanPos] === '$') {
        if (src[scanPos + 1] === '$') {
          dispParity = !dispParity;
          scanPos += 2;
          continue;
        }
        inlineParity = !inlineParity;
      }
      scanPos++;
    }
  };
  let m;
  while ((m = re.exec(src)) !== null) {
    advanceTo(m.index);
    const bPos = src.indexOf('{', m.index);
    const g = extractBalancedBraces(src, bPos);
    if (!g) continue;
    const inMath = inlineParity || dispParity;
    const rep = inMath ? g.content : `$${g.content}$`;
    out += src.substring(last, m.index) + rep;
    last = g.endIndex + 1;
    re.lastIndex = last;
  }
  return out + src.substring(last);
}

export function transpileCustomEnvironmentsAndColors(texText, preambleData) {
  if (!texText) return '';
  let out = stripBodyDeclarations(texText);
  const customEnvs = preambleData?.customEnvs;
  const userEnvs = preambleData?.userEnvs;
  const colorTable = preambleData?.colorTable;
  const boxStyleDefs = preambleData?.boxStyleDefs;

  // -1. Strip \iffalse ... \fi, \begin{comment} / \end{comment} wrapper tags, and convert balanced \begingroup ... \endgroup into brace scopes {...}
  out = out.replace(/\\iffalse\b[\s\S]*?\\fi\b/g, '');
  out = out.replace(/\\(?:begin|end)\s*\{comment\}/g, '');
  if (out.includes('\\begingroup') || out.includes('\\endgroup')) {
    const grpTokRe = /\\(begingroup|endgroup)(?![a-zA-Z@])/g;
    const grpStack = [];
    const grpEdits = [];
    let gm;
    while ((gm = grpTokRe.exec(out)) !== null) {
      if (gm[1] === 'begingroup') {
        grpStack.push({ start: gm.index, end: gm.index + gm[0].length });
      } else if (grpStack.length > 0) {
        const openTok = grpStack.pop();
        grpEdits.push({ start: openTok.start, end: openTok.end, rep: '{' });
        grpEdits.push({ start: gm.index, end: gm.index + gm[0].length, rep: '}' });
      } else {
        grpEdits.push({ start: gm.index, end: gm.index + gm[0].length, rep: '' });
      }
    }
    for (const unclosed of grpStack) {
      grpEdits.push({ start: unclosed.start, end: unclosed.end, rep: '' });
    }
    grpEdits.sort((a, b) => b.start - a.start);
    for (const ed of grpEdits) {
      out = out.substring(0, ed.start) + ed.rep + out.substring(ed.end);
    }
  }
  out = out.replace(/\\(?:selectfont|normalfont)\b/g, '');

  // 0. Unwrap \texorpdfstring{A}{B} -> A and \ensuremath{X} -> $X$ (or X in math)
  if (out.includes('\\texorpdfstring')) {
    const tpsRe = /\\texorpdfstring\s*\{/g;
    let res = '';
    let last = 0;
    let tm;
    while ((tm = tpsRe.exec(out)) !== null) {
      const b1 = out.indexOf('{', tm.index);
      const g1 = extractBalancedBraces(out, b1);
      if (!g1) continue;
      const b2 = skipWhitespace(out, g1.endIndex + 1);
      if (out[b2] !== '{') continue;
      const g2 = extractBalancedBraces(out, b2);
      if (!g2) continue;
      res += out.substring(last, tm.index) + g1.content;
      last = g2.endIndex + 1;
      tpsRe.lastIndex = last;
    }
    out = res + out.substring(last);
  }
  out = unwrapEnsureMathTokens(out);

  // 1. Expand custom \newenvironment / \NewEnviron user environments (e.g. lgiai, cminh)
  if (userEnvs && userEnvs.size > 0) {
    out = expandUserEnvironmentInstances(out, userEnvs);
    out = unwrapEnsureMathTokens(out);
  }

  // 2. Transpile siunitx & physics package commands into pure KaTeX-compatible LaTeX
  out = transpilePhysicsAndSiunitx(out, false);

  // 3. Unwrap \begin{subequations} ... \end{subequations} transparently
  out = out.replace(/\\(?:begin|end)\s*\{subequations\}/g, '');

  // 4. Convert \loigiai{ ... } (ex_test package) into \lgiai\n ...
  let lgIdx = 0;
  while ((lgIdx = out.indexOf('\\loigiai', lgIdx)) !== -1) {
    const afterCmd = lgIdx + '\\loigiai'.length;
    if (afterCmd < out.length && /[a-zA-Z]/.test(out[afterCmd])) {
      lgIdx = afterCmd;
      continue;
    }
    const bracePos = skipWhitespace(out, afterCmd);
    if (out[bracePos] === '{') {
      const grp = extractBalancedBraces(out, bracePos);
      if (grp) {
        const rep = `\n\\lgiai\n${grp.content.trim()}\n`;
        out = out.substring(0, lgIdx) + rep + out.substring(grp.endIndex + 1);
        lgIdx += rep.length;
        continue;
      }
    }
    lgIdx = afterCmd;
  }

  // 5. Transpile custom \newtheorem / \newtcbtheorem / \newtcolorbox / \NewTColorBox environments
  if (customEnvs && customEnvs.size > 0) {
    for (const [envName, info] of customEnvs.entries()) {
      if (STRUCTURAL_CORE_ENV_NAMES.has(envName)) continue;
      const needsEnvRename = envName !== info.canonicalEnv;
      const hasSpecialArgs = Boolean(info.isTcbTheorem || info.mandatoryArgsCount > 0 || info.isPureTcolorbox);
      if (!needsEnvRename && !hasSpecialArgs) continue;

      const escapedEnv = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const openScanRe = new RegExp(`\\\\begin\\s*\\{${escapedEnv}\\*?\\}`, 'g');
      const closeRe = new RegExp(`\\\\end\\s*\\{${escapedEnv}\\*?\\}`, 'g');

      const openReplacements = [];
      let om;
      while ((om = openScanRe.exec(out)) !== null) {
        let cursor = skipWhitespace(out, om.index + om[0].length);
        let rawOpt = '';
        let hasBracketOpt = false;
        let labelKey = '';
        const mandatoryVals = [];

        if (out[cursor] === '[') {
          const optBr = extractBalancedBrackets(out, cursor);
          if (optBr) {
            rawOpt = optBr.content.trim();
            hasBracketOpt = true;
            cursor = optBr.endIndex + 1;
          }
        }

        if (info.isTcbTheorem) {
          const ws1 = skipWhitespace(out, cursor);
          if (out[ws1] === '{') {
            const titleGrp = extractBalancedBraces(out, ws1);
            if (titleGrp) {
              mandatoryVals.push(titleGrp.content.trim());
              cursor = titleGrp.endIndex + 1;
              const ws2 = skipWhitespace(out, cursor);
              if (out[ws2] === '{') {
                const lblGrp = extractBalancedBraces(out, ws2);
                if (lblGrp && !lblGrp.content.includes('\n')) {
                  labelKey = lblGrp.content.trim();
                  cursor = lblGrp.endIndex + 1;
                }
              }
            }
          }
        } else if (info.mandatoryArgsCount > 0) {
          for (let k = 0; k < info.mandatoryArgsCount; k++) {
            const ws = skipWhitespace(out, cursor);
            if (out[ws] === '{') {
              const g = extractBalancedBraces(out, ws);
              if (g && !g.content.includes('\n\n')) {
                mandatoryVals.push(g.content.trim());
                cursor = g.endIndex + 1;
              }
            }
          }
        }

        if (info.isPureTcolorbox) {
          const allArgs = info.hasOptionalFirstArg
            ? [hasBracketOpt ? rawOpt : info.defaultOpt || '', ...mandatoryVals]
            : mandatoryVals;
          const substitutedStyle = (info.rawTcbOptions || '').replace(/#([1-9])/g, (_f, d) => {
            const idx = parseInt(d, 10) - 1;
            return idx >= 0 && idx < allArgs.length ? allArgs[idx] : '';
          });
          const mergedRawOpts =
            !info.hasOptionalFirstArg && hasBracketOpt
              ? `${substitutedStyle}, ${rawOpt}`
              : substitutedStyle;
          const resolvedBs = parseBoxVisualOptions(mergedRawOpts, colorTable, boxStyleDefs, 'tcolorbox', {
            hasTitle: /\btitle\s*=/.test(mergedRawOpts)
          });
          const titleFromArgs =
            !resolvedBs.rawTitleTemplate && mandatoryVals.length > 0 ? mandatoryVals[0] : resolvedBs.rawTitleTemplate;
          const tcbOptOut = serializeBoxVisualOptionsToTcbOpts(resolvedBs, titleFromArgs);
          openReplacements.push({
            start: om.index,
            end: cursor,
            rep: `\\begin{tcolorbox}[${tcbOptOut}]`
          });
          openScanRe.lastIndex = cursor;
          continue;
        }

        let resolvedOptTitle = '';
        if (mandatoryVals.length > 0) {
          resolvedOptTitle = mandatoryVals[0];
        } else if (rawOpt) {
          if (/^(?:colback|colframe|arc|boxrule|enhanced|breakable|sharp\s+corners|title|label)\b/i.test(rawOpt)) {
            const parsedCallBs = parseBoxVisualOptions(rawOpt, colorTable, boxStyleDefs, 'tcolorbox', {});
            resolvedOptTitle = parsedCallBs.rawTitleTemplate || '';
            const lblM = /\blabel\s*=\s*\{?([^},\]]+)\}?/.exec(rawOpt);
            if (lblM && !labelKey) labelKey = lblM[1].trim();
          } else {
            resolvedOptTitle = rawOpt;
          }
        }

        const safeOpt = resolvedOptTitle.replace(/\]/g, ')').replace(/\[/g, '(');
        let rep = safeOpt
          ? `\\begin{${info.canonicalEnv}}[${safeOpt}]`
          : `\\begin{${info.canonicalEnv}}`;
        if (labelKey) {
          const fullLbl = info.labelPrefix ? `${info.labelPrefix}:${labelKey}` : labelKey;
          rep += `\\label{${fullLbl}}`;
        }
        openReplacements.push({ start: om.index, end: cursor, rep });
        openScanRe.lastIndex = cursor;
      }

      for (let r = openReplacements.length - 1; r >= 0; r--) {
        const item = openReplacements[r];
        out = out.substring(0, item.start) + item.rep + out.substring(item.end);
      }

      const targetCloseEnv = info.isPureTcolorbox ? 'tcolorbox' : info.canonicalEnv;
      out = out.replace(closeRe, () => `\\end{${targetCloseEnv}}`);
    }
  }

  // 6. Normalize direct \begin{tcolorbox}[...] and \begin{mdframed}[...] options so custom colors & named \tcbset styles resolve to #hex & px
  if ((colorTable && colorTable.size > 0) || (boxStyleDefs && boxStyleDefs.size > 0) || out.includes('\\begin{tcolorbox}') || out.includes('\\begin{mdframed}')) {
    const directBoxRe = /\\begin\s*\{(tcolorbox|mdframed)\}/g;
    const boxFixes = [];
    let bm;
    while ((bm = directBoxRe.exec(out)) !== null) {
      const engine = bm[1];
      const afterBegin = skipWhitespace(out, bm.index + bm[0].length);
      let rawOpts = '';
      let endPos = bm.index + bm[0].length;
      if (out[afterBegin] === '[') {
        const br = extractBalancedBrackets(out, afterBegin);
        if (br) {
          rawOpts = br.content;
          endPos = br.endIndex + 1;
        }
      }
      if (rawOpts || (boxStyleDefs && (boxStyleDefs.has('__tcb_default__') || boxStyleDefs.has('__mdf_default__')))) {
        const bs = parseBoxVisualOptions(rawOpts, colorTable, boxStyleDefs, engine, {
          hasTitle: /\b(?:title|frametitle)\s*=/.test(rawOpts)
        });
        const normOpts = serializeBoxVisualOptionsToTcbOpts(bs, bs.rawTitleTemplate);
        boxFixes.push({
          start: bm.index,
          end: endPos,
          rep: `\\begin{tcolorbox}[${normOpts}]`,
          wasMdf: engine === 'mdframed'
        });
      }
      directBoxRe.lastIndex = endPos;
    }
    let convertedMdf = false;
    for (let k = boxFixes.length - 1; k >= 0; k--) {
      if (boxFixes[k].wasMdf) convertedMdf = true;
      out = out.substring(0, boxFixes[k].start) + boxFixes[k].rep + out.substring(boxFixes[k].end);
    }
    if (convertedMdf) {
      out = out.replace(/\\end\s*\{mdframed\}/g, '\\end{tcolorbox}');
    }
  }

  // 7. Convert inline-only scoped {\color[model]{col} ...} groups into \textcolor{#hex}{...} (never wrap multi-paragraph or block envs!)
  const cGroupRe = /\{\s*\\color(?![a-zA-Z@])/g;
  let cgm;
  while ((cgm = cGroupRe.exec(out)) !== null) {
    const cGroupIdx = cgm.index;
    const outerGrp = extractBalancedBraces(out, cGroupIdx);
    if (!outerGrp) {
      cGroupRe.lastIndex = cGroupIdx + cgm[0].length;
      continue;
    }
    const inner = outerGrp.content;
    const cm = /^\s*\\color\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}\s*([\s\S]*)$/.exec(inner);
    if (cm) {
      const hex = resolveLatexColorToCss(cm[2], colorTable, cm[1] || '');
      const bodyPart = cm[3];
      const hasBlockConstruct =
        /\n\s*\n/.test(bodyPart) ||
        /\\(?:begin|end|section|subsection|subsubsection|chapter|part|tableofcontents)\b/.test(bodyPart);
      if (!hasBlockConstruct) {
        const rep = `\\textcolor{${hex}}{${bodyPart}}`;
        out = out.substring(0, cGroupIdx) + rep + out.substring(outerGrp.endIndex + 1);
        cGroupRe.lastIndex = cGroupIdx + rep.length;
        continue;
      } else {
        // Keep resolved hex on \color{#hex} so math blocks or prose handle it without custom color name errors
        const rep = `{\\color{${hex}} ${bodyPart}}`;
        out = out.substring(0, cGroupIdx) + rep + out.substring(outerGrp.endIndex + 1);
        cGroupRe.lastIndex = cGroupIdx + rep.length;
        continue;
      }
    }
    cGroupRe.lastIndex = outerGrp.endIndex + 1;
  }

  // 8. Resolve custom colors, [model] color specs, and xcolor '!' mixes inside \textcolor, \color, \colorbox, and \fcolorbox
  out = out.replace(/\\(textcolor|color|colorbox)\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}/g, (full, cmd, model, colExpr) => {
    const resolved = resolveLatexColorToCss(colExpr, colorTable, model || '');
    if (resolved && (model || resolved !== colExpr.trim())) {
      return `\\${cmd}{${resolved}}`;
    }
    return full;
  });
  out = out.replace(/\\fcolorbox\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}\s*\{([^}]+)\}/g, (full, model, bdExpr, bgExpr) => {
    const resBd = resolveLatexColorToCss(bdExpr, colorTable, model || '');
    const resBg = resolveLatexColorToCss(bgExpr, colorTable, model || '');
    if (model || resBd !== bdExpr.trim() || resBg !== bgExpr.trim()) {
      return `\\fcolorbox{${resBd}}{${resBg}}`;
    }
    return full;
  });

  return out;
}

export function serializeUsedBoxStylesHeader(texBody, preambleData) {
  const customEnvs = preambleData?.customEnvs;
  if (!customEnvs || customEnvs.size === 0) return '';

  const stylesByCanonical = {};
  for (const [envName, info] of customEnvs.entries()) {
    if (!info || info.isPureTcolorbox || info.isDefaultAlias) continue;
    const canon = info.canonicalEnv;
    if (!canon || !CANONICAL_ACADEMIC_DEFAULT_LABELS[canon]) continue;

    // Prefer exact canonical name definition (e.g. 'bt' over 'ex') or framed/styled upgrade
    const existing = stylesByCanonical[canon];
    if (
      existing &&
      existing._exactName &&
      envName !== canon &&
      !info.isFramed &&
      !info.labelColor &&
      !info.bodyFontStyle
    ) {
      continue;
    }

    stylesByCanonical[canon] = {
      _exactName: envName === canon,
      label: info.label || CANONICAL_ACADEMIC_DEFAULT_LABELS[canon],
      hasCounter: info.hasCounter !== false,
      labelColor: info.labelColor || '',
      darkLabelColor: info.darkLabelColor || '',
      bodyFontStyle: info.bodyFontStyle || '',
      within: info.within || '',
      sharedCounter: info.sharedCounter || '',
      isFramed: Boolean(info.isFramed && info.boxStyle),
      boxStyle:
        info.isFramed && info.boxStyle
          ? {
              colback: info.boxStyle.colback,
              darkBg: info.boxStyle.darkBg,
              colframe: info.boxStyle.colframe,
              darkFrame: info.boxStyle.darkFrame,
              colbacktitle: info.boxStyle.colbacktitle,
              coltitle: info.boxStyle.coltitle,
              radiusPx: info.boxStyle.radiusPx,
              topRulePx: info.boxStyle.topRulePx,
              rightRulePx: info.boxStyle.rightRulePx,
              bottomRulePx: info.boxStyle.bottomRulePx,
              leftRulePx: info.boxStyle.leftRulePx,
              headerMode: info.boxStyle.headerMode
            }
          : null
    };
  }

  const cleanPayload = {};
  for (const [canon, entry] of Object.entries(stylesByCanonical)) {
    const { _exactName, ...rest } = entry;
    cleanPayload[canon] = rest;
  }

  if (Object.keys(cleanPayload).length === 0) return '';
  return `% @vectoria-box-style ${JSON.stringify(cleanPayload)}`;
}

export function parseVectoriaBoxStyleComments(rawTex) {
  const map = {};
  if (!rawTex || !rawTex.includes('@vectoria-box-style')) return map;
  const re = /^[ \t]*%[ \t]*@vectoria-box-style[ \t]+(\{[^\r\n]+\})/gm;
  let m;
  while ((m = re.exec(rawTex)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed && typeof parsed === 'object') {
        Object.assign(map, parsed);
      }
    } catch {
      // Ignore malformed comment line
    }
  }
  return map;
}

export function serializeVectoriaDocConfigHeader(preambleData, extraConfig = null) {
  const hCfg = preambleData?.hyperrefConfig;
  const lCfg = preambleData?.layoutConfig;
  const payload = {};
  const dc = preambleData?.docClass || lCfg?.docClass;
  if (dc && dc !== 'article') payload.docClass = dc;
  const td = typeof preambleData?.tocDepth === 'number' ? preambleData.tocDepth : lCfg?.tocDepth;
  if (typeof td === 'number' && extraConfig?.tocEntries) payload.tocDepth = td;
  if (lCfg?.equationWithin) payload.equationWithin = lCfg.equationWithin;
  if (hCfg && hCfg.colorlinks && !hCfg.hidelinks) {
    if (hCfg.linkcolor) payload.hyperrefLinkColor = hCfg.linkcolor;
    if (hCfg.urlcolor) payload.hyperrefUrlColor = hCfg.urlcolor;
    if (hCfg.citecolor) payload.hyperrefCiteColor = hCfg.citecolor;
  }
  if (Array.isArray(extraConfig?.tocEntries) && extraConfig.tocEntries.length > 0) {
    payload.tocEntries = extraConfig.tocEntries;
  }
  if (Object.keys(payload).length === 0) return '';
  return `% @vectoria-doc-config ${JSON.stringify(payload)}`;
}

export function parseVectoriaDocConfigComments(rawTex) {
  const cfg = {};
  if (!rawTex || !rawTex.includes('@vectoria-doc-config')) return cfg;
  const re = /^[ \t]*%[ \t]*@vectoria-doc-config[ \t]+(\{[^\r\n]+\})/gm;
  let m;
  while ((m = re.exec(rawTex)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed && typeof parsed === 'object') {
        Object.assign(cfg, parsed);
      }
    } catch {
      // Ignore malformed comment line
    }
  }
  return cfg;
}

export function computeCountersAtOffset(masterBodyTex, targetOffset, preambleData = null) {
  const initC = preambleData?.layoutConfig?.initialCounters || preambleData?.initialCounters || {};
  const docClass = preambleData?.docClass || preambleData?.layoutConfig?.docClass || 'article';
  const customEnvs = preambleData?.customEnvs || null;
  const eqWithin =
    preambleData?.layoutConfig?.equationWithin !== undefined
      ? preambleData.layoutConfig.equationWithin
      : docClass === 'report' || docClass === 'book'
        ? 'chapter'
        : '';

  const state = {
    part: initC.part || 0,
    chapter: initC.chapter || 0,
    section: initC.section || 0,
    subsection: initC.subsection || 0,
    subsubsection: initC.subsubsection || 0,
    equation: initC.equation || 0,
    boxCounters: {}
  };

  if (!masterBodyTex || typeof targetOffset !== 'number' || targetOffset <= 0) {
    return state;
  }

  const limit = Math.min(masterBodyTex.length, targetOffset);
  const masked = masterBodyTex
    .slice(0, limit)
    .replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, (m) => ' '.repeat(m.length))
    .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, (m) => ' '.repeat(m.length))
    .replace(/(^|[^\\])%[^\r\n]*/g, (_m, p1) => p1);

  const tokenRe =
    /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{([a-zA-Z0-9_*]+)\}(?:\s*\{([+-]?\d+)\})?|\\(part|chapter|section|subsection|subsubsection)(\*)?(?![a-zA-Z@])|\\begin\s*\{([a-zA-Z0-9_*]+)\}/g;

  let m;
  while ((m = tokenRe.exec(masked)) !== null) {
    const pos = m.index;
    if (m[1]) {
      const op = m[1];
      const cName = m[2].trim();
      const val = m[3] !== undefined ? parseInt(m[3], 10) : 0;
      const applyOp = (prev) => {
        if (op === 'setcounter' && !Number.isNaN(val)) return val;
        if (op === 'addtocounter' && !Number.isNaN(val)) return prev + val;
        if (op === 'stepcounter' || op === 'refstepcounter') return prev + 1;
        return prev;
      };
      if (cName === 'part') state.part = applyOp(state.part);
      else if (cName === 'chapter') {
        state.chapter = applyOp(state.chapter);
        if (op === 'stepcounter' || op === 'refstepcounter') {
          state.section = 0;
          state.subsection = 0;
          state.subsubsection = 0;
          state.boxCounters = {};
          if (eqWithin === 'chapter') state.equation = 0;
        }
      } else if (cName === 'section') {
        state.section = applyOp(state.section);
        if (op === 'stepcounter' || op === 'refstepcounter') {
          state.subsection = 0;
          state.subsubsection = 0;
          if (eqWithin === 'section') state.equation = 0;
        }
      } else if (cName === 'subsection') {
        state.subsection = applyOp(state.subsection);
        if (op === 'stepcounter' || op === 'refstepcounter') state.subsubsection = 0;
      } else if (cName === 'subsubsection') {
        state.subsubsection = applyOp(state.subsubsection);
      } else if (cName === 'equation') {
        state.equation = applyOp(state.equation);
      } else if (cName !== 'tocdepth' && cName !== 'secnumdepth') {
        const cInfo = customEnvs?.get(cName);
        const bucket = cInfo?.canonicalEnv || cName;
        state.boxCounters[bucket] = applyOp(state.boxCounters[bucket] || 0);
      }
      continue;
    }

    if (m[4]) {
      const hType = m[4];
      const isStar = Boolean(m[5]);
      if (!isStar) {
        if (hType === 'part') {
          state.part++;
        } else if (hType === 'chapter') {
          state.chapter++;
          state.section = 0;
          state.subsection = 0;
          state.subsubsection = 0;
          state.boxCounters = {};
          if (eqWithin === 'chapter') state.equation = 0;
        } else if (hType === 'section') {
          state.section++;
          state.subsection = 0;
          state.subsubsection = 0;
          if (eqWithin === 'section') state.equation = 0;
        } else if (hType === 'subsection') {
          state.subsection++;
          state.subsubsection = 0;
        } else if (hType === 'subsubsection') {
          state.subsubsection++;
        }
      }
      continue;
    }

    if (m[6]) {
      const rawEnv = m[6].trim();
      const isStarEnv = rawEnv.endsWith('*');
      const baseEnv = rawEnv.replace(/\*$/, '');

      if (!isStarEnv && /^(?:equation|align|gather|multline|flalign|alignat|eqnarray)$/.test(baseEnv)) {
        const endRe = new RegExp(`\\\\end\\s*\\{${baseEnv}\\}`, 'g');
        endRe.lastIndex = pos + m[0].length;
        const endM = endRe.exec(masked);
        const mathEnd = endM ? endM.index : masked.length;
        const mathInner = masked.slice(pos + m[0].length, mathEnd);
        const rows =
          baseEnv === 'equation' || baseEnv === 'multline'
            ? [{ text: mathInner }]
            : splitTopLevelLatexRows(mathInner);
        for (const row of rows) {
          if (!row.text.trim()) continue;
          if (/\\(?:notag|nonumber)\b/.test(row.text)) continue;
          if (/\\tag\*?\s*\{/.test(row.text)) continue;
          state.equation++;
        }
        if (endM) tokenRe.lastIndex = endM.index + endM[0].length;
        continue;
      }

      if (!isStarEnv) {
        const cInfo = customEnvs?.get(baseEnv);
        const canon = cInfo?.canonicalEnv || (CANONICAL_ACADEMIC_DEFAULT_LABELS[baseEnv] ? baseEnv : '');
        const isCountedBox =
          canon &&
          canon !== 'sol' &&
          canon !== 'note' &&
          !cInfo?.isPureTcolorbox &&
          (cInfo ? cInfo.hasCounter !== false : true);
        if (isCountedBox) {
          const bucket = cInfo?.sharedCounter
            ? customEnvs?.get(cInfo.sharedCounter)?.canonicalEnv || cInfo.sharedCounter
            : canon;
          state.boxCounters[bucket] = (state.boxCounters[bucket] || 0) + 1;
        }
      }
    }
  }

  return state;
}
