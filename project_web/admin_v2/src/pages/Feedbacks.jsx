import { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';


export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`http://localhost:5000/api/admin/feedbacks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch feedbacks');
      const data = await res.json();
      setFeedbacks(data);
      
      // Update selected feedback if it's currently open
      if (selectedFeedback) {
        const updated = data.find(f => f.id === selectedFeedback.id);
        if (updated) setSelectedFeedback(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedFeedback) return;
    
    try {
      setReplying(true);
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`http://localhost:5000/api/admin/feedbacks/${selectedFeedback.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reply_message: replyMessage })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reply');
      }
      
      setReplyMessage('');
      fetchFeedbacks(); // Refresh list to get updated status
      alert('Đã gửi phản hồi thành công!');
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setReplying(false);
    }
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-indigo-400 mr-2" />
        <span className="text-slate-400">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-lg flex items-center">
        <AlertCircle className="mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* List of Feedbacks */}
      <div className="w-1/3 flex flex-col bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="font-semibold text-slate-200 flex items-center">
            <Mail className="mr-2 text-indigo-400" size={18} /> Hộp thư hỗ trợ
          </h2>
          <button onClick={fetchFeedbacks} className="text-slate-400 hover:text-indigo-400 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {feedbacks.length === 0 ? (
            <p className="text-center text-slate-500 mt-10">Không có phản hồi nào</p>
          ) : (
            feedbacks.map(f => (
              <div 
                key={f.id}
                onClick={() => { setSelectedFeedback(f); setReplyMessage(''); }}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedFeedback?.id === f.id ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-slate-800 border-transparent hover:bg-slate-700/50 hover:border-slate-600/50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-slate-200 truncate pr-2">{f.name}</h3>
                  {f.status === 'replied' ? (
                    <span className="flex items-center text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <CheckCircle size={12} className="mr-1" /> Đã trả lời
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Clock size={12} className="mr-1" /> Chờ xử lý
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 truncate mb-1">{f.email}</p>
                <p className="text-xs text-slate-500">{f.created_at}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feedback Details & Reply */}
      <div className="flex-1 flex flex-col bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden">
        {selectedFeedback ? (
          <>
            <div className="p-6 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Tin nhắn từ {selectedFeedback.name}</h2>
              <div className="flex text-sm text-slate-400 mb-6">
                <span className="mr-4"><strong className="text-slate-300">Email:</strong> {selectedFeedback.email}</span>
                <span><strong className="text-slate-300">Thời gian:</strong> {selectedFeedback.created_at}</span>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg text-slate-300 whitespace-pre-wrap border border-slate-700">
                {selectedFeedback.message}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
              {selectedFeedback.status === 'replied' ? (
                <div>
                  <h3 className="font-semibold text-slate-200 mb-3 flex items-center text-emerald-400">
                    <CheckCircle className="mr-2" size={18} /> Lịch sử phản hồi của Admin
                  </h3>
                  <div className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700">
                    <div className="text-xs text-slate-500 mb-2">Đã trả lời lúc: {selectedFeedback.replied_at}</div>
                    <div className="whitespace-pre-wrap text-slate-300">{selectedFeedback.admin_reply}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-slate-200 mb-3">Soạn tin nhắn trả lời</h3>
                  <textarea
                    className="flex-1 w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-sm transition-colors"
                    placeholder={`Chào ${selectedFeedback.name},\n\nCảm ơn bạn đã liên hệ...`}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  ></textarea>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyMessage.trim()}
                      className={`flex items-center px-6 py-2 rounded-lg font-medium text-white transition-colors ${
                        replying || !replyMessage.trim() ? 'bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {replying ? (
                        <><RefreshCw size={18} className="animate-spin mr-2" /> Đang gửi...</>
                      ) : (
                        <><Send size={18} className="mr-2" /> Gửi phản hồi (Email)</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Mail size={48} className="mb-4 opacity-30" />
            <p>Chọn một tin nhắn để xem chi tiết và trả lời</p>
          </div>
        )}
      </div>
    </div>
  );
}
