import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed
import { getCurrentUser, setRLSContext } from '../utils/userSession';

function MenuProduction() {
  const [recipes, setRecipes] = useState([]);
  const [productionPlan, setProductionPlan] = useState([]);
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  


  useEffect(() => {
  async function init() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');

    // ✅ Set RLS context BEFORE fetching recipes
    await supabase.rpc('set_config', {
      config_key: 'request.unit',
      config_value: currentUser.unit
    });

    await supabase.rpc('set_config', {
      config_key: 'request.role',
      config_value: currentUser.role
    });

    // ✅ Then fetch recipes
    fetchRecipes(currentUser.unit, currentUser.role);
  }

  init();
}, []);


if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Inventory is for Dining staff only.</p>
      </div>
    );
  }
  
  const fetchRecipes = async (unit, role) => {
  let query = supabase.from('recipes').select('*');

  if (role !== 'admin') {
    query = query.eq('dining_unit', unit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching recipes:', error.message);
  } else {
    setRecipes(data);
  }
};



  const addToPlan = (recipe) => {
    setProductionPlan([...productionPlan, { ...recipe, multiplier: 1 }]);
  };

  const updateMultiplier = (index, value) => {
    const updated = [...productionPlan];
    updated[index].multiplier = value;
    setProductionPlan(updated);
  };

  const handleSubmitProduction = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    await supabase.rpc('set_config', {
  config_key: 'request.unit',
  config_value: user.unit
});

await supabase.rpc('set_config', {
  config_key: 'request.role',
  config_value: user.role
});


    const logs = productionPlan.map(item => ({
      recipe_name: item.name,
      servings_prepared: item.multiplier * item.yield,
      dining_unit: selectedUnit,
      timestamp: new Date().toISOString(),
    }));

    
    console.log('🔍 Production logs payload:', logs);

    const { error: logError } = await supabase.from('production_logs').insert(logs);

    if (logError) {
      console.error('❌ Failed to log production:', logError.message);
      alert('Production log failed.');
      return;
    }

    // Deduct ingredients from inventory
    for (const item of productionPlan) {
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('items')
        .eq('name', item.name)
        .single();

      const ingredients = recipeData?.items || [];

      for (const ing of ingredients) {
        const usedQty = ing.quantity * item.multiplier;

        // Fetch current qty first
        const { data: existingItem, error: fetchError } = await supabase
          .from('inventory')
          .select('qty_on_hand')
          .eq('sku', ing.sku)
          .eq('dining_unit', user.unit)
          .single();

        if (fetchError || !existingItem) {
          console.error(`❌ Could not fetch inventory for ${ing.sku}`);
          continue;
        }

        const newQty = (existingItem.qty_on_hand || 0) - usedQty;

        const { error: updateError } = await supabase
          .from('inventory')
          .update({ qty_on_hand: newQty })
          .eq('sku', ing.sku)
          .eq('dining_unit', user.unit);

        if (updateError) {
          console.error(`❌ Failed to deduct ${ing.sku}`, updateError.message);
        }
      }
    }

    alert('✅ Production logged and inventory updated!');
    setProductionPlan([]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackToInventoryDashboard />
      <h2 className="text-2xl font-bold mb-4">Menu Production Planner</h2>

      {user?.role === 'admin' && (
  <div className="mb-4">
    <label className="font-semibold mr-2">Select Unit:</label>
    <select
      value={selectedUnit}
      onChange={(e) => setSelectedUnit(e.target.value)}
      className="border rounded p-2"
    >
      <option value="">-- Select --</option>
      <option value="Discovery">Discovery</option>
      <option value="Regattas">Regattas</option>
      <option value="Commons">Commons</option>
      <option value="Palette">Palette</option>
      <option value="Einstein">Einstein</option>
    </select>
  </div>
)}



      <h3 className="text-lg font-semibold mb-2">Available Recipes</h3>
      <ul className="mb-6">
        {recipes.map((r, i) => (
          <li key={i} className="mb-1">
            <button className="text-blue-600 underline" onClick={() => addToPlan(r)}>
              + {r.name} ({r.yield} servings)
            </button>
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold mb-2">Production Plan</h3>
      {productionPlan.map((r, i) => (
        <div key={i} className="mb-3">
          <p><strong>{r.name}</strong></p>
          <label className="text-sm">Multiplier:</label>
          <input
            className="border px-2 py-1 rounded ml-2 w-20"
            type="number"
            value={r.multiplier}
            onChange={(e) => updateMultiplier(i, Number(e.target.value))}
          />
          <p className="text-xs text-gray-500 mt-1">Planned Servings: {r.multiplier * r.yield}</p>
        </div>
      ))}

      <button
        className="bg-green-600 text-white px-4 py-2 rounded shadow mt-4"
        onClick={handleSubmitProduction}
      >
        Log Production
      </button>
    </div>
  );
}

export default MenuProduction;
