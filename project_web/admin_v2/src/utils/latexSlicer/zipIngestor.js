const IGNORED_EXTENSIONS = [
  '.aux', '.log', '.toc', '.out', '.bbl', '.blg', '.fls',
  '.fdb_latexmk', '.synctex', '.gz', '.nav', '.snm', '.vrb',
  '.idx', '.ilg', '.ind', '.lof', '.lot', '.bcf', '.xml'
];

const RASTER_WEB_MIMES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

export function normalizePosixPath(rawPath) {
  if (!rawPath) return '';
  const parts = String(rawPath).replace(/\\/g, '/').split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

export function cleanTextEncoding(rawStr) {
  if (!rawStr) return '';
  return String(rawStr).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function stripLatexCommentsSafe(text) {
  if (!text) return '';
  return cleanTextEncoding(text)
    .split('\n')
    .map((line) => {
      let inUrl = false;
      let urlDepth = 0;
      for (let i = 0; i < line.length; i++) {
        if (line.slice(i, i + 5) === '\\url{' || line.slice(i, i + 6) === '\\href{') {
          inUrl = true;
          urlDepth = 1;
          i += line.slice(i, i + 5) === '\\url{' ? 4 : 5;
          continue;
        }
        if (inUrl) {
          if (line[i] === '{') urlDepth++;
          else if (line[i] === '}') {
            urlDepth--;
            if (urlDepth <= 0) inUrl = false;
          }
          continue;
        }
        if (line[i] === '%') {
          let backslashes = 0;
          let j = i - 1;
          while (j >= 0 && line[j] === '\\') {
            backslashes++;
            j--;
          }
          if (backslashes % 2 === 0) {
            return line.substring(0, i);
          }
        }
      }
      return line;
    })
    .join('\n');
}

function isStyleOrMacroPath(pathStr) {
  if (!pathStr) return false;
  const norm = pathStr.toLowerCase().replace(/\\/g, '/');
  const base = norm.split('/').pop().replace(/\.tex$/, '');
  return (
    norm.endsWith('.sty') ||
    norm.endsWith('.cls') ||
    base === 'setup' ||
    base === 'macros' ||
    base === 'macro' ||
    base === 'config' ||
    base === 'style' ||
    base === 'preamble' ||
    base === 'packages' ||
    base === 'settings' ||
    base === 'commands' ||
    norm.includes('/setup.') ||
    norm.includes('/macros.') ||
    norm.includes('/preamble.') ||
    norm.includes('/config.')
  );
}

function isIgnoredBuildFile(lowerPath) {
  if (!lowerPath) return true;
  const base = lowerPath.split('/').pop();
  if (!base || base.startsWith('.') || lowerPath.includes('__macosx')) return true;
  return IGNORED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
}

function extractGraphicsPaths(preambleText) {
  const dirs = [];
  if (!preambleText) return dirs;
  const gpRegex = /\\graphicspath\s*\{([\s\S]*?)\}\s*(?=\n|\\|$)/g;
  let m;
  while ((m = gpRegex.exec(preambleText)) !== null) {
    const inner = m[1];
    const subRegex = /\{([^{}]+)\}/g;
    let sm;
    while ((sm = subRegex.exec(inner)) !== null) {
      const cleaned = normalizePosixPath(sm[1].trim());
      if (cleaned) dirs.push(cleaned);
    }
  }
  return dirs;
}

export function createEmptyAssetVault() {
  return {
    byId: new Map(),
    pathIndex: new Map(),
    seq: 1
  };
}

export function disposeAssetVault(vault) {
  if (!vault || !vault.byId) return;
  for (const asset of vault.byId.values()) {
    if (asset.blobUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      try {
        URL.revokeObjectURL(asset.blobUrl);
      } catch {
        // Ignore revoke errors
      }
    }
  }
  vault.byId.clear();
  vault.pathIndex.clear();
}

export function registerReplacementAsset(vault, assetId, dataUrl, fileName = 'replacement.png') {
  if (!vault || !assetId || !dataUrl) return null;
  const existing = vault.byId.get(assetId);
  if (existing) {
    existing.replacedDataUrl = dataUrl;
    existing.isUnsupportedVectorFigure = false;
    existing.mime = 'image/png';
    existing.blobUrl = dataUrl;
    return existing.tokenUrl;
  }
  const id = assetId.startsWith('asset_') ? assetId : `asset_${String(vault.seq++).padStart(4, '0')}`;
  const tokenUrl = `vectoria-asset://${id}`;
  vault.byId.set(id, {
    id,
    tokenUrl,
    origPath: fileName,
    fileName,
    mime: 'image/png',
    byteSize: dataUrl.length,
    blobUrl: dataUrl,
    replacedDataUrl: dataUrl,
    isUnsupportedVectorFigure: false,
    getDataUrl: async () => dataUrl
  });
  return tokenUrl;
}

async function compressBlobToDataUrl(blob, mime) {
  const rawBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(rawBuffer);
  const byteSize = bytes.byteLength;

  const toRawBase64 = () => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, sub);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  };

  // SVG, GIF hoac anh nho duoi 1.1MB giu nguyen chat luong goc 100%
  if (
    typeof document === 'undefined' ||
    mime === 'image/svg+xml' ||
    mime === 'image/gif' ||
    byteSize <= 1100 * 1024
  ) {
    return toRawBase64();
  }

  // Anh raster qua lon (> 1.1MB): thu nho an toan ve max-width 1440px de tranh tran payload DB
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1440;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const outMime = mime === 'image/png' ? 'image/webp' : 'image/jpeg';
        const compressed = canvas.toDataURL(outMime, 0.88);
        URL.revokeObjectURL(tempUrl);
        resolve(compressed && compressed.length < byteSize * 1.37 ? compressed : toRawBase64());
      } catch {
        URL.revokeObjectURL(tempUrl);
        resolve(toRawBase64());
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(toRawBase64());
    };
    img.src = tempUrl;
  });
}

