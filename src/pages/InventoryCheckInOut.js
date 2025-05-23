import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
const user = JSON.parse(localStorage.getItem('user'));

function InventoryCheckInOut() {
  const [action, setAction] = useState('checkin');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', quantity: 0 });

  const handleScan = useCallback(async (barcode) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('sku', barcode)
      .single();

    if (error || !data) {
      alert('Item not found.');
      return;
    }

    setForm(prev => ({
      ...prev,
      sku: barcode,
      name: data.name,
      quantity: 1,
    }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'quantity') {
      const numericValue = Math.max(1, Number(value)); // minimum 1
      setForm({ ...form, [name]: numericValue });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.sku || !form.quantity) return;

  const existingIndex = items.findIndex(item => item.sku === form.sku);
  let updatedItems = [...items];

  if (existingIndex !== -1) {
    const current = updatedItems[existingIndex];
    const delta = action === 'checkin' ? parseInt(form.quantity) : -parseInt(form.quantity);
    current.quantity += delta;
  } else {
    updatedItems.push({
      ...form,
      quantity: action === 'checkin' ? parseInt(form.quantity) : -parseInt(form.quantity),
    });
  }

  setItems(updatedItems);

  // ✅ Log the inventory transaction to Supabase
  const user = JSON.parse(localStorage.getItem('user'));
  await supabase.from('inventory_logs').insert([
  {
    sku: form.sku,
    name: form.name,
    quantity: form.quantity,
    action, // 'checkin' or 'checkout'
    unit: user?.unit,
    email: user?.email,
    timestamp: new Date()
  }
]);


  if (error) {
    console.error('❌ Error logging inventory action:', error.message);
  } else {
    console.log('✅ Inventory action logged.');
  }

  // Clear form
  setForm({ sku: '', name: '', quantity: 0 });
};


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Inventory Check-In / Check-Out</h1>

      <ScannerComponent onScan={handleScan} />

      <div className="mb-6">
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleInputChange}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Current Inventory</h2>
      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2">Quantity</th>
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
    </div>
  );
}

export default InventoryCheckInOut;
