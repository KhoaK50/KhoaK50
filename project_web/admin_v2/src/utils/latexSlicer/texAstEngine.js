import {
  extractBalancedBraces,
  extractBalancedBrackets,
  unwrapTexFormattingToPlainText,
  computeCountersAtOffset
} from './preambleParser.js';

const MATH_ENV_NAMES = new Set([
  'equation', 'equation*', 'align', 'align*', 'gather', 'gather*',
  'multline', 'multline*', 'aligned', 'gathered', 'eqnarray', 'eqnarray*',
  'flalign', 'flalign*', 'alignat', 'alignat*', 'split',
  'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'matrix', 'smallmatrix',
  'cases', 'dcases', 'rcases', 'array', 'subarray'
]);

const TIKZ_ENV_NAMES = new Set(['tikzpicture', 'circuitikz', 'pgfpicture', 'pspicture', 'asy']);
const VERBATIM_ENV_NAMES = new Set(['verbatim', 'verbatim*', 'lstlisting', 'minted', 'alltt']);
const TABULAR_ENV_NAMES = new Set([
  'tabular', 'tabular*', 'tabularx', 'tabulary', 'longtable', 'supertabular', 'xltabular'
]);
const FLOAT_ATOMIC_ENV_NAMES = new Set([
  'figure', 'figure*', 'table', 'table*',
  'wrapfigure', 'wraptable', 'sidewaysfigure', 'sidewaystable'
]);
const LIST_ENV_NAMES = new Set([
  'itemize', 'itemize*', 'enumerate', 'enumerate*', 'description', 'description*',
  'compactitem', 'compactenum', 'inparaenum', 'tasks'
]);

const ONE_ARG_INLINE_FORMATS = new Set([
  'textbf', 'textit', 'emph', 'underline', 'uline', 'ul', 'uwave', 'dashuline', 'dotuline', 'sout', 'st', 'so', 'caps',
  'texttt', 'textsc', 'textsf', 'textrm', 'textnormal', 'textup', 'textsl', 'textmd',
  'textsuperscript', 'textsubscript', 'fbox', 'ovalbox', 'Ovalbox', 'doublebox', 'shadowbox', 'tcbox',
  'hl', 'enquote', 'mbox', 'hbox',
  'Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'
]);

const TWO_ARG_INLINE_FORMATS = new Set([
  'textcolor', 'href', 'colorbox', 'texorpdfstring', 'resizebox'
]);

const GROUP_SWITCH_SET = new Set([
  'bf', 'bfseries', 'it', 'itshape', 'sl', 'slshape', 'em',
  'sc', 'scshape', 'tt', 'ttfamily', 'sf', 'sffamily', 'rm', 'rmfamily',
  'upshape', 'mdseries', 'normalfont',
  'Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny',
  'centering', 'raggedright', 'raggedleft'
]);

const HEADING_LEVEL_MAP = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6
};

export function countPrecedingBackslashes(str, pos) {
  let count = 0;
  let j = pos - 1;
  while (j >= 0 && str[j] === '\\') {
    count++;
    j--;
  }
  return count;
}

function skipWs(str, idx) {
  let i = idx;
  while (i < str.length && /\s/.test(str[i])) i++;
  return i;
}

function findMatchingEndEnv(str, fromIdx, targetEnvName) {
  const escaped = targetEnvName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenRe = new RegExp(`\\\\(begin|end)\\s*\\{(${escaped})\\}`, 'g');
  tokenRe.lastIndex = fromIdx;
  let depth = 1;
  let m;
  while ((m = tokenRe.exec(str)) !== null) {
    if (countPrecedingBackslashes(str, m.index) % 2 !== 0) continue;
    if (m[1] === 'begin') {
      depth++;
    } else {
      depth--;
      if (depth === 0) {
        return {
          closeStart: m.index,
          closeEnd: m.index + m[0].length
        };
      }
    }
  }
  return null;
}

function stripTexForOutlineTitle(rawTitle) {
  if (!rawTitle) return '';
  return unwrapTexFormattingToPlainText(rawTitle);
}

function parseEnvOpenerEnd(str, afterBeginBraceIdx, envName, customEnvs, userEnvs = null) {
  let cursor = afterBeginBraceIdx;
  const baseEnv = envName.replace(/\*$/, '');

  // Consume leading optional bracket(s) [opt] (minipage/subfigure can have up to 3: [pos][height][inner-pos])
  const maxOptBrackets = ['minipage', 'subfigure', 'subtable'].includes(baseEnv) ? 3 : 1;
  for (let b = 0; b < maxOptBrackets; b++) {
    const wsOpt = skipWs(str, cursor);
    if (str[wsOpt] === '[') {
      const br = extractBalancedBrackets(str, wsOpt);
      if (br) {
        cursor = br.endIndex + 1;
        continue;
      }
    }
    break;
  }

  // tasks package optional column count in parentheses: \begin{tasks}[label=\alph*)](2)
  if (baseEnv === 'tasks') {
    const wsParen = skipWs(str, cursor);
    const pm = /^\(\s*\d+\s*\)/.exec(str.slice(wsParen));
    if (pm) {
      cursor = wsParen + pm[0].length;
    }
    return cursor;
  }

  // Environments taking 1 mandatory brace argument (+ optional trailing bracket on multicols)
  if (
    ['minipage', 'subfigure', 'subtable', 'multicols', 'spacing', 'otherlanguage', 'turn', 'rotate', 'empheq'].includes(
      baseEnv
    )
  ) {
    const ws2 = skipWs(str, cursor);
    if (str[ws2] === '{') {
      const grp = extractBalancedBraces(str, ws2);
      if (grp) {
        cursor = grp.endIndex + 1;
        if (baseEnv === 'multicols') {
          const ws3 = skipWs(str, cursor);
          if (str[ws3] === '[') {
            const hdrBr = extractBalancedBrackets(str, ws3);
            if (hdrBr) cursor = hdrBr.endIndex + 1;
          }
        }
      }
    }
    return cursor;
  }

  // Environments taking 2 mandatory brace arguments: \begin{adjustwidth}{left}{right}, \begin{CJK}{UTF8}{min}
  if (['adjustwidth', 'changemargin', 'CJK'].includes(baseEnv)) {
    for (let k = 0; k < 2; k++) {
      const ws = skipWs(str, cursor);
      if (str[ws] === '{') {
        const grp = extractBalancedBraces(str, ws);
        if (grp) {
          cursor = grp.endIndex + 1;
          continue;
        }
      }
      break;
    }
    return cursor;
  }

  // Custom theorem / tcolorbox / user environments taking mandatory brace arguments
  const envInfo = (customEnvs && customEnvs.get(envName)) || (userEnvs && userEnvs.get(envName)) || null;
  if (envInfo) {
    if (envInfo.isTcbTheorem) {
      const ws2 = skipWs(str, cursor);
      if (str[ws2] === '{') {
        const grp1 = extractBalancedBraces(str, ws2);
        if (grp1 && !grp1.content.includes('\n\n')) {
          cursor = grp1.endIndex + 1;
          const ws3 = skipWs(str, cursor);
          if (str[ws3] === '{') {
            const grp2 = extractBalancedBraces(str, ws3);
            if (grp2 && !grp2.content.includes('\n')) {
              cursor = grp2.endIndex + 1;
            }
          }
        }
      }
    } else if (envInfo.mandatoryArgsCount > 0) {
      for (let k = 0; k < envInfo.mandatoryArgsCount; k++) {
        const wsNext = skipWs(str, cursor);
        if (str[wsNext] === '{') {
          const grp = extractBalancedBraces(str, wsNext);
          if (grp && !grp.content.includes('\n\n')) {
            cursor = grp.endIndex + 1;
            continue;
          }
        }
        break;
      }
    }
  }

  return cursor;
}

