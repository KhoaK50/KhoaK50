import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { DatabaseZap, Code2, Table, Play, AlertCircle } from 'lucide-react';

export default function Database() {
  const [activeTab, setActiveTab] = useState('browser');
  const [queryCode, setQueryCode] = useState('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);

  const mockUsers = [
    { id: 1, name: 'Nguyễn Văn A', email: 'a@example.com', status: 'active', role: 'student' },
    { id: 2, name: 'Trần Thị B', email: 'b@example.com', status: 'banned', role: 'student' },
    { id: 3, name: 'Lê Văn C', email: 'c@example.com', status: 'active', role: 'student' },
  ];

  const handleRunQuery = () => {
    // Mock run query
    setQueryResult([
      { id: 1, username: 'user1', created_at: '2026-08-01' },
      { id: 2, username: 'user2', created_at: '2026-08-02' }
    ]);
  };

  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold flex items-center gap-2'>
          <DatabaseZap className='text-blue-600' /> Database Explorer
        </h1>
        <div className='flex bg-gray-200 p-1 rounded-lg'>
          <button
            onClick={() => setActiveTab('browser')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'browser' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Table size={18} /> Data Browser
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'query' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Code2 size={18} /> Query Code
          </button>
        </div>
      </div>

      <div className='flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col'>
        {activeTab === 'browser' ? (
          <div className='flex-1 flex flex-col'>
            <div className='p-4 border-b border-gray-200 flex gap-4 bg-gray-50'>
              <select className='border border-gray-300 rounded p-2 bg-white'>
                <option>public.users</option>
                <option>public.lessons</option>
                <option>public.quizzes</option>
              </select>
              <button className='bg-gray-200 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300'>Tải lại</button>
            </div>
            <div className='flex-1 overflow-auto p-4'>
              <table className='w-full text-left border-collapse'>
                <thead>
                  <tr className='bg-gray-100 border-b border-gray-200'>
                    <th className='p-3 font-medium text-gray-700'>ID</th>
                    <th className='p-3 font-medium text-gray-700'>Name</th>
                    <th className='p-3 font-medium text-gray-700'>Email</th>
                    <th className='p-3 font-medium text-gray-700'>Role</th>
                    <th className='p-3 font-medium text-gray-700'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {mockUsers.map(u => (
                    <tr key={u.id} className='hover:bg-gray-50 cursor-pointer'>
                      <td className='p-3'>{u.id}</td>
                      <td className='p-3 font-medium'>{u.name}</td>
                      <td className='p-3 text-gray-500'>{u.email}</td>
                      <td className='p-3'>{u.role}</td>
                      <td className='p-3'>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className='text-sm text-gray-400 mt-4 italic'>* Double-click on a cell to edit value (Mockup)</p>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex flex-col'>
            <div className='p-4 border-b border-gray-200 bg-amber-50 flex items-center justify-between'>
              <div className='flex items-center gap-2 text-amber-700 text-sm'>
                <AlertCircle size={18} />
                <span>Chế độ Query Code. Vui lòng cẩn thận với các lệnh UPDATE/DELETE.</span>
              </div>
              <button 
                onClick={handleRunQuery}
                className='flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700'
              >
                <Play size={16} /> Thực thi
              </button>
            </div>
            <div className='flex-1 grid grid-rows-2'>
              <div className='border-b border-gray-200 relative'>
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  value={queryCode}
                  onChange={(val) => setQueryCode(val)}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
              <div className='bg-gray-900 text-green-400 p-4 font-mono text-sm overflow-auto'>
                <div className='text-gray-400 mb-2'>// Kết quả trả về:</div>
                {queryResult ? (
                  <pre>{JSON.stringify(queryResult, null, 2)}</pre>
                ) : (
                  <span className='text-gray-600'>Chưa có dữ liệu...</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
