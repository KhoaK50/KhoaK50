import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Check,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sigma,
  Code2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {
  ACADEMIC_BLOCK_ROLE_OPTIONS,
  ACADEMIC_LATEX_FONTS,
  ACADEMIC_LATEX_SIZES,
  ACADEMIC_COLOR_PALETTE,
  QUICK_MATH_SNIPPETS,
  parseLatexBlockToEditableModel,
  serializeEditableDomToLatex,
  validateSerializedLatexBlock,
  sanitizePastedContentToHtml,
  readActiveMarksAtSelection,
  applyFormatSpecToEditorSelection,
  insertAtomicMathChipAtSelection,
  updateAtomicMathChipElement,
  renderFormulaChipPreviewHtml
} from '../../utils/latexSlicer/previewBlockEditor';

const BOX_ROLE_TITLES_VI = {
  'box:dn': 'Định nghĩa',
  'box:dl': 'Định lý',
  'box:tc': 'Tính chất',
  'box:vd': 'Ví dụ',
  'box:nx': 'Nhận xét',
  'box:note': 'Ghi chú',
  'box:bt': 'Bài tập',
  'box:sol': 'Lời giải'
};

const DISPLAY_MATH_ENV_OPTIONS = [
  { value: 'brackets', label: 'Phương trình không số (\\[ ... \\])' },
  { value: 'equation', label: 'Phương trình đánh số (equation)' },
  { value: 'equation*', label: 'Phương trình không số (equation*)' },
  { value: 'align', label: 'Hệ căn chỉnh có số (align)' },
  { value: 'align*', label: 'Hệ căn chỉnh không số (align*)' },
  { value: 'gather*', label: 'Nhóm phương trình giữa (gather*)' }
];

const HEADING_ROLES_SET = new Set([
  'chapter',
  'chapter*',
  'section',
  'section*',
  'subsection',
  'subsection*',
  'subsubsection',
  'subsubsection*'
]);

function getEditorSurfaceTypographyStyle(blockRole, align) {
  const base = {
    fontFamily: "var(--font-academic, 'STIX Two Text', 'Latin Modern Roman', serif)",
    textAlign: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
    fontSize: '1.05rem',
    lineHeight: 1.72,
    fontWeight: 400
  };

  if (blockRole === 'chapter' || blockRole === 'chapter*') {
    return { ...base, fontSize: '1.95rem', lineHeight: 1.25, fontWeight: 700 };
  }
  if (blockRole === 'section' || blockRole === 'section*') {
    return { ...base, fontSize: '1.55rem', lineHeight: 1.3, fontWeight: 700 };
  }
  if (blockRole === 'subsection' || blockRole === 'subsection*') {
    return { ...base, fontSize: '1.28rem', lineHeight: 1.35, fontWeight: 700 };
  }
  if (blockRole === 'subsubsection' || blockRole === 'subsubsection*') {
    return { ...base, fontSize: '1.12rem', lineHeight: 1.4, fontWeight: 700 };
  }
  if (blockRole === 'quote') {
    return { ...base, fontStyle: 'italic' };
  }
  return base;
}

