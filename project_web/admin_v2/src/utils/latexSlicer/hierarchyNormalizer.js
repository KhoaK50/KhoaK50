import {
  extractBalancedBraces,
  extractBalancedBrackets,
  expandMacrosSafely,
  stripBodyDeclarations,
  transpileCustomEnvironmentsAndColors,
  unwrapTexFormattingToPlainText,
  serializeUsedBoxStylesHeader,
  serializeVectoriaDocConfigHeader,
  splitTopLevelLatexRows
} from './preambleParser.js';

const HEADING_RANK = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4
};

const TARGET_HEADING_COMMANDS = ['section', 'subsection', 'subsubsection'];

const ACADEMIC_BOX_ENV_LIST = [
  'dn', 'definition', 'dinhnghia',
  'dl', 'theorem', 'dinhly', 'lemma', 'bode',
  'tc', 'property', 'properties', 'tinhchat', 'proposition', 'menhde',
  'vd', 'example', 'vidu',
  'hq', 'corollary', 'hequa',
  'nx', 'remark', 'nhanxet',
  'bt', 'exercise', 'baitap', 'btmau',
  'sol', 'solution', 'loigiai',
  'note', 'ghichu'
];

function stripPlainBookNumberPrefix(rawStr, allowPartKeyword = false) {
  if (!rawStr) return { text: '', stripped: false };
  const orig = rawStr.trim();
  let t = orig;

  // Strip patterns like "Chương 2:", "Chapter 3.", "Bài 2.4:", "Mục 1.2 -", "§3."
  const kwRe = allowPartKeyword
    ? /^(?:(?:Chương|Chuong|Chapter|Phần|Phan|Part|Mục|Muc|Chuyên\s+đề)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*)\s*[:.)-]*\s*)/i
    : /^(?:(?:Chương|Chuong|Chapter|Mục|Muc|Chuyên\s+đề)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*)\s*[:.)-]*\s*|Bài\s+\d+\.\d+(?:\.\d+)*\s*[:.)-]*\s*)/i;

  t = t.replace(kwRe, '');
  t = t.replace(/^\u00a7\s*\d+(?:\.\d+)*\s*[:.)-]*\s*/, '');

  // Strip multi-level dotted numeric prefixes like "1.2. ", "2.1.3 ", "1.2: "
  t = t.replace(/^\d+(?:\.\d+)+\.?\s*[:)-]?\s+/, '');

  // Strip single-level numbered prefix ONLY when followed by punctuation (".", ")", ":") like "1. Định nghĩa" or "2) Tính chất"
  t = t.replace(/^\d+\s*[.):]\s+/, '');

  // Strip Roman numeral prefix followed by dot/paren like "I. ", "II) "
  t = t.replace(/^[IVXLCDM]+\s*[.)]\s+/, '');

  const cleaned = t.trim();
  if (!cleaned) return { text: orig, stripped: false };
  return { text: cleaned, stripped: cleaned !== orig };
}

export function stripLeadingBookNumberFromHeading(titleStr, allowPartKeyword = false) {
  if (!titleStr) return { text: '', stripped: false };
  const trimmed = titleStr.trim();

  // Peel outer \textcolor[m]{col}{...} or \textbf{...} wrapper so leading book numbers inside colored headings are stripped while preserving color
  const twoArgMatch = /^\\(textcolor)\s*(?:\[[^\]]*\]\s*)?\{/.exec(trimmed);
  if (twoArgMatch) {
    const b1 = trimmed.indexOf('{');
    const g1 = extractBalancedBraces(trimmed, b1);
    if (g1) {
      let ws2 = g1.endIndex + 1;
      while (ws2 < trimmed.length && /\s/.test(trimmed[ws2])) ws2++;
      if (trimmed[ws2] === '{') {
        const g2 = extractBalancedBraces(trimmed, ws2);
        if (g2 && g2.endIndex === trimmed.length - 1) {
          const innerRes = stripLeadingBookNumberFromHeading(g2.content, allowPartKeyword);
          return {
            text: `${trimmed.slice(0, ws2 + 1)}${innerRes.text}}`,
            stripped: innerRes.stripped
          };
        }
      }
    }
  }

  const oneArgMatch = /^\\(textbf|textit|emph|underline)\s*\{/.exec(trimmed);
  if (oneArgMatch) {
    const b1 = trimmed.indexOf('{');
    const g1 = extractBalancedBraces(trimmed, b1);
    if (g1 && g1.endIndex === trimmed.length - 1) {
      const innerRes = stripLeadingBookNumberFromHeading(g1.content, allowPartKeyword);
      return {
        text: `\\${oneArgMatch[1]}{${innerRes.text}}`,
        stripped: innerRes.stripped
      };
    }
  }

  return stripPlainBookNumberPrefix(trimmed, allowPartKeyword);
}

export function cleanBoxOptionalTitle(rawOptTitle) {
  if (!rawOptTitle) return '';
  let t = rawOptTitle.trim();

  // Strip pure redundant labels like "Định nghĩa 1.4", "Định lý 2.3.1", "Ví dụ 5", "Bài tập 2.14", "Mệnh đề 1.2"
  const pureNumberedLabelRe =
    /^(?:Định\s*nghĩa|Định\s*lý|Định\s*lí|Bổ\s*đề|Mệnh\s*đề|Tính\s*chất|Hệ\s*quả|Nhận\s*xét|Ví\s*dụ|Bài\s*tập(?:\s*mẫu)?|Bài\s*toán|Bài|Câu|Chú\s*ý|Lưu\s*ý|Ghi\s*chú|Definition|Theorem|Lemma|Proposition|Corollary|Remark|Example|Exercise)\s*\d*(?:\.\d+)*\.?$/i;

  if (pureNumberedLabelRe.test(t) || /^\d+(?:\.\d+)*\.?$/.test(t)) {
    return '';
  }

  // Strip leading numbered label while preserving named theorem title, e.g. "Định lý 2.3 (Cayley - Hamilton)" -> "Cayley - Hamilton"
  t = t.replace(
    /^(?:Định\s*nghĩa|Định\s*lý|Định\s*lí|Bổ\s*đề|Mệnh\s*đề|Tính\s*chất|Hệ\s*quả|Nhận\s*xét|Ví\s*dụ|Bài\s*tập(?:\s*mẫu)?|Bài\s*toán|Bài|Câu|Definition|Theorem|Lemma|Proposition|Corollary|Remark|Example|Exercise)\s*\d+(?:\.\d+)*\s*[:.-]*\s*/i,
    ''
  );
  t = t.replace(/^\d+(?:\.\d+)+\s*[:.-]+\s*/, '');

  // Unwrap outer parentheses if the entire remaining title is wrapped in (...)
  if (t.startsWith('(') && t.endsWith(')')) {
    let depth = 0;
    let wrapsAll = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')') depth--;
      if (depth === 0 && i < t.length - 1) {
        wrapsAll = false;
        break;
      }
    }
    if (wrapsAll) {
      t = t.slice(1, -1).trim();
    }
  }

  return t;
}

