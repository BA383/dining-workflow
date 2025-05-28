import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function InventoryActivity() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) console.error('❌ Failed to load logs:', error);
    else setLogs(data);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Inventory Activity Log</h1>
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
