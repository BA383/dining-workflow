import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions';
import { getCurrentUser } from '../utils/userSession';

function InventoryActivity() {
  const [user, setUser] = useState({});
  const [logs, setLogs] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const units = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein'];

  // ⛔️ Don't use user.role before declaring user
const isAdminUser = user?.role === 'admin';


  // ✅ Set user and unit from local storage (or session)
  useEffect(() => {
  async function fetchUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);

    // ✅ Admins get "all", Dining users get their unit
    if (currentUser?.role === 'admin') {
      setSelectedUnit('all');
    } else {
      setSelectedUnit(currentUser?.unit || '');
    }
  }
  fetchUser();
}, []);



  // ✅ Permissions check AFTER user is loaded
  if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Inventory is for Dining staff only.</p>
      </div>
    );
  }

  // ✅ Fallback in case admin has no selected unit
  useEffect(() => {
    if (isAdminUser && !selectedUnit) {
      setSelectedUnit(user.unit);
    }
  }, [isAdminUser, user.unit, selectedUnit]);

  // ✅ Fetch logs with RLS context
  useEffect(() => {
const fetchLogs = async () => {
  if (!user?.role) return; // ✅ Ensure role is loaded before anything

  const isAdminUser = user.role === 'admin'; // ✅ Define it locally

  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: selectedUnit || 'Administration',
  });

  await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: user.role || 'user',
  });

  let query = supabase
    .from('inventory_logs')
    .select('sku, name, quantity, action, location, dining_unit, target_unit, email, timestamp')
    .order('timestamp', { ascending: false });

  if (isAdminUser && selectedUnit && selectedUnit !== 'all') {
    query = query.eq('dining_unit', selectedUnit); // ✅ admin with unit filter
  } else if (!isAdminUser && user.unit) {
    query = query.or(`dining_unit.eq.${user.unit},target_unit.eq.${user.unit}`); // ✅ dining staff only
  }

  const { data, error } = await query;
  if (!error) {
    setLogs(data || []);
    setCurrentPage(1);
  } else {
    console.error('Activity fetch error:', error.message);
  }
};


    fetchLogs();
  }, [selectedUnit, user]);


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
            <th className="border p-2">Target Unit</th>
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

             <td className="border p-2">
             {log.action}
             {log.action === 'transfer' && log.target_unit && (
             <span className="ml-1 text-blue-600">→ {log.target_unit}</span>
      )}
             </td>


              <td className="border p-2">{log.dining_unit}</td>
              <td className="border p-2">{log.target_unit || '-'}</td>
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
