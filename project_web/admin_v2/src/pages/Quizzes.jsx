import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Save, 
  Upload, 
  Check, 
  X, 
  Image as ImageIcon, 
  FileJson, 
  Search, 
  CheckCircle2, 
  Circle,
  Eye,
  Trash2,
  Filter,
  Info
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000';

const TOPIC_MAP = {
  t1: { label: 'Kiến thức chuẩn bị', lessons: [
    { id: 'l1', title: 'Khái niệm vector, phương, hướng và độ dài' },
    { id: 'l2', title: 'Phép cộng, trừ vector' },
    { id: 'l3', title: 'Biểu diễn tọa độ vector' },
    { id: 'l4', title: 'Định nghĩa ánh xạ' },
    { id: 'l5', title: 'Đơn ánh, toàn ánh, song ánh' },
    { id: 'l6', title: 'Ánh xạ ngược và ánh xạ hợp' },
    { id: 'l7', title: 'Định nghĩa phép thế' },
    { id: 'l8', title: 'Phép nhân hai phép thế' },
    { id: 'l9', title: 'Nghịch thế' },
    { id: 'l10', title: 'Chẵn lẻ của phép thế' },
  ]},
  t2: { label: 'Ma trận và HPT tuyến tính', lessons: [
    { id: 'l11', title: 'Định nghĩa ma trận' },
    { id: 'l12', title: 'Phép cộng, trừ ma trận' },
    { id: 'l13', title: 'Phép nhân ma trận' },
    { id: 'l14', title: 'Ma trận chuyển vị, đối xứng' },
    { id: 'l15', title: 'Ma trận nghịch đảo' },
    { id: 'l16', title: 'Ma trận khả nghịch' },
    { id: 'l17', title: 'Phép biến đổi sơ cấp' },
    { id: 'l18', title: 'Định thức' },
    { id: 'l19', title: 'Tính chất định thức' },
    { id: 'l20', title: 'Khai triển Laplace' },
    { id: 'l21', title: 'Hạng của ma trận' },
    { id: 'l22', title: 'HPT tuyến tính' },
    { id: 'l23', title: 'Phương pháp Gauss' },
    { id: 'l24', title: 'Quy tắc Cramer' },
    { id: 'l25', title: 'HPT tuyến tính thuần nhất' },
    { id: 'l26', title: 'Nghiệm tổng quát HPT' },
    { id: 'l27', title: 'Phương trình ma trận' },
    { id: 'l28', title: 'Ma trận bậc thang' },
  ]},
  t3: { label: 'Không gian tuyến tính', lessons: [
    { id: 'l29', title: 'Định nghĩa KGTT' },
    { id: 'l30', title: 'Không gian con' },
    { id: 'l31', title: 'Tổ hợp tuyến tính' },
    { id: 'l32', title: 'Phụ thuộc tuyến tính' },
    { id: 'l33', title: 'Độc lập tuyến tính' },
    { id: 'l34', title: 'Hệ sinh' },
    { id: 'l35', title: 'Cơ sở' },
    { id: 'l36', title: 'Số chiều' },
    { id: 'l37', title: 'Tọa độ theo cơ sở' },
    { id: 'l38', title: 'Ma trận chuyển cơ sở' },
    { id: 'l39', title: 'Hạng của hệ vector' },
    { id: 'l40', title: 'Tổng KGC' },
    { id: 'l41', title: 'Tổng trực tiếp' },
    { id: 'l42', title: 'Giao KGC' },
    { id: 'l43', title: 'Công thức Grassmann' },
    { id: 'l44', title: 'KGC nghiệm HPT thuần nhất' },
    { id: 'l45', title: 'Không gian thương' },
    { id: 'l46', title: 'Đẳng cấu KGTT' },
  ]},
  t4: { label: 'Không gian Euclide', lessons: [
    { id: 'l47', title: 'Tích vô hướng' },
    { id: 'l48', title: 'Chuẩn và khoảng cách' },
    { id: 'l49', title: 'Hệ trực giao' },
    { id: 'l50', title: 'Quá trình Gram-Schmidt' },
    { id: 'l51', title: 'Phần bù trực giao' },
    { id: 'l52', title: 'Phép chiếu trực giao' },
    { id: 'l53', title: 'Bài toán bình phương tối thiểu' },
    { id: 'l54', title: 'Ma trận trực giao' },
  ]},
  t5: { label: 'Ánh xạ tuyến tính', lessons: [
    { id: 'l55', title: 'Định nghĩa AXTT' },
    { id: 'l56', title: 'Nhân và ảnh' },
    { id: 'l57', title: 'Ma trận AXTT' },
    { id: 'l58', title: 'Đổi cơ sở ma trận AXTT' },
    { id: 'l59', title: 'Đẳng cấu' },
    { id: 'l60', title: 'Tự đẳng cấu' },
    { id: 'l61', title: 'Phép biến đổi tuyến tính' },
    { id: 'l62', title: 'Toán tử tuyến tính' },
    { id: 'l63', title: 'Dạng tuyến tính' },
  ]},
  t6: { label: 'Trị riêng và vector riêng', lessons: [
    { id: 'l64', title: 'Định nghĩa trị riêng' },
    { id: 'l65', title: 'Đa thức đặc trưng' },
    { id: 'l66', title: 'Không gian riêng' },
    { id: 'l67', title: 'Chéo hóa ma trận' },
    { id: 'l68', title: 'Định lý Cayley-Hamilton' },
    { id: 'l69', title: 'Dạng Jordan' },
    { id: 'l70', title: 'Ma trận đối xứng thực' },
    { id: 'l71', title: 'Chéo hóa trực giao' },
    { id: 'l72', title: 'Phân tích SVD' },
  ]},
  t7: { label: 'Dạng toàn phương', lessons: [
    { id: 'l73', title: 'Dạng song tuyến tính' },
    { id: 'l74', title: 'Dạng toàn phương' },
    { id: 'l75', title: 'Dạng chính tắc' },
    { id: 'l76', title: 'Phương pháp Lagrange' },
    { id: 'l77', title: 'Xác định dấu DTP' },
    { id: 'l78', title: 'Tiêu chuẩn Sylvester' },
  ]},
};

