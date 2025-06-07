import React, { useState, useEffect, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';

function InventoryCheckInOut() {
  const [action, setAction] = useState('checkin');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', quantity: 1 });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const [selectedUnit, setSelectedUnit] = useState(user.unit || '');

  const fetchInventory = useCallback(async () => {
    const query = supabase.from('inventory').select('*');
    if (user.role !== 'admin') {
      query.eq('dining_unit', user.unit);
    } else if (selectedUnit) {
      query.eq('dining_unit', selectedUnit);
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
      setFeedback('❌ Item not found or error occurred.');
      return;
    }

    if (data.length > 1) {
      setFeedback('⚠️ This SKU is registered under multiple entries. Please ensure each SKU is uniquely assigned per unit.');
      return;
    }

    const item = data[0];
    setForm({ sku: barcode, name: item.name, quantity: 1 });
    setFeedback('');
  }, [selectedUnit, user.unit]);

  useEffect(() => {
    const fetchLog = async () => {
      const query = supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false }).limit(10);
      if (user.role !== 'admin') query.eq('dining_unit', user.unit);
      if (user.role === 'admin' && selectedUnit) query.eq('dining_unit', selectedUnit);

      const { data, error } = await query;
      if (!error) setActivityLog(data);
    };
    fetchLog();
  }, [user.unit, user.role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'quantity' ? Math.max(1, Number(value)) : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const unitToQuery = (user.role === 'admin' ? selectedUnit : user.unit || '').trim();

    if (!unitToQuery || !form.sku || !form.quantity) return;
    const delta = action === 'checkin' ? parseInt(form.quantity) : -parseInt(form.quantity);

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

    await supabase.from('inventory_logs').insert([{
      sku: form.sku,
      name: form.name,
      quantity: form.quantity,
      action,
      location: items.find(i => i.sku === form.sku)?.location || '',
      dining_unit: unitToQuery,
      email: user.email,
      timestamp: new Date(),
    }]);

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
          min={1}
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleInputChange}
          className="border p-2 rounded"
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

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Recent Inventory Activity</h3>
        <table className="w-full border-collapse border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Timestamp</th>
              <th className="border p-2">SKU</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Action</th>
              <th className="border p-2">User</th>
            </tr>
          </thead>
          <tbody>
            {activityLog.map((log, i) => (
              <tr key={i}>
                <td className="border p-2">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="border p-2">{log.sku}</td>
                <td className="border p-2">{log.name}</td>
                <td className="border p-2">{log.quantity}</td>
                <td className="border p-2">{log.action}</td>
                <td className="border p-2">{log.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InventoryCheckInOut;
