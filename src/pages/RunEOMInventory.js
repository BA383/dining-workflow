import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { getCurrentUser, setRLSContext } from '../utils/userSession';

export default function RunEOMInventory() {
  const [user, setUser] = useState(null); // ✅ define user and setUser
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('Regattas');
  const [expandedYears, setExpandedYears] = useState({});

  const UNIT_OPTIONS = ['Regattas', 'Commons', 'Discovery', 'Palette', 'Einstein'];

  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];



useEffect(() => {
  async function init() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    await setRLSContext(currentUser.unit, currentUser.role); // ✅

    setUser(currentUser);             // ✅ Store for UI logic
    setSelectedUnit(currentUser.unit); // ✅ Default selection
  }

  init();
}, []);



  const getAvailableMonths = () => {
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentYear = today.getFullYear();
    return monthNames.slice(0, currentMonthIndex).map((month, index) => ({
      month,
      year: currentYear
    }));
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const monthlyData = [];
      const months = getAvailableMonths();

      for (const { month, year } of months) {
        const [beginRes, endRes, purchaseRes, wasteRes, platesRes] = await Promise.all([
          supabase.from('inventory_snapshots').select('*').eq('month', month).eq('year', year).eq('type', 'beginning').eq('unit', selectedUnit).single(),
          supabase.from('inventory_snapshots').select('*').eq('month', month).eq('year', year).eq('type', 'ending').eq('unit', selectedUnit).single(),
          supabase.from('purchases_log').select('amount').eq('month', month).eq('year', year).eq('unit', selectedUnit),
          supabase.from('waste_logs').select('amount').eq('month', month).eq('year', year).eq('unit', selectedUnit),
          supabase.from('group_entry_logs').select('plates_served').eq('month', month).eq('year', year).eq('unit', selectedUnit).single(),
        ]);

        const beginning_inventory = beginRes.data?.amount || 0;
        const ending_inventory = endRes.data?.amount || 0;
        const purchases = purchaseRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const waste = wasteRes.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
        const plates_served = platesRes.data?.plates_served || 0;

        const cogs = beginning_inventory + purchases - waste - ending_inventory;
        const plate_cost = plates_served > 0 ? (cogs / plates_served) : 0;

        monthlyData.push({
          year,
          month,
          beginning_inventory,
          purchases,
          waste,
          ending_inventory,
          plates_served,
          cogs,
          plate_cost
        });
      }

      setReportData(monthlyData);
    } catch (err) {
      console.error('Error generating EOM report:', err);
      setError('Failed to generate report.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedUnit]);

  const groupedByYear = reportData.reduce((acc, row) => {
    if (!acc[row.year]) acc[row.year] = [];
    acc[row.year].push(row);
    return acc;
  }, {});

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackToInventoryDashboard />
      <h1 className="text-2xl font-bold text-popupBlue mb-4">📊 End-of-Month Report</h1>

      <div className="mb-4">
        <label className="font-medium mr-2">Select Unit:</label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="border p-2 rounded"
        >
          {UNIT_OPTIONS.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-600">Loading report...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && Object.entries(groupedByYear).map(([year, months]) => (
        <div key={year} className="mb-6">
          <button
            onClick={() => toggleYear(year)}
            className="text-left font-semibold text-lg text-blue-800 mb-2"
          >
            {expandedYears[year] ? '▾' : '▸'} {year} Summary
          </button>

            {user?.role === 'admin' && (
  <select
    value={selectedUnit}
    onChange={(e) => setSelectedUnit(e.target.value)}
    className="border p-2 rounded"
  >
    {UNIT_OPTIONS.map(unit => (
      <option key={unit} value={unit}>{unit}</option>
    ))}
  </select>
)}



          {expandedYears[year] && (
            <table className="w-full text-sm border border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Month</th>
                  <th className="border p-2">Beginning Inventory</th>
                  <th className="border p-2">Purchases</th>
                  <th className="border p-2">Waste</th>
                  <th className="border p-2">Ending Inventory</th>
                  <th className="border p-2">Plates Served</th>
                  <th className="border p-2">COGS</th>
                  <th className="border p-2">Plate Cost</th>
                </tr>
              </thead>
              <tbody>
                {months.map((row) => (
                  <tr key={row.month}>
                    <td className="border p-2 font-semibold">{row.month}</td>
                    <td className="border p-2">${row.beginning_inventory.toFixed(2)}</td>
                    <td className="border p-2">${row.purchases.toFixed(2)}</td>
                    <td className="border p-2">${row.waste.toFixed(2)}</td>
                    <td className="border p-2">${row.ending_inventory.toFixed(2)}</td>
                    <td className="border p-2">{row.plates_served}</td>
                    <td className="border p-2 font-semibold text-blue-800">${row.cogs.toFixed(2)}</td>
                    <td className="border p-2 font-semibold text-green-700">${row.plate_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
