import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToAdminDashboard from '../BackToAdminDashboard';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { isAdmin } from '../utils/permissions'; // Adjust path if neede
import { getCurrentUser, setRLSContext } from '../utils/userSession';


function GeneralReport() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [totalsByUnit, setTotalsByUnit] = useState({});
  const [topItem, setTopItem] = useState(null);
  const [agingItems, setAgingItems] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [selectedTopicBlock, setSelectedTopicBlock] = useState('inventory');
  const [wasteSummary, setWasteSummary] = useState({});
  const [transferSummary, setTransferSummary] = useState({});
  const [productionSummary, setProductionSummary] = useState({});
  const [ingredientUsage, setIngredientUsage] = useState({});
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [topRecipes, setTopRecipes] = useState([]);


  const isAdminUser = user?.role === 'admin'; // ✅ Safely check after user is initialized

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to 30 days ago
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Today
  });

  
useEffect(() => {
  async function fetchUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');
  }
  fetchUser();
}, []);


// ✅ This useEffect runs once user is set
useEffect(() => {
  const runFetch = async () => {
    if (user?.role === 'admin') {
      await fetchAllInventoryInsights();
    }
  };
  runFetch();
}, [user]);


  const fetchAllInventoryInsights = async () => {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('sku, name, qty_on_hand, unitPrice, reorder_level, dining_unit, updated_at');



// 🍽️ Fetch production logs
const { data: productionLogs } = await supabase
  .from('production_logs')
  .select('recipe_name, servings_prepared, timestamp, dining_unit')
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);


    // 🍳 Fetch all recipes with ingredients
const { data: allRecipes } = await supabase
  .from('recipes')
  .select('name, items'); // `items` = [{ sku, quantity, unit }]
  
  



const { data: wasteLogs } = await supabase
  .from('inventory_logs')
  .select('dining_unit, quantity, timestamp')
  .eq('action', 'waste')
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);


const wasteByUnit = {};

wasteLogs?.forEach(log => {
  if (!wasteByUnit[log.dining_unit]) wasteByUnit[log.dining_unit] = 0;
  wasteByUnit[log.dining_unit] += Number(log.quantity || 0);
});



// 🔐 Restrict access to Admins only
  if (!isAdmin()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Access Denied: Admins only.</p>
      </div>
    );
  }


setWasteSummary(wasteByUnit);


const { data: transferLogs } = await supabase
  .from('inventory_logs')
  .select('dining_unit, target_unit, quantity, timestamp')
  .eq('action', 'transfer')
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);


const transferMap = {};

transferLogs?.forEach(log => {
  const key = `${log.dining_unit} → ${log.target_unit}`;
  if (!transferMap[key]) transferMap[key] = 0;
  transferMap[key] += Number(log.quantity || 0);
});

setTransferSummary(transferMap);
    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError.message);
      return;
    }



    

// 🍳 Enhanced: Build recipe map + production summary + top recipes
const recipeMap = {};
allRecipes?.forEach(r => {
  recipeMap[r.name] = r.items || [];
});

const usageMap = {};
const productionByUnit = {};
const recipeCountMap = {};

productionLogs?.forEach(log => {
  const ingredients = recipeMap[log.recipe_name] || [];

  // Summary of all production logs by unit
  if (!productionByUnit[log.dining_unit]) productionByUnit[log.dining_unit] = [];
  productionByUnit[log.dining_unit].push(log);

  // Ingredient usage tracking
  ingredients.forEach(ing => {
    const totalUsed = (Number(ing.quantity) || 0) * (Number(log.servings_prepared) || 0);

    if (!usageMap[log.dining_unit]) usageMap[log.dining_unit] = {};
    if (!usageMap[log.dining_unit][ing.sku]) usageMap[log.dining_unit][ing.sku] = 0;

    usageMap[log.dining_unit][ing.sku] += totalUsed;
  });

  // Track top recipes by frequency
  const key = `${log.recipe_name}-${log.dining_unit}`;
  if (!recipeCountMap[key]) {
    recipeCountMap[key] = { name: log.recipe_name, unit: log.dining_unit, total: 0 };
  }
  recipeCountMap[key].total += log.servings_prepared;
});

// ✅ Set all 3 summary states
setIngredientUsage(usageMap);
setProductionSummary(productionByUnit);
const sortedTop = Object.values(recipeCountMap).sort((a, b) => b.total - a.total).slice(0, 5);
setTopRecipes(sortedTop);



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
   // Chart Logic (Weekly) — Fixed