export async function exportUsedAssetsToDataUrls(texContent, vault) {
  if (!texContent || !vault || !vault.byId || vault.byId.size === 0) {
    return { resolvedTex: texContent || '', embeddedCount: 0, unresolvedFigures: [] };
  }

  const tokenRegex = /vectoria-asset:\/\/([a-zA-Z0-9_]+)/g;
  const usedIds = new Set();
  let match;
  while ((match = tokenRegex.exec(texContent)) !== null) {
    usedIds.add(match[1]);
  }

  let resolvedTex = texContent;
  let embeddedCount = 0;
  const unresolvedFigures = [];

  for (const id of usedIds) {
    const asset = vault.byId.get(id);
    if (!asset) continue;
    if (asset.isUnsupportedVectorFigure && !asset.replacedDataUrl) {
      unresolvedFigures.push(asset.origPath);
      // Thay bang chu thich an toan de khong lo duong dan gia len UI hoc sinh
      const brokenImgRegex = new RegExp(
        `\\\\includegraphics\\s*(?:\\[[\\s\\S]*?\\])?\\s*\\{\\s*vectoria-asset://${id}\\s*\\}`,
        'g'
      );
      resolvedTex = resolvedTex.replace(
        brokenImgRegex,
        () => `\\begin{center}\\textit{[Hình minh họa: ${asset.fileName}]}\\end{center}`
      );
      continue;
    }

    const dataUrl = asset.replacedDataUrl || (await asset.getDataUrl());
    if (dataUrl) {
      resolvedTex = resolvedTex.replaceAll(`vectoria-asset://${id}`, () => dataUrl);
      embeddedCount++;
    }
  }

  return { resolvedTex, embeddedCount, unresolvedFigures };
}

const PRIMITIVE_TEX_IFS = new Set([
  'if', 'iftrue', 'iffalse', 'ifnum', 'ifdim', 'ifodd',
  'ifvmode', 'ifhmode', 'ifmmode', 'ifinner', 'ifvoid',
  'ifhbox', 'ifvbox', 'ifx', 'ifeof', 'ifcase',
  'ifdefined', 'ifcsname', 'iffontchar', 'ifpdf', 'ifxetex', 'ifluatex'
]);

function countPrecedingBs(str, pos) {
  let c = 0;
  let k = pos - 1;
  while (k >= 0 && str[k] === '\\') {
    c++;
    k--;
  }
  return c;
}

function isPosInRanges(pos, ranges) {
  for (const [rs, re] of ranges) {
    if (pos >= rs && pos < re) return true;
    if (rs > pos) break;
  }
  return false;
}

function computeVerbatimAndCommentRanges(tex, excludedCommentEnvs = ['comment']) {
  const verbatimRanges = [];
  if (!tex) return { verbatimRanges, commentRanges: [], allProtected: [] };

  const verbEnvRe = /\\begin\s*\{(verbatim\*?|lstlisting|minted|alltt)\}/g;
  let vm;
  while ((vm = verbEnvRe.exec(tex)) !== null) {
    if (countPrecedingBs(tex, vm.index) % 2 !== 0) continue;
    const envName = vm[1];
    const escaped = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeRe = new RegExp(`\\\\end\\s*\\{${escaped}\\}`, 'g');
    closeRe.lastIndex = vm.index + vm[0].length;
    const cm = closeRe.exec(tex);
    const endPos = cm ? cm.index + cm[0].length : tex.length;
    verbatimRanges.push([vm.index, endPos]);
    verbEnvRe.lastIndex = endPos;
  }

  const inlineVerbRe = /\\verb\*?(.)/g;
  while ((vm = inlineVerbRe.exec(tex)) !== null) {
    if (countPrecedingBs(tex, vm.index) % 2 !== 0) continue;
    if (isPosInRanges(vm.index, verbatimRanges)) continue;
    const delim = vm[1];
    if (delim && delim !== '\n' && delim !== '\r') {
      const closeIdx = tex.indexOf(delim, vm.index + vm[0].length);
      if (closeIdx !== -1) {
        verbatimRanges.push([vm.index, closeIdx + 1]);
        inlineVerbRe.lastIndex = closeIdx + 1;
      }
    }
  }
  verbatimRanges.sort((a, b) => a[0] - b[0]);

  const commentRanges = [];
  const envList = [...new Set(excludedCommentEnvs.filter(Boolean))];
  if (envList.length > 0) {
    const escapedAlts = envList.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const openRe = new RegExp(`\\\\begin\\s*\\{(${escapedAlts})\\}`, 'g');
    let cm;
    while ((cm = openRe.exec(tex)) !== null) {
      if (countPrecedingBs(tex, cm.index) % 2 !== 0) continue;
      if (isPosInRanges(cm.index, verbatimRanges)) continue;
      const envName = cm[1];
      const escEnv = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const closeRe = new RegExp(`\\\\end\\s*\\{${escEnv}\\}`, 'g');
      closeRe.lastIndex = cm.index + cm[0].length;
      const endMatch = closeRe.exec(tex);
      const endPos = endMatch ? endMatch.index + endMatch[0].length : tex.length;
      commentRanges.push([cm.index, endPos]);
      openRe.lastIndex = endPos;
    }
    commentRanges.sort((a, b) => a[0] - b[0]);
  }

  const allProtected = [...verbatimRanges, ...commentRanges].sort((a, b) => a[0] - b[0]);
  return { verbatimRanges, commentRanges, allProtected };
}