function normalizeHeadingsInStitchedTex(texStr) {
  const headingRe = /\\(part|chapter|section|subsection|subsubsection)(\*)?\s*/g;
  const found = [];
  let m;

  while ((m = headingRe.exec(texStr)) !== null) {
    const cmdType = m[1];
    const isStarred = Boolean(m[2]);
    let cur = m.index + m[0].length;
    while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
    if (texStr[cur] === '[') {
      const optBr = extractBalancedBrackets(texStr, cur);
      if (optBr) {
        cur = optBr.endIndex + 1;
        while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
      }
    }
    if (texStr[cur] !== '{') continue;
    const titleGrp = extractBalancedBraces(texStr, cur);
    if (!titleGrp) continue;

    found.push({
      start: m.index,
      end: titleGrp.endIndex + 1,
      cmdType,
      isStarred,
      rank: HEADING_RANK[cmdType],
      rawTitle: titleGrp.content
    });
    headingRe.lastIndex = titleGrp.endIndex + 1;
  }

  if (found.length === 0) return texStr;

  // Keep \part / \part* as top-level centered part banners, and preserve \chapter when present so chapter headings never degrade into \section ("1 Title")
  const nonPartHeadings = found.filter((h) => h.cmdType !== 'part');
  const hasChapter = nonPartHeadings.some((h) => h.cmdType === 'chapter');
  const targetScale = hasChapter
    ? ['chapter', 'section', 'subsection', 'subsubsection']
    : TARGET_HEADING_COMMANDS;
  const distinctRanks = Array.from(new Set(nonPartHeadings.map((h) => h.rank))).sort((a, b) => a - b);
  const rankToTargetCmd = new Map();
  distinctRanks.forEach((rk, idx) => {
    const targetCmd = targetScale[Math.min(idx, targetScale.length - 1)];
    rankToTargetCmd.set(rk, targetCmd);
  });

  // Determine the position of the first NUMBERED top-level 'section' (when chapter-less) so leading orphan numbered sub-headings are promoted cleanly instead of numbering 1.1 before 1
  let firstNumberedTopSectionPos = Infinity;
  if (!hasChapter) {
    for (const h of nonPartHeadings) {
      const { stripped: stCheck } = stripLeadingBookNumberFromHeading(h.rawTitle, false);
      const willStayStarred = h.isStarred && !stCheck;
      if (!willStayStarred && (rankToTargetCmd.get(h.rank) || 'section') === 'section') {
        firstNumberedTopSectionPos = h.start;
        break;
      }
    }
  }

  let out = texStr;
  for (let i = found.length - 1; i >= 0; i--) {
    const h = found[i];
    if (h.cmdType === 'part') {
      const { text: cleanPartTitle } = stripLeadingBookNumberFromHeading(h.rawTitle, true);
      const starMark = h.isStarred ? '*' : '';
      const repPart = `\\part${starMark}{${cleanPartTitle}}`;
      out = out.substring(0, h.start) + repPart + out.substring(h.end);
      continue;
    }

    const { text: cleanTitle, stripped } = stripLeadingBookNumberFromHeading(h.rawTitle, false);
    // Preserve '*' on unnumbered exam/problem headings unless a hardcoded dotted book number (e.g. "2.1.3 ") was stripped
    const keepStar = h.isStarred && !stripped;
    let targetCmd = rankToTargetCmd.get(h.rank) || (hasChapter ? h.cmdType : 'section');
    if (!hasChapter && !keepStar && h.start < firstNumberedTopSectionPos && targetCmd !== 'section') {
      targetCmd = 'section';
    }
    const replacement = `\\${targetCmd}${keepStar ? '*' : ''}{${cleanTitle}}`;
    out = out.substring(0, h.start) + replacement + out.substring(h.end);
  }

  return out;
}

