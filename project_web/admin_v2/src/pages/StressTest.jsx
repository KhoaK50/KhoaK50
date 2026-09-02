import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, RefreshCw, Zap, AlertTriangle, Clock, Activity, Target, Users, ShieldAlert, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

const DEFAULT_TARGETS = [
  { id: '__db_benchmark__', label: 'Cơ sở dữ liệu (PostgreSQL)' },
  { id: 'index.html', label: 'Trang chủ' },
  { id: 'knowledge_info.html', label: 'Thư viện kiến thức' },
  { id: 'calculation.html', label: 'Công cụ tính toán' },
  { id: 'user-dashboard.html', label: 'Dashboard người dùng' },
  { id: 'hdsd.html', label: 'Hướng dẫn sử dụng' },
  { id: 'tltk.html', label: 'Tài liệu tham khảo' },
  { id: 'about_us.html', label: 'Giới thiệu' },
  { id: 'contact.html', label: 'Liên hệ' },
];

function getServerRecommendation(numUsers) {
  if (!numUsers) return null;
  
  // Tối thiểu (Không có lỗi 5xx): capacity * 4 > numUsers => capacity = numUsers / 4
  // 1 vCPU ~ 150 RPS.
  let minCpu = Math.max(0.1, Math.ceil((numUsers / 4 / 150) * 10) / 10);
  
  // Tối ưu (Latency < 500ms): 30 + queue * 10 < 500 => queue < 47 => capacity = numUsers - 47
  let optCpu = Math.max(0.5, Math.ceil((Math.max(1, numUsers - 47) / 150) * 10) / 10);

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Tỷ';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Triệu';
    return num.toLocaleString();
  };

  const getSpecs = (cpu) => {
    let ram = cpu * 2;
    if (cpu < 1) ram = 0.5;
    else if (cpu >= 8) ram = cpu * 4;
    
    // Formula matching Render's pricing: ~$20/vCPU + ~$9/GB RAM
    let price = (cpu * 20) + (ram * 9);
    
    let priceStr;
    if (price >= 1e9) priceStr = `$${(price / 1e9).toFixed(2)} Tỷ USD/tháng`;
    else if (price >= 1e6) priceStr = `$${(price / 1e6).toFixed(2)} Triệu USD/tháng`;
    else priceStr = `$${Math.round(price).toLocaleString()}/tháng`;

    return {
      cpu: cpu < 1 ? `${cpu} vCPU` : `${formatNumber(Math.ceil(cpu))} vCPU`,
      ram: cpu < 1 ? '512MB RAM' : `${formatNumber(Math.ceil(ram))} GB RAM`,
      price: priceStr
    };
  };

  const minSpecs = getSpecs(minCpu);
  const optSpecs = getSpecs(optCpu);

  return {
    min: {
      cpu: minSpecs.cpu,
      ram: minSpecs.ram,
      price: minSpecs.price,
      desc: 'Mức đảm bảo 100% Request thành công (Không văng mã lỗi 500/502). Đổi lại, web có thể load chậm (vàng/đỏ).'
    },
    opt: {
      cpu: optSpecs.cpu,
      ram: optSpecs.ram,
      price: optSpecs.price,
      desc: 'Mức hoàn hảo: Tốc độ phản hồi luôn < 500ms (Xanh lá) cho mọi user, băng thông hoàn toàn thả ga.'
    }
  };
}

function formatMs(ms) {
  if (ms === 0) return '—';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} phút`;
  
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} giờ`;
  
  const days = hours / 24;
  if (days < 365) return `${days.toFixed(1)} ngày`;
  
  const years = days / 365;
  return `${years.toFixed(1)} năm`;
}

function getLatencyColor(ms) {
  if (!ms) return 'text-slate-400';
  if (ms < 500) return 'text-emerald-400';
  if (ms < 2000) return 'text-amber-400';
  return 'text-red-400';
}

function getLatencyAdvice(ms) {
  if (!ms || ms < 500) return null;
  const gap = Math.round(ms - 499);
  return {
    gap: `(-${gap}ms)`,
    advice: ms < 2000 ? 'Nên dùng Cache (Redis)' : 'Tách DB riêng / Nâng cấp CPU'
  };
}

function getErrorColor(errors, total) {
  if (!total) return 'text-slate-400';
  const rate = (errors / total) * 100;
  if (rate === 0) return 'text-emerald-400';
  if (rate < 5) return 'text-amber-400';
  return 'text-red-400';
}

function getErrorAdvice(errors, total) {
  if (!total || errors === 0) return null;
  const rate = (errors / total) * 100;
  return {
    gap: `(Cần về 0)`,
    advice: rate < 5 ? 'Xem Nginx Timeout' : 'Quá tải! Tăng RAM Server'
  };
}

