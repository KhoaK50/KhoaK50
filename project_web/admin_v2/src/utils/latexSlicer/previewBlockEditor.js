import katex from 'katex';
import {
  extractBalancedBraces,
  extractBalancedBrackets,
  resolveLatexColorToCss
} from './preambleParser.js';

export const ACADEMIC_BLOCK_ROLE_OPTIONS = [
  { value: 'paragraph', label: 'Đoạn văn chuẩn (12pt)', group: 'Văn bản' },
  { value: 'section', label: 'Mục lớn có số (\\section)', group: 'Tiêu đề mục' },
  { value: 'section*', label: 'Mục lớn không số (\\section*)', group: 'Tiêu đề mục' },
  { value: 'subsection', label: 'Mục con có số (\\subsection)', group: 'Tiêu đề mục' },
  { value: 'subsection*', label: 'Mục con không số (\\subsection*)', group: 'Tiêu đề mục' },
  { value: 'subsubsection', label: 'Tiểu mục có số (\\subsubsection)', group: 'Tiêu đề mục' },
  { value: 'subsubsection*', label: 'Tiểu mục không số (\\subsubsection*)', group: 'Tiêu đề mục' },
  { value: 'chapter', label: 'Chương có số (\\chapter)', group: 'Tiêu đề mục' },
  { value: 'chapter*', label: 'Chương không số (\\chapter*)', group: 'Tiêu đề mục' },
  { value: 'box:dn', label: 'Hộp Định nghĩa (dn)', group: 'Hộp học thuật' },
  { value: 'box:dl', label: 'Hộp Định lý (dl)', group: 'Hộp học thuật' },
  { value: 'box:tc', label: 'Hộp Tính chất (tc)', group: 'Hộp học thuật' },
  { value: 'box:vd', label: 'Hộp Ví dụ (vd)', group: 'Hộp học thuật' },
  { value: 'box:nx', label: 'Hộp Nhận xét (nx)', group: 'Hộp học thuật' },
  { value: 'box:note', label: 'Hộp Ghi chú (note)', group: 'Hộp học thuật' },
  { value: 'box:bt', label: 'Hộp Bài tập (bt)', group: 'Hộp học thuật' },
  { value: 'box:sol', label: 'Hộp Lời giải (sol)', group: 'Hộp học thuật' },
  { value: 'quote', label: 'Khối trích dẫn (quote)', group: 'Cấu trúc' },
  { value: 'itemize', label: 'Danh sách chấm (itemize)', group: 'Cấu trúc' },
  { value: 'enumerate', label: 'Danh sách đánh số (enumerate)', group: 'Cấu trúc' },
  { value: 'display-math', label: 'Phương trình dòng riêng (\\[...\\])', group: 'Toán học' }
];

export const ACADEMIC_LATEX_FONTS = [
  {
    value: 'serif',
    label: 'Học thuật (STIX)',
    css: "var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif)"
  },
  {
    value: 'sans',
    label: 'Không chân (\\textsf)',
    css: "var(--font-ui, 'Be Vietnam Pro', system-ui, -apple-system, sans-serif)"
  },
  {
    value: 'mono',
    label: 'Mã lệnh (\\texttt)',
    css: "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace"
  },
  {
    value: 'smallcaps',
    label: 'Hoa nhỏ (\\textsc)',
    css: "var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif)"
  }
];

export const ACADEMIC_LATEX_SIZES = [
  { value: 'footnotesize', label: '10pt (Chú thích)', css: '0.85em' },
  { value: 'small', label: '11pt (Nhỏ)', css: '0.92em' },
  { value: 'normalsize', label: '12pt (Chuẩn)', css: '1em' },
  { value: 'large', label: '14pt (Vừa)', css: '1.15rem' },
  { value: 'Large', label: '17pt (Lớn)', css: '1.3rem' },
  { value: 'LARGE', label: '20pt (Rất lớn)', css: '1.5rem' },
  { value: 'huge', label: '24pt (Đại tự)', css: '1.8rem' }
];

export const ALL_LATEX_SIZE_CSS_MAP = {
  Huge: '2.2rem',
  huge: '1.8rem',
  LARGE: '1.5rem',
  Large: '1.3rem',
  large: '1.15rem',
  normalsize: '1em',
  small: '0.92em',
  footnotesize: '0.85em',
  scriptsize: '0.78em',
  tiny: '0.72em'
};

export const ACADEMIC_COLOR_PALETTE = [
  { value: '', label: 'Mặc định trang', swatch: 'var(--s12, #111827)' },
  { value: '#dc2626', label: 'Đỏ học thuật', swatch: '#dc2626' },
  { value: '#8e1728', label: 'Đỏ đô', swatch: '#8e1728' },
  { value: '#1d4ed8', label: 'Xanh hoàng gia', swatch: '#1d4ed8' },
  { value: '#d11270', label: 'Hồng đỏ', swatch: '#d11270' },
  { value: '#15803d', label: 'Lục bảo', swatch: '#15803d' },
  { value: '#b45309', label: 'Hổ phách', swatch: '#b45309' },
  { value: '#7e22ce', label: 'Tím học thuật', swatch: '#7e22ce' }
];

export const QUICK_MATH_SNIPPETS = [
  { label: 'Phân số', insert: '\\frac{a}{b}' },
  { label: 'Căn bậc 2', insert: '\\sqrt{x}' },
  { label: 'Số mũ', insert: 'x^{2}' },
  { label: 'Chỉ số dưới', insert: 'a_{ij}' },
  { label: 'Tổng ∑', insert: '\\sum_{i=1}^{n} ' },
  { label: 'Tích phân ∫', insert: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Giới hạn', insert: '\\lim_{x \\to \\infty} ' },
  { label: 'Tập ℝⁿ', insert: '\\mathbb{R}^{n}' },
  { label: 'Vector', insert: '\\vec{v}' },
  { label: 'Ma trận 2×2', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' }
];

const BOX_ALIAS_TO_CANONICAL = {
  dn: 'dn',
  definition: 'dn',
  dinhnghia: 'dn',
  dl: 'dl',
  theorem: 'dl',
  dinhly: 'dl',
  lemma: 'dl',
  bode: 'dl',
  bd: 'dl',
  tc: 'tc',
  property: 'tc',
  properties: 'tc',
  tinhchat: 'tc',
  proposition: 'tc',
  menhde: 'tc',
  md: 'tc',
  hq: 'tc',
  corollary: 'tc',
  hequa: 'tc',
  vd: 'vd',
  example: 'vd',
  vidu: 'vd',
  nx: 'nx',
  remark: 'nx',
  nhanxet: 'nx',
  note: 'note',
  ghichu: 'note',
  luuy: 'note',
  chuy: 'note',
  bt: 'bt',
  exercise: 'bt',
  baitap: 'bt',
  btmau: 'bt',
  sol: 'sol',
  solution: 'sol',
  loigiai: 'sol'
};

const DISPLAY_MATH_ENV_SET = new Set([
  'equation',
  'equation*',
  'align',
  'align*',
  'gather',
  'gather*',
  'multline',
  'multline*',
  'flalign',
  'flalign*',
  'eqnarray',
  'eqnarray*'
]);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtmlEntities(str) {
  return String(str ?? '')
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&hellip;/gi, '...')
    .replace(/&bull;/gi, '*')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

export function escapePlainTextForLatex(rawText) {
  if (!rawText) return '';
  const cleaned = String(rawText)
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/[\u2014\u2013]/g, '-');

  let out = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '\u00A0') out += '~';
    else if (ch === '\\') out += '\\textbackslash{}';
    else if (ch === '%') out += '\\%';
    else if (ch === '#') out += '\\#';
    else if (ch === '&') out += '\\&';
    else if (ch === '_') out += '\\_';
    else if (ch === '$') out += '\\$';
    else if (ch === '{') out += '\\{';
    else if (ch === '}') out += '\\}';
    else if (ch === '~') out += '\\textasciitilde{}';
    else if (ch === '^') out += '\\textasciicircum{}';
    else out += ch;
  }
  return out;
}

export function renderFormulaChipPreviewHtml(mathTex, displayMode = false, options = {}) {
  const raw = String(mathTex ?? '').trim();
  if (!raw) {
    return '<span style="opacity: 0.6; font-style: italic;">f(x)</span>';
  }
  let clean = raw
    .replace(/\\label\s*\{[^}]*\}/g, '')
    .replace(/\\(?:notag|nonumber)\b/g, '')
    .replace(/\\vv\s*\{/g, '\\vec{')
    .replace(/\\vv\b/g, '\\vec');

  if (options?.colorTable) {
    clean = clean.replace(
      /\\(textcolor|color)\s*(?:\[\s*([^\]]*)\s*\])?\s*\{([^}]+)\}/g,
      (_m, cmd, colMod, colSpec) => {
        const css = resolveLatexColorToCss(colSpec, options.colorTable, colMod || '');
        return `\\${cmd}{${css.startsWith('var(') ? '#64748b' : css}}`;
      }
    );
  }

  try {
    return katex.renderToString(clean, {
      displayMode: Boolean(displayMode),
      throwOnError: false,
      strict: false
    });
  } catch {
    return `<code>${escapeHtml(raw)}</code>`;
  }
}

export function buildMathChipHtml(mathTex, delim = '$', options = {}) {
  const preview = renderFormulaChipPreviewHtml(mathTex, false, options);
  return `<span class="v-edit-math-chip" contenteditable="false" data-v-chip="math" data-v-delim="${escapeHtml(delim)}" data-v-tex="${escapeHtml(mathTex)}">${preview}</span>`;
}

