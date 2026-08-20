import re

filepath = r'D:\Programming_language\project_web\admin_v2\src\pages\Courses.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_addition = '''  const [newSectionId, setNewSectionId] = useState('s1');
  const [newBloomLevel, setNewBloomLevel] = useState(1.0);
  const [newTimeSpent, setNewTimeSpent] = useState(15);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
'''
content = content.replace("  const [newSectionId, setNewSectionId] = useState('s1');\n", state_addition)

# 2. Add AI simulate function
ai_func = '''
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
      alert(🤖 AI NLP đã phân tích xong!\n- Thời lượng đề xuất:  phút\n- Mức độ Bloom: );
    }, 1500);
  };
'''
content = content.replace("  const fetchLessons = () => {", ai_func + "\n  const fetchLessons = () => {")

# 3. Add fields to payload
create_payload = "topic_id: newTopicId, order_index: newOrder, section_id: newSectionId, title: newTitle, content_html: markdown, difficulty_level: newBloomLevel, estimated_time: newTimeSpent"
content = content.replace("topic_id: newTopicId, order_index: newOrder, section_id: newSectionId, title: newTitle, content_html: markdown", create_payload)

edit_payload = "content_html: markdown, difficulty_level: newBloomLevel, estimated_time: newTimeSpent"
content = content.replace("content_html: markdown", edit_payload)

# 4. Populate state on Edit
populate_state = '''    setCurrentLesson(lesson);
    setMarkdown(lesson.content_html || '');
    setNewBloomLevel(lesson.difficulty_level || 1.0);
    setNewTimeSpent(lesson.estimated_time || 15);
'''
content = content.replace("    setCurrentLesson(lesson);\n    setMarkdown(lesson.content_html || '');\n", populate_state)

# 5. Fix UI layout for Inputs
ui_inputs = '''        <div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 flex flex-col gap-4'>
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
'''
content = content.replace("        <div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 grid grid-cols-4 gap-4'>\n          <div><label className='block text-sm text-slate-400 mb-1'>Topic ID</label><input type='text' value={newTopicId} onChange={e => setNewTopicId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>\n          <div><label className='block text-sm text-slate-400 mb-1'>Section ID</label><input type='text' value={newSectionId} onChange={e => setNewSectionId(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>\n          <div><label className='block text-sm text-slate-400 mb-1'>Thc t (Order Index)</label><input type='number' value={newOrder} onChange={e => setNewOrder(parseInt(e.target.value))} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>\n          <div><label className='block text-sm text-slate-400 mb-1'>TiAu ? (Title)</label><input type='text' value={newTitle} onChange={e => setNewTitle(e.target.value)} className='w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500' /></div>\n        </div>\n", ui_inputs)

# Need to make edit mode also show these fields!
content = content.replace("{viewMode === 'create' && (", "{(viewMode === 'create' || viewMode === 'edit') && (")


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done updating Courses.jsx")