function normalizeBoxTitlesAndExerciseNumbers(texStr) {
  let out = texStr;

  // 1. Clean redundant hardcoded numeric prefixes in \begin{dn}[...], \begin{dl}[...], etc. (brace-aware bracket extraction!)
  const envGroupPattern = ACADEMIC_BOX_ENV_LIST.join('|');
  const boxOpenRe = new RegExp(`\\\\begin\\{(?:${envGroupPattern})\\}`, 'g');
  const boxEdits = [];
  let bmBox;
  while ((bmBox = boxOpenRe.exec(out)) !== null) {
    let cur = bmBox.index + bmBox[0].length;
    while (cur < out.length && (out[cur] === ' ' || out[cur] === '\t')) cur++;
    if (out[cur] === '[') {
      const optBr = extractBalancedBrackets(out, cur);
      if (optBr) {
        const cleanedOpt = cleanBoxOptionalTitle(optBr.content);
        const rep = cleanedOpt ? `${bmBox[0]}[${cleanedOpt}]` : bmBox[0];
        boxEdits.push({ start: bmBox.index, end: optBr.endIndex + 1, rep });
        boxOpenRe.lastIndex = optBr.endIndex + 1;
      }
    }
  }
  for (let i = boxEdits.length - 1; i >= 0; i--) {
    out = out.substring(0, boxEdits[i].start) + boxEdits[i].rep + out.substring(boxEdits[i].end);
  }

  // 2. Re-index \bai{Bài 2.15...} sequentially from 1
  let baiCounter = 0;
  const baiRe = /\\bai\s*\{/g;
  let bm;
  const baiEdits = [];
  while ((bm = baiRe.exec(out)) !== null) {
    const braceIdx = out.indexOf('{', bm.index);
    const grp = extractBalancedBraces(out, braceIdx);
    if (!grp) continue;
    const inner = grp.content.trim();
    const matchHardcoded = /^(Bài(?:\s*tập|\s*toán)?|Câu(?:\s*hỏi)?|Ví\s*dụ)\s*\d+(?:\.\d+)*\s*([:.)]*)(.*)$/i.exec(inner);
    if (matchHardcoded) {
      baiCounter++;
      const noun = matchHardcoded[1];
      const punct = matchHardcoded[2] || '.';
      const tail = matchHardcoded[3] ? ` ${matchHardcoded[3].trim()}` : '';
      baiEdits.push({
        start: bm.index,
        end: grp.endIndex + 1,
        rep: `\\bai{${noun} ${baiCounter}${punct}${tail}}`
      });
    }
    baiRe.lastIndex = grp.endIndex + 1;
  }
  for (let i = baiEdits.length - 1; i >= 0; i--) {
    const ed = baiEdits[i];
    out = out.substring(0, ed.start) + ed.rep + out.substring(ed.end);
  }

  // 3. Re-index hardcoded exercise item labels like \item[Bài 2.15.] or \item[Câu 14:] sequentially from 1
  // Sub-items like \item[a)], \item[(i)], \item[Bước 1:] are preserved untouched
  let itemExCounter = 0;
  out = out.replace(
    /\\item\s*\[\s*(Bài(?:\s*tập|\s*toán)?|Câu(?:\s*hỏi)?)\s*\d+(?:\.\d+)*\s*([:.)]*)\s*\]/gi,
    (full, noun, punct) => {
      itemExCounter++;
      const p = punct || '.';
      return `\\item[${noun} ${itemExCounter}${p}]`;
    }
  );

  return out;
}

