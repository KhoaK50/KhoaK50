import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Code2, FileCode, FileText, Braces, Palette, Globe, Database as DbIcon } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = 'http://127.0.0.1:5000';

const userGrowthData = [
  { name: 'T2', users: 400 },
  { name: 'T3', users: 300 },
  { name: 'T4', users: 550 },
  { name: 'T5', users: 480 },
  { name: 'T6', users: 700 },
  { name: 'T7', users: 850 },
  { name: 'CN', users: 1024 },
];

const topLessonsData = [
  { name: 'Vector 1', views: 1200 },
  { name: 'Lượng giác', views: 900 },
  { name: 'Hình học k/g', views: 850 },
  { name: 'Hàm số', views: 1400 },
];

const quizDifficultyData = [
  { name: 'Dễ', value: 400 },
  { name: 'Trung bình', value: 300 },
  { name: 'Khó', value: 300 },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const EXT_ICONS = {
  '.py': { icon: <Code2 size={14} />, color: '#3b82f6', label: 'Python' },
  '.jsx': { icon: <FileCode size={14} />, color: '#06b6d4', label: 'React JSX' },
  '.js': { icon: <Braces size={14} />, color: '#eab308', label: 'JavaScript' },
  '.css': { icon: <Palette size={14} />, color: '#8b5cf6', label: 'CSS' },
  '.html': { icon: <Globe size={14} />, color: '#f97316', label: 'HTML' },
  '.json': { icon: <Braces size={14} />, color: '#6b7280', label: 'JSON' },
  '.sql': { icon: <DbIcon size={14} />, color: '#ec4899', label: 'SQL' },
  'other': { icon: <FileText size={14} />, color: '#475569', label: 'Khác' },
};

const PIE_COLORS = ['#3b82f6', '#06b6d4', '#eab308', '#8b5cf6', '#f97316', '#6b7280', '#ec4899', '#475569'];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(num) {
  return num.toLocaleString('vi-VN');
}

export default function Dashboard() {
  const [codeMetrics, setCodeMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCodeMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API}/api/admin/metrics/codebase`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCodeMetrics(data);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (err) {
      console.error('Failed to fetch codebase metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodeMetrics();
  }, [fetchCodeMetrics]);

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold mb-4 text-slate-100'>Thống kê Hệ thống (Metrics)</h1>
      
      {/* KPI Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700 hover:bg-slate-800 transition-colors'>
          <h3 className='text-slate-400 text-sm font-medium'>Tổng Tài khoản</h3>
          <p className='text-3xl font-bold mt-2 text-indigo-400'>1,024</p>
        </div>
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700 hover:bg-slate-800 transition-colors'>
          <h3 className='text-slate-400 text-sm font-medium'>Tổng Bài học</h3>
          <p className='text-3xl font-bold mt-2 text-purple-400'>78</p>
        </div>
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700 hover:bg-slate-800 transition-colors'>
          <h3 className='text-slate-400 text-sm font-medium'>Tổng Bài tập</h3>
          <p className='text-3xl font-bold mt-2 text-orange-400'>1,250</p>
        </div>
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700 hover:bg-slate-800 transition-colors'>
          <h3 className='text-slate-400 text-sm font-medium'>Đang Online</h3>
          <p className='text-3xl font-bold mt-2 text-emerald-400'>42</p>
        </div>
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* User Growth */}
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700'>
          <h3 className='text-lg font-medium mb-4 text-slate-200'>Tăng trưởng người dùng 7 ngày qua</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                <XAxis dataKey='name' stroke='#94a3b8' />
                <YAxis stroke='#94a3b8' />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend />
                <Line type='monotone' dataKey='users' stroke='#6366f1' strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Lessons */}
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700'>
          <h3 className='text-lg font-medium mb-4 text-slate-200'>Top 4 bài học truy cập nhiều nhất</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={topLessonsData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#334155' />
                <XAxis dataKey='name' stroke='#94a3b8' />
                <YAxis stroke='#94a3b8' />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} cursor={{fill: '#334155', opacity: 0.4}} />
                <Bar dataKey='views' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quiz Difficulty */}
        <div className='bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-700 lg:col-span-2 flex flex-col items-center'>
          <h3 className='text-lg font-medium mb-4 w-full text-left text-slate-200'>Tỉ lệ phân bổ độ khó Bài tập (Ngân hàng 1,000+ câu)</h3>
          <div className='h-72 w-full max-w-md'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={quizDifficultyData}
                  cx='50%'
                  cy='50%'
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey='value'
                  stroke="none"
                >
                  {quizDifficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================== CODEBASE SCALE ==================== */}
      <div className='bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-700'>
          <div>
            <h3 className='text-lg font-medium text-slate-200'>Quy mô Dự án (Codebase)</h3>
            {lastUpdated && (
              <p className='text-xs text-slate-500 mt-0.5'>Cập nhật lần cuối: {lastUpdated}</p>
            )}
          </div>
          <button
            onClick={fetchCodeMetrics}
            disabled={loading}
            className='flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 transition-colors disabled:opacity-50'
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang quét...' : 'Tải lại'}
          </button>
        </div>

        {codeMetrics ? (
          <div className='p-6 space-y-6'>
            {/* Summary KPIs */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='bg-slate-900/50 rounded-lg p-4 text-center'>
                <p className='text-xs text-slate-500 uppercase tracking-wider font-medium'>Tổng số File</p>
                <p className='text-2xl font-bold text-cyan-400 mt-1'>{formatNumber(codeMetrics.total_files)}</p>
              </div>
              <div className='bg-slate-900/50 rounded-lg p-4 text-center'>
                <p className='text-xs text-slate-500 uppercase tracking-wider font-medium'>Tổng dòng Code</p>
                <p className='text-2xl font-bold text-emerald-400 mt-1'>{formatNumber(codeMetrics.total_lines)}</p>
              </div>
              <div className='bg-slate-900/50 rounded-lg p-4 text-center'>
                <p className='text-xs text-slate-500 uppercase tracking-wider font-medium'>Tổng dung lượng</p>
                <p className='text-2xl font-bold text-amber-400 mt-1'>{formatBytes(codeMetrics.total_bytes)}</p>
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Language Pie Chart */}
              <div>
                <h4 className='text-sm font-medium text-slate-400 mb-3'>Phân bổ theo Ngôn ngữ</h4>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={codeMetrics.breakdown.filter(b => b.lines > 0)}
                        cx='50%'
                        cy='50%'
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey='lines'
                        nameKey='extension'
                        stroke='none'
                      >
                        {codeMetrics.breakdown.filter(b => b.lines > 0).map((entry, index) => (
                          <Cell key={`code-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value, name) => [formatNumber(value) + ' dòng', EXT_ICONS[name]?.label || name]}
                      />
                      <Legend
                        wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                        formatter={(value) => EXT_ICONS[value]?.label || value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown Table */}
              <div>
                <h4 className='text-sm font-medium text-slate-400 mb-3'>Chi tiết theo Định dạng</h4>
                <div className='rounded-lg overflow-hidden border border-slate-700'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='bg-slate-900/80'>
                        <th className='text-left py-2.5 px-3 text-slate-500 font-medium text-xs'>Định dạng</th>
                        <th className='text-right py-2.5 px-3 text-slate-500 font-medium text-xs'>Files</th>
                        <th className='text-right py-2.5 px-3 text-slate-500 font-medium text-xs'>Dòng code</th>
                        <th className='text-right py-2.5 px-3 text-slate-500 font-medium text-xs'>Dung lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codeMetrics.breakdown.map((item, i) => {
                        const ext = EXT_ICONS[item.extension] || EXT_ICONS['other'];
                        return (
                          <tr key={i} className='border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors'>
                            <td className='py-2 px-3'>
                              <span className='flex items-center gap-2 text-slate-300'>
                                <span style={{ color: ext.color }}>{ext.icon}</span>
                                {ext.label}
                              </span>
                            </td>
                            <td className='py-2 px-3 text-right text-slate-400 tabular-nums'>{formatNumber(item.files)}</td>
                            <td className='py-2 px-3 text-right text-slate-300 font-medium tabular-nums'>{formatNumber(item.lines)}</td>
                            <td className='py-2 px-3 text-right text-slate-400 tabular-nums'>{formatBytes(item.bytes)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Largest Files */}
            <div>
              <h4 className='text-sm font-medium text-slate-400 mb-3'>Top 15 File lớn nhất (theo dòng code)</h4>
              <div className='rounded-lg overflow-hidden border border-slate-700'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-slate-900/80'>
                      <th className='text-left py-2.5 px-3 text-slate-500 font-medium text-xs'>#</th>
                      <th className='text-left py-2.5 px-3 text-slate-500 font-medium text-xs'>Đường dẫn</th>
                      <th className='text-right py-2.5 px-3 text-slate-500 font-medium text-xs'>Dòng</th>
                      <th className='text-right py-2.5 px-3 text-slate-500 font-medium text-xs'>Dung lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeMetrics.largest_files.map((file, i) => (
                      <tr key={i} className='border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors'>
                        <td className='py-1.5 px-3 text-slate-600 text-xs'>{i + 1}</td>
                        <td className='py-1.5 px-3 text-slate-300 font-mono text-xs truncate max-w-[400px]' title={file.path}>{file.path}</td>
                        <td className='py-1.5 px-3 text-right text-slate-300 font-medium tabular-nums'>{formatNumber(file.lines)}</td>
                        <td className='py-1.5 px-3 text-right text-slate-400 tabular-nums'>{formatBytes(file.bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className='p-12 text-center text-slate-500 text-sm'>
            {loading ? 'Đang quét toàn bộ dự án...' : 'Bấm nút "Tải lại" để quét quy mô dự án.'}
          </div>
        )}
      </div>
    </div>
  );
}
