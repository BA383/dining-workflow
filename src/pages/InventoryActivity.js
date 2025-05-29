import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function InventoryActivity() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(user.unit || '');

  const units = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein'];

  useEffect(() => {
    const fetchLogs = async () => {
      const query = supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false });
      if (!isAdmin) {
        query.eq('unit', user.unit);
      } else if (selectedUnit) {
        query.eq('unit', selectedUnit);
      }

      const { data, error } = await query;
      if (!error) setLogs(data);
      else console.error('Activity fetch error:', error.message);
    };

    fetchLogs();
  }, [user.unit, selectedUnit, isAdmin]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Inventory Activity Log</h1>

      {isAdmin && (
        <div className="mb-4">
          <label className="font-semibold mr-2">Filter by Unit:</label>
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

      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Timestamp</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Action</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">User Email</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx}>
              <td className="border p-2">{new Date(log.timestamp).toLocaleString()}</td>
              <td className="border p-2">{log.name}</td>
              <td className="border p-2">{log.sku}</td>
              <td className="border p-2">{log.quantity}</td>
              <td className="border p-2">{log.action}</td>
              <td className="border p-2">{log.unit}</td>
              <td className="border p-2">{log.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryActivity;
