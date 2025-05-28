import React, { useState, useEffect, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';

function InventoryCheckInOut() {
  const [action, setAction] = useState('checkin');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', quantity: 1 });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
const [activityLog, setActivityLog] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 🔁 Fetch all inventory items
  const fetchInventory = useCallback(async () => {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) {
      console.error('Error fetching inventory:', error.message);
    } else {
      setItems(data);
    }
  }, []);

  // 📥 On load, get inventory
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // 📸 Barcode scanned handler
  const handleScan = useCallback(async (barcode) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('sku', barcode)
      .single();

    if (error || !data) {
      setFeedback('Item not found.');
      return;
    }

    setForm({ sku: barcode, name: data.name, quantity: 1 });
    setFeedback('');
  }, []);

useEffect(() => {
  const fetchLog = async () => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!error) setActivityLog(data);
  };

  fetchLog();
}, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'quantity' ? Math.max(1, Number(value)) : value;
    setForm({ ...form, [name]: newValue });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  // ✅ Defensive check for undefined unit
  if (!user.unit) {
    alert('User unit not defined. Please log in again.');
    return;
  }
  if (!form.sku || !form.quantity) return;

  const delta = action === 'checkin' ? parseInt(form.quantity) : -parseInt(form.quantity);

  // 🔄 Fetch current quantity
  const { data: existingItem, error: fetchError } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('sku', form.sku)
    .eq('unit', user.unit)
    .single();

  if (fetchError || !existingItem) {
    alert('❌ Item not found or fetch failed.');
    return;
  }

  const newQuantity = existingItem.quantity + delta;

  // 🔁 Update inventory
  const { error: updateError } = await supabase
    .from('inventory')
    .update({ quantity: newQuantity })
    .eq('sku', form.sku)
    .eq('unit', user.unit);

  if (updateError) {
    alert('❌ Failed to update quantity: ' + updateError.message);
    return;
  }

  // 🧾 Log transaction
  await supabase.from('inventory_logs').insert([{
    sku: form.sku,
    name: form.name,
    quantity: form.quantity,
    action,
    unit: user.unit,
    email: user.email,
    timestamp: new Date()
  }]);

  // ✅ UI Update
  const existingIndex = items.findIndex(item => item.sku === form.sku);
  let updatedItems = [...items];

  if (existingIndex !== -1) {
    updatedItems[existingIndex].quantity = newQuantity;
  } else {
    updatedItems.push({ ...form, quantity: newQuantity });
  }

  setItems(updatedItems);
  setForm({ sku: '', name: '', quantity: 0 });
};



  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Inventory Check-In / Check-Out</h1>

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
        <div className={`mb-4 text-sm ${feedback.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {feedback}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Current Inventory</h2>
      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2 text-right">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={item.quantity < 0 ? 'bg-red-100' : ''}>
              <td className="border p-2">{item.sku}</td>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2 text-right">{item.quantity}</td>
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
