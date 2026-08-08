import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, BookOpen, FileQuestion, Users, Settings, LogOut, MessageSquare, ShieldAlert } from 'lucide-react';
import logo from '../assets/logo.png';

export default function AdminLayout({ onLogout }) {
  const location = useLocation();
  const username = localStorage.getItem('adminUsername') || 'Admin';
  const initial = username.charAt(0).toUpperCase();

  const menu = [
    { name: 'Metrics', path: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Database', path: '/database', icon: <Database size={18} /> },
    { name: 'Bài học', path: '/courses', icon: <BookOpen size={18} /> },
    { name: 'Bài tập', path: '/quizzes', icon: <FileQuestion size={18} /> },
    { name: 'Người dùng', path: '/users', icon: <Users size={18} /> },
    { name: 'Hỗ trợ', path: '/feedbacks', icon: <MessageSquare size={18} /> },
    { name: 'Nhật ký (Logs)', path: '/logs', icon: <ShieldAlert size={18} /> },
    { name: 'Cài đặt', path: '/settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className='flex h-screen bg-slate-900 text-slate-300'>
      {/* Sidebar */}
      <aside className='w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0'>
        <div className='h-14 flex items-center px-4 border-b border-slate-800'>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Vectoria" className="w-7 h-7 opacity-90" />
            <span className='text-[15px] font-semibold text-slate-100 tracking-tight'>Vectoria</span>
            <span className='text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded ml-0.5'>ADMIN</span>
          </Link>
        </div>
        <nav className='flex-1 py-2 overflow-y-auto'>
          <ul className='space-y-0.5 px-2'>
            {menu.map((item) => {
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] transition-colors ${isActive ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className='px-2 pb-2 border-t border-slate-800 pt-2'>
          <button 
            onClick={onLogout}
            className='flex items-center gap-2.5 text-slate-500 hover:text-red-400 w-full px-3 py-[7px] rounded-md text-[13px] transition-colors'
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <header className='h-12 bg-slate-900 border-b border-slate-800 flex items-center px-6 justify-between shrink-0'>
          <span className='text-[13px] font-medium text-slate-500'>{menu.find(m => m.path === location.pathname)?.name || 'Admin Panel'}</span>
          <div className='flex items-center gap-3'>
            <span className="text-[13px] text-slate-500">{username}</span>
            <div className='relative'>
              <div className='w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold'>
                {initial}
              </div>
              <div className='absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900'></div>
            </div>
          </div>
        </header>
        <main className='flex-1 overflow-auto p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