export function preprocessTexConditionalsAndEndinput(
  rawText,
  excludedCommentEnvs = ['comment'],
  customIfNames = null
) {
  if (!rawText) return '';
  let tex = rawText;

  // 1. Truncate at first active \endinput outside verbatim and comment blocks
  {
    const { allProtected } = computeVerbatimAndCommentRanges(tex, excludedCommentEnvs);
    const endInputRe = /\\endinput(?![a-zA-Z@])/g;
    let em;
    while ((em = endInputRe.exec(tex)) !== null) {
      if (countPrecedingBs(tex, em.index) % 2 !== 0) continue;
      if (isPosInRanges(em.index, allProtected)) continue;
      tex = tex.slice(0, em.index);
      break;
    }
  }

  // 2. Evaluate \iffalse...\fi, \if0...\fi, \iftrue...\fi, \if1...\fi with nesting-aware \if / \else / \fi
  const knownIfs = new Set(PRIMITIVE_TEX_IFS);
  if (customIfNames) {
    for (const name of customIfNames) knownIfs.add(name);
  }
  for (const m of tex.matchAll(/\\newif\s*\\(if[a-zA-Z@]+)/g)) {
    knownIfs.add(m[1]);
  }

  const isConditionalIfToken = (cmdName) => {
    if (cmdName === 'iff') return false;
    if (knownIfs.has(cmdName)) return true;
    if (cmdName.startsWith('if@')) return true;
    return false;
  };

  for (let pass = 0; pass < 8; pass++) {
    const { allProtected } = computeVerbatimAndCommentRanges(tex, excludedCommentEnvs);
    const openCondRe = /\\(iffalse(?![a-zA-Z@])|iftrue(?![a-zA-Z@])|if0(?![0-9])|if1(?![0-9]))/g;
    let found = null;
    let om;
    while ((om = openCondRe.exec(tex)) !== null) {
      if (countPrecedingBs(tex, om.index) % 2 !== 0) continue;
      if (isPosInRanges(om.index, allProtected)) continue;
      found = om;
      break;
    }
    if (!found) break;

    const condCmd = found[1];
    const isTrueBranch = condCmd === 'iftrue' || condCmd === 'if1';
    const openStart = found.index;
    const openEnd = found.index + found[0].length;

    const tokenRe = /\\([a-zA-Z@]+|if[01])/g;
    tokenRe.lastIndex = openEnd;
    let depth = 1;
    let topElseStart = -1;
    let topElseEnd = -1;
    let closeFiStart = -1;
    let closeFiEnd = -1;
    let tm;

    while ((tm = tokenRe.exec(tex)) !== null) {
      if (countPrecedingBs(tex, tm.index) % 2 !== 0) continue;
      if (isPosInRanges(tm.index, allProtected)) continue;
      const tName = tm[1];
      if (tName === 'if0' || tName === 'if1' || isConditionalIfToken(tName)) {
        depth++;
      } else if (tName === 'else' && depth === 1 && topElseStart === -1) {
        topElseStart = tm.index;
        topElseEnd = tm.index + tm[0].length;
      } else if (tName === 'fi') {
        depth--;
        if (depth === 0) {
          closeFiStart = tm.index;
          closeFiEnd = tm.index + tm[0].length;
          break;
        }
      }
    }

    if (closeFiStart === -1) {
      // Unclosed \iffalse truncates to EOF; unclosed \iftrue removes just \iftrue
      tex = isTrueBranch ? `${tex.slice(0, openStart)}${tex.slice(openEnd)}` : tex.slice(0, openStart);
      continue;
    }

    let keptBranch = '';
    if (isTrueBranch) {
      keptBranch = topElseStart !== -1 ? tex.slice(openEnd, topElseStart) : tex.slice(openEnd, closeFiStart);
    } else if (topElseStart !== -1) {
      keptBranch = tex.slice(topElseEnd, closeFiStart);
    }

    tex = `${tex.slice(0, openStart)}${keptBranch}${tex.slice(closeFiEnd)}`;
  }

  return tex;
}

function extractCommentAndConditionalConfig(preambleText) {
  const excluded = new Set(['comment']);
  const customIfs = new Set();
  if (!preambleText) return { excludedCommentEnvs: ['comment'], customIfNames: customIfs };

  const commentCmdRe = /\\(excludecomment|includecomment)\s*\{([a-zA-Z0-9_*]+)\}/g;
  let m;
  while ((m = commentCmdRe.exec(preambleText)) !== null) {
    const op = m[1];
    const envName = m[2].trim();
    if (!envName) continue;
    if (op === 'excludecomment') excluded.add(envName);
    else if (op === 'includecomment') excluded.delete(envName);
  }

  for (const im of preambleText.matchAll(/\\newif\s*\\(if[a-zA-Z@]+)/g)) {
    customIfs.add(im[1]);
  }

  return { excludedCommentEnvs: [...excluded], customIfNames: customIfs };
}

