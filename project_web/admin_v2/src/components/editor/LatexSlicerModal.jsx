import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PanelLeft,
  Eye,
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Sun,
  Moon,
  AlertTriangle,
  RotateCcw,
  Plus,
  Flag,
  Code2,
  SlidersHorizontal,
  Crosshair,
  Pencil,
  Undo2
} from 'lucide-react';
import { buildTexAst, snapAndReconstructSlice } from '../../utils/latexSlicer/texAstEngine';
import {
  parsePreambleAndGlobals,
  buildShortExcerpt,
  parseVectoriaBoxStyleComments,
  parseVectoriaDocConfigComments
} from '../../utils/latexSlicer/preambleParser';
import {
  composeAndNormalizeSegments,
  canonicalizeSlicedSegmentTex,
  createHeadingNormalizerRunner,
  cleanBoxOptionalTitle
} from '../../utils/latexSlicer/hierarchyNormalizer';
import {
  renderLatexForPreviewAndUI,
  resolveDomPointToTexOffset,
  resolveClickEventToTexOffset,
  VECTORIA_ACADEMIC_PREVIEW_CSS
} from '../../utils/latexSlicer/vectoriaLatexRenderer';
import {
  registerReplacementAsset,
  exportUsedAssetsToDataUrls
} from '../../utils/latexSlicer/zipIngestor';
import AcademicPreviewBlockEditor from './AcademicPreviewBlockEditor';

const SEGMENT_ACCENT_BORDERS = ['#0284c7', '#16a34a', '#d97706', '#9333ea'];
const CUSTOM_SEGMENT_ACCENT = '#0d9488';

const EDITABLE_STITCHED_BLOCK_SELECTOR = [
  'h1[data-tex-start]',
  'h2[data-tex-start]',
  'h3[data-tex-start]',
  'h4[data-tex-start]',
  'h5[data-tex-start]',
  '.katex-display-wrapper[data-tex-start]',
  'li[data-tex-item="true"][data-tex-start]',
  'p.v-tex-para[data-tex-start]',
  '.latex-box[data-tex-start]',
  '.latex-blockquote[data-tex-start]',
  '.v-tex-align-env[data-tex-start]'
].join(', ');

const StitchedSegmentHtmlBody = memo(function StitchedSegmentHtmlBody({ html }) {
  const htmlObj = useMemo(() => ({ __html: html }), [html]);
  return <div className="v-stitched-seg-html" dangerouslySetInnerHTML={htmlObj} />;
});

function StitchedInsertionSeam({ onInsert, label, subtleVisible = false }) {
  return (
    <div
      className={`v-insert-seam group/seam my-1 ${
        subtleVisible ? '!opacity-85 hover:!opacity-100' : ''
      }`}
    >
      <button
        type="button"
        onClick={onInsert}
        style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)" }}
        className="relative z-10 inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-[#0f766e] hover:bg-[#0d9488] text-white border border-teal-500/40 rounded-[2px] transition-colors cursor-pointer select-none"
      >
        <Plus size={12} />
        <span>{label}</span>
      </button>
    </div>
  );
}

function resolveEditableStitchedBlock(targetEl, segContainerEl) {
  if (!targetEl || !segContainerEl || !segContainerEl.contains(targetEl)) return null;
  if (targetEl.closest?.('.v-inline-portal-host') || targetEl.closest?.('a[href]')) return null;

  // Clicking directly on an academic box header/lead label always targets the enclosing box
  const headerHit = targetEl.closest?.(
    '.v-box-lead-label, .latex-tcb-bar-header, .latex-tcb-pill-header'
  );
  if (headerHit) {
    const outerBox = headerHit.closest?.('.latex-box[data-tex-start]');
    if (outerBox && segContainerEl.contains(outerBox)) {
      const s = parseInt(outerBox.getAttribute('data-tex-start'), 10);
      const e = parseInt(outerBox.getAttribute('data-tex-end'), 10);
      if (!isNaN(s) && !isNaN(e) && e > s) {
        return { el: outerBox, start: s, end: e };
      }
    }
  }

  let hit = targetEl.closest?.(EDITABLE_STITCHED_BLOCK_SELECTOR);
  if (!hit || !segContainerEl.contains(hit)) return null;

  // Promote inner paragraph to enclosing academic box if the box contains pure prose paragraphs without sub-tables/lists/display-equations
  if (hit.matches?.('p.v-tex-para')) {
    const parentBox = hit.parentElement?.closest?.('.latex-box[data-tex-start]');
    if (parentBox && segContainerEl.contains(parentBox)) {
      const hasComplexSubBlocks = Boolean(
        parentBox.querySelector(
          '.katex-display-wrapper, ul.latex-list, ol.latex-list, .latex-tabular-wrap, .latex-figure, svg'
        )
      );
      if (!hasComplexSubBlocks) {
        hit = parentBox;
      }
    }
  }

  // Promote single-child block inside \begin{center} / \begin{flushright} so alignment can be toggled cleanly
  const parentAlign = hit.parentElement?.closest?.('.v-tex-align-env[data-tex-start]');
  if (parentAlign && segContainerEl.contains(parentAlign)) {
    const alignBlocks = parentAlign.querySelectorAll(
      'p.v-tex-para[data-tex-start], .latex-box[data-tex-start], .latex-blockquote[data-tex-start], .katex-display-wrapper[data-tex-start], h1[data-tex-start], h2[data-tex-start], h3[data-tex-start], h4[data-tex-start]'
    );
    if (alignBlocks.length <= 1) {
      hit = parentAlign;
    }
  }

  const start = parseInt(hit.getAttribute('data-tex-start'), 10);
  const end = parseInt(hit.getAttribute('data-tex-end'), 10);
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return { el: hit, start, end };
}

function truncateLabel(str, maxLen = 24) {
  if (!str) return '';
  const clean = str.trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 2)}..` : clean;
}

function HoverTip({ label, side = 'bottom', align = 'center', children }) {
  if (!label) return children;
  const sideCls = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
  const alignCls =
    align === 'right'
      ? 'right-0'
      : align === 'left'
        ? 'left-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 transition-opacity duration-150 absolute z-50 ${sideCls} ${alignCls} whitespace-nowrap px-2 py-1 text-[11px] font-medium tracking-normal bg-[#090b0f] text-slate-100 border border-slate-700 rounded-[2px] shadow-lg`}
      >
        {label}
      </span>
    </span>
  );
}

function findEnclosingSectionRange(offset, outlineHeadings, totalLen) {
  if (!outlineHeadings || outlineHeadings.length === 0 || offset === null) return null;
  let matchedIdx = -1;
  for (let i = 0; i < outlineHeadings.length; i++) {
    if (outlineHeadings[i].start <= offset + 4) {
      matchedIdx = i;
    } else {
      break;
    }
  }
  if (matchedIdx === -1) return null;
  const current = outlineHeadings[matchedIdx];
  let sectionEnd = totalLen;
  for (let k = matchedIdx + 1; k < outlineHeadings.length; k++) {
    if (outlineHeadings[k].level <= current.level) {
      sectionEnd = outlineHeadings[k].start;
      break;
    }
  }
  if (sectionEnd <= current.start) return null;
  return {
    headingIndex: matchedIdx,
    title: current.cleanTitle,
    start: current.start,
    end: sectionEnd
  };
}

function findClickedBlockRange(targetEl, containerEl) {
  if (!targetEl || !containerEl || !containerEl.contains(targetEl)) return null;
  const blockCandidates = [
    { selector: '.latex-boxpair', label: 'khối câu hỏi này' },
    { selector: '.latex-box', label: 'khối học thuật này' },
    { selector: '.latex-tcolorbox', label: 'khối đóng khung này' },
    { selector: '.latex-proof', label: 'khối chứng minh này' },
    { selector: '.latex-figure', label: 'hình minh họa này' },
    { selector: '[data-tex-item="true"]', label: 'ý danh sách này' },
    { selector: 'div[data-tex-atomic="true"]', label: 'khối công thức / bảng này' },
    { selector: '.v-tex-para', label: 'đoạn văn này' }
  ];

  for (const cand of blockCandidates) {
    const hit = targetEl.closest?.(cand.selector);
    if (hit && containerEl.contains(hit)) {
      const s = parseInt(hit.getAttribute('data-tex-start'), 10);
      const e = parseInt(hit.getAttribute('data-tex-end'), 10);
      if (!isNaN(s) && !isNaN(e) && e > s) {
        return { start: s, end: e, label: cand.label };
      }
    }
  }
  return null;
}

