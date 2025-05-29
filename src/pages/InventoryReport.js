import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function InventoryReport() {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('unit', user.unit);

    if (!error) setInventory(data);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('unit', user.unit);

    if (!error) {
      setLogs(data);
      buildTrendData(data);
    }
  };

  const buildTrendData = (logs) => {
    const grouped = {};
    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[month]) grouped[month] = { month, checkin: 0, checkout: 0 };

      if (log.action === 'checkin') grouped[month].checkin += Number(log.quantity);
      if (log.action === 'checkout') grouped[month].checkout += Number(log.quantity);
    });

    const trendArray = Object.values(grouped).map((entry) => ({
      ...entry,
      net: entry.checkin - entry.checkout,
    })).sort((a, b) => new Date(`${a.month}-01`) - new Date(`${b.month}-01`));

    setTrendData(trendArray);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">Inventory Report</h1>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Trend Visualization</h2>
        <p className="text-sm text-gray-600 mb-4">✅ Trend Visualization – The chart below shows monthly trends in check-ins, check-outs, and net inventory change.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="checkin" stroke="#4ade80" name="Check-ins" />
            <Line type="monotone" dataKey="checkout" stroke="#f87171" name="Check-outs" />
            <Line type="monotone" dataKey="net" stroke="#60a5fa" name="Net Change" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Inventory Snapshot</h2>
        <table className="w-full border-collapse border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Item</th>
              <th className="border p-2">SKU</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Quantity</th>
              <th className="border p-2">Unit</th>
              <th className="border p-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, i) => (
              <tr key={i}>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2">{item.sku}</td>
                <td className="border p-2">{item.category}</td>
                <td className="border p-2">{item.quantity}</td>
                <td className="border p-2">{item.unit}</td>
                <td className="border p-2">{item.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryReport;
