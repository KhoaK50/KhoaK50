import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { DatabaseZap, Code2, Table, Play, AlertCircle, RefreshCw } from 'lucide-react';

export default function Database() {
  const [activeTab, setActiveTab] = useState('browser');
  const [queryCode, setQueryCode] = useState('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);
  
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('users');
  const [tableData, setTableData] = useState({ columns: [], data: [] });
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  const [editingCell, setEditingCell] = useState(null);
  const [updatingCell, setUpdatingCell] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (tables.length > 0 && selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, tables]);

  const fetchTables = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/db/tables', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        if (data.length > 0 && !data.includes(selectedTable)) {
          setSelectedTable(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    }
  };

  const fetchTableData = async (tableName) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/db/table/${tableName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTableData(data);
      }
    } catch (err) {
      console.error("Failed to fetch table data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async () => {
    setQueryLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        },
        body: JSON.stringify({ query: queryCode })
      });
      const data = await res.json();
      setQueryResult(data);
    } catch (err) {
      setQueryResult({ error: "Connection error" });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCellDoubleClick = (rIdx, col, value) => {
    setEditingCell({ rIdx, col, value: String(value) });
  };

  const saveCellEdit = async (row, col, newValue) => {
    if (String(row[col]) === newValue) {
      setEditingCell(null);
      return;
    }
    
    setUpdatingCell(true);
    try {
      // Build a WHERE clause matching the original row data (naive approach for generic tables)
      const whereClauses = tableData.columns
        .filter(c => row[c] !== null && row[c] !== undefined)
        .map(c => `"${c}" = '${String(row[c]).replace(/'/g, "''")}'`)
        .join(' AND ');
        
      const updateQuery = `UPDATE ${selectedTable} SET "${col}" = '${String(newValue).replace(/'/g, "''")}' WHERE ${whereClauses}`;
      
      const res = await fetch('http://localhost:5000/api/admin/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminAuth')}`
        },
        body: JSON.stringify({ query: updateQuery })
      });
      
      if (res.ok) {
        // Optimistically update UI
        const newData = [...tableData.data];
        newData[editingCell.rIdx][col] = newValue;
        setTableData({ ...tableData, data: newData });
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật cell", err);
    } finally {
      setUpdatingCell(false);
      setEditingCell(null);
    }
  };


  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold flex items-center gap-2 text-slate-100'>
          <DatabaseZap className='text-indigo-400' /> Database Explorer
        </h1>
        <div className='flex bg-slate-800 p-1.5 rounded-lg border border-slate-700'>
          <button
            onClick={() => setActiveTab('browser')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${activeTab === 'browser' ? 'bg-indigo-500/20 shadow-sm text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            <Table size={18} /> Data Browser
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${activeTab === 'query' ? 'bg-indigo-500/20 shadow-sm text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
          >
            <Code2 size={18} /> Query Code
          </button>
        </div>
      </div>

      <div className='flex-1 min-h-0 bg-slate-800 rounded-lg shadow-sm border border-slate-700 overflow-hidden flex flex-col'>
        {activeTab === 'browser' ? (
          <div className='flex-1 min-h-0 flex flex-col'>
            <div className='p-4 border-b border-slate-700 flex gap-4 bg-slate-800 items-center'>
              <select 
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className='border border-slate-600 rounded-lg p-2 bg-slate-700 text-slate-200 min-w-[200px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              >
                {tables.map(t => (
                  <option key={t} value={t}>public.{t}</option>
                ))}
              </select>
              <button 
                onClick={() => fetchTableData(selectedTable)}
                disabled={loading}
                className='bg-slate-700 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50'
              >
                <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-400' : ''} />
                Tải lại
              </button>
            </div>
            <div className='flex-1 overflow-auto min-h-0 p-0 relative'>
              {loading ? (
                <div className="flex justify-center items-center h-full text-slate-400">Đang tải dữ liệu...</div>
              ) : tableData.data.length === 0 ? (
                <div className="flex justify-center items-center h-full text-slate-400">Bảng này chưa có dữ liệu.</div>
              ) : (
                <table className='w-full text-left border-collapse'>
                  <thead className='sticky top-0 z-20 shadow-sm'>
                    <tr className='bg-slate-900/95 border-b border-slate-700'>
                      {tableData.columns.map((col, idx) => (
                        <th key={idx} className='p-3 font-medium text-slate-300 whitespace-nowrap bg-slate-900/95'>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-700 bg-transparent'>
                    {tableData.data.map((row, rIdx) => (
                      <tr key={rIdx} className='hover:bg-slate-700/30 transition-colors'>
                        {tableData.columns.map((col, cIdx) => (
                          <td 
                            key={cIdx} 
                            className='p-3 text-sm text-slate-300 max-w-xs truncate border-r border-slate-700/30 last:border-0 relative group cursor-text' 
                            title={String(row[col])}
                            onDoubleClick={() => handleCellDoubleClick(rIdx, col, row[col])}
                          >
                            {editingCell?.rIdx === rIdx && editingCell?.col === col ? (
                              <input
                                type="text"
                                autoFocus
                                className="w-full bg-slate-800 border-2 border-indigo-500 outline-none px-2 py-1 rounded text-sm text-slate-100 absolute inset-0 z-10"
                                value={editingCell.value}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onBlur={() => saveCellEdit(row, col, editingCell.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(row, col, editingCell.value);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                disabled={updatingCell}
                              />
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className='p-3 border-t border-slate-700 bg-slate-800 text-xs text-slate-400 flex justify-between'>
              <span>Đang hiển thị dữ liệu thực tế từ Database. Giới hạn 100 dòng mới nhất.</span>
              <span>{tableData.data.length} dòng</span>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex flex-col'>
            <div className='p-4 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between'>
              <div className='flex items-center gap-2 text-amber-400 text-sm'>
                <AlertCircle size={18} />
                <span>Chế độ Query Code. Vui lòng cẩn thận với các lệnh UPDATE/DELETE. Hành động này sẽ được lưu vào Audit Logs.</span>
              </div>
              <button 
                onClick={handleRunQuery}
                disabled={queryLoading}
                className='flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-70 transition-colors'
              >
                {queryLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                Thực thi
              </button>
            </div>
            <div className='flex-1 grid grid-rows-2'>
              <div className='border-b border-slate-700 relative'>
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  theme="vs-dark"
                  value={queryCode}
                  onChange={(val) => setQueryCode(val)}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
              <div className='bg-gray-900 text-green-400 p-4 font-mono text-sm overflow-auto'>
                <div className='text-gray-400 mb-2'>// Kết quả trả về:</div>
                {queryResult ? (
                  <pre>{JSON.stringify(queryResult, null, 2)}</pre>
                ) : (
                  <span className='text-gray-600'>Chưa có dữ liệu...</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
