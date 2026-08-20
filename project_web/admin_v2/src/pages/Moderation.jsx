import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, Edit, Trash, Lock, Filter } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export default function Moderation() {
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING or RESOLVED
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState(null); // Add filter state

  const [editModal, setEditModal] = useState({ isOpen: false, flagId: null, content: '' });
  const [warnModal, setWarnModal] = useState({ isOpen: false, flagId: null, message: '' });

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminAuth');
      let url = `${API_BASE}/api/admin/moderation/comments?status=${activeTab}`;
      if (filterUserId) url += `&user_id=${filterUserId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFlags(data.flags);
      } else {
        setFlags([]);
      }
    } catch (err) {
      console.error(err);
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [activeTab, filterUserId]);

  const handleAction = async (flagId, action, newContent = null) => {
    try {
      const token = localStorage.getItem('adminAuth');
      const body = { action };
      if (newContent !== null) body.content = newContent;

      const res = await fetch(`${API_BASE}/api/admin/moderation/comments/${flagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        fetchFlags();
        setEditModal({ isOpen: false, flagId: null, content: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWarn = async (flagId, message) => {
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API_BASE}/api/admin/moderation/comments/${flagId}/warn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) {
        setWarnModal({ isOpen: false, flagId: null, message: '' });
        alert('Đã gửi cảnh cáo');
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleBan = async (userId, newStatus) => {
    let confirmMsg = 'Bạn có chắc chắn muốn mở khóa tài khoản này?';
    if (newStatus === 'BANNED') confirmMsg = 'Bạn có chắc chắn muốn cấm vĩnh viễn tài khoản này? Người dùng sẽ không thể đăng nhập.';
    if (newStatus === 'LOCKED') confirmMsg = 'Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể bình luận.';
    
    if (!confirm(confirmMsg)) return;
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {

        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Đã cập nhật trạng thái tài khoản');
        fetchFlags(); // reload to show new status
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Kiểm duyệt
          </h1>
          <p className="text-sm text-slate-400 mt-1">Quản lý các bình luận bị cờ</p>
        </div>
      </div>

        <div className="flex border-b border-slate-800 justify-between items-center">
          <div className="flex">
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'PENDING'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Đang chờ duyệt
              </button>
              <button
                onClick={() => setActiveTab('RESOLVED')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'RESOLVED'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Đã xử lý
              </button>
          </div>
          {filterUserId && (
              <div className="text-sm text-indigo-400 flex items-center gap-2 pr-4">
                  Đang lọc theo User ID: {filterUserId}
                  <button onClick={() => setFilterUserId(null)} className="text-slate-400 hover:text-white"><XCircle size={16} /></button>
              </div>
          )}
        </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : flags.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Không có dữ liệu.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Người dùng</th>
                  <th className="px-4 py-3 font-medium">Nội dung gốc</th>
                  <th className="px-4 py-3 font-medium">Lý do (AI)</th>
                  <th className="px-4 py-3 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {flags.map((flag) => (
                  <tr key={flag.id} className="hover:bg-slate-800/25">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={flag.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(flag.display_name || 'U')}
                          alt={flag.display_name}
                          className="w-8 h-8 rounded-full bg-slate-800 object-cover"
                        />
                        <div>
                          <div className="font-medium text-slate-200 flex items-center gap-2">
                              {flag.display_name || 'Người dùng'}
                              {flag.status === 'locked' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400">LOCKED</span>}
                              {flag.status === 'banned' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">BANNED</span>}
                              <button onClick={() => setFilterUserId(flag.user_id)} title="Lọc các vi phạm của người này" className="text-blue-400 hover:text-blue-300">
                                  <Filter size={14} />
                              </button>
                          </div>
                          <div className="text-xs text-slate-500">{flag.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      <p className="text-slate-300 whitespace-pre-wrap">{flag.original_content}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          flag.ai_severity_score > 0.7 ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          Score: {flag.ai_severity_score}
                        </span>
                        <span className="text-xs text-slate-400">{flag.ai_reason}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === 'PENDING' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAction(flag.id, 'DISMISS')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-200 rounded transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Bỏ qua
                          </button>
                          <button
                            onClick={() => setEditModal({ isOpen: true, flagId: flag.id, content: flag.original_content })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Sửa & Duyệt
                          </button>
                          <button
                            onClick={() => setWarnModal({ isOpen: true, flagId: flag.id, message: '' })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Cảnh cáo
                          </button>
                          {flag.status === 'locked' || flag.status === 'banned' ? (
                              <button
                                onClick={() => handleBan(flag.user_id, 'ACTIVE')}
                                title="Mở khóa TK"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mở khóa
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleBan(flag.user_id, 'LOCKED')}
                                  title="Khóa TK (Vẫn đăng nhập được nhưng không thể bình luận)"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Khóa TK
                                </button>
                                <button
                                  onClick={() => handleBan(flag.user_id, 'BANNED')}
                                  title="Cấm TK (Không thể đăng nhập)"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Cấm TK
                                </button>
                              </>
                            )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
                          {flag.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Sửa & Duyệt</h3>
            <textarea
              value={editModal.content}
              onChange={(e) => setEditModal({ ...editModal, content: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[120px]"
              placeholder="Nhập nội dung mới..."
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditModal({ isOpen: false, flagId: null, content: '' })}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleAction(editModal.flagId, 'RESOLVE', editModal.content)}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Lưu & Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {warnModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Cảnh cáo người dùng</h3>
            <textarea
              value={warnModal.message}
              onChange={(e) => setWarnModal({ ...warnModal, message: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[120px]"
              placeholder="Nhập lý do cảnh cáo..."
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setWarnModal({ isOpen: false, flagId: null, message: '' })}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleWarn(warnModal.flagId, warnModal.message)}
                className="px-4 py-2 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                Gửi cảnh cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
