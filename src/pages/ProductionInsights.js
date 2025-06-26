import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrentUser } from '../utils/userSession';

function ProductionInsights() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [frequencyMap, setFrequencyMap] = useState({});
  const [topIngredients, setTopIngredients] = useState([]);
  const [productionSummary, setProductionSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(logs.length / pageSize);
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('⚠️ No current user found');
        return;
      }

      setUser(currentUser);

if (currentUser.role !== 'admin') {
  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: currentUser.unit
  });

  await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: currentUser.role
  });
}

fetchLogs(currentUser);

    }

    init();
  }, []);

  const fetchLogs = async (user) => {
    let query = supabase.from('production_logs').select('*');

    if (user.role !== 'admin') {
      query = query.eq('dining_unit', user.unit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Failed to fetch logs:', error.message);
      return;
    }

    setLogs(data);
    summarizeProduction(data);
    aggregateIngredients(data);
    setLoading(false);
  };

  const summarizeProduction = (logs) => {
    const summary = {};
    logs.forEach(log => {
      if (!summary[log.dining_unit]) {
        summary[log.dining_unit] = {
          recipes: 0,
          totalCost: 0,
          totalServings: 0
        };
      }
      summary[log.dining_unit].recipes += 1;
      summary[log.dining_unit].totalCost += Number(log.total_cost || 0);
      summary[log.dining_unit].totalServings += Number(log.servings_prepared || 0);
    });
    setProductionSummary(summary);
  };

  const aggregateIngredients = async (logs) => {
    const ingredientMap = {};
    const recipeNames = [...new Set(logs.map(l => l.recipe_name))];

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('name, items')
      .in('name', recipeNames);

    if (error) {
      console.error('❌ Error fetching recipes:', error.message);
      return;
    }

    logs.forEach(log => {
      const recipe = recipes.find(r => r.name === log.recipe_name);
      (recipe?.items || []).forEach((item) => {
        ingredientMap[item.sku] = (ingredientMap[item.sku] || 0) + 1;
      });
    });

    setFrequencyMap(ingredientMap);
    const sorted = Object.entries(ingredientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    setTopIngredients(sorted);
  };

  const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackToInventoryDashboard />
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Production Insights Dashboard</h2>

      {loading ? (
        <p>Loading insights...</p>
      ) : (
        <>
          {/* 🔸 Recent Logs */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Recent Production Logs</h3>
            <div className="overflow-x-auto">

              <div className="flex justify-between items-center mb-2">
                <div>
                  <label className="mr-2 text-sm font-medium">Rows per page:</label>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="border p-1 rounded text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={logs.length}>All</option>
                  </select>
                </div>

                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 bg-gray-200 rounded text-sm"
                  >
                    Prev
                  </button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 bg-gray-200 rounded text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>

              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Recipe</th>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border">Servings</th>
                    <th className="p-2 border">Total Cost</th>
                    <th className="p-2 border">Cost/Serving</th>
                    <th className="p-2 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 border">{log.recipe_name}</td>
                      <td className="p-2 border">{log.dining_unit}</td>
                      <td className="p-2 border">{log.servings_prepared}</td>
                      <td className="p-2 border">{formatCurrency(log.total_cost)}</td>
                      <td className="p-2 border">
                        {formatCurrency(
                          log.total_cost && log.servings_prepared
                            ? log.total_cost / log.servings_prepared
                            : 0
                        )}
                      </td>
                      <td className="p-2 border">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 🔹 Summary by Unit */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Production Summary by Unit</h3>
            <ul className="list-disc ml-6 text-sm text-gray-800">
              {Object.entries(productionSummary).map(([unit, summary]) => (
                <li key={unit}>
                  <strong>{unit}:</strong> {summary.recipes} logs — {summary.totalServings} servings — {formatCurrency(summary.totalCost)}
                </li>
              ))}
            </ul>
          </section>

          {/* 🔸 Ingredient Frequency */}
          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-4">Top Ingredients by Frequency in Recipes</h3>
            <div className="bg-white p-4 rounded shadow">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topIngredients.map(([sku, count]) => ({ sku, count }))}>
                  <XAxis dataKey="sku" angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ProductionInsights;