export default function AcademicPreviewBlockEditor({
  initialLatex = '',
  segmentKind = 'sliced',
  isNewCustomDraft = false,
  colorTable = null,
  customEnvs = null,
  labelMap = null,
  darkPaper = false,
  onSave,
  onCancel
}) {
  const parseOptions = useMemo(
    () => ({ colorTable, customEnvs, labelMap }),
    [colorTable, customEnvs, labelMap]
  );

  const initialParsed = useMemo(
    () => parseLatexBlockToEditableModel(initialLatex, parseOptions),
    [initialLatex, parseOptions]
  );

  const [blockModel, setBlockModel] = useState(initialParsed);
  const [rawCodeMode, setRawCodeMode] = useState(false);
  const [rawLatexDraft, setRawLatexDraft] = useState(initialLatex || '');
  const [validationError, setValidationError] = useState('');

  const [activeMarks, setActiveMarks] = useState({
    font: 'serif',
    size: 'normalsize',
    color: '',
    bold: false,
    italic: false,
    underline: false,
    uwave: false,
    sout: false,
    hl: false
  });

  // Live KaTeX Formula Popover state
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaInput, setFormulaInput] = useState('');
  const [isEditingExistingChip, setIsEditingExistingChip] = useState(false);

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const formulaInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const editingChipElRef = useRef(null);

  // Hydrate contentEditable innerHTML on initial mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialParsed.editableHtml || '';
      if (initialParsed.blockRole !== 'display-math') {
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          savedRangeRef.current = range.cloneRange();
        }
      }
    }
  }, [initialParsed]);

  const syncSelectionState = useCallback(() => {
    const el = editorRef.current;
    if (!el || typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (el.contains(r.commonAncestorContainer)) {
        savedRangeRef.current = r.cloneRange();
      }
    }
    setActiveMarks(readActiveMarksAtSelection(el));
  }, []);

  useEffect(() => {
    const handleDocSelectionChange = () => {
      const el = editorRef.current;
      if (!el || typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        syncSelectionState();
      }
    };
    document.addEventListener('selectionchange', handleDocSelectionChange);
    return () => document.removeEventListener('selectionchange', handleDocSelectionChange);
  }, [syncSelectionState]);

  useEffect(() => {
    if (formulaModalOpen && formulaInputRef.current) {
      formulaInputRef.current.focus();
      formulaInputRef.current.select();
    }
  }, [formulaModalOpen]);

  // Build role options including contextual list-item or preserved-env if initial block had one
  const roleGroups = useMemo(() => {
    const options = [...ACADEMIC_BLOCK_ROLE_OPTIONS];
    if (
      blockModel.initialBlockRole === 'list-item' ||
      blockModel.blockRole === 'list-item'
    ) {
      options.unshift({
        value: 'list-item',
        label: 'Mục danh sách lẻ (\\item)',
        group: 'Cấu trúc gốc'
      });
    }
    if (
      blockModel.initialBlockRole === 'preserved-env' ||
      blockModel.blockRole === 'preserved-env'
    ) {
      options.unshift({
        value: 'preserved-env',
        label: `Khung gốc (${blockModel.originalBoxEnv || 'env'})`,
        group: 'Cấu trúc gốc'
      });
    }

    const grouped = new Map();
    for (const opt of options) {
      if (!grouped.has(opt.group)) grouped.set(opt.group, []);
      grouped.get(opt.group).push(opt);
    }
    return Array.from(grouped.entries());
  }, [blockModel.initialBlockRole, blockModel.blockRole, blockModel.originalBoxEnv]);

  // Include active custom color swatch if manuscript uses a non-palette color
  const colorSwatches = useMemo(() => {
    const list = [...ACADEMIC_COLOR_PALETTE];
    if (
      activeMarks.color &&
      !list.some((c) => c.value.toLowerCase() === activeMarks.color.toLowerCase())
    ) {
      list.push({
        value: activeMarks.color,
        label: `Màu bản thảo (${activeMarks.color})`,
        swatch: activeMarks.color
      });
    }
    return list;
  }, [activeMarks.color]);

  const handleApplyFormat = useCallback(
    (spec) => {
      if (!editorRef.current || rawCodeMode || blockModel.blockRole === 'display-math') return;
      const nextRange = applyFormatSpecToEditorSelection(
        editorRef.current,
        spec,
        savedRangeRef.current
      );
      if (nextRange) {
        savedRangeRef.current = nextRange;
      }
      setValidationError('');
      syncSelectionState();
    },
    [rawCodeMode, blockModel.blockRole, syncSelectionState]
  );

  const handleRoleChange = useCallback(
    (nextRole) => {
      setValidationError('');
      setBlockModel((prev) => {
        // Transition from prose -> display-math
        if (nextRole === 'display-math' && prev.blockRole !== 'display-math') {
          let extractedMath = prev.rawMathTex || '';
          if (!extractedMath && editorRef.current) {
            const firstChip = editorRef.current.querySelector('[data-v-chip="math"]');
            if (firstChip && editorRef.current.textContent.trim() === firstChip.textContent.trim()) {
              extractedMath = firstChip.getAttribute('data-v-tex') || '';
            } else {
              extractedMath = editorRef.current.textContent.trim();
            }
          }
          return {
            ...prev,
            blockRole: 'display-math',
            mathEnv: prev.mathEnv || 'brackets',
            rawMathTex: extractedMath
          };
        }

        // Transition from display-math -> prose role
        if (prev.blockRole === 'display-math' && nextRole !== 'display-math') {
          if (
            editorRef.current &&
            !editorRef.current.innerHTML.trim() &&
            prev.rawMathTex.trim()
          ) {
            insertAtomicMathChipAtSelection(
              editorRef.current,
              prev.rawMathTex.trim(),
              null,
              parseOptions
            );
          }
        }

        // Transition into list role: ensure at least one <div data-v-list-item="true"> wrapper
        if (
          (nextRole === 'itemize' || nextRole === 'enumerate') &&
          prev.blockRole !== 'itemize' &&
          prev.blockRole !== 'enumerate' &&
          editorRef.current
        ) {
          const existingItems = editorRef.current.querySelectorAll('[data-v-list-item="true"]');
          if (existingItems.length === 0) {
            const currentHtml = editorRef.current.innerHTML.trim();
            editorRef.current.innerHTML = `<div data-v-list-item="true">${currentHtml}</div>`;
          }
        }

        return {
          ...prev,
          blockRole: nextRole
        };
      });
    },
    [parseOptions]
  );

  const handleOpenNewFormulaPopover = useCallback(() => {
    if (rawCodeMode || blockModel.blockRole === 'display-math') return;
    syncSelectionState();
    editingChipElRef.current = null;
    setIsEditingExistingChip(false);
    setFormulaInput('');
    setFormulaModalOpen(true);
  }, [rawCodeMode, blockModel.blockRole, syncSelectionState]);

  const handleCommitFormulaPopover = useCallback(() => {
    const cleanMath = formulaInput.trim();
    if (!cleanMath) {
      if (editingChipElRef.current && editingChipElRef.current.parentNode) {
        editingChipElRef.current.parentNode.removeChild(editingChipElRef.current);
      }
      editingChipElRef.current = null;
      setIsEditingExistingChip(false);
      setFormulaModalOpen(false);
      return;
    }

    if (editingChipElRef.current) {
      updateAtomicMathChipElement(editingChipElRef.current, cleanMath, parseOptions);
    } else if (editorRef.current) {
      const inserted = insertAtomicMathChipAtSelection(
        editorRef.current,
        cleanMath,
        savedRangeRef.current,
        parseOptions
      );
      if (inserted) {
        syncSelectionState();
      }
    }

    editingChipElRef.current = null;
    setIsEditingExistingChip(false);
    setFormulaModalOpen(false);
    setValidationError('');
  }, [formulaInput, parseOptions, syncSelectionState]);

  const handleDeleteExistingChip = useCallback(() => {
    if (editingChipElRef.current && editingChipElRef.current.parentNode) {
      editingChipElRef.current.parentNode.removeChild(editingChipElRef.current);
    }
    editingChipElRef.current = null;
    setIsEditingExistingChip(false);
    setFormulaModalOpen(false);
  }, []);

  const handleInsertMathSnippet = useCallback((snippetTex) => {
    const inputEl = formulaInputRef.current;
    if (!inputEl) {
      setFormulaInput((prev) => `${prev}${snippetTex}`);
      return;
    }
    const start = inputEl.selectionStart ?? formulaInput.length;
    const end = inputEl.selectionEnd ?? formulaInput.length;
    const nextVal = `${formulaInput.slice(0, start)}${snippetTex}${formulaInput.slice(end)}`;
    setFormulaInput(nextVal);
    requestAnimationFrame(() => {
      inputEl.focus();
      const nextPos = start + snippetTex.length;
      inputEl.setSelectionRange(nextPos, nextPos);
    });
  }, [formulaInput]);

  const handleToggleRawCodeMode = useCallback(() => {
    setValidationError('');
    if (!rawCodeMode) {
      const serialized = serializeEditableDomToLatex(editorRef.current, blockModel);
      setRawLatexDraft(serialized);
      setFormulaModalOpen(false);
      setRawCodeMode(true);
    } else {
      const check = validateSerializedLatexBlock(rawLatexDraft);
      if (!check.valid) {
        setValidationError(check.error);
        return;
      }
      const reparsed = parseLatexBlockToEditableModel(rawLatexDraft, parseOptions);
      setBlockModel(reparsed);
      if (editorRef.current) {
        editorRef.current.innerHTML = reparsed.editableHtml || '';
      }
      setRawCodeMode(false);
    }
  }, [rawCodeMode, blockModel, rawLatexDraft, parseOptions]);

  const handleCommitSave = useCallback(() => {
    const finalTex = rawCodeMode
      ? rawLatexDraft.trim()
      : serializeEditableDomToLatex(editorRef.current, blockModel).trim();

    if (!finalTex && isNewCustomDraft) {
      setValidationError('Nội dung khối tự soạn đang để trống. Nhập nội dung hoặc nhấn Hủy.');
      return;
    }

    const check = validateSerializedLatexBlock(finalTex);
    if (!check.valid) {
      setValidationError(check.error);
      return;
    }

    setValidationError('');
    onSave(finalTex);
  }, [rawCodeMode, rawLatexDraft, blockModel, isNewCustomDraft, onSave]);

  const handleEditorClick = useCallback(
    (e) => {
      const mathChip = e.target.closest?.('[data-v-chip="math"]');
      if (mathChip && editorRef.current?.contains(mathChip)) {
        e.preventDefault();
        e.stopPropagation();
        editingChipElRef.current = mathChip;
        setIsEditingExistingChip(true);
        setFormulaInput(mathChip.getAttribute('data-v-tex') || '');
        setFormulaModalOpen(true);
        return;
      }
      syncSelectionState();
    },
    [syncSelectionState]
  );

  const handleEditorPaste = useCallback(
    (e) => {
      e.preventDefault();
      const plain = e.clipboardData?.getData('text/plain') || '';
      const html = e.clipboardData?.getData('text/html') || '';
      const cleanHtml = sanitizePastedContentToHtml(plain, html, parseOptions);
      if (!cleanHtml || !editorRef.current) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;

      range.deleteContents();
      const temp = document.createElement('span');
      temp.innerHTML = cleanHtml;
      const frag = document.createDocumentFragment();
      let lastNode = null;
      while (temp.firstChild) {
        lastNode = temp.firstChild;
        frag.appendChild(lastNode);
      }
      range.insertNode(frag);

      if (lastNode) {
        const nextR = document.createRange();
        nextR.setStartAfter(lastNode);
        nextR.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextR);
        savedRangeRef.current = nextR.cloneRange();
      }
    },
    [parseOptions]
  );

  const handleContainerKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleCommitSave();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (formulaModalOpen) {
          setFormulaModalOpen(false);
          editingChipElRef.current = null;
          setIsEditingExistingChip(false);
          editorRef.current?.focus();
        } else {
          onCancel();
        }
        return;
      }
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        e.stopPropagation();
        handleOpenNewFormulaPopover();
      }
    },
    [handleCommitSave, formulaModalOpen, onCancel, handleOpenNewFormulaPopover]
  );

  const handleEditorKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          handleApplyFormat({ kind: 'bold' });
          return;
        }
        if (k === 'i') {
          e.preventDefault();
          handleApplyFormat({ kind: 'italic' });
          return;
        }
        if (k === 'u') {
          e.preventDefault();
          handleApplyFormat({ kind: 'underline' });
          return;
        }
      }

      // Single-line headings commit on Enter instead of inserting multi-line divs
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        HEADING_ROLES_SET.has(blockModel.blockRole)
      ) {
        e.preventDefault();
        handleCommitSave();
      }
    },
    [handleApplyFormat, blockModel.blockRole, handleCommitSave]
  );

  const chromeBg = darkPaper ? 'bg-[#12161f] border-[#2b3548] text-slate-100' : 'bg-[#f8fafc] border-[#cbd5e1] text-slate-800';
  const controlCls = darkPaper
    ? 'bg-[#19202c] border-[#334155] text-slate-100 focus:border-sky-400'
    : 'bg-white border-[#cbd5e1] text-slate-800 focus:border-sky-600';
  const iconBtnIdle = darkPaper
    ? 'text-slate-300 hover:bg-[#232c3d] hover:text-white border-transparent'
    : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-950 border-transparent';
  const iconBtnActive = darkPaper
    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
    : 'bg-sky-100 text-sky-800 border-sky-400';

  const isBoxRole = blockModel.blockRole.startsWith('box:');
  const isHeadingRole = HEADING_ROLES_SET.has(blockModel.blockRole);
  const isDisplayMath = blockModel.blockRole === 'display-math';
  const isListItemRole = blockModel.blockRole === 'list-item';
  const isListEnvRole = blockModel.blockRole === 'itemize' || blockModel.blockRole === 'enumerate';

  const displayMathPreviewHtml = useMemo(() => {
    if (!isDisplayMath) return '';
    return renderFormulaChipPreviewHtml(blockModel.rawMathTex, true, parseOptions);
  }, [isDisplayMath, blockModel.rawMathTex, parseOptions]);

  const formulaLivePreviewHtml = useMemo(() => {
    if (!formulaModalOpen) return '';
    return renderFormulaChipPreviewHtml(formulaInput, false, parseOptions);
  }, [formulaModalOpen, formulaInput, parseOptions]);

  return (
    <div
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`my-2 rounded-[2px] border transition-colors ${
        segmentKind === 'custom'
          ? darkPaper
            ? 'border-teal-500/70 bg-[#141821]'
            : 'border-teal-600 bg-white'
          : darkPaper
            ? 'border-sky-500/70 bg-[#141821]'
            : 'border-sky-600 bg-white'
      }`}
    >
      {/* Top Contextual Toolbar */}
      <div
        style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)" }}
        className={`px-2.5 py-2 border-b flex flex-col gap-1.5 select-none ${chromeBg}`}
      >
        {/* Row 1: Identity Badge + Block Role + Conditional Meta Input + Primary Save/Cancel */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[2px] border ${
                segmentKind === 'custom'
                  ? darkPaper
                    ? 'bg-teal-950/70 text-teal-300 border-teal-700'
                    : 'bg-teal-50 text-teal-800 border-teal-300'
                  : darkPaper
                    ? 'bg-sky-950/70 text-sky-300 border-sky-700'
                    : 'bg-sky-50 text-sky-800 border-sky-300'
              }`}
            >
              {segmentKind === 'custom' ? 'Tự soạn độc lập' : 'Sửa khối bản thảo'}
            </span>

            <select
              aria-label="Vai trò khối học thuật"
              value={blockModel.blockRole}
              disabled={rawCodeMode}
              onChange={(e) => handleRoleChange(e.target.value)}
              className={`h-7 px-2 text-[12px] font-medium rounded-[2px] border outline-none cursor-pointer disabled:opacity-50 ${controlCls}`}
            >
              {roleGroups.map(([groupName, groupOpts]) => (
                <optgroup key={groupName} label={groupName}>
                  {groupOpts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {isBoxRole && !rawCodeMode && (
              <input
                type="text"
                value={blockModel.boxTitle || ''}
                onChange={(e) =>
                  setBlockModel((prev) => ({ ...prev, boxTitle: e.target.value }))
                }
                placeholder="Tiêu đề phụ hộp, ví dụ: Cayley - Hamilton"
                className={`h-7 w-48 sm:w-56 px-2 text-[12px] rounded-[2px] border outline-none ${controlCls}`}
              />
            )}

            {isListItemRole && !rawCodeMode && (
              <input
                type="text"
                value={blockModel.itemLabel || ''}
                onChange={(e) =>
                  setBlockModel((prev) => ({ ...prev, itemLabel: e.target.value }))
                }
                placeholder="Nhãn mục, ví dụ: a) hoặc Bước 1:"
                className={`h-7 w-44 px-2 text-[12px] rounded-[2px] border outline-none ${controlCls}`}
              />
            )}

            {isDisplayMath && !rawCodeMode && (
              <select
                aria-label="Môi trường phương trình"
                value={blockModel.mathEnv || 'brackets'}
                onChange={(e) =>
                  setBlockModel((prev) => ({ ...prev, mathEnv: e.target.value }))
                }
                className={`h-7 px-2 text-[12px] font-medium rounded-[2px] border outline-none cursor-pointer ${controlCls}`}
              >
                {DISPLAY_MATH_ENV_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleToggleRawCodeMode}
              title="Chuyển đổi giữa soạn thảo trực quan và mã nguồn LaTeX của khối"
              className={`h-7 px-2 inline-flex items-center gap-1 text-[11px] font-semibold rounded-[2px] border transition-colors cursor-pointer ${
                rawCodeMode ? iconBtnActive : controlCls
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{rawCodeMode ? 'Trực quan' : 'Mã LaTeX'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              title="Hủy thay đổi (Esc)"
              className={`h-7 px-2.5 inline-flex items-center gap-1 text-[11px] font-semibold rounded-[2px] border transition-colors cursor-pointer ${controlCls}`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy</span>
            </button>

            <button
              type="button"
              onClick={handleCommitSave}
              title="Lưu khối vào Bản ghép (Ctrl+Enter)"
              className={`h-7 px-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white rounded-[2px] transition-colors cursor-pointer ${
                segmentKind === 'custom'
                  ? 'bg-teal-600 hover:bg-teal-500'
                  : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu khối</span>
            </button>
          </div>
        </div>

        {/* Row 2: Rich Typography Controls (Font Family, Size, Marks, Colors, Alignment, Atomic Math) */}
        {!rawCodeMode && !isDisplayMath && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-500/20">
            {/* Font Family */}
            <select
              aria-label="Phông chữ LaTeX"
              value={activeMarks.font || 'serif'}
              onMouseDown={syncSelectionState}
              onChange={(e) => handleApplyFormat({ kind: 'font', value: e.target.value })}
              className={`h-7 px-1.5 text-[11.5px] font-medium rounded-[2px] border outline-none cursor-pointer ${controlCls}`}
            >
              {ACADEMIC_LATEX_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Font Size */}
            <select
              aria-label="Cỡ chữ LaTeX"
              value={activeMarks.size || 'normalsize'}
              onMouseDown={syncSelectionState}
              onChange={(e) => handleApplyFormat({ kind: 'size', value: e.target.value })}
              className={`h-7 px-1.5 text-[11.5px] font-medium rounded-[2px] border outline-none cursor-pointer ${controlCls}`}
            >
              {ACADEMIC_LATEX_SIZES.map((sz) => (
                <option key={sz.value} value={sz.value}>
                  {sz.label}
                </option>
              ))}
            </select>

            <span className="h-4 w-px bg-slate-500/25 mx-0.5" />

            {/* Inline Marks */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'bold' })}
              title="In đậm - \textbf (Ctrl+B)"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                activeMarks.bold ? iconBtnActive : iconBtnIdle
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'italic' })}
              title="In nghiêng - \textit (Ctrl+I)"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                activeMarks.italic ? iconBtnActive : iconBtnIdle
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'underline' })}
              title="Gạch chân đơn - \underline (Ctrl+U)"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                activeMarks.underline ? iconBtnActive : iconBtnIdle
              }`}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'uwave' })}
              title="Gạch chân lượn sóng - \uwave"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border text-[11px] font-bold transition-colors cursor-pointer ${
                activeMarks.uwave ? iconBtnActive : iconBtnIdle
              }`}
            >
              <span style={{ textDecoration: 'underline wavy' }}>U</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'sout' })}
              title="Gạch ngang chữ - \sout"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                activeMarks.sout ? iconBtnActive : iconBtnIdle
              }`}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleApplyFormat({ kind: 'hl' })}
              title="Tô sáng nhấn mạnh - \hl"
              className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                activeMarks.hl ? iconBtnActive : iconBtnIdle
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-slate-500/25 mx-0.5" />

            {/* Academic Color Swatches */}
            <div className="inline-flex items-center gap-1 px-1">
              {colorSwatches.map((sw) => {
                const isSelected =
                  (activeMarks.color || '').toLowerCase() === (sw.value || '').toLowerCase();
                return (
                  <button
                    key={sw.value || 'default'}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleApplyFormat({ kind: 'color', value: sw.value })}
                    title={sw.value ? `${sw.label} (\\textcolor{${sw.value}})` : sw.label}
                    className={`w-4 h-4 rounded-[2px] border transition-transform cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-sky-500 ring-offset-1 scale-110 border-white'
                        : 'border-slate-400/60 hover:scale-110'
                    }`}
                    style={{
                      background:
                        sw.value ||
                        (darkPaper ? '#e2e8f0' : '#111827')
                    }}
                  />
                );
              })}
            </div>

            {!isHeadingRole && (
              <>
                <span className="h-4 w-px bg-slate-500/25 mx-0.5" />
                {/* Block Alignment */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockModel((prev) => ({ ...prev, align: 'left' }))}
                  title="Căn trái chuẩn"
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                    blockModel.align === 'left' ? iconBtnActive : iconBtnIdle
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockModel((prev) => ({ ...prev, align: 'center' }))}
                  title="Căn giữa (\begin{center})"
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                    blockModel.align === 'center' ? iconBtnActive : iconBtnIdle
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockModel((prev) => ({ ...prev, align: 'right' }))}
                  title="Căn phải (\begin{flushright})"
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                    blockModel.align === 'right' ? iconBtnActive : iconBtnIdle
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <span className="h-4 w-px bg-slate-500/25 mx-0.5" />

            {/* Insert Atomic KaTeX Math Chip */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleOpenNewFormulaPopover}
              title="Chèn công thức toán KaTeX tại vị trí con trỏ (Alt+M)"
              className={`h-7 px-2 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded-[2px] border transition-colors cursor-pointer ${
                formulaModalOpen ? iconBtnActive : controlCls
              }`}
            >
              <Sigma className="w-3.5 h-3.5 text-sky-500" />
              <span>+ Công thức</span>
            </button>
          </div>
        )}
      </div>

      {/* Live KaTeX Formula Popover (when inserting or clicking an existing math chip) */}
      {formulaModalOpen && !rawCodeMode && !isDisplayMath && (
        <div
          style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)" }}
          className={`px-3 py-2.5 border-b ${
            darkPaper ? 'bg-[#182030] border-[#2d3a52]' : 'bg-sky-50/60 border-sky-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {isEditingExistingChip
                ? 'Chỉnh sửa chip công thức toán'
                : 'Chèn công thức toán nội tuyến ($...$)'}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {QUICK_MATH_SNIPPETS.map((snip) => (
                <button
                  key={snip.label}
                  type="button"
                  onClick={() => handleInsertMathSnippet(snip.insert)}
                  className={`px-1.5 py-0.5 text-[10.5px] font-medium rounded-[2px] border transition-colors cursor-pointer ${controlCls}`}
                >
                  {snip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              ref={formulaInputRef}
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCommitFormulaPopover();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setFormulaModalOpen(false);
                  editingChipElRef.current = null;
                  setIsEditingExistingChip(false);
                  editorRef.current?.focus();
                }
              }}
              placeholder="Ví dụ: A \in \mathbb{R}^{m \times n} hoặc \frac{-b \pm \sqrt{\Delta}}{2a}"
              className={`flex-1 h-8 px-2.5 font-mono text-[12.5px] rounded-[2px] border outline-none ${controlCls}`}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCommitFormulaPopover}
                className="h-8 px-3 text-[11.5px] font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer"
              >
                {isEditingExistingChip ? 'Cập nhật' : 'Chèn vào dòng'}
              </button>
              {isEditingExistingChip && (
                <button
                  type="button"
                  onClick={handleDeleteExistingChip}
                  title="Xóa công thức này"
                  className="h-8 px-2 inline-flex items-center gap-1 text-[11.5px] font-semibold bg-red-600/15 text-red-600 border border-red-500/30 hover:bg-red-600 hover:text-white rounded-[2px] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFormulaModalOpen(false);
                  editingChipElRef.current = null;
                  setIsEditingExistingChip(false);
                  editorRef.current?.focus();
                }}
                className={`h-8 px-2.5 text-[11.5px] font-medium rounded-[2px] border cursor-pointer ${controlCls}`}
              >
                Đóng
              </button>
            </div>
          </div>

          <div
            className={`mt-2 px-3 py-1.5 rounded-[2px] border min-h-[2.2rem] flex items-center gap-2 overflow-x-auto ${
              darkPaper ? 'bg-[#11151d] border-[#263042]' : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-[10.5px] font-medium text-slate-400 shrink-0">
              Xem trước KaTeX:
            </span>
            <span
              className="text-[1rem]"
              dangerouslySetInnerHTML={{ __html: formulaLivePreviewHtml }}
            />
          </div>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div
          style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)" }}
          className="px-3 py-1.5 bg-red-600/10 border-b border-red-500/30 text-red-600 dark:text-red-400 text-[12px] font-medium flex items-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Editing Surface */}
      <div className="p-3 sm:p-4">
        {/* Raw LaTeX Code Editor Mode */}
        {rawCodeMode && (
          <div>
            <textarea
              value={rawLatexDraft}
              onChange={(e) => {
                setRawLatexDraft(e.target.value);
                setValidationError('');
              }}
              rows={Math.max(4, Math.min(14, rawLatexDraft.split('\n').length + 1))}
              placeholder="Nhập mã nguồn LaTeX thuần cho khối này..."
              className={`w-full p-2.5 font-mono text-[12.5px] leading-relaxed rounded-[2px] border outline-none resize-y ${controlCls}`}
            />
          </div>
        )}

        {/* Dedicated Display Math Editor Mode */}
        {!rawCodeMode && isDisplayMath && (
          <div className="space-y-2.5">
            <textarea
              value={blockModel.rawMathTex}
              onChange={(e) => {
                setBlockModel((prev) => ({ ...prev, rawMathTex: e.target.value }));
                setValidationError('');
              }}
              rows={Math.max(3, Math.min(10, (blockModel.rawMathTex || '').split('\n').length + 1))}
              placeholder="Ví dụ: \det(A - \lambda I_n) = 0 \iff \sum_{k=0}^{n} c_k \lambda^k = 0"
              className={`w-full p-2.5 font-mono text-[13px] leading-relaxed rounded-[2px] border outline-none resize-y ${controlCls}`}
            />
            <div
              className={`px-3 py-3 rounded-[2px] border overflow-x-auto text-center ${
                darkPaper ? 'bg-[#10141c] border-[#263042]' : 'bg-slate-50 border-slate-200'
              }`}
              dangerouslySetInnerHTML={{ __html: displayMathPreviewHtml }}
            />
          </div>
        )}

        {/* Visual Academic Surface (Always kept mounted in DOM so switching roles never drops nodes) */}
        <div className={rawCodeMode || isDisplayMath ? 'hidden' : 'block'}>
          {isBoxRole && (
            <div
              style={{ fontFamily: "var(--font-academic, 'STIX Two Text', serif)" }}
              className={`mb-2 pb-1.5 border-b text-[0.98rem] font-bold flex items-baseline gap-1.5 ${
                darkPaper ? 'border-slate-700 text-sky-300' : 'border-slate-200 text-sky-900'
              }`}
            >
              <span>{BOX_ROLE_TITLES_VI[blockModel.blockRole] || 'Hộp học thuật'}</span>
              {blockModel.boxTitle && (
                <span className="font-normal italic opacity-90">
                  ({blockModel.boxTitle})
                </span>
              )}
            </div>
          )}

          {isListEnvRole && (
            <div
              style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', sans-serif)" }}
              className="mb-1.5 text-[11px] text-slate-400"
            >
              {blockModel.blockRole === 'enumerate'
                ? 'Danh sách đánh số tự động - Nhấn Enter để tách mục \\item mới'
                : 'Danh sách dấu chấm - Nhấn Enter để tách mục \\item mới'}
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            data-placeholder={
              isHeadingRole
                ? 'Nhập tiêu đề mục...'
                : isBoxRole
                  ? 'Nhập nội dung học thuật trong hộp (nhấn + Công thức hoặc Alt+M để chèn toán)...'
                  : 'Nhập nội dung đoạn văn học thuật (nhấn + Công thức hoặc Alt+M để chèn toán)...'
            }
            onClick={handleEditorClick}
            onKeyUp={syncSelectionState}
            onMouseUp={syncSelectionState}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            style={getEditorSurfaceTypographyStyle(blockModel.blockRole, blockModel.align)}
            className={`v-inline-editor-surface min-h-[2.4rem] outline-none ${
              blockModel.blockRole === 'quote'
                ? 'pl-3.5 border-l-2 border-slate-400'
                : ''
            }`}
          />
        </div>
      </div>

      {/* Subtle Footer Hint */}
      <div
        style={{ fontFamily: "var(--font-ui, 'Be Vietnam Pro', system-ui, sans-serif)" }}
        className={`px-3 py-1 border-t text-[10.5px] flex flex-wrap items-center justify-between gap-2 ${
          darkPaper
            ? 'bg-[#10141c] border-[#263042] text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <span>
          Nhấp vào công thức toán để sửa · Ký tự đặc biệt (%, #, &amp;, _, $) trong lời văn được bảo vệ tự động
        </span>
        <span className="font-medium">Ctrl+Enter: Lưu · Esc: Hủy · Alt+M: Công thức</span>
      </div>
    </div>
  );
}
