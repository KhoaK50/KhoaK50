import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Save,
  ArrowLeft,
  Upload,
  Code,
  Scissors,
  FileArchive,
  Cpu,
  Eye,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import LatexSlicerModal from '../components/editor/LatexSlicerModal';
import {
  ingestLatexFileOrZip,
  disposeAssetVault,
  createEmptyAssetVault,
  stripLatexCommentsSafe,
  exportUsedAssetsToDataUrls
} from '../utils/latexSlicer/zipIngestor';
import {
  parsePreambleAndGlobals,
  expandMacrosSafely,
  transpileCustomEnvironmentsAndColors,
  serializeUsedBoxStylesHeader
} from '../utils/latexSlicer/preambleParser';

export default function Courses() {
  const [viewMode, setViewMode] = useState('list');
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);

  const [newTopicId, setNewTopicId] = useState('l1');
  const [newTitle, setNewTitle] = useState('Bài 1: Không gian vector');
  const [newOrder, setNewOrder] = useState(1);
  const [newSectionId, setNewSectionId] = useState('s1');
  const [newBloomLevel, setNewBloomLevel] = useState(1.5);
  const [newTimeSpent, setNewTimeSpent] = useState(15);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [language, setLanguage] = useState('vi');

  // Raw / Self-contained LaTeX string stored into lessons.content_html
  const [markdown, setMarkdown] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngestingFile, setIsIngestingFile] = useState(false);

  // Persistent Full Manuscript Session (kept across lessons so Admin can slice multiple lessons from 1 ZIP upload)
  const [manuscriptSession, setManuscriptSession] = useState(null);
  const [isSlicerOpen, setIsSlicerOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null); // { type: 'success' | 'error' | 'info', message: string }

  const fileInputRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = manuscriptSession;
  }, [manuscriptSession]);

  useEffect(() => {
    return () => {
      if (sessionRef.current?.assetVault) {
        disposeAssetVault(sessionRef.current.assetVault);
      }
    };
  }, []);

  const notify = (type, message) => {
    setStatusNotice({ type, message });
  };

  const handleAiDetect = () => {
    setIsAiDetecting(true);
    setTimeout(() => {
      const plainWords = markdown
        .replace(/\\[a-zA-Z]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      const eqCount = (markdown.match(/\$\$|\\\[|\\begin\{(?:equation|align|gather)/g) || []).length;
      const suggestedTime = Math.max(5, Math.min(90, Math.ceil(plainWords / 140 + eqCount * 0.8)));

      let suggestedBloom = 1.5;
      if (/chứng minh|định lý|trực chuẩn|chéo hóa/i.test(markdown)) suggestedBloom = 3.0;
      else if (/so sánh|đánh giá|biện luận/i.test(markdown)) suggestedBloom = 2.5;
      else if (/tính|áp dụng|giải hệ/i.test(markdown)) suggestedBloom = 2.0;
      else if (plainWords < 150) suggestedBloom = 1.0;

      setNewTimeSpent(suggestedTime);
      setNewBloomLevel(suggestedBloom);
      setIsAiDetecting(false);
      notify(
        'info',
        `Đã ước lượng học liệu: Thời lượng gợi ý ${suggestedTime} phút, Cấp độ Bloom ${suggestedBloom.toFixed(1)}.`
      );
    }, 400);
  };

  const fetchLessons = () => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/admin/lessons`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminAuth')}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLessons(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (viewMode === 'list') fetchLessons();
  }, [viewMode]);

  const handleEdit = (lesson) => {
    setCurrentLesson(lesson);
    setMarkdown(lesson.content_html || '');
    setNewBloomLevel(lesson.difficulty_level || 1.5);
    setNewTimeSpent(lesson.estimated_time || 15);
    setNewTitle(lesson.title || '');
    setStatusNotice(null);
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    setMarkdown(
      '% Nhập mã LaTeX hoặc tải thư mục .zip Overleaf để mở Bản xem trước chọn đoạn trích xuất\n\\begin{document}\n\n\\section{Tiêu đề mục bài học}\n\n\\end{document}'
    );
    setStatusNotice(null);
    setViewMode('create');
  };

  const handleSaveEdit = async () => {
    if (!currentLesson) return;
    const safeTitle = (newTitle || currentLesson.title || '').trim().slice(0, 145);
    setIsSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/lesson/${currentLesson.topic_id}/${currentLesson.order_index}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminAuth')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_html: markdown,
            difficulty_level: newBloomLevel,
            estimated_time: newTimeSpent,
            lang: language,
            title: safeTitle
          })
        }
      );
      if (res.ok) {
        setCurrentLesson((prev) => (prev ? { ...prev, title: safeTitle } : prev));
        notify('success', `Đã lưu cập nhật bài học "${safeTitle}" thành công.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        notify('error', `Không thể lưu bài học: ${errData.error || 'Lỗi phản hồi máy chủ.'}`);
      }
    } catch {
      notify('error', 'Không thể kết nối đến máy chủ Backend.');
    }
    setIsSaving(false);
  };

  const handleSaveCreate = async () => {
    const safeTitle = (newTitle || '').trim().slice(0, 145);
    if (!newTopicId || !safeTitle || !newSectionId) {
      notify('error', 'Vui lòng điền đầy đủ Topic ID, Section ID và Tiêu đề bài học.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lesson`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminAuth')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic_id: newTopicId.trim(),
          order_index: newOrder,
          section_id: newSectionId.trim(),
          title: safeTitle,
          content_html: markdown,
          difficulty_level: newBloomLevel,
          estimated_time: newTimeSpent,
          lang: language
        })
      });
      if (res.ok) {
        notify('success', `Đã tạo mới bài học "${safeTitle}".`);
        setViewMode('list');
      } else {
        const errData = await res.json().catch(() => ({}));
        notify('error', `Không thể tạo bài học: ${errData.error || 'Kiểm tra lại khóa chính Topic/Order.'}`);
      }
    } catch {
      notify('error', 'Không thể kết nối đến máy chủ Backend.');
    }
    setIsSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIngestingFile(true);
    setStatusNotice(null);
    try {
      const ingested = await ingestLatexFileOrZip(file);
      if (manuscriptSession?.assetVault) {
        disposeAssetVault(manuscriptSession.assetVault);
      }
      setManuscriptSession(ingested);
      setIsSlicerOpen(true);
      notify(
        'info',
        `Đã nạp bản thảo "${ingested.archiveName}" (${ingested.stats.mergedFilesCount} tệp TeX, ${ingested.stats.imageCount} ảnh). Hãy chấm Điểm Đầu & Điểm Cuối trên bản xem trước.`
      );
    } catch (err) {
      console.error(err);
      notify('error', `Lỗi đọc tệp tải lên: ${err.message}`);
    } finally {
      setIsIngestingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Allow opening Visual Slicer directly on existing editor LaTeX even without uploading a file
  const handleOpenSlicerFromEditor = () => {
    if (manuscriptSession) {
      setIsSlicerOpen(true);
      return;
    }
    if (!markdown || !markdown.trim()) {
      notify('error', 'Chưa có nội dung LaTeX. Hãy tải tệp .zip / .tex hoặc dán mã LaTeX vào khung soạn thảo.');
      return;
    }
    const preservedBoxStyleLines = (markdown.match(/^[ \t]*%[ \t]*@vectoria-box-style[ \t]+\{[^\r\n]+\}/gm) || []).join('\n');
    const cleaned = stripLatexCommentsSafe(markdown);
    const startM = cleaned.match(/\\begin\s*\{document\}/);
    const endM = [...cleaned.matchAll(/\\end\s*\{document\}/g)].pop();
    const rawPreamblePart = startM ? cleaned.substring(0, startM.index) : '';
    const preamble = [preservedBoxStyleLines, rawPreamblePart].filter(Boolean).join('\n');
    const body =
      startM && endM && endM.index > startM.index
        ? cleaned.substring(startM.index + startM[0].length, endM.index)
        : startM
          ? cleaned.substring(startM.index + startM[0].length)
          : cleaned;

    setManuscriptSession({
      archiveName: currentLesson ? `${currentLesson.topic_id}_${currentLesson.order_index}.tex` : 'ban_thao_hien_tai.tex',
      mainTexPath: 'editor.tex',
      rawPreambleText: preamble,
      masterBodyTex: body.trim(),
      assetVault: createEmptyAssetVault(),
      stats: {
        mainFile: 'editor.tex',
        mergedFilesCount: 1,
        imageCount: 0,
        pdfFigureCount: 0
      }
    });
    setIsSlicerOpen(true);
  };

  // Secondary option: Load full manuscript without slicing (for single-lesson .tex uploads)
  const handleLoadFullManuscriptWithoutSlicing = async () => {
    if (!manuscriptSession) return;
    const pData = parsePreambleAndGlobals(
      manuscriptSession.rawPreambleText,
      manuscriptSession.masterBodyTex
    );
    let cleanMasterBody = manuscriptSession.masterBodyTex
      .replace(/\\iffalse\b[\s\S]*?\\fi\b/g, '')
      .replace(/\\begin\s*\{comment\}[\s\S]*?\\end\s*\{comment\}/g, '')
      .replace(/\\(?:begin|end)\s*\{comment\}/g, '');
    let expanded = expandMacrosSafely(cleanMasterBody, pData.macroTable);
    expanded = transpileCustomEnvironmentsAndColors(expanded, pData);
    const boxStyleHeader = serializeUsedBoxStylesHeader(expanded, pData);
    const headerBlock = boxStyleHeader ? `${boxStyleHeader}\n` : '';
    const wrapped = `${headerBlock}\\begin{document}\n\n${expanded.trim()}\n\n\\end{document}`;
    const { resolvedTex, embeddedCount } = await exportUsedAssetsToDataUrls(
      wrapped,
      manuscriptSession.assetVault
    );
    setMarkdown(resolvedTex);
    notify(
      'success',
      `Đã nạp toàn bộ bản thảo "${manuscriptSession.archiveName}" vào khung soạn thảo (${embeddedCount} ảnh nhúng).`
    );
  };

  const handleApplyExtractedLesson = ({
    latexContent,
    suggestedTitle,
    suggestedTimeMinutes,
    suggestedBloomLevel,
    segmentCount,
    embeddedImageCount,
    unresolvedFigures
  }) => {
    setMarkdown(latexContent);
    if (suggestedTitle) {
      setNewTitle(suggestedTitle);
    }
    if (suggestedTimeMinutes) {
      setNewTimeSpent(suggestedTimeMinutes);
    }
    if (suggestedBloomLevel) {
      setNewBloomLevel(suggestedBloomLevel);
    }

    const figNote =
      unresolvedFigures && unresolvedFigures.length > 0
        ? ` (Lưu ý: ${unresolvedFigures.length} hình PDF chưa gắn ảnh PNG thay thế đã được chuyển thành nhãn văn bản an toàn).`
        : '';

    notify(
      'success',
      `Đã trích xuất, khép kín cấu trúc và ghép thành công ${segmentCount} phân đoạn (${embeddedImageCount} hình ảnh được bảo toàn). Kiểm tra lại và nhấn "Lưu bài học" để xuất bản lên giao diện học viên.${figNote}`
    );
  };

  const renderStatusBanner = () => {
    if (!statusNotice) return null;
    const styles =
      statusNotice.type === 'success'
        ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
        : statusNotice.type === 'error'
          ? 'bg-red-950/60 border-red-700/80 text-red-200'
          : 'bg-sky-950/60 border-sky-700/80 text-sky-200';

    return (
      <div className={`mb-4 px-3.5 py-2.5 border rounded-[2px] flex items-start justify-between gap-3 text-xs ${styles}`}>
        <div className="flex items-start gap-2">
          {statusNotice.type === 'error' ? (
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusNotice.message}</span>
        </div>
        <button
          type="button"
          onClick={() => setStatusNotice(null)}
          className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  const renderEditorLayout = (onSave, saveDisabled, titleElement) => (
    <div className="flex flex-col min-h-[calc(100vh-7rem)]">
      {/* Header Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="text-slate-300 hover:bg-slate-800 p-2 border border-slate-700 rounded-[2px] transition-colors cursor-pointer"
            title="Quay lại danh sách bài học"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 truncate">{titleElement}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-900 text-slate-200 px-3 py-2 text-sm rounded-[2px] border border-slate-700 outline-none"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>

          <input
            type="file"
            accept=".tex,.txt,.md,.zip"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            disabled={isIngestingFile}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-[2px] bg-slate-800 text-slate-100 font-medium border border-slate-600 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Upload size={16} />
            <span>{isIngestingFile ? 'Đang giải nén...' : 'Tải bản thảo (.zip Overleaf / .tex)'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSlicerFromEditor}
            className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-[2px] bg-sky-950/80 text-sky-300 font-semibold border border-sky-700 hover:bg-sky-900/70 transition-colors cursor-pointer"
          >
            <Scissors size={16} />
            <span>Mở Bản xem trước & Chọn đoạn trích xuất</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className={`flex items-center gap-2 text-white px-4 py-2 text-sm rounded-[2px] font-semibold transition-colors ${
              saveDisabled
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 cursor-pointer'
            }`}
          >
            <Save size={16} />
            <span>{saveDisabled ? 'Đang lưu...' : 'Lưu bài học'}</span>
          </button>
        </div>
      </div>

      {renderStatusBanner()}

      {/* Loaded Full Manuscript Session Bar (persists across lessons so 1 ZIP slices N lessons) */}
      {manuscriptSession && (
        <div className="mb-4 px-4 py-3 bg-[#151b24] border border-sky-800/70 rounded-[2px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileArchive size={18} className="text-sky-400 shrink-0" />
            <div className="text-xs text-slate-200 min-w-0">
              <div className="font-semibold text-sky-300 truncate">
                Bản thảo đầy đủ đang giữ sẵn trong phiên: {manuscriptSession.archiveName}
              </div>
              <div className="text-slate-400 mt-0.5">
                Tệp gốc: <code className="text-slate-300">{manuscriptSession.stats?.mainFile}</code> |{' '}
                {manuscriptSession.stats?.mergedFilesCount || 1} tệp TeX đã hợp nhất |{' '}
                {manuscriptSession.stats?.imageCount || 0} hình ảnh Web
                {manuscriptSession.stats?.pdfFigureCount > 0
                  ? ` | ${manuscriptSession.stats.pdfFigureCount} hình PDF`
                  : ''}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSlicerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer"
            >
              <Eye size={14} />
              <span>Chọn đoạn Đầu - Cuối trên Bản xem trước</span>
            </button>
            <button
              type="button"
              onClick={handleLoadFullManuscriptWithoutSlicing}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-[2px] cursor-pointer"
            >
              Nạp nguyên bản toàn bộ
            </button>
            <button
              type="button"
              onClick={() => {
                if (manuscriptSession?.assetVault) {
                  disposeAssetVault(manuscriptSession.assetVault);
                }
                setManuscriptSession(null);
              }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-300 cursor-pointer"
              title="Đóng phiên bản thảo này"
            >
              Đóng bản thảo
            </button>
          </div>
        </div>
      )}

      {/* Lesson Metadata Panel */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-slate-900/90 p-4 rounded-[2px] border border-slate-700 mb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Topic ID
              </label>
              <input
                type="text"
                value={newTopicId}
                disabled={viewMode === 'edit'}
                onChange={(e) => setNewTopicId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Section ID
              </label>
              <input
                type="text"
                value={newSectionId}
                disabled={viewMode === 'edit'}
                onChange={(e) => setNewSectionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Thứ tự bài (Order Index)
              </label>
              <input
                type="number"
                value={newOrder}
                disabled={viewMode === 'edit'}
                onChange={(e) => setNewOrder(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Tiêu đề bài học (Title)
              </label>
              <input
                type="text"
                maxLength={145}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end border-t border-slate-800 pt-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Cấp độ Bloom (Độ khó)
              </label>
              <select
                value={newBloomLevel}
                onChange={(e) => setNewBloomLevel(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500"
              >
                <option value={1.0}>1.0 - Nhớ (Remembering)</option>
                <option value={1.5}>1.5 - Hiểu (Understanding)</option>
                <option value={2.0}>2.0 - Vận dụng (Applying)</option>
                <option value={2.5}>2.5 - Phân tích (Analyzing)</option>
                <option value={3.0}>3.0 - Đánh giá (Evaluating)</option>
                <option value={3.5}>3.5 - Sáng tạo (Creating)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Thời gian học dự kiến (Phút)
              </label>
              <input
                type="number"
                value={newTimeSpent}
                onChange={(e) => setNewTimeSpent(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-[2px] p-2 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAiDetect}
                disabled={isAiDetecting}
                className="flex items-center justify-center gap-2 w-full bg-emerald-950/50 text-emerald-300 border border-emerald-700/70 hover:bg-emerald-900/50 px-4 py-2 rounded-[2px] text-sm font-semibold transition-colors cursor-pointer"
              >
                <Cpu size={16} />
                <span>
                  {isAiDetecting
                    ? 'Đang định lượng mật độ toán học...'
                    : 'Định lượng tự động Thời lượng & Cấp độ Bloom'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw LaTeX Editor Zone (Full width, clean, no cramped split-screen) */}
      <div className="flex-1 flex flex-col min-h-[380px] rounded-[2px] border bg-[#16181d] border-slate-700 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 bg-[#1e222a] border-slate-700 text-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Code size={17} className="text-sky-400" />
            <span>Mã nguồn LaTeX của Bài học (Tự chủ 100%, sẵn sàng lưu lên Giao diện Học viên)</span>
          </div>
          <span className="text-xs text-slate-400">{markdown.length.toLocaleString()} ký tự</span>
        </div>
        <div className="flex-1 w-full bg-[#14161a]">
          <textarea
            className="w-full h-full min-h-[340px] p-4 bg-transparent text-slate-200 font-mono text-sm focus:outline-none resize-y leading-relaxed"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Tải lên thư mục .zip Overleaf để trích xuất trực quan từ Bản xem trước, hoặc soạn mã LaTeX trực tiếp tại đây..."
            spellCheck="false"
          />
        </div>
      </div>

      {/* Full-Screen Visual Preview Multi-Segment LaTeX Slicer Modal */}
      <LatexSlicerModal
        isOpen={isSlicerOpen}
        onClose={() => setIsSlicerOpen(false)}
        manuscriptSession={manuscriptSession}
        onUpdateManuscriptBody={(updatedBody) =>
          setManuscriptSession((prev) => (prev ? { ...prev, masterBodyTex: updatedBody } : prev))
        }
        onApplyExtractedLesson={handleApplyExtractedLesson}
      />
    </div>
  );

  if (viewMode === 'edit' && currentLesson) {
    return renderEditorLayout(handleSaveEdit, isSaving, `Sửa bài học: ${currentLesson.title}`);
  }
  if (viewMode === 'create') {
    return renderEditorLayout(handleSaveCreate, isSaving, 'Tạo bài học mới');
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2.5 text-slate-100">
          <BookOpen className="text-sky-400" />
          <span>Quản lý Bài học</span>
        </h1>
        <div className="flex items-center gap-3">
          {manuscriptSession && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-950/60 text-sky-300 border border-sky-800 rounded-[2px]">
              <FileArchive size={14} />
              <span>Đang giữ bản thảo: {manuscriptSession.archiveName}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleCreateNew}
            className="bg-sky-600 text-white px-4 py-2 rounded-[2px] text-sm font-semibold hover:bg-sky-500 transition-colors cursor-pointer"
          >
            + Thêm Bài học
          </button>
        </div>
      </div>

      {renderStatusBanner()}

      <div className="bg-slate-900 rounded-[2px] border border-slate-700 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-700 text-xs uppercase tracking-wider">
              <th className="p-3.5 font-semibold text-slate-400">Topic ID</th>
              <th className="p-3.5 font-semibold text-slate-400">Chủ đề</th>
              <th className="p-3.5 font-semibold text-slate-400">Mục</th>
              <th className="p-3.5 font-semibold text-slate-400">Thứ tự</th>
              <th className="p-3.5 font-semibold text-slate-400">Tiêu đề</th>
              <th className="p-3.5 font-semibold text-slate-400">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-sm text-slate-400">
                  Đang tải danh sách bài học...
                </td>
              </tr>
            ) : lessons.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center">
                  <div className="text-sm font-semibold text-slate-300 mb-1">
                    Chưa có bài học nào trong hệ thống
                  </div>
                  <div className="text-xs text-slate-400 mb-4">
                    Bạn có thể tạo bài học mới và trích xuất trực tiếp từ thư mục .zip Overleaf.
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] cursor-pointer"
                  >
                    Tạo bài học đầu tiên
                  </button>
                </td>
              </tr>
            ) : (
              lessons.map((lesson) => (
                <tr
                  key={`${lesson.topic_id}-${lesson.order_index}`}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5 text-sm font-mono text-slate-300">{lesson.topic_id}</td>
                  <td
                    className="p-3.5 text-sm text-slate-400 max-w-[160px] truncate"
                    title={lesson.topic_title}
                  >
                    {lesson.topic_title || '-'}
                  </td>
                  <td
                    className="p-3.5 text-sm text-slate-400 max-w-[160px] truncate"
                    title={lesson.section_title}
                  >
                    {lesson.section_title || '-'}
                  </td>
                  <td className="p-3.5 text-sm text-slate-300">{lesson.order_index}</td>
                  <td className="p-3.5 text-sm font-medium text-slate-200">{lesson.title}</td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(lesson)}
                      className="px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-sky-700 text-sky-300 hover:text-white border border-slate-700 rounded-[2px] transition-colors cursor-pointer"
                    >
                      Chỉnh sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