const weeklyBuckets = {};

inventoryData.forEach(item => {
  const t = new Date(item.updated_at || new Date());

  // Group by ISO week starting Monday
  const weekStart = new Date(t);
  weekStart.setDate(t.getDate() - t.getDay() + 1); // get Monday of the week
  weekStart.setHours(0, 0, 0, 0);
  const weekKey = weekStart.toISOString().split('T')[0]; // e.g. "2025-06-09"

  if (!weeklyBuckets[weekKey]) weeklyBuckets[weekKey] = 0;
  weeklyBuckets[weekKey] += (Number(item.qty_on_hand) || 0) * (Number(item.unitPrice) || 0); // ✅ fixed unitPrice reference
});

// Sort and prepare data
const sortedWeeks = Object.keys(weeklyBuckets).sort();
const sortedValues = sortedWeeks.map(key => weeklyBuckets[key]);

setChartData({
  labels: sortedWeeks,
  datasets: [
    {
      label: 'Total Inventory Value (Weekly)',
      data: sortedValues,
      fill: false,
      borderColor: '#3b82f6',
      tension: 0.3
    }
  ]
});


    // Top Item This Month (active inventory only)
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

// Get current active SKUs from inventoryData
const activeSKUs = new Set(inventoryData.map(item => item.sku));

const { data: logs, error: logsError } = await supabase
  .from('inventory_logs')
  .select('sku, name, quantity, dining_unit, timestamp, action')
  .eq('action', 'checkin')
  .gte('timestamp', startOfMonth.toISOString());