function normalizeCustomExcludedCommentsToStandard(tex, excludedCommentEnvs) {
  if (!tex || !excludedCommentEnvs || excludedCommentEnvs.length === 0) return tex;
  const customEnvs = excludedCommentEnvs.filter((n) => n && n !== 'comment');
  if (customEnvs.length === 0) return tex;

  const { verbatimRanges } = computeVerbatimAndCommentRanges(tex, []);
  let out = tex;
  for (const envName of customEnvs) {
    const esc = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagRe = new RegExp(`\\\\(begin|end)\\s*\\{${esc}\\}`, 'g');
    const replacements = [];
    let tm;
    while ((tm = tagRe.exec(out)) !== null) {
      if (countPrecedingBs(out, tm.index) % 2 !== 0) continue;
      if (isPosInRanges(tm.index, verbatimRanges)) continue;
      replacements.push({ start: tm.index, end: tm.index + tm[0].length, tag: `\\${tm[1]}{comment}` });
    }
    for (let i = replacements.length - 1; i >= 0; i--) {
      const r = replacements[i];
      out = `${out.slice(0, r.start)}${r.tag}${out.slice(r.end)}`;
    }
  }
  return out;
}

function splitPreambleAndBody(rawTex, excludedCommentEnvs = ['comment'], customIfNames = null) {
  const noLineComments = stripLatexCommentsSafe(rawTex);
  const cleaned = preprocessTexConditionalsAndEndinput(noLineComments, excludedCommentEnvs, customIfNames);
  const startMatch = cleaned.match(/\\begin\s*\{document\}/);
  const endMatches = [...cleaned.matchAll(/\\end\s*\{document\}/g)];
  const lastEnd = endMatches.length > 0 ? endMatches[endMatches.length - 1] : null;

  if (startMatch) {
    const bodyStart = startMatch.index + startMatch[0].length;
    const preamble = cleaned.substring(0, startMatch.index);
    const body =
      lastEnd && lastEnd.index > bodyStart
        ? cleaned.substring(bodyStart, lastEnd.index)
        : cleaned.substring(bodyStart);
    return { preamble, body };
  }

  return { preamble: '', body: cleaned };
}

