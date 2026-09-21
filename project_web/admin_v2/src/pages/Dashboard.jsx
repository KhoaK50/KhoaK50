import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Code2, FileCode, FileText, Braces, Palette, Globe, Database as DbIcon,
  ExternalLink, AlertTriangle, CheckCircle2, Compass, Sliders, AlertOctagon
} from 'lucide-react';
import { 
  PieChart, Pie, ScatterChart, Scatter, Cell, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

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
  const [pedagogicalData, setPedagogicalData] = useState(null);
  const [pedagogicalLoading, setPedagogicalLoading] = useState(false);
  const [codeMetrics, setCodeMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPedagogicalMetrics = useCallback(async () => {
    setPedagogicalLoading(true);
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API}/api/admin/metrics/pedagogical`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPedagogicalData(data);
      }
    } catch (err) {
      console.error('Failed to fetch pedagogical metrics:', err);
    } finally {
      setPedagogicalLoading(false);
    }
  }, []);

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
    fetchPedagogicalMetrics();
    fetchCodeMetrics();
  }, [fetchPedagogicalMetrics, fetchCodeMetrics]);

  const kpis = pedagogicalData?.kpis;
  const itemsQuadrant = pedagogicalData?.items_quadrant || [];
  const ambiguousItems = itemsQuadrant.filter(it => it.status === 'AMBIGUOUS_TRAP');

  return (
    <div className="space-y-6">
      {/* Header with quick links */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 inline-block" />
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide font-mono">
              Viễn Trắc Kỹ Thuật Khảo Thí & Thuật Toán (Engineering & Psychometrics)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Dữ liệu viễn trắc toàn diện phục vụ hiệu chuẩn tham số câu hỏi IRT 2PL, cân bằng thuật toán sinh đề và kiểm định chất lượng bẫy nhận thức
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            title="Mở Google Search Console (Cần tài khoản Google được cấp quyền)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
          >
            <Globe size={13} className="text-amber-400" />
            <span>Search Console</span>
            <ExternalLink size={11} className="text-slate-500" />
          </a>
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noreferrer"
            title="Mở Google Analytics 4 (Cần tài khoản Google được cấp quyền)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
          >
            <ExternalLink size={13} className="text-sky-400" />
            <span>Google Analytics</span>
          </a>
          <button
            onClick={() => {
              fetchPedagogicalMetrics();
              fetchCodeMetrics();
            }}
            disabled={pedagogicalLoading || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={pedagogicalLoading || loading ? 'animate-spin text-sky-400' : 'text-sky-400'} />
            Tải lại
          </button>
        </div>
      </div>
      
      {/* 4 System Development KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Card 1: Test Reliability (Cronbach's Alpha) */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
              Độ Tin Cậy Khảo Thí (Cronbach's Alpha)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              α = {kpis?.test_reliability_alpha ?? 0.82}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Chuẩn hóa ≥ 0.80)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ngân hàng câu hỏi đạt độ tin cậy và tính nhất quán cao
          </p>
        </div>

        {/* Card 2: Item Exposure Balance (Gini Index) */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
              Cân Bằng Sinh Đề (Gini Index)
            </span>
            <Sliders className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              Gini = {kpis?.gini_exposure ?? 0.39}
            </span>
            <span className="text-xs text-amber-400 font-mono">
              (Mục tiêu &lt; 0.30)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {kpis?.overexposed_count ?? 0} câu quá tải • {kpis?.underexposed_count ?? 0} câu bị bỏ quên
          </p>
        </div>

        {/* Card 3: Distractor Plausibility Rate */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
              Hiệu Lực Phương Án Nhiễu
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {kpis?.distractor_health_pct ?? 0}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({kpis?.active_distractors ?? 0} / { (kpis?.active_distractors ?? 0) + (kpis?.dead_distractors ?? 0) } bẫy sống)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {kpis?.dead_distractors ?? 0} phương án "chết" (0% chọn, lộ liễu)
          </p>
        </div>

        {/* Card 4: Calibration Health Rate */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
              Tỷ Lệ Chuẩn Hóa Khảo Thí (CAT)
            </span>
            <Compass className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {kpis?.calibration_health_pct ?? 0}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Sẵn sàng thích ứng)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {kpis?.ambiguous_traps_count ?? 0} câu cảnh báo lỗi đề / mơ hồ cần sửa
          </p>
        </div>
      </div>

      {/* Row 1: IRT 2PL Scatter Quadrant Map (Toàn diện tất cả câu hỏi) */}
      <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 inline-block" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Ma Trận 4 Góc Phần Tư Hiệu Chuẩn Khảo Thí IRT 2PL (Item Calibration Quadrant Map)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Toàn diện 100% ngân hàng câu hỏi trên không gian tham số: Trục hoành Độ khó (b) vs Trục tung Độ phân cách (a)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 inline-block" />
              Chuẩn hóa vàng
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 bg-purple-500 inline-block" />
              Phân hóa cao
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 bg-amber-500 inline-block" />
              Kém phân biệt
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 bg-rose-500 inline-block" />
              Cảnh báo lỗi đề/mơ hồ
            </span>
          </div>
        </div>

        {/* The Scatter Plot */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                type="number" 
                dataKey="b" 
                name="Độ khó (b)" 
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                domain={[-2.5, 2.5]}
                label={{ value: 'Độ khó thực nghiệm b (Trái: Dễ -> Phải: Khó)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis 
                type="number" 
                dataKey="a" 
                name="Độ phân cách (a)" 
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                domain={[0.2, 2.0]}
                label={{ value: 'Độ phân cách thực nghiệm a', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <ZAxis range={[90, 160]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#090d16] border border-slate-700 p-3 text-xs space-y-1 font-mono text-slate-200">
                        <div className="font-bold flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-sky-400">Câu #{data.numeric_id}</span>
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-800">{data.topic}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 text-[11px]">
                          <span className="text-slate-400">Độ khó b:</span>
                          <span className="font-bold">{data.b}</span>
                          <span className="text-slate-400">Độ phân cách a:</span>
                          <span className="font-bold">{data.a}</span>
                          <span className="text-slate-400">Tỷ lệ làm đúng:</span>
                          <span className="font-bold text-sky-400">{data.accuracy}%</span>
                          <span className="text-slate-400">Lượt làm bài:</span>
                          <span>{data.exposures} lần</span>
                          <span className="text-slate-400">Đổi đáp án:</span>
                          <span>{data.avg_switches} lần/câu</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-800 text-[10px]">
                          Trạng thái: <span style={{ color: data.color }} className="font-bold">{data.status_label}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0.95} stroke="#334155" strokeDasharray="3 3" label={{ value: 'Ngưỡng phân cách chuẩn (a=0.95)', fill: '#475569', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine x={0.4} stroke="#334155" strokeDasharray="3 3" />
              <Scatter data={itemsQuadrant}>
                {itemsQuadrant.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={1} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Ambiguous Trap Action Box */}
        <div className="p-3 bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1.5">
              <AlertOctagon size={13} />
              CẢNH BÁO KIỂM THỬ NỘI DUNG (Content QA Trigger)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {ambiguousItems.length} câu hỏi rơi vào vùng bẫy mơ hồ (Độ khó cao nhưng phân cách kém)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Trong lý thuyết khảo thí, khi một câu hỏi có độ khó cực cao nhưng độ phân cách gần bằng 0 (sinh viên giỏi cũng làm sai như sinh viên yếu), câu hỏi đó thường bị <strong>lỗi đề, công thức LaTeX nhập sai, hoặc câu chữ mơ hồ</strong>. Nhóm biên soạn cần ưu tiên kiểm tra lại các câu này:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {ambiguousItems.map(item => (
              <span key={item.id} className="px-2.5 py-1 bg-rose-950/60 border border-rose-800/80 text-xs font-mono text-rose-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Câu #{item.numeric_id}</span>
                <span className="text-[10px] text-rose-400/80">({item.accuracy}% đúng, a={item.a})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: 2 Dynamic Engineering Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Block 1: Quiz Engine Exposure Balance & Gini */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-sky-500 inline-block" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Phân Bổ Tải Thuật Toán Sinh Đề (Item Exposure Telemetry)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Đo lường mức độ đồng đều khi bốc câu hỏi của động cơ Adaptive Testing
              </p>
            </div>
            <span className="text-[10px] font-mono text-sky-400 border border-sky-900/60 px-2 py-0.5 bg-sky-950/40">
              Gini: {kpis?.gini_exposure ?? 0}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {(pedagogicalData?.exposure_distribution || []).map((grp) => (
              <div key={grp.group} className="p-2.5 bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span style={{ color: grp.color }} className="font-bold">{grp.group}</span>
                    <span className="text-[10px] text-slate-400">({grp.count} câu - {grp.pct}%)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans">{grp.desc}</span>
                </div>
                
                <div className="h-2 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ width: `${grp.pct}%`, backgroundColor: grp.color }}
                  />
                </div>

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {(grp.items || []).map((itId) => (
                    <span key={itId} className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900 text-slate-400 border border-slate-800">
                      {itId}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="text-sky-400 font-semibold">Tối Ưu Kỹ Thuật: </span>
            Khi hệ số Gini vượt quá 0.30, động cơ sinh đề cần được tăng cường hệ số phạt lặp (Exposure Penalty / Sympson-Hetter algorithm) để các câu bị bỏ quên được xuất hiện thường xuyên hơn.
          </div>
        </div>

        {/* Block 2: Distractor Diagnostic Matrix (Tỷ lệ bẫy chết) */}
        <div className="bg-[#0c1220] p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 inline-block" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Ma Trận Hiệu Lực Phương Án Nhiễu (Distractor Health Matrix)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kiểm định chất lượng 5 nhóm bẫy nhận thức: Bẫy sống (được chọn) vs Bẫy chết (0% chọn)
              </p>
            </div>
            <span className="text-[10px] font-mono text-amber-400 border border-amber-900/60 px-2 py-0.5 bg-amber-950/40">
              5 Dạng sai lầm
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {(pedagogicalData?.distractor_matrix || []).map((trap) => (
              <div key={trap.key} className="p-2.5 bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold">{trap.name}</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-400">{trap.total} phương án</span>
                    <span className="text-emerald-400">{trap.active} sống</span>
                    <span className="text-rose-400">{trap.dead} chết</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 h-2 bg-slate-900 border border-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, trap.total > 0 ? (trap.active * 100 / trap.total) * 2 : 0)}%` }}
                    title={`${trap.active} phương án bẫy hiệu quả`}
                  />
                  <div 
                    className="h-full bg-slate-700 transition-all duration-300"
                    style={{ width: `${Math.min(100, trap.total > 0 ? (trap.dead * 100 / trap.total) : 0)}%` }}
                    title={`${trap.dead} phương án chết`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Mã: {trap.key}</span>
                  <span>Tỷ lệ bẫy thành công: <strong className={trap.rate > 0 ? "text-emerald-400" : "text-slate-500"}>{trap.rate}%</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="text-amber-400 font-semibold">Chỉ Dẫn Nội Dung: </span>
            Các phương án có tỷ lệ chọn = 0% đang làm lãng phí giá trị câu hỏi. Tác giả đề thi cần viết lại các phương án nhiễu để đánh trúng lỗi tư duy thay vì đưa ra các con số vô lý.
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
