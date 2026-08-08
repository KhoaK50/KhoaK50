import { useState } from 'react';
import { Save, Plus, FileJson } from 'lucide-react';

export default function Quizzes() {
  const [questions, setQuestions] = useState([
    {
      id: 1,
      lesson_id: 'l1',
      question_text: 'Vector là gì?',
      options: [
        'Là một đoạn thẳng có hướng',
        'Là một đoạn thẳng',
        'Là một đường thẳng',
        'Là một điểm'
      ],
      correct_answer: 0,
      difficulty: 'Dễ'
    }
  ]);

  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold flex items-center gap-2 text-slate-100'>
          <FileJson className='text-orange-400' /> Ngân hàng Bài tập (JSON Templates)
        </h1>
        <div className='flex gap-2'>
          <button className='flex items-center gap-2 bg-slate-800 border border-slate-600 text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors'>
            Import JSON
          </button>
          <button className='flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors'>
            <Save size={18} /> Lưu thay đổi
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0'>
        {/* List of questions */}
        <div className='bg-slate-800 rounded-lg shadow-sm border border-slate-700 flex flex-col'>
          <div className='p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800'>
            <h3 className='font-medium text-slate-200'>Danh sách Câu hỏi</h3>
            <button className='text-indigo-400 p-1 hover:bg-indigo-500/10 rounded-lg transition-colors'>
              <Plus size={20} />
            </button>
          </div>
          <div className='flex-1 overflow-auto p-2'>
            {questions.map((q, idx) => (
              <div key={q.id} className='p-3 border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer rounded-lg transition-colors'>
                <div className='flex justify-between mb-1'>
                  <span className='font-bold text-slate-200'>Câu {idx + 1}</span>
                  <span className='text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full'>{q.difficulty}</span>
                </div>
                <p className='text-sm text-slate-400 truncate'>{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Form */}
        <div className='lg:col-span-2 bg-slate-800 rounded-lg shadow-sm border border-slate-700 flex flex-col'>
          <div className='p-4 border-b border-slate-700 bg-slate-800'>
            <h3 className='font-medium text-slate-200'>Chỉnh sửa Câu hỏi</h3>
          </div>
          <div className='flex-1 overflow-auto p-6 space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-slate-400 mb-1'>ID Bài học (Map to Neo4j)</label>
                <input type='text' defaultValue='l1' className='w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors' />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-400 mb-1'>Độ khó</label>
                <select className='w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors'>
                  <option>Dễ</option>
                  <option>Trung bình</option>
                  <option>Khó</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className='block text-sm font-medium text-slate-400 mb-1'>Nội dung câu hỏi</label>
              <textarea rows={3} defaultValue='Vector là gì?' className='w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-colors' />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-400 mb-2'>Các lựa chọn (Đánh dấu ô đúng)</label>
              <div className='space-y-3'>
                {['Là một đoạn thẳng có hướng', 'Là một đoạn thẳng', 'Là một đường thẳng', 'Là một điểm'].map((opt, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <input type='radio' name='correct' defaultChecked={i === 0} className='w-5 h-5 text-indigo-500 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900' />
                    <span className='font-medium w-6 text-slate-300'>{String.fromCharCode(65 + i)}.</span>
                    <input type='text' defaultValue={opt} className='flex-1 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
