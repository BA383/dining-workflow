import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToAdminDashboard from '../BackToAdminDashboard';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

function GeneralReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [totalsByUnit, setTotalsByUnit] = useState({});
  const [topItem, setTopItem] = useState(null);
  const [agingItems, setAgingItems] = useState([]);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAllInventoryInsights();
    }
  }, [isAdmin]);

  const fetchAllInventoryInsights = async () => {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('sku, name, qty_on_hand, unitPrice, reorder_level, dining_unit, updated_at');


    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError.message);
      return;
    }

    

    // Save full inventory
    setInventory(inventoryData);

    // Low Stock Logic
    const low = inventoryData.filter(i => Number(i.qty_on_hand) < Number(i.reorder_level));
    setLowStock(low);

    // Total Value by Unit
    const unitTotals = {};
    inventoryData.forEach(item => {
      const value = (Number(item.qty_on_hand) || 0) * (Number(item.unitPrice) || 0);
      if (!unitTotals[item.dining_unit]) unitTotals[item.dining_unit] = 0;
      unitTotals[item.dining_unit] += value;
    });
    setTotalsByUnit(unitTotals);

    // Chart Logic (Weekly)
    const weeklyBuckets = {};
    inventoryData.forEach(item => {
      const t = new Date(item.updated_at || new Date());
      const week = `${t.getFullYear()}-W${Math.ceil(t.getDate() / 7)}`;
      if (!weeklyBuckets[week]) weeklyBuckets[week] = 0;
      weeklyBuckets[week] += (item.qty_on_hand || 0) * (item.unit_price || 0);
    });
    const labels = Object.keys(weeklyBuckets).sort();
    const values = labels.map(label => weeklyBuckets[label]);
    setChartData({
      labels,
      datasets: [
        {
          label: 'Total Inventory Value (Weekly)',
          data: values,
          fill: false,
          borderColor: '#3b82f6',
          tension: 0.3
        }
      ]
    });

    // Top Item This Month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { data: logs, error: logsError } = await supabase
      .from('inventory_logs')
      .select('sku, name, quantity, dining_unit, timestamp, action')
      .eq('action', 'checkin')
      .gte('timestamp', startOfMonth.toISOString());

    if (!logsError && logs) {
      const map = {};
      logs.forEach(log => {
        const key = `${log.sku}-${log.dining_unit}`;
        if (!map[key]) {
          map[key] = {
            sku: log.sku,
            name: log.name,
            unit: log.dining_unit,
            totalCheckins: 0
          };
        }
        map[key].totalCheckins += parseFloat(log.quantity) || 0;
      });
      const sorted = Object.values(map).sort((a, b) => b.totalCheckins - a.totalCheckins);
      setTopItem(sorted[0] || null);
    }

    // Aging Inventory (no activity in 30+ days)
    const { data: logsAll, error: logsAllError } = await supabase
      .from('inventory_logs')
      .select('sku, timestamp');

    if (!logsAllError && logsAll) {
      const lastSeenMap = {};
      logsAll.forEach(log => {
        const t = new Date(log.timestamp);
        if (!lastSeenMap[log.sku] || lastSeenMap[log.sku] < t) {
          lastSeenMap[log.sku] = t;
        }
      });

      const now = new Date();
      const aging = inventoryData
        .map(item => {
          const lastSeen = lastSeenMap[item.sku];
          const days = lastSeen ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24)) : 'Never';
          return { ...item, daysInactive: days };
        })
        .filter(i => i.daysInactive === 'Never' || i.daysInactive > 30)
        .slice(0, 5);

      setAgingItems(aging);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Director's Report Snapshot</h1>

      {!isAdmin ? (
        <p className="text-red-600">Access Denied: This report is only visible to administrators.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* 💰 Inventory Value by Unit */}
          <div className="bg-white shadow-md rounded p-4 col-span-full">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">💰 Total Inventory Value by Unit</h2>
            <ul className="text-sm text-gray-700">
              {Object.entries(totalsByUnit).map(([unit, value]) => (
                <li key={unit}>
                  <strong>{unit}:</strong> ${value.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>

          {/* 🔻 Low Stock */}
          <div className="bg-white shadow-md rounded p-4 col-span-full">
            <h2 className="text-xl font-semibold mb-2 text-red-600">🔻 Low Stock Alerts</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-green-600">All items above reorder level.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">{lowStock.length} items below reorder threshold:</p>
                <ul className="text-sm text-red-700">
                  {lowStock.slice(0, 5).map((item, idx) => (
                    <li key={idx}>
                      {item.name} ({item.sku}) – Qty: {item.qty_on_hand} / Reorder: {item.reorder_level}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* 🏆 Top Item This Month */}
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">🏆 Top Item This Month</h2>
            {topItem ? (
              <p className="text-sm text-gray-700">
                <strong>{topItem.name}</strong> ({topItem.sku}) in <strong>{topItem.unit}</strong><br />
                Total Check-ins: {topItem.totalCheckins}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No check-in data available yet this month.</p>
            )}
          </div>

          {/* 📉 Aging Inventory */}
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">📉 Aging Inventory</h2>
            {agingItems.length === 0 ? (
              <p className="text-sm text-green-600">All items have recent activity.</p>
            ) : (
              <ul className="text-sm text-gray-700">
                {agingItems.map((item, idx) => (
                  <li key={idx}>
                    {item.name} ({item.sku}) – {item.daysInactive} days inactive
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 📈 Inventory Trend Chart */}
          <div className="bg-white shadow-md rounded p-4 col-span-full">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">📈 Inventory Value Trend (4-Week)</h2>
            {chartData ? (
              <Line data={chartData} />
            ) : (
              <p className="text-sm text-gray-500">Loading trend data...</p>
            )}
          </div>

          {/* 📋 Inventory Snapshot */}
          <div className="bg-white shadow-md rounded p-4 col-span-full">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">📋 Inventory Snapshot</h2>
            <p className="text-sm text-gray-500 mb-3">Live view of current stock levels by unit.</p>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="min-w-full text-sm text-left border">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">SKU</th>
                    <th className="p-2 border text-right">Qty</th>
                    <th className="p-2 border text-right">Unit Price</th>
                    <th className="p-2 border text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 border">{item.dining_unit}</td>
                      <td className="p-2 border">{item.name}</td>
                      <td className="p-2 border">{item.sku}</td>
                      <td className="p-2 border text-right">{item.qty_on_hand}</td>
                      <td className="p-2 border text-right">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="p-2 border text-right">
                        ${(Number(item.qty_on_hand) * Number(item.unit_price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default GeneralReport;
