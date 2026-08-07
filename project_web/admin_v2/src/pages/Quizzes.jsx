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
        <h1 className='text-2xl font-bold flex items-center gap-2'>
          <FileJson className='text-orange-600' /> Ngân hàng Bài tập (JSON Templates)
        </h1>
        <div className='flex gap-2'>
          <button className='flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-50'>
            Import JSON
          </button>
          <button className='flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700'>
            <Save size={18} /> Lưu thay đổi
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0'>
        {/* List of questions */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col'>
          <div className='p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50'>
            <h3 className='font-medium'>Danh sách Câu hỏi</h3>
            <button className='text-blue-600 p-1 hover:bg-blue-50 rounded'>
              <Plus size={20} />
            </button>
          </div>
          <div className='flex-1 overflow-auto p-2'>
            {questions.map((q, idx) => (
              <div key={q.id} className='p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer rounded'>
                <div className='flex justify-between mb-1'>
                  <span className='font-bold text-gray-700'>Câu {idx + 1}</span>
                  <span className='text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full'>{q.difficulty}</span>
                </div>
                <p className='text-sm text-gray-600 truncate'>{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Form */}
        <div className='lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col'>
          <div className='p-4 border-b border-gray-200 bg-gray-50'>
            <h3 className='font-medium'>Chỉnh sửa Câu hỏi</h3>
          </div>
          <div className='flex-1 overflow-auto p-6 space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>ID Bài học (Map to Neo4j)</label>
                <input type='text' defaultValue='l1' className='w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none' />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Độ khó</label>
                <select className='w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none'>
                  <option>Dễ</option>
                  <option>Trung bình</option>
                  <option>Khó</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Nội dung câu hỏi</label>
              <textarea rows={3} defaultValue='Vector là gì?' className='w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none resize-none' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Các lựa chọn (Đánh dấu ô đúng)</label>
              <div className='space-y-3'>
                {['Là một đoạn thẳng có hướng', 'Là một đoạn thẳng', 'Là một đường thẳng', 'Là một điểm'].map((opt, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <input type='radio' name='correct' defaultChecked={i === 0} className='w-5 h-5 text-blue-600' />
                    <span className='font-medium w-6'>{String.fromCharCode(65 + i)}.</span>
                    <input type='text' defaultValue={opt} className='flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 outline-none' />
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