export async function ingestLatexFileOrZip(file) {
  const vault = createEmptyAssetVault();
  const fileNameLower = file.name.toLowerCase();

  // Truong hop 1: File .tex / .txt / .md don le
  if (!fileNameLower.endsWith('.zip')) {
    const rawText = cleanTextEncoding(await file.text());
    const preScan = extractCommentAndConditionalConfig(stripLatexCommentsSafe(rawText));
    const { preamble, body } = splitPreambleAndBody(
      rawText,
      preScan.excludedCommentEnvs,
      preScan.customIfNames
    );
    const normBody = normalizeCustomExcludedCommentsToStandard(body, preScan.excludedCommentEnvs);
    return {
      archiveName: file.name,
      mainTexPath: file.name,
      rawPreambleText: preamble,
      masterBodyTex: normBody.trim(),
      assetVault: vault,
      stats: {
        mainFile: file.name,
        mergedFilesCount: 1,
        imageCount: 0,
        pdfFigureCount: 0
      }
    };
  }

  // Truong hop 2: Thu muc .zip Overleaf
  const JSZip = (await import('jszip')).default;
  const zipPayload = typeof file.arrayBuffer === 'function' ? await file.arrayBuffer() : file;
  const zip = await JSZip.loadAsync(zipPayload);
  const texCandidates = [];
  const localStyleEntries = [];

  for (const [entryPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const normPath = normalizePosixPath(entryPath);
    const lower = normPath.toLowerCase();
    if (isIgnoredBuildFile(lower)) continue;

    if (lower.endsWith('.sty') || lower.endsWith('.cls')) {
      const styNoComments = stripLatexCommentsSafe(cleanTextEncoding(await zipEntry.async('string')));
      const styText = preprocessTexConditionalsAndEndinput(styNoComments);
      localStyleEntries.push({
        normPath,
        lowerPath: lower,
        baseName: lower.split('/').pop(),
        stem: lower.split('/').pop().replace(/\.(?:sty|cls)$/i, ''),
        kind: lower.endsWith('.cls') ? 'cls' : 'sty',
        text: styText
      });
      continue;
    }

    if (lower.endsWith('.tex')) {
      texCandidates.push(entryPath);
      if (isStyleOrMacroPath(normPath)) {
        const macroNoComments = stripLatexCommentsSafe(cleanTextEncoding(await zipEntry.async('string')));
        const macroText = preprocessTexConditionalsAndEndinput(macroNoComments);
        localStyleEntries.push({
          normPath,
          lowerPath: lower,
          baseName: lower.split('/').pop(),
          stem: lower.split('/').pop().replace(/\.tex$/i, ''),
          kind: 'macro',
          text: macroText
        });
      }
    }

    // Nap anh raster / SVG va ghi nhan ca hinh .pdf / .eps nhung trong Overleaf
    const dotIdx = lower.lastIndexOf('.');
    const ext = dotIdx !== -1 ? lower.substring(dotIdx) : '';
    const webMime = RASTER_WEB_MIMES[ext];
    const isPdfOrEpsFig = ext === '.pdf' || ext === '.eps';

    if (webMime || isPdfOrEpsFig) {
      const id = `asset_${String(vault.seq++).padStart(4, '0')}`;
      const tokenUrl = `vectoria-asset://${id}`;
      let blobUrl = '';
      let byteSize = 0;
      let blobObj = null;

      if (webMime) {
        const arrayBuf = await zipEntry.async('arraybuffer');
        byteSize = arrayBuf.byteLength;
        blobObj = new Blob([arrayBuf], { type: webMime });
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          blobUrl = URL.createObjectURL(blobObj);
        }
      }

      const fileBase = normPath.split('/').pop();
      const assetRecord = {
        id,
        tokenUrl,
        origPath: normPath,
        lowerPath: lower,
        fileName: fileBase,
        ext,
        mime: webMime || 'application/pdf',
        byteSize,
        blobUrl,
        replacedDataUrl: null,
        isUnsupportedVectorFigure: Boolean(isPdfOrEpsFig),
        getDataUrl: async () => {
          if (blobObj && webMime) {
            return compressBlobToDataUrl(blobObj, webMime);
          }
          const b64 = await zipEntry.async('base64');
          return `data:${webMime || 'application/octet-stream'};base64,${b64}`;
        }
      };

      vault.byId.set(id, assetRecord);

      // Chi muc duong dan: uu tien anh Web (PNG/SVG/JPG) hon anh .pdf cung ten
      const registerIndexKey = (key) => {
        if (!key) return;
        const existingId = vault.pathIndex.get(key);
        if (!existingId) {
          vault.pathIndex.set(key, id);
          return;
        }
        const existingAsset = vault.byId.get(existingId);
        if (existingAsset && existingAsset.isUnsupportedVectorFigure && !assetRecord.isUnsupportedVectorFigure) {
          vault.pathIndex.set(key, id);
        }
      };

      registerIndexKey(lower);
      registerIndexKey(lower.replace(/^\.?\//, ''));
      const lowerBase = fileBase.toLowerCase();
      registerIndexKey(lowerBase);
      const baseNoExt = dotIdx !== -1 ? lower.substring(0, dotIdx) : lower;
      registerIndexKey(baseNoExt);
      const fileBaseNoExt = lowerBase.includes('.')
        ? lowerBase.substring(0, lowerBase.lastIndexOf('.'))
        : lowerBase;
      registerIndexKey(fileBaseNoExt);
    }
  }

  if (texCandidates.length === 0) {
    throw new Error('Không tìm thấy tệp .tex nào trong thư mục ZIP.');
  }

  // Xep hang tim file TeX goc (main.tex / book.tex / file chua \documentclass)
  let bestCandidate = null;
  let bestScore = -10000;

  for (const cand of texCandidates) {
    const norm = normalizePosixPath(cand);
    const lower = norm.toLowerCase();
    const baseName = lower.split('/').pop();
    let score = 0;

    if (isStyleOrMacroPath(norm)) score -= 1200;
    if (baseName === 'main.tex') score += 120;
    else if (['root.tex', 'book.tex', 'document.tex', 'index.tex', 'giaotrinh.tex', 'baigiang.tex'].includes(baseName)) {
      score += 75;
    }
    if (!norm.includes('/')) score += 20;

    const snippet = cleanTextEncoding(await zip.files[cand].async('string'));
    if (/\\documentclass(?:\[[^\]]*\])?\{/.test(snippet) && !snippet.includes('{subfiles}')) {
      score += 65;
    }
    if (/\\begin\s*\{document\}/.test(snippet)) score += 35;
    if (/\\(?:input|include|subfile)\s*\{/.test(snippet)) score += 25;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  const mainTexEntryPath = bestCandidate || texCandidates[0];
  const normMainTex = normalizePosixPath(mainTexEntryPath);
  const mainDir = normMainTex.includes('/') ? normMainTex.substring(0, normMainTex.lastIndexOf('/')) : '';

  const findZipSubEntry = (rawTargetPath, currentDir) => {
    let filePath = rawTargetPath.replace(/\\/g, '/').trim().replace(/^["']|["']$/g, '');
    if (!filePath.endsWith('.tex') && !/\.[a-zA-Z0-9]+$/.test(filePath.split('/').pop())) {
      filePath += '.tex';
    }
    const candidateRel = currentDir ? normalizePosixPath(`${currentDir}/${filePath}`) : normalizePosixPath(filePath);

    const hit = zip.file(candidateRel) || zip.file(normalizePosixPath(filePath));
    if (hit) return hit;

    const lowerRel = candidateRel.toLowerCase();
    const lowerDirect = normalizePosixPath(filePath).toLowerCase();

    for (const [entryPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const normEntry = normalizePosixPath(entryPath).toLowerCase();
      if (normEntry === lowerRel || normEntry === lowerDirect || normEntry.endsWith('/' + lowerRel)) {
        return entry;
      }
    }

    if (!filePath.includes('/')) {
      const targetBase = filePath.toLowerCase();
      for (const [entryPath, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const base = normalizePosixPath(entryPath).split('/').pop().toLowerCase();
        if (base === targetBase) return entry;
      }
    }

    return null;
  };

  const preambleChunks = [];
  const preambleVisited = new Set([normMainTex]);

  const findLocalStyleBySpec = (rawSpec, currentDir, allowedKinds) => {
    const clean = rawSpec.replace(/\\/g, '/').trim().replace(/^["']|["']$/g, '');
    if (!clean) return null;
    const cleanLow = clean.toLowerCase();
    const relLow = currentDir ? normalizePosixPath(`${currentDir}/${cleanLow}`) : normalizePosixPath(cleanLow);
    const stemLow = cleanLow.split('/').pop().replace(/\.(?:sty|cls|tex)$/i, '');

    for (const entry of localStyleEntries) {
      if (allowedKinds && !allowedKinds.includes(entry.kind)) continue;
      const noExt = entry.lowerPath.replace(/\.(?:sty|cls|tex)$/i, '');
      if (
        entry.lowerPath === relLow ||
        entry.lowerPath === cleanLow ||
        noExt === relLow ||
        noExt === cleanLow ||
        entry.lowerPath.endsWith('/' + relLow)
      ) {
        return entry;
      }
    }
    if (!clean.includes('/')) {
      for (const entry of localStyleEntries) {
        if (allowedKinds && !allowedKinds.includes(entry.kind)) continue;
        if (entry.stem === stemLow || entry.baseName === cleanLow) {
          return entry;
        }
      }
    }
    return null;
  };

  // Recursively inline local .cls, .sty, and \input/\include inside preamble at their exact TeX execution position
  const inlinePreambleChunkInOrder = async (preambleChunk, currentDir) => {
    if (!preambleChunk) return '';
    const { allProtected } = computeVerbatimAndCommentRanges(preambleChunk);
    const directiveRe =
      /\\(documentclass|LoadClass|usepackage|RequirePackage|input|include)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
    let out = '';
    let lastIdx = 0;

    for (const m of preambleChunk.matchAll(directiveRe)) {
      if (countPrecedingBs(preambleChunk, m.index) % 2 !== 0) continue;
      if (isPosInRanges(m.index, allProtected)) continue;

      const cmd = m[1];
      const argList = m[2];
      const matchEnd = m.index + m[0].length;

      if (cmd === 'documentclass' || cmd === 'LoadClass') {
        out += preambleChunk.slice(lastIdx, matchEnd);
        lastIdx = matchEnd;
        const clsEntry = findLocalStyleBySpec(argList, currentDir, ['cls']);
        if (clsEntry && !preambleVisited.has(clsEntry.normPath)) {
          preambleVisited.add(clsEntry.normPath);
          const clsDir = clsEntry.normPath.includes('/')
            ? clsEntry.normPath.substring(0, clsEntry.normPath.lastIndexOf('/'))
            : '';
          const expandedCls = await inlinePreambleChunkInOrder(clsEntry.text, clsDir);
          out += `\n% --- Class: ${clsEntry.normPath} ---\n${expandedCls}\n`;
        }
        continue;
      }

      if (cmd === 'usepackage' || cmd === 'RequirePackage') {
        out += preambleChunk.slice(lastIdx, matchEnd);
        lastIdx = matchEnd;
        const pkgNames = argList.split(',').map((s) => s.trim()).filter(Boolean);
        for (const pkg of pkgNames) {
          const styEntry = findLocalStyleBySpec(pkg, currentDir, ['sty', 'macro']);
          if (styEntry && !preambleVisited.has(styEntry.normPath)) {
            preambleVisited.add(styEntry.normPath);
            const styDir = styEntry.normPath.includes('/')
              ? styEntry.normPath.substring(0, styEntry.normPath.lastIndexOf('/'))
              : '';
            const expandedSty = await inlinePreambleChunkInOrder(styEntry.text, styDir);
            out += `\n% --- Style: ${styEntry.normPath} ---\n${expandedSty}\n`;
          }
        }
        continue;
      }

      // \input{...} or \include{...} inside preamble
      let targetNorm = '';
      let targetText = '';
      const directStyle = findLocalStyleBySpec(argList, currentDir, ['sty', 'cls', 'macro']);
      if (directStyle) {
        targetNorm = directStyle.normPath;
        targetText = directStyle.text;
      } else {
        const zipTarget = findZipSubEntry(argList.trim(), currentDir);
        if (zipTarget) {
          targetNorm = normalizePosixPath(zipTarget.name);
          const subNoComments = stripLatexCommentsSafe(cleanTextEncoding(await zipTarget.async('string')));
          targetText = preprocessTexConditionalsAndEndinput(subNoComments);
        }
      }

      if (targetNorm) {
        out += preambleChunk.slice(lastIdx, m.index);
        lastIdx = matchEnd;
        if (!preambleVisited.has(targetNorm)) {
          preambleVisited.add(targetNorm);
          const subDir = targetNorm.includes('/') ? targetNorm.substring(0, targetNorm.lastIndexOf('/')) : '';
          const expandedSub = await inlinePreambleChunkInOrder(targetText, subDir);
          out += `\n% --- Preamble Import: ${targetNorm} ---\n${expandedSub}\n`;
        }
      }
    }

    out += preambleChunk.slice(lastIdx);
    return out;
  };

  const rawMainContent = cleanTextEncoding(await zip.files[mainTexEntryPath].async('string'));
  const preCommentCfg = extractCommentAndConditionalConfig(
    `${localStyleEntries.map((e) => e.text).join('\n')}\n${stripLatexCommentsSafe(rawMainContent)}`
  );
  const mainSplit = splitPreambleAndBody(
    rawMainContent,
    preCommentCfg.excludedCommentEnvs,
    preCommentCfg.customIfNames
  );
  if (mainSplit.preamble.trim()) {
    const orderedMainPreamble = await inlinePreambleChunkInOrder(mainSplit.preamble, mainDir);
    preambleChunks.push(`% --- Main Preamble: ${normMainTex} ---\n${orderedMainPreamble}`);
  }
  // Fallback for fragment ZIPs that lack \documentclass in main file
  if (!/\\documentclass\b/.test(mainSplit.preamble)) {
    for (const entry of localStyleEntries) {
      if (!preambleVisited.has(entry.normPath)) {
        preambleVisited.add(entry.normPath);
        const eDir = entry.normPath.includes('/')
          ? entry.normPath.substring(0, entry.normPath.lastIndexOf('/'))
          : '';
        const expanded = await inlinePreambleChunkInOrder(entry.text, eDir);
        preambleChunks.unshift(`% --- Style Fallback: ${entry.normPath} ---\n${expanded}`);
      }
    }
  }

  const fullPreambleText = preambleChunks.join('\n\n');
  const commentCfg = extractCommentAndConditionalConfig(fullPreambleText);
  const graphicsDirs = extractGraphicsPaths(fullPreambleText);

  // Honor \includeonly{...} declared in main preamble for \include{...} directives
  let includeOnlyAllowSet = null;
  const includeOnlyMatch = mainSplit.preamble.match(/\\includeonly\s*\{([^}]*)\}/);
  if (includeOnlyMatch) {
    includeOnlyAllowSet = new Set();
    const rawTargets = includeOnlyMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const rt of rawTargets) {
      const entry = findZipSubEntry(rt, mainDir);
      if (entry) {
        includeOnlyAllowSet.add(normalizePosixPath(entry.name).toLowerCase());
      }
      const normRaw = normalizePosixPath(mainDir ? `${mainDir}/${rt}` : rt).toLowerCase();
      includeOnlyAllowSet.add(normRaw);
      includeOnlyAllowSet.add(normRaw.endsWith('.tex') ? normRaw : `${normRaw}.tex`);
    }
  }

  const resolveAssetToken = (rawImgPath, currentDir = '') => {
    if (!rawImgPath) return null;
    const trimmed = rawImgPath.trim().replace(/^["']|["']$/g, '');
    if (
      trimmed.startsWith('vectoria-asset://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed;
    }

    const cleanRel = trimmed.replace(/\\/g, '/').replace(/^\.?\//, '');
    const lowerRel = cleanRel.toLowerCase();
    const searchPrefixes = [];
    if (currentDir) searchPrefixes.push(normalizePosixPath(`${currentDir}/${lowerRel}`));
    for (const gp of graphicsDirs) {
      const gpLow = gp.toLowerCase();
      if (currentDir) searchPrefixes.push(normalizePosixPath(`${currentDir}/${gpLow}/${lowerRel}`));
      searchPrefixes.push(normalizePosixPath(`${gpLow}/${lowerRel}`));
    }
    searchPrefixes.push(normalizePosixPath(lowerRel));

    const tryExts = ['', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.pdf', '.eps'];

    for (const prefix of searchPrefixes) {
      for (const ext of tryExts) {
        const key = prefix + ext;
        if (vault.pathIndex.has(key)) {
          const hit = vault.byId.get(vault.pathIndex.get(key));
          if (hit) return hit.tokenUrl;
        }
      }
    }

    // Fallback khop hau to duong dan
    for (const [id, rec] of vault.byId.entries()) {
      if (
        rec.lowerPath.endsWith('/' + lowerRel) ||
        rec.lowerPath.replace(/\.[a-z0-9]+$/, '').endsWith('/' + lowerRel.replace(/\.[a-z0-9]+$/, ''))
      ) {
        // Kiem tra xem co phien ban raster cung ten khong truoc khi tra ve .pdf
        if (rec.isUnsupportedVectorFigure) {
          const noExtKey = rec.lowerPath.replace(/\.[a-z0-9]+$/, '');
          const altId = vault.pathIndex.get(noExtKey);
          if (altId && vault.byId.get(altId) && !vault.byId.get(altId).isUnsupportedVectorFigure) {
            return vault.byId.get(altId).tokenUrl;
          }
        }
        return vault.byId.get(id).tokenUrl;
      }
    }

    // Fallback basename
    const baseOnly = lowerRel.split('/').pop();
    const baseOnlyNoExt = baseOnly.replace(/\.[a-z0-9]+$/, '');
    if (vault.pathIndex.has(baseOnly)) {
      return vault.byId.get(vault.pathIndex.get(baseOnly)).tokenUrl;
    }
    if (vault.pathIndex.has(baseOnlyNoExt)) {
      return vault.byId.get(vault.pathIndex.get(baseOnlyNoExt)).tokenUrl;
    }

    return null;
  };

  const replaceGraphicsWithVaultTokens = (texChunk, dirCtx) => {
    return texChunk.replace(
      /\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/g,
      (fullMatch, opt, imgPath) => {
        const tokenUrl = resolveAssetToken(imgPath, dirCtx);
        if (!tokenUrl) return fullMatch;
        return opt !== undefined ? `\\includegraphics[${opt}]{${tokenUrl}}` : `\\includegraphics{${tokenUrl}}`;
      }
    );
  };

  let mergedFilesCount = 1;

  const resolveSubfilesRecursive = async (texChunk, currentDir, visitedSet) => {
    const noComments = stripLatexCommentsSafe(texChunk);
    const condCleaned = preprocessTexConditionalsAndEndinput(
      noComments,
      commentCfg.excludedCommentEnvs,
      commentCfg.customIfNames
    );
    const cleanedChunk = normalizeCustomExcludedCommentsToStandard(
      condCleaned,
      commentCfg.excludedCommentEnvs
    );
    for (const gp of extractGraphicsPaths(cleanedChunk)) {
      if (!graphicsDirs.includes(gp)) graphicsDirs.push(gp);
    }
    const working = replaceGraphicsWithVaultTokens(cleanedChunk, currentDir);
    const { allProtected } = computeVerbatimAndCommentRanges(working, ['comment']);
    const importRegex = /\\(input|include|subfile)\s*\{([^}]+)\}/g;
    const matches = [...working.matchAll(importRegex)];

    let assembled = '';
    let cursor = 0;

    for (const m of matches) {
      if (countPrecedingBs(working, m.index) % 2 !== 0) continue;
      if (isPosInRanges(m.index, allProtected)) continue;

      const matchStart = m.index;
      const matchEnd = m.index + m[0].length;
      const cmdType = m[1];
      const rawPath = m[2].trim();

      assembled += working.slice(cursor, matchStart);
      cursor = matchEnd;

      if (isStyleOrMacroPath(rawPath)) {
        const subSty = findZipSubEntry(rawPath, currentDir);
        if (subSty) {
          const normSty = normalizePosixPath(subSty.name);
          if (!preambleVisited.has(normSty)) {
            preambleVisited.add(normSty);
            const styNoComments = stripLatexCommentsSafe(cleanTextEncoding(await subSty.async('string')));
            const styContent = preprocessTexConditionalsAndEndinput(
              styNoComments,
              commentCfg.excludedCommentEnvs,
              commentCfg.customIfNames
            );
            const styDir = normSty.includes('/') ? normSty.substring(0, normSty.lastIndexOf('/')) : '';
            const expandedSty = await inlinePreambleChunkInOrder(styContent, styDir);
            preambleChunks.push(`% --- Imported Preamble: ${normSty} ---\n${expandedSty}`);
          }
        }
        continue;
      }

      const targetEntry = findZipSubEntry(rawPath, currentDir);
      if (!targetEntry) {
        continue;
      }

      const normTargetName = normalizePosixPath(targetEntry.name);
      if (cmdType === 'include' && includeOnlyAllowSet && !includeOnlyAllowSet.has(normTargetName.toLowerCase())) {
        continue;
      }

      if (visitedSet.has(normTargetName)) {
        continue;
      }

      const nextVisited = new Set(visitedSet);
      nextVisited.add(normTargetName);
      mergedFilesCount++;

      const subDir = normTargetName.includes('/')
        ? normTargetName.substring(0, normTargetName.lastIndexOf('/'))
        : '';

      const rawSubText = cleanTextEncoding(await targetEntry.async('string'));
      const subSplit = splitPreambleAndBody(
        rawSubText,
        commentCfg.excludedCommentEnvs,
        commentCfg.customIfNames
      );
      const cleanedSubPreamble = stripLatexCommentsSafe(subSplit.preamble)
        .replace(/\\documentclass(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '')
        .trim();
      if (cleanedSubPreamble) {
        const expandedSubPreamble = await inlinePreambleChunkInOrder(cleanedSubPreamble, subDir);
        preambleChunks.push(`% --- Subfile Preamble: ${normTargetName} ---\n${expandedSubPreamble}`);
        for (const gp of extractGraphicsPaths(expandedSubPreamble)) {
          if (!graphicsDirs.includes(gp)) graphicsDirs.push(gp);
        }
      }

      const subBody = subSplit.body
        .replace(/\\documentclass(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '')
        .replace(/\\usepackage(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '');

      const expandedSubBody = await resolveSubfilesRecursive(subBody, subDir, nextVisited);
      assembled += `\n${expandedSubBody}\n`;
    }

    assembled += working.slice(cursor);
    return assembled;
  };

  const initialVisited = new Set([normMainTex]);
  const masterBodyTex = (await resolveSubfilesRecursive(mainSplit.body, mainDir, initialVisited)).trim();

  let webImageCount = 0;
  let pdfFigureCount = 0;
  for (const rec of vault.byId.values()) {
    if (rec.isUnsupportedVectorFigure) pdfFigureCount++;
    else webImageCount++;
  }

  return {
    archiveName: file.name,
    mainTexPath: normMainTex,
    rawPreambleText: preambleChunks.join('\n\n'),
    masterBodyTex,
    assetVault: vault,
    stats: {
      mainFile: normMainTex,
      mergedFilesCount,
      imageCount: webImageCount,
      pdfFigureCount
    }
  };
}