export function buildRefChipHtml(cmdName, argVal, options = {}) {
  const key = String(argVal ?? '').trim();
  const labelMap = options?.labelMap || null;
  const entry = labelMap && typeof labelMap.get === 'function' ? labelMap.get(key) : null;
  const resolved = entry ? entry.formattedNum || entry.num || key : key;
  const display =
    cmdName === 'eqref'
      ? `(${resolved})`
      : cmdName === 'cite'
        ? `[${key}]`
        : `${resolved}`;
  return `<span class="v-edit-ref-chip" contenteditable="false" data-v-chip="ref" data-v-cmd="${escapeHtml(cmdName)}" data-v-arg="${escapeHtml(key)}" title="Tham chiếu \\${escapeHtml(cmdName)}{${escapeHtml(key)}}">${escapeHtml(display)}</span>`;
}

function buildRawTexChipHtml(rawTex, labelText) {
  return `<span class="v-edit-ref-chip" contenteditable="false" data-v-chip="raw" data-v-tex="${escapeHtml(rawTex)}" title="${escapeHtml(rawTex)}">${escapeHtml(labelText)}</span>`;
}

function createEmptyInlineMod() {
  return {
    bold: false,
    italic: false,
    underline: false,
    uwave: false,
    sout: false,
    hl: false,
    font: null,
    size: null,
    color: null
  };
}

function wrapHtmlWithInlineMod(innerHtml, mod, colorTable) {
  if (!innerHtml) return '';
  let res = innerHtml;
  if (mod.sout) res = `<s data-v-mark="sout">${res}</s>`;
  if (mod.uwave) {
    res = `<span data-v-mark="uwave" style="text-decoration: underline wavy;">${res}</span>`;
  } else if (mod.underline) {
    res = `<u data-v-mark="underline">${res}</u>`;
  }
  if (mod.italic) res = `<em data-v-mark="italic">${res}</em>`;
  if (mod.bold) res = `<strong data-v-mark="bold">${res}</strong>`;
  if (mod.font === 'sans') {
    res = `<span data-v-font="sans" style="font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif);">${res}</span>`;
  } else if (mod.font === 'mono') {
    res = `<code data-v-font="mono" style="font-family: monospace; background: var(--s2); padding: 1px 5px; border-radius: 2px; border: 1px solid var(--s3); font-size: 0.9em;">${res}</code>`;
  } else if (mod.font === 'smallcaps') {
    res = `<span data-v-font="smallcaps" style="font-variant: small-caps;">${res}</span>`;
  }
  if (mod.hl) {
    res = `<mark data-v-mark="hl" style="background: rgba(250, 204, 21, 0.28); color: inherit; padding: 0 3px; border-radius: 2px;">${res}</mark>`;
  }
  if (mod.color) {
    const cssCol = resolveLatexColorToCss(mod.color, colorTable);
    res = `<span data-v-color="${escapeHtml(mod.color)}" style="color: ${escapeHtml(cssCol)};">${res}</span>`;
  }
  if (mod.size && mod.size !== 'normalsize' && ALL_LATEX_SIZE_CSS_MAP[mod.size]) {
    res = `<span data-v-size="${escapeHtml(mod.size)}" style="font-size: ${ALL_LATEX_SIZE_CSS_MAP[mod.size]};">${res}</span>`;
  }
  return res;
}