if (!logsError && logs) {
  const map = {};
  logs.forEach(log => {
    if (!activeSKUs.has(log.sku)) return; // ❌ Skip deleted/inactive items

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
      const days = lastSeen
        ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24))
        : 'Never';
      return { ...item, daysInactive: days };
    })
    .filter(item => item.daysInactive === 'Never' || item.daysInactive > 30); // ✅ Only items inactive > 30 days

  setAgingItems(aging);
}

  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackToAdminDashboard />

      {!isAdmin ? (
        <p className="text-red-600">Access Denied: This report is only visible to administrators.</p>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6 text-blue-900">Director's Report Snapshot</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Date Range Filter */}
            <div className="mb-6">
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                Filter Activity by Date Range:
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="border border-gray-300 rounded p-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="border border-gray-300 rounded p-2 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <button
                  onClick={fetchAllInventoryInsights}
                  className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Focus Area Selector */}
            <div className="mb-6">
              <label htmlFor="topicBlockSelector" className="block text-sm font-medium text-gray-700 mb-1">
                Executive Focus Area:
              </label>
              <select
                id="topicBlockSelector"
                value={selectedTopicBlock}
                onChange={(e) => setSelectedTopicBlock(e.target.value)}
                className="p-2 border border-gray-300 rounded shadow-sm text-sm"
              >
                <option value="inventory">💰 Total Inventory Value by Unit</option>
                <option value="foodCost">📉 Food Cost Analysis</option>
                <option value="waste">🗑️ Waste Management</option>
                <option value="ingredientUsage">🧑‍🍳 Ingredient Usage by Unit</option>
                <option value="topRecipes">🍽️ Top Recipes Produced</option>
                <option value="transfer">🔁 Transfer Report</option>
                <option value="labor">🧍 Labor Cost</option>
                <option value="pnl">📊 Profit & Loss Overview</option>
              </select>
            </div>

            {/* Inventory Value */}
            {selectedTopicBlock === 'inventory' && (
              <div className="bg-white shadow-md rounded p-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">💰 Total Inventory Value by Unit</h2>
                <ul className="text-sm text-gray-700">
                  {Object.entries(totalsByUnit).map(([unit, value]) => (
                    <li key={unit}>
                      <strong>{unit}:</strong> ${value.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Food Cost */}
            {selectedTopicBlock === 'foodCost' && (
  <div className="bg-white shadow-md rounded p-4 col-span-full">
    <h2 className="text-xl font-semibold mb-2 text-gray-700">💰 Food Cost Analysis</h2>
    <p className="text-sm text-gray-500 mb-3">
      Total production cost based on recipe logs within the selected date range.
    </p>
    {Object.keys(productionSummary).length === 0 ? (
      <p className="text-sm text-gray-500">No production activity during this period.</p>
    ) : (
      <ul className="text-sm text-gray-800 space-y-1">
        {Object.entries(productionSummary).map(([unit, logs]) => {
          const totalCost = logs.reduce((sum, log) => sum + (log.total_cost || 0), 0);
          const totalServings = logs.reduce((sum, log) => sum + (log.servings_prepared || 0), 0);
          const costPerServing =
            totalServings > 0 ? (totalCost / totalServings).toFixed(2) : '0.00';
          return (
            <li key={unit}>
              <strong>{unit}:</strong> ${totalCost.toFixed(2)} total cost for {totalServings}{' '}
              servings (≈ ${costPerServing} per serving)
            </li>
          );
        })}
      </ul>
    )}
  </div>
)}

            {/* Waste Summary */}
            {selectedTopicBlock === 'waste' && (
              <div className="bg-white shadow-md rounded p-4 col-span-full">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">🗑️ Waste Summary by Unit</h2>
                {Object.keys(wasteSummary).length === 0 ? (
                  <p className="text-sm text-green-600">No waste activity recorded.</p>
                ) : (
                  <ul className="text-sm text-gray-800">
                    {Object.entries(wasteSummary).map(([unit, qty]) => (
                      <li key={unit}><strong>{unit}</strong>: {qty} items wasted</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Ingredient Usage */}
            {selectedTopicBlock === 'ingredientUsage' && (
              <div className="bg-white shadow-md rounded p-4 col-span-full">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">🧑‍🍳 Ingredient Usage by Unit</h2>
                {Object.keys(ingredientUsage).length === 0 ? (
                  <p className="text-sm text-gray-500">No ingredient usage recorded for this period.</p>
                ) : (
                  Object.entries(ingredientUsage).map(([unit, skuMap]) => (
                    <div key={unit} className="mb-3">
                      <h3 className="text-md font-bold text-blue-700">{unit}</h3>
                      <ul className="text-sm text-gray-800">
                        {Object.entries(skuMap).map(([sku, qty]) => (
                          <li key={sku}>
                            <strong>{sku}</strong>: {qty.toFixed(2)} units used
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}


                          {selectedTopicBlock === 'topRecipes' && (
  <div className="col-span-full bg-white shadow-md rounded p-4">
    <h2 className="text-xl font-semibold mb-2 text-gray-700">🍽️ Most Produced Recipes</h2>
    {topRecipes.length === 0 ? (
      <p className="text-sm text-gray-500">No production data for selected range.</p>
    ) : (
      <ul className="text-sm text-gray-700">
        {topRecipes.map((r, idx) => (
          <li key={idx}><strong>{r.name}</strong> — {r.total} servings in {r.unit}</li>
        ))}
      </ul>
    )}
  </div>
)}


            {/* Transfers */}
            {selectedTopicBlock === 'transfer' && (
              <div className="bg-white shadow-md rounded p-4 col-span-full">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">🔁 Transfers Between Units</h2>
                {Object.keys(transferSummary).length === 0 ? (
                  <p className="text-sm text-gray-500">No transfers logged yet.</p>
                ) : (
                  <ul className="text-sm text-gray-800">
                    {Object.entries(transferSummary).map(([route, qty]) => (
                      <li key={route}><strong>{route}</strong>: {qty} items transferred</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Labor */}
            {selectedTopicBlock === 'labor' && (
              <div className="bg-white shadow-md rounded p-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">🧍 Labor Cost</h2>
                <p className="text-sm text-gray-500">Compares labor hours/wages against sales by unit.</p>
                <p className="mt-2 text-blue-600">[Placeholder for Labor vs Sales Comparison]</p>
              </div>
            )}

            {/* Profit & Loss */}
            {selectedTopicBlock === 'pnl' && (
              <div className="col-span-full bg-white shadow-md rounded p-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-700">📊 Profit & Loss Overview</h2>
                <p className="text-sm text-gray-500">Overall summary of revenues, costs, and net profit across operations.</p>
                <p className="mt-2 text-blue-600">[Placeholder for P&L Breakdown and Trend Graph]</p>
              </div>
            )}

            {/* Low Stock Alerts */}
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
                        {item.name} ({item.sku}) in <strong>{item.dining_unit}</strong> – Qty: {item.qty_on_hand} / Reorder: {item.reorder_level}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Top Item */}
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

            {/* Aging Inventory */}
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

            {/* Trend Chart */}
            <div className="bg-white shadow-md rounded p-4 col-span-full">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">📈 Inventory Value Trend (4-Week)</h2>
              {chartData ? (
                <Line data={chartData} />
              ) : (
                <p className="text-sm text-gray-500">Loading trend data...</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GeneralReport;