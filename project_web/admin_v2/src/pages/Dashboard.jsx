import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function Dashboard() {
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
    </div>
  );
}