// Parse chained LaTeX switches at the start of a brace group: {\Large\bfseries\color{deepred} ...}
function parseLeadingGroupSwitches(tex, openBraceIdx) {
  let cur = skipWs(tex, openBraceIdx + 1);
  if (tex[cur] !== '\\') return null;

  const modifiers = {
    bold: false,
    italic: false,
    smallcaps: false,
    mono: false,
    sans: false,
    size: null,
    color: null,
    colorModel: '',
    align: null
  };
  let count = 0;

  while (cur < tex.length && tex[cur] === '\\') {
    const m = /^\\([a-zA-Z]+)(?![a-zA-Z@])/.exec(tex.slice(cur));
    if (!m) break;
    const sw = m[1];

    if (sw === 'color') {
      let afterCol = skipWs(tex, cur + m[0].length);
      let colModel = '';
      if (tex[afterCol] === '[') {
        const optBr = extractBalancedBrackets(tex, afterCol);
        if (optBr) {
          colModel = optBr.content.trim();
          afterCol = skipWs(tex, optBr.endIndex + 1);
        }
      }
      if (tex[afterCol] === '{') {
        const colGrp = extractBalancedBraces(tex, afterCol);
        if (colGrp) {
          modifiers.color = colGrp.content.trim();
          modifiers.colorModel = colModel;
          cur = skipWs(tex, colGrp.endIndex + 1);
          count++;
          continue;
        }
      }
      break;
    }

    if (!GROUP_SWITCH_SET.has(sw)) break;

    if (sw === 'bf' || sw === 'bfseries') modifiers.bold = true;
    else if (sw === 'mdseries' || sw === 'normalfont') {
      modifiers.bold = false;
      if (sw === 'normalfont') {
        modifiers.italic = false;
        modifiers.smallcaps = false;
        modifiers.mono = false;
        modifiers.sans = false;
      }
    } else if (sw === 'it' || sw === 'itshape' || sw === 'sl' || sw === 'slshape' || sw === 'em') modifiers.italic = true;
    else if (sw === 'upshape') modifiers.italic = false;
    else if (sw === 'sc' || sw === 'scshape') modifiers.smallcaps = true;
    else if (sw === 'tt' || sw === 'ttfamily') {
      modifiers.mono = true;
      modifiers.sans = false;
    } else if (sw === 'sf' || sw === 'sffamily') {
      modifiers.sans = true;
      modifiers.mono = false;
    } else if (sw === 'rm' || sw === 'rmfamily') {
      modifiers.mono = false;
      modifiers.sans = false;
    } else if (['Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny'].includes(sw)) {
      modifiers.size = sw;
    } else if (sw === 'centering') modifiers.align = 'center';
    else if (sw === 'raggedright') modifiers.align = 'left';
    else if (sw === 'raggedleft') modifiers.align = 'right';

    cur = skipWs(tex, cur + m[0].length);
    count++;
  }

  if (count === 0) return null;
  return { openEnd: cur, modifiers };
}

const LATEX_TOC_LEVEL_NUM = {
  part: -1,
  chapter: 0,
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
  subparagraph: 5
};

const ZERO_ARG_SWITCH_SET = new Set([
  'Huge', 'huge', 'LARGE', 'Large', 'large', 'normalsize', 'small', 'footnotesize', 'scriptsize', 'tiny',
  'bf', 'bfseries', 'mdseries', 'normalfont', 'it', 'itshape', 'sl', 'slshape', 'em', 'upshape',
  'sc', 'scshape', 'tt', 'ttfamily', 'rm', 'rmfamily', 'sf', 'sffamily',
  'centering', 'raggedright', 'raggedleft', 'noindent', 'indent', 'par', 'item', 'task',
  'begingroup', 'endgroup', 'selectfont', 'protect', 'relax'
]);

function isBraceOwnedByPrecedingCommandAst(str, openBraceIdx) {
  let p = openBraceIdx - 1;
  while (p >= 0 && /[ \t\r\n]/.test(str[p])) p--;
  if (p < 0) return false;
  for (let hop = 0; hop < 3; hop++) {
    if (str[p] === ']' || str[p] === '}') {
      const closeCh = str[p];
      const openCh = closeCh === ']' ? '[' : '{';
      let depth = 0;
      let k = p;
      while (k >= 0) {
        if (str[k] === closeCh && countPrecedingBackslashes(str, k) % 2 === 0) depth++;
        else if (str[k] === openCh && countPrecedingBackslashes(str, k) % 2 === 0) {
          depth--;
          if (depth === 0) break;
        }
        k--;
      }
      if (k <= 0) return false;
      p = k - 1;
      while (p >= 0 && /[ \t\r\n]/.test(str[p])) p--;
      continue;
    }
    break;
  }
  const tail = str.slice(Math.max(0, p - 44), p + 1);
  const cm = /\\([a-zA-Z@]+)\*?$/.exec(tail);
  if (!cm) return false;
  const cmdName = cm[1];
  if (cmdName === 'begin' || cmdName === 'end') return false;
  if (ZERO_ARG_SWITCH_SET.has(cmdName)) return false;
  return true;
}

