import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { getCurrentUser, setRLSContext } from '../utils/userSession';
import { captureEndingSnapshot } from '../utils/captureInventorySnapshot';

const monthNames = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const getAvailableMonths = () => {
  const today = new Date();
  const currentMonthIndex = today.getMonth();
  const currentYear = today.getFullYear();

  return monthNames.slice(0, currentMonthIndex + 1).map((month, index) => ({
    month,
    year: currentYear
  }));
};

export default function RunEOMInventory() {
  const [user, setUser] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('Regattas');
  const [expandedYears, setExpandedYears] = useState({});
  const [inventoryPreview, setInventoryPreview] = useState([]);
  const [snapshotResult, setSnapshotResult] = useState(null);

  // === EOM purchases state (Regattas current month) ===
  const [purchases, setPurchases] = useState(0);

  const UNIT_OPTIONS = ['Regattas', 'Commons', 'Discovery', 'Palette', 'Einstein'];

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      await setRLSContext(currentUser.unit, currentUser.role);

      const defaultUnit = currentUser.role === 'admin'
        ? 'Regattas'
        : currentUser.unit;

      setUser(currentUser);
      setSelectedUnit(defaultUnit);
    }

    init();
  }, []);

  useEffect(() => {
    if (selectedUnit && user) {
      fetchReportData();
    }
  }, [selectedUnit, user]);

  useEffect(() => {
    // Clear snapshot display when switching units
    setSnapshotResult(null);
  }, [selectedUnit]);

  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('sku, name, qty_on_hand, unitPrice')
        .eq('dining_unit', selectedUnit);

      if (!error) {
        setInventoryPreview(data || []);
      } else {
        console.error("⚠️ Error fetching inventory:", error.message);
        setInventoryPreview([]);
      }
    };

    fetchInventory();
  }, [selectedUnit]);

  // === EOM purchases fetch (current month, Regattas only) ===
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) return;

      // This view is for Regattas only; ignore other units
      if (selectedUnit !== 'Regattas') {
        if (!cancelled) setPurchases(0);
        return;
      }

      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString().slice(0, 10); // 'YYYY-MM-01'

      const { data, error } = await supabase
        .from('v_regattas_eom_purchases')
        .select('purchases')
        .eq('month', monthStart)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error('EOM purchases fetch error:', error.message);
          setPurchases(0);
        } else {
          setPurchases(Number(data?.purchases ?? 0));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedUnit, user]);

  const fetchInventoryPreview = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('sku, name, qty_on_hand, unitPrice')
      .eq('dining_unit', selectedUnit);

    if (!error) {
      setInventoryPreview(data || []);
    } else {
      console.error("⚠️ Error fetching inventory:", error.message);
      setInventoryPreview([]);
    }
  };

  const handleSnapshotCapture = async () => {
    const result = await captureEndingSnapshot(selectedUnit);
    setSnapshotResult(result);        // ✅ show the snapshot confirmation
    alert(result.message);            // ✅ optional feedback

    await fetchReportData();          // 🔧 wait for data to load before UI updates
  };



 
  const fetchReportData = async () => {
  setLoading(true);
  try {
    const monthlyData = [];
    const months = getAvailableMonths();

    for (const { month, year } of months) {
      const [beginRes, endRes, invoiceRes, wasteRes, platesRes, inventoryRes] = await Promise.all([
  supabase.from('inventory_snapshots')
    .select('*')
    .eq('month', month).eq('year', year)
    .eq('type', 'beginning')
    .eq('dining_unit', selectedUnit)

    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(),

  supabase.from('inventory_snapshots')
    .select('*')
    .eq('month', month).eq('year', year)
    .eq('type', 'ending')
    .eq('unit', selectedUnit)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(),

  supabase.from('invoices')
    .select('invoice_amount, vendor_name')
    .eq('month', month)
    .eq('year', year)
    .eq('unit', selectedUnit),

  supabase.from('inventory_logs')
    .select('sku, quantity') // ✅ pull sku and quantity
    .eq('action', 'waste')
    .eq('month', month)
    .eq('year', year)
    .eq('unit', selectedUnit),

  supabase.from('group_entry_logs')
    .select('plates_served')
    .eq('month', month)
    .eq('year', year)
    .eq('unit', selectedUnit)
    .single(),

  supabase.from('inventory')  // ✅ get sku + unit price
    .select('sku, unitPrice')
    .eq('dining_unit', selectedUnit)
]);


// ✅ Compute waste in dollars using unit prices
const unitPriceMap = (inventoryRes?.data || []).reduce((acc, item) => {
  acc[item.sku] = item.unitPrice || 0;
  return acc;
}, {});

const waste = (wasteRes?.data || []).reduce((sum, w) => {
  const price = unitPriceMap[w.sku] || 0;
  return sum + (w.quantity * price);
}, 0);

// ✅ Continue with COGS calculation
const beginning_inventory = beginRes?.data?.amount || 0;
const ending_inventory = endRes?.data?.amount || 0;

const filteredInvoices = invoiceRes?.data?.filter(inv =>
  !inv.vendor_name?.toLowerCase().includes('temp')
) || [];

const purchases = filteredInvoices.reduce((sum, inv) => sum + (inv.invoice_amount || 0), 0);
const plates_served = platesRes?.data?.plates_served || 0;

const cogs = beginning_inventory + purchases - waste - ending_inventory;
const plate_cost = plates_served > 0 ? (cogs / plates_served) : 0;

const totalWasteUnits = (wasteRes?.data || []).reduce((sum, w) => sum + (w.quantity || 0), 0);



   monthlyData.push({
  year,
  month,
  beginning_inventory,
  purchases,
  waste,              // dollar value
  waste_units: totalWasteUnits,  // <-- 👈 add this
  ending_inventory,
  plates_served,
  cogs,
  plate_cost,
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
    if (user) {
      fetchReportData();
      fetchInventoryPreview();
    }
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
            {expandedYears[year] ? '▾' : '▸'} {year} Summary for {selectedUnit}
          </button>

          {user?.role === 'admin' && (
            <div className="mb-6">
              <button
                onClick={handleSnapshotCapture}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📸 Capture Selected Unit EOM Inventory Snapshot
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Only click at month-end to record inventory on hand for {selectedUnit}.
              </p>
            </div>
          )}

          {snapshotResult && (
            <div className="bg-green-100 text-green-800 p-3 mt-4 rounded shadow">
              <p>
                ✅ Ending snapshot captured for <strong>{selectedUnit}</strong> — <strong>{snapshotResult.month} {snapshotResult.year}</strong>
              </p>
              {(() => {
                const today = new Date();
                const isEndOfMonth = today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                return (
                  <p>
                    {isEndOfMonth
                      ? <>Total Inventory Value: <strong>${snapshotResult.amount.toFixed(2)}</strong></>
                      : <>Running Total Inventory Value: <strong>${snapshotResult.amount.toFixed(2)}</strong> <span className="text-xs italic text-gray-600">(snapshot taken before month-end)</span></>}
                  </p>
                );
              })()}
            </div>
          )}

          {expandedYears[year] && (
            <table className="w-full text-sm border border-collapse mt-6">
             <thead className="bg-gray-100">
  <tr>
    <th className="border p-2">Month</th>
    <th className="border p-2">Beginning Inventory</th>
    <th className="border p-2">Purchases</th>
    <th className="border p-2">Waste (Units)</th>         {/* NEW */}
    <th className="border p-2">Waste (Dollars)</th>       {/* UPDATED LABEL */}
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
      <td className="border p-2">{row.waste_units}</td>                    {/* NEW */}
      <td className="border p-2">${row.waste.toFixed(2)}</td>             {/* DOLLARS */}
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
