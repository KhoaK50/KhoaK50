import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, BookOpen, FileQuestion, Users, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({ onLogout }) {
  const location = useLocation();
  const menu = [
    { name: 'Metrics', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Database', path: '/database', icon: <Database size={20} /> },
    { name: 'Bài học', path: '/courses', icon: <BookOpen size={20} /> },
    { name: 'Bài tập', path: '/quizzes', icon: <FileQuestion size={20} /> },
    { name: 'Người dùng', path: '/users', icon: <Users size={20} /> },
    { name: 'Cài đặt', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className='flex h-screen bg-gray-100 font-sans text-gray-800'>
      {/* Sidebar */}
      <aside className='w-64 bg-white border-r border-gray-200 flex flex-col'>
        <div className='h-16 flex items-center px-6 border-b border-gray-200'>
          <h1 className='text-xl font-bold text-blue-600'>Control Center</h1>
        </div>
        <nav className='flex-1 py-4'>
          <ul className='space-y-1 px-3'>
            {menu.map((item) => {
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className='p-4 border-t border-gray-200'>
          <button 
            onClick={onLogout}
            className='flex items-center gap-3 text-gray-500 hover:text-red-600 w-full px-3 py-2 rounded-md transition-colors'
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <header className='h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between'>
          <h2 className='text-lg font-medium'>{menu.find(m => m.path === location.pathname)?.name || 'Admin Panel'}</h2>
          <div className='flex items-center gap-4'>
            <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold'>
              A
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
