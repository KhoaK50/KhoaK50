import { useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function Login({ onLogin }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key) return;
    
    try {
      const res = await fetch('https://visualization-rr5v.onrender.com/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) {
        onLogin(key);
      } else {
        setError('Secret Key không hợp lệ hoặc lỗi xác thực!');
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ Backend!');
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-900'>
      <div className='bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700'>
        <div className='flex justify-center mb-6'>
          <div className='bg-blue-600 p-3 rounded-full'>
            <KeyRound size={32} className='text-white' />
          </div>
        </div>
        <h2 className='text-2xl font-bold text-center text-white mb-6'>Control Center Access</h2>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-gray-400 text-sm font-medium mb-1'>Master Admin Key</label>
            <input 
              type='password' 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className='w-full p-3 rounded bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500'
              placeholder='Nhập Secret Key...'
            />
          </div>
          {error && <p className='text-red-500 text-sm'>{error}</p>}
          <button type='submit' className='w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition-colors'>
            Xác thực
          </button>
        </form>
      </div>
    </div>
  );
}
