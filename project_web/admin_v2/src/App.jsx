import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Users from './pages/Users';
import Login from './pages/Login';
import Database from './pages/Database';
import Quizzes from './pages/Quizzes';
import Feedbacks from './pages/Feedbacks';
import AuditLogs from './pages/AuditLogs';
import SettingsPage from './pages/Settings';
import StressTest from './pages/StressTest';
import Moderation from './pages/Moderation';

import { isTokenValid } from './config/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('adminAuth');
    if (!token || !isTokenValid(token)) {
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('adminUsername');
      return false;
    }
    return true;
  });

  const handleLogin = (token, username) => {
    localStorage.setItem('adminAuth', token);
    localStorage.setItem('adminUsername', username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('admin:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', handleUnauthorized);
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<AdminLayout onLogout={handleLogout} />}>
          <Route index element={<Dashboard />} />
          <Route path='database' element={<Database />} />
          <Route path='courses' element={<Courses />} />
          <Route path='quizzes' element={<Quizzes />} />
          <Route path='users' element={<Users />} />
          <Route path='feedbacks' element={<Feedbacks />} />
          <Route path='logs' element={<AuditLogs />} />
          <Route path='moderation' element={<Moderation />} />
          <Route path='stress-test' element={<StressTest />} />
          <Route path='settings' element={<SettingsPage />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
