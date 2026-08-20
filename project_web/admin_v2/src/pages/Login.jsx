import { useState } from 'react';
import { User, Lock, KeyRound, UserPlus, LogIn } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !masterKey) {
      setError('Vui lòng điền đầy đủ thông tin.');
      setSuccessMsg('');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      
      const endpoint = isRegistering 
        ? 'http://127.0.0.1:5000/api/admin/register'
        : 'http://127.0.0.1:5000/api/admin/login';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, master_key: masterKey })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (isRegistering) {
          setSuccessMsg('Đăng ký thành công! Vui lòng đăng nhập.');
          setIsRegistering(false);
          setPassword('');
        } else {
          onLogin(data.token, data.username);
        }
      } else {
        setError(data.error || (isRegistering ? 'Đăng ký thất bại.' : 'Đăng nhập thất bại.'));
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-slate-900'>
      <div className='bg-slate-800 p-8 rounded-lg w-full max-w-sm border border-slate-700'>
        {/* Header */}
        <div className='flex flex-col items-center mb-8'>
          <img src={logo} alt="Vectoria" className="w-10 h-10 mb-4 opacity-80" />
          <h2 className='text-xl font-semibold text-slate-100 tracking-tight'>
            {isRegistering ? 'Tạo Tài Khoản' : 'Vectoria Admin'}
          </h2>
          <p className='text-slate-500 text-xs mt-1.5'>
            {isRegistering ? 'Yêu cầu Master Key để cấp quyền' : 'Đăng nhập vào bảng điều khiển'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input 
                type='text' 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className='w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-md focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 text-sm'
                placeholder={isRegistering ? 'Tên đăng nhập mới' : 'Tên đăng nhập'}
                spellCheck="false"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} />
              </div>
              <input 
                type='password' 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-md focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 text-sm'
                placeholder={isRegistering ? 'Mật khẩu cho tài khoản này' : 'Mật khẩu'}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-slate-800 px-2 text-slate-500 uppercase tracking-wider">Master Key</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <KeyRound size={16} />
            </div>
            <input 
              type='password' 
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className='w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-md focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 text-sm'
              placeholder='Master Key hệ thống'
            />
          </div>

          {error && (
            <div className='bg-red-500/10 border border-red-500/20 p-2.5 rounded-md text-red-400 text-xs'>
              {error}
            </div>
          )}

          {successMsg && (
            <div className='bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-md text-emerald-400 text-xs'>
              {successMsg}
            </div>
          )}
          
          <button 
            type='submit' 
            disabled={loading}
            className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm'
          >
            {loading ? 'Đang xử lý...' : (isRegistering ? 'Xác nhận Đăng Ký' : 'Đăng nhập')}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setSuccessMsg('');
            }}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>
        </div>
      </div>
    </div>
  );
}
