import re

filepath = r'D:\Programming_language\project_web\admin_v2\src\pages\Courses.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the UI block replacement
pattern = r"<div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 grid grid-cols-4 gap-4'>.*?</div>\s*</div>"
# Wait, the original code had:
# {viewMode === 'create' && (
#   <div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 grid grid-cols-4 gap-4'>
# ...
#   </div>
# )}
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
        </div>'''
content = re.sub(r"<div className='bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 mb-6 grid grid-cols-4 gap-4'>.*?</div>\s*</div>", ui_inputs + "\n      ", content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