export default function StressTest() {
  const [numUsers, setNumUsers] = useState(50);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [baseUrl, setBaseUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000');
  const [testMode, setTestMode] = useState('real'); // 'real' | 'simulate'
  const [status, setStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const pollingRef = useRef(null);
  const currentUsername = localStorage.getItem('adminUsername') || 'Admin';

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API}/api/admin/stress/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        return data.is_running;
      }
    } catch (err) {
      console.error('Failed to fetch stress status:', err);
    }
    return false;
  }, []);

  // Poll status when running
  useEffect(() => {
    fetchStatus().then(running => {
      if (running) setIsPolling(true);
    });
  }, [fetchStatus]);

  useEffect(() => {
    if (isPolling) {
      pollingRef.current = setInterval(async () => {
        const running = await fetchStatus();
        if (!running) {
          setIsPolling(false);
          clearInterval(pollingRef.current);
        }
      }, 1000);
    }
    return () => clearInterval(pollingRef.current);
  }, [isPolling, fetchStatus]);

  const handleToggleTarget = (id) => {
    setSelectAll(false);
    setSelectedTargets(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const resetTest = async () => {
    try {
      const token = localStorage.getItem('adminAuth');
      await fetch(`${API}/api/admin/stress/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch(e) { console.error(e); }
    setStatus(null);
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedTargets([]);
    }
  };

  const startTest = async () => {
    setStartLoading(true);
    try {
      const token = localStorage.getItem('adminAuth');
      let targets = [...selectedTargets];
      if (selectAll) targets = ['__random__'];

      const res = await fetch(`${API}/api/admin/stress/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          num_users: numUsers,
          targets: targets,
          base_url: baseUrl,
          random: selectAll,
          mode: testMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsPolling(true);
        await fetchStatus();
      } else {
        alert(data.error || 'Không thể bắt đầu stress test.');
      }
    } catch (err) {
      alert('Lỗi kết nối đến Backend.');
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    setStopLoading(true);
    try {
      const token = localStorage.getItem('adminAuth');
      await fetch(`${API}/api/admin/stress/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setStopLoading(false);
    }
  };

  const isRunning = status?.is_running;
  const isLockedByOther = isRunning && status?.started_by !== currentUsername;
  const summary = status?.summary || {};
  const perTarget = status?.per_target || {};
  const timeline = status?.timeline || [];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-100 flex items-center gap-3'>
            <Zap size={24} className='text-amber-400' />
            Stress Test
          </h1>
          <p className='text-sm text-slate-500 mt-1'>Giả lập lượng truy cập để kiểm thử khả năng chịu tải của hệ thống</p>
        </div>
        {isRunning && (
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20'>
            <div className='w-2 h-2 rounded-full bg-amber-400 animate-pulse' />
            <span className='text-xs font-medium text-amber-400'>ĐANG CHẠY</span>
          </div>
        )}
      </div>

      {isLockedByOther && (
        <div className='flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20'>
          <ShieldAlert size={20} className='text-red-400 shrink-0' />
          <div>
            <p className='text-sm font-medium text-red-400'>
              Hệ thống đang được Test Stress bởi <span className='font-bold'>{status.started_by}</span>
            </p>
            <p className='text-xs text-red-400/60 mt-0.5'>Vui lòng đợi phiên test kết thúc hoặc nhờ người đó bấm thu hồi.</p>
          </div>
        </div>
      )}

      <div className='bg-slate-800 rounded-lg border border-slate-700 p-6'>
        <h2 className='text-sm font-medium text-slate-400 uppercase tracking-wider mb-4'>Bảng điều khiển</h2>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-xs font-medium text-slate-400 mb-1.5'>Chế độ Kiểm thử</label>
              <div className='flex items-center gap-2'>
                <select
                  value={testMode}
                  onChange={(e) => setTestMode(e.target.value)}
                  disabled={isRunning}
                  className='w-full py-2 px-3 text-xs font-medium rounded bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50'
                >
                  <option value='real'>Thực tế (Bắn thật)</option>
                  <option value='sim_free'>Mô phỏng: Free (0.1 CPU - 512MB)</option>
                  <option value='sim_starter'>Mô phỏng: Starter (0.5 CPU - 512MB)</option>
                  <option value='sim_standard'>Mô phỏng: Standard (1 CPU - 2GB)</option>
                  <option value='sim_pro'>Mô phỏng: Pro (2 CPU - 4GB)</option>
                  <option value='sim_pro_plus'>Mô phỏng: Pro Plus (4 CPU - 8GB)</option>
                  <option value='sim_pro_ultra'>Mô phỏng: Pro Ultra (8 CPU - 32GB)</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-xs font-medium text-slate-400 mb-1.5'>Số lượng User ảo</label>
              <div className='flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-md px-3 py-2'>
                <input
                  type='number'
                  min='1'
                  max={testMode === 'real' ? 5000 : 10000000000}
                  value={numUsers}
                  onChange={(e) => {
                    const limit = testMode === 'real' ? 5000 : 10000000000;
                    setNumUsers(Math.min(limit, Math.max(1, parseInt(e.target.value) || 1)));
                  }}
                  disabled={isRunning}
                  className='w-full bg-transparent border-none focus:outline-none text-sm text-slate-200 tabular-nums disabled:opacity-50'
                />
                <span className='text-xs text-slate-500 whitespace-nowrap'>
                  / {testMode === 'real' ? '5,000' : '10 Tỷ'}
                </span>
              </div>
            </div>
            <div>
              <label className='block text-xs font-medium text-slate-400 mb-1.5'>Base URL (Máy chủ)</label>
              <input
                type='text'
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                disabled={isRunning}
                className='w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-mono'
              />
            </div>
          </div>

          {/* Center: Targets */}
          <div className='lg:col-span-2'>
            <label className='block text-xs font-medium text-slate-400 mb-1.5'>Mục tiêu tấn công</label>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-pointer transition-all border ${
                  selectAll
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                } ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  type='checkbox'
                  checked={selectAll}
                  onChange={handleSelectAll}
                  disabled={isRunning}
                  className='accent-cyan-500'
                />
                <Target size={12} />
                <span className='font-medium'>Tấn công Random</span>
              </label>
              {DEFAULT_TARGETS.map(t => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-pointer transition-all border ${
                    (selectAll || selectedTargets.includes(t.id))
                      ? 'bg-slate-700/50 border-slate-600 text-slate-200'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                  } ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type='checkbox'
                    checked={selectAll || selectedTargets.includes(t.id)}
                    onChange={() => handleToggleTarget(t.id)}
                    disabled={isRunning || selectAll}
                    className='accent-cyan-500'
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-3 mt-6 pt-4 border-t border-slate-700'>
          {!isRunning ? (
            <button
              onClick={startTest}
              disabled={startLoading || (selectedTargets.length === 0 && !selectAll) || isLockedByOther}
              className='flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-900/20'
            >
              <Zap size={16} className={startLoading ? 'animate-pulse' : ''} />
              {startLoading ? 'Đang kích hoạt...' : (summary.total_requests > 0 ? 'Tiếp tục (Resume)' : 'Bắt đầu Tấn công')}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={stopLoading || isLockedByOther}
              className='flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Square size={16} />
              {stopLoading ? 'Đang dừng...' : 'Thu hồi (Dừng)'}
            </button>
          )}
          <button
            onClick={resetTest}
            disabled={isRunning}
            className='flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <RefreshCw size={14} />
            Làm mới (Xóa Dữ liệu)
          </button>
          {isRunning && status?.started_by && (
            <span className='ml-auto text-xs text-slate-500'>
              Đang chạy bởi <span className='text-slate-300 font-medium'>{status.started_by}</span>
              {status.started_at && ` · Bắt đầu ${new Date(status.started_at).toLocaleTimeString('vi-VN')}`}
            </span>
          )}
        </div>
      </div>

      {/* Results (only show when there's data) */}
      {summary.total_requests > 0 && (
        <>
          {/* Summary KPIs */}
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
            {[
              { label: 'Tổng Request', value: summary.total_requests?.toLocaleString(), icon: <Activity size={14} />, color: 'text-cyan-400', desc: 'Lượt dội bom vào Server' },
              { label: 'Thành công', value: summary.success_count?.toLocaleString(), icon: <TrendingUp size={14} />, color: 'text-emerald-400', desc: 'Trạng thái 200 OK' },
              { label: 'Lỗi', value: summary.error_count?.toLocaleString(), icon: <AlertTriangle size={14} />, color: summary.error_count > 0 ? 'text-red-400' : 'text-slate-500', desc: 'Chết nghẽn (Mã 500/502)', ...getErrorAdvice(summary.error_count, summary.total_requests) },
              { label: 'Trung bình', value: formatMs(summary.avg_latency_ms), icon: <Clock size={14} />, color: getLatencyColor(summary.avg_latency_ms), desc: 'Độ trễ phản hồi', ...getLatencyAdvice(summary.avg_latency_ms) },
              { label: 'P95', value: formatMs(summary.p95_latency_ms), icon: <Clock size={14} />, color: getLatencyColor(summary.p95_latency_ms), desc: '95% học sinh tải dưới mức này', ...getLatencyAdvice(summary.p95_latency_ms) },
              { label: 'RPS', value: summary.requests_per_second?.toFixed(1), icon: <Zap size={14} />, color: 'text-indigo-400', desc: 'Truy cập xử lý trong 1 giây (Throughput)' },
            ].map((kpi, i) => (
              <div key={i} className='bg-slate-800 rounded-lg border border-slate-700 p-4'>
                <div className='flex items-center gap-1.5 text-slate-400 mb-2'>
                  {kpi.icon}
                  <span className='text-xs font-medium uppercase tracking-wider'>{kpi.label}</span>
                </div>
                <div className='flex items-baseline gap-1.5 mb-1'>
                  <div className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value || '—'}</div>
                  {kpi.gap && <span className='text-[10px] font-semibold text-emerald-400'>{kpi.gap}</span>}
                </div>
                <div className='text-[10px] text-slate-500 leading-tight'>
                  {kpi.desc}
                  {kpi.advice && <div className='mt-1.5 text-amber-400/90 font-medium'>💡 Khuyến nghị: {kpi.advice}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Chart */}
          {timeline.length > 1 && (
            <div className='bg-slate-800 rounded-lg border border-slate-700 p-6'>
              <h3 className='text-sm font-medium text-slate-400 mb-4'>Biểu đồ theo Thời gian thực</h3>
              <div className='h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                    <XAxis dataKey='elapsed_s' stroke='#94a3b8' tick={{ fontSize: 11 }} tickFormatter={v => v + 's'} />
                    <YAxis yAxisId='left' stroke='#94a3b8' tick={{ fontSize: 11 }} />
                    <YAxis yAxisId='right' orientation='right' stroke='#94a3b8' tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId='left' type='monotone' dataKey='rps' stroke='#6366f1' strokeWidth={2} dot={false} name='RPS' />
                    <Line yAxisId='right' type='monotone' dataKey='avg_latency' stroke='#f59e0b' strokeWidth={2} dot={false} name='Latency (ms)' />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-Target Table */}
          {Object.keys(perTarget).length > 0 && (
            <div className='bg-slate-800 rounded-lg border border-slate-700 overflow-hidden'>
              <div className='px-6 py-4 border-b border-slate-700'>
                <h3 className='text-sm font-medium text-slate-400'>Chi tiết theo Mục tiêu</h3>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-slate-900/80'>
                      <th className='text-left py-3 px-4 text-slate-500 font-medium text-xs'>Trang</th>
                      <th className='text-right py-3 px-4 text-slate-500 font-medium text-xs'>Requests</th>
                      <th className='text-right py-3 px-4 text-slate-500 font-medium text-xs'>Thành công</th>
                      <th className='text-right py-3 px-4 text-slate-500 font-medium text-xs'>Lỗi</th>
                      <th className='text-right py-3 px-4 text-slate-500 font-medium text-xs'>Tỷ lệ lỗi</th>
                      <th className='text-right py-3 px-4 text-slate-500 font-medium text-xs'>Latency TB</th>
                      <th className='text-center py-3 px-4 text-slate-500 font-medium text-xs'>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(perTarget).map(([target, data], i) => {
                      const errorRate = data.error_rate || 0;
                      let statusBadge;
                      if (errorRate === 0 && data.avg_latency_ms < 1000) {
                        statusBadge = <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400'>Khỏe</span>;
                      } else if (errorRate < 5 && data.avg_latency_ms < 3000) {
                        statusBadge = <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400'>Cảnh báo</span>;
                      } else {
                        statusBadge = <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400'>Nguy hiểm</span>;
                      }
                      
                      const label = DEFAULT_TARGETS.find(t => t.id === target)?.label || target;
                      
                      return (
                        <tr key={i} className='border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors'>
                          <td className='py-2.5 px-4 text-slate-300 font-medium text-xs'>
                            {label}
                            {target === '__db_benchmark__' && <Zap size={10} className='inline ml-1 text-amber-400'/>}
                          </td>
                          <td className='py-2.5 px-4 text-right text-slate-300 tabular-nums'>{data.requests}</td>
                          <td className='py-2.5 px-4 text-right text-emerald-400 tabular-nums'>{data.success}</td>
                          <td className='py-2.5 px-4 text-right text-red-400 tabular-nums'>{data.errors}</td>
                          <td className='py-2.5 px-4 text-right tabular-nums'>
                            <span className={errorRate > 5 ? 'text-red-400 font-medium' : 'text-slate-400'}>{errorRate}%</span>
                          </td>
                          <td className='py-2.5 px-4 text-right text-amber-400 tabular-nums'>{formatMs(data.avg_latency_ms)}</td>
                          <td className='py-2.5 px-4 text-center'>{statusBadge}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Extra Stats */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-slate-800 rounded-lg border border-slate-700 p-5'>
              <h4 className='text-xs font-medium text-slate-500 uppercase tracking-wider mb-2'>Phạm vi Latency</h4>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>Nhanh nhất</span>
                  <span className={`font-medium tabular-nums ${getLatencyColor(summary.min_latency_ms)}`}>{formatMs(summary.min_latency_ms)}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>Trung bình</span>
                  <span className={`font-medium tabular-nums ${getLatencyColor(summary.avg_latency_ms)}`}>{formatMs(summary.avg_latency_ms)}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>Chậm nhất</span>
                  <span className={`font-medium tabular-nums ${getLatencyColor(summary.max_latency_ms)}`}>{formatMs(summary.max_latency_ms)}</span>
                </div>
              </div>
            </div>
            <div className='bg-slate-800 rounded-lg border border-slate-700 p-5'>
              <h4 className='text-xs font-medium text-slate-500 uppercase tracking-wider mb-2'>Phân vị (Percentile)</h4>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>P95 (95% nhanh hơn)</span>
                  <span className={`font-medium tabular-nums ${getLatencyColor(summary.p95_latency_ms)}`}>{formatMs(summary.p95_latency_ms)}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>P99 (99% nhanh hơn)</span>
                  <span className={`font-medium tabular-nums ${getLatencyColor(summary.p99_latency_ms)}`}>{formatMs(summary.p99_latency_ms)}</span>
                </div>
              </div>
            </div>
            <div className='bg-slate-800 rounded-lg border border-slate-700 p-5'>
              <h4 className='text-xs font-medium text-slate-500 uppercase tracking-wider mb-2'>Tổng kết</h4>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>Throughput</span>
                  <span className='text-indigo-400 font-medium tabular-nums'>{summary.requests_per_second?.toFixed(1)} req/s</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-slate-400'>Tỷ lệ lỗi tổng</span>
                  <span className={`font-medium tabular-nums ${getErrorColor(summary.error_count, summary.total_requests)}`}>
                    {summary.total_requests > 0 ? (summary.error_count / summary.total_requests * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Server Recommendation */}
          {summary.requests_per_second > 0 && (() => {
            const rec = getServerRecommendation(numUsers);
            if (!rec) return null;
            return (
              <div className='bg-indigo-950/40 rounded-lg border border-indigo-500/30 overflow-hidden mt-4'>
                <div className='px-6 py-4 border-b border-indigo-500/20 flex items-center gap-2'>
                  <Zap size={18} className='text-indigo-400' />
                  <h3 className='text-sm font-medium text-indigo-300'>Chuyên gia Đề xuất Cấu hình Máy chủ (Dựa trên mục tiêu {numUsers.toLocaleString()} User ảo)</h3>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-indigo-500/20'>
                  {/* Minimum */}
                  <div className='p-6 hover:bg-indigo-900/20 transition-colors'>
                    <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 mb-4 uppercase'>
                      <ShieldAlert size={12} />
                      Tối thiểu (Chạy Ổn)
                    </div>
                    <div className='flex items-end gap-3 mb-3'>
                      <div className='text-3xl font-bold text-slate-200'>{rec.min.cpu}</div>
                      <div className='text-xl font-medium text-slate-400 mb-0.5'>· {rec.min.ram}</div>
                    </div>
                    <p className='text-sm text-slate-400 mb-4 h-10'>{rec.min.desc}</p>
                    <div className='inline-flex items-center gap-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md'>
                      Chi phí: {rec.min.price}
                    </div>
                  </div>

                  {/* Optimal */}
                  <div className='p-6 hover:bg-indigo-900/20 transition-colors'>
                    <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide bg-amber-500/10 text-amber-400 mb-4 uppercase'>
                      <Zap size={12} />
                      Tối ưu (Thả ga)
                    </div>
                    <div className='flex items-end gap-3 mb-3'>
                      <div className='text-3xl font-bold text-slate-200'>{rec.opt.cpu}</div>
                      <div className='text-xl font-medium text-slate-400 mb-0.5'>· {rec.opt.ram}</div>
                    </div>
                    <p className='text-sm text-slate-400 mb-4 h-10'>{rec.opt.desc}</p>
                    <div className='inline-flex items-center gap-2 text-sm font-medium text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-md'>
                      Chi phí: {rec.opt.price}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