function mergeAdjacentHomogeneousLists(texStr) {
  if (!texStr) return '';
  let out = texStr;
  // Only merge adjacent homogeneous lists when the second list does NOT specify a custom [label=...] override
  out = out.replace(/\\end\{enumerate\}\s*\\begin\{enumerate\}(?!\s*\[)/g, '\n');
  out = out.replace(/\\end\{itemize\}\s*\\begin\{itemize\}(?!\s*\[)/g, '\n');
  out = out.replace(/\\end\{tasks\}\s*\\begin\{tasks\}(?!\s*\[|\s*\()/g, '\n');
  return out;
}

function expandMaketitleIfPresent(texStr, preambleData) {
  if (!texStr || !/\\maketitle\b/.test(texStr)) return texStr;
  const meta = preambleData?.docMeta;
  if (!meta || (!meta.title && !meta.author)) {
    return texStr.replace(/\\maketitle\b/g, '');
  }
  const lines = [];
  if (meta.title) lines.push(`{\\LARGE\\textbf{${meta.title.trim()}}}`);
  if (meta.author) lines.push(`\\textbf{${meta.author.replace(/\\and\b/g, ', ').trim()}}`);
  if (meta.date && !/^\\today\b/.test(meta.date.trim())) lines.push(meta.date.trim());
  const block = `\\begin{center}\n${lines.join('\\\\[0.25cm]\n')}\n\\end{center}`;
  return texStr.replace(/\\maketitle\b/g, () => block);
}

function resolveCrossReferences(texStr, preambleData, normalizeHierarchy = true) {
  if (!texStr) return { resolvedTex: '', danglingRefs: [], stitchedLabelMap: new Map() };

  const localLabels = new Map();
  const initC = !normalizeHierarchy
    ? preambleData?.initialCounters || preambleData?.layoutConfig?.initialCounters || {}
    : {};
  const docClass = preambleData?.docClass || preambleData?.layoutConfig?.docClass || 'article';
  const eqWithin = normalizeHierarchy
    ? /\\chapter(?![a-zA-Z*])/.test(texStr)
      ? 'chapter'
      : ''
    : preambleData?.equationWithin !== undefined
      ? preambleData.equationWithin
      : preambleData?.layoutConfig?.equationWithin !== undefined
        ? preambleData.layoutConfig.equationWithin
        : docClass === 'report' || docClass === 'book'
          ? 'chapter'
          : '';

  let chap = initC.chapter || 0;
  let sec = initC.section || 0;
  let subsec = initC.subsection || 0;
  let subsubsec = initC.subsubsection || 0;
  let eq = initC.equation || 0;
  let fig = 0;
  let tbl = 0;
  let boxCounters = {};
  let fallbackSeq = 1;
  let currentTarget = null;

  const formatEqLocal = (n) => {
    if (eqWithin === 'chapter' && chap > 0) return `${chap}.${n}`;
    if (eqWithin === 'section' && sec > 0) return `${chap > 0 ? `${chap}.${sec}` : `${sec}`}.${n}`;
    return `${n}`;
  };

  const canonicalBoxSet = new Set(['dn', 'dl', 'tc', 'vd', 'hq', 'nx', 'bt', 'btmau']);
  const scanRe =
    /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{([a-zA-Z0-9_*]+)\}(?:\s*\{([+-]?\d+)\})?|\\(chapter|section|subsection|subsubsection)(\*)?(?![a-zA-Z@])|\\begin\s*\{([a-zA-Z0-9_*]+)\}|\\label\s*\{([^}]+)\}/g;

  let m;
  while ((m = scanRe.exec(texStr)) !== null) {
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
      if (cName === 'chapter') chap = applyOp(chap);
      else if (cName === 'section') sec = applyOp(sec);
      else if (cName === 'subsection') subsec = applyOp(subsec);
      else if (cName === 'subsubsection') subsubsec = applyOp(subsubsec);
      else if (cName === 'equation') eq = applyOp(eq);
      else if (cName !== 'tocdepth' && cName !== 'secnumdepth') {
        const bKey = preambleData?.customEnvs?.get(cName)?.canonicalEnv || cName;
        boxCounters[bKey] = applyOp(boxCounters[bKey] || 0);
      }
      continue;
    }

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
          currentTarget = `${chap}`;
        } else if (hType === 'section') {
          sec++;
          subsec = 0;
          subsubsec = 0;
          if (eqWithin === 'section') eq = 0;
          currentTarget = chap > 0 ? `${chap}.${sec}` : `${sec}`;
        } else if (hType === 'subsection') {
          subsec++;
          subsubsec = 0;
          currentTarget = chap > 0 ? `${chap}.${sec}.${subsec}` : `${sec}.${subsec}`;
        } else if (hType === 'subsubsection') {
          subsubsec++;
          currentTarget =
            chap > 0 ? `${chap}.${sec}.${subsec}.${subsubsec}` : `${sec}.${subsec}.${subsubsec}`;
        }
      }
      continue;
    }

    if (m[6]) {
      const envName = m[6].trim();
      const isStarEnv = envName.endsWith('*');
      const baseEnv = envName.replace(/\*$/, '');

      if (
        !isStarEnv &&
        ['equation', 'align', 'gather', 'multline', 'eqnarray', 'flalign', 'alignat'].includes(baseEnv)
      ) {
        const closeRe = new RegExp(`\\\\end\\s*\\{${envName.replace(/\*/g, '\\*')}\\}`, 'g');
        closeRe.lastIndex = scanRe.lastIndex;
        const closeMatch = closeRe.exec(texStr);
        const envBodyEnd = closeMatch ? closeMatch.index : texStr.length;
        const envBody = texStr.slice(scanRe.lastIndex, envBodyEnd);
        const isMultiRow = ['align', 'gather', 'eqnarray', 'flalign', 'alignat'].includes(baseEnv);
        const rows = isMultiRow ? splitTopLevelLatexRows(envBody).map((r) => r.text) : [envBody];
        for (const row of rows) {
          if (!row.trim()) continue;
          const hasNoNum = /\\(?:notag|nonumber)\b/.test(row);
          const tagMatch = /\\tag\*?\s*\{([^}]*)\}/.exec(row);
          let rowNum = '';
          if (tagMatch) {
            rowNum = tagMatch[1].trim();
          } else if (!hasNoNum) {
            eq++;
            rowNum = formatEqLocal(eq);
          }
          const rowLblRe = /\\label\s*\{([^}]+)\}/g;
          let rlm;
          while ((rlm = rowLblRe.exec(row)) !== null) {
            const lk = rlm[1].trim();
            if (lk && !localLabels.has(lk)) {
              localLabels.set(lk, rowNum || formatEqLocal(Math.max(1, eq)));
            }
          }
        }
        scanRe.lastIndex = closeMatch ? closeMatch.index + closeMatch[0].length : envBodyEnd;
        continue;
      }

      if (!isStarEnv && baseEnv === 'figure') {
        fig++;
        currentTarget = chap > 0 ? `${chap}.${fig}` : `${fig}`;
        continue;
      }
      if (!isStarEnv && baseEnv === 'table') {
        tbl++;
        currentTarget = chap > 0 ? `${chap}.${tbl}` : `${tbl}`;
        continue;
      }
      if (!isStarEnv && canonicalBoxSet.has(baseEnv)) {
        const bucket = baseEnv === 'btmau' ? 'bt' : baseEnv;
        boxCounters[bucket] = (boxCounters[bucket] || 0) + 1;
        currentTarget = chap > 0 ? `${chap}.${boxCounters[bucket]}` : `${boxCounters[bucket]}`;
      }
      continue;
    }

    if (m[7]) {
      const key = m[7].trim();
      if (key && !localLabels.has(key)) {
        localLabels.set(key, currentTarget || `${fallbackSeq++}`);
      }
    }
  }

  const danglingSet = new Set();
  const globalLabels = preambleData?.globalLabels;
  const hCfg = preambleData?.hyperrefConfig;
  const useHyperColor = Boolean(hCfg && hCfg.colorlinks && !hCfg.hidelinks && hCfg.linkcolor);
  const linkCol = useHyperColor ? hCfg.linkcolor : '';
  const wrapHyperNum = (numStr) => (useHyperColor ? `\\textcolor{${linkCol}}{${numStr}}` : `${numStr}`);

  let out = texStr;

  out = out.replace(/\\eqref\s*\{([^}]+)\}/g, (full, rawKey) => {
    const key = rawKey.trim();
    if (!normalizeHierarchy && globalLabels && globalLabels.has(key)) {
      const gEntry = globalLabels.get(key);
      const num = gEntry.formattedNum || `${gEntry.globalSeq}`;
      if (!localLabels.has(key)) danglingSet.add(key);
      return `(${wrapHyperNum(num)})`;
    }
    if (localLabels.has(key)) {
      return `(${wrapHyperNum(localLabels.get(key))})`;
    }
    danglingSet.add(key);
    if (globalLabels && globalLabels.has(key)) {
      const gEntry = globalLabels.get(key);
      return `(${wrapHyperNum(gEntry.formattedNum || `${gEntry.globalSeq}`)})`;
    }
    return '(*)';
  });

  out = out.replace(/\\ref\s*\{([^}]+)\}/g, (full, rawKey) => {
    const key = rawKey.trim();
    if (!normalizeHierarchy && globalLabels && globalLabels.has(key)) {
      const gEntry = globalLabels.get(key);
      const num = gEntry.formattedNum || `${gEntry.globalSeq}`;
      if (!localLabels.has(key)) danglingSet.add(key);
      return wrapHyperNum(num);
    }
    if (localLabels.has(key)) {
      return wrapHyperNum(localLabels.get(key));
    }
    danglingSet.add(key);
    if (globalLabels && globalLabels.has(key)) {
      const gEntry = globalLabels.get(key);
      return wrapHyperNum(gEntry.formattedNum || `${gEntry.globalSeq}`);
    }
    return '*';
  });

  if (!normalizeHierarchy && globalLabels && globalLabels.size > 0) {
    out = out.replace(/(\\begin\{equation\})([\s\S]*?)(\\end\{equation\})/g, (full, openTag, body, closeTag) => {
      if (/\\tag\*?\b/.test(body) || /\\(?:notag|nonumber)\b/.test(body)) return full;
      const lm = /\\label\s*\{([^}]+)\}/.exec(body);
      if (!lm) return full;
      const lk = lm[1].trim();
      const gEntry = globalLabels.get(lk);
      if (gEntry && gEntry.formattedNum && gEntry.formattedNum !== localLabels.get(lk)) {
        return `${openTag}${body}\\tag{${gEntry.formattedNum}}${closeTag}`;
      }
      return full;
    });
  }

  const stitchedLabelMap = new Map();
  if (globalLabels && typeof globalLabels.forEach === 'function') {
    globalLabels.forEach((entry, key) => {
      stitchedLabelMap.set(key, {
        formattedNum: entry.formattedNum || `${entry.globalSeq || ''}`,
        anchorId: entry.anchorId || ''
      });
    });
  }
  localLabels.forEach((numVal, key) => {
    const existing = stitchedLabelMap.get(key);
    const keepGlobal = !normalizeHierarchy && existing && existing.formattedNum;
    stitchedLabelMap.set(key, {
      formattedNum: keepGlobal ? existing.formattedNum : `${numVal}`,
      anchorId: existing?.anchorId || `eq-lbl-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    });
  });

  out = out.replace(/\\label\s*\{[^}]*\}/g, '');

  return {
    resolvedTex: out,
    danglingRefs: Array.from(danglingSet),
    stitchedLabelMap
  };
}

export function extractSuggestedLessonTitle(texStr, maxLen = 140) {
  if (!texStr) return '';

  // 1. Prefer first chapter/section/subsection heading; fall back to \part if no section heading exists
  const secHeadingRe = /\\(?:chapter|section|subsection|subsubsection)\*?(?:\s*\[[^\]]*\])?\s*\{/;
  const partHeadingRe = /\\part\*?(?:\s*\[[^\]]*\])?\s*\{/;
  const hm = secHeadingRe.exec(texStr) || partHeadingRe.exec(texStr);
  let candidate = '';
  if (hm) {
    const bIdx = texStr.indexOf('{', hm.index);
    const grp = extractBalancedBraces(texStr, bIdx);
    if (grp) candidate = grp.content;
  }

  // 2. Fallback: first academic box optional title
  if (!candidate) {
    const boxMatch = /\\begin\{(?:dn|dl|tc|vd|bt|menhde|bode)\}\s*\[([^\]]+)\]/.exec(texStr);
    if (boxMatch) candidate = boxMatch[1];
  }

  if (!candidate) return '';

  const unwrapped = unwrapTexFormattingToPlainText(candidate);
  const { text: stripped } = stripPlainBookNumberPrefix(unwrapped, false);
  let clean = stripped
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen - 3).trim() + '...';
  }
  return clean;
}

function estimateLessonMetrics(texStr) {
  if (!texStr) return { suggestedTimeMinutes: 15, suggestedBloomLevel: 1.5 };
  const plainWords = texStr
    .replace(/\\[a-zA-Z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const displayEqCount = (texStr.match(/\$\$|\\\[|\\begin\{(?:equation|align|gather|bmatrix|pmatrix)/g) || []).length;
  const proofCount = (texStr.match(/\\begin\{proof\}|\\lgiai\b|chứng minh/gi) || []).length;
  const exerciseCount = (texStr.match(/\\begin\{(?:bt|btmau)\}|\\bai\{|\\boxpair\b/g) || []).length;

  const estimatedMinutes = Math.max(
    5,
    Math.min(90, Math.ceil(plainWords / 140 + displayEqCount * 0.8 + proofCount * 2.5 + exerciseCount * 3))
  );

  let bloom = 1.5;
  if (proofCount >= 2 || /định lý|chứng minh|trực chuẩn|chéo hóa/i.test(texStr)) {
    bloom = 3.0;
  } else if (exerciseCount >= 2 || /tính|giải hệ|tìm cơ sở|áp dụng/i.test(texStr)) {
    bloom = 2.0;
  } else if (plainWords < 180) {
    bloom = 1.0;
  }

  return {
    suggestedTimeMinutes: estimatedMinutes,
    suggestedBloomLevel: bloom
  };
}

export function canonicalizeSlicedSegmentTex(rawSliceTex, preambleData = null) {
  if (!rawSliceTex || typeof rawSliceTex !== 'string') {
    return { canonicalTex: '', countersBefore: null };
  }
  let chunk = rawSliceTex;
  let countersBefore = null;
  const cntM = /^[ \t]*%[ \t]*@vectoria-slice-counters[ \t]+(\{[^\r\n]+\})[ \t]*\r?\n?/.exec(chunk);
  if (cntM) {
    try {
      countersBefore = JSON.parse(cntM[1]);
    } catch {
      countersBefore = null;
    }
    chunk = chunk.slice(cntM[0].length);
  }
  chunk = chunk
    .replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, '')
    .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, '')
    .replace(/\\(?:begin|end)\s*\{comment\}/g, '');
  chunk = stripBodyDeclarations(chunk);
  chunk = expandMaketitleIfPresent(chunk, preambleData);
  if (preambleData?.macroTable && preambleData.macroTable.size > 0) {
    chunk = expandMacrosSafely(chunk, preambleData.macroTable);
  }
  chunk = transpileCustomEnvironmentsAndColors(chunk, preambleData);
  return {
    canonicalTex: chunk.trim(),
    countersBefore
  };
}

export function createHeadingNormalizerRunner(segments, normalizeHierarchy = true) {
  if (!normalizeHierarchy || !Array.isArray(segments) || segments.length === 0) {
    return null;
  }
  const headingRe = /\\(part|chapter|section|subsection|subsubsection)(\*)?\s*/g;
  const nonPartRanks = [];
  let hasChapter = false;

  for (const seg of segments) {
    const texStr = seg?.reconstructedTex || seg?.slicedTex || '';
    if (!texStr) continue;
    headingRe.lastIndex = 0;
    let m;
    while ((m = headingRe.exec(texStr)) !== null) {
      const cmdType = m[1];
      let cur = m.index + m[0].length;
      while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
      if (texStr[cur] === '[') {
        const optBr = extractBalancedBrackets(texStr, cur);
        if (optBr) {
          cur = optBr.endIndex + 1;
          while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
        }
      }
      if (texStr[cur] !== '{') continue;
      const titleGrp = extractBalancedBraces(texStr, cur);
      if (!titleGrp) continue;
      if (cmdType !== 'part') {
        if (cmdType === 'chapter') hasChapter = true;
        nonPartRanks.push(HEADING_RANK[cmdType]);
      }
      headingRe.lastIndex = titleGrp.endIndex + 1;
    }
  }

  const targetScale = hasChapter
    ? ['chapter', 'section', 'subsection', 'subsubsection']
    : TARGET_HEADING_COMMANDS;
  const distinctRanks = Array.from(new Set(nonPartRanks)).sort((a, b) => a - b);
  const rankToTargetCmd = new Map();
  distinctRanks.forEach((rk, idx) => {
    rankToTargetCmd.set(rk, targetScale[Math.min(idx, targetScale.length - 1)]);
  });

  const runner = {
    seenFirstNumberedTopSection: false,
    transform(headingType, isStarred, rawTitle) {
      if (headingType === 'part') {
        const { text: cleanPartTitle } = stripLeadingBookNumberFromHeading(rawTitle, true);
        return {
          headingType: 'part',
          isStarred,
          rawTitle: cleanPartTitle
        };
      }
      if (headingType === 'paragraph' || headingType === 'subparagraph') {
        return { headingType, isStarred, rawTitle };
      }
      const rk = HEADING_RANK[headingType];
      if (rk === undefined) {
        return { headingType, isStarred, rawTitle };
      }
      const { text: cleanTitle, stripped } = stripLeadingBookNumberFromHeading(rawTitle, false);
      const keepStar = Boolean(isStarred) && !stripped;
      const rawMappedCmd = rankToTargetCmd.get(rk) || (hasChapter ? headingType : 'section');
      let targetCmd = rawMappedCmd;
      if (!hasChapter && !keepStar) {
        if (rawMappedCmd === 'section') {
          runner.seenFirstNumberedTopSection = true;
        } else if (!runner.seenFirstNumberedTopSection) {
          targetCmd = 'section';
        }
      }
      return {
        headingType: targetCmd,
        isStarred: keepStar,
        rawTitle: cleanTitle
      };
    }
  };
  return runner;
}

function buildStitchedTocEntriesFromTex(texStr) {
  if (!texStr) return [];
  const entries = [];
  let chap = 0;
  let sec = 0;
  let subsec = 0;
  let subsubsec = 0;
  const levelMap = { part: -1, chapter: 0, section: 1, subsection: 2, subsubsection: 3 };
  const tokRe =
    /\\(setcounter|addtocounter|stepcounter|refstepcounter)\s*\{(chapter|section|subsection|subsubsection)\}(?:\s*\{([+-]?\d+)\})?|\\(part|chapter|section|subsection|subsubsection)(\*)?\s*|\\(addcontentsline)\s*\{toc\}\s*\{(part|chapter|section|subsection|subsubsection)\}\s*\{/g;
  let m;
  while ((m = tokRe.exec(texStr)) !== null) {
    if (m[1]) {
      const op = m[1];
      const cn = m[2];
      const val = m[3] !== undefined ? parseInt(m[3], 10) : 0;
      const apply = (p) => (op === 'setcounter' ? val : op === 'addtocounter' ? p + val : p + 1);
      if (cn === 'chapter') chap = apply(chap);
      else if (cn === 'section') sec = apply(sec);
      else if (cn === 'subsection') subsec = apply(subsec);
      else if (cn === 'subsubsection') subsubsec = apply(subsubsec);
      continue;
    }
    if (m[6] === 'addcontentsline') {
      const lvlType = m[7];
      const bIdx = texStr.lastIndexOf('{', m.index + m[0].length);
      const grp = extractBalancedBraces(texStr, bIdx);
      if (!grp) continue;
      tokRe.lastIndex = grp.endIndex + 1;
      const rawTitle = grp.content.trim();
      entries.push({
        type: lvlType,
        levelNum: levelMap[lvlType] ?? 1,
        numLabel: '',
        rawTitle,
        title: rawTitle,
        cleanTitle: unwrapTexFormattingToPlainText(rawTitle),
        isManualAdd: true
      });
      continue;
    }
    const hType = m[4];
    const isStar = Boolean(m[5]);
    let cur = m.index + m[0].length;
    while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
    if (texStr[cur] === '[') {
      const obr = extractBalancedBrackets(texStr, cur);
      if (obr) {
        cur = obr.endIndex + 1;
        while (cur < texStr.length && /\s/.test(texStr[cur])) cur++;
      }
    }
    if (texStr[cur] !== '{') continue;
    const tGrp = extractBalancedBraces(texStr, cur);
    if (!tGrp) continue;
    tokRe.lastIndex = tGrp.endIndex + 1;
    if (isStar) continue;

    const rawTitle = tGrp.content.trim();
    const cleanTitle = unwrapTexFormattingToPlainText(rawTitle);
    let numLabel = '';
    if (hType === 'chapter') {
      chap++;
      sec = 0;
      subsec = 0;
      subsubsec = 0;
      numLabel = `${chap}`;
    } else if (hType === 'section') {
      sec++;
      subsec = 0;
      subsubsec = 0;
      numLabel = chap > 0 ? `${chap}.${sec}` : `${sec}`;
    } else if (hType === 'subsection') {
      subsec++;
      subsubsec = 0;
      const sBase = sec || 1;
      numLabel = chap > 0 ? `${chap}.${sBase}.${subsec}` : `${sBase}.${subsec}`;
    } else if (hType === 'subsubsection') {
      subsubsec++;
      const sBase = sec || 1;
      const ssBase = subsec || 1;
      numLabel = chap > 0 ? `${chap}.${sBase}.${ssBase}.${subsubsec}` : `${sBase}.${ssBase}.${subsubsec}`;
    }
    entries.push({
      type: hType,
      levelNum: levelMap[hType] ?? 1,
      numLabel,
      rawTitle,
      title: rawTitle,
      cleanTitle,
      isManualAdd: false
    });
  }
  return entries;
}

export function composeAndNormalizeSegments(segments, options = {}, preambleData = null) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      finalBodyTex: '',
      wrappedDocumentTex: '',
      suggestedTitle: '',
      suggestedTimeMinutes: 15,
      suggestedBloomLevel: 1.5,
      danglingRefs: [],
      overlappingSegmentPairs: [],
      stitchedLabelMap: new Map(),
      stitchedTocEntries: []
    };
  }

  const normalizeHierarchy = options.normalizeHierarchy !== false;
  const mergeAdjacentLists = options.mergeAdjacentLists !== false;

  const overlappingSegmentPairs = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      if (
        typeof a.snappedStart === 'number' &&
        typeof b.snappedStart === 'number' &&
        Math.max(a.snappedStart, b.snappedStart) < Math.min(a.snappedEnd, b.snappedEnd)
      ) {
        overlappingSegmentPairs.push([i + 1, j + 1]);
      }
    }
  }

  const processedParts = segments
    .map((seg, segIdx) => {
      let chunk = seg.reconstructedTex || seg.slicedTex || '';
      let snapCnt = seg.countersBefore || null;
      const cntM = /^[ \t]*%[ \t]*@vectoria-slice-counters[ \t]+(\{[^\r\n]+\})[ \t]*\r?\n?/.exec(chunk);
      if (cntM) {
        try {
          snapCnt = JSON.parse(cntM[1]);
        } catch {
          // Ignore malformed counter comment
        }
        chunk = chunk.slice(cntM[0].length);
      }
      chunk = expandMaketitleIfPresent(chunk, preambleData);
      if (preambleData?.macroTable && preambleData.macroTable.size > 0) {
        chunk = expandMacrosSafely(chunk, preambleData.macroTable);
      }
      chunk = transpileCustomEnvironmentsAndColors(chunk, preambleData);
      chunk = chunk.trim();
      if (!chunk) return '';

      if (!normalizeHierarchy && snapCnt && typeof snapCnt === 'object') {
        const restoreLines = [];
        for (const k of ['part', 'chapter', 'section', 'subsection', 'subsubsection', 'equation']) {
          const val = typeof snapCnt[k] === 'number' ? snapCnt[k] : 0;
          if (segIdx > 0 || val > 0) {
            restoreLines.push(`\\setcounter{${k}}{${val}}`);
          }
        }
        if (snapCnt.boxCounters && typeof snapCnt.boxCounters === 'object') {
          for (const [bKey, bVal] of Object.entries(snapCnt.boxCounters)) {
            if (typeof bVal === 'number' && (segIdx > 0 || bVal > 0)) {
              restoreLines.push(`\\setcounter{${bKey}}{${bVal}}`);
            }
          }
        }
        if (restoreLines.length > 0) {
          chunk = `${restoreLines.join('\n')}\n${chunk}`;
        }
      }
      return chunk;
    })
    .filter(Boolean);

  let stitched = processedParts.join('\n\n');

  if (normalizeHierarchy && mergeAdjacentLists) {
    stitched = mergeAdjacentHomogeneousLists(stitched);
  }

  const suggestedTitle = extractSuggestedLessonTitle(stitched, 140);

  if (normalizeHierarchy) {
    stitched = stitched.replace(
      /\\(?:setcounter|addtocounter)\s*\{(?!tocdepth\b|secnumdepth\b)[^}]*\}\s*\{[^}]*\}/g,
      ''
    );
    stitched = stitched.replace(
      /\\(?:stepcounter|refstepcounter)\s*\{(?!tocdepth\b|secnumdepth\b)[^}]*\}/g,
      ''
    );
    stitched = normalizeHeadingsInStitchedTex(stitched);
    stitched = normalizeBoxTitlesAndExerciseNumbers(stitched);
  }

  const { resolvedTex, danglingRefs, stitchedLabelMap } = resolveCrossReferences(
    stitched,
    preambleData,
    normalizeHierarchy
  );
  stitched = resolvedTex.replace(/\n{3,}/g, '\n\n').trim();
  const stitchedTocEntries = buildStitchedTocEntriesFromTex(stitched);

  const { suggestedTimeMinutes, suggestedBloomLevel } = estimateLessonMetrics(stitched);

  let extraDocConfig = null;
  if (/\\tableofcontents(?![a-zA-Z@])/.test(stitched)) {
    const rawTocSource = Array.isArray(options.manuscriptTocEntries)
      ? options.manuscriptTocEntries
      : Array.isArray(preambleData?.tocEntries)
        ? preambleData.tocEntries
        : [];
    if (rawTocSource.length > 0) {
      const serializedToc = rawTocSource.map((entry) => {
        let t = entry.rawTitle || entry.title || entry.cleanTitle || '';
        if (preambleData?.macroTable && preambleData.macroTable.size > 0) {
          t = expandMacrosSafely(t, preambleData.macroTable);
        }
        t = transpileCustomEnvironmentsAndColors(t, preambleData).trim();
        return {
          type: entry.type || 'section',
          levelNum: typeof entry.levelNum === 'number' ? entry.levelNum : 1,
          numLabel: entry.numLabel || '',
          title: t,
          cleanTitle: entry.cleanTitle || unwrapTexFormattingToPlainText(t),
          isManualAdd: Boolean(entry.isManualAdd)
        };
      });
      extraDocConfig = { tocEntries: serializedToc };
    }
  }

  const headerTag = normalizeHierarchy
    ? '% @vectoria-standalone-lesson\n'
    : '% @vectoria-extracted-lesson\n';
  const boxStyleHeader = serializeUsedBoxStylesHeader(stitched, preambleData);
  const boxStyleLine = boxStyleHeader ? `${boxStyleHeader}\n` : '';
  const docConfigHeader = serializeVectoriaDocConfigHeader(preambleData, extraDocConfig);
  const docConfigLine = docConfigHeader ? `${docConfigHeader}\n` : '';

  const wrappedDocumentTex = `${headerTag}${boxStyleLine}${docConfigLine}\\begin{document}\n\n${stitched}\n\n\\end{document}`;

  return {
    finalBodyTex: stitched,
    wrappedDocumentTex,
    suggestedTitle,
    suggestedTimeMinutes,
    suggestedBloomLevel,
    danglingRefs,
    overlappingSegmentPairs,
    stitchedLabelMap,
    stitchedTocEntries
  };
}