function splitTopLevelParagraphs(texStr) {
  const paras = [];
  if (!texStr) return [''];
  let braceDepth = 0;
  let inDollar = false;
  let lastStart = 0;
  let i = 0;

  while (i < texStr.length) {
    const ch = texStr[i];
    if (ch === '\\') {
      const parM = /^\\par(?![a-zA-Z@])/.exec(texStr.slice(i));
      if (parM && braceDepth === 0 && !inDollar) {
        paras.push(texStr.slice(lastStart, i));
        i += parM[0].length;
        while (i < texStr.length && /[ \t\r\n]/.test(texStr[i])) i++;
        lastStart = i;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === '$') {
      inDollar = !inDollar;
      i++;
      continue;
    }
    if (!inDollar) {
      if (ch === '{') braceDepth++;
      else if (ch === '}' && braceDepth > 0) braceDepth--;
      else if ((ch === '\n' || ch === '\r') && braceDepth === 0) {
        const blankM = /^(?:\r?\n)[ \t]*(?:\r?\n)+/.exec(texStr.slice(i));
        if (blankM) {
          paras.push(texStr.slice(lastStart, i));
          i += blankM[0].length;
          lastStart = i;
          continue;
        }
      }
    }
    i++;
  }
  paras.push(texStr.slice(lastStart));
  const filtered = paras.map((p) => p.trim()).filter((p) => p.length > 0);
  return filtered.length > 0 ? filtered : [''];
}

export function inlineLatexToEditableHtml(inlineTex, options = {}) {
  if (!inlineTex || !String(inlineTex).trim()) return '';
  const colorTable = options?.colorTable || null;

  const convertSinglePara = (paraTex) => {
    const stash = new Map();
    let sc = 0;
    const putStash = (htmlFrag) => {
      const tok = `\u0002VE${sc++}\u0003`;
      stash.set(tok, htmlFrag);
      return tok;
    };

    let work = String(paraTex);

    // 1. Protect \verb|...| as atomic raw chip
    work = work.replace(/\\verb\*?([^a-zA-Z\s])([\s\S]*?)\1/g, (full, _d, code) =>
      putStash(buildRawTexChipHtml(full, code))
    );

    // 2. Protect escaped \$ so it never triggers inline math scanning
    work = work.replace(/\\\$/g, () => putStash('$'));

    // 3. Convert inline math \(...\) and $...$ (and inline $$...$$ / \[...\]) into Atomic KaTeX Chips
    work = work.replace(/\$\$([\s\S]+?)\$\$/g, (_, mCode) =>
      putStash(buildMathChipHtml(mCode.trim(), '$$', options))
    );
    work = work.replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_, mCode) =>
      putStash(buildMathChipHtml(mCode.trim(), '\\[', options))
    );
    work = work.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_, mCode) =>
      putStash(buildMathChipHtml(mCode.trim(), '\\(', options))
    );
    work = work.replace(/\$([^$]+?)\$/g, (_, mCode) =>
      putStash(buildMathChipHtml(mCode, '$', options))
    );

    const evalSeg = (seg) => {
      if (!seg) return '';
      let out = '';
      let idx = 0;
      const activeMod = createEmptyInlineMod();

      const flushPlain = (txt) => {
        if (!txt) return;
        const normalized = txt.replace(/\s*\r?\n\s*/g, ' ');
        out += wrapHtmlWithInlineMod(escapeHtml(normalized), activeMod, colorTable);
      };

      const skipSp = (s, p) => {
        let k = p;
        while (k < s.length && /[ \t\r\n]/.test(s[k])) k++;
        return k;
      };

      while (idx < seg.length) {
        if (seg[idx] === '\u0002') {
          const endTok = seg.indexOf('\u0003', idx + 1);
          if (endTok !== -1) {
            const tok = seg.slice(idx, endTok + 1);
            const stashedHtml = stash.get(tok) || '';
            if (stashedHtml === '$') {
              flushPlain('$');
            } else {
              out += wrapHtmlWithInlineMod(stashedHtml, activeMod, colorTable);
            }
            idx = endTok + 1;
            continue;
          }
        }

        const ch = seg[idx];
        if (ch === '~') {
          flushPlain('\u00A0');
          idx++;
          continue;
        }
        if (ch === '{') {
          const grp = extractBalancedBraces(seg, idx);
          if (grp) {
            out += wrapHtmlWithInlineMod(evalSeg(grp.content), activeMod, colorTable);
            idx = grp.endIndex + 1;
            continue;
          }
          idx++;
          continue;
        }
        if (ch === '}') {
          idx++;
          continue;
        }

        if (ch === '\\') {
          // Explicit line break \\ or \\[0.2cm]
          if (seg[idx + 1] === '\\') {
            let after = idx + 2;
            if (seg[after] === '*') after++;
            let ws = after;
            while (ws < seg.length && /[ \t]/.test(seg[ws])) ws++;
            if (seg[ws] === '[') {
              const obr = extractBalancedBrackets(seg, ws);
              if (obr && obr.endIndex - ws < 32) after = obr.endIndex + 1;
            }
            out += '<br data-v-br="true" />';
            idx = after;
            continue;
          }

          const nextCh = seg[idx + 1];
          if (!nextCh) {
            idx++;
            continue;
          }

          if (!/[a-zA-Z]/.test(nextCh)) {
            const symMap = {
              '%': '%',
              '#': '#',
              '&': '&',
              '_': '_',
              '{': '{',
              '}': '}',
              '$': '$',
              ' ': ' ',
              ',': '\u2009',
              ';': '\u2009',
              ':': '\u2009',
              '!': '',
              '/': ''
            };
            flushPlain(Object.prototype.hasOwnProperty.call(symMap, nextCh) ? symMap[nextCh] : nextCh);
            idx += 2;
            continue;
          }

          const cmdM = /^\\([a-zA-Z]+)\*?/.exec(seg.slice(idx));
          if (!cmdM) {
            idx++;
            continue;
          }
          const cmd = cmdM[1];
          let cur = idx + cmdM[0].length;

          // Declarative switches inside scoped brace groups
          if (cmd === 'bfseries' || cmd === 'bf') {
            activeMod.bold = true;
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'mdseries' || cmd === 'normalfont') {
            activeMod.bold = false;
            if (cmd === 'normalfont') {
              activeMod.italic = false;
              activeMod.font = null;
            }
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'itshape' || cmd === 'it' || cmd === 'slshape' || cmd === 'sl' || cmd === 'em') {
            activeMod.italic = true;
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'upshape') {
            activeMod.italic = false;
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'sffamily' || cmd === 'sf') {
            activeMod.font = 'sans';
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'ttfamily' || cmd === 'tt') {
            activeMod.font = 'mono';
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'scshape' || cmd === 'sc') {
            activeMod.font = 'smallcaps';
            idx = skipSp(seg, cur);
            continue;
          }
          if (cmd === 'rmfamily' || cmd === 'rm') {
            activeMod.font = null;
            idx = skipSp(seg, cur);
            continue;
          }
          if (Object.prototype.hasOwnProperty.call(ALL_LATEX_SIZE_CSS_MAP, cmd)) {
            const ws = skipSp(seg, cur);
            if (seg[ws] === '{') {
              const sg = extractBalancedBraces(seg, ws);
              if (sg) {
                const szHtml =
                  cmd === 'normalsize'
                    ? evalSeg(sg.content)
                    : `<span data-v-size="${escapeHtml(cmd)}" style="font-size: ${ALL_LATEX_SIZE_CSS_MAP[cmd]};">${evalSeg(sg.content)}</span>`;
                out += wrapHtmlWithInlineMod(szHtml, activeMod, colorTable);
                idx = sg.endIndex + 1;
                continue;
              }
            }
            activeMod.size = cmd === 'normalsize' ? null : cmd;
            idx = ws;
            continue;
          }
          if (cmd === 'color') {
            let ws = skipSp(seg, cur);
            let colMod = '';
            if (seg[ws] === '[') {
              const obr = extractBalancedBrackets(seg, ws);
              if (obr) {
                colMod = obr.content.trim();
                ws = skipSp(seg, obr.endIndex + 1);
              }
            }
            if (seg[ws] === '{') {
              const cg = extractBalancedBraces(seg, ws);
              if (cg) {
                const resolved = resolveLatexColorToCss(cg.content.trim(), colorTable, colMod);
                activeMod.color = resolved.startsWith('#') ? resolved : cg.content.trim();
                idx = skipSp(seg, cg.endIndex + 1);
                continue;
              }
            }
          }

          // 2-argument commands: \textcolor[m]{col}{body}, \href{url}{text}
          if (cmd === 'textcolor') {
            let ws1 = skipSp(seg, cur);
            let colMod = '';
            if (seg[ws1] === '[') {
              const obr = extractBalancedBrackets(seg, ws1);
              if (obr) {
                colMod = obr.content.trim();
                ws1 = skipSp(seg, obr.endIndex + 1);
              }
            }
            if (seg[ws1] === '{') {
              const g1 = extractBalancedBraces(seg, ws1);
              if (g1) {
                const ws2 = skipSp(seg, g1.endIndex + 1);
                if (seg[ws2] === '{') {
                  const g2 = extractBalancedBraces(seg, ws2);
                  if (g2) {
                    const cssCol = resolveLatexColorToCss(g1.content.trim(), colorTable, colMod);
                    const storedCol = cssCol.startsWith('#') ? cssCol : g1.content.trim();
                    const colHtml = `<span data-v-color="${escapeHtml(storedCol)}" style="color: ${escapeHtml(cssCol)};">${evalSeg(g2.content)}</span>`;
                    out += wrapHtmlWithInlineMod(colHtml, activeMod, colorTable);
                    idx = g2.endIndex + 1;
                    continue;
                  }
                }
              }
            }
          }

          if (cmd === 'href') {
            const ws1 = skipSp(seg, cur);
            if (seg[ws1] === '{') {
              const g1 = extractBalancedBraces(seg, ws1);
              if (g1) {
                const ws2 = skipSp(seg, g1.endIndex + 1);
                if (seg[ws2] === '{') {
                  const g2 = extractBalancedBraces(seg, ws2);
                  if (g2) {
                    const rawHref = seg.slice(idx, g2.endIndex + 1);
                    out += wrapHtmlWithInlineMod(
                      buildRawTexChipHtml(rawHref, g2.content.trim() || g1.content.trim()),
                      activeMod,
                      colorTable
                    );
                    idx = g2.endIndex + 1;
                    continue;
                  }
                }
              }
            }
          }

          // 1-argument formatting & chip commands
          let wsArg = skipSp(seg, cur);
          let optBrContent = null;
          if (seg[wsArg] === '[' && ['cite', 'includegraphics'].includes(cmd)) {
            const obr = extractBalancedBrackets(seg, wsArg);
            if (obr) {
              optBrContent = obr.content;
              wsArg = skipSp(seg, obr.endIndex + 1);
            }
          }
          if (seg[wsArg] === '{') {
            const grp = extractBalancedBraces(seg, wsArg);
            if (grp) {
              if (cmd === 'textbf') {
                out += wrapHtmlWithInlineMod(`<strong data-v-mark="bold">${evalSeg(grp.content)}</strong>`, activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'textit' || cmd === 'emph' || cmd === 'textsl') {
                out += wrapHtmlWithInlineMod(`<em data-v-mark="italic">${evalSeg(grp.content)}</em>`, activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'underline' || cmd === 'uline' || cmd === 'ul') {
                out += wrapHtmlWithInlineMod(`<u data-v-mark="underline">${evalSeg(grp.content)}</u>`, activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'uwave') {
                out += wrapHtmlWithInlineMod(
                  `<span data-v-mark="uwave" style="text-decoration: underline wavy;">${evalSeg(grp.content)}</span>`,
                  activeMod,
                  colorTable
                );
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'sout' || cmd === 'xout' || cmd === 'st') {
                out += wrapHtmlWithInlineMod(`<s data-v-mark="sout">${evalSeg(grp.content)}</s>`, activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'hl') {
                out += wrapHtmlWithInlineMod(
                  `<mark data-v-mark="hl" style="background: rgba(250, 204, 21, 0.28); color: inherit; padding: 0 3px; border-radius: 2px;">${evalSeg(grp.content)}</mark>`,
                  activeMod,
                  colorTable
                );
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'textsf') {
                out += wrapHtmlWithInlineMod(
                  `<span data-v-font="sans" style="font-family: var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif);">${evalSeg(grp.content)}</span>`,
                  activeMod,
                  colorTable
                );
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'texttt') {
                out += wrapHtmlWithInlineMod(
                  `<code data-v-font="mono" style="font-family: monospace; background: var(--s2); padding: 1px 5px; border-radius: 2px; border: 1px solid var(--s3); font-size: 0.9em;">${evalSeg(grp.content)}</code>`,
                  activeMod,
                  colorTable
                );
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'textsc' || cmd === 'caps') {
                out += wrapHtmlWithInlineMod(
                  `<span data-v-font="smallcaps" style="font-variant: small-caps;">${evalSeg(grp.content)}</span>`,
                  activeMod,
                  colorTable
                );
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'ensuremath') {
                out += wrapHtmlWithInlineMod(buildMathChipHtml(grp.content.trim(), '$', options), activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'eqref' || cmd === 'ref' || (cmd === 'cite' && optBrContent === null)) {
                out += wrapHtmlWithInlineMod(buildRefChipHtml(cmd, grp.content.trim(), options), activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'enquote') {
                out += wrapHtmlWithInlineMod(`"${evalSeg(grp.content)}"`, activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (['textrm', 'textnormal', 'textup', 'textmd', 'mbox', 'hbox', 'text'].includes(cmd)) {
                out += wrapHtmlWithInlineMod(evalSeg(grp.content), activeMod, colorTable);
                idx = grp.endIndex + 1;
                continue;
              }
              if (cmd === 'label') {
                // Labels inside prose are preserved as atomic raw chips so cross-references never break
                const rawLbl = seg.slice(idx, grp.endIndex + 1);
                out += buildRawTexChipHtml(rawLbl, `#${grp.content.trim()}`);
                idx = grp.endIndex + 1;
                continue;
              }
              // Preserve any other 1-arg command (\bai{...}, \footnote{...}, \url{...}, \fbox{...}) losslessly as raw chip
              const rawFull = seg.slice(idx, grp.endIndex + 1);
              out += wrapHtmlWithInlineMod(
                buildRawTexChipHtml(rawFull, grp.content.trim() || `\\${cmd}`),
                activeMod,
                colorTable
              );
              idx = grp.endIndex + 1;
              continue;
            }
          }

          // Zero-arg escaped symbols & spacing commands
          if (cmd === 'newline' || cmd === 'linebreak') {
            out += '<br data-v-br="true" />';
            idx = cur;
            continue;
          }
          if (cmd === 'textbackslash') {
            flushPlain('\\');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (cmd === 'textasciitilde') {
            flushPlain('~');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (cmd === 'textasciicircum') {
            flushPlain('^');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (cmd === 'dots' || cmd === 'ldots') {
            flushPlain('...');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (cmd === 'quad') {
            flushPlain('\u00A0\u00A0\u00A0\u00A0');
            idx = cur;
            continue;
          }
          if (cmd === 'qquad') {
            flushPlain('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0');
            idx = cur;
            continue;
          }
          if (cmd === 'LaTeX') {
            flushPlain('LaTeX');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (cmd === 'TeX') {
            flushPlain('TeX');
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = cur;
            continue;
          }
          if (['noindent', 'indent', 'centering', 'raggedright', 'raggedleft', 'protect', 'relax', 'selectfont'].includes(cmd)) {
            if (seg[cur] === '{' && seg[cur + 1] === '}') cur += 2;
            idx = skipSp(seg, cur);
            continue;
          }

          // Unknown zero-arg command: keep safe raw chip
          const rawZero = seg.slice(idx, cur);
          out += buildRawTexChipHtml(rawZero, rawZero);
          idx = cur;
          continue;
        }

        let nextIdx = idx + 1;
        while (
          nextIdx < seg.length &&
          seg[nextIdx] !== '\\' &&
          seg[nextIdx] !== '{' &&
          seg[nextIdx] !== '}' &&
          seg[nextIdx] !== '~' &&
          seg[nextIdx] !== '\u0002'
        ) {
          nextIdx++;
        }
        flushPlain(seg.slice(idx, nextIdx));
        idx = nextIdx;
      }

      return out;
    };

    return evalSeg(work);
  };

  if (options.singleLine) {
    return convertSinglePara(String(inlineTex).replace(/\r?\n+/g, ' ').trim());
  }

  const paras = splitTopLevelParagraphs(String(inlineTex));
  if (paras.length <= 1) {
    return convertSinglePara(paras[0] || '');
  }
  return paras.map((p) => `<div data-v-para="true">${convertSinglePara(p)}</div>`).join('');
}

function splitTopLevelListItems(listBodyTex) {
  const items = [];
  const matches = [];
  let m;
  let envDepth = 0;

  // Scan top-level \item commands not nested inside inner lists
  const tokenRe = /\\(begin|end)\s*\{([a-zA-Z0-9_*]+)\}|\\item(?![a-zA-Z@])/g;
  while ((m = tokenRe.exec(listBodyTex)) !== null) {
    if (m[1] === 'begin') {
      envDepth++;
    } else if (m[1] === 'end') {
      envDepth = Math.max(0, envDepth - 1);
    } else if (envDepth === 0) {
      let cur = m.index + m[0].length;
      while (cur < listBodyTex.length && /[ \t]/.test(listBodyTex[cur])) cur++;
      let optLabel = '';
      if (listBodyTex[cur] === '[') {
        const obr = extractBalancedBrackets(listBodyTex, cur);
        if (obr) {
          optLabel = obr.content.trim();
          cur = obr.endIndex + 1;
        }
      }
      matches.push({ start: m.index, bodyStart: cur, optLabel });
    }
  }

  if (matches.length === 0) {
    return [{ optLabel: '', body: listBodyTex.trim() }];
  }

  for (let i = 0; i < matches.length; i++) {
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].start : listBodyTex.length;
    items.push({
      optLabel: matches[i].optLabel,
      body: listBodyTex.slice(matches[i].bodyStart, bodyEnd).trim()
    });
  }
  return items;
}

function extractLeadingAndTrailingLabels(texStr) {
  let work = String(texStr ?? '').trim();
  const labels = [];

  let changed = true;
  while (changed) {
    changed = false;
    const leadM = /^\\label\s*\{([^}]*)\}\s*/.exec(work);
    if (leadM) {
      if (leadM[1].trim()) labels.push(leadM[1].trim());
      work = work.slice(leadM[0].length).trim();
      changed = true;
    }
    const tailM = /\s*\\label\s*\{([^}]*)\}$/.exec(work);
    if (tailM) {
      if (tailM[1].trim()) labels.push(tailM[1].trim());
      work = work.slice(0, tailM.index).trim();
      changed = true;
    }
  }
  return { strippedTex: work, labels };
}

export function parseLatexBlockToEditableModel(rawBlockTex, options = {}) {
  let work = String(rawBlockTex ?? '').trim();
  const preservedLabels = [];
  let align = 'left';

  // 1. Peel outer alignment environment (\begin{center}, \begin{flushright}, \begin{flushleft})
  const alignEnvM = /^\\begin\s*\{(center|flushright|flushleft)\}([\s\S]*)\\end\s*\{\1\}$/.exec(work);
  if (alignEnvM) {
    const innerCandidate = alignEnvM[2].trim();
    const nestedSame = new RegExp(`\\\\(?:begin|end)\\s*\\{${alignEnvM[1]}\\}`).test(innerCandidate);
    if (!nestedSame) {
      align = alignEnvM[1] === 'center' ? 'center' : alignEnvM[1] === 'flushright' ? 'right' : 'left';
      work = innerCandidate;
    }
  }

  // 2. Display Math: \[...\], $$...$$, or \begin{equation|align|...}...\end{...}
  if (work.startsWith('\\[') && work.endsWith('\\]')) {
    const innerMath = work.slice(2, -2).trim();
    return {
      blockRole: 'display-math',
      initialBlockRole: 'display-math',
      mathEnv: 'brackets',
      rawMathTex: innerMath,
      editableHtml: '',
      align,
      boxTitle: '',
      originalBoxEnv: '',
      shortTitle: '',
      itemLabel: '',
      listOptions: '',
      preservedLabels,
      preservedOpenTag: '',
      preservedCloseTag: ''
    };
  }
  if (work.startsWith('$$') && work.endsWith('$$') && work.length >= 4) {
    const innerMath = work.slice(2, -2).trim();
    return {
      blockRole: 'display-math',
      initialBlockRole: 'display-math',
      mathEnv: 'dollars',
      rawMathTex: innerMath,
      editableHtml: '',
      align,
      boxTitle: '',
      originalBoxEnv: '',
      shortTitle: '',
      itemLabel: '',
      listOptions: '',
      preservedLabels,
      preservedOpenTag: '',
      preservedCloseTag: ''
    };
  }

  const outerEnvM = /^\\begin\s*\{([a-zA-Z0-9_*]+)\}/.exec(work);
  if (outerEnvM) {
    const envName = outerEnvM[1];
    const escEnv = envName.replace(/\*/g, '\\*');
    const closeRe = new RegExp(`\\\\end\\s*\\{${escEnv}\\}$`);
    const closeM = closeRe.exec(work);
    if (closeM) {
      // Verify this \end{envName} closes the outer \begin{envName} at depth 0
      const tokenRe = new RegExp(`\\\\(begin|end)\\s*\\{${escEnv}\\}`, 'g');
      let depth = 0;
      let wrapsWholeBlock = true;
      let tm;
      while ((tm = tokenRe.exec(work)) !== null) {
        if (tm[1] === 'begin') depth++;
        else depth--;
        if (depth === 0 && tm.index + tm[0].length < work.length) {
          wrapsWholeBlock = false;
          break;
        }
      }

      if (wrapsWholeBlock && depth === 0) {
        if (DISPLAY_MATH_ENV_SET.has(envName)) {
          const innerMath = work.slice(outerEnvM[0].length, closeM.index).trim();
          return {
            blockRole: 'display-math',
            initialBlockRole: 'display-math',
            mathEnv: envName,
            rawMathTex: innerMath,
            editableHtml: '',
            align,
            boxTitle: '',
            originalBoxEnv: '',
            shortTitle: '',
            itemLabel: '',
            listOptions: '',
            preservedLabels,
            preservedOpenTag: '',
            preservedCloseTag: ''
          };
        }

        const baseEnv = envName.replace(/\*$/, '');

        // List environments: itemize / enumerate
        if (baseEnv === 'itemize' || baseEnv === 'enumerate') {
          let cur = outerEnvM[0].length;
          while (cur < closeM.index && /[ \t]/.test(work[cur])) cur++;
          let listOptions = '';
          if (work[cur] === '[') {
            const obr = extractBalancedBrackets(work, cur);
            if (obr && obr.endIndex < closeM.index) {
              listOptions = obr.content.trim();
              cur = obr.endIndex + 1;
            }
          }
          const listBody = work.slice(cur, closeM.index).trim();
          const parsedItems = splitTopLevelListItems(listBody);
          const editableHtml = parsedItems
            .map((it) => {
              const labelAttr = it.optLabel ? ` data-v-item-label="${escapeHtml(it.optLabel)}"` : '';
              return `<div data-v-list-item="true"${labelAttr}>${inlineLatexToEditableHtml(it.body, {
                ...options,
                singleLine: true
              })}</div>`;
            })
            .join('');
          return {
            blockRole: baseEnv,
            initialBlockRole: baseEnv,
            mathEnv: '',
            rawMathTex: '',
            editableHtml,
            align,
            boxTitle: '',
            originalBoxEnv: '',
            shortTitle: '',
            itemLabel: '',
            listOptions,
            preservedLabels,
            preservedOpenTag: '',
            preservedCloseTag: ''
          };
        }

        // Quote / quotation
        if (baseEnv === 'quote' || baseEnv === 'quotation') {
          const innerQuote = work.slice(outerEnvM[0].length, closeM.index).trim();
          const { strippedTex, labels } = extractLeadingAndTrailingLabels(innerQuote);
          preservedLabels.push(...labels);
          return {
            blockRole: 'quote',
            initialBlockRole: 'quote',
            mathEnv: '',
            rawMathTex: '',
            editableHtml: inlineLatexToEditableHtml(strippedTex, options),
            align,
            boxTitle: '',
            originalBoxEnv: envName,
            shortTitle: '',
            itemLabel: '',
            listOptions: '',
            preservedLabels,
            preservedOpenTag: '',
            preservedCloseTag: ''
          };
        }

        // Academic Box (standard dn/dl/tc/vd/nx/note/bt/sol or custom mapped box)
        const customEnvInfo = options?.customEnvs?.get?.(baseEnv) || null;
        const canonicalBox =
          BOX_ALIAS_TO_CANONICAL[baseEnv] ||
          (customEnvInfo?.canonicalEnv ? BOX_ALIAS_TO_CANONICAL[customEnvInfo.canonicalEnv] : null);

        if (canonicalBox) {
          let cur = outerEnvM[0].length;
          while (cur < closeM.index && /[ \t]/.test(work[cur])) cur++;
          let boxTitle = '';
          let titleMode = 'bracket';
          if (work[cur] === '[') {
            const obr = extractBalancedBrackets(work, cur);
            if (obr && obr.endIndex < closeM.index) {
              boxTitle = obr.content.trim();
              cur = obr.endIndex + 1;
            }
          } else if (work[cur] === '{') {
            const bgr = extractBalancedBraces(work, cur);
            if (bgr && bgr.endIndex < closeM.index && !bgr.content.includes('\n')) {
              boxTitle = bgr.content.trim();
              titleMode = 'brace';
              cur = bgr.endIndex + 1;
            }
          }
          const rawBody = work.slice(cur, closeM.index).trim();
          const { strippedTex, labels } = extractLeadingAndTrailingLabels(rawBody);
          preservedLabels.push(...labels);
          const role = `box:${canonicalBox}`;
          return {
            blockRole: role,
            initialBlockRole: role,
            mathEnv: '',
            rawMathTex: '',
            editableHtml: inlineLatexToEditableHtml(strippedTex, options),
            align,
            boxTitle,
            boxTitleMode: titleMode,
            originalBoxEnv: envName,
            shortTitle: '',
            itemLabel: '',
            listOptions: '',
            preservedLabels,
            preservedOpenTag: '',
            preservedCloseTag: ''
          };
        }

        // Other single-env wrapper (e.g. tcolorbox, proof) -> preserve exact opener & closer
        let cur = outerEnvM[0].length;
        while (cur < closeM.index && /[ \t]/.test(work[cur])) cur++;
        if (work[cur] === '[') {
          const obr = extractBalancedBrackets(work, cur);
          if (obr && obr.endIndex < closeM.index) cur = obr.endIndex + 1;
        }
        const preservedOpenTag = work.slice(0, cur);
        const preservedCloseTag = work.slice(closeM.index);
        const innerEnvBody = work.slice(cur, closeM.index).trim();
        const { strippedTex, labels } = extractLeadingAndTrailingLabels(innerEnvBody);
        preservedLabels.push(...labels);
        return {
          blockRole: 'preserved-env',
          initialBlockRole: 'preserved-env',
          mathEnv: '',
          rawMathTex: '',
          editableHtml: inlineLatexToEditableHtml(strippedTex, options),
          align,
          boxTitle: '',
          originalBoxEnv: envName,
          shortTitle: '',
          itemLabel: '',
          listOptions: '',
          preservedLabels,
          preservedOpenTag,
          preservedCloseTag
        };
      }
    }
  }

  // 3. Heading command (\chapter, \section, \subsection, \subsubsection, \part)
  const headingM = /^\\(part|chapter|section|subsection|subsubsection)(\*)?\s*/.exec(work);
  if (headingM) {
    const cmdBase = headingM[1];
    const isStar = Boolean(headingM[2]);
    let cur = headingM[0].length;
    let shortTitle = '';
    if (work[cur] === '[') {
      const obr = extractBalancedBrackets(work, cur);
      if (obr) {
        shortTitle = obr.content.trim();
        cur = obr.endIndex + 1;
        while (cur < work.length && /\s/.test(work[cur])) cur++;
      }
    }
    if (work[cur] === '{') {
      const tGrp = extractBalancedBraces(work, cur);
      if (tGrp) {
        const tail = work.slice(tGrp.endIndex + 1).trim();
        const { strippedTex: remTail, labels: tailLabels } = extractLeadingAndTrailingLabels(tail);
        if (!remTail) {
          const { strippedTex: cleanTitleTex, labels: innerLabels } = extractLeadingAndTrailingLabels(tGrp.content);
          preservedLabels.push(...innerLabels, ...tailLabels);
          const role = cmdBase === 'part' ? (isStar ? 'section*' : 'section') : `${cmdBase}${isStar ? '*' : ''}`;
          return {
            blockRole: role,
            initialBlockRole: role,
            originalHeadingCmd: cmdBase === 'part' ? `part${isStar ? '*' : ''}` : '',
            mathEnv: '',
            rawMathTex: '',
            editableHtml: inlineLatexToEditableHtml(cleanTitleTex, { ...options, singleLine: true }),
            align,
            boxTitle: '',
            originalBoxEnv: '',
            shortTitle,
            itemLabel: '',
            listOptions: '',
            preservedLabels,
            preservedOpenTag: '',
            preservedCloseTag: ''
          };
        }
      }
    }
  }

  // 4. Single list item (\item[...] ...)
  const itemM = /^\\item(?![a-zA-Z@])[ \t]*/.exec(work);
  if (itemM) {
    let cur = itemM[0].length;
    let itemLabel = '';
    if (work[cur] === '[') {
      const obr = extractBalancedBrackets(work, cur);
      if (obr) {
        itemLabel = obr.content.trim();
        cur = obr.endIndex + 1;
      }
    }
    const itemBody = work.slice(cur).trim();
    const { strippedTex, labels } = extractLeadingAndTrailingLabels(itemBody);
    preservedLabels.push(...labels);
    return {
      blockRole: 'list-item',
      initialBlockRole: 'list-item',
      mathEnv: '',
      rawMathTex: '',
      editableHtml: inlineLatexToEditableHtml(strippedTex, options),
      align,
      boxTitle: '',
      originalBoxEnv: '',
      shortTitle: '',
      itemLabel,
      listOptions: '',
      preservedLabels,
      preservedOpenTag: '',
      preservedCloseTag: ''
    };
  }

  // 5. Default Paragraph
  const { strippedTex, labels } = extractLeadingAndTrailingLabels(work);
  preservedLabels.push(...labels);
  return {
    blockRole: 'paragraph',
    initialBlockRole: 'paragraph',
    mathEnv: '',
    rawMathTex: '',
    editableHtml: inlineLatexToEditableHtml(strippedTex, options),
    align,
    boxTitle: '',
    originalBoxEnv: '',
    shortTitle: '',
    itemLabel: '',
    listOptions: '',
    preservedLabels,
    preservedOpenTag: '',
    preservedCloseTag: ''
  };
}

// Lightweight HTML string -> VNode tree parser for deterministic Node.js unit tests & fallback
function parseHtmlStringToVNode(htmlStr) {
  const root = { type: 'element', tag: 'div', attrs: {}, children: [] };
  const stack = [root];
  const tagRe = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)([^>]*?)(\/?)>/g;
  const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

  let lastIdx = 0;
  let m;
  while ((m = tagRe.exec(htmlStr)) !== null) {
    if (m.index > lastIdx) {
      const rawTxt = unescapeHtmlEntities(htmlStr.slice(lastIdx, m.index));
      if (rawTxt) stack[stack.length - 1].children.push({ type: 'text', text: rawTxt });
    }
    lastIdx = m.index + m[0].length;
    if (m[0].startsWith('<!--')) continue;

    if (m[1]) {
      const closeTag = m[1].toLowerCase();
      for (let k = stack.length - 1; k >= 1; k--) {
        if (stack[k].tag === closeTag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }

    const openTag = m[2].toLowerCase();
    const attrStr = m[3] || '';
    const selfClose = Boolean(m[4]) || voidTags.has(openTag);
    const attrs = {};
    const attrRe = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let am;
    while ((am = attrRe.exec(attrStr)) !== null) {
      attrs[am[1].toLowerCase()] = unescapeHtmlEntities(am[2] ?? am[3] ?? am[4] ?? '');
    }
    const el = { type: 'element', tag: openTag, attrs, children: [] };
    stack[stack.length - 1].children.push(el);
    if (!selfClose) stack.push(el);
  }
  if (lastIdx < htmlStr.length) {
    const tailTxt = unescapeHtmlEntities(htmlStr.slice(lastIdx));
    if (tailTxt) stack[stack.length - 1].children.push({ type: 'text', text: tailTxt });
  }
  return root;
}

function domNodeToVNode(domNode) {
  if (!domNode) return null;
  if (domNode.nodeType === 3) {
    return { type: 'text', text: domNode.nodeValue || '' };
  }
  if (domNode.nodeType !== 1) return null;
  const tag = (domNode.tagName || 'div').toLowerCase();
  const attrs = {};
  if (domNode.attributes) {
    for (let i = 0; i < domNode.attributes.length; i++) {
      const a = domNode.attributes[i];
      attrs[a.name.toLowerCase()] = a.value;
    }
  }
  const children = [];
  if (domNode.childNodes) {
    for (let i = 0; i < domNode.childNodes.length; i++) {
      const c = domNodeToVNode(domNode.childNodes[i]);
      if (c) children.push(c);
    }
  }
  return { type: 'element', tag, attrs, children };
}

function rgbCssToHexIfPossible(cssCol) {
  const s = String(cssCol ?? '').trim();
  if (!s) return '';
  if (s.startsWith('#')) return s.toLowerCase();
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (!m) return '';
  const toH = (n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
  return `#${toH(m[1])}${toH(m[2])}${toH(m[3])}`;
}

function deriveChildMarks(el, inherited) {
  const next = { ...inherited };
  const tag = el.tag;
  const attrs = el.attrs || {};
  const style = attrs.style || '';

  if (tag === 'strong' || tag === 'b' || attrs['data-v-mark'] === 'bold') next.bold = true;
  if (attrs['data-v-mark'] === 'nobold') next.bold = false;
  if (tag === 'em' || tag === 'i' || attrs['data-v-mark'] === 'italic') next.italic = true;
  if (tag === 'u' || attrs['data-v-mark'] === 'underline') next.underline = true;
  if (attrs['data-v-mark'] === 'uwave') next.uwave = true;
  if (tag === 's' || tag === 'strike' || tag === 'del' || attrs['data-v-mark'] === 'sout') next.sout = true;
  if (tag === 'mark' || attrs['data-v-mark'] === 'hl') next.hl = true;
  if (tag === 'code' || attrs['data-v-font'] === 'mono') next.font = 'mono';
  if (attrs['data-v-font'] === 'sans') next.font = 'sans';
  if (attrs['data-v-font'] === 'smallcaps') next.font = 'smallcaps';
  if (attrs['data-v-font'] === 'serif') next.font = null;

  if (attrs['data-v-size']) {
    next.size = attrs['data-v-size'] === 'normalsize' ? null : attrs['data-v-size'];
  }
  if (attrs['data-v-color'] !== undefined) {
    next.color = attrs['data-v-color'] || null;
  } else if (style) {
    const colM = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    if (colM) {
      const hex = rgbCssToHexIfPossible(colM[1]);
      if (hex) next.color = hex;
    }
  }
  if (style) {
    if (/font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style)) next.bold = true;
    if (/font-style\s*:\s*italic/i.test(style)) next.italic = true;
    if (/text-decoration[^;]*wavy/i.test(style)) next.uwave = true;
    else if (/text-decoration[^;]*underline/i.test(style)) next.underline = true;
    if (/text-decoration[^;]*line-through/i.test(style)) next.sout = true;
    if (/font-variant\s*:\s*small-caps/i.test(style)) next.font = 'smallcaps';
  }
  return next;
}

function marksSignature(m) {
  return `${m.size || ''}|${m.color || ''}|${m.hl ? 1 : 0}|${m.font || ''}|${m.bold ? 1 : 0}|${m.italic ? 1 : 0}|${m.uwave ? 2 : m.underline ? 1 : 0}|${m.sout ? 1 : 0}`;
}

function hasAnyActiveMark(m) {
  return Boolean(m.size || m.color || m.hl || m.font || m.bold || m.italic || m.underline || m.uwave || m.sout);
}

function wrapLatexRunWithMarks(innerLatex, m) {
  if (!innerLatex) return '';
  if (!hasAnyActiveMark(m)) return innerLatex;

  // Hoist pure leading/trailing ASCII spaces outside inline command wrappers so underlines/highlights stay tight
  const leadSp = /^[ ]+/.exec(innerLatex)?.[0] || '';
  const trailSp = /[ ]+$/.exec(innerLatex.slice(leadSp.length))?.[0] || '';
  const core = innerLatex.slice(leadSp.length, innerLatex.length - trailSp.length);
  if (!core) return innerLatex;

  let res = core;
  if (m.sout) res = `\\sout{${res}}`;
  if (m.uwave) res = `\\uwave{${res}}`;
  else if (m.underline) res = `\\underline{${res}}`;
  if (m.italic) res = `\\textit{${res}}`;
  if (m.bold) res = `\\textbf{${res}}`;
  if (m.font === 'sans') res = `\\textsf{${res}}`;
  else if (m.font === 'mono') res = `\\texttt{${res}}`;
  else if (m.font === 'smallcaps') res = `\\textsc{${res}}`;
  if (m.hl) res = `\\hl{${res}}`;
  if (m.color) res = `\\textcolor{${m.color}}{${res}}`;
  if (m.size && m.size !== 'normalsize') res = `{\\${m.size} ${res}}`;

  return `${leadSp}${res}${trailSp}`;
}

function serializeInlineVNodesToLatex(vnodes) {
  const runs = [];

  const walk = (node, marks) => {
    if (!node) return;
    if (node.type === 'text') {
      const cleaned = String(node.text ?? '').replace(/[\u200B\uFEFF]/g, '');
      if (!cleaned) return;
      runs.push({ kind: 'content', latex: escapePlainTextForLatex(cleaned), marks });
      return;
    }
    if (node.type !== 'element') return;

    const tag = node.tag;
    const attrs = node.attrs || {};

    if (tag === 'br') {
      runs.push({ kind: 'br' });
      return;
    }

    const chipType = attrs['data-v-chip'];
    if (chipType === 'math') {
      const texCode = String(attrs['data-v-tex'] ?? '').trim();
      if (!texCode) return;
      const delim = attrs['data-v-delim'] || '$';
      const wrappedMath =
        delim === '\\('
          ? `\\(${texCode}\\)`
          : delim === '\\['
            ? `\\[${texCode}\\]`
            : delim === '$$'
              ? `$$${texCode}$$`
              : `$${texCode}$`;
      runs.push({ kind: 'content', latex: wrappedMath, marks });
      return;
    }
    if (chipType === 'ref') {
      const cmd = attrs['data-v-cmd'] || 'ref';
      const arg = String(attrs['data-v-arg'] ?? '').trim();
      if (arg) {
        runs.push({ kind: 'content', latex: `\\${cmd}{${arg}}`, marks });
      }
      return;
    }
    if (chipType === 'raw') {
      const rawTex = String(attrs['data-v-tex'] ?? '');
      if (rawTex) {
        runs.push({ kind: 'content', latex: rawTex, marks });
      }
      return;
    }

    const nextMarks = deriveChildMarks(node, marks);
    for (const child of node.children || []) {
      walk(child, nextMarks);
    }
  };

  const baseMarks = createEmptyInlineMod();
  for (const vn of vnodes) {
    walk(vn, baseMarks);
  }

  // Merge adjacent content runs that share identical formatting marks
  const merged = [];
  for (const r of runs) {
    if (r.kind === 'br') {
      merged.push(r);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === 'content' && marksSignature(prev.marks) === marksSignature(r.marks)) {
      prev.latex += r.latex;
    } else {
      merged.push({ ...r });
    }
  }

  let out = '';
  for (let i = 0; i < merged.length; i++) {
    const item = merged[i];
    if (item.kind === 'br') {
      // Avoid trailing orphan \\ at the very end of a paragraph (browsers often insert trailing <br> in contenteditable)
      const hasMoreContent = merged.slice(i + 1).some((x) => x.kind === 'content' && x.latex.trim());
      if (hasMoreContent) {
        out = out.replace(/[ \t]+$/, '') + ' \\\\\n';
      }
    } else {
      out += wrapLatexRunWithMarks(item.latex, item.marks);
    }
  }

  return out.replace(/[ \t]+\n/g, '\n').trim();
}

function extractParagraphBlocksFromRootVNode(rootVNode) {
  const blockTags = new Set(['div', 'p', 'li']);
  const paragraphs = [];
  let inlineAcc = [];

  const flushInline = () => {
    if (inlineAcc.length > 0) {
      const ser = serializeInlineVNodesToLatex(inlineAcc);
      if (ser) paragraphs.push({ latex: ser, itemLabel: '' });
      inlineAcc = [];
    }
  };

  for (const child of rootVNode.children || []) {
    if (
      child.type === 'element' &&
      (blockTags.has(child.tag) ||
        child.attrs?.['data-v-para'] === 'true' ||
        child.attrs?.['data-v-list-item'] === 'true')
    ) {
      flushInline();
      const itemLabel = child.attrs?.['data-v-item-label'] || '';
      const ser = serializeInlineVNodesToLatex(child.children || []);
      if (ser || child.attrs?.['data-v-list-item'] === 'true') {
        paragraphs.push({ latex: ser, itemLabel });
      }
    } else {
      inlineAcc.push(child);
    }
  }
  flushInline();
  return paragraphs;
}

export function serializeEditableDomToLatex(rootOrHtml, blockModel = {}) {
  const role = blockModel.blockRole || 'paragraph';
  const align = blockModel.align || 'left';
  const preservedLabels = Array.isArray(blockModel.preservedLabels) ? blockModel.preservedLabels.filter(Boolean) : [];
  const labelsTex = preservedLabels.map((l) => `\\label{${l}}`).join('');

  // Display Math dedicated mode
  if (role === 'display-math') {
    const rawMath = String(blockModel.rawMathTex ?? '').trim();
    const mathEnv = blockModel.mathEnv || 'brackets';
    const hasExistingLabel = /\\label\s*\{/.test(rawMath);
    const mathWithLabels = !hasExistingLabel && labelsTex ? `${labelsTex}\n${rawMath}` : rawMath;

    if (mathEnv === 'dollars') {
      return `$$\n${mathWithLabels}\n$$`;
    }
    if (mathEnv && mathEnv !== 'brackets' && DISPLAY_MATH_ENV_SET.has(mathEnv)) {
      return `\\begin{${mathEnv}}\n${mathWithLabels}\n\\end{${mathEnv}}`;
    }
    return `\\[\n${mathWithLabels}\n\\]`;
  }

  const rootVNode =
    typeof rootOrHtml === 'string' ? parseHtmlStringToVNode(rootOrHtml) : domNodeToVNode(rootOrHtml);
  const paraBlocks = rootVNode ? extractParagraphBlocksFromRootVNode(rootVNode) : [];

  const wrapAlignmentIfNeeded = (texBody) => {
    if (!texBody) return texBody;
    if (align === 'center') return `\\begin{center}\n${texBody}\n\\end{center}`;
    if (align === 'right') return `\\begin{flushright}\n${texBody}\n\\end{flushright}`;
    return texBody;
  };

  // Headings (\chapter, \chapter*, \section, \section*, \subsection, \subsection*, \subsubsection, \subsubsection*)
  if (
    ['chapter', 'chapter*', 'section', 'section*', 'subsection', 'subsection*', 'subsubsection', 'subsubsection*'].includes(
      role
    )
  ) {
    const singleLineTitle = paraBlocks
      .map((p) => p.latex.replace(/\s*\\\\\s*/g, ' ').trim())
      .filter(Boolean)
      .join(' ');
    const isStar = role.endsWith('*');
    const effectiveCmd =
      role === blockModel.initialBlockRole && blockModel.originalHeadingCmd
        ? blockModel.originalHeadingCmd
        : role;
    // Starred headings in LaTeX MUST NOT carry [shortTitle] optional brackets!
    const shortOpt = !isStar && blockModel.shortTitle ? `[${blockModel.shortTitle}]` : '';
    const suffixLbl = labelsTex ? `\n${labelsTex}` : '';
    return `\\${effectiveCmd}${shortOpt}{${singleLineTitle}}${suffixLbl}`;
  }

  // Full List (itemize / enumerate)
  if (role === 'itemize' || role === 'enumerate') {
    const items = paraBlocks.filter((p) => p.latex.trim().length > 0);
    const listOpt =
      role === blockModel.initialBlockRole && blockModel.listOptions ? `[${blockModel.listOptions}]` : '';
    const itemsTex =
      items.length > 0
        ? items
            .map((it) => {
              const lbl = it.itemLabel ? `[${it.itemLabel}]` : '';
              return `  \\item${lbl} ${it.latex.trim()}`;
            })
            .join('\n')
        : '  \\item ';
    return wrapAlignmentIfNeeded(`\\begin{${role}}${listOpt}\n${itemsTex}\n\\end{${role}}`);
  }

  // Single List Item (\item ...)
  if (role === 'list-item') {
    const bodyJoined = paraBlocks.map((p) => p.latex).filter(Boolean).join('\n\n');
    const optLbl = blockModel.itemLabel ? `[${blockModel.itemLabel.trim()}]` : '';
    const lblPrefix = labelsTex ? `${labelsTex} ` : '';
    return `\\item${optLbl} ${lblPrefix}${bodyJoined}`.trim();
  }

  // Academic Box (box:dn, box:dl, box:tc, box:vd, box:nx, box:note, box:bt, box:sol)
  if (role.startsWith('box:')) {
    const canonEnv = role.slice(4);
    const envName =
      role === blockModel.initialBlockRole && blockModel.originalBoxEnv
        ? blockModel.originalBoxEnv
        : canonEnv;
    const rawBoxTitle = String(blockModel.boxTitle ?? '').trim();
    const titleOpt = rawBoxTitle
      ? blockModel.boxTitleMode === 'brace' && envName === blockModel.originalBoxEnv
        ? `{${rawBoxTitle}}`
        : `[${rawBoxTitle}]`
      : '';
    const bodyJoined = paraBlocks.map((p) => p.latex).filter(Boolean).join('\n\n');
    const innerWithLabels = labelsTex ? `${labelsTex}\n${bodyJoined}` : bodyJoined;
    return wrapAlignmentIfNeeded(`\\begin{${envName}}${titleOpt}\n${innerWithLabels}\n\\end{${envName}}`);
  }

  // Quote
  if (role === 'quote') {
    const envName =
      role === blockModel.initialBlockRole && blockModel.originalBoxEnv ? blockModel.originalBoxEnv : 'quote';
    const bodyJoined = paraBlocks.map((p) => p.latex).filter(Boolean).join('\n\n');
    const innerWithLabels = labelsTex ? `${labelsTex}\n${bodyJoined}` : bodyJoined;
    return wrapAlignmentIfNeeded(`\\begin{${envName}}\n${innerWithLabels}\n\\end{${envName}}`);
  }

  // Preserved custom environment (tcolorbox, proof, etc.)
  if (role === 'preserved-env' && blockModel.preservedOpenTag && blockModel.preservedCloseTag) {
    const bodyJoined = paraBlocks.map((p) => p.latex).filter(Boolean).join('\n\n');
    const innerWithLabels = labelsTex ? `${labelsTex}\n${bodyJoined}` : bodyJoined;
    return wrapAlignmentIfNeeded(`${blockModel.preservedOpenTag}\n${innerWithLabels}\n${blockModel.preservedCloseTag}`);
  }

  // Standard Paragraph(s)
  const bodyJoined = paraBlocks.map((p) => p.latex).filter(Boolean).join('\n\n');
  const withLabels = labelsTex ? `${bodyJoined} ${labelsTex}`.trim() : bodyJoined;
  return wrapAlignmentIfNeeded(withLabels);
}

export function validateSerializedLatexBlock(texStr) {
  const s = String(texStr ?? '');
  let braceDepth = 0;
  let dollarCount = 0;
  const envStack = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (ch === '%') {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (ch === '\\') {
      const envM = /^\\(begin|end)\s*\{([a-zA-Z0-9_*]+)\}/.exec(s.slice(i));
      if (envM) {
        if (envM[1] === 'begin') {
          envStack.push(envM[2]);
        } else {
          const top = envStack.pop();
          if (top !== envM[2]) {
            return {
              valid: false,
              error: `Môi trường LaTeX không khớp: gặp \\end{${envM[2]}} khi đang mở ${top ? `\\begin{${top}}` : 'ngoài môi trường'}.`
            };
          }
        }
        i += envM[0].length;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === '{') braceDepth++;
    else if (ch === '}') {
      braceDepth--;
      if (braceDepth < 0) {
        return { valid: false, error: 'Dư dấu ngoặc nhọn đóng "}" chưa được thoát hiểm.' };
      }
    } else if (ch === '$') {
      if (s[i + 1] === '$') {
        i += 2;
        continue;
      }
      dollarCount++;
    }
    i++;
  }

  if (braceDepth !== 0) {
    return { valid: false, error: 'Số lượng ngoặc nhọn "{" và "}" không cân bằng.' };
  }
  if (envStack.length > 0) {
    return { valid: false, error: `Môi trường \\begin{${envStack[envStack.length - 1]}} chưa có lệnh \\end tương ứng.` };
  }
  if (dollarCount % 2 !== 0) {
    return { valid: false, error: 'Dấu "$" bao quanh công thức toán chưa cân bằng chẵn lẻ.' };
  }
  return { valid: true, error: '' };
}

export function sanitizePastedContentToHtml(plainText, htmlText = '', options = {}) {
  // Prefer clean plain text or stripped semantic HTML so Word/Docs background & Calibri CSS never pollute dark/light paper
  let sourceText = String(plainText ?? '');
  if (!sourceText && htmlText) {
    sourceText = unescapeHtmlEntities(
      String(htmlText)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
    );
  }
  sourceText = sourceText.replace(/\r\n/g, '\n').replace(/[\u2014\u2013]/g, '-');
  if (!sourceText) return '';

  // Recognize inline $...$ formulas inside pasted text and turn them into live Atomic KaTeX Chips; plain prose stays safe!
  const lines = sourceText.split('\n');
  const htmlLines = lines.map((line) => {
    let out = '';
    const mathRe = /\$([^$\n]+?)\$/g;
    let last = 0;
    let m;
    while ((m = mathRe.exec(line)) !== null) {
      if (m.index > last) {
        out += escapeHtml(line.slice(last, m.index));
      }
      out += buildMathChipHtml(m[1].trim(), '$', options);
      last = m.index + m[0].length;
    }
    if (last < line.length) {
      out += escapeHtml(line.slice(last));
    }
    return out;
  });

  return htmlLines.join('<br data-v-br="true" />');
}

// Read active marks at the current browser Selection inside editorEl so toolbar buttons/dropdowns stay synced
export function readActiveMarksAtSelection(editorEl) {
  const state = {
    font: 'serif',
    size: 'normalsize',
    color: '',
    bold: false,
    italic: false,
    underline: false,
    uwave: false,
    sout: false,
    hl: false
  };
  if (typeof window === 'undefined' || !editorEl) return state;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return state;
  let node = sel.anchorNode;
  if (!node || !editorEl.contains(node)) return state;
  if (node.nodeType === 3) node = node.parentElement;

  let foundFont = false;
  let foundSize = false;
  let foundColor = false;

  while (node && node !== editorEl) {
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      const mark = node.getAttribute('data-v-mark');
      const vFont = node.getAttribute('data-v-font');
      const vSize = node.getAttribute('data-v-size');
      const vColor = node.getAttribute('data-v-color');

      if (tag === 'strong' || tag === 'b' || mark === 'bold') state.bold = true;
      if (tag === 'em' || tag === 'i' || mark === 'italic') state.italic = true;
      if (tag === 'u' || mark === 'underline') state.underline = true;
      if (mark === 'uwave') state.uwave = true;
      if (tag === 's' || mark === 'sout') state.sout = true;
      if (tag === 'mark' || mark === 'hl') state.hl = true;

      if (!foundFont && (vFont || tag === 'code')) {
        state.font = vFont || 'mono';
        foundFont = true;
      }
      if (!foundSize && vSize) {
        state.size = vSize;
        foundSize = true;
      }
      if (!foundColor && vColor !== null) {
        state.color = vColor;
        foundColor = true;
      }
    }
    node = node.parentElement;
  }
  return state;
}

function createWrapperElementForSpec(doc, spec) {
  const { kind, value } = spec;
  if (kind === 'bold') {
    if (value === false) {
      const sp = doc.createElement('span');
      sp.setAttribute('data-v-mark', 'nobold');
      sp.style.fontWeight = '400';
      return sp;
    }
    const el = doc.createElement('strong');
    el.setAttribute('data-v-mark', 'bold');
    return el;
  }
  if (kind === 'italic') {
    const el = doc.createElement('em');
    el.setAttribute('data-v-mark', 'italic');
    return el;
  }
  if (kind === 'underline') {
    const el = doc.createElement('u');
    el.setAttribute('data-v-mark', 'underline');
    return el;
  }
  if (kind === 'uwave') {
    const el = doc.createElement('span');
    el.setAttribute('data-v-mark', 'uwave');
    el.style.textDecoration = 'underline wavy';
    return el;
  }
  if (kind === 'sout') {
    const el = doc.createElement('s');
    el.setAttribute('data-v-mark', 'sout');
    return el;
  }
  if (kind === 'hl') {
    const el = doc.createElement('mark');
    el.setAttribute('data-v-mark', 'hl');
    el.style.background = 'rgba(250, 204, 21, 0.28)';
    el.style.color = 'inherit';
    el.style.padding = '0 3px';
    el.style.borderRadius = '2px';
    return el;
  }
  if (kind === 'font') {
    if (!value || value === 'serif') {
      const el = doc.createElement('span');
      el.setAttribute('data-v-font', 'serif');
      el.style.fontFamily = "var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif)";
      el.style.fontVariant = 'normal';
      return el;
    }
    if (value === 'mono') {
      const el = doc.createElement('code');
      el.setAttribute('data-v-font', 'mono');
      el.style.fontFamily = 'monospace';
      el.style.background = 'var(--s2)';
      el.style.padding = '1px 5px';
      el.style.borderRadius = '2px';
      el.style.border = '1px solid var(--s3)';
      el.style.fontSize = '0.9em';
      return el;
    }
    const el = doc.createElement('span');
    el.setAttribute('data-v-font', value);
    if (value === 'sans') {
      el.style.fontFamily = "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)";
    } else if (value === 'smallcaps') {
      el.style.fontVariant = 'small-caps';
    }
    return el;
  }
  if (kind === 'size') {
    const el = doc.createElement('span');
    const sz = value || 'normalsize';
    el.setAttribute('data-v-size', sz);
    el.style.fontSize = ALL_LATEX_SIZE_CSS_MAP[sz] || '1em';
    return el;
  }
  if (kind === 'color') {
    const el = doc.createElement('span');
    el.setAttribute('data-v-color', value || '');
    el.style.color = value || 'var(--s12)';
    return el;
  }
  return doc.createElement('span');
}

function stripConflictingDescendants(containerEl, kind) {
  if (!containerEl || !containerEl.querySelectorAll) return;
  let selector = '';
  if (kind === 'bold') selector = 'strong, b, [data-v-mark="bold"]';
  else if (kind === 'italic') selector = 'em, i, [data-v-mark="italic"]';
  else if (kind === 'underline') selector = 'u, [data-v-mark="underline"]';
  else if (kind === 'uwave') selector = '[data-v-mark="uwave"]';
  else if (kind === 'sout') selector = 's, strike, del, [data-v-mark="sout"]';
  else if (kind === 'hl') selector = 'mark, [data-v-mark="hl"]';
  else if (kind === 'font') selector = 'code[data-v-font], [data-v-font]';
  else if (kind === 'size') selector = '[data-v-size]';
  else if (kind === 'color') selector = '[data-v-color]';

  if (!selector) return;
  const matches = Array.from(containerEl.querySelectorAll(selector));
  for (const el of matches) {
    if (el.getAttribute('data-v-chip')) continue;
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  }
}

function unwrapMatchingAncestorIfFullMatch(node, editorEl, kind) {
  let cur = node;
  while (cur && cur !== editorEl) {
    if (cur.nodeType === 1) {
      const tag = cur.tagName.toLowerCase();
      const mark = cur.getAttribute('data-v-mark');
      const isMatch =
        (kind === 'bold' && (tag === 'strong' || tag === 'b' || mark === 'bold')) ||
        (kind === 'italic' && (tag === 'em' || tag === 'i' || mark === 'italic')) ||
        (kind === 'underline' && (tag === 'u' || mark === 'underline')) ||
        (kind === 'uwave' && mark === 'uwave') ||
        (kind === 'sout' && (tag === 's' || mark === 'sout')) ||
        (kind === 'hl' && (tag === 'mark' || mark === 'hl'));
      if (isMatch) return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

// Apply inline formatting mark/size/font/color to either a selected range OR a collapsed cursor ("pick size/font then type"!)
export function applyFormatSpecToEditorSelection(editorEl, spec, savedRange = null) {
  if (typeof window === 'undefined' || !editorEl) return null;
  const doc = editorEl.ownerDocument || document;
  const sel = window.getSelection();
  if (!sel) return null;

  editorEl.focus();
  let range = null;
  if (sel.rangeCount > 0 && editorEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0);
  } else if (savedRange && editorEl.contains(savedRange.commonAncestorContainer)) {
    range = savedRange.cloneRange();
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    range = doc.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Move range outside atomic chip if caret accidentally landed inside chip
  let startAnc = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
  const chipAnc = startAnc?.closest?.('[data-v-chip]');
  if (chipAnc && editorEl.contains(chipAnc)) {
    range = doc.createRange();
    range.setStartAfter(chipAnc);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const toggleKinds = new Set(['bold', 'italic', 'underline', 'uwave', 'sout', 'hl']);
  const currentActive = readActiveMarksAtSelection(editorEl);
  const isToggleOff = toggleKinds.has(spec.kind) && Boolean(currentActive[spec.kind]);

  // CASE A: Collapsed Caret -> "Pick size/font/color/bold first, then type!"
  if (range.collapsed) {
    if (isToggleOff) {
      const ancToBreak = unwrapMatchingAncestorIfFullMatch(range.startContainer, editorEl, spec.kind);
      if (ancToBreak && ancToBreak.parentNode) {
        const afterSpan = doc.createTextNode('\u200B');
        ancToBreak.parentNode.insertBefore(afterSpan, ancToBreak.nextSibling);
        const nextR = doc.createRange();
        nextR.setStart(afterSpan, 1);
        nextR.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextR);
        return nextR.cloneRange();
      }
    }

    const wrapper = createWrapperElementForSpec(doc, spec);
    const zwsp = doc.createTextNode('\u200B');
    wrapper.appendChild(zwsp);
    range.insertNode(wrapper);

    const caretRange = doc.createRange();
    caretRange.setStart(zwsp, 1);
    caretRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caretRange);
    return caretRange.cloneRange();
  }

  // CASE B: Non-collapsed Selection
  if (isToggleOff) {
    const matchedAnc = unwrapMatchingAncestorIfFullMatch(range.commonAncestorContainer, editorEl, spec.kind);
    if (matchedAnc && matchedAnc.parentNode) {
      const selectedFrag = range.extractContents();
      stripConflictingDescendants(selectedFrag, spec.kind);

      // Split matchedAnc at the current range position if matchedAnc still has before/after content
      const afterRange = doc.createRange();
      afterRange.setStart(range.startContainer, range.startOffset);
      afterRange.setEndAfter(matchedAnc.lastChild || matchedAnc);
      const afterFrag = afterRange.extractContents();

      const parent = matchedAnc.parentNode;
      const refNext = matchedAnc.nextSibling;

      const midMarkerStart = doc.createTextNode('');
      const midMarkerEnd = doc.createTextNode('');
      parent.insertBefore(midMarkerStart, refNext);
      parent.insertBefore(selectedFrag, refNext);
      parent.insertBefore(midMarkerEnd, refNext);

      if (afterFrag.textContent || afterFrag.querySelector?.('[data-v-chip]')) {
        const rightClone = matchedAnc.cloneNode(false);
        rightClone.appendChild(afterFrag);
        parent.insertBefore(rightClone, refNext);
      }
      if (!matchedAnc.textContent && !matchedAnc.querySelector?.('[data-v-chip]')) {
        parent.removeChild(matchedAnc);
      }

      const newRange = doc.createRange();
      newRange.setStartAfter(midMarkerStart);
      newRange.setEndBefore(midMarkerEnd);
      parent.removeChild(midMarkerStart);
      parent.removeChild(midMarkerEnd);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return newRange.cloneRange();
    }
  }

  const fragment = range.extractContents();
  stripConflictingDescendants(fragment, spec.kind);

  const shouldResetWithoutWrap =
    (spec.kind === 'size' && (!spec.value || spec.value === 'normalsize') && currentActive.size === 'normalsize') ||
    (spec.kind === 'color' && !spec.value && !currentActive.color) ||
    (spec.kind === 'font' && (!spec.value || spec.value === 'serif') && currentActive.font === 'serif');

  if (shouldResetWithoutWrap) {
    range.insertNode(fragment);
    return range.cloneRange();
  }

  const wrapper = createWrapperElementForSpec(doc, spec);
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);

  const selectWrapped = doc.createRange();
  selectWrapped.selectNodeContents(wrapper);
  sel.removeAllRanges();
  sel.addRange(selectWrapped);
  return selectWrapped.cloneRange();
}

export function insertAtomicMathChipAtSelection(editorEl, mathTex, savedRange = null, options = {}) {
  if (typeof window === 'undefined' || !editorEl) return null;
  const doc = editorEl.ownerDocument || document;
  const sel = window.getSelection();
  editorEl.focus();

  let range = null;
  if (savedRange && editorEl.contains(savedRange.commonAncestorContainer)) {
    range = savedRange.cloneRange();
  } else if (sel && sel.rangeCount > 0 && editorEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0).cloneRange();
  } else {
    range = doc.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
  }

  const temp = doc.createElement('span');
  temp.innerHTML = buildMathChipHtml(mathTex, '$', options);
  const chipEl = temp.firstElementChild;
  if (!chipEl) return null;

  range.deleteContents();
  range.insertNode(chipEl);

  const trailingSpace = doc.createTextNode(' ');
  if (chipEl.parentNode) {
    chipEl.parentNode.insertBefore(trailingSpace, chipEl.nextSibling);
  }

  const afterRange = doc.createRange();
  afterRange.setStart(trailingSpace, 1);
  afterRange.collapse(true);
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(afterRange);
  }
  return chipEl;
}

export function updateAtomicMathChipElement(chipEl, newMathTex, options = {}) {
  if (!chipEl) return;
  const cleanTex = String(newMathTex ?? '').trim();
  chipEl.setAttribute('data-v-tex', cleanTex);
  chipEl.innerHTML = renderFormulaChipPreviewHtml(cleanTex, false, options);
}

