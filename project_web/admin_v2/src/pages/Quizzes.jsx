import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Save, 
  Upload, 
  Check, 
  X, 
  Image as ImageIcon, 
  Search, 
  CheckCircle2, 
  Circle,
  Trash2,
  Filter,
  Layers,
  FileText,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Code
} from 'lucide-react';
import { parseSingleQuestion, parseBatchQuestions } from '../utils/latexQuestionParser';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

import { CURRICULUM_TREE, findLessonHierarchy, getAllLessons } from '../constants/curriculumTree';

// Danh mục bẫy rút gọn, thực tế, không rườm rà
const DISTRACTOR_TYPES = [
  { value: 'NONE', label: 'Không bẫy' },
  { value: 'SIGN_SLIP', label: 'Nhầm dấu' },
  { value: 'DEGENERACY_TRAP', label: 'Bẫy suy biến' },
  { value: 'PROPERTY_CONFUSION', label: 'Nhầm tính chất' },
  { value: 'DIMENSION_MISMATCH', label: 'Sai số chiều' },
  { value: 'ARITHMETIC_SLIP', label: 'Tính nhẩm sai' }
];

const DEFAULT_FORM_STATE = {
  id: null,
  topic_id: 't1',
  section_id: 's1',
  lesson_id: 'l1',
  difficulty_level: 'MEDIUM',
  cognitive_tag: 'procedural', // 'conceptual' | 'procedural'
  is_synthetic: false, // True neu la cau hoi tong hop nhieu bai
  extra_lessons: [], // Danh sach cac bai hoc phoi hop them
  tags: '',
  source_reference: '',
  content_html: '',
  image_url: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  explanation_html: '',
  difficulty_index: 0.0,
  discrimination_index: 1.0,
  expected_time_seconds: 60,
  distractor_mapping: {
    A: 'NONE',
    B: 'NONE',
    C: 'NONE',
    D: 'NONE'
  },
  is_active: false
};

const SAMPLE_LATEX = `Cho ma trận $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$. Tính định thức $\\det(A)$.
*A. -2
B. 2 (nhầm dấu)
C. 10 (tính nhẩm)
D. -10 (suy biến)
Lời giải: Ta có $\\det(A) = 1 \\cdot 4 - 2 \\cdot 3 = 4 - 6 = -2$.`;