const DEFAULT_FORM_STATE = {
  id: null,
  topic_id: 't1',
  lesson_id: 'l1',
  difficulty_level: 'MEDIUM',
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
  difficulty_index: 0.5,
  discrimination_index: 1.0,
  is_active: false
};

export default function Quizzes() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // List filters & tabs
  const [activeTab, setActiveTab] = useState('APPROVED'); // APPROVED | PENDING
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor form state
  const [form, setForm] = useState(DEFAULT_FORM_STATE);
  
  // Preview
  const previewRef = useRef(null);
  
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const zipInputRef = useRef(null);
  
  const getAuthHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`,
    'Content-Type': 'application/json'
  });

  // Load questions
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

  // Initialize MathJax
  useEffect(() => {
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      window.MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        startup: { typeset: false }
      };
      document.head.appendChild(script);
    }
  }, []);

  // Typeset MathJax when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise && previewRef.current) {
        window.MathJax.typesetPromise([previewRef.current]).catch(err => console.error(err));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.content_html, form.option_a, form.option_b, form.option_c, form.option_d, form.explanation_html]);

  const handleSelectQuestion = (q) => {
    setForm({
      ...q,
      tags: q.tags ? q.tags.join(', ') : '',
      source_reference: q.source_reference || '',
      image_url: q.image_url || '',
      explanation_html: q.explanation_html || '',
      difficulty_index: q.difficulty_index || 0.5,
      discrimination_index: q.discrimination_index || 1.0
    });
  };

  const handleNewQuestion = () => {
    setForm(DEFAULT_FORM_STATE);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'topic_id') {
      const firstLesson = TOPIC_MAP[value]?.lessons[0]?.id || '';
      setForm(prev => ({ ...prev, topic_id: value, lesson_id: firstLesson }));
    } else {
      setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        difficulty_index: parseFloat(form.difficulty_index) || 0,
        discrimination_index: parseFloat(form.discrimination_index) || 0
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
        alert('Lưu thành công');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // If it's a new question without ID, we can't upload to /api/admin/questions/:id/upload-image easily unless we save first
    // For this implementation, if there is no ID, we alert to save first.
    if (!form.id) {
      alert('Vui lòng lưu câu hỏi trước khi tải ảnh lên.');
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
      } else {
        alert('Lỗi tải ảnh: ' + data.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Đã xảy ra lỗi khi tải ảnh.');
    }
  };

  const handleJsonImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const res = await fetch(`${API_BASE}/api/admin/questions/import`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify(json) // expects { questions: [...] }
        });
        const data = await res.json();
        if (data.success) {
          alert(`Nhập thành công ${data.count || 0} câu hỏi`);
          fetchQuestions();
        } else {
          alert('Lỗi: ' + data.error);
        }
      } catch (err) {
        alert('File JSON không hợp lệ hoặc lỗi server.');
      }
    };
    reader.readAsText(file);
  };

  const handleZipImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/admin/questions/import-zip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert(`Nhập thành công ${data.count || 0} câu hỏi từ ZIP`);
        fetchQuestions();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      console.error('ZIP import error:', err);
      alert('Lỗi tải file ZIP lên server.');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const activeMatch = activeTab === 'APPROVED' ? q.is_active : !q.is_active;
    const topicMatch = topicFilter === 'ALL' || q.topic_id === topicFilter;
    const searchMatch = !searchQuery || q.content_html.toLowerCase().includes(searchQuery.toLowerCase());
    return activeMatch && topicMatch && searchMatch;
  });

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Header Area */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          Ngân hàng Câu hỏi
          <span className="text-sm px-2 py-1 bg-slate-700 rounded-full text-slate-300">
            {questions.length}
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".json"
            ref={jsonInputRef}
            onChange={handleJsonImport}
            className="hidden"
          />
          <button 
            onClick={() => jsonInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Nhập JSON
          </button>

          <input
            type="file"
            accept=".zip"
            ref={zipInputRef}
            onChange={handleZipImport}
            className="hidden"
          />
          <button 
            onClick={() => zipInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Nhập Overleaf ZIP
          </button>
          
          {form.id && (
            <button
              onClick={handleToggleActive}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                form.is_active 
                  ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30' 
                  : 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
              }`}
            >
              {form.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {form.is_active ? 'Bỏ duyệt' : 'Duyệt'}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || (form.id && !form.is_active)}
            title={form.id && !form.is_active ? "Bạn phải Duyệt câu hỏi trước khi chỉnh sửa" : ""}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: List */}
        <div className="w-80 flex flex-col border-r border-slate-700 bg-slate-800/50">
          <div className="p-4 border-b border-slate-700 flex flex-col gap-3">
            <button
              onClick={handleNewQuestion}
              className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo câu hỏi mới
            </button>

            <div className="flex bg-slate-700/50 rounded-md p-1">
              <button
                className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${activeTab === 'APPROVED' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('APPROVED')}
              >
                Đã duyệt
              </button>
              <button
                className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${activeTab === 'PENDING' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => setActiveTab('PENDING')}
              >
                Chờ duyệt
              </button>
            </div>

            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả chủ đề</option>
              {Object.entries(TOPIC_MAP).map(([id, topic]) => (
                <option key={id} value={id}>{topic.label}</option>
              ))}
            </select>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="text-center p-4 text-slate-400 text-sm">Đang tải...</div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center p-4 text-slate-400 text-sm">Không có câu hỏi nào</div>
            ) : (
              filteredQuestions.map(q => (
                <div
                  key={q.id}
                  onClick={() => handleSelectQuestion(q)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    form.id === q.id 
                      ? 'bg-blue-900/20 border-blue-500/50' 
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">#{q.id}</span>
                      {q.source_reference === 'AI_GENERATED' && (
                        <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">AI Sinh</span>
                      )}
                      {q.source_reference === 'OVERLEAF_ZIP' && (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">Overleaf</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        q.difficulty_level === 'EASY' ? 'bg-green-500/10 text-green-400' :
                        q.difficulty_level === 'HARD' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {q.difficulty_level === 'EASY' ? 'DỄ' : q.difficulty_level === 'HARD' ? 'KHÓ' : 'TB'}
                      </span>
                      {q.is_active ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Circle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm line-clamp-2 text-slate-300">
                    {q.content_html || 'Chưa có nội dung'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle Panel: Editor */}
        <div className="flex-1 overflow-y-auto border-r border-slate-700 p-6 bg-slate-900">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Section 1: Phân loại */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-400" />
                Phân loại
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Chủ đề</label>
                  <select
                    name="topic_id"
                    value={form.topic_id}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(TOPIC_MAP).map(([id, topic]) => (
                      <option key={id} value={id}>{topic.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Bài học</label>
                  <select
                    name="lesson_id"
                    value={form.lesson_id}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {TOPIC_MAP[form.topic_id]?.lessons.map(lesson => (
                      <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Độ khó</label>
                  <select
                    name="difficulty_level"
                    value={form.difficulty_level}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nguồn tham khảo</label>
                  <input
                    type="text"
                    name="source_reference"
                    value={form.source_reference}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="VD: Giáo trình..."
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-slate-400">Tags (ngăn cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="matrix, determinant"
                  />
                </div>
              </div>
            </section>

            <hr className="border-slate-800" />

            {/* Section 2: Nội dung */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-400" />
                Nội dung
              </h2>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Nội dung câu hỏi (hỗ trợ LaTeX)</label>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-xs text-blue-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 mb-1 text-blue-300">
                    <Info className="w-3.5 h-3.5" /> Lưu ý khi gõ Toán:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
                    <li>Gõ <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-300">$...$</code> cho công thức trên cùng một dòng.</li>
                    <li>Gõ <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-300">$$...$$</code> cho công thức đứng độc lập.</li>
                    <li>Dùng <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-300">\text&#123;chữ&#125;</code> để chèn văn bản bình thường vào giữa công thức.</li>
                    <li>Chỉ hỗ trợ công thức Toán, <b>không</b> hỗ trợ lệnh vẽ hình đồ họa (TikZ) hay khai báo thư viện (\usepackage).</li>
                  </ul>
                </div>
                <textarea
                  name="content_html"
                  value={form.content_html}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Ảnh đính kèm</label>
                <div className="flex items-center gap-4">
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="h-16 rounded border border-slate-700" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-md text-sm transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Tải ảnh lên
                  </button>
                  {form.image_url && (
                    <button
                      onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-slate-300">Các đáp án</label>
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt} className="flex gap-3 items-start">
                    <div className="pt-2">
                      <input
                        type="radio"
                        name="correct_answer"
                        value={opt}
                        checked={form.correct_answer === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-600 focus:ring-2"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400">Đáp án {opt}</span>
                      </div>
                      <textarea
                        name={`option_${opt.toLowerCase()}`}
                        value={form[`option_${opt.toLowerCase()}`]}
                        onChange={handleChange}
                        rows={2}
                        className={`w-full bg-slate-800 border rounded-md px-3 py-2 text-sm focus:outline-none font-mono ${
                          form.correct_answer === opt ? 'border-blue-500/50' : 'border-slate-700 focus:border-slate-500'
                        }`}
                        placeholder={`Nội dung đáp án ${opt}...`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-slate-300">Giải thích chi tiết</label>
                <textarea
                  name="explanation_html"
                  value={form.explanation_html}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Giải thích cho sinh viên..."
                />
              </div>
            </section>

            <hr className="border-slate-800" />

            {/* Section 3: Chỉ số IRT */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Chỉ số IRT
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Difficulty Index (b)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    name="difficulty_index"
                    value={form.difficulty_index}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Discrimination Index (a)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="2"
                    name="discrimination_index"
                    value={form.discrimination_index}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="w-[400px] flex flex-col bg-slate-900 border-l border-slate-700">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white flex items-center gap-2">
                Live Preview 
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-xs text-slate-400">Xem trước trực tiếp nội dung Toán LaTeX</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6" ref={previewRef}>
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 shadow-xl space-y-6">
              
              {/* Question Content */}
              <div className="text-[15px] leading-relaxed text-slate-200">
                {form.content_html ? (
                  <div dangerouslySetInnerHTML={{ __html: form.content_html }} />
                ) : (
                  <span className="text-slate-500 italic">Nội dung câu hỏi...</span>
                )}
              </div>

              {/* Image */}
              {form.image_url && (
                <div className="flex justify-center">
                  <img src={form.image_url} alt="Question figure" className="max-w-full rounded border border-slate-600" />
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const val = form[`option_${opt.toLowerCase()}`];
                  const isCorrect = form.correct_answer === opt;
                  return (
                    <div 
                      key={opt} 
                      className={`flex items-start gap-3 p-3 rounded border ${
                        isCorrect ? 'bg-blue-900/20 border-blue-500/30' : 'border-slate-700 bg-slate-800/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCorrect ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {opt}
                      </div>
                      <div className="pt-0.5 text-[15px] text-slate-300">
                        {val ? (
                          <div dangerouslySetInnerHTML={{ __html: val }} />
                        ) : (
                          <span className="text-slate-600 italic">Chưa nhập...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {form.explanation_html && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Giải thích</h4>
                  <div className="text-sm text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.explanation_html }} />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
