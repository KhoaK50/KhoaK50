import { useState, useEffect, useRef } from 'react';
import { BookOpen, Save, ArrowLeft, Upload, Code } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function Courses() {
  const [viewMode, setViewMode] = useState('list');
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  
  const [newTopicId, setNewTopicId] = useState('l1');
  const [newTitle, setNewTitle] = useState('Bài 1: Tiêu đề mới');
  const [newOrder, setNewOrder] = useState(1);
  const [newSectionId, setNewSectionId] = useState('s1');
  const [newBloomLevel, setNewBloomLevel] = useState(1.0);
  const [newTimeSpent, setNewTimeSpent] = useState(15);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [language, setLanguage] = useState('vi');

  // stores raw LaTeX string
  const [markdown, setMarkdown] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);


  const handleAiDetect = () => {
    setIsAiDetecting(true);
    setTimeout(() => {
      // Giả lập AI phân tích từ nội dung LaTeX
      const wordCount = markdown.length;
      const suggestedTime = Math.max(5, Math.ceil(wordCount / 200)); 
      
      let suggestedBloom = 1.0;
      if (markdown.includes("chứng minh") || markdown.includes("định lý")) suggestedBloom = 3.5;
      else if (markdown.includes("tính") || markdown.includes("áp dụng")) suggestedBloom = 2.0;
      else if (markdown.includes("so sánh") || markdown.includes("đánh giá")) suggestedBloom = 3.0;
      else if (markdown.length > 500) suggestedBloom = 1.5;

      setNewTimeSpent(suggestedTime);
      setNewBloomLevel(suggestedBloom);
      setIsAiDetecting(false);
      alert("AI NLP da phan tich xong!\n- Thoi luong: " + suggestedTime + " phut\n- Muc do Bloom: " + suggestedBloom);
    }, 1500);
  };

  const fetchLessons = () => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/api/admin/lessons`, {
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
    setNewBloomLevel(lesson.difficulty_level || 1.0);
    setNewTimeSpent(lesson.estimated_time || 15);
    setNewTitle(lesson.title || ''); // Update title for edit
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    setMarkdown("% Nhập mã LaTeX từ Overleaf vào đây...\n\\begin{document}\n\n\\section{Tiêu đề bài học}\n\n\\end{document}");
    setViewMode('create');
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lesson/${currentLesson.topic_id}/${currentLesson.order_index}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_html: markdown, difficulty_level: newBloomLevel, estimated_time: newTimeSpent, lang: language, title: newTitle })
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
      const res = await fetch(`${API_BASE_URL}/api/admin/lesson`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic_id: newTopicId, order_index: newOrder, section_id: newSectionId, title: newTitle, content_html: markdown, difficulty_level: newBloomLevel, estimated_time: newTimeSpent, lang: language 
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
    
    if (file.name.toLowerCase().endsWith('.zip')) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        let texContent = null;
        let mainTexPath = null;
        
        // Helper: Chuẩn hóa đường dẫn tương đối (xử lý . và ..)
        const normalizePath = (p) => {
          if (!p) return '';
          const parts = p.replace(/\\/g, '/').split('/');
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
        };

        // Helper: Xóa comment LaTeX an toàn (bảo toàn % trong URL và \% trong toán học)
        const stripLatexComments = (text) => {
          if (!text) return '';
          return text.split('\n').map(line => {
            let inUrl = false;
            let urlDepth = 0;
            for (let i = 0; i < line.length; i++) {
              if (line.substr(i, 5) === '\\url{' || line.substr(i, 6) === '\\href{') {
                inUrl = true;
                urlDepth = 1;
                i += line.substr(i, 5) === '\\url{' ? 4 : 5;
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
          }).join('\n');
        };

        // Helper: Kiểm tra file cấu hình style/macro
        const isStyleOrMacro = (pathStr) => {
          if (!pathStr) return false;
          const norm = pathStr.toLowerCase().replace(/\\/g, '/');
          const base = norm.split('/').pop().replace(/\.tex$/, '');
          return norm.endsWith('.sty') || norm.endsWith('.cls') ||
                 base === 'setup' || base === 'macros' || base === 'config' || base === 'style' ||
                 base === 'preamble' || base === 'packages' || base === 'settings' ||
                 norm.includes('/setup.') || norm.includes('/macros.') || norm.includes('/config.');
        };

        // 1. Tìm file gốc (main.tex hoặc root tex có chứa documentclass)
        const texCandidates = [];
        for (const [p, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          const lower = p.toLowerCase().replace(/\\/g, '/');
          if (lower.includes('__macosx') || lower.split('/').pop().startsWith('.')) continue;
          if (lower.endsWith('.tex')) {
            texCandidates.push(p);
          }
        }

        if (texCandidates.length > 0) {
          // Xếp hạng ứng viên file TeX gốc
          let bestCandidate = null;
          let bestScore = -1;

          for (const cand of texCandidates) {
            const lower = cand.toLowerCase().replace(/\\/g, '/');
            const baseName = lower.split('/').pop();
            let score = 0;
            if (isStyleOrMacro(cand)) score -= 1000;

            if (baseName === 'main.tex') score += 100;
            else if (baseName === 'root.tex' || baseName === 'book.tex' || baseName === 'document.tex' || baseName === 'index.tex') score += 60;
            if (!cand.replace(/\\/g, '/').includes('/')) score += 15; // ưu tiên file ở thư mục gốc zip

            const snippet = await zip.files[cand].async('string');
            if (snippet.includes('\\documentclass') && !snippet.includes('documentclass[main.tex]{subfiles}')) score += 50;
            if (snippet.includes('\\begin{document}')) score += 30;
            if (/\\(?:input|include|subfile)\s*\{/.test(snippet)) score += 20;

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = cand;
            }
          }

          mainTexPath = bestCandidate || texCandidates[0];
          texContent = await zip.files[mainTexPath].async('string');
          
          // 2. Trích xuất toàn bộ ảnh từ ZIP thành Base64 Data URLs
          const imageMap = new Map();
          for (const [p, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const lowerPath = p.toLowerCase().replace(/\\/g, '/');
            if (lowerPath.includes('__macosx') || lowerPath.split('/').pop().startsWith('.')) continue;

            let mime = null;
            if (lowerPath.endsWith('.png')) mime = 'image/png';
            else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) mime = 'image/jpeg';
            else if (lowerPath.endsWith('.svg')) mime = 'image/svg+xml';
            else if (lowerPath.endsWith('.webp')) mime = 'image/webp';
            else if (lowerPath.endsWith('.gif')) mime = 'image/gif';

            if (mime) {
              const base64 = await entry.async('base64');
              const dataUrl = `data:${mime};base64,${base64}`;

              const norm = normalizePath(lowerPath);
              imageMap.set(norm, dataUrl);
              imageMap.set(lowerPath, dataUrl);
              imageMap.set(lowerPath.replace(/^\.?\//, ''), dataUrl);

              const fileName = lowerPath.split('/').pop();
              if (fileName) {
                if (!imageMap.has(fileName)) imageMap.set(fileName, dataUrl);
                const dotIdx = fileName.lastIndexOf('.');
                if (dotIdx !== -1) {
                  const noExt = fileName.substring(0, dotIdx);
                  if (!imageMap.has(noExt)) imageMap.set(noExt, dataUrl);
                }
              }
            }
          }

          const resolveImageDataUrl = (rawImgPath, currentDir = '') => {
            if (!rawImgPath) return null;
            const p = rawImgPath.trim();
            if (p.startsWith('data:') || p.startsWith('http://') || p.startsWith('https://')) {
              return p;
            }
            const lower = p.toLowerCase().replace(/\\/g, '/');
            const cleanNoLeading = lower.replace(/^\.?\//, '');
            const relativeWithDir = currentDir ? normalizePath(`${currentDir}/${cleanNoLeading}`) : cleanNoLeading;

            const extensions = ['', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
            
            // 1. Thử relative với thư mục của subfile hiện tại
            for (const ext of extensions) {
              const candidate = relativeWithDir + ext;
              if (imageMap.has(candidate)) return imageMap.get(candidate);
            }

            // 2. Thử đường dẫn trực tiếp
            for (const ext of extensions) {
              if (imageMap.has(lower + ext)) return imageMap.get(lower + ext);
              if (imageMap.has(cleanNoLeading + ext)) return imageMap.get(cleanNoLeading + ext);
            }

            // 3. Khớp tiền tố hoặc hậu tố đường dẫn
            for (const [key, url] of imageMap.entries()) {
              if (key.endsWith('/' + cleanNoLeading) || cleanNoLeading.endsWith('/' + key)) {
                return url;
              }
            }

            // 4. Khớp theo tên file (basename)
            const baseName = lower.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
            const baseWithExt = lower.split('/').pop();
            if (imageMap.has(baseWithExt)) return imageMap.get(baseWithExt);
            if (imageMap.has(baseName)) return imageMap.get(baseName);
            for (const ext of extensions) {
              if (ext && imageMap.has(baseName + ext)) return imageMap.get(baseName + ext);
            }

            return null;
          };

          // 3. Helper đệ quy nạp các file \input{}, \include{}, \subfile{}
          const resolveLatexImports = async (content, currentDir = '', visited = new Set()) => {
            content = stripLatexComments(content);

            const regex = /\\(?:input|include|subfile)\s*\{([^}]+)\}/g;
            let result = content;
            let matches = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
              matches.push(match);
            }

            for (const m of matches) {
              const fullMatch = m[0];
              let rawPath = m[1].trim().replace(/^["']|["']$/g, '');

              if (isStyleOrMacro(rawPath)) {
                result = result.replaceAll(fullMatch, () => '');
                continue;
              }

              let filePath = rawPath.replace(/\\/g, '/');
              if (!filePath.endsWith('.tex') && !filePath.includes('.')) {
                filePath += '.tex';
              }

              let zipEntry = null;
              let candidatePath = currentDir ? normalizePath(`${currentDir}/${filePath}`) : filePath;
              candidatePath = candidatePath.replace(/\\/g, '/');
              zipEntry = zip.file(candidatePath);

              if (!zipEntry) {
                zipEntry = zip.file(filePath);
              }

              if (!zipEntry) {
                const lowerCandidate = candidatePath.toLowerCase().replace(/^\.?\//, '');
                const lowerFilePath = filePath.toLowerCase().replace(/\\/g, '/').replace(/^\.?\//, '');
                for (const [entryPath, entry] of Object.entries(zip.files)) {
                  if (entry.dir) continue;
                  const normP = entryPath.toLowerCase().replace(/\\/g, '/').replace(/^\.?\//, '');
                  if (normP === lowerCandidate || normP.endsWith('/' + lowerCandidate) || normP === lowerFilePath) {
                    zipEntry = entry;
                    break;
                  }
                }
              }

              if (!zipEntry) {
                // Chỉ tìm kiếm fallback theo baseName nếu filePath KHÔNG chứa thư mục (tránh C1/LT.tex khớp nhầm C2/LT.tex)
                if (!filePath.includes('/') && !filePath.includes('\\')) {
                  const baseName = filePath.toLowerCase();
                  for (const [entryPath, entry] of Object.entries(zip.files)) {
                    if (entry.dir) continue;
                    const pBase = entryPath.split(/[/\\]/).pop().toLowerCase();
                    if (pBase === baseName) {
                      zipEntry = entry;
                      break;
                    }
                  }
                }
              }

              if (zipEntry) {
                if (visited.has(zipEntry.name)) {
                  result = result.replaceAll(fullMatch, () => `% [Bỏ qua import vòng lặp: ${zipEntry.name}]\n`);
                  continue;
                }
                const nextVisited = new Set(visited);
                nextVisited.add(zipEntry.name);

                const normEntryName = zipEntry.name.replace(/\\/g, '/');
                const subDir = normEntryName.includes('/') 
                  ? normEntryName.substring(0, normEntryName.lastIndexOf('/')) 
                  : '';

                let subContent = await zipEntry.async('string');
                subContent = stripLatexComments(subContent);

                // Bóc tách preamble: tìm từ \begin{document} đầu tiên đến \end{document} cuối cùng
                const docStartMatch = subContent.match(/\\begin\s*\{document\}/);
                const docEndMatch = [...subContent.matchAll(/\\end\s*\{document\}/g)].pop();
                if (docStartMatch && docEndMatch && docEndMatch.index > docStartMatch.index) {
                  subContent = subContent.substring(docStartMatch.index + docStartMatch[0].length, docEndMatch.index);
                } else if (docStartMatch) {
                  subContent = subContent.substring(docStartMatch.index + docStartMatch[0].length);
                } else {
                  subContent = subContent.replace(/\\documentclass(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '');
                  subContent = subContent.replace(/\\usepackage(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '');
                }
                subContent = subContent.replace(/\\begin\s*\{document\}/g, '');
                subContent = subContent.replace(/\\end\s*\{document\}/g, '');

                // Chuyển đổi \includegraphics ngay trong ngữ cảnh subDir của subfile
                subContent = subContent.replace(/\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/g, (imgMatch, opt, imgPath) => {
                  const dataUrl = resolveImageDataUrl(imgPath, subDir);
                  if (dataUrl) {
                    return opt ? `\\includegraphics[${opt}]{${dataUrl}}` : `\\includegraphics{${dataUrl}}`;
                  }
                  return imgMatch;
                });

                const resolvedSub = await resolveLatexImports(subContent, subDir, nextVisited);

                // Dùng replacer callback () => resolvedSub để $ trong công thức toán không bị mangled
                result = result.replaceAll(fullMatch, () => (resolvedSub !== undefined ? resolvedSub : ''));
              } else {
                result = result.replaceAll(fullMatch, () => `% [CẢNH BÁO: Không tìm thấy file ${filePath} trong ZIP]\n`);
              }
            }
            return result;
          };

          const normMainTex = mainTexPath.replace(/\\/g, '/');
          const mainDir = normMainTex.includes('/') 
            ? normMainTex.substring(0, normMainTex.lastIndexOf('/')) 
            : '';

          texContent = await resolveLatexImports(texContent, mainDir);

          // Ánh xạ các \includegraphics còn lại ở file root
          texContent = texContent.replace(/\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/g, (match, opt, imgPath) => {
            const dataUrl = resolveImageDataUrl(imgPath, mainDir);
            if (dataUrl) {
              return opt ? `\\includegraphics[${opt}]{${dataUrl}}` : `\\includegraphics{${dataUrl}}`;
            }
            return match;
          });

          setMarkdown(texContent);
          alert(`Đã giải nén, gộp file tự động và nạp: ${mainTexPath} (${imageMap.size} ảnh đã được nhúng)`);
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
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
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
      
      {(viewMode === 'create' || viewMode === 'edit') && (
                <div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 flex flex-col gap-4'>
          <div className='grid grid-cols-4 gap-4'>
            <div><label className='block text-sm text-slate-400 mb-1'>Topic ID</label><input type='text' value={newTopicId} onChange={e => setNewTopicId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
            <div><label className='block text-sm text-slate-400 mb-1'>Section ID</label><input type='text' value={newSectionId} onChange={e => setNewSectionId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
            <div><label className='block text-sm text-slate-400 mb-1'>Thứ tự (Order Index)</label><input type='number' value={newOrder} onChange={e => setNewOrder(parseInt(e.target.value))} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
            <div><label className='block text-sm text-slate-400 mb-1'>Tiêu đề (Title)</label><input type='text' value={newTitle} onChange={e => setNewTitle(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>
          </div>
          <div className='grid grid-cols-4 gap-4 items-end border-t border-slate-700 pt-4 mt-2'>
            <div>
              <label className='block text-sm text-slate-400 mb-1'>Cấp độ Bloom (Độ khó)</label>
              <select value={newBloomLevel} onChange={e => setNewBloomLevel(parseFloat(e.target.value))} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500'>
                <option value={1.0}>1.0 - Nhớ (Remembering)</option>
                <option value={1.5}>1.5 - Hiểu (Understanding)</option>
                <option value={2.0}>2.0 - Vận dụng (Applying)</option>
                <option value={2.5}>2.5 - Phân tích (Analyzing)</option>
                <option value={3.0}>3.0 - Đánh giá (Evaluating)</option>
                <option value={3.5}>3.5 - Sáng tạo (Creating)</option>
              </select>
            </div>
            <div>
              <label className='block text-sm text-slate-400 mb-1'>Thời gian học (Phút)</label>
              <input type='number' value={newTimeSpent} onChange={e => setNewTimeSpent(parseInt(e.target.value))} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' />
            </div>
            <div className='col-span-2'>
              <button onClick={handleAiDetect} disabled={isAiDetecting} className='flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors'>
                ✨ {isAiDetecting ? "AI đang phân tích..." : "Tự động phân tích Độ khó bằng AI (NLP)"}
              </button>
            </div>
          </div>
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
