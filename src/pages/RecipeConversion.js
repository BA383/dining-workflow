import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed

function RecipeConversion() {
if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Inventory is for Dining staff only.</p>
      </div>
    );
  }


  const unitOptions = ['ea', 'case', 'lbs', 'gallons', 'box', 'can', 'pack', 'tray'];
  const [inventoryItems, setInventoryItems] = useState([]);
  const [newRecipe, setNewRecipe] = useState({ name: '', yield: 0, items: [] });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickItem, setQuickItem] = useState({ sku: '', name: '', unit: '', quantity: 1 });

  useEffect(() => {
    fetchInventoryItems();
  }, []);

const fetchInventoryItems = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: user.unit
  });

  await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: user.role
  });

  let query = supabase.from('inventory').select('sku, name, unit');

  if (user.role !== 'admin') {
    query = query.eq('dining_unit', user.unit);
  }

  const { data, error } = await query;

  if (data) {
    setInventoryItems(data);
    console.log('✅ Inventory items loaded:', data);
    if (data.length === 0) {
      alert('⚠️ No inventory found for your unit. Please register items first.');
    }
  }

  if (error) {
    console.error('Inventory fetch error:', error.message);
  }
};



  const addIngredient = () => {
    setNewRecipe(prev => ({
      ...prev,
      items: [...prev.items, { sku: '', quantity: 0, unit: '' }]
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...newRecipe.items];
    updated[index][field] = value;
    setNewRecipe(prev => ({ ...prev, items: updated }));
  };

 const saveRecipe = async () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ Step 1: Get valid Supabase session
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No Supabase session found');
    alert('No valid session — please log in again.');
    return;
  }

  // ✅ Step 2: Set request.unit and request.role
const [{ error: unitError }, { error: roleError }] = await Promise.all([
  supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: user.unit,
    is_local: false
  }),
  supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: user.role,
    is_local: false
  })
]);

  if (unitError || roleError) {
    console.error('❌ Failed to set request context:', {
      unitError: unitError?.message,
      roleError: roleError?.message
    });
    alert(`Unable to set request context — insert blocked.\nUnit: ${unitError?.message || 'OK'}\nRole: ${roleError?.message || 'OK'}`);
    return;
  }

  // ✅ Step 3: Validate form
  if (!newRecipe.name || newRecipe.yield <= 0 || newRecipe.items.length === 0) {
    alert('Please complete all fields and add at least one ingredient.');
    return;
  }

  const hasValidSKU = newRecipe.items.every(i => i.sku && i.quantity > 0);
  if (!hasValidSKU) {
    alert('Each ingredient must have a SKU and a quantity greater than 0.');
    return;
  }

  // ✅ Step 4: Insert recipe
  const payload = {
    name: newRecipe.name.trim(),
    yield: Number(newRecipe.yield),
    items: newRecipe.items,
    dining_unit: user.unit,
    created_by: user.email,
    created_at: new Date().toISOString()
  };

  console.log('🔍 Submitting recipe payload:', payload);

  const { error } = await supabase.from('recipes').insert([payload]);

  if (error) {
    console.error('❌ Insert failed:', error);
    alert(`❌ Failed to save recipe: ${error.message}`);
  } else {
    alert('✅ Recipe saved!');
    setNewRecipe({ name: '', yield: 0, items: [] });
  }
};


  const handleQuickAdd = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const newItem = {
      sku: quickItem.sku.trim(),
      name: quickItem.name.trim(),
      unit: quickItem.unit.trim(),
      qty_on_hand: Number(quickItem.quantity || 1),
      dining_unit: user.unit,
      user_email: user.email,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('inventory').insert([newItem]);
    if (error) {
      alert('Failed to add test item');
      console.error(error);
    } else {
      alert('✅ Test item added!');
      setShowQuickAdd(false);
      setQuickItem({ sku: '', name: '', unit: '', quantity: 1 });
      fetchInventoryItems();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToInventoryDashboard />
      <h2 className="text-2xl font-bold mb-4">Recipe Conversion</h2>

      <input
        type="text"
        className="border p-2 rounded w-full mb-3"
        placeholder="Recipe Name"
        value={newRecipe.name}
        onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
      />

      <input
        type="number"
        className="border p-2 rounded w-full mb-4"
        placeholder="Yield (servings)"
        value={newRecipe.yield}
        onChange={(e) => setNewRecipe({ ...newRecipe, yield: Number(e.target.value) })}
      />

      <h3 className="font-semibold mb-2">Ingredients</h3>
      {newRecipe.items.map((item, i) => (
<div key={i} className="flex gap-2 mb-2">
  {/* SKU Dropdown */}
  <select
  className="border p-2 rounded w-1/2"
  value={item.sku}
  onChange={(e) => handleIngredientChange(i, 'sku', e.target.value)}
>
  <option value="">Select SKU</option>
  {inventoryItems.map(inv => (
    <option key={inv.sku} value={inv.sku}>
      {inv.name} ({inv.sku})
    </option>
  ))}
</select>


  {/* Quantity Input */}
  <input
    type="number"
    className="border p-2 rounded w-1/6"
    placeholder="Qty"
    value={item.quantity}
    onChange={(e) => handleIngredientChange(i, 'quantity', Number(e.target.value))}
  />


  {/* Unit Dropdown */}
  <select
    className="border p-2 rounded w-1/4"
    value={item.unit}
    onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
  >
    <option value="">Unit</option>
    {unitOptions.map(unit => (
      <option key={unit} value={unit}>{unit}</option>
    ))}
  </select>
</div>
      ))}

      <button
        className="bg-gray-200 text-sm px-3 py-1 rounded border border-gray-400 mb-4"
        onClick={addIngredient}
      >
        + Add Ingredient
      </button>

      <div className="mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow mr-2"
          onClick={saveRecipe}
        >
          Save Recipe
        </button>

<button
  className="bg-red-500 text-white px-4 py-2 rounded shadow"
  onClick={() => setNewRecipe({ name: '', yield: 0, items: [] })}
>
  Clear Fields
</button>

      </div>

      {showQuickAdd && (
        <div className="border rounded p-4 bg-gray-50 mb-6">
          <h3 className="text-md font-bold mb-2">Quick Add Inventory Item</h3>
          <input
            className="border p-2 rounded w-full mb-2"
            placeholder="SKU"
            value={quickItem.sku}
            onChange={(e) => setQuickItem({ ...quickItem, sku: e.target.value })}
          />
          <input
            className="border p-2 rounded w-full mb-2"
            placeholder="Item Name"
            value={quickItem.name}
            onChange={(e) => setQuickItem({ ...quickItem, name: e.target.value })}
          />
          <input
            className="border p-2 rounded w-full mb-2"
            placeholder="Unit (e.g., lb, gal)"
            value={quickItem.unit}
            onChange={(e) => setQuickItem({ ...quickItem, unit: e.target.value })}
          />
          <input
            type="number"
            className="border p-2 rounded w-full mb-2"
            placeholder="Quantity"
            value={quickItem.quantity}
            onChange={(e) => setQuickItem({ ...quickItem, quantity: Number(e.target.value) })}
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded shadow"
            onClick={handleQuickAdd}
          >
            Save to Inventory
          </button>
        </div>
      )}

      <div className="mt-6">
        <Link to="/view-recipes" className="p-4 bg-white shadow rounded hover:bg-gray-100 flex items-center gap-3">
          <ClipboardList className="text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold">View Recipes</h2>
            <p className="text-sm text-gray-600">Browse, edit, or print saved recipes</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default RecipeConversion;