export function buildTexAst(masterTex, customEnvsOrPreamble = null, options = {}) {
  const tex = masterTex || '';
  const preambleInfo = customEnvsOrPreamble instanceof Map ? null : customEnvsOrPreamble;
  const customEnvs =
    customEnvsOrPreamble instanceof Map
      ? customEnvsOrPreamble
      : customEnvsOrPreamble?.customEnvs || null;
  const userEnvs =
    customEnvsOrPreamble instanceof Map
      ? options?.userEnvs || null
      : customEnvsOrPreamble?.userEnvs || options?.userEnvs || null;
  const hideCommentEnvs = options?.hideCommentEnvs !== false;
  const isStandaloneNormalized =
    Boolean(options?.isStandaloneNormalized) || tex.includes('@vectoria-standalone-lesson');

  const atomicSpans = [];
  const envNodes = [];
  const inlineFormatNodes = [];
  const outlineHeadings = [];
  const tocEntries = [];

  const initCnt = (!isStandaloneNormalized && preambleInfo?.initialCounters) || {};
  const liveCounters = {
    part: initCnt.part || 0,
    chapter: initCnt.chapter || 0,
    section: initCnt.section || 0,
    subsection: initCnt.subsection || 0,
    subsubsection: initCnt.subsubsection || 0
  };
  let liveTocDepth =
    typeof preambleInfo?.tocDepth === 'number'
      ? preambleInfo.tocDepth
      : /\\chapter\*?(?![a-zA-Z@])/.test(tex)
        ? 2
        : 3;
  let lastHeadingAnchorId = '';
  let lastHeadingEnd = -1;

  const envStack = [];
  let headingCounter = 0;

  let i = 0;
  while (i < tex.length) {
    const ch = tex[i];

    // 1. Scoped font/color/size switch group: {\bf ...}, {\Large\bfseries\color{deepred} ...}, or {text \color{red} ...}
    if (ch === '{' && countPrecedingBackslashes(tex, i) % 2 === 0) {
      const swParsed = parseLeadingGroupSwitches(tex, i);
      if (swParsed) {
        const grp = extractBalancedBraces(tex, i);
        if (grp && swParsed.openEnd <= grp.endIndex) {
          inlineFormatNodes.push({
            kind: 'inline',
            cmdName: 'group-switch',
            modifiers: swParsed.modifiers,
            openStart: i,
            openEnd: swParsed.openEnd,
            openerText: tex.slice(i, swParsed.openEnd),
            closeStart: grp.endIndex,
            closeEnd: grp.endIndex + 1,
            closerText: '}'
          });
          i = swParsed.openEnd;
          continue;
        }
      } else if (!isBraceOwnedByPrecedingCommandAst(tex, i)) {
        const grp = extractBalancedBraces(tex, i);
        if (
          grp &&
          /\\(?:color|bf|bfseries|mdseries|normalfont|it|itshape|sl|slshape|em|upshape|sc|scshape|tt|ttfamily|Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|scriptsize|tiny|centering|raggedright|raggedleft)(?![a-zA-Z@])/.test(
            grp.content
          )
        ) {
          inlineFormatNodes.push({
            kind: 'inline',
            cmdName: 'group-switch',
            modifiers: {},
            openStart: i,
            openEnd: i + 1,
            openerText: '{',
            closeStart: grp.endIndex,
            closeEnd: grp.endIndex + 1,
            closerText: '}'
          });
          i = i + 1;
          continue;
        }
      }
      i++;
      continue;
    }

    // 2. Dollar math $$...$$ or $...$
    if (ch === '$' && countPrecedingBackslashes(tex, i) % 2 === 0) {
      if (tex[i + 1] === '$') {
        let k = i + 2;
        let foundEnd = -1;
        while (k < tex.length - 1) {
          if (tex[k] === '$' && tex[k + 1] === '$' && countPrecedingBackslashes(tex, k) % 2 === 0) {
            foundEnd = k + 2;
            break;
          }
          k++;
        }
        if (foundEnd !== -1) {
          atomicSpans.push({ start: i, end: foundEnd, kind: 'math-display' });
          i = foundEnd;
          continue;
        }
      } else {
        let k = i + 1;
        let foundEnd = -1;
        while (k < tex.length) {
          if (tex[k] === '\n') {
            let nlScan = k + 1;
            while (nlScan < tex.length && (tex[nlScan] === ' ' || tex[nlScan] === '\t' || tex[nlScan] === '\r')) {
              nlScan++;
            }
            if (nlScan < tex.length && tex[nlScan] === '\n') {
              break;
            }
          }
          if (tex[k] === '$' && tex[k + 1] !== '$' && countPrecedingBackslashes(tex, k) % 2 === 0) {
            foundEnd = k + 1;
            break;
          }
          k++;
        }
        if (foundEnd !== -1) {
          atomicSpans.push({ start: i, end: foundEnd, kind: 'math-inline' });
          i = foundEnd;
          continue;
        }
      }
      i++;
      continue;
    }

    // 3. Backslash commands
    if (ch === '\\') {
      let bsRun = 0;
      while (i + bsRun < tex.length && tex[i + bsRun] === '\\') {
        bsRun++;
      }
      if (bsRun >= 2) {
        const pairs = Math.floor(bsRun / 2) * 2;
        if (bsRun % 2 === 0) {
          let afterBreak = i + pairs;
          if (tex[afterBreak] === '*') afterBreak++;
          const wsAfter = skipWs(tex, afterBreak);
          if (tex[wsAfter] === '[') {
            const brOpt = extractBalancedBrackets(tex, wsAfter);
            if (brOpt) {
              const trimmedDim = brOpt.content.trim();
              const isLatexDim =
                /^[+-]?\d*(?:\.\d+)?\s*(?:pt|mm|cm|in|ex|em|bp|px|dd|cc|sp|\\[a-zA-Z]+)$/i.test(trimmedDim) ||
                (wsAfter - afterBreak <= 2 && brOpt.endIndex - wsAfter < 20);
              if (isLatexDim) {
                i = brOpt.endIndex + 1;
                continue;
              }
            }
          }
          i = afterBreak;
          continue;
        }
        i += pairs;
      }

      const nextCh = tex[i + 1];

      // 3a. Display math \[ ... \]
      if (nextCh === '[') {
        let k = i + 2;
        let foundEnd = -1;
        while (k < tex.length) {
          if (tex[k] === ']' && countPrecedingBackslashes(tex, k) % 2 === 1) {
            foundEnd = k + 1;
            break;
          }
          k++;
        }
        if (foundEnd !== -1) {
          atomicSpans.push({ start: i, end: foundEnd, kind: 'math-display' });
          i = foundEnd;
          continue;
        }
      }

      // 3b. Inline math \( ... \)
      if (nextCh === '(') {
        let k = i + 2;
        let foundEnd = -1;
        while (k < tex.length) {
          if (tex[k] === ')' && countPrecedingBackslashes(tex, k) % 2 === 1) {
            foundEnd = k + 1;
            break;
          }
          k++;
        }
        if (foundEnd !== -1) {
          atomicSpans.push({ start: i, end: foundEnd, kind: 'math-inline' });
          i = foundEnd;
          continue;
        }
      }

      // Escaped non-alpha symbol (\%, \$, \{, \}, \&, \_, \', \^, etc.)
      if (!nextCh || !/[a-zA-Z]/.test(nextCh)) {
        i += 2;
        continue;
      }

      const cmdMatch = /^\\([a-zA-Z]+)(\*)?/.exec(tex.slice(i));
      if (!cmdMatch) {
        i++;
        continue;
      }
      const cmdBase = cmdMatch[1];
      const isStarCmd = Boolean(cmdMatch[2]);
      const cmdFullLen = cmdMatch[0].length;

      // 3b-iffalse: Dead TeX conditional \iffalse ... \fi
      if (cmdBase === 'iffalse') {
        const fiMatch = /\\fi(?![a-zA-Z@])/.exec(tex.slice(i + cmdFullLen));
        const fiEnd = fiMatch ? i + cmdFullLen + fiMatch.index + fiMatch[0].length : tex.length;
        atomicSpans.push({ start: i, end: fiEnd, kind: 'ignored' });
        i = fiEnd;
        continue;
      }

      // 3b-verb: \verb|...| or \verb*+...+
      if (cmdBase === 'verb') {
        const delimPos = i + cmdFullLen;
        const delim = tex[delimPos];
        if (delim && delim !== '\n' && delim !== '\r') {
          const endDelim = tex.indexOf(delim, delimPos + 1);
          if (endDelim !== -1) {
            atomicSpans.push({
              start: i,
              end: endDelim + 1,
              kind: 'command',
              cmdName: 'verb',
              verbContent: tex.slice(delimPos + 1, endDelim)
            });
            i = endDelim + 1;
            continue;
          }
        }
      }

      // 3c. \begin{...}
      if (cmdBase === 'begin') {
        const bracePos = skipWs(tex, i + cmdFullLen);
        if (tex[bracePos] === '{') {
          const envGrp = extractBalancedBraces(tex, bracePos);
          if (envGrp) {
            const envName = envGrp.content.trim();
            const afterEnvBrace = envGrp.endIndex + 1;

            if (envName === 'document') {
              atomicSpans.push({ start: i, end: afterEnvBrace, kind: 'ignored' });
              i = afterEnvBrace;
              continue;
            }

            // Never push \begin{comment} onto envStack (prevents reconstructing/leaking \begin{comment}...\end{comment})
            if (envName === 'comment') {
              if (hideCommentEnvs) {
                const matchedComment = findMatchingEndEnv(tex, afterEnvBrace, 'comment');
                const endPos = matchedComment ? matchedComment.closeEnd : afterEnvBrace;
                atomicSpans.push({ start: i, end: endPos, kind: 'ignored' });
                i = endPos;
                continue;
              }
              atomicSpans.push({ start: i, end: afterEnvBrace, kind: 'ignored' });
              i = afterEnvBrace;
              continue;
            }

            if (VERBATIM_ENV_NAMES.has(envName)) {
              const matched = findMatchingEndEnv(tex, afterEnvBrace, envName);
              if (matched) {
                atomicSpans.push({ start: i, end: matched.closeEnd, kind: 'verbatim', envName });
                i = matched.closeEnd;
                continue;
              }
            }

            if (TIKZ_ENV_NAMES.has(envName)) {
              const matched = findMatchingEndEnv(tex, afterEnvBrace, envName);
              if (matched) {
                atomicSpans.push({ start: i, end: matched.closeEnd, kind: 'tikz', envName });
                i = matched.closeEnd;
                continue;
              }
            }

            if (MATH_ENV_NAMES.has(envName)) {
              const matched = findMatchingEndEnv(tex, afterEnvBrace, envName);
              if (matched) {
                atomicSpans.push({ start: i, end: matched.closeEnd, kind: 'math-env', envName });
                i = matched.closeEnd;
                continue;
              }
            }

            if (TABULAR_ENV_NAMES.has(envName)) {
              const matched = findMatchingEndEnv(tex, afterEnvBrace, envName);
              if (matched) {
                atomicSpans.push({ start: i, end: matched.closeEnd, kind: 'tabular', envName });
                i = matched.closeEnd;
                continue;
              }
            }

            if (FLOAT_ATOMIC_ENV_NAMES.has(envName)) {
              const matched = findMatchingEndEnv(tex, afterEnvBrace, envName);
              if (matched) {
                atomicSpans.push({ start: i, end: matched.closeEnd, kind: 'float', envName });
                i = matched.closeEnd;
                continue;
              }
            }

            // General nestable environment
            const openEnd = parseEnvOpenerEnd(tex, afterEnvBrace, envName, customEnvs, userEnvs);
            envStack.push({
              kind: 'env',
              envName,
              openStart: i,
              openEnd,
              openerText: tex.slice(i, openEnd),
              depth: envStack.length,
              items: []
            });
            i = openEnd;
            continue;
          }
        }
      }

      // 3d. \end{...}
      if (cmdBase === 'end') {
        const bracePos = skipWs(tex, i + cmdFullLen);
        if (tex[bracePos] === '{') {
          const envGrp = extractBalancedBraces(tex, bracePos);
          if (envGrp) {
            const envName = envGrp.content.trim();
            const closeEnd = envGrp.endIndex + 1;
            if (envName === 'document' || envName === 'comment') {
              atomicSpans.push({ start: i, end: closeEnd, kind: 'ignored' });
              i = closeEnd;
              continue;
            }

            let matchIdx = -1;
            for (let s = envStack.length - 1; s >= 0; s--) {
              if (envStack[s].envName === envName) {
                matchIdx = s;
                break;
              }
            }
            if (matchIdx !== -1) {
              // Any unclosed inner environments skipped by this outer \end are marked ignored so they don't leak
              for (let u = matchIdx + 1; u < envStack.length; u++) {
                atomicSpans.push({
                  start: envStack[u].openStart,
                  end: envStack[u].openEnd,
                  kind: 'ignored'
                });
              }
              const opened = envStack[matchIdx];
              envStack.length = matchIdx;
              if (opened.items.length > 0) {
                opened.items[opened.items.length - 1].bodyEnd = i;
              }
              envNodes.push({
                ...opened,
                closeStart: i,
                closeEnd,
                closerText: tex.slice(i, closeEnd)
              });
            } else {
              // Unmatched \end{...}: mark as ignored atomic span so environment name never leaks into prose
              atomicSpans.push({ start: i, end: closeEnd, kind: 'ignored' });
            }
            i = closeEnd;
            continue;
          }
        }
      }

      // 3e. \item or \task inside active list environment
      if ((cmdBase === 'item' || cmdBase === 'task') && envStack.length > 0) {
        const topEnv = envStack[envStack.length - 1];
        if (LIST_ENV_NAMES.has(topEnv.envName)) {
          let itemEnd = i + cmdFullLen;
          const wsOpt = skipWs(tex, itemEnd);
          if (tex[wsOpt] === '[') {
            const optBr = extractBalancedBrackets(tex, wsOpt);
            if (optBr) itemEnd = optBr.endIndex + 1;
          } else if (cmdBase === 'task' && tex[wsOpt] === '(') {
            const pm = /^\(\s*\d+\s*\)/.exec(tex.slice(wsOpt));
            if (pm) itemEnd = wsOpt + pm[0].length;
          }
          if (topEnv.items.length > 0) {
            topEnv.items[topEnv.items.length - 1].bodyEnd = i;
          }
          topEnv.items.push({
            itemCmdStart: i,
            itemCmdEnd: itemEnd,
            itemCmdText: tex.slice(i, itemEnd),
            bodyStart: itemEnd,
            bodyEnd: tex.length
          });
          i = itemEnd;
          continue;
        }
      }

      // 3f. Headings: \part, \chapter, \section, \subsection, \subsubsection, \paragraph, \subparagraph
      if (Object.prototype.hasOwnProperty.call(HEADING_LEVEL_MAP, cmdBase)) {
        let cur = skipWs(tex, i + cmdFullLen);
        let shortOptTitle = null;
        if (tex[cur] === '[') {
          const optBr = extractBalancedBrackets(tex, cur);
          if (optBr) {
            shortOptTitle = optBr.content.trim();
            cur = skipWs(tex, optBr.endIndex + 1);
          }
        }
        if (tex[cur] === '{') {
          const titleGrp = extractBalancedBraces(tex, cur);
          if (titleGrp) {
            const hEnd = titleGrp.endIndex + 1;
            const hLevel = HEADING_LEVEL_MAP[cmdBase];
            headingCounter++;
            const anchorId = `outline-h-${headingCounter}`;
            const cleanTitle = stripTexForOutlineTitle(titleGrp.content);
            const hasHardPrefix =
              /^(?:chương|chapter|phần|part|bài|câu\s*hỏi|problem)\b/i.test(cleanTitle) ||
              /^[0-9]+(\.[0-9]+)+\s+/.test(cleanTitle);

            let numLabel = '';
            if (!isStarCmd) {
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
            }

            atomicSpans.push({
              start: i,
              end: hEnd,
              kind: 'heading',
              headingType: cmdBase,
              headingId: anchorId,
              isStarred: isStarCmd,
              numLabel
            });

            if (hLevel <= 4) {
              outlineHeadings.push({
                id: anchorId,
                type: cmdBase,
                level: hLevel,
                isStarred: isStarCmd,
                numLabel,
                rawTitle: titleGrp.content.trim(),
                cleanTitle: cleanTitle || `Mục ${headingCounter}`,
                start: i,
                end: hEnd
              });
            }

            const tocLvlNum = LATEX_TOC_LEVEL_NUM[cmdBase] ?? 99;
            if (!isStarCmd && tocLvlNum <= liveTocDepth) {
              const tocRaw = shortOptTitle !== null && shortOptTitle !== '' ? shortOptTitle : titleGrp.content.trim();
              tocEntries.push({
                type: cmdBase,
                levelNum: tocLvlNum,
                numLabel,
                rawTitle: tocRaw,
                cleanTitle: stripTexForOutlineTitle(tocRaw) || cleanTitle,
                targetId: anchorId,
                start: i,
                isManualAdd: false
              });
            }

            lastHeadingAnchorId = anchorId;
            lastHeadingEnd = hEnd;
            i = hEnd;
            continue;
          }
        }
      }

      // 3f-2. Standalone \caption[short]{long} (e.g. inside minipage/center outside figure float)
      if (cmdBase === 'caption' || cmdBase === 'captionof') {
        let cur = skipWs(tex, i + cmdFullLen);
        if (cmdBase === 'captionof' && tex[cur] === '{') {
          const typeGrp = extractBalancedBraces(tex, cur);
          if (typeGrp) cur = skipWs(tex, typeGrp.endIndex + 1);
        }
        if (tex[cur] === '[') {
          const optBr = extractBalancedBrackets(tex, cur);
          if (optBr) cur = skipWs(tex, optBr.endIndex + 1);
        }
        if (tex[cur] === '{') {
          const capGrp = extractBalancedBraces(tex, cur);
          if (capGrp) {
            atomicSpans.push({
              start: i,
              end: capGrp.endIndex + 1,
              kind: 'caption',
              captionContent: capGrp.content
            });
            i = capGrp.endIndex + 1;
            continue;
          }
        }
      }

      // 3g. \includegraphics[opt]{src}
      if (cmdBase === 'includegraphics') {
        let cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '[') {
          const optBr = extractBalancedBrackets(tex, cur);
          if (optBr) cur = skipWs(tex, optBr.endIndex + 1);
        }
        if (tex[cur] === '{') {
          const srcGrp = extractBalancedBraces(tex, cur);
          if (srcGrp) {
            const gEnd = srcGrp.endIndex + 1;
            atomicSpans.push({ start: i, end: gEnd, kind: 'graphics' });
            i = gEnd;
            continue;
          }
        }
      }

      // 3g-2. \maketitle
      if (cmdBase === 'maketitle') {
        atomicSpans.push({ start: i, end: i + cmdFullLen, kind: 'command', cmdName: 'maketitle' });
        i += cmdFullLen;
        continue;
      }

      // 3g-3. \rule[raise]{width}{height}
      if (cmdBase === 'rule') {
        let cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '[') {
          const optBr = extractBalancedBrackets(tex, cur);
          if (optBr) cur = skipWs(tex, optBr.endIndex + 1);
        }
        if (tex[cur] === '{') {
          const wGrp = extractBalancedBraces(tex, cur);
          if (wGrp) {
            const cur2 = skipWs(tex, wGrp.endIndex + 1);
            if (tex[cur2] === '{') {
              const hGrp = extractBalancedBraces(tex, cur2);
              if (hGrp) {
                atomicSpans.push({
                  start: i,
                  end: hGrp.endIndex + 1,
                  kind: 'command',
                  cmdName: 'rule',
                  ruleWidth: wGrp.content.trim(),
                  ruleHeight: hGrp.content.trim()
                });
                i = hGrp.endIndex + 1;
                continue;
              }
            }
          }
        }
      }

      // 3h. Atomic 1-arg commands (\label, \ref, \eqref, \cite, \url, \bai, \footnote, \thanks, \phantom, \hphantom, \vphantom)
      if (
        ['label', 'ref', 'eqref', 'cite', 'url', 'bai', 'footnote', 'thanks', 'phantom', 'hphantom', 'vphantom'].includes(
          cmdBase
        )
      ) {
        let cur = skipWs(tex, i + cmdFullLen);
        if (cmdBase === 'cite' && tex[cur] === '[') {
          const optBr = extractBalancedBrackets(tex, cur);
          if (optBr) cur = skipWs(tex, optBr.endIndex + 1);
        }
        if (tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp) {
            const cEnd = grp.endIndex + 1;
            atomicSpans.push({ start: i, end: cEnd, kind: 'command', cmdName: cmdBase });
            i = cEnd;
            continue;
          }
        }
      }

      // 3i. \boxpair[opt]{content}{points}
      if (cmdBase === 'boxpair') {
        let cur1 = skipWs(tex, i + cmdFullLen);
        if (tex[cur1] === '[') {
          const optBr = extractBalancedBrackets(tex, cur1);
          if (optBr) cur1 = skipWs(tex, optBr.endIndex + 1);
        }
        if (tex[cur1] === '{') {
          const g1 = extractBalancedBraces(tex, cur1);
          if (g1) {
            const cur2 = skipWs(tex, g1.endIndex + 1);
            if (tex[cur2] === '{') {
              const g2 = extractBalancedBraces(tex, cur2);
              if (g2) {
                const bpEnd = g2.endIndex + 1;
                atomicSpans.push({
                  start: i,
                  end: bpEnd,
                  kind: 'boxpair',
                  bodyContentStart: cur1 + 1,
                  bodyContentEnd: g1.endIndex,
                  pointsContentStart: cur2 + 1,
                  pointsContentEnd: g2.endIndex
                });
                i = bpEnd;
                continue;
              }
            }
          }
        }
      }

      // 3j. Box / Transform wrappers with sizing arguments before final {body}:
      // \scalebox{h}[v]{body}, \rotatebox[opt]{deg}{body}, \raisebox{lift}[h][d]{body},
      // \parbox[p][h][ip]{w}{body}, \makebox[w][p]{body}, \framebox[w][p]{body}
      if (['scalebox', 'rotatebox', 'raisebox', 'parbox', 'makebox', 'framebox'].includes(cmdBase)) {
        let cur = skipWs(tex, i + cmdFullLen);
        let bodyOpenIdx = -1;

        if (cmdBase === 'scalebox' || cmdBase === 'raisebox') {
          if (tex[cur] === '{') {
            const g1 = extractBalancedBraces(tex, cur);
            if (g1) {
              cur = skipWs(tex, g1.endIndex + 1);
              while (tex[cur] === '[') {
                const obr = extractBalancedBrackets(tex, cur);
                if (!obr) break;
                cur = skipWs(tex, obr.endIndex + 1);
              }
              if (tex[cur] === '{') bodyOpenIdx = cur;
            }
          }
        } else if (cmdBase === 'rotatebox' || cmdBase === 'parbox') {
          while (tex[cur] === '[') {
            const obr = extractBalancedBrackets(tex, cur);
            if (!obr) break;
            cur = skipWs(tex, obr.endIndex + 1);
          }
          if (tex[cur] === '{') {
            const g1 = extractBalancedBraces(tex, cur);
            if (g1) {
              cur = skipWs(tex, g1.endIndex + 1);
              if (tex[cur] === '{') bodyOpenIdx = cur;
            }
          }
        } else if (cmdBase === 'makebox' || cmdBase === 'framebox') {
          while (tex[cur] === '[') {
            const obr = extractBalancedBrackets(tex, cur);
            if (!obr) break;
            cur = skipWs(tex, obr.endIndex + 1);
          }
          if (tex[cur] === '{') bodyOpenIdx = cur;
        }

        if (bodyOpenIdx !== -1) {
          const bodyGrp = extractBalancedBraces(tex, bodyOpenIdx);
          if (bodyGrp) {
            const openEnd = bodyOpenIdx + 1;
            inlineFormatNodes.push({
              kind: 'inline',
              cmdName: cmdBase,
              openStart: i,
              openEnd,
              openerText: tex.slice(i, openEnd),
              closeStart: bodyGrp.endIndex,
              closeEnd: bodyGrp.endIndex + 1,
              closerText: '}'
            });
            i = openEnd;
            continue;
          }
        }
      }

      // 3j-2. 3-arg inline formatting: \fcolorbox[model]{border}{bg}{body}
      if (cmdBase === 'fcolorbox') {
        let cur1 = skipWs(tex, i + cmdFullLen);
        let colorModel = '';
        if (tex[cur1] === '[') {
          const obr = extractBalancedBrackets(tex, cur1);
          if (obr) {
            colorModel = obr.content.trim();
            cur1 = skipWs(tex, obr.endIndex + 1);
          }
        }
        if (tex[cur1] === '{') {
          const g1 = extractBalancedBraces(tex, cur1);
          if (g1) {
            const cur2 = skipWs(tex, g1.endIndex + 1);
            if (tex[cur2] === '{') {
              const g2 = extractBalancedBraces(tex, cur2);
              if (g2) {
                const cur3 = skipWs(tex, g2.endIndex + 1);
                if (tex[cur3] === '{') {
                  const g3 = extractBalancedBraces(tex, cur3);
                  if (g3) {
                    const openEnd = cur3 + 1;
                    inlineFormatNodes.push({
                      kind: 'inline',
                      cmdName: 'fcolorbox',
                      colorModel,
                      borderColorArg: g1.content.trim(),
                      bgColorArg: g2.content.trim(),
                      openStart: i,
                      openEnd,
                      openerText: tex.slice(i, openEnd),
                      closeStart: g3.endIndex,
                      closeEnd: g3.endIndex + 1,
                      closerText: '}'
                    });
                    i = openEnd;
                    continue;
                  }
                }
              }
            }
          }
        }
      }

      // 3j-3. 1-arg inline formatting (\textbf{...}, \textit{...}, \emph{...}, etc.)
      if (ONE_ARG_INLINE_FORMATS.has(cmdBase)) {
        const cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp) {
            const openEnd = cur + 1;
            inlineFormatNodes.push({
              kind: 'inline',
              cmdName: cmdBase,
              openStart: i,
              openEnd,
              openerText: tex.slice(i, openEnd),
              closeStart: grp.endIndex,
              closeEnd: grp.endIndex + 1,
              closerText: '}'
            });
            i = openEnd;
            continue;
          }
        }
      }

      // 3k. 2-arg inline formatting (\textcolor[m]{col}{...}, \colorbox[m]{col}{...}, \href{url}{...}, \texorpdfstring{a}{b}, \resizebox*{w}{h}{...})
      if (TWO_ARG_INLINE_FORMATS.has(cmdBase)) {
        let cur1 = skipWs(tex, i + cmdFullLen);
        let colorModel = '';
        if ((cmdBase === 'textcolor' || cmdBase === 'colorbox') && tex[cur1] === '[') {
          const obr = extractBalancedBrackets(tex, cur1);
          if (obr) {
            colorModel = obr.content.trim();
            cur1 = skipWs(tex, obr.endIndex + 1);
          }
        }
        if (tex[cur1] === '{') {
          const g1 = extractBalancedBraces(tex, cur1);
          if (g1) {
            const cur2 = skipWs(tex, g1.endIndex + 1);
            if (tex[cur2] === '{') {
              const g2 = extractBalancedBraces(tex, cur2);
              if (g2) {
                if (cmdBase === 'texorpdfstring') {
                  // Atomic: render first arg (TeX string) and discard second arg (PDF bookmark fallback)
                  atomicSpans.push({
                    start: i,
                    end: g2.endIndex + 1,
                    kind: 'command',
                    cmdName: 'texorpdfstring',
                    texStringArg: g1.content
                  });
                  i = g2.endIndex + 1;
                  continue;
                }
                if (cmdBase === 'resizebox') {
                  const cur3 = skipWs(tex, g2.endIndex + 1);
                  if (tex[cur3] === '{') {
                    const g3 = extractBalancedBraces(tex, cur3);
                    if (g3) {
                      const openEnd = cur3 + 1;
                      inlineFormatNodes.push({
                        kind: 'inline',
                        cmdName: 'resizebox',
                        openStart: i,
                        openEnd,
                        openerText: tex.slice(i, openEnd),
                        closeStart: g3.endIndex,
                        closeEnd: g3.endIndex + 1,
                        closerText: '}'
                      });
                      i = openEnd;
                      continue;
                    }
                  }
                } else {
                  const openEnd = cur2 + 1;
                  inlineFormatNodes.push({
                    kind: 'inline',
                    cmdName: cmdBase,
                    colorModel,
                    firstArg: g1.content.trim(),
                    openStart: i,
                    openEnd,
                    openerText: tex.slice(i, openEnd),
                    closeStart: g2.endIndex,
                    closeEnd: g2.endIndex + 1,
                    closerText: '}'
                  });
                  i = openEnd;
                  continue;
                }
              }
            }
          }
        }
      }

      // 3l. \loigiai{...} wrapper (reconstructable wrapper so slicing inside a solution closes cleanly!)
      if (cmdBase === 'loigiai') {
        const cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '{') {
          const grp = extractBalancedBraces(tex, cur);
          if (grp) {
            const openEnd = cur + 1;
            inlineFormatNodes.push({
              kind: 'inline',
              cmdName: 'loigiai',
              openStart: i,
              openEnd,
              openerText: '\\loigiai{',
              closeStart: grp.endIndex,
              closeEnd: grp.endIndex + 1,
              closerText: '}'
            });
            i = openEnd;
            continue;
          }
        }
      }

      // 3m. Layout / declaration / counter no-ops with brace arguments -> mark as ignored atomic spans so arguments (e.g. \pagestyle{C1}) never leak
      if (
        [
          'pagestyle', 'thispagestyle', 'pagenumbering', 'bibliographystyle', 'bibliography', 'nocite',
          'vspace', 'hspace', 'addvspace', 'enlargethispage', 'tcbset', 'tcbuselibrary', 'mdfsetup',
          'tikzset', 'pgfplotsset', 'sisetup', 'captionsetup', 'setlist'
        ].includes(cmdBase)
      ) {
        let cur = skipWs(tex, i + cmdFullLen);
        while (tex[cur] === '[') {
          const br = extractBalancedBrackets(tex, cur);
          if (!br) break;
          cur = skipWs(tex, br.endIndex + 1);
        }
        if (tex[cur] === '{') {
          const g = extractBalancedBraces(tex, cur);
          if (g) {
            atomicSpans.push({ start: i, end: g.endIndex + 1, kind: 'ignored' });
            i = g.endIndex + 1;
            continue;
          }
        }
      }

      // 3m-counter-1: \stepcounter{name}, \refstepcounter{name}, \newcounter{name}[within]
      if (cmdBase === 'stepcounter' || cmdBase === 'refstepcounter' || cmdBase === 'newcounter') {
        let cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '{') {
          const g1 = extractBalancedBraces(tex, cur);
          if (g1) {
            let endCur = g1.endIndex + 1;
            const cName = g1.content.trim();
            if (cmdBase === 'newcounter') {
              const wNext = skipWs(tex, endCur);
              if (tex[wNext] === '[') {
                const obr = extractBalancedBrackets(tex, wNext);
                if (obr) endCur = obr.endIndex + 1;
              }
              atomicSpans.push({ start: i, end: endCur, kind: 'ignored' });
              i = endCur;
              continue;
            }
            if (!isStandaloneNormalized && cName) {
              if (cName === 'tocdepth') {
                liveTocDepth += 1;
              } else if (Object.prototype.hasOwnProperty.call(liveCounters, cName)) {
                liveCounters[cName] = (liveCounters[cName] || 0) + 1;
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
            atomicSpans.push({
              start: i,
              end: endCur,
              kind: 'counter',
              counterOp: cmdBase,
              counterName: cName,
              counterVal: 1
            });
            i = endCur;
            continue;
          }
        }
      }

      // 3m-counter-2: \setcounter{name}{val}, \addtocounter{name}{val}
      if (cmdBase === 'setcounter' || cmdBase === 'addtocounter') {
        let cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '{') {
          const g1 = extractBalancedBraces(tex, cur);
          if (g1) {
            const cur2 = skipWs(tex, g1.endIndex + 1);
            if (tex[cur2] === '{') {
              const g2 = extractBalancedBraces(tex, cur2);
              if (g2) {
                const endCur = g2.endIndex + 1;
                const cName = g1.content.trim();
                const parsedVal = parseInt(g2.content.trim(), 10);
                const cVal = Number.isNaN(parsedVal) ? 0 : parsedVal;
                if (!isStandaloneNormalized && cName && !Number.isNaN(parsedVal)) {
                  if (cName === 'tocdepth') {
                    liveTocDepth = cmdBase === 'setcounter' ? cVal : liveTocDepth + cVal;
                  } else if (Object.prototype.hasOwnProperty.call(liveCounters, cName)) {
                    liveCounters[cName] =
                      cmdBase === 'setcounter' ? cVal : (liveCounters[cName] || 0) + cVal;
                  }
                }
                atomicSpans.push({
                  start: i,
                  end: endCur,
                  kind: 'counter',
                  counterOp: cmdBase,
                  counterName: cName,
                  counterVal: cVal
                });
                i = endCur;
                continue;
              }
            }
          }
        }
      }

      // 3m-addcontentsline: \addcontentsline{toc}{level}{title}
      if (cmdBase === 'addcontentsline') {
        const cur1 = skipWs(tex, i + cmdFullLen);
        if (tex[cur1] === '{') {
          const g1 = extractBalancedBraces(tex, cur1);
          if (g1) {
            const cur2 = skipWs(tex, g1.endIndex + 1);
            if (tex[cur2] === '{') {
              const g2 = extractBalancedBraces(tex, cur2);
              if (g2) {
                const cur3 = skipWs(tex, g2.endIndex + 1);
                if (tex[cur3] === '{') {
                  const g3 = extractBalancedBraces(tex, cur3);
                  if (g3) {
                    const endCur = g3.endIndex + 1;
                    const tocFile = g1.content.trim().toLowerCase();
                    const tocLevel = g2.content.trim().toLowerCase();
                    const tocTitle = g3.content.trim();
                    const lvlNum = LATEX_TOC_LEVEL_NUM[tocLevel] ?? 1;
                    let ownAnchorId = '';
                    let targetId = '';
                    if (
                      lastHeadingAnchorId &&
                      lastHeadingEnd >= 0 &&
                      tex
                        .slice(lastHeadingEnd, i)
                        .replace(/\\label\s*\{[^}]*\}/g, '')
                        .trim() === ''
                    ) {
                      targetId = lastHeadingAnchorId;
                    } else {
                      ownAnchorId = `addtoc-anchor-${tocEntries.length + 1}`;
                      targetId = ownAnchorId;
                    }

                    if (tocFile === 'toc' && lvlNum <= liveTocDepth && tocTitle) {
                      tocEntries.push({
                        type: tocLevel,
                        levelNum: lvlNum,
                        numLabel: '',
                        rawTitle: tocTitle,
                        cleanTitle: stripTexForOutlineTitle(tocTitle) || tocTitle,
                        targetId,
                        start: i,
                        isManualAdd: true
                      });
                    }
                    atomicSpans.push({
                      start: i,
                      end: endCur,
                      kind: 'addcontentsline',
                      anchorId: ownAnchorId
                    });
                    i = endCur;
                    continue;
                  }
                }
              }
            }
          }
        }
      }

      if (
        ['setlength', 'addtolength', 'settowidth', 'settoheight', 'settodepth', 'numberwithin', 'colorlet'].includes(
          cmdBase
        )
      ) {
        let cur = skipWs(tex, i + cmdFullLen);
        if (tex[cur] === '[') {
          const br = extractBalancedBrackets(tex, cur);
          if (br) cur = skipWs(tex, br.endIndex + 1);
        }
        let endCur = i + cmdFullLen;
        let ok = true;
        for (let b = 0; b < 2; b++) {
          cur = skipWs(tex, cur);
          if (tex[cur] === '{') {
            const g = extractBalancedBraces(tex, cur);
            if (g) {
              endCur = g.endIndex + 1;
              cur = endCur;
              continue;
            }
          } else if (b === 0 && tex[cur] === '\\') {
            const mc = /^\\[a-zA-Z]+/.exec(tex.slice(cur));
            if (mc) {
              endCur = cur + mc[0].length;
              cur = endCur;
              continue;
            }
          }
          ok = false;
          break;
        }
        if (ok) {
          atomicSpans.push({ start: i, end: endCur, kind: 'ignored' });
          i = endCur;
          continue;
        }
      }

      if (cmdBase === 'definecolor' || cmdBase === 'providecolor') {
        let cur = skipWs(tex, i + cmdFullLen);
        let endCur = i + cmdFullLen;
        let ok = true;
        for (let b = 0; b < 3; b++) {
          cur = skipWs(tex, cur);
          if (tex[cur] === '{') {
            const g = extractBalancedBraces(tex, cur);
            if (g) {
              endCur = g.endIndex + 1;
              cur = endCur;
              continue;
            }
          }
          ok = false;
          break;
        }
        if (ok) {
          atomicSpans.push({ start: i, end: endCur, kind: 'ignored' });
          i = endCur;
          continue;
        }
      }

      // 3n. \begingroup ... \endgroup scoped group
      if (cmdBase === 'begingroup') {
        envStack.push({
          kind: 'env',
          envName: '__texgroup__',
          openStart: i,
          openEnd: i + cmdFullLen,
          openerText: '\\begingroup',
          depth: envStack.length,
          items: []
        });
        i += cmdFullLen;
        continue;
      }

      if (cmdBase === 'endgroup') {
        let matchIdx = -1;
        for (let s = envStack.length - 1; s >= 0; s--) {
          if (envStack[s].envName === '__texgroup__') {
            matchIdx = s;
            break;
          }
        }
        if (matchIdx !== -1) {
          for (let u = matchIdx + 1; u < envStack.length; u++) {
            atomicSpans.push({
              start: envStack[u].openStart,
              end: envStack[u].openEnd,
              kind: 'ignored'
            });
          }
          const opened = envStack[matchIdx];
          envStack.length = matchIdx;
          envNodes.push({
            ...opened,
            closeStart: i,
            closeEnd: i + cmdFullLen,
            closerText: '\\endgroup'
          });
        } else {
          atomicSpans.push({ start: i, end: i + cmdFullLen, kind: 'ignored' });
        }
        i += cmdFullLen;
        continue;
      }

      // 3o. \tableofcontents
      if (cmdBase === 'tableofcontents') {
        atomicSpans.push({
          start: i,
          end: i + cmdFullLen,
          kind: 'toc',
          tocDepthAtPos: liveTocDepth
        });
        i += cmdFullLen;
        continue;
      }

      if (
        [
          'listoffigures', 'listoftables',
          'newpage', 'clearpage', 'cleardoublepage', 'pagebreak', 'nopagebreak',
          'noindent', 'indent', 'selectfont', 'normalfont', 'protect', 'relax'
        ].includes(cmdBase)
      ) {
        atomicSpans.push({ start: i, end: i + cmdFullLen, kind: 'ignored' });
        i += cmdFullLen;
        continue;
      }

      // 3p. User-defined macro with arguments from preambleInfo.macroTable (e.g. \newcommand{\nhanh}[1]{\textcolor{red}{\textbf{#1}}})
      const userMacro = preambleInfo?.macroTable?.get(cmdBase);
      if (userMacro && userMacro.numArgs > 0) {
        let cur = skipWs(tex, i + cmdFullLen);
        const hasOpt = userMacro.defaultOpt !== null && userMacro.defaultOpt !== undefined;
        if (hasOpt && tex[cur] === '[') {
          const obr = extractBalancedBrackets(tex, cur);
          if (obr) cur = skipWs(tex, obr.endIndex + 1);
        }
        const mandatoryCount = hasOpt ? Math.max(0, userMacro.numArgs - 1) : userMacro.numArgs;
        let endCur = cur;
        let allMatched = true;
        for (let a = 0; a < mandatoryCount; a++) {
          cur = skipWs(tex, cur);
          if (tex[cur] === '{') {
            const grp = extractBalancedBraces(tex, cur);
            if (grp) {
              endCur = grp.endIndex + 1;
              cur = endCur;
              continue;
            }
          } else if (tex[cur] && tex[cur] !== '\\' && !/\s/.test(tex[cur])) {
            endCur = cur + 1;
            cur = endCur;
            continue;
          }
          allMatched = false;
          break;
        }
        if (allMatched && endCur > i + cmdFullLen) {
          atomicSpans.push({
            start: i,
            end: endCur,
            kind: 'user-macro',
            cmdName: cmdBase
          });
          i = endCur;
          continue;
        }
      }

      i += cmdFullLen;
      continue;
    }

    i++;
  }

  // Any unclosed environment opener left on envStack at EOF must be marked ignored so its name/args never leak into prose
  for (const unclosed of envStack) {
    atomicSpans.push({
      start: unclosed.openStart,
      end: unclosed.openEnd,
      kind: 'ignored'
    });
  }

  atomicSpans.sort((a, b) => a.start - b.start || b.end - a.end);
  envNodes.sort((a, b) => a.openStart - b.openStart || b.closeEnd - a.closeEnd);
  inlineFormatNodes.sort((a, b) => a.openStart - b.openStart || b.closeEnd - a.closeEnd);

  return {
    length: tex.length,
    preambleInfo: preambleInfo || null,
    atomicSpans,
    envNodes,
    inlineFormatNodes,
    outlineHeadings,
    tocEntries
  };
}

