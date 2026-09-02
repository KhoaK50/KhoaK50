import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Activity, TerminalSquare } from 'lucide-react';


export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'}/api/admin/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Không thể tải nhật ký hoạt động. Bạn có đủ quyền không?');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-indigo-400 mr-2" />
        <span className="text-slate-400">Đang tải nhật ký (Camera)...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center border border-red-500/20">
        <ShieldAlert className="mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-slate-200 flex items-center">
            <Activity className="mr-2 text-indigo-400" size={20} /> 
            Nhật ký Hoạt động (Audit Logs)
          </h2>
          <p className="text-sm text-slate-400 mt-1">Ghi lại toàn bộ hành động thay đổi dữ liệu của các Quản trị viên.</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="flex items-center text-sm bg-slate-800 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 sticky top-0 border-b border-slate-700 z-10">
            <tr>
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase w-32">Thời gian</th>
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase w-32">Admin</th>
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase w-48">Hành động</th>
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase">Chi tiết</th>
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase w-32 text-right">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 bg-transparent">
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  <TerminalSquare size={48} className="mx-auto mb-4 opacity-30" />
                  Chưa có lịch sử hoạt động nào được ghi nhận.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 text-sm text-slate-400 whitespace-nowrap">{log.created_at}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-400">
                      {log.admin_username}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold tracking-wide
                      ${log.action === 'LOGIN' ? 'text-slate-300 bg-slate-700' : 
                        log.action === 'REPLY_FEEDBACK' ? 'text-emerald-400 bg-emerald-500/20' : 
                        'text-purple-400 bg-purple-500/20'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-300">{log.details}</td>
                  <td className="p-3 text-sm text-slate-500 text-right font-mono">{log.ip_address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