export default function LatexSlicerModal({
  isOpen,
  onClose,
  manuscriptSession,
  onUpdateManuscriptBody,
  onApplyExtractedLesson
}) {
  const [activeTab, setActiveTab] = useState('manuscript'); // 'manuscript' | 'stitched' | 'raw-tex'
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [paperTheme, setPaperTheme] = useState('light'); // 'light' | 'dark'
  const [normalizeHierarchy, setNormalizeHierarchy] = useState(false);
  const [autoFillTitle, setAutoFillTitle] = useState(true);
  const [hideCommentEnvs, setHideCommentEnvs] = useState(true);

  const [segments, setSegments] = useState([]);
  const [pendingStartOffset, setPendingStartOffset] = useState(null);
  const [selectionPopover, setSelectionPopover] = useState(null);
  const [assetRevision, setAssetRevision] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Direct Preview Editing & Outside-Object Custom Authoring state
  const [editingTarget, setEditingTarget] = useState(null);
  const [portalHostEl, setPortalHostEl] = useState(null);
  const [hoveredBlockMeta, setHoveredBlockMeta] = useState(null);

  const paperContainerRef = useRef(null);
  const stitchedPaperRef = useRef(null);
  const hoveredDomElRef = useRef(null);
  const scrollViewportRef = useRef(null);
  const popoverRef = useRef(null);
  const settingsWrapRef = useRef(null);
  const replaceInputRef = useRef(null);
  const pendingReplaceTargetRef = useRef(null);
  const segIdCounterRef = useRef(1);
  const lastScrollTopRef = useRef(0);

  const masterBodyTex = manuscriptSession?.masterBodyTex || '';
  const rawPreambleText = manuscriptSession?.rawPreambleText || '';
  const assetVault = manuscriptSession?.assetVault || null;

  const clearHoverHighlight = useCallback(() => {
    if (hoveredDomElRef.current) {
      hoveredDomElRef.current.classList.remove('v-editable-block-hover');
      hoveredDomElRef.current = null;
    }
    setHoveredBlockMeta(null);
  }, []);

  // Reset segments when a new manuscript archive is loaded
  useEffect(() => {
    setSegments([]);
    setPendingStartOffset(null);
    setSelectionPopover(null);
    setEditingTarget(null);
    setPortalHostEl(null);
    clearHoverHighlight();
    setShowSettingsMenu(false);
    setActiveTab('manuscript');
  }, [manuscriptSession?.archiveName, clearHoverHighlight]);

  // Reset transient popovers when reopening modal
  useEffect(() => {
    if (isOpen) {
      setSelectionPopover(null);
      setShowSettingsMenu(false);
      clearHoverHighlight();
    }
  }, [isOpen, clearHoverHighlight]);

  // Clear hover highlight whenever leaving stitched tab or opening an inline block editor
  useEffect(() => {
    if (activeTab !== 'stitched' || editingTarget) {
      clearHoverHighlight();
    }
  }, [activeTab, editingTarget, clearHoverHighlight]);

  const handleCancelEditBlock = useCallback(() => {
    setEditingTarget((prev) => {
      if (prev?.isNewCustomDraft) {
        setSegments((segs) => {
          const next = segs.filter((s) => s.id !== prev.segId);
          if (next.length === 0) {
            setActiveTab('manuscript');
          }
          return next;
        });
      }
      return null;
    });
    setPortalHostEl(null);
  }, []);

  // Escape key & outside click handling for Floating Popover, Active Block Editor, and Settings Menu
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingTarget) {
          handleCancelEditBlock();
        } else if (selectionPopover) {
          setSelectionPopover(null);
          window.getSelection()?.removeAllRanges();
        } else if (showSettingsMenu) {
          setShowSettingsMenu(false);
        } else if (pendingStartOffset !== null) {
          setPendingStartOffset(null);
        }
      }
    };
    const handleMouseDownOutside = (e) => {
      if (showSettingsMenu && settingsWrapRef.current && !settingsWrapRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [isOpen, editingTarget, handleCancelEditBlock, selectionPopover, showSettingsMenu, pendingStartOffset]);

  // Parse Preamble macros, custom theorems, colors, and global labels
  const preambleData = useMemo(() => {
    return parsePreambleAndGlobals(rawPreambleText, masterBodyTex);
  }, [rawPreambleText, masterBodyTex]);

  // Build Source AST over masterBodyTex
  const ast = useMemo(() => {
    return buildTexAst(masterBodyTex, preambleData, { hideCommentEnvs });
  }, [masterBodyTex, preambleData, hideCommentEnvs]);

  // Render Source-Mapped HTML for the full manuscript
  const manuscriptMappedHtml = useMemo(() => {
    void assetRevision;
    return renderLatexForPreviewAndUI(masterBodyTex, {
      sourceMapMode: true,
      ast,
      preambleData,
      assetVault,
      hideCommentEnvs
    });
  }, [masterBodyTex, ast, preambleData, assetVault, assetRevision, hideCommentEnvs]);

  // Compose & normalize stitched segments live for Stitched Preview & Raw TeX inspection
  const composedResult = useMemo(() => {
    return composeAndNormalizeSegments(
      segments,
      {
        normalizeHierarchy,
        mergeAdjacentLists: true,
        manuscriptTocEntries: ast.tocEntries
      },
      preambleData
    );
  }, [segments, normalizeHierarchy, ast.tocEntries, preambleData]);

  // Per-Segment Source-Mapped HTML for Tab 2 ("Bản ghép") with shared cross-segment counters & label map
  const perSegmentHtmlList = useMemo(() => {
    void assetRevision;
    if (segments.length === 0) return [];

    const wrappedTex = composedResult.wrappedDocumentTex || '';
    const persistedBoxStyles = parseVectoriaBoxStyleComments(wrappedTex);
    const persistedDocCfg = parseVectoriaDocConfigComments(wrappedTex);
    const headingNormalizer = createHeadingNormalizerRunner(segments, normalizeHierarchy);

    const initC = (!normalizeHierarchy && preambleData?.initialCounters) || {};
    const seededBoxCounters = {};
    if (!normalizeHierarchy && preambleData?.initialCounters) {
      for (const [k, v] of Object.entries(preambleData.initialCounters)) {
        if (
          !['part', 'chapter', 'section', 'subsection', 'subsubsection', 'equation'].includes(k) &&
          typeof v === 'number'
        ) {
          const mappedKey = preambleData.customEnvs?.get(k)?.canonicalEnv || k;
          seededBoxCounters[mappedKey] = v;
        }
      }
    }

    const standaloneEqWithin = normalizeHierarchy
      ? /\\chapter(?![a-zA-Z*])/.test(composedResult.finalBodyTex || '')
        ? 'chapter'
        : ''
      : undefined;

    const sharedCounters = {
      isStandaloneNormalized: normalizeHierarchy,
      persistedBoxStyles,
      persistedDocCfg,
      overrideGlobalLabels: composedResult.stitchedLabelMap,
      headingNormalizer,
      cleanBoxOptFn: normalizeHierarchy ? cleanBoxOptionalTitle : null,
      stitchedTocEntries: composedResult.stitchedTocEntries,
      ...(standaloneEqWithin !== undefined ? { equationWithin: standaloneEqWithin } : {}),
      headingNums: {
        chap: initC.chapter || 0,
        sec: initC.section || 0,
        subsec: initC.subsection || 0,
        subsubsec: initC.subsubsection || 0
      },
      eqCounters: { eq: initC.equation || 0 },
      boxCounters: seededBoxCounters
    };

    return segments.map((seg, segIdx) => {
      if (!normalizeHierarchy && seg.countersBefore && typeof seg.countersBefore === 'object') {
        const sc = seg.countersBefore;
        if (segIdx > 0 || (sc.chapter || 0) > 0) sharedCounters.headingNums.chap = sc.chapter || 0;
        if (segIdx > 0 || (sc.section || 0) > 0) sharedCounters.headingNums.sec = sc.section || 0;
        if (segIdx > 0 || (sc.subsection || 0) > 0) sharedCounters.headingNums.subsec = sc.subsection || 0;
        if (segIdx > 0 || (sc.subsubsection || 0) > 0) {
          sharedCounters.headingNums.subsubsec = sc.subsubsection || 0;
        }
        if (segIdx > 0 || (sc.equation || 0) > 0) sharedCounters.eqCounters.eq = sc.equation || 0;
        if (sc.boxCounters && typeof sc.boxCounters === 'object') {
          for (const [bk, bv] of Object.entries(sc.boxCounters)) {
            if (typeof bv === 'number' && (segIdx > 0 || bv > 0)) {
              sharedCounters.boxCounters[bk] = bv;
            }
          }
        }
      }

      const segTex = seg.reconstructedTex || '';
      if (!segTex.trim()) {
        return { segId: seg.id, html: '' };
      }

      const html = renderLatexForPreviewAndUI(segTex, {
        sourceMapMode: true,
        enablePreflightCards: false,
        preambleData,
        assetVault,
        hideCommentEnvs,
        sharedCounters
      });
      return { segId: seg.id, html };
    });
  }, [
    segments,
    composedResult,
    normalizeHierarchy,
    preambleData,
    assetVault,
    assetRevision,
    hideCommentEnvs
  ]);

  // Mount in-place portal right at the edited block's exact DOM slot inside Tab 2 ("Bản ghép")
  useEffect(() => {
    if (
      !isOpen ||
      activeTab !== 'stitched' ||
      !editingTarget ||
      editingTarget.isNewCustomDraft
    ) {
      setPortalHostEl(null);
      return undefined;
    }

    const paperRoot = stitchedPaperRef.current;
    if (!paperRoot) return undefined;

    const segWrap = paperRoot.querySelector(`[data-seg-id="${editingTarget.segId}"]`);
    if (!segWrap) return undefined;

    let targetBlockEl = segWrap.querySelector(
      `[data-tex-start="${editingTarget.blockStart}"][data-tex-end="${editingTarget.blockEnd}"]`
    );
    if (!targetBlockEl && editingTarget.wholeSegmentFallback) {
      targetBlockEl = segWrap.querySelector('.v-stitched-seg-html');
    }
    if (!targetBlockEl || !targetBlockEl.parentNode) {
      setPortalHostEl(null);
      return undefined;
    }

    const host = document.createElement('div');
    host.className = 'v-inline-portal-host';
    targetBlockEl.parentNode.insertBefore(host, targetBlockEl);
    const prevDisplay = targetBlockEl.style.display;
    targetBlockEl.style.display = 'none';
    setPortalHostEl(host);

    return () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
      if (targetBlockEl.isConnected) {
        targetBlockEl.style.display = prevDisplay;
      }
    };
  }, [isOpen, activeTab, editingTarget, perSegmentHtmlList]);

  const addSegmentFromOffsets = useCallback(
    (rawStart, rawEnd) => {
      if (rawStart === null || rawEnd === null) return;
      const orderedStart = Math.min(rawStart, rawEnd);
      const orderedEnd = Math.max(rawStart, rawEnd);
      const sliced = snapAndReconstructSlice(masterBodyTex, orderedStart, orderedEnd, ast);
      if (!sliced.reconstructedTex || sliced.snappedEnd <= sliced.snappedStart) return;
      const effectiveTex = hideCommentEnvs
        ? sliced.reconstructedTex.replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, '').trim()
        : sliced.reconstructedTex;
      if (!effectiveTex) return;

      const { canonicalTex, countersBefore } = canonicalizeSlicedSegmentTex(
        effectiveTex,
        preambleData
      );
      if (!canonicalTex) return;

      const nextId = `seg_${segIdCounterRef.current++}`;
      const excerpt = buildShortExcerpt(canonicalTex);

      setSegments((prev) => [
        ...prev,
        {
          id: nextId,
          kind: 'sliced',
          rawStart: orderedStart,
          rawEnd: orderedEnd,
          snappedStart: sliced.snappedStart,
          snappedEnd: sliced.snappedEnd,
          countersBefore,
          originalTex: canonicalTex,
          reconstructedTex: canonicalTex,
          undoStack: [],
          recoveredEnvs: sliced.recoveredEnvs,
          recoveredInlineFormats: sliced.recoveredInlineFormats,
          excerpt
        }
      ]);
      setPendingStartOffset(null);
      setSelectionPopover(null);
      if (typeof window !== 'undefined' && window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    },
    [masterBodyTex, ast, hideCommentEnvs, preambleData]
  );

  const handleInsertCustomSegment = useCallback(
    (insertAtIndex) => {
      // If an empty unsaved custom draft is already open, cancel it cleanly before inserting a new one
      const nextId = `seg_${segIdCounterRef.current++}`;
      const newCustomSeg = {
        id: nextId,
        kind: 'custom',
        rawStart: null,
        rawEnd: null,
        snappedStart: null,
        snappedEnd: null,
        countersBefore: null,
        originalTex: '',
        reconstructedTex: '',
        undoStack: [],
        recoveredEnvs: [],
        recoveredInlineFormats: [],
        excerpt: 'Khối tự soạn mới...'
      };

      setSegments((prev) => {
        const cleaned = editingTarget?.isNewCustomDraft
          ? prev.filter((s) => s.id !== editingTarget.segId)
          : [...prev];
        const clampedIdx = Math.max(0, Math.min(cleaned.length, insertAtIndex));
        cleaned.splice(clampedIdx, 0, newCustomSeg);
        return cleaned;
      });

      setPendingStartOffset(null);
      setSelectionPopover(null);
      clearHoverHighlight();
      setActiveTab('stitched');
      setEditingTarget({
        segId: nextId,
        segmentKind: 'custom',
        blockStart: 0,
        blockEnd: 0,
        initialLatex: '',
        isNewCustomDraft: true,
        wholeSegmentFallback: false
      });

      setTimeout(() => {
        const segEl = stitchedPaperRef.current?.querySelector(`[data-seg-id="${nextId}"]`);
        segEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    },
    [editingTarget, clearHoverHighlight]
  );

  const handleSaveEditedBlock = useCallback(
    (newBlockLatex) => {
      if (!editingTarget) return;
      const targetSegId = editingTarget.segId;

      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.id !== targetSegId) return seg;

          if (editingTarget.isNewCustomDraft) {
            return {
              ...seg,
              originalTex: newBlockLatex,
              reconstructedTex: newBlockLatex,
              undoStack: [],
              excerpt: buildShortExcerpt(newBlockLatex) || 'Khối tự soạn'
            };
          }

          const currentTex = seg.reconstructedTex || '';
          const updatedTex =
            currentTex.slice(0, editingTarget.blockStart) +
            newBlockLatex +
            currentTex.slice(editingTarget.blockEnd);

          if (updatedTex === currentTex) return seg;

          const nextUndo = [...(seg.undoStack || []).slice(-19), currentTex];
          return {
            ...seg,
            reconstructedTex: updatedTex,
            undoStack: nextUndo,
            excerpt:
              buildShortExcerpt(updatedTex) ||
              (seg.kind === 'custom' ? 'Khối tự soạn' : seg.excerpt)
          };
        })
      );

      setEditingTarget(null);
      setPortalHostEl(null);
    },
    [editingTarget]
  );

  const handleUndoSegment = useCallback((segId) => {
    setEditingTarget((cur) => (cur?.segId === segId ? null : cur));
    setPortalHostEl(null);
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== segId || !seg.undoStack || seg.undoStack.length === 0) return seg;
        const nextUndo = seg.undoStack.slice(0, -1);
        const restoredTex = seg.undoStack[seg.undoStack.length - 1];
        return {
          ...seg,
          reconstructedTex: restoredTex,
          undoStack: nextUndo,
          excerpt:
            buildShortExcerpt(restoredTex) ||
            (seg.kind === 'custom' ? 'Khối tự soạn' : seg.excerpt)
        };
      })
    );
  }, []);

  const handleResetSegmentToOriginal = useCallback((segId) => {
    setEditingTarget((cur) => (cur?.segId === segId ? null : cur));
    setPortalHostEl(null);
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== segId || seg.kind !== 'sliced') return seg;
        if (seg.reconstructedTex === seg.originalTex) return seg;
        const nextUndo = [...(seg.undoStack || []).slice(-19), seg.reconstructedTex];
        return {
          ...seg,
          reconstructedTex: seg.originalTex,
          undoStack: nextUndo,
          excerpt: buildShortExcerpt(seg.originalTex)
        };
      })
    );
  }, []);

  const handleOpenBlockEditorForRange = useCallback(
    (seg, blockStart, blockEnd, wholeSegmentFallback = false) => {
      if (!seg) return;
      const segTex = seg.reconstructedTex || '';
      const sliceTex = segTex.slice(blockStart, blockEnd);

      // Remove any unsaved empty custom draft if user switches directly to editing another block
      if (editingTarget?.isNewCustomDraft && editingTarget.segId !== seg.id) {
        setSegments((prev) => prev.filter((s) => s.id !== editingTarget.segId));
      }

      clearHoverHighlight();
      setEditingTarget({
        segId: seg.id,
        segmentKind: seg.kind || 'sliced',
        blockStart,
        blockEnd,
        initialLatex: sliceTex,
        isNewCustomDraft: false,
        wholeSegmentFallback
      });
    },
    [editingTarget, clearHoverHighlight]
  );

  const handleQuickEditSegmentFromSidebar = useCallback(
    (seg) => {
      if (!seg) return;
      const openFirst = () => {
        const paperRoot = stitchedPaperRef.current;
        const segWrap = paperRoot?.querySelector(`[data-seg-id="${seg.id}"]`);
        segWrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstEditable = segWrap?.querySelector(EDITABLE_STITCHED_BLOCK_SELECTOR);
        if (firstEditable && segWrap) {
          const resolved = resolveEditableStitchedBlock(firstEditable, segWrap);
          if (resolved) {
            handleOpenBlockEditorForRange(seg, resolved.start, resolved.end, false);
            return;
          }
        }
        handleOpenBlockEditorForRange(seg, 0, (seg.reconstructedTex || '').length, true);
      };

      if (activeTab !== 'stitched') {
        setActiveTab('stitched');
        setTimeout(openFirst, 60);
      } else {
        openFirst();
      }
    },
    [activeTab, handleOpenBlockEditorForRange]
  );

  // Paint visual highlights, live candidate range preview, & badges onto the Source-Mapped DOM
  useEffect(() => {
    if (!isOpen || activeTab !== 'manuscript') return;
    const container = paperContainerRef.current;
    if (!container) return;

    const oldBadges = container.querySelectorAll('.v-injected-pin-badge');
    oldBadges.forEach((b) => b.remove());

    const prevHighlighted = container.querySelectorAll(
      '.v-seg-hl-1, .v-seg-hl-2, .v-seg-hl-3, .v-seg-hl-4, .v-seg-block-hl-1, .v-seg-block-hl-2, .v-seg-block-hl-3, .v-seg-block-hl-4, .v-pending-start-pin, .v-draft-range-hl, .v-draft-block-hl, .v-cursor-focus-tok'
    );
    prevHighlighted.forEach((el) => {
      el.classList.remove(
        'v-seg-hl-1',
        'v-seg-hl-2',
        'v-seg-hl-3',
        'v-seg-hl-4',
        'v-seg-block-hl-1',
        'v-seg-block-hl-2',
        'v-seg-block-hl-3',
        'v-seg-block-hl-4',
        'v-pending-start-pin',
        'v-draft-range-hl',
        'v-draft-block-hl',
        'v-cursor-focus-tok'
      );
    });

    const mappedBlocks = Array.from(
      container.querySelectorAll(
        '.latex-box, .latex-tcolorbox, .latex-proof, .v-tex-para, [data-tex-item="true"], :not(span)[data-tex-atomic="true"]'
      )
    );
    const mappedLeaves = Array.from(container.querySelectorAll('.v-tex-tok, [data-tex-atomic="true"]'));
    if (mappedLeaves.length === 0) return;

    const paintRangeCleanly = (rStart, rEnd, blockCls, inlineCls) => {
      const coveredBlockEls = new Set();
      let firstMatchedEl = null;

      for (const blk of mappedBlocks) {
        const s = parseInt(blk.getAttribute('data-tex-start'), 10);
        const e = parseInt(blk.getAttribute('data-tex-end'), 10);
        if (isNaN(s) || isNaN(e) || e <= s) continue;
        // Skip inner blocks if an ancestor block is already fully covered
        let hasCoveredAncestor = false;
        let p = blk.parentElement;
        while (p && p !== container) {
          if (coveredBlockEls.has(p)) {
            hasCoveredAncestor = true;
            break;
          }
          p = p.parentElement;
        }
        if (hasCoveredAncestor) continue;

        if (s >= rStart - 2 && e <= rEnd + 2) {
          blk.classList.add(blockCls);
          coveredBlockEls.add(blk);
          if (!firstMatchedEl) firstMatchedEl = blk;
        }
      }

      for (const el of mappedLeaves) {
        const s = parseInt(el.getAttribute('data-tex-start'), 10);
        const e = parseInt(el.getAttribute('data-tex-end'), 10);
        if (isNaN(s) || isNaN(e)) continue;
        if (e <= rStart || s >= rEnd) continue;

        // Skip tokens inside a block that already received clean whole-block highlight
        let insideCoveredBlock = false;
        let p = el;
        while (p && p !== container) {
          if (coveredBlockEls.has(p)) {
            insideCoveredBlock = true;
            break;
          }
          p = p.parentElement;
        }
        if (insideCoveredBlock) continue;

        if (
          el.classList.contains('v-tex-tok') &&
          el.closest('[data-tex-atomic="true"]') !== null &&
          el.getAttribute('data-tex-atomic') !== 'true'
        ) {
          continue;
        }

        if (el.tagName !== 'SPAN' && el.getAttribute('data-tex-atomic') === 'true') {
          el.classList.add(blockCls);
        } else {
          el.classList.add(inlineCls);
        }
        if (!firstMatchedEl) firstMatchedEl = el;
      }

      return firstMatchedEl;
    };

    // 1. Highlight active clicked focus token when Floating Tooltip is open without a range preview
    if (
      selectionPopover &&
      selectionPopover.kind === 'point' &&
      pendingStartOffset === null &&
      typeof selectionPopover.focusStart === 'number'
    ) {
      for (const el of mappedLeaves) {
        const s = parseInt(el.getAttribute('data-tex-start'), 10);
        const e = parseInt(el.getAttribute('data-tex-end'), 10);
        if (!isNaN(s) && !isNaN(e) && s === selectionPopover.focusStart && e === selectionPopover.focusEnd) {
          el.classList.add('v-cursor-focus-tok');
          break;
        }
      }
    }

    // 2. Highlight live candidate Start -> End preview range before user clicks "Chốt Đoạn"
    let draftStart = null;
    let draftEnd = null;
    if (selectionPopover) {
      if (selectionPopover.kind === 'drag') {
        draftStart = selectionPopover.startOffset;
        draftEnd = selectionPopover.endOffset;
      } else if (
        selectionPopover.kind === 'point' &&
        pendingStartOffset !== null &&
        typeof selectionPopover.draftStart === 'number' &&
        typeof selectionPopover.draftEnd === 'number'
      ) {
        draftStart = selectionPopover.draftStart;
        draftEnd = selectionPopover.draftEnd;
      }
    }

    if (draftStart !== null && draftEnd !== null && draftEnd > draftStart) {
      paintRangeCleanly(draftStart, draftEnd, 'v-draft-block-hl', 'v-draft-range-hl');
    }

    // 3. Highlight active Start Anchor pin on the paper with inline cancel trigger
    if (pendingStartOffset !== null) {
      let pinTarget = null;
      for (const el of mappedLeaves) {
        const s = parseInt(el.getAttribute('data-tex-start'), 10);
        const e = parseInt(el.getAttribute('data-tex-end'), 10);
        if (!isNaN(s) && !isNaN(e) && e > pendingStartOffset && s >= pendingStartOffset - 2) {
          pinTarget = el;
          break;
        }
      }
      if (!pinTarget) {
        for (const el of mappedLeaves) {
          const e = parseInt(el.getAttribute('data-tex-end'), 10);
          if (!isNaN(e) && e >= pendingStartOffset) {
            pinTarget = el;
            break;
          }
        }
      }
      if (pinTarget) {
        pinTarget.classList.add('v-pending-start-pin');
        const badge = document.createElement('span');
        badge.className = 'v-injected-pin-badge';
        badge.setAttribute('data-start-pin-anchor', 'true');
        badge.style.cssText =
          'display: inline-flex; align-items: center; gap: 5px; padding: 1px 6px; margin-right: 6px; font-family: var(--font-sans, sans-serif); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; background: #dc2626; color: #ffffff; border-radius: 2px; vertical-align: middle; user-select: none;';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'MỐC ĐẦU';
        badge.appendChild(labelSpan);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.setAttribute('data-clear-start-pin', 'true');
        clearBtn.textContent = '×';
        clearBtn.style.cssText =
          'border: none; background: rgba(0,0,0,0.22); color: #ffffff; font-size: 11px; line-height: 1; padding: 0 3px; border-radius: 1px; cursor: pointer;';
        badge.appendChild(clearBtn);

        pinTarget.prepend(badge);
      }
    }

    // 4. Highlight all committed manuscript-sliced segments 1, 2, 3...
    segments.forEach((seg, idx) => {
      if (
        seg.kind === 'custom' ||
        typeof seg.snappedStart !== 'number' ||
        typeof seg.snappedEnd !== 'number'
      ) {
        return;
      }
      const colorSlot = (idx % 4) + 1;
      const blockCls = `v-seg-block-hl-${colorSlot}`;
      const inlineCls = `v-seg-hl-${colorSlot}`;
      const accentHex = SEGMENT_ACCENT_BORDERS[idx % SEGMENT_ACCENT_BORDERS.length];
      const firstHit = paintRangeCleanly(seg.snappedStart, seg.snappedEnd, blockCls, inlineCls);

      if (firstHit) {
        const badge = document.createElement('span');
        badge.className = 'v-injected-pin-badge';
        badge.setAttribute('data-seg-jump-id', seg.id);
        badge.textContent = `ĐOẠN ${idx + 1}`;
        badge.style.cssText =
          `display: inline-block; padding: 1px 6px; margin-right: 6px; font-family: var(--font-sans, sans-serif); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; background: ${accentHex}; color: #ffffff; border-radius: 2px; vertical-align: middle; user-select: none;`;
        firstHit.prepend(badge);
      }
    });
  }, [isOpen, activeTab, manuscriptMappedHtml, segments, pendingStartOffset, selectionPopover]);

  const computeFloatingCoordinates = (anchorX, anchorYTop, anchorYBottom) => {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const minLeft = showSidebar && winW >= 768 ? 308 : 16;
    const estimatedWidth = 490;
    const clampedLeft = Math.max(minLeft, Math.min(winW - estimatedWidth - 16, anchorX - 180));
    const placeAbove = anchorYTop > 128;
    const topPos = placeAbove
      ? Math.max(58, anchorYTop - 10)
      : Math.min(winH - 96, anchorYBottom + 12);

    return {
      left: clampedLeft,
      top: topPos,
      placeAbove
    };
  };

  // Dismiss floating selection tooltip smoothly when scrolling far away
  const handleViewportScroll = (e) => {
    const curTop = e.currentTarget.scrollTop;
    if (selectionPopover && Math.abs(curTop - lastScrollTopRef.current) > 28) {
      setSelectionPopover(null);
    }
    lastScrollTopRef.current = curTop;
  };

  // Handle MouseUp on the Preview Paper -> Opens Unified Floating Action Tooltip (NEVER silently auto-commits!)
  const handlePaperMouseUp = (e) => {
    if (activeTab !== 'manuscript') return;
    const container = paperContainerRef.current;
    if (!container) return;

    if (scrollViewportRef.current) {
      lastScrollTopRef.current = scrollViewportRef.current.scrollTop;
    }

    // 1. Inline cancel button on MỐC ĐẦU badge
    if (e.target.closest?.('[data-clear-start-pin="true"]')) {
      e.stopPropagation();
      setPendingStartOffset(null);
      setSelectionPopover(null);
      return;
    }

    // 2. Pre-flight replacement buttons inside the preview
    const replaceAssetBtn = e.target.closest?.('[data-preflight-replace-asset]');
    if (replaceAssetBtn) {
      e.stopPropagation();
      const assetId = replaceAssetBtn.getAttribute('data-preflight-replace-asset');
      pendingReplaceTargetRef.current = { kind: 'asset', assetId };
      replaceInputRef.current?.click();
      return;
    }

    const replaceTikzBtn = e.target.closest?.('[data-preflight-replace-tikz]');
    if (replaceTikzBtn) {
      e.stopPropagation();
      const [sStr, eStr] = replaceTikzBtn.getAttribute('data-preflight-replace-tikz').split(':');
      pendingReplaceTargetRef.current = {
        kind: 'tikz',
        start: parseInt(sStr, 10),
        end: parseInt(eStr, 10)
      };
      replaceInputRef.current?.click();
      return;
    }

    // Ignore clicks on injected badges or links
    if (e.target.closest?.('.v-injected-pin-badge') || e.target.closest?.('a[href]')) {
      return;
    }

    // 3. Non-empty Mouse Drag Text Selection -> Open Floating Tooltip over selected range
    const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.rangeCount > 0 && sel.toString().trim().length >= 2) {
      const range = sel.getRangeAt(0);
      if (container.contains(range.commonAncestorContainer)) {
        const sOff = resolveDomPointToTexOffset(range.startContainer, range.startOffset, false, container);
        const eOff = resolveDomPointToTexOffset(range.endContainer, range.endOffset, true, container);
        if (sOff !== null && eOff !== null && sOff !== eOff) {
          const orderedStart = Math.min(sOff, eOff);
          const orderedEnd = Math.max(sOff, eOff);
          const rect = range.getBoundingClientRect();
          const coords = computeFloatingCoordinates(
            rect.width > 0 ? rect.left + Math.min(rect.width / 2, 180) : e.clientX,
            rect.top > 0 ? rect.top : e.clientY - 12,
            rect.bottom > 0 ? rect.bottom : e.clientY + 12
          );
          const rawSnippet = sel.toString().replace(/\s+/g, ' ').trim();
          setSelectionPopover({
            kind: 'drag',
            startOffset: orderedStart,
            endOffset: orderedEnd,
            snippet: truncateLabel(rawSnippet, 38),
            ...coords
          });
          return;
        }
      }
    }

    // 4. Single Click -> Open Floating Contextual Tooltip right at clicked point
    const clickedStart = resolveClickEventToTexOffset(e, false, container);
    const clickedEnd = resolveClickEventToTexOffset(e, true, container);
    if (clickedStart === null && clickedEnd === null) {
      setSelectionPopover(null);
      return;
    }

    const effStart = clickedStart !== null ? clickedStart : clickedEnd;
    const effEnd = clickedEnd !== null ? Math.max(effStart, clickedEnd) : effStart;

    // Identify exact clicked token/atomic element for subtle focus underline
    let focusStart = effStart;
    let focusEnd = effEnd;
    let anchorTop = e.clientY - 12;
    let anchorBottom = e.clientY + 12;

    const directTok = e.target.closest?.('.v-tex-tok, [data-tex-atomic="true"]');
    if (directTok && container.contains(directTok)) {
      const ts = parseInt(directTok.getAttribute('data-tex-start'), 10);
      const te = parseInt(directTok.getAttribute('data-tex-end'), 10);
      if (!isNaN(ts) && !isNaN(te)) {
        focusStart = ts;
        focusEnd = te;
      }
      const r = directTok.getBoundingClientRect();
      if (r.height > 0 && r.height < 220) {
        anchorTop = Math.min(e.clientY - 12, r.top);
        anchorBottom = Math.max(e.clientY + 12, r.bottom);
      }
    }

    const coords = computeFloatingCoordinates(e.clientX, anchorTop, anchorBottom);
    const sectionRange = findEnclosingSectionRange(effStart, ast.outlineHeadings, masterBodyTex.length);
    const blockRange = findClickedBlockRange(e.target, container);

    let draftStart = null;
    let draftEnd = null;
    if (pendingStartOffset !== null) {
      if (effStart < pendingStartOffset) {
        draftStart = effStart;
        draftEnd = pendingStartOffset;
      } else {
        draftStart = pendingStartOffset;
        draftEnd = Math.max(pendingStartOffset + 1, effEnd);
      }
    }

    const previewSnippet = buildShortExcerpt(
      masterBodyTex.slice(effStart, Math.min(masterBodyTex.length, effStart + 120)),
      36
    );

    setSelectionPopover({
      kind: 'point',
      clickStart: effStart,
      clickEnd: effEnd,
      focusStart,
      focusEnd,
      draftStart,
      draftEnd,
      snippet: previewSnippet,
      sectionRange,
      blockRange,
      ...coords
    });
  };

  // Handle Pre-flight image upload for .pdf figures or unsupported complex TikZ blocks
  const handlePreflightImageChosen = (e) => {
    const file = e.target.files?.[0];
    const targetInfo = pendingReplaceTargetRef.current;
    if (!file || !targetInfo || !assetVault) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result;
      if (typeof dataUrl !== 'string') return;

      if (targetInfo.kind === 'asset') {
        registerReplacementAsset(assetVault, targetInfo.assetId, dataUrl, file.name);
        setAssetRevision((r) => r + 1);
      } else if (targetInfo.kind === 'tikz' && onUpdateManuscriptBody) {
        const newAssetId = `asset_${String(assetVault.seq++).padStart(4, '0')}`;
        const tokenUrl = registerReplacementAsset(assetVault, newAssetId, dataUrl, file.name);
        if (tokenUrl) {
          const replacementCmd = `\\begin{center}\\includegraphics[width=0.72\\linewidth]{${tokenUrl}}\\end{center}`;
          const updatedBody =
            masterBodyTex.slice(0, targetInfo.start) +
            replacementCmd +
            masterBodyTex.slice(targetInfo.end);
          setSegments([]);
          setPendingStartOffset(null);
          setSelectionPopover(null);
          onUpdateManuscriptBody(updatedBody);
          setAssetRevision((r) => r + 1);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectWholeOutlineSection = (headingIdx) => {
    const headings = ast.outlineHeadings;
    if (headingIdx < 0 || headingIdx >= headings.length) return;
    const current = headings[headingIdx];
    let sectionEnd = masterBodyTex.length;
    for (let k = headingIdx + 1; k < headings.length; k++) {
      if (headings[k].level <= current.level) {
        sectionEnd = headings[k].start;
        break;
      }
    }
    addSegmentFromOffsets(current.start, sectionEnd);
  };

  const scrollToOutlineHeading = (headingId) => {
    setSelectionPopover(null);
    const locate = () => {
      const el = paperContainerRef.current?.querySelector(`#${headingId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (activeTab !== 'manuscript') {
      setActiveTab('manuscript');
      setTimeout(locate, 60);
    } else {
      locate();
    }
  };

  const scrollToStartPinOnPaper = () => {
    setSelectionPopover(null);
    const locate = () => {
      const badge = paperContainerRef.current?.querySelector('[data-start-pin-anchor="true"]');
      badge?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (activeTab !== 'manuscript') {
      setActiveTab('manuscript');
      setTimeout(locate, 60);
    } else {
      locate();
    }
  };

  const scrollToSegmentOnPaper = (seg) => {
    if (!seg) return;
    setSelectionPopover(null);
    if (activeTab === 'stitched' || seg.kind === 'custom') {
      const locateStitched = () => {
        const el = stitchedPaperRef.current?.querySelector(`[data-seg-id="${seg.id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      if (activeTab !== 'stitched') {
        setActiveTab('stitched');
        setTimeout(locateStitched, 60);
      } else {
        locateStitched();
      }
      return;
    }

    const locateManuscript = () => {
      const badge = paperContainerRef.current?.querySelector(`[data-seg-jump-id="${seg.id}"]`);
      badge?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (activeTab !== 'manuscript') {
      setActiveTab('manuscript');
      setTimeout(locateManuscript, 60);
    } else {
      locateManuscript();
    }
  };

  const moveSegment = (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= segments.length) return;
    setSegments((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const removeSegment = (idx) => {
    const targetSeg = segments[idx];
    if (targetSeg && editingTarget?.segId === targetSeg.id) {
      setEditingTarget(null);
      setPortalHostEl(null);
    }
    clearHoverHighlight();
    setSegments((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0 && activeTab !== 'manuscript') {
        setActiveTab('manuscript');
      }
      return next;
    });
  };

  const handleStitchedPaperMouseMove = (e) => {
    if (editingTarget || activeTab !== 'stitched') return;
    if (e.target.closest?.('[data-stitched-hover-edit-btn="true"]')) return;
    const paperRoot = stitchedPaperRef.current;
    if (!paperRoot) return;

    const segContainer = e.target.closest?.('[data-seg-id]');
    if (!segContainer || !paperRoot.contains(segContainer)) {
      clearHoverHighlight();
      return;
    }

    const segId = segContainer.getAttribute('data-seg-id');
    const resolved = resolveEditableStitchedBlock(e.target, segContainer);
    if (!resolved) {
      clearHoverHighlight();
      return;
    }

    if (hoveredDomElRef.current !== resolved.el) {
      if (hoveredDomElRef.current) {
        hoveredDomElRef.current.classList.remove('v-editable-block-hover');
      }
      resolved.el.classList.add('v-editable-block-hover');
      hoveredDomElRef.current = resolved.el;

      const rootRect = paperRoot.getBoundingClientRect();
      const blockRect = resolved.el.getBoundingClientRect();
      setHoveredBlockMeta({
        segId,
        start: resolved.start,
        end: resolved.end,
        topPx: Math.max(4, blockRect.top - rootRect.top - 10),
        rightPx: Math.max(4, rootRect.right - blockRect.right)
      });
    }
  };

  const handleStitchedPaperDoubleClick = (e) => {
    if (activeTab !== 'stitched') return;
    const paperRoot = stitchedPaperRef.current;
    if (!paperRoot) return;
    const segContainer = e.target.closest?.('[data-seg-id]');
    if (!segContainer || !paperRoot.contains(segContainer)) return;

    const segId = segContainer.getAttribute('data-seg-id');
    const seg = segments.find((s) => s.id === segId);
    if (!seg) return;

    const resolved = resolveEditableStitchedBlock(e.target, segContainer);
    if (resolved) {
      e.preventDefault();
      window.getSelection?.()?.removeAllRanges();
      handleOpenBlockEditorForRange(seg, resolved.start, resolved.end, false);
    }
  };

  const nonEmptySegmentCount = segments.filter(
    (s) => (s.reconstructedTex || '').trim().length > 0
  ).length;

  const handleFinalizeAndApply = async () => {
    if (nonEmptySegmentCount === 0 || editingTarget) return;
    setIsExporting(true);
    try {
      const { resolvedTex, embeddedCount, unresolvedFigures } = await exportUsedAssetsToDataUrls(
        composedResult.wrappedDocumentTex,
        assetVault
      );

      onApplyExtractedLesson({
        latexContent: resolvedTex,
        suggestedTitle: autoFillTitle ? composedResult.suggestedTitle : '',
        suggestedTimeMinutes: composedResult.suggestedTimeMinutes,
        suggestedBloomLevel: composedResult.suggestedBloomLevel,
        segmentCount: nonEmptySegmentCount,
        embeddedImageCount: embeddedCount,
        unresolvedFigures,
        danglingRefs: composedResult.danglingRefs
      });
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !manuscriptSession) return null;

  const isLightPaper = paperTheme === 'light';
  const nextSegNumber = segments.length + 1;
  const archiveStatsTooltip = `${manuscriptSession.archiveName} · ${preambleData.macroTable.size} định nghĩa macro · ${manuscriptSession.stats?.imageCount || 0} tệp ảnh`;

  const paperVarsStyle = isLightPaper
    ? {
        '--s1': '#fcfcfd',
        '--s2': '#f9f9fb',
        '--s3': '#e6e8eb',
        '--s4': '#d7dfe3',
        '--s6': '#8b939a',
        '--s7': '#697177',
        '--s9': '#687076',
        '--s11': '#525860',
        '--s12': '#11181c',
        backgroundColor: '#fcfcfd',
        color: '#11181c'
      }
    : {
        '--s1': '#141518',
        '--s2': '#1c1e22',
        '--s3': '#2e3238',
        '--s4': '#3d424a',
        '--s6': '#5a616b',
        '--s7': '#78808c',
        '--s9': '#9ba2ad',
        '--s11': '#c2c7d0',
        '--s12': '#edeef0',
        backgroundColor: '#141518',
        color: '#edeef0'
      };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1115] text-slate-100 select-none">
      <style>{VECTORIA_ACADEMIC_PREVIEW_CSS}</style>

      {/* Hidden File Input for Pre-flight Figure / TikZ Replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handlePreflightImageChosen}
        className="hidden"
      />

      {/* SINGLE MINIMALIST HEADER BAR */}
      <header className="h-12 shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 bg-[#14171e] border-b border-slate-800">
        {/* Left: Sidebar Toggle + Clean Title & Archive Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <HoverTip label={showSidebar ? 'Thu gọn cột Mục lục & Đoạn trích xuất' : 'Mở cột Mục lục & Đoạn trích xuất'} align="left">
            <button
              type="button"
              onClick={() => setShowSidebar((v) => !v)}
              className={`relative flex items-center justify-center w-8 h-8 border rounded-[2px] transition-colors cursor-pointer ${
                showSidebar
                  ? 'bg-sky-950/60 border-sky-700/80 text-sky-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              aria-label="Đóng mở cột Mục lục và Đoạn trích xuất"
            >
              <PanelLeft size={15} />
              {!showSidebar && segments.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9px] font-bold bg-sky-600 text-white rounded-[2px]">
                  {segments.length}
                </span>
              )}
            </button>
          </HoverTip>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-slate-100 truncate">
              Trích xuất Học liệu
            </span>
            <HoverTip label={archiveStatsTooltip} align="left">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700 rounded-[2px] truncate max-w-[200px] cursor-default">
                {manuscriptSession.archiveName}
              </span>
            </HoverTip>
          </div>
        </div>

        {/* Center: Clean 2-Mode Switcher */}
        <div className="flex items-center border border-slate-700 rounded-[2px] overflow-hidden bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('manuscript')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'manuscript'
                ? 'bg-sky-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText size={13} />
            <span>Bản thảo</span>
          </button>

          <HoverTip
            label={segments.length === 0 ? 'Chọn ít nhất 1 đoạn trên bản thảo để xem bản ghép' : 'Xem trước kết quả sau khi ghép và chuẩn hóa'}
          >
            <button
              type="button"
              onClick={() => setActiveTab('stitched')}
              disabled={segments.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-l border-slate-700 transition-colors ${
                segments.length === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : activeTab === 'stitched'
                    ? 'bg-emerald-700 text-white cursor-pointer'
                    : 'text-slate-300 hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <Eye size={13} />
              <span>Bản ghép</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold rounded-[2px] ${
                  segments.length === 0
                    ? 'bg-slate-800 text-slate-500'
                    : activeTab === 'stitched'
                      ? 'bg-emerald-900/80 text-emerald-100'
                      : 'bg-slate-800 text-sky-300'
                }`}
              >
                {segments.length}
              </span>
            </button>
          </HoverTip>
        </div>

        {/* Right: Compact Icon Cluster with Instant Custom Tooltips + Settings Popover */}
        <div className="flex items-center gap-1.5">
          <HoverTip
            label={segments.length === 0 ? 'Chưa có đoạn nào để xuất mã LaTeX' : 'Xem mã nguồn LaTeX tự chủ'}
            align="right"
          >
            <button
              type="button"
              disabled={segments.length === 0}
              onClick={() => setActiveTab((t) => (t === 'raw-tex' ? 'manuscript' : 'raw-tex'))}
              className={`flex items-center justify-center w-8 h-8 border rounded-[2px] transition-colors ${
                segments.length === 0
                  ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                  : activeTab === 'raw-tex'
                    ? 'bg-slate-700 border-slate-500 text-white cursor-pointer'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer'
              }`}
              aria-label="Xem mã nguồn LaTeX"
            >
              <Code2 size={15} />
            </button>
          </HoverTip>

          <HoverTip label={isLightPaper ? 'Chuyển sang nền giấy tối' : 'Chuyển sang nền giấy sáng'} align="right">
            <button
              type="button"
              onClick={() => setPaperTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="flex items-center justify-center w-8 h-8 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-[2px] transition-colors cursor-pointer"
              aria-label="Đổi màu nền trang giấy"
            >
              {isLightPaper ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </HoverTip>

          {/* Normalization & Title Settings Popover */}
          <div ref={settingsWrapRef} className="relative">
            <HoverTip label="Tùy chọn chuẩn hóa cấp mục & tiêu đề" align="right">
              <button
                type="button"
                onClick={() => setShowSettingsMenu((v) => !v)}
                className={`flex items-center justify-center w-8 h-8 border rounded-[2px] transition-colors cursor-pointer ${
                  showSettingsMenu
                    ? 'bg-sky-950/70 border-sky-600 text-sky-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                aria-label="Mở tùy chọn chuẩn hóa"
              >
                <SlidersHorizontal size={15} />
              </button>
            </HoverTip>

            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-[#14171f] border border-slate-700 rounded-[2px] shadow-xl p-3 space-y-2.5 text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
                  Tùy chọn Trích xuất
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeHierarchy}
                    onChange={(e) => setNormalizeHierarchy(e.target.checked)}
                    className="mt-0.5 accent-sky-600 rounded-[2px]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      Chuẩn hóa cấp mục & đánh số từ 1
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Đưa mục cao nhất về cấp 1 và đánh số lại tuần tự cho bài học đơn lẻ.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoFillTitle}
                    onChange={(e) => setAutoFillTitle(e.target.checked)}
                    className="mt-0.5 accent-sky-600 rounded-[2px]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      Tự động lấy tiêu đề gợi ý
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Điền tiêu đề mục đầu tiên của đoạn trích xuất vào ô Tên bài học.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hideCommentEnvs}
                    onChange={(e) => setHideCommentEnvs(e.target.checked)}
                    className="mt-0.5 accent-sky-600 rounded-[2px]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">
                      Ẩn khối nháp \begin&#123;comment&#125;
                    </div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Ẩn toàn bộ nội dung nằm trong môi trường comment như bản biên dịch PDF.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          <HoverTip label="Đóng cửa sổ" align="right">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded-[2px] transition-colors cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X size={17} />
            </button>
          </HoverTip>
        </div>
      </header>

      {/* MAIN WORKSPACE: UNIFIED LEFT SIDEBAR + UNINTERRUPTED ACADEMIC PAPER */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Mobile Backdrop when Sidebar is open on small screens */}
        {showSidebar && (
          <div
            onClick={() => setShowSidebar(false)}
            className="md:hidden fixed inset-0 top-12 z-30 bg-black/50"
          />
        )}

        {/* UNIFIED LEFT SIDEBAR: OUTLINE + ORDERED SEGMENTS + PRIMARY SAVE CTA */}
        {showSidebar && (
          <aside className="fixed md:static inset-y-0 top-12 md:top-0 left-0 z-40 w-72 shrink-0 bg-[#14171e] border-r border-slate-800 flex flex-col min-h-0">
            {/* TOP SECTION: MANUSCRIPT OUTLINE */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mục lục Bản thảo
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded-[2px]">
                  {ast.outlineHeadings.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {ast.outlineHeadings.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 leading-relaxed">
                    Bản thảo không chia mục lớn. Nhấp trực tiếp lên đoạn văn hoặc công thức bên phải để mở menu chọn đoạn.
                  </div>
                ) : (
                  ast.outlineHeadings.map((h, idx) => {
                    const indentPx = Math.max(0, (h.level - 1) * 11);
                    return (
                      <div
                        key={h.id}
                        style={{ paddingLeft: `${indentPx}px` }}
                        className="group flex items-center justify-between gap-1 rounded-[2px] hover:bg-slate-800/80 pr-1"
                      >
                        <button
                          type="button"
                          onClick={() => scrollToOutlineHeading(h.id)}
                          className={`flex-1 text-left px-2 py-1.5 text-xs truncate cursor-pointer ${
                            h.level <= 1
                              ? 'font-bold text-slate-100'
                              : h.level === 2
                                ? 'font-semibold text-slate-200'
                                : 'font-normal text-slate-400'
                          }`}
                        >
                          {h.numLabel ? `${h.numLabel} ${h.cleanTitle}` : h.cleanTitle}
                        </button>

                        <HoverTip label="Thêm trọn mục này vào danh sách đoạn" side="top" align="right">
                          <button
                            type="button"
                            onClick={() => handleSelectWholeOutlineSection(idx)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center bg-sky-800 hover:bg-sky-700 text-white rounded-[2px] transition-opacity cursor-pointer"
                            aria-label={`Chọn trọn mục ${h.cleanTitle}`}
                          >
                            <Plus size={12} />
                          </button>
                        </HoverTip>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* BOTTOM SECTION: SELECTED SEGMENTS PLAYLIST & PRIMARY COMMIT BUTTON */}
            <div className="shrink-0 border-t border-slate-800 bg-[#101319] flex flex-col max-h-[54%]">
              <div className="px-3 py-2 border-b border-slate-800/90 flex items-center justify-between gap-1 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    Đoạn trích xuất
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800/80 rounded-[2px]">
                    {segments.length}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <HoverTip
                    label="Thêm đối tượng tự soạn mới độc lập vào Bản ghép"
                    side="top"
                    align="right"
                  >
                    <button
                      type="button"
                      data-slicer-action="insert-custom-segment"
                      onClick={() => handleInsertCustomSegment(segments.length)}
                      className="h-6 px-1.5 inline-flex items-center gap-0.5 text-[10.5px] font-bold bg-teal-900/70 hover:bg-teal-700 text-teal-200 hover:text-white border border-teal-700/80 rounded-[2px] transition-colors cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>Tự soạn</span>
                    </button>
                  </HoverTip>

                  {segments.length > 0 && (
                    <>
                      <HoverTip
                        label={activeTab === 'stitched' ? 'Quay lại bản thảo gốc' : 'Xem & sửa trên Bản ghép'}
                        side="top"
                        align="right"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTab((t) => (t === 'stitched' ? 'manuscript' : 'stitched'))}
                          className={`w-6 h-6 flex items-center justify-center rounded-[2px] border cursor-pointer ${
                            activeTab === 'stitched'
                              ? 'bg-emerald-800 border-emerald-600 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                          aria-label="Xem thử bản ghép"
                        >
                          <Eye size={12} />
                        </button>
                      </HoverTip>

                      <HoverTip label="Xóa toàn bộ các đoạn đã chọn" side="top" align="right">
                        <button
                          type="button"
                          onClick={() => {
                            setSegments([]);
                            setPendingStartOffset(null);
                            setSelectionPopover(null);
                            setEditingTarget(null);
                            setPortalHostEl(null);
                            clearHoverHighlight();
                            if (activeTab !== 'manuscript') setActiveTab('manuscript');
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-[2px] bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                          aria-label="Xóa toàn bộ đoạn"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </HoverTip>
                    </>
                  )}
                </div>
              </div>

              {/* Active Start Pin Indicator inside Sidebar */}
              {pendingStartOffset !== null && (
                <div className="mx-2.5 mt-2 p-2 bg-red-950/40 border border-red-800/80 rounded-[2px] text-xs shrink-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-red-300 flex items-center gap-1">
                      <Flag size={11} />
                      <span>Đang ghim Mốc Đầu</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <HoverTip label="Cuộn tới vị trí Mốc Đầu" side="top" align="right">
                        <button
                          type="button"
                          onClick={scrollToStartPinOnPaper}
                          className="p-1 text-slate-300 hover:text-white bg-slate-900/80 rounded-[2px] cursor-pointer"
                          aria-label="Tới Mốc Đầu"
                        >
                          <Crosshair size={11} />
                        </button>
                      </HoverTip>
                      <HoverTip label="Hủy Mốc Đầu đang ghim" side="top" align="right">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingStartOffset(null);
                            setSelectionPopover(null);
                          }}
                          className="p-1 text-red-300 hover:text-white bg-red-950/80 rounded-[2px] cursor-pointer"
                          aria-label="Hủy Mốc Đầu"
                        >
                          <X size={11} />
                        </button>
                      </HoverTip>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug mt-1">
                    Cuộn tới vị trí kết thúc trên trang giấy và nhấp chuột để chốt Mốc Cuối.
                  </p>
                </div>
              )}

              {/* Ordered Vertical Segment List */}
              <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 min-h-[64px]">
                {segments.length === 0 ? (
                  <div className="p-2.5 border border-dashed border-slate-800 rounded-[2px] text-[11px] text-slate-400 leading-relaxed">
                    Nhấp chuột hoặc bôi đen trên trang giấy bên phải để trích đoạn, hoặc nhấn{' '}
                    <strong className="text-teal-300">+ Tự soạn</strong> để viết khối học liệu mới.
                  </div>
                ) : (
                  segments.map((seg, idx) => {
                    const isCustom = seg.kind === 'custom';
                    const isModifiedSliced =
                      !isCustom &&
                      typeof seg.originalTex === 'string' &&
                      seg.reconstructedTex !== seg.originalTex;
                    const hasUndo = Array.isArray(seg.undoStack) && seg.undoStack.length > 0;
                    const accentHex = isCustom
                      ? CUSTOM_SEGMENT_ACCENT
                      : SEGMENT_ACCENT_BORDERS[idx % SEGMENT_ACCENT_BORDERS.length];

                    return (
                      <div
                        key={seg.id}
                        style={{ borderLeftColor: accentHex }}
                        className="group flex flex-col gap-1 pl-2 pr-1.5 py-1.5 bg-[#181c25] border border-slate-800 border-l-[3px] rounded-[2px]"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => scrollToSegmentOnPaper(seg)}
                            className="flex-1 flex items-start gap-1.5 min-w-0 text-left cursor-pointer"
                          >
                            <span
                              style={{ backgroundColor: accentHex }}
                              className="shrink-0 mt-0.5 px-1.5 py-0.2 text-[10px] font-bold text-white rounded-[2px]"
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              {(isCustom || isModifiedSliced) && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  {isCustom && (
                                    <span className="px-1 py-0 text-[9px] font-bold uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-800 rounded-[2px]">
                                      Tự soạn
                                    </span>
                                  )}
                                  {isModifiedSliced && (
                                    <span className="px-1 py-0 text-[9px] font-bold uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-800/80 rounded-[2px]">
                                      Đã sửa
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="text-xs text-slate-200 line-clamp-2 leading-snug break-words">
                                {seg.excerpt}
                              </span>
                            </div>
                          </button>

                          <div className="shrink-0 flex items-center gap-0.5">
                            <HoverTip label="Sửa trực tiếp trên Bản ghép" side="top" align="right">
                              <button
                                type="button"
                                onClick={() => handleQuickEditSegmentFromSidebar(seg)}
                                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded-[2px] cursor-pointer"
                                aria-label="Sửa đoạn"
                              >
                                <Pencil size={11} />
                              </button>
                            </HoverTip>

                            {hasUndo && (
                              <HoverTip label="Hoàn tác bước sửa gần nhất" side="top" align="right">
                                <button
                                  type="button"
                                  onClick={() => handleUndoSegment(seg.id)}
                                  className="p-1 text-amber-400 hover:text-amber-200 hover:bg-slate-700 rounded-[2px] cursor-pointer"
                                  aria-label="Hoàn tác"
                                >
                                  <Undo2 size={11} />
                                </button>
                              </HoverTip>
                            )}

                            {isModifiedSliced && (
                              <HoverTip label="Khôi phục nguyên văn bản thảo gốc" side="top" align="right">
                                <button
                                  type="button"
                                  onClick={() => handleResetSegmentToOriginal(seg.id)}
                                  className="p-1 text-slate-400 hover:text-emerald-300 hover:bg-slate-700 rounded-[2px] cursor-pointer"
                                  aria-label="Khôi phục gốc"
                                >
                                  <RotateCcw size={11} />
                                </button>
                              </HoverTip>
                            )}

                            <HoverTip label="Đưa đoạn này lên trước" side="top" align="right">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveSegment(idx, -1)}
                                className={`p-1 rounded-[2px] ${
                                  idx === 0
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer'
                                }`}
                                aria-label="Đưa đoạn lên trên"
                              >
                                <ArrowUp size={12} />
                              </button>
                            </HoverTip>

                            <HoverTip label="Đưa đoạn này xuống sau" side="top" align="right">
                              <button
                                type="button"
                                disabled={idx === segments.length - 1}
                                onClick={() => moveSegment(idx, 1)}
                                className={`p-1 rounded-[2px] ${
                                  idx === segments.length - 1
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer'
                                }`}
                                aria-label="Đưa đoạn xuống dưới"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </HoverTip>

                            <HoverTip label="Xóa đoạn này" side="top" align="right">
                              <button
                                type="button"
                                onClick={() => removeSegment(idx)}
                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-[2px] cursor-pointer"
                                aria-label="Xóa đoạn"
                              >
                                <Trash2 size={12} />
                              </button>
                            </HoverTip>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Primary Commit CTA pinned at bottom of Left Sidebar */}
              <div className="p-2.5 border-t border-slate-800/90 shrink-0">
                <button
                  type="button"
                  data-slicer-action="finalize-export"
                  disabled={nonEmptySegmentCount === 0 || isExporting || Boolean(editingTarget)}
                  title={
                    editingTarget
                      ? 'Lưu hoặc hủy khối đang soạn thảo trước khi nạp vào bài học'
                      : undefined
                  }
                  onClick={handleFinalizeAndApply}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-[2px] transition-colors ${
                    nonEmptySegmentCount === 0 || isExporting || Boolean(editingTarget)
                      ? 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                  }`}
                >
                  <Check size={15} />
                  <span>
                    {isExporting
                      ? 'Đang đóng gói học liệu...'
                      : editingTarget
                        ? 'Lưu khối đang sửa trước khi nạp'
                        : nonEmptySegmentCount === 0
                          ? 'Nạp vào Bài học'
                          : `Trích xuất & Nạp vào Bài học · ${nonEmptySegmentCount} đoạn`}
                  </span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* RIGHT ACADEMIC PAPER VIEWPORT */}
        <div
          ref={scrollViewportRef}
          onScroll={handleViewportScroll}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && selectionPopover) {
              setSelectionPopover(null);
            }
          }}
          className={`flex-1 overflow-y-auto relative ${
            isLightPaper ? 'bg-[#e8ecf0]' : 'bg-[#0b0c0e]'
          } p-3 sm:p-6 md:p-8`}
        >
          {/* CONTEXTUAL FLOATING SELECTION TOOLTIP AT CURSOR */}
          {activeTab === 'manuscript' && selectionPopover && (
            <div
              ref={popoverRef}
              data-slicer-floating-tooltip="true"
              style={{
                left: `${selectionPopover.left}px`,
                top: `${selectionPopover.top}px`,
                transform: selectionPopover.placeAbove ? 'translateY(-100%)' : 'none'
              }}
              className="fixed z-50 max-w-[520px] bg-[#11141c] text-slate-100 border border-slate-600 rounded-[2px] shadow-2xl p-2 select-none"
            >
              {/* Popover Context Header */}
              <div className="flex items-center justify-between gap-3 px-1 pb-1.5 mb-1.5 border-b border-slate-800 text-[11px]">
                <span className="text-slate-300 font-medium truncate">
                  {selectionPopover.kind === 'drag'
                    ? `Vùng bôi đen: "${selectionPopover.snippet}"`
                    : pendingStartOffset !== null
                      ? `Phạm vi Đoạn ${nextSegNumber}: từ Mốc Đầu tới vị trí này`
                      : `Tại: "${selectionPopover.snippet}"`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionPopover(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="shrink-0 p-0.5 text-slate-400 hover:text-white rounded-[2px] cursor-pointer"
                  aria-label="Đóng menu chọn"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Popover Converged Action Buttons */}
              {selectionPopover.kind === 'drag' ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-slicer-action="commit-drag"
                    onClick={() =>
                      addSegmentFromOffsets(selectionPopover.startOffset, selectionPopover.endOffset)
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Thêm làm Đoạn {nextSegNumber}</span>
                  </button>

                  <button
                    type="button"
                    data-slicer-action="set-start"
                    onClick={() => {
                      setPendingStartOffset(selectionPopover.startOffset);
                      setSelectionPopover(null);
                      window.getSelection()?.removeAllRanges();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-[2px] cursor-pointer"
                  >
                    <Flag size={12} />
                    <span>Đặt làm Mốc Đầu</span>
                  </button>

                  {pendingStartOffset !== null && (
                    <button
                      type="button"
                      data-slicer-action="commit-end"
                      onClick={() =>
                        addSegmentFromOffsets(
                          Math.min(pendingStartOffset, selectionPopover.startOffset),
                          Math.max(pendingStartOffset, selectionPopover.endOffset)
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2px] cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Nối từ Mốc Đầu tới đây</span>
                    </button>
                  )}
                </div>
              ) : pendingStartOffset === null ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-slicer-action="set-start"
                    onClick={() => {
                      setPendingStartOffset(selectionPopover.clickStart);
                      setSelectionPopover(null);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer"
                  >
                    <Flag size={12} />
                    <span>Đặt Mốc Đầu</span>
                  </button>

                  {selectionPopover.blockRange && (
                    <button
                      type="button"
                      data-slicer-action="select-block"
                      onClick={() =>
                        addSegmentFromOffsets(
                          selectionPopover.blockRange.start,
                          selectionPopover.blockRange.end
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-[2px] cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Chọn {selectionPopover.blockRange.label}</span>
                    </button>
                  )}

                  {selectionPopover.sectionRange && (
                    <button
                      type="button"
                      data-slicer-action="select-section"
                      onClick={() =>
                        addSegmentFromOffsets(
                          selectionPopover.sectionRange.start,
                          selectionPopover.sectionRange.end
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-[2px] cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Chọn cả mục: {truncateLabel(selectionPopover.sectionRange.title, 20)}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-slicer-action="commit-end"
                    onClick={() =>
                      addSegmentFromOffsets(selectionPopover.draftStart, selectionPopover.draftEnd)
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2px] cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Đặt Mốc Cuối & Chốt Đoạn {nextSegNumber}</span>
                  </button>

                  <button
                    type="button"
                    data-slicer-action="move-start"
                    onClick={() => {
                      setPendingStartOffset(selectionPopover.clickStart);
                      setSelectionPopover(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-[2px] cursor-pointer"
                  >
                    <Flag size={12} />
                    <span>Dời Mốc Đầu tới đây</span>
                  </button>

                  <button
                    type="button"
                    data-slicer-action="cancel-start"
                    onClick={() => {
                      setPendingStartOffset(null);
                      setSelectionPopover(null);
                    }}
                    className="px-2 py-1.5 text-xs font-medium bg-red-950/70 hover:bg-red-900/70 text-red-300 border border-red-800/80 rounded-[2px] cursor-pointer"
                  >
                    Hủy Mốc Đầu
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: FULL MANUSCRIPT SOURCE-MAPPED INTERACTIVE PAPER */}
          {activeTab === 'manuscript' && (
            <div
              style={paperVarsStyle}
              className={`max-w-[940px] mx-auto border ${
                isLightPaper ? 'border-[#cfd6dd]' : 'border-[#2a2e35]'
              } rounded-[2px] px-5 sm:px-10 md:px-14 py-8 sm:py-12 min-h-full select-text cursor-text`}
            >
              <div
                ref={paperContainerRef}
                onMouseUp={handlePaperMouseUp}
                onClick={(e) => {
                  const anchor = e.target.closest?.('a[href^="#"]');
                  if (anchor && paperContainerRef.current?.contains(anchor)) {
                    const targetId = anchor.getAttribute('href')?.slice(1);
                    if (targetId) {
                      e.preventDefault();
                      const el = paperContainerRef.current.querySelector(`[id="${CSS.escape(targetId)}"]`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                }}
                className={`vectoria-academic-paper vectoria-slicer-interactive ${
                  isLightPaper ? '' : 'vectoria-paper-dark'
                }`}
                dangerouslySetInnerHTML={{ __html: manuscriptMappedHtml }}
              />
            </div>
          )}

          {/* TAB 2: STITCHED & RE-NUMBERED LIVE PREVIEW + IN-PLACE DIRECT EDITING */}
          {activeTab === 'stitched' && (
            <div className="max-w-[940px] mx-auto space-y-4">
              <div className="bg-[#14171e] border border-slate-700 rounded-[2px] p-3.5 text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Bản ghép hoàn chỉnh · {segments.length} phân đoạn
                    </div>
                    <div className="text-sm font-semibold mt-0.5 text-slate-100">
                      Tiêu đề gợi ý: {composedResult.suggestedTitle || 'Giữ nguyên tiêu đề hiện tại'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-xs text-slate-300">
                    <button
                      type="button"
                      onClick={() => handleInsertCustomSegment(segments.length)}
                      className="px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-semibold bg-teal-950/70 hover:bg-teal-800/80 text-teal-200 border border-teal-700/80 rounded-[2px] transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Thêm khối tự soạn</span>
                    </button>

                    <HoverTip
                      label={
                        normalizeHierarchy
                          ? 'Đang đánh số lại từ 1 cho bài học độc lập. Nhấp để giữ nguyên đánh số bản gốc'
                          : 'Đang giữ nguyên số chương, mục, phương trình như bản gốc. Nhấp để chuẩn hóa đánh số từ 1'
                      }
                      align="right"
                    >
                      <button
                        type="button"
                        onClick={() => setNormalizeHierarchy((v) => !v)}
                        className={`px-2.5 py-1 text-[11px] font-semibold border rounded-[2px] transition-colors cursor-pointer ${
                          normalizeHierarchy
                            ? 'bg-sky-950/60 border-sky-700/80 text-sky-200 hover:bg-sky-900/60'
                            : 'bg-emerald-950/50 border-emerald-700/80 text-emerald-200 hover:bg-emerald-900/50'
                        }`}
                      >
                        {normalizeHierarchy ? 'Đánh số: Chuẩn hóa từ 1' : 'Đánh số: Giữ nguyên bản gốc'}
                      </button>
                    </HoverTip>
                    <span>
                      Thời lượng: <strong>{composedResult.suggestedTimeMinutes} phút</strong>
                    </span>
                    <span>
                      Bloom: <strong>{composedResult.suggestedBloomLevel.toFixed(1)}</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>
                    Nhấp đúp vào đoạn văn, tiêu đề hoặc hộp học thuật bất kỳ trên giấy để sửa câu từ trực tiếp · Rê chuột giữa hai phân đoạn để chèn khối tự soạn độc lập.
                  </span>
                </div>

                {composedResult.overlappingSegmentPairs.length > 0 && (
                  <div className="mt-2.5 flex items-start gap-2 p-2 bg-amber-950/50 border border-amber-700/70 rounded-[2px] text-xs text-amber-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Phát hiện vùng văn bản chồng lấn giữa cặp đoạn{' '}
                      {composedResult.overlappingSegmentPairs.map(([a, b]) => `${a} & ${b}`).join(', ')}.
                    </span>
                  </div>
                )}

                {composedResult.danglingRefs.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-sky-950/50 border border-sky-800 rounded-[2px] text-xs text-sky-200">
                    <FileText size={14} className="shrink-0 mt-0.5 text-sky-400" />
                    <span>
                      Có {composedResult.danglingRefs.length} tham chiếu chéo trỏ ra ngoài vùng trích xuất:{' '}
                      {composedResult.danglingRefs.join(', ')}. Hệ thống đã bảo toàn số hiệu toàn cục.
                    </span>
                  </div>
                )}
              </div>

              <div
                style={paperVarsStyle}
                className={`border ${
                  isLightPaper ? 'border-[#cfd6dd]' : 'border-[#2a2e35]'
                } rounded-[2px] px-5 sm:px-10 md:px-14 py-6 sm:py-10 select-text`}
              >
                <div
                  ref={stitchedPaperRef}
                  onMouseMove={handleStitchedPaperMouseMove}
                  onMouseLeave={clearHoverHighlight}
                  onDoubleClick={handleStitchedPaperDoubleClick}
                  onClick={(e) => {
                    const anchor = e.target.closest?.('a[href^="#"]');
                    if (anchor && e.currentTarget.contains(anchor)) {
                      const targetId = anchor.getAttribute('href')?.slice(1);
                      if (targetId) {
                        e.preventDefault();
                        const el = e.currentTarget.querySelector(`[id="${CSS.escape(targetId)}"]`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  }}
                  className={`relative vectoria-academic-paper vectoria-stitched-editable ${
                    isLightPaper ? '' : 'vectoria-paper-dark'
                  }`}
                >
                  {/* Floating Contextual Edit Trigger Pill on Hovered Block */}
                  {hoveredBlockMeta && !editingTarget && (
                    <button
                      type="button"
                      data-stitched-hover-edit-btn="true"
                      style={{
                        top: `${hoveredBlockMeta.topPx}px`,
                        right: `${hoveredBlockMeta.rightPx}px`,
                        fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)"
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const targetSeg = segments.find((s) => s.id === hoveredBlockMeta.segId);
                        if (targetSeg) {
                          handleOpenBlockEditorForRange(
                            targetSeg,
                            hoveredBlockMeta.start,
                            hoveredBlockMeta.end,
                            false
                          );
                        }
                      }}
                      className="absolute z-30 inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer select-none"
                    >
                      <Pencil size={10} />
                      <span>Sửa khối</span>
                    </button>
                  )}

                  {/* Top Insertion Seam (before Segment 1) */}
                  {!editingTarget && (
                    <StitchedInsertionSeam
                      onInsert={() => handleInsertCustomSegment(0)}
                      label="Chèn khối tự soạn mở đầu"
                      subtleVisible={false}
                    />
                  )}

                  {segments.map((seg, idx) => {
                    const segRenderEntry = perSegmentHtmlList[idx];
                    const segHtml = segRenderEntry?.html || '';
                    const isCustom = seg.kind === 'custom';
                    const isNewDraftHere =
                      editingTarget?.isNewCustomDraft && editingTarget.segId === seg.id;

                    return (
                      <div key={seg.id}>
                        <div
                          data-seg-id={seg.id}
                          data-seg-kind={seg.kind || 'sliced'}
                          className={`v-stitched-seg ${
                            isCustom ? 'v-stitched-seg-custom' : ''
                          } ${editingTarget?.segId === seg.id ? 'v-stitched-seg-editing' : ''}`}
                        >
                          {isCustom && !isNewDraftHere && (
                            <div
                              style={{
                                fontFamily:
                                  "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)"
                              }}
                              className="mb-1 flex items-center justify-between gap-2 select-none"
                            >
                              <span
                                className={`inline-flex items-center px-1.5 py-0 text-[9.5px] font-bold uppercase tracking-wider rounded-[2px] border ${
                                  isLightPaper
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : 'bg-teal-950/60 text-teal-300 border-teal-800'
                                }`}
                              >
                                Đoạn {idx + 1} · Tự soạn độc lập
                              </span>
                            </div>
                          )}

                          {isNewDraftHere ? (
                            <AcademicPreviewBlockEditor
                              key={`${seg.id}:new`}
                              initialLatex=""
                              segmentKind="custom"
                              isNewCustomDraft
                              colorTable={preambleData.colorTable}
                              customEnvs={preambleData.customEnvs}
                              labelMap={composedResult.stitchedLabelMap}
                              darkPaper={!isLightPaper}
                              onSave={handleSaveEditedBlock}
                              onCancel={handleCancelEditBlock}
                            />
                          ) : (
                            <StitchedSegmentHtmlBody html={segHtml} />
                          )}
                        </div>

                        {/* Seam after Segment idx */}
                        {!editingTarget && (
                          <StitchedInsertionSeam
                            onInsert={() => handleInsertCustomSegment(idx + 1)}
                            label={
                              idx === segments.length - 1
                                ? 'Chèn khối tự soạn tiếp theo'
                                : `Chèn khối tự soạn giữa Đoạn ${idx + 1} và ${idx + 2}`
                            }
                            subtleVisible={idx === segments.length - 1}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* In-Place Portal Editor for Existing Blocks */}
                  {editingTarget &&
                    !editingTarget.isNewCustomDraft &&
                    portalHostEl &&
                    createPortal(
                      <AcademicPreviewBlockEditor
                        key={`${editingTarget.segId}:${editingTarget.blockStart}:${editingTarget.blockEnd}`}
                        initialLatex={editingTarget.initialLatex}
                        segmentKind={editingTarget.segmentKind || 'sliced'}
                        isNewCustomDraft={false}
                        colorTable={preambleData.colorTable}
                        customEnvs={preambleData.customEnvs}
                        labelMap={composedResult.stitchedLabelMap}
                        darkPaper={!isLightPaper}
                        onSave={handleSaveEditedBlock}
                        onCancel={handleCancelEditBlock}
                      />,
                      portalHostEl
                    )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLEAN SELF-CONTAINED LATEX OUTPUT */}
          {activeTab === 'raw-tex' && (
            <div className="max-w-[940px] mx-auto bg-[#14171d] border border-slate-800 rounded-[2px] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#1b1f27] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">
                  {normalizeHierarchy
                    ? 'Mã nguồn LaTeX tự chủ sau khi khép kín môi trường và chuẩn hóa cấp mục từ 1'
                    : 'Mã nguồn LaTeX tự chủ sau khi khép kín môi trường và bảo toàn đánh số gốc'}
                </span>
                <span className="text-slate-400">{composedResult.wrappedDocumentTex.length} ký tự</span>
              </div>
              <pre className="p-5 text-xs font-mono text-slate-200 whitespace-pre-wrap overflow-x-auto select-text leading-relaxed">
                {composedResult.wrappedDocumentTex}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
