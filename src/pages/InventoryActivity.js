import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';

function InventoryActivity() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(isAdmin ? '' : user.unit);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const units = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein'];

  useEffect(() => {
  const fetchLogs = async () => {
    let query = supabase
      .from('inventory_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!isAdmin) {
      query = query.eq('dining_unit', user.unit);
    } else if (selectedUnit) {
      query = query.eq('dining_unit', selectedUnit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Activity fetch error:', error.message);
    } else {
      setLogs(data || []);
      setCurrentPage(1);
    }
  };

  fetchLogs();
}, [selectedUnit, isAdmin, user.unit]);


  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentLogs = logs.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(logs.length / rowsPerPage);

  return (
    <div className="p-6 max-w-6xl mx-auto">
    <BackToInventoryDashboard />  
      <h1 className="text-2xl font-bold mb-4">Inventory Activity Log</h1>

      {/* Unit filter */}
      {isAdmin && (
        <div className="mb-4 flex items-center gap-4">
          <label className="font-semibold">Filter by unit:</label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">-- All Units --</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rows Per Page Selector */}
      <div className="mb-2 flex justify-end">
        <label className="mr-2 text-sm font-medium">Rows per page:</label>
        <select
          className="border px-2 py-1 rounded text-sm"
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Timestamp</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Action</th>
            <th className="border p-2">Dining Unit</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">User Email</th>
          </tr>
        </thead>
        <tbody>
          {currentLogs.map((log, idx) => (
            <tr key={idx}>
              <td className="border p-2">{new Date(log.timestamp).toLocaleString()}</td>
              <td className="border p-2">{log.name}</td>
              <td className="border p-2">{log.sku}</td>
              <td className="border p-2">{log.quantity}</td>
              <td className="border p-2">{log.action}</td>
              <td className="border p-2">{log.dining_unit}</td>
              <td className="border p-2">{log.location || '-'}</td>
              <td className="border p-2">{log.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default InventoryActivity;
