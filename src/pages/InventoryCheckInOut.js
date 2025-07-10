import React, { useState, useEffect, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions';
import { getCurrentUser, setRLSContext } from '../utils/userSession';



function InventoryCheckInOut() {
  const [action, setAction] = useState('checkin');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    targetUnit: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  const [targetUnit, setTargetUnit] = useState('');


  const adminUser = user.role === 'admin';

  // ✅ This should NOT be inside fetchInventory
 useEffect(() => {
  async function fetchUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');
  }
  fetchUser();
}, []);


  const fetchInventory = useCallback(async () => {

  let query = supabase.from('inventory').select('*');

  if (user.role !== 'admin') {
    query = query.eq('dining_unit', user.unit);
  } else if (selectedUnit) {
    query = query.eq('dining_unit', selectedUnit);
  }

  const { data, error } = await query;
  if (!error) setItems(data);
  else console.error('Error fetching inventory:', error.message);
}, [user.unit, user.role, selectedUnit]);


  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);


  const handleScan = useCallback(async (barcode) => {
  const unitToQuery = (user.role === 'admin' ? selectedUnit : user.unit || '').trim();

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('sku', barcode)
    .eq('dining_unit', unitToQuery);

  if (error || !data || data.length === 0) {
    setFeedback('❌ Error occurred, item is not registered to dining unit or not filtered.');
    return;
  }

  if (data.length > 1) {
    setFeedback('⚠️ This SKU is registered under multiple entries. Please ensure each SKU is uniquely assigned per unit.');
    return;
  }

if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Access Denied: Only Dining or Admin users can access this page.</p>
      </div>
    );
  }


  const item = data[0];

  setForm(prev => {
  if (prev.sku === barcode) {
    // Increment if it's the same item
    return {
      ...prev,
      quantity: Number(prev.quantity || 0) + 1
    };
  } else {
    // First scan of a new item
    return {
      sku: barcode,
      name: item.name,
      quantity: 1
    };
  }
});


  setFeedback('');
}, [selectedUnit, user.unit]);


  useEffect(() => {
  const fetchLog = async () => {
    let query = supabase.from('inventory_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (user.role !== 'admin') {
      query = query.eq('dining_unit', user.unit);
    } else if (selectedUnit) {
      query = query.eq('dining_unit', selectedUnit);
    }

    const { data, error } = await query;
    if (!error) setActivityLog(data);
  };

  fetchLog();
}, [user.unit, user.role, selectedUnit]);





  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'quantity' ? Math.max(1, Number(value)) : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const unitToQuery = (user.role === 'admin' ? selectedUnit : user.unit || '').trim();

  if (!unitToQuery || !form.sku || !form.quantity) return;

  let delta = 0;
  if (action === 'checkin') delta = parseInt(form.quantity);
  else if (action === 'checkout' || action === 'waste' || action === 'transfer') delta = -parseInt(form.quantity);

  if (action === 'transfer' && !form.targetUnit) {
    alert('❌ Please select a target unit for transfer.');
    return;
  }

  // Step 1: Update sending unit
  const { data: existingItem, error: fetchError } = await supabase
    .from('inventory')
    .select('qty_on_hand')
    .eq('sku', form.sku)
    .eq('dining_unit', unitToQuery)
    .single();

  if (fetchError || !existingItem) {
    alert('❌ Item not found or fetch failed.');
    return;
  }

  const newQty = (existingItem.qty_on_hand || 0) + delta;

  const { error: updateError } = await supabase
    .from('inventory')
    .update({
      qty_on_hand: newQty,
      updated_at: new Date().toISOString(),
    })
    .eq('sku', form.sku)
    .eq('dining_unit', unitToQuery);

  if (updateError) {
    console.error('Error updating qty_on_hand:', updateError.message);
  }

  // Step 2: Handle receiver update if it's a transfer
  if (action === 'transfer' && form.targetUnit) {
    const { data: targetItem, error: targetError } = await supabase
      .from('inventory')
      .select('*')
      .eq('sku', form.sku)
      .eq('dining_unit', form.targetUnit)
      .single();

    if (targetItem) {
      // ✅ Update qty_on_hand in target unit
      const updatedQty = (targetItem.qty_on_hand || 0) + parseInt(form.quantity);
      await supabase
        .from('inventory')
        .update({
          qty_on_hand: updatedQty,
          updated_at: new Date().toISOString(),
        })
        .eq('sku', form.sku)
        .eq('dining_unit', form.targetUnit);
    } else {
      // ✅ Insert new item into target unit
      const originItem = items.find(i => i.sku === form.sku);
      await supabase.from('inventory').insert([{
        sku: form.sku,
        name: form.name,
        category: originItem?.category || '',
        unit: originItem?.unit || '',
        location: originItem?.location || '',
        qty_on_hand: parseInt(form.quantity),
        unitPrice: originItem?.unitPrice || 0,
        dining_unit: form.targetUnit,
        updated_at: new Date().toISOString(),
      }]);
    }
  }

  // Step 3: Log the activity
  await supabase.from('inventory_logs').insert([{
    sku: form.sku,
    name: form.name,
    quantity: form.quantity,
    action,
    location: items.find(i => i.sku === form.sku)?.location || '',
    dining_unit: unitToQuery,
    target_unit: action === 'transfer' ? form.targetUnit : null,
    email: user.email,
    timestamp: new Date(),
  }]);


