// WasteAndTransferForm.js (Shared Component for Waste & Transfer)
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { getCurrentUser, setRLSContext } from '../utils/userSession';

function WasteAndTransferForm({ user }) {
if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Inventory is for Dining staff only.</p>
      </div>
    );
  }


  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    reason: '',
    toUnit: '',
    notes: '',
    actionType: 'waste', // 'waste' or 'transfer'
  });

  const diningUnit = user?.unit || 'Unknown';

  


const handleSubmit = async (e) => {
  e.preventDefault();
  const { sku, name, quantity, reason, toUnit, notes, actionType } = form;
  const qty = Number(quantity);
  const timestamp = new Date().toISOString();

  if (!sku || qty <= 0) return alert('Please fill in valid SKU and quantity');

  // ✅ Ensure user info is fresh and RLS context is set
  const currentUser = await getCurrentUser();
  if (!currentUser) return alert('User not authenticated.');

  await setRLSContext(currentUser.unit, currentUser.role);

  const diningUnit = currentUser.unit;
  const email = currentUser.email;

  try {
// ✅ Always insert into waste_logs or inventory_transfers first
let entryError = null;

if (actionType === 'waste') {
  const { error } = await supabase.from('waste_logs').insert([{
    sku,
    name,
    quantity: qty,
    reason,
    notes,
    dining_unit: diningUnit,
    email: currentUser.email,
    timestamp
  }]);
  entryError = error;
}

if (actionType === 'transfer') {
  const { error } = await supabase.from('inventory_transfers').insert([{
    sku,
    qty,
    dining_unit: diningUnit, // ✅ matches existing schema
    to_unit: toUnit,
    notes,
    timestamp
  }]);
  entryError = error;
}

if (entryError) {
  alert(`Failed to record ${actionType}`);
  console.error(entryError.message);
  return;
}

// ✅ Insert into inventory_logs so the General Report picks it up
const logEntries = [
  {
    sku,
    name,
    quantity: qty,
    action: actionType === 'waste' ? 'waste' : 'transfer_out',
    dining_unit: diningUnit,
    unit: diningUnit,
    target_unit: actionType === 'transfer' ? toUnit : null,
    email: currentUser.email,
    timestamp,
  }
];

if (actionType === 'transfer') {
  logEntries.push({
    sku,
    name,
    quantity: qty,
    action: 'transfer_in',
    dining_unit: toUnit,
    unit: toUnit,
    target_unit: null,
    email: currentUser.email,
    timestamp,
  });
}

const { error: logError } = await supabase.from('inventory_logs').insert(logEntries);

if (logError) {
  alert(`Failed to log ${actionType} in inventory logs.`);
  console.error(logError.message);
  return;
}

alert('✅ Entry recorded');
setForm({ sku: '', name: '', quantity: '', reason: '', toUnit: '', notes: '', actionType });


  } catch (err) {
    console.error('❌ Error submitting entry:', err.message);
    alert('Failed to record ' + actionType);
  }
};



  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackToInventoryDashboard /> 
      <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} className="border rounded p-2 w-full">
        <option value="waste">Waste</option>
        <option value="transfer">Transfer</option>
      </select>
      <input type="text" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="border p-2 rounded w-full" />
      <input type="text" placeholder="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border p-2 rounded w-full" />
      <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="border p-2 rounded w-full" />

      {form.actionType === 'waste' && (
        <input type="text" placeholder="Reason for Waste" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="border p-2 rounded w-full" />
      )}
      {form.actionType === 'transfer' && (
        <select value={form.toUnit} onChange={(e) => setForm({ ...form, toUnit: e.target.value })} className="border p-2 rounded w-full">
          <option value="">Select Target Unit</option>
          <option value="Discovery">Discovery</option>
          <option value="Regattas">Regattas</option>
          <option value="Commons">Commons</option>
          <option value="Palette">Palette</option>
          <option value="Einstein">Einstein</option>
        </select>
      )}
      <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border p-2 rounded w-full" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
}

export default WasteAndTransferForm;