export default function Quizzes() {
  const allLessonsList = getAllLessons();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Unified compact filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | APPROVED | PENDING
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [cognitiveFilter, setCognitiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor mode: FORM (soạn/sửa) | IMPORT (nhập văn bản LaTeX / ZIP)
  const [editorMode, setEditorMode] = useState('FORM');
  const [importText, setImportText] = useState('');
  const [batchParsedList, setBatchParsedList] = useState([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  // Form state
  const [form, setForm] = useState(DEFAULT_FORM_STATE);
  
  // Refs
  const previewRef = useRef(null);
  const contentInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  
  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`,
    'Content-Type': 'application/json'
  });

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/questions`, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Typeset MathJax
  const triggerTypeset = useCallback(() => {
    if (window.MathJax && window.MathJax.typesetPromise && previewRef.current) {
      window.MathJax.typesetPromise([previewRef.current]).catch(err => console.error(err));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(triggerTypeset, 200);
    return () => clearTimeout(timer);
  }, [form.content_html, form.option_a, form.option_b, form.option_c, form.option_d, form.explanation_html, triggerTypeset]);

  const handleSelectQuestion = (q) => {
    const rawTags = Array.isArray(q.tags) ? q.tags : [];
    const isConceptual = rawTags.includes('conceptual');
    const cognitiveTag = isConceptual ? 'conceptual' : 'procedural';

    let distractorMapping = { A: 'NONE', B: 'NONE', C: 'NONE', D: 'NONE' };
    if (q.distractor_mapping) {
      try {
        const parsed = typeof q.distractor_mapping === 'string' 
          ? JSON.parse(q.distractor_mapping) 
          : q.distractor_mapping;
        distractorMapping = { ...distractorMapping, ...parsed };
      } catch (e) {
        console.error('Error parsing distractor_mapping:', e);
      }
    }

    const hierarchy = findLessonHierarchy(q.lesson_id);
    const resolvedTopic = hierarchy?.topicId || q.topic_id || 't1';
    const resolvedSection = hierarchy?.sectionId || Object.keys(CURRICULUM_TREE[resolvedTopic]?.sections || {})[0] || 's1';
    const resolvedLesson = q.lesson_id || hierarchy?.lessonId || 'l1';

    const extraLessons = rawTags.filter(t => t !== 'conceptual' && t !== 'procedural' && t !== resolvedLesson);
    const isSynthetic = extraLessons.length > 0;

    setForm({
      id: q.id,
      topic_id: resolvedTopic,
      section_id: resolvedSection,
      lesson_id: resolvedLesson,
      difficulty_level: q.difficulty_level || 'MEDIUM',
      cognitive_tag: cognitiveTag,
      is_synthetic: isSynthetic,
      extra_lessons: extraLessons,
      tags: extraLessons.join(', '),
      source_reference: q.source_reference || '',
      content_html: q.content_html || '',
      image_url: q.image_url || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || 'A',
      explanation_html: q.explanation_html || '',
      difficulty_index: q.difficulty_index !== null && q.difficulty_index !== undefined ? Number(q.difficulty_index) : 0.0,
      discrimination_index: q.discrimination_index !== null && q.discrimination_index !== undefined ? Number(q.discrimination_index) : 1.0,
      expected_time_seconds: q.expected_time_seconds || 60,
      distractor_mapping: distractorMapping,
      is_active: !!q.is_active
    });

    setEditorMode('FORM');
  };

  const handleNewQuestion = () => {
    setForm(DEFAULT_FORM_STATE);
    setEditorMode('FORM');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'topic_id') {
      const topic = CURRICULUM_TREE[value];
      const firstSectionId = topic ? Object.keys(topic.sections)[0] : '';
      const firstLessonId = firstSectionId && topic.sections[firstSectionId]?.lessons[0]?.id || '';
      setForm(prev => ({
        ...prev,
        topic_id: value,
        section_id: firstSectionId,
        lesson_id: firstLessonId
      }));
    } else if (name === 'section_id') {
      const topic = CURRICULUM_TREE[form.topic_id];
      const section = topic?.sections[value];
      const firstLessonId = section?.lessons[0]?.id || '';
      setForm(prev => ({
        ...prev,
        section_id: value,
        lesson_id: firstLessonId
      }));
    } else if (name === 'lesson_id') {
      setForm(prev => ({ ...prev, lesson_id: value }));
    } else if (name === 'difficulty_level') {
      let bVal = 0.0;
      let expTime = 60;
      if (value === 'EASY') {
        bVal = -1.0;
        expTime = 45;
      } else if (value === 'HARD') {
        bVal = 1.0;
        expTime = 90;
      }
      setForm(prev => ({
        ...prev,
        difficulty_level: value,
        difficulty_index: bVal,
        expected_time_seconds: expTime
      }));
    } else if (name === 'difficulty_index') {
      const num = parseFloat(value);
      let lvl = form.difficulty_level;
      if (!isNaN(num)) {
        if (num <= -0.5) lvl = 'EASY';
        else if (num >= 0.5) lvl = 'HARD';
        else lvl = 'MEDIUM';
      }
      setForm(prev => ({
        ...prev,
        difficulty_index: value,
        difficulty_level: lvl
      }));
    } else if (name === 'discrimination_index') {
      setForm(prev => ({
        ...prev,
        discrimination_index: value
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleCognitiveTagChange = (tag) => {
    setForm(prev => ({
      ...prev,
      cognitive_tag: tag,
      expected_time_seconds: tag === 'conceptual' ? 45 : 75
    }));
  };

  const handleDistractorChange = (optLetter, value) => {
    setForm(prev => ({
      ...prev,
      distractor_mapping: {
        ...prev.distractor_mapping,
        [optLetter]: value
      }
    }));
  };

  const handleInsertMathSnippet = (snippet) => {
    if (!contentInputRef.current) return;
    const textarea = contentInputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = form.content_html;
    const newVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    setForm(prev => ({ ...prev, content_html: newVal }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  // Unified LaTeX Parser: handles 1 question or multiple questions
  const handleParseImportText = () => {
    if (!importText.trim()) {
      alert('Vui lòng dán nội dung văn bản LaTeX vào ô.');
      return;
    }

    const batch = parseBatchQuestions(importText);
    if (batch.length > 1) {
      // Multiple questions detected
      setBatchParsedList(batch);
    } else {
      // Single question detected
      const single = parseSingleQuestion(importText);
      if (single && single.content_html) {
        const itemExtraTags = (single.tags || []).filter(t => t !== (single.lesson_id || form.lesson_id));
        setForm(prev => ({
          ...prev,
          content_html: single.content_html,
          option_a: single.option_a,
          option_b: single.option_b,
          option_c: single.option_c,
          option_d: single.option_d,
          correct_answer: single.correct_answer || 'A',
          explanation_html: single.explanation_html,
          cognitive_tag: single.cognitive_tag,
          expected_time_seconds: single.expected_time_seconds,
          source_reference: single.source_reference || prev.source_reference,
          is_synthetic: itemExtraTags.length > 0,
          extra_lessons: itemExtraTags,
          tags: itemExtraTags.join(', '),
          distractor_mapping: {
            ...prev.distractor_mapping,
            ...(single.distractor_mapping || {})
          }
        }));
        setBatchParsedList([]);
        setEditorMode('FORM');
        setTimeout(triggerTypeset, 200);
      } else {
        alert('Không bóc tách được câu hỏi. Vui lòng kiểm tra lại cấu trúc văn bản.');
      }
    }
  };

  // Bulk save batch questions to database
  const handleSaveBatch = async () => {
    if (batchParsedList.length === 0) return;
    try {
      setBatchSaving(true);
      let count = 0;

      for (let i = 0; i < batchParsedList.length; i++) {
        const item = batchParsedList[i];
        setBatchProgress(`Đang lưu câu ${i + 1} / ${batchParsedList.length}...`);

        const cleanDistractorMapping = {};
        ['A', 'B', 'C', 'D'].forEach(opt => {
          if (opt !== item.correct_answer && item.distractor_mapping?.[opt] && item.distractor_mapping[opt] !== 'NONE') {
            cleanDistractorMapping[opt] = item.distractor_mapping[opt];
          }
        });

        const targetTopic = item.topic_id || form.topic_id;
        const targetLesson = item.lesson_id || form.lesson_id;
        const targetDiff = item.difficulty_level || form.difficulty_level;

        let batchLessonTags = [targetLesson];
        const extraFromItem = Array.isArray(item.tags) ? item.tags.filter(t => t !== targetLesson) : [];
        if (extraFromItem.length > 0) {
          batchLessonTags = Array.from(new Set([targetLesson, ...extraFromItem]));
        } else if (form.is_synthetic && Array.isArray(form.extra_lessons) && form.extra_lessons.length > 0) {
          batchLessonTags = Array.from(new Set([targetLesson, ...form.extra_lessons]));
        }
        const finalBatchTags = Array.from(new Set([item.cognitive_tag || 'procedural', ...batchLessonTags]));

        const targetSource = item.source_reference || form.source_reference || 'OVERLEAF_IMPORT';

        const payload = {
          topic_id: targetTopic,
          lesson_id: targetLesson,
          difficulty_level: targetDiff,
          tags: finalBatchTags,
          source_reference: targetSource,
          content_html: item.content_html,
          option_a: item.option_a,
          option_b: item.option_b,
          option_c: item.option_c,
          option_d: item.option_d,
          correct_answer: item.correct_answer || 'A',
          explanation_html: item.explanation_html || '',
          difficulty_index: targetDiff === 'EASY' ? -1.0 : targetDiff === 'HARD' ? 1.0 : 0.0,
          discrimination_index: 1.0,
          expected_time_seconds: item.expected_time_seconds || (item.cognitive_tag === 'conceptual' ? 45 : 75),
          distractor_mapping: cleanDistractorMapping,
          is_active: false
        };

        const res = await fetch(`${API_BASE}/api/admin/questions`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) count++;
      }

      alert(`Đã lưu thành công ${count} câu hỏi vào hàng chờ duyệt.`);
      setBatchParsedList([]);
      setImportText('');
      setBatchProgress('');
      setEditorMode('FORM');
      fetchQuestions();
    } catch (err) {
      console.error('Batch save error:', err);
      alert('Đã xảy ra lỗi khi lưu hàng loạt.');
    } finally {
      setBatchSaving(false);
    }
  };

  // ZIP import from Overleaf (Client-side JSZip parsing)
  const handleZipImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBatchSaving(true);
      setBatchProgress('Đang đọc tệp ZIP Overleaf...');
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      let allTexContent = '';
      const texFiles = [];

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.tex') && !relativePath.startsWith('__MACOSX')) {
          texFiles.push(zipEntry);
        }
      }

      if (texFiles.length === 0) {
        alert('Không tìm thấy tệp .tex nào trong tệp ZIP này.');
        return;
      }

      for (const tf of texFiles) {
        const text = await tf.async('string');
        allTexContent += '\n\n' + text;
      }

      setImportText(allTexContent.trim());
      const parsed = parseBatchQuestions(allTexContent);
      if (parsed.length > 0) {
        setBatchParsedList(parsed);
        alert(`Đã giải mã thành công ${parsed.length} câu hỏi từ ${texFiles.length} tệp .tex trong ZIP Overleaf.`);
      } else {
        alert(`Đã đọc ${texFiles.length} tệp .tex nhưng chưa bóc tách được câu hỏi. Hãy kiểm tra định dạng.`);
      }
    } catch (err) {
      console.error('Lỗi giải nén ZIP:', err);
      alert('Không thể giải nén tệp ZIP. Vui lòng kiểm tra lại file.');
    } finally {
      setBatchSaving(false);
      setBatchProgress('');
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleUpdateBatchItemKey = (idx, newKey) => {
    setBatchParsedList(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], correct_answer: newKey };
      return copy;
    });
  };

  const handleToggleBatchItemCognitive = (idx) => {
    setBatchParsedList(prev => {
      const copy = [...prev];
      const current = copy[idx].cognitive_tag;
      const nextTag = current === 'conceptual' ? 'procedural' : 'conceptual';
      copy[idx] = {
        ...copy[idx],
        cognitive_tag: nextTag,
        expected_time_seconds: nextTag === 'conceptual' ? 45 : 75
      };
      return copy;
    });
  };

  const handleRemoveBatchItem = (idx) => {
    setBatchParsedList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditSingleBatchItem = (item) => {
    const itemExtraTags = (item.tags || []).filter(t => t !== (item.lesson_id || form.lesson_id));
    setForm({
      id: null,
      topic_id: item.topic_id || form.topic_id,
      section_id: form.section_id,
      lesson_id: item.lesson_id || form.lesson_id,
      difficulty_level: item.difficulty_level || form.difficulty_level,
      cognitive_tag: item.cognitive_tag || 'procedural',
      is_synthetic: itemExtraTags.length > 0,
      extra_lessons: itemExtraTags,
      tags: itemExtraTags.join(', '),
      source_reference: item.source_reference || form.source_reference || '',
      content_html: item.content_html || '',
      image_url: '',
      option_a: item.option_a || '',
      option_b: item.option_b || '',
      option_c: item.option_c || '',
      option_d: item.option_d || '',
      correct_answer: item.correct_answer || 'A',
      explanation_html: item.explanation_html || '',
      difficulty_index: 0.0,
      discrimination_index: 1.0,
      expected_time_seconds: item.expected_time_seconds || 60,
      distractor_mapping: item.distractor_mapping || { A: 'NONE', B: 'NONE', C: 'NONE', D: 'NONE' },
      is_active: false
    });
    setEditorMode('FORM');
    setTimeout(triggerTypeset, 200);
  };

  // Single Save
  const handleSave = async () => {
    try {
      setSaving(true);
      
      let finalLessonTags = [form.lesson_id];
      if (form.is_synthetic && Array.isArray(form.extra_lessons) && form.extra_lessons.length > 0) {
        finalLessonTags = Array.from(new Set([form.lesson_id, ...form.extra_lessons]));
      }
      const finalTags = Array.from(new Set([form.cognitive_tag, ...finalLessonTags]));

      const cleanDistractorMapping = {};
      ['A', 'B', 'C', 'D'].forEach(opt => {
        if (opt !== form.correct_answer && form.distractor_mapping?.[opt] && form.distractor_mapping[opt] !== 'NONE') {
          cleanDistractorMapping[opt] = form.distractor_mapping[opt];
        }
      });

      const payload = {
        ...form,
        tags: finalTags,
        difficulty_index: parseFloat(form.difficulty_index) || 0.0,
        discrimination_index: parseFloat(form.discrimination_index) || 1.0,
        expected_time_seconds: parseInt(form.expected_time_seconds, 10) || 60,
        distractor_mapping: cleanDistractorMapping
      };

      const isUpdate = !!form.id;
      const url = isUpdate 
        ? `${API_BASE}/api/admin/questions/${form.id}`
        : `${API_BASE}/api/admin/questions`;
      
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        await fetchQuestions();
        if (!isUpdate && data.question) {
          setForm(prev => ({ ...prev, id: data.question.id }));
        }
        alert(isUpdate ? 'Cập nhật thành công.' : 'Tạo mới thành công.');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi lưu.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!form.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/questions/${form.id}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, is_active: !prev.is_active }));
        fetchQuestions();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!form.id) return;
    if (!window.confirm(`Xóa câu hỏi #${form.id}? Thao tác này không thể hoàn tác.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/questions/${form.id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setForm(DEFAULT_FORM_STATE);
        fetchQuestions();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.id) {
      alert('Vui lòng lưu câu hỏi trước khi tải ảnh.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/admin/questions/${form.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({ ...prev, image_url: data.image_url }));
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  // Filter questions for sidebar
  const filteredQuestions = questions.filter(q => {
    const activeMatch = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'APPROVED' ? q.is_active : !q.is_active;
    
    const topicMatch = topicFilter === 'ALL' || q.topic_id === topicFilter;
    
    const rawTags = Array.isArray(q.tags) ? q.tags : [];
    const cognitiveMatch = 
      cognitiveFilter === 'ALL' ? true :
      cognitiveFilter === 'CONCEPTUAL' ? rawTags.includes('conceptual') :
      cognitiveFilter === 'PROCEDURAL' ? (!rawTags.includes('conceptual') || rawTags.includes('procedural')) : true;

    const searchMatch = !searchQuery || (q.content_html && q.content_html.toLowerCase().includes(searchQuery.toLowerCase())) || String(q.id).includes(searchQuery);

    return activeMatch && topicMatch && cognitiveMatch && searchMatch;
  });

  const approvedCount = questions.filter(q => q.is_active).length;
  const pendingCount = questions.filter(q => !q.is_active).length;

  return (
    <div className="flex flex-col h-screen bg-[#090d16] text-slate-200 font-sans antialiased select-none">
      
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-[#0c1220] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold text-slate-100 tracking-wide uppercase font-mono">
              Ngân Hàng Câu Hỏi
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 font-mono">
            Tổng: {questions.length}
          </span>
          <span className="text-xs px-2 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono">
            Đã duyệt: {approvedCount}
          </span>
          <span className="text-xs px-2 py-0.5 bg-amber-950/60 border border-amber-800 text-amber-400 font-mono">
            Chờ duyệt: {pendingCount}
          </span>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Editor Mode: FORM vs IMPORT */}
          <div className="flex border border-slate-700 bg-slate-900 p-0.5">
            <button
              onClick={() => setEditorMode('FORM')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
                editorMode === 'FORM' ? 'bg-sky-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Soạn / Sửa Trực Tiếp
            </button>
            <button
              onClick={() => setEditorMode('IMPORT')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
                editorMode === 'IMPORT' ? 'bg-sky-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              Nhập Từ LaTeX / ZIP Overleaf
            </button>
          </div>

          <button 
            onClick={fetchQuestions}
            title="Tải lại danh sách"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {form.id && (
            <>
              <button
                onClick={handleToggleActive}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors ${
                  form.is_active 
                    ? 'bg-amber-950/40 border-amber-600/60 text-amber-300 hover:bg-amber-900/50' 
                    : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/50'
                }`}
              >
                {form.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {form.is_active ? 'Bỏ duyệt' : 'Duyệt'}
              </button>

              <button
                onClick={handleDeleteQuestion}
                title="Xóa câu hỏi"
                className="p-1.5 bg-rose-950/40 border border-rose-700/60 hover:bg-rose-900/50 text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1 bg-sky-600 hover:bg-sky-500 border border-sky-500 disabled:opacity-50 text-xs font-semibold text-white tracking-wide uppercase transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Đang lưu...' : (form.id ? `Lưu #${form.id}` : 'Lưu Câu Mới')}
          </button>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ================= COLUMN 1: SIDEBAR (Gom gọn, tập trung) ================= */}
        <aside className="w-[280px] flex flex-col border-r border-slate-800 bg-[#0c1220]/70">
          
          {/* Compact Filter Area: Chỉ đúng 2 hàng */}
          <div className="p-2.5 border-b border-slate-800 space-y-2 bg-[#090d16]/60">
            
            {/* Hàng 1: Search + Nút Tạo Mới */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <button
                onClick={handleNewQuestion}
                title="Tạo câu hỏi mới"
                className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Mới
              </button>
            </div>

            {/* Hàng 2: Bộ 3 Dropdown gom gọn */}
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-1 py-1 text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Tất cả TT</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="PENDING">Chờ duyệt</option>
              </select>

              <select
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-1 py-1 text-slate-300 focus:outline-none focus:border-sky-500 truncate"
              >
                <option value="ALL">Mọi chủ đề</option>
                {Object.entries(CURRICULUM_TREE).map(([id, topic]) => (
                  <option key={id} value={id}>{id.toUpperCase()} - {topic.title}</option>
                ))}
              </select>

              <select
                value={cognitiveFilter}
                onChange={e => setCognitiveFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-1 py-1 text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Mọi dạng</option>
                <option value="CONCEPTUAL">Lý thuyết</option>
                <option value="PROCEDURAL">Tính toán</option>
              </select>
            </div>

          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">Đang tải...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">Không có câu hỏi phù hợp</div>
            ) : (
              filteredQuestions.map(q => {
                const isSelected = form.id === q.id;
                const rawTags = Array.isArray(q.tags) ? q.tags : [];
                const isConceptual = rawTags.includes('conceptual');
                
                return (
                  <div
                    key={q.id}
                    onClick={() => handleSelectQuestion(q)}
                    className={`p-2.5 cursor-pointer transition-colors border-l-2 ${
                      isSelected 
                        ? 'bg-sky-950/40 border-sky-400' 
                        : 'border-transparent hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400">#{q.id}</span>
                        <span className="text-[10px] font-mono px-1 bg-slate-800 text-slate-300">
                          {q.lesson_id?.toUpperCase() || 'L?'}
                        </span>
                        <span className={`text-[9px] px-1 font-mono ${
                          isConceptual ? 'bg-purple-950 text-purple-300' : 'bg-sky-950 text-sky-300'
                        }`}>
                          {isConceptual ? 'L.Thuyết' : 'T.Toán'}
                        </span>
                        {q.source_reference && (
                          <span className="text-[9px] font-mono px-1 bg-slate-800/90 text-slate-400 border border-slate-700/60 truncate max-w-[85px]" title={q.source_reference}>
                            {q.source_reference}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-medium ${
                          q.difficulty_level === 'EASY' ? 'text-emerald-400' :
                          q.difficulty_level === 'HARD' ? 'text-rose-400' :
                          'text-amber-400'
                        }`}>
                          {q.difficulty_level === 'EASY' ? 'DỄ' : q.difficulty_level === 'HARD' ? 'KHÓ' : 'TB'}
                        </span>
                        {q.is_active ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Circle className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-mono">
                      {q.content_html || '(Chưa có nội dung)'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ================= COLUMN 2: MAIN EDITOR ================= */}
        <main className="flex-1 overflow-y-auto p-5 bg-[#090d16]">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* CHẾ ĐỘ 1: SOẠN TRỰC TIẾP */}
            {editorMode === 'FORM' && (
              <>
                {/* Property Card */}
                <div className="bg-[#0c1220] border border-slate-800 p-3 space-y-3">
                  
                  {/* Row 1: 3-tier Hierarchy */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Chủ đề</label>
                      <select
                        name="topic_id"
                        value={form.topic_id}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-600 truncate"
                      >
                        {Object.entries(CURRICULUM_TREE).map(([id, topic]) => (
                          <option key={id} value={id}>{id.toUpperCase()} - {topic.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Đề mục</label>
                      <select
                        name="section_id"
                        value={form.section_id}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-600 truncate"
                      >
                        {Object.entries(CURRICULUM_TREE[form.topic_id]?.sections || {}).map(([sId, sec]) => (
                          <option key={sId} value={sId}>[{sId.toUpperCase()}] {sec.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Bài học</label>
                      <select
                        name="lesson_id"
                        value={form.lesson_id}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-600 truncate"
                      >
                        {(CURRICULUM_TREE[form.topic_id]?.sections[form.section_id]?.lessons || []).map(lesson => (
                          <option key={lesson.id} value={lesson.id}>[{lesson.id.toUpperCase()}] {lesson.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Cognitive + Difficulty Level + IRT b + IRT a + T_exp */}
                  <div className="grid grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-800/60">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Dạng bài</label>
                      <div className="grid grid-cols-2 border border-slate-800 bg-slate-900 p-0.5 text-center text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleCognitiveTagChange('conceptual')}
                          className={`py-1.5 font-medium transition-colors ${
                            form.cognitive_tag === 'conceptual' 
                              ? 'bg-purple-900 text-purple-200' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          L.Thuyết
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCognitiveTagChange('procedural')}
                          className={`py-1.5 font-medium transition-colors ${
                            form.cognitive_tag === 'procedural' 
                              ? 'bg-sky-900 text-sky-200' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          T.Toán
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Độ khó</label>
                      <div className="flex items-center gap-1">
                        <select
                          name="difficulty_level"
                          value={form.difficulty_level}
                          onChange={handleChange}
                          className="flex-1 bg-slate-900 border border-slate-800 px-1.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-sky-600"
                        >
                          <option value="EASY">Dễ</option>
                          <option value="MEDIUM">Vừa</option>
                          <option value="HARD">Khó</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">IRT b</label>
                      <div className="flex items-center">
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-800 border-r-0">b</span>
                        <input
                          type="number"
                          step="0.1"
                          min="-3.0"
                          max="3.0"
                          name="difficulty_index"
                          value={form.difficulty_index}
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-800 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                          title="Difficulty parameter b, IRT 2PL (-3.0 to +3.0)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">IRT a</label>
                      <div className="flex items-center">
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-800 border-r-0">a</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="3.0"
                          name="discrimination_index"
                          value={form.discrimination_index}
                          onChange={handleChange}
                          className="w-full bg-slate-900 border border-slate-800 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                          title="Discrimination parameter a, IRT 2PL (0.1 to 3.0)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">T_exp</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="expected_time_seconds"
                          value={form.expected_time_seconds}
                          onChange={handleChange}
                          min={15}
                          max={600}
                          step={5}
                          className="w-full bg-slate-900 border border-slate-800 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                        />
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-800 border-l-0">s</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Phân loại bài học & Nguồn trích dẫn */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
                    {/* Cột 1: Phân loại đơn bài vs Tổng hợp */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                          Phân loại bài học
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.is_synthetic}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm(prev => ({
                                ...prev,
                                is_synthetic: checked,
                                extra_lessons: checked ? prev.extra_lessons : []
                              }));
                            }}
                            className="w-3.5 h-3.5 rounded-none text-sky-600 bg-slate-900 border-slate-700"
                          />
                          <span className={`text-[11px] font-medium ${form.is_synthetic ? 'text-sky-400' : 'text-slate-400'}`}>
                            Câu hỏi tổng hợp
                          </span>
                        </label>
                      </div>

                      {!form.is_synthetic ? (
                        <div className="px-2 py-1.5 bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                          <span>Đơn bài: [{form.lesson_id?.toUpperCase()}]</span>
                          <span className="text-[10px] text-slate-500">Tự động gắn tag BKT</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              if (!form.extra_lessons.includes(val) && val !== form.lesson_id) {
                                setForm(prev => ({
                                  ...prev,
                                  extra_lessons: [...prev.extra_lessons, val]
                                }));
                              }
                              e.target.value = '';
                            }}
                            className="w-full bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-600 truncate"
                            defaultValue=""
                          >
                            <option value="" disabled>+ Thêm bài học phối hợp...</option>
                            {allLessonsList.map(l => (
                              <option 
                                key={l.id} 
                                value={l.id}
                                disabled={l.id === form.lesson_id || form.extra_lessons.includes(l.id)}
                              >
                                [{l.id.toUpperCase()}] {l.title}
                              </option>
                            ))}
                          </select>

                          {/* Chips danh sách bài học phối hợp */}
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-sky-950/80 border border-sky-800 text-sky-300 text-[10px] font-mono">
                              Chính: {form.lesson_id?.toUpperCase()}
                            </span>
                            {form.extra_lessons.map(lId => (
                              <span 
                                key={lId} 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono"
                              >
                                {lId.toUpperCase()}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      extra_lessons: prev.extra_lessons.filter(id => id !== lId)
                                    }));
                                  }}
                                  className="text-slate-400 hover:text-rose-400 font-bold ml-0.5"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Nguồn trích dẫn */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                        Nguồn trích dẫn (Đề thi thật / Giáo trình)
                      </label>
                      <input
                        type="text"
                        name="source_reference"
                        value={form.source_reference}
                        onChange={handleChange}
                        placeholder="Ví dụ: Đề GK ĐHBK 2023, Đề CK K64..."
                        className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-600"
                      />
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Gợi ý:</span>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, source_reference: 'Đề GK ĐHBK 2023' }))}
                          className="text-sky-400 hover:underline"
                        >
                          GK ĐHBK
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, source_reference: 'Đề CK KHTN 2023' }))}
                          className="text-sky-400 hover:underline"
                        >
                          CK KHTN
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, source_reference: 'Giáo trình ĐSTT' }))}
                          className="text-sky-400 hover:underline"
                        >
                          Giáo trình
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Stem Area */}
                <div className="bg-[#0c1220] border border-slate-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Đề bài
                    </label>

                    {/* Quick Math Toolbar */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-500 text-[10px]">Chèn:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertMathSnippet('$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                      >
                        Ma trận
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMathSnippet('$\\det(A)$')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                      >
                        \\det
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMathSnippet('$\\vec{v}$')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                      >
                        \\vec
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMathSnippet('$\\frac{a}{b}$')}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                      >
                        \\frac
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={contentInputRef}
                    name="content_html"
                    value={form.content_html}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Gõ nội dung đề bài tại đây..."
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 leading-relaxed"
                  />

                  {/* Ảnh đính kèm */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      {form.image_url ? (
                        <div className="flex items-center gap-2">
                          <img src={form.image_url} alt="Minh họa" className="h-8 border border-slate-700" />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                            className="text-rose-400 text-[11px] underline"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300"
                          >
                            Tải ảnh đính kèm
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Options & Distractor Row (Đã sửa triệt để lỗi tràn dòng) */}
                <div className="bg-[#0c1220] border border-slate-800 p-3 space-y-3">
                  <div className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                    4 Phương án
                  </div>

                  <div className="space-y-2.5">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isCorrect = form.correct_answer === opt;
                      const distractorVal = form.distractor_mapping?.[opt] || 'NONE';

                      return (
                        <div 
                          key={opt}
                          className={`p-2.5 border transition-colors ${
                            isCorrect 
                              ? 'bg-emerald-950/20 border-emerald-600/60' 
                              : 'bg-slate-900/50 border-slate-800'
                          }`}
                        >
                          {/* Option Header Bar: Radio + Letter Badge + Distractor Dropdown */}
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="correct_answer"
                                value={opt}
                                checked={isCorrect}
                                onChange={handleChange}
                                className="w-3.5 h-3.5 text-emerald-500 bg-slate-800 border-slate-700"
                              />
                              <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold font-mono border ${
                                isCorrect 
                                  ? 'bg-emerald-600 text-white border-emerald-500' 
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {opt}
                              </span>
                              <span className="text-xs font-medium text-slate-300">
                                {isCorrect ? 'Đáp án đúng' : `Phương án ${opt}`}
                              </span>
                            </label>

                            {/* Dropdown bẫy: Ngắn gọn, không giải thích rườm rà */}
                            {!isCorrect && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 font-mono">Bẫy:</span>
                                <select
                                  value={distractorVal}
                                  onChange={(e) => handleDistractorChange(opt, e.target.value)}
                                  className="bg-slate-900 border border-slate-700 text-xs text-slate-300 px-2 py-0.5 focus:outline-none focus:border-sky-500"
                                >
                                  {DISTRACTOR_TYPES.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Textarea for option text */}
                          <textarea
                            name={`option_${opt.toLowerCase()}`}
                            value={form[`option_${opt.toLowerCase()}`]}
                            onChange={handleChange}
                            rows={2}
                            placeholder={`Nội dung phương án ${opt}...`}
                            className="w-full bg-slate-900 border border-slate-800 p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Lời giải chi tiết */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-slate-400 uppercase font-medium">
                      Lời giải
                    </label>
                    <textarea
                      name="explanation_html"
                      value={form.explanation_html}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Lời giải chi tiết cho sinh viên..."
                      className="w-full bg-slate-900 border border-slate-800 p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* CHẾ ĐỘ 2: NHẬP TỪ LATEX / FILE ZIP OVERLEAF */}
            {editorMode === 'IMPORT' && (
                <div className="bg-[#0c1220] border border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                    Nhập Từ LaTeX / ZIP Overleaf
                  </h2>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".zip"
                      ref={zipInputRef}
                      onChange={handleZipImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => zipInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      Tải ZIP
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportText(SAMPLE_LATEX)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-mono"
                    >
                      Mẫu thử
                    </button>
                  </div>
                </div>

                {/* Batch Configuration - Full attribute parity with direct editor */}
                <div className="bg-slate-900/80 p-3 border border-slate-800 space-y-3">
                  <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                    Thuộc tính kế thừa cho lô
                  </span>

                  {/* Row 1: 3-tier Hierarchy */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Chủ đề</label>
                      <select
                        name="topic_id"
                        value={form.topic_id}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-200 text-xs truncate focus:outline-none focus:border-sky-600"
                      >
                        {Object.entries(CURRICULUM_TREE).map(([id, topic]) => (
                          <option key={id} value={id}>{id.toUpperCase()} - {topic.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Đề mục</label>
                      <select
                        name="section_id"
                        value={form.section_id}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-200 text-xs truncate focus:outline-none focus:border-sky-600"
                      >
                        {Object.entries(CURRICULUM_TREE[form.topic_id]?.sections || {}).map(([sId, sec]) => (
                          <option key={sId} value={sId}>[{sId.toUpperCase()}] {sec.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Bài học</label>
                      <select
                        name="lesson_id"
                        value={form.lesson_id}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-200 text-xs truncate focus:outline-none focus:border-sky-600"
                      >
                        {(CURRICULUM_TREE[form.topic_id]?.sections[form.section_id]?.lessons || []).map(lesson => (
                          <option key={lesson.id} value={lesson.id}>[{lesson.id.toUpperCase()}] {lesson.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Cognitive + Difficulty + IRT b + IRT a + T_exp */}
                  <div className="grid grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-800/60">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Dạng bài</label>
                      <div className="grid grid-cols-2 border border-slate-700 bg-slate-950 p-0.5 text-center text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleCognitiveTagChange('conceptual')}
                          className={`py-1.5 font-medium transition-colors ${
                            form.cognitive_tag === 'conceptual' 
                              ? 'bg-purple-900 text-purple-200' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          L.Thuyết
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCognitiveTagChange('procedural')}
                          className={`py-1.5 font-medium transition-colors ${
                            form.cognitive_tag === 'procedural' 
                              ? 'bg-sky-900 text-sky-200' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          T.Toán
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Độ khó</label>
                      <select
                        name="difficulty_level"
                        value={form.difficulty_level}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-600"
                      >
                        <option value="EASY">Dễ</option>
                        <option value="MEDIUM">Vừa</option>
                        <option value="HARD">Khó</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">IRT b</label>
                      <div className="flex items-center">
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-700 border-r-0">b</span>
                        <input
                          type="number"
                          step="0.1"
                          min="-3.0"
                          max="3.0"
                          name="difficulty_index"
                          value={form.difficulty_index}
                          onChange={handleChange}
                          className="w-full bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">IRT a</label>
                      <div className="flex items-center">
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-700 border-r-0">a</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="3.0"
                          name="discrimination_index"
                          value={form.discrimination_index}
                          onChange={handleChange}
                          className="w-full bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">T_exp</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="expected_time_seconds"
                          value={form.expected_time_seconds}
                          onChange={handleChange}
                          min={15}
                          max={600}
                          step={5}
                          className="w-full bg-slate-950 border border-slate-700 px-1.5 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-sky-600"
                        />
                        <span className="bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-400 font-mono border border-slate-700 border-l-0">s</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Phân loại bài học & Nguồn trích dẫn */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/60">
                    {/* Cột 1: Phân loại đơn bài vs Tổng hợp */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                          Phân loại bài học cho lô
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.is_synthetic}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm(prev => ({
                                ...prev,
                                is_synthetic: checked,
                                extra_lessons: checked ? prev.extra_lessons : []
                              }));
                            }}
                            className="w-3.5 h-3.5 rounded-none text-sky-600 bg-slate-900 border-slate-700"
                          />
                          <span className={`text-[11px] font-medium ${form.is_synthetic ? 'text-sky-400' : 'text-slate-400'}`}>
                            Lô câu hỏi tổng hợp
                          </span>
                        </label>
                      </div>

                      {!form.is_synthetic ? (
                        <div className="px-2 py-1.5 bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                          <span>Đơn bài: [{form.lesson_id?.toUpperCase()}]</span>
                          <span className="text-[10px] text-slate-500">Tự động gắn tag BKT</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              if (!form.extra_lessons.includes(val) && val !== form.lesson_id) {
                                setForm(prev => ({
                                  ...prev,
                                  extra_lessons: [...prev.extra_lessons, val]
                                }));
                              }
                              e.target.value = '';
                            }}
                            className="w-full bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-600 truncate"
                            defaultValue=""
                          >
                            <option value="" disabled>+ Thêm bài học phối hợp cho lô...</option>
                            {allLessonsList.map(l => (
                              <option 
                                key={l.id} 
                                value={l.id}
                                disabled={l.id === form.lesson_id || form.extra_lessons.includes(l.id)}
                              >
                                [{l.id.toUpperCase()}] {l.title}
                              </option>
                            ))}
                          </select>

                          {/* Chips */}
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-sky-950/80 border border-sky-800 text-sky-300 text-[10px] font-mono">
                              Chính: {form.lesson_id?.toUpperCase()}
                            </span>
                            {form.extra_lessons.map(lId => (
                              <span 
                                key={lId} 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono"
                              >
                                {lId.toUpperCase()}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      extra_lessons: prev.extra_lessons.filter(id => id !== lId)
                                    }));
                                  }}
                                  className="text-slate-400 hover:text-rose-400 font-bold ml-0.5"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Nguồn trích dẫn mặc định cho lô */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                        Nguồn trích dẫn cho lô
                      </label>
                      <input
                        type="text"
                        name="source_reference"
                        value={form.source_reference}
                        onChange={handleChange}
                        placeholder="Ví dụ: Đề GK ĐHBK 2023..."
                        className="w-full bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-600"
                      />
                      <span className="text-[10px] text-slate-500 block">
                        Áp dụng cho mọi câu trong lô (trừ khi câu có macro \source riêng)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={10}
                  placeholder="Dán nội dung LaTeX tại đây..."
                  className="w-full bg-slate-900 border border-slate-800 p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-600 leading-relaxed"
                />

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleParseImportText}
                    className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white uppercase tracking-wider transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Phân tích
                  </button>
                </div>

                {/* Batch Preview Table */}
                {batchParsedList.length > 0 && (
                  <div className="border border-slate-800 bg-slate-900 p-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        BÓC TÁCH ĐƯỢC {batchParsedList.length} CÂU HỎI
                      </span>

                      <button
                        type="button"
                        onClick={handleSaveBatch}
                        disabled={batchSaving}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        {batchSaving ? (batchProgress || 'Đang lưu...') : `Lưu Tất Cả ${batchParsedList.length} Câu Vào Hàng Chờ Duyệt`}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 text-xs">
                      {batchParsedList.map((item, idx) => {
                        const distractorKeys = Object.keys(item.distractor_mapping || {});
                        return (
                          <div key={idx} className="py-2.5 space-y-1.5 font-mono">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sky-400">#{idx + 1}</span>
                                
                                {/* Correct Key selector */}
                                <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 border border-slate-800">
                                  <span className="text-[10px] text-slate-400">Đúng:</span>
                                  {['A', 'B', 'C', 'D'].map(letter => (
                                    <button
                                      key={letter}
                                      type="button"
                                      onClick={() => handleUpdateBatchItemKey(idx, letter)}
                                      className={`px-1.5 text-[11px] font-bold ${
                                        item.correct_answer === letter 
                                          ? 'bg-emerald-600 text-white' 
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {letter}
                                    </button>
                                  ))}
                                </div>

                                {/* Cognitive Tag toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBatchItemCognitive(idx)}
                                  className={`px-1.5 py-0.5 text-[10px] font-medium border ${
                                    item.cognitive_tag === 'conceptual'
                                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                                      : 'bg-sky-950 text-sky-300 border-sky-800'
                                  }`}
                                  title="Nhấp để đổi dạng bài (Lý thuyết / Tính toán)"
                                >
                                  {item.cognitive_tag === 'conceptual' ? 'Lý thuyết' : 'Tính toán'}
                                </button>

                                {/* Distractor summary */}
                                {distractorKeys.length > 0 && (
                                  <span className="text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 border border-amber-900/60">
                                    Bẫy: {distractorKeys.map(k => `${k}:${item.distractor_mapping[k]}`).join(', ')}
                                  </span>
                                )}

                                {/* Source reference */}
                                {item.source_reference && (
                                  <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 border border-slate-700">
                                    [{item.source_reference}]
                                  </span>
                                )}

                                {/* Extra lessons */}
                                {item.tags && item.tags.length > 0 && (
                                  <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 border border-indigo-800">
                                    Tổng hợp: {item.tags.join(', ')}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditSingleBatchItem(item)}
                                  className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                                >
                                  Soạn riêng câu này
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBatchItem(idx)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300"
                                  title="Xóa câu này khỏi danh sách lưu"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="text-slate-200 text-xs line-clamp-2 pl-4 border-l-2 border-slate-800">
                              {item.content_html}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>

        {/* ================= COLUMN 3: LIVE PREVIEW ================= */}
        <aside className="w-[380px] flex flex-col bg-[#090d16] border-l border-slate-800">
          <div className="p-2.5 border-b border-slate-800 bg-[#0c1220] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono">
              Live Preview
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {form.expected_time_seconds}s | {form.difficulty_level}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4" ref={previewRef}>
            <div className="bg-[#0c1220] border border-slate-800 p-4 space-y-3">
              
              {/* Question Header: ID, Source Reference Badge, Synthetic Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-sky-400">
                    {form.id ? `Câu #${form.id}` : 'Câu mới'}
                  </span>
                  {form.source_reference && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300">
                      [{form.source_reference}]
                    </span>
                  )}
                </div>
                {form.is_synthetic && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                    Tổng hợp ({1 + (form.extra_lessons?.length || 0)} bài)
                  </span>
                )}
              </div>

              {/* Question Stem */}
              <div className="text-xs leading-relaxed text-slate-100 min-h-[35px]">
                {form.content_html ? (
                  <div dangerouslySetInnerHTML={{ __html: form.content_html }} />
                ) : (
                  <span className="text-slate-500 italic font-mono">(Chưa có nội dung đề bài...)</span>
                )}
              </div>

              {/* Image Preview */}
              {form.image_url && (
                <div className="flex justify-center border border-slate-800 p-1 bg-slate-900">
                  <img src={form.image_url} alt="Figure" className="max-w-full max-h-40" />
                </div>
              )}

              {/* Options Preview */}
              <div className="space-y-2 pt-1">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const val = form[`option_${opt.toLowerCase()}`];
                  const isCorrect = form.correct_answer === opt;
                  const distractor = form.distractor_mapping?.[opt];

                  return (
                    <div 
                      key={opt}
                      className={`p-2 border transition-colors ${
                        isCorrect 
                          ? 'bg-emerald-950/30 border-emerald-500/80' 
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-4 h-4 flex items-center justify-center text-[10px] font-bold font-mono border flex-shrink-0 ${
                          isCorrect 
                            ? 'bg-emerald-600 text-white border-emerald-500' 
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {opt}
                        </span>

                        <div className="flex-1 text-xs text-slate-200 leading-snug pt-0.5">
                          {val ? (
                            <div dangerouslySetInnerHTML={{ __html: val }} />
                          ) : (
                            <span className="text-slate-600 italic font-mono">(Trống)</span>
                          )}
                        </div>
                      </div>

                      {!isCorrect && distractor && distractor !== 'NONE' && (
                        <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-amber-400">
                          Bẫy: {distractor}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Preview */}
              {form.explanation_html && (
                <div className="mt-3 pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono block">
                    Lời giải chi tiết:
                  </span>
                  <div 
                    className="text-xs text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: form.explanation_html }}
                  />
                </div>
              )}

            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
