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
      <h1 className='text-2xl font-bold mb-4'>Thống kê Hệ thống (Metrics)</h1>
      
      {/* KPI Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-gray-500 text-sm font-medium'>Tổng Tài khoản</h3>
          <p className='text-3xl font-bold mt-2 text-blue-600'>1,024</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-gray-500 text-sm font-medium'>Tổng Bài học</h3>
          <p className='text-3xl font-bold mt-2 text-purple-600'>78</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-gray-500 text-sm font-medium'>Tổng Bài tập</h3>
          <p className='text-3xl font-bold mt-2 text-orange-600'>1,250</p>
        </div>
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-gray-500 text-sm font-medium'>Đang Online</h3>
          <p className='text-3xl font-bold mt-2 text-green-600'>42</p>
        </div>
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* User Growth */}
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-lg font-medium mb-4'>Tăng trưởng người dùng 7 ngày qua</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type='monotone' dataKey='users' stroke='#2563eb' strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Lessons */}
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200'>
          <h3 className='text-lg font-medium mb-4'>Top 4 bài học truy cập nhiều nhất</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={topLessonsData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='views' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quiz Difficulty */}
        <div className='bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2 flex flex-col items-center'>
          <h3 className='text-lg font-medium mb-4 w-full text-left'>Tỉ lệ phân bổ độ khó Bài tập (Ngân hàng 1,000+ câu)</h3>
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
                >
                  {quizDifficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