function computeVerbatimRanges(texStr) {
  const ranges = [];
  if (!texStr) return ranges;
  const envRe = /\\begin\s*\{(verbatim\*?|lstlisting|minted|alltt)\}/g;
  let m;
  while ((m = envRe.exec(texStr)) !== null) {
    const matched = findMatchingEndEnv(texStr, m.index + m[0].length, m[1]);
    if (matched) {
      ranges.push([m.index, matched.closeEnd]);
      envRe.lastIndex = matched.closeEnd;
    }
  }
  const verbRe = /\\verb\*?(.)/g;
  while ((m = verbRe.exec(texStr)) !== null) {
    const delim = m[1];
    if (delim && delim !== '\n' && delim !== '\r') {
      const endIdx = texStr.indexOf(delim, m.index + m[0].length);
      if (endIdx !== -1) {
        ranges.push([m.index, endIdx + 1]);
        verbRe.lastIndex = endIdx + 1;
      }
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

function healOrphanBracesOutsideMath(texStr) {
  if (!texStr) return '';
  const verbRanges = computeVerbatimRanges(texStr);
  const findVerbRangeEnd = (pos) => {
    for (const [vs, ve] of verbRanges) {
      if (pos >= vs && pos < ve) return ve;
      if (vs > pos) break;
    }
    return -1;
  };

  let depth = 0;
  let missingOpenCount = 0;
  let i = 0;

  while (i < texStr.length) {
    const vEnd = findVerbRangeEnd(i);
    if (vEnd !== -1) {
      i = vEnd;
      continue;
    }
    if (texStr[i] === '\\') {
      const bs = countPrecedingBackslashes(texStr, i);
      if (bs % 2 === 0 && i + 1 < texStr.length && !/[a-zA-Z]/.test(texStr[i + 1])) {
        i += 2;
        continue;
      }
    }
    if (texStr[i] === '{') {
      depth++;
    } else if (texStr[i] === '}') {
      if (depth > 0) {
        depth--;
      } else {
        missingOpenCount++;
      }
    }
    i++;
  }

  let out = texStr;
  if (missingOpenCount > 0) {
    let toStrip = missingOpenCount;
    let cleaned = '';
    let curDepth = 0;
    for (let k = 0; k < out.length; k++) {
      const vEnd = findVerbRangeEnd(k);
      if (vEnd !== -1) {
        cleaned += out.slice(k, vEnd);
        k = vEnd - 1;
        continue;
      }
      if (out[k] === '{' && countPrecedingBackslashes(out, k) % 2 === 0) {
        curDepth++;
        cleaned += out[k];
      } else if (out[k] === '}' && countPrecedingBackslashes(out, k) % 2 === 0) {
        if (curDepth > 0) {
          curDepth--;
          cleaned += out[k];
        } else if (toStrip > 0) {
          toStrip--;
        } else {
          cleaned += out[k];
        }
      } else {
        cleaned += out[k];
      }
    }
    out = cleaned;
  }

  if (depth > 0) {
    out += '}'.repeat(depth);
  }
  return out;
}

export function snapAndReconstructSlice(masterTex, rawStart, rawEnd, ast) {
  const tex = masterTex || '';
  if (!tex || tex.length === 0) {
    return {
      snappedStart: 0,
      snappedEnd: 0,
      reconstructedTex: '',
      recoveredEnvs: [],
      recoveredInlineFormats: []
    };
  }

  let s = Math.max(0, Math.min(tex.length, Math.min(rawStart, rawEnd)));
  let e = Math.max(0, Math.min(tex.length, Math.max(rawStart, rawEnd)));

  const parsedAst = ast || buildTexAst(tex);
  const allWrappers = [...parsedAst.envNodes, ...parsedAst.inlineFormatNodes];

  // Step 1: Iterative fixed-point boundary snapping across atomic spans, command tokens, and list \item headers
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;

    // 1a. Snap out of atomic spans (math, tikz, tabular, float, heading, graphics, boxpair)
    for (const span of parsedAst.atomicSpans) {
      if (span.start < s && s < span.end) {
        s = span.start;
        changed = true;
      }
      if (span.start < e && e < span.end) {
        e = span.end;
        changed = true;
      }
    }

    // 1b. Snap out of mid-opener or mid-closer of any wrapper (environment or inline style)
    for (const w of allWrappers) {
      if (w.openStart < s && s < w.openEnd) {
        s = w.openStart;
        changed = true;
      }
      if (w.closeStart < s && s < w.closeEnd) {
        s = w.closeEnd;
        changed = true;
      }
      if (w.openStart < e && e < w.openEnd) {
        e = w.openStart;
        changed = true;
      }
      if (w.closeStart < e && e < w.closeEnd) {
        e = w.closeEnd;
        changed = true;
      }
    }

    // 1c. Snap out of raw backslash command name (e.g. don't slice "\quad" into "uad")
    if (s > 0 && s < tex.length && /[a-zA-Z]/.test(tex[s])) {
      let back = s;
      while (back > 0 && /[a-zA-Z]/.test(tex[back - 1])) back--;
      if (back > 0 && tex[back - 1] === '\\' && countPrecedingBackslashes(tex, back - 1) % 2 === 0) {
        s = back - 1;
        changed = true;
      }
    }
    if (e > 0 && e < tex.length && /[a-zA-Z]/.test(tex[e - 1]) && /[a-zA-Z]/.test(tex[e])) {
      let back = e;
      while (back > 0 && /[a-zA-Z]/.test(tex[back - 1])) back--;
      if (back > 0 && tex[back - 1] === '\\' && countPrecedingBackslashes(tex, back - 1) % 2 === 0) {
        while (e < tex.length && /[a-zA-Z*]/.test(tex[e])) e++;
        changed = true;
      }
    }

    // 1d. List \item header snapping: if s lands right after "\item " (only whitespace between \item and s), pull s back to include \item!
    for (const env of parsedAst.envNodes) {
      if (!env.items || env.items.length === 0) continue;
      for (const it of env.items) {
        if (it.itemCmdStart < s && s <= it.itemCmdEnd) {
          s = it.itemCmdStart;
          changed = true;
        } else if (it.itemCmdEnd < s && s < it.bodyEnd) {
          if (tex.slice(it.itemCmdEnd, s).trim() === '') {
            s = it.itemCmdStart;
            changed = true;
          }
        }
        if (it.itemCmdStart < e && e <= it.itemCmdEnd) {
          e = it.itemCmdStart;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // Step 2: Trim empty ghost tails/heads on wrapper boundaries
  // E.g. if s is at whitespace immediately before \end{dn} (whose \begin{dn} was < s), advance s past \end{dn}
  for (let pass = 0; pass < 4; pass++) {
    let adjusted = false;
    for (const w of allWrappers) {
      if (w.openEnd <= s && s <= w.closeStart && e >= w.closeEnd) {
        if (tex.slice(s, w.closeStart).trim() === '') {
          s = w.closeEnd;
          adjusted = true;
        }
      }
      if (s <= w.openStart && w.openEnd <= e && e <= w.closeStart) {
        if (tex.slice(w.openEnd, e).trim() === '') {
          e = w.openStart;
          adjusted = true;
        }
      }
    }
    if (!adjusted) break;
  }

  if (e <= s) {
    return {
      snappedStart: s,
      snappedEnd: s,
      reconstructedTex: '',
      recoveredEnvs: [],
      recoveredInlineFormats: []
    };
  }

  const sliceContainsToc = parsedAst.atomicSpans.some(
    (sp) => sp.kind === 'toc' && sp.start >= s && sp.end <= e
  );

  // Excise any ignored atomic spans (e.g. \begin{comment}, \end{comment}, \iffalse...\fi, \pagestyle{...},
  // \newpage, orphan \addcontentsline when TOC is not sliced, or unmatched \begin/\end tags) overlapping [s, e]
  let core = '';
  let cursor = s;
  for (const span of parsedAst.atomicSpans) {
    const shouldExcise =
      span.kind === 'ignored' || (span.kind === 'addcontentsline' && !sliceContainsToc);
    if (!shouldExcise) continue;
    if (span.end <= cursor) continue;
    if (span.start >= e) break;
    const cutStart = Math.max(s, span.start);
    const cutEnd = Math.min(e, span.end);
    if (cutStart > cursor) {
      core += tex.slice(cursor, cutStart);
    }
    const removedText = tex.slice(cutStart, cutEnd);
    core += removedText.includes('\n') ? '\n' : ' ';
    cursor = Math.max(cursor, cutEnd);
  }
  if (cursor < e) {
    core += tex.slice(cursor, e);
  }

  // Step 3: 3-Case Interval Containment Theorem for Openers & Closers
  // Missing opener: wrapper's opener ended at or before s, and s is strictly before closeStart
  // Missing closer: wrapper's opener ended strictly before e, and e is at or before closeStart
  const missingOpeners = [];
  const missingClosers = [];

  for (const w of allWrappers) {
    if (w.openEnd <= s && s < w.closeStart) {
      missingOpeners.push(w);
    }
    if (w.openEnd < e && e <= w.closeStart) {
      missingClosers.push(w);
    }
  }

  // Openers must be emitted outermost-to-innermost (openStart ascending)
  missingOpeners.sort((a, b) => a.openStart - b.openStart);
  // Closers must be emitted innermost-to-outermost (closeStart ascending)
  missingClosers.sort((a, b) => a.closeStart - b.closeStart);

  // Step 4: Check if any reconstructed list environment (enumerate / itemize / description) starts mid-item without \item
  // Notice: if missingOpeners includes a list environment L, and s is strictly inside one of L's items (s > it.itemCmdEnd),
  // we must inject it.itemCmdText (e.g. "\item ") right after L's opener!
  const prefixParts = [];
  const recoveredEnvs = [];
  const recoveredInlineFormats = [];

  for (const w of missingOpeners) {
    if (w.kind === 'env') {
      if (w.envName !== '__texgroup__') recoveredEnvs.push(w.envName);
      prefixParts.push(`${w.openerText}\n`);
      if (LIST_ENV_NAMES.has(w.envName) && w.items && w.items.length > 0) {
        const activeItem = w.items.find((it) => it.itemCmdEnd < s && s < it.bodyEnd);
        if (activeItem) {
          prefixParts.push(`${activeItem.itemCmdText} `);
        }
      }
    } else {
      if (w.cmdName !== 'group-switch') recoveredInlineFormats.push(w.cmdName);
      prefixParts.push(w.openerText);
    }
  }

  const suffixParts = [];
  for (const w of missingClosers) {
    if (w.kind === 'env') {
      if (w.envName !== '__texgroup__' && !recoveredEnvs.includes(w.envName)) {
        recoveredEnvs.push(w.envName);
      }
      suffixParts.push(`\n${w.closerText}`);
    } else {
      if (w.cmdName !== 'group-switch' && !recoveredInlineFormats.includes(w.cmdName)) {
        recoveredInlineFormats.push(w.cmdName);
      }
      suffixParts.push(w.closerText);
    }
  }

  let reconstructed = `${prefixParts.join('')}${core}${suffixParts.join('')}`;
  reconstructed = healOrphanBracesOutsideMath(reconstructed).trim();

  const effectiveCounterCutoff = missingOpeners.reduce(
    (minPos, w) => (w.kind === 'env' ? Math.min(minPos, w.openStart) : minPos),
    s
  );
  const countersBefore = computeCountersAtOffset(tex, effectiveCounterCutoff, parsedAst.preambleInfo);
  const hasNonZeroCounter =
    countersBefore.part > 0 ||
    countersBefore.chapter > 0 ||
    countersBefore.section > 0 ||
    countersBefore.subsection > 0 ||
    countersBefore.subsubsection > 0 ||
    countersBefore.equation > 0 ||
    Object.values(countersBefore.boxCounters || {}).some((v) => v > 0);
  if (hasNonZeroCounter && reconstructed) {
    reconstructed = `% @vectoria-slice-counters ${JSON.stringify(countersBefore)}\n${reconstructed}`;
  }

  return {
    snappedStart: s,
    snappedEnd: e,
    reconstructedTex: reconstructed,
    countersBefore,
    recoveredEnvs,
    recoveredInlineFormats
  };
}