if (action === 'waste') {
  const now = new Date();
  await supabase.from('waste_logs').insert([{
    sku: form.sku,
    quantity: form.quantity,
    dining_unit: unitToQuery,
    email: user.email,
    timestamp: now,
    month: now.toLocaleString('en-US', { month: 'short' }).toUpperCase(), // e.g. 'JUL'
    year: now.getFullYear(),
  }]);
}



  // Update UI
  const updatedItems = items.map(item =>
    item.sku === form.sku ? { ...item, qty_on_hand: newQty } : item
  );

  setItems(updatedItems);
  setForm({ sku: '', name: '', quantity: 1 });
  setFeedback('✅ Inventory updated.');
};


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToInventoryDashboard />
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Inventory Check-In / Check-Out</h1>

      {user.role === 'admin' && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">Filter by unit:</label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">-- All Units --</option>
            <option value="Discovery">Discovery</option>
            <option value="Regattas">Regattas</option>
            <option value="Commons">Commons</option>
            <option value="Palette">Palette</option>
            <option value="Einstein">Einstein</option>
          </select>
        </div>
      )}
{action === 'transfer' && (
  <div className="mb-4">
    <label className="mr-2 font-semibold">Transfer to unit:</label>
    <select
      value={form.targetUnit}
      onChange={(e) => setForm(prev => ({ ...prev, targetUnit: e.target.value }))}
      className="border p-2 rounded"
    >
      <option value="">-- Select Target Unit --</option>
      {['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein']
        .filter(unit => unit !== (user.role === 'admin' ? selectedUnit : user.unit))
        .map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
    </select>

    {/* 🚫 Optional Warning if same unit somehow selected */}
    {form.targetUnit === (user.role === 'admin' ? selectedUnit : user.unit) && (
      <p className="text-red-600 text-sm mt-1">
        ⚠️ Target unit cannot be the same as the source unit.
      </p>
    )}
  </div>
)}


      <ScannerComponent onScan={handleScan} />

      <div className="mb-4">
        <label className="mr-4 font-semibold">Action:</label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="checkin">Check In</option>
          <option value="checkout">Check Out</option>
          <option value="waste">Waste</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          name="sku"
          placeholder="SKU / Barcode"
          value={form.sku}
          onChange={handleInputChange}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="name"
          placeholder="Item Name"
          value={form.name}
          onChange={handleInputChange}
          className="border p-2 rounded"
        />
        <input
  type="number"
  name="quantity"
  value={form.quantity}
  onChange={(e) =>
    setForm(prev => ({ ...prev, quantity: e.target.value }))
  }
  className="border rounded p-2 w-full"
/>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </form>

      {feedback && (
        <div className={`mb-4 text-sm ${feedback.startsWith('❌') ? 'text-red-600' : 'text-green-600'}`}>
          {feedback}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Current Inventory</h2>
      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2 text-right">Qty on Hand</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={item.qty_on_hand < 0 ? 'bg-red-100' : ''}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2 text-right">{item.qty_on_hand}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryCheckInOut;
