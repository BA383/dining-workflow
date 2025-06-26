// ProductionInsights.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ProductionInsights() {
  const [logs, setLogs] = useState([]);
  const [frequencyMap, setFrequencyMap] = useState({});
  const [topIngredients, setTopIngredients] = useState([]);
  const [productionSummary, setProductionSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('production_logs').select('*');

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

    // Batch fetch all recipes at once
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
          {/* 🔸 Section: Recent Log Table */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Recent Production Logs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Recipe</th>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border">Servings</th>
                    <th className="p-2 border">Total Cost</th>
                    <th className="p-2 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(-10).map((log, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 border">{log.recipe_name}</td>
                      <td className="p-2 border">{log.dining_unit}</td>
                      <td className="p-2 border">{log.servings_prepared}</td>
                      <td className="p-2 border">{formatCurrency(log.total_cost)}</td>
                      <td className="p-2 border">{new Date(log.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 🔹 Section: Summary by Dining Unit */}
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

          {/* 🔸 Section: Top Ingredients by Frequency */}
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
