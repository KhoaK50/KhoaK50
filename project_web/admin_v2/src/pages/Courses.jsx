import { useState, useEffect, useRef } from 'react';
import { BookOpen, Edit, Save, ArrowLeft, Upload, Code } from 'lucide-react';

export default function Courses() {
  const [viewMode, setViewMode] = useState('list');
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  
  const [newTopicId, setNewTopicId] = useState('l1');
  const [newTitle, setNewTitle] = useState('Bài 1: Tiêu đề mới');
  const [newOrder, setNewOrder] = useState(1);
  const [newSectionId, setNewSectionId] = useState('s1');

  // stores raw LaTeX string
  const [markdown, setMarkdown] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const fetchLessons = () => {
    setIsLoading(true);
    fetch('http://localhost:5000/api/admin/lessons', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('adminAuth')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setLessons(data);
    })
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (viewMode === 'list') fetchLessons();
  }, [viewMode]);

  const handleEdit = (lesson) => {
    setCurrentLesson(lesson);
    setMarkdown(lesson.content_html || '');
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    setMarkdown("% Nhập mã LaTeX từ Overleaf vào đây...\n\\begin{document}\n\n\\section{Tiêu đề bài học}\n\n\\end{document}");
    setViewMode('create');
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/lesson/${currentLesson.topic_id}/${currentLesson.order_index}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: markdown })
      });
      if (res.ok) alert("Lưu bài học thành công!");
      else alert("Lỗi lưu bài học");
    } catch (err) {
      alert("Không thể kết nối đến server!");
    }
    setIsSaving(false);
  };

  const handleSaveCreate = async () => {
    if (!newTopicId || !newTitle || !newSectionId) return alert("Vui lòng nhập đủ thông tin!");
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/lesson`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic_id: newTopicId, order_index: newOrder, section_id: newSectionId, title: newTitle, content_html: markdown 
        })
      });
      if (res.ok) {
        alert("Tạo bài học thành công!");
        setViewMode('list');
      } else alert("Lỗi tạo bài học");
    } catch (err) {
      alert("Không thể kết nối đến server!");
    }
    setIsSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.zip')) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        let texContent = null;
        let mainTexPath = null;
        
        // Find main.tex or the first .tex file
        for (const [path, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir && path.endsWith('.tex')) {
            if (path.includes('main.tex') || !mainTexPath) {
              mainTexPath = path;
              if (path.includes('main.tex')) break; // Prioritize main.tex
            }
          }
        }

        if (mainTexPath) {
          texContent = await zip.files[mainTexPath].async('string');
          
          // Helper để đệ quy nạp các file được \input{} hoặc \include{}
          const resolveLatexImports = async (content) => {
            // Xóa comment trước khi tìm \input để không load các file bị % comment out
            content = content.replace(/(^|[^\\])%.*$/gm, '$1');

            const regex = /\\(?:input|include)\{([^}]+)\}/g;
            let result = content;
            let matches = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
              matches.push(match);
            }
            
            for (const m of matches) {
              const fullMatch = m[0];
              let filePath = m[1];
              if (!filePath.endsWith('.tex')) filePath += '.tex';
              
              // Tìm file trong zip (chấp nhận sai khác về đường dẫn tương đối)
              let zipEntry = zip.file(filePath);
              if (!zipEntry) {
                 const lowerFilePath = filePath.toLowerCase().replace(/\\/g, '/');
                 for (const [p, entry] of Object.entries(zip.files)) {
                    if (!entry.dir && p.toLowerCase().endsWith(lowerFilePath)) {
                       zipEntry = entry; break;
                    }
                 }
              }
              
              if (zipEntry) {
                const subContent = await zipEntry.async('string');
                const resolvedSub = await resolveLatexImports(subContent);
                result = result.replace(fullMatch, resolvedSub);
              } else {
                result = result.replace(fullMatch, `% [CẢNH BÁO: Không tìm thấy file ${filePath} trong ZIP]\n`);
              }
            }
            return result;
          };
          
          texContent = await resolveLatexImports(texContent);
          
          setMarkdown(texContent);
          alert(`Đã giải nén, gộp file tự động và nạp: ${mainTexPath}`);
        } else {
          alert('Không tìm thấy file .tex nào trong thư mục ZIP!');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi đọc file ZIP: ' + err.message);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setMarkdown(evt.target.result);
      };
      reader.readAsText(file);
    }
    
    // Reset file input so we can upload the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderEditorLayout = (onSave, saveDisabled, titleElement) => (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='flex justify-between items-center mb-6'>
        <div className='flex items-center gap-4'>
          <button onClick={() => setViewMode('list')} className='text-slate-400 hover:bg-slate-800 p-2 rounded-full transition-colors'><ArrowLeft size={20} /></button>
          <h1 className='text-2xl font-bold text-slate-100'>{titleElement}</h1>
        </div>
        <div className='flex items-center gap-4'>
          <input 
             type="file" 
             accept=".tex,.txt,.md,.zip" 
             ref={fileInputRef} 
             onChange={handleFileUpload} 
             style={{ display: 'none' }} 
          />
          <button 
             onClick={() => fileInputRef.current?.click()} 
             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 font-medium border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
          >
            <Upload size={18} /> Tải lên (.tex hoặc .zip)
          </button>
          <button onClick={onSave} disabled={saveDisabled} className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium transition-colors ${saveDisabled ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <Save size={18} /> {saveDisabled ? 'Đang lưu...' : 'Lưu bài học'}
          </button>
        </div>
      </div>
      
      {viewMode === 'create' && (
        <div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 grid grid-cols-4 gap-4'>
          <div><label className='block text-sm text-slate-400 mb-1'>Topic ID</label><input type='text' value={newTopicId} onChange={e => setNewTopicId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
          <div><label className='block text-sm text-slate-400 mb-1'>Section ID</label><input type='text' value={newSectionId} onChange={e => setNewSectionId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
          <div><label className='block text-sm text-slate-400 mb-1'>Thứ tự (Order Index)</label><input type='number' value={newOrder} onChange={e => setNewOrder(parseInt(e.target.value))} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
          <div><label className='block text-sm text-slate-400 mb-1'>Tiêu đề (Title)</label><input type='text' value={newTitle} onChange={e => setNewTitle(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
        </div>
      )}

      <div className='flex-1 flex gap-6 min-h-0'>
        {/* Editor Zone */}
        <div className={`flex-1 flex flex-col rounded-lg shadow-sm border bg-[#1e1e1e] border-gray-700 overflow-hidden`}>
          <div className={`p-3 border-b flex items-center justify-between bg-[#2a2a2a] border-gray-700 text-gray-200`}>
            <div className='flex items-center gap-2 font-medium'><Code size={18} /> Nội dung mã nguồn LaTeX (Raw)</div>
          </div>
          <div className={`flex-1 w-full p-0 bg-[#1e1e1e]`}>
            <textarea
              className="w-full h-full p-4 bg-transparent text-gray-300 font-mono text-sm focus:outline-none resize-none"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Nội dung mã nguồn LaTeX..."
              spellCheck="false"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (viewMode === 'edit' && currentLesson) return renderEditorLayout(handleSaveEdit, isSaving, `Sửa bài học: ${currentLesson.title}`);
  if (viewMode === 'create') return renderEditorLayout(handleSaveCreate, isSaving, 'Tạo bài học mới');

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold flex items-center gap-2 text-slate-100'><BookOpen className='text-indigo-400' /> Quản lý Bài học</h1>
        <button onClick={handleCreateNew} className='bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors'>+ Thêm Bài học</button>
      </div>
      <div className='bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden'>
        <table className='w-full text-left border-collapse'>
          <thead>
            <tr className='bg-slate-900 border-b border-slate-700'>
              <th className='p-4 font-medium text-slate-400'>ID</th><th className='p-4 font-medium text-slate-400'>Chủ đề</th><th className='p-4 font-medium text-slate-400'>Mục</th><th className='p-4 font-medium text-slate-400'>Thứ tự</th><th className='p-4 font-medium text-slate-400'>Tiêu đề</th><th className='p-4 font-medium text-slate-400'>Hành động</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-700/50'>
            {isLoading ? <tr><td colSpan="6" className="p-4 text-center text-slate-400">Đang tải...</td></tr> : lessons.map((lesson) => (
              <tr key={`${lesson.topic_id}-${lesson.order_index}`} className='hover:bg-slate-700/30 transition-colors'>
                <td className='p-4 text-sm text-slate-300'>{lesson.topic_id}</td>
                <td className='p-4 text-sm text-slate-400 max-w-[150px] truncate' title={lesson.topic_title}>{lesson.topic_title || '-'}</td>
                <td className='p-4 text-sm text-slate-400 max-w-[150px] truncate' title={lesson.section_title}>{lesson.section_title || '-'}</td>
                <td className='p-4 text-slate-300'>{lesson.order_index}</td><td className='p-4 text-slate-300'>{lesson.title}</td>
                <td className='p-4'><button onClick={() => handleEdit(lesson)} className='text-indigo-400 hover:text-indigo-300 font-medium'>Sửa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
