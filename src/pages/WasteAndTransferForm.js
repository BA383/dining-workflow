// WasteAndTransferForm.js (Enhanced Version)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { isAdmin, isDining } from '../utils/permissions';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { getCurrentUser, setRLSContext } from '../utils/userSession';
import Select from 'react-select';

function WasteAndTransferForm({ user }) {
  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    unitOfMeasure: '',
    reason: '',
    toUnit: '',
    notes: '',
    actionType: 'waste',
    selectedDiningUnit: '',
  });

  const [availableUnits, setAvailableUnits] = useState([
    'Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein'
  ]);
  const [inventoryOptions, setInventoryOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);


  const isAdminUser = isAdmin();
  const isDiningUser = isDining();


    useEffect(() => {
    const fetchItems = async () => {
      const unit = isAdminUser ? form.selectedDiningUnit : user?.unit;
      if (!unit) return;

      const { data, error } = await supabase
        .from('inventory')
        .select('sku, name, unit')
        .eq('dining_unit', unit);

      if (error) {
        console.error('❌ Failed to fetch inventory:', error.message);
        return;
      }

      setItemOptions(data || []);
    };

    fetchItems();
  }, [form.selectedDiningUnit, user?.unit]);


  useEffect(() => {
    const loadInventory = async () => {
      const unit = isAdminUser ? form.selectedDiningUnit : user?.unit;
      if (!unit) return;

      const { data, error } = await supabase
        .from('inventory')
        .select('sku, name, unitOfMeasure')
        .eq('dining_unit', unit);

      if (!error) setInventoryOptions(data);
    };
    loadInventory();
  }, [form.selectedDiningUnit]);



  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      sku, name, quantity, reason, toUnit, notes,
      actionType, unitOfMeasure, selectedDiningUnit
    } = form;

    const qty = Number(quantity);
    const timestamp = new Date().toISOString();
    if (!sku || qty <= 0) return alert('Please fill in valid SKU and quantity');

    const currentUser = await getCurrentUser();
    if (!currentUser) return alert('User not authenticated.');

    const diningUnit = isAdminUser ? selectedDiningUnit : currentUser.unit;
    if (!diningUnit) return alert('Please select a dining unit.');

    await setRLSContext(diningUnit, currentUser.role);

    let entryError = null;
    if (actionType === 'waste') {
      const { error } = await supabase.from('waste_logs').insert([{
        sku, quantity: qty, reason, notes,
        dining_unit: diningUnit, email: currentUser.email, timestamp
      }]);
      entryError = error;
    }

    if (actionType === 'transfer') {
      const { error } = await supabase.from('inventory_transfers').insert([{
        sku, qty, dining_unit: diningUnit, to_unit: toUnit,
        notes, timestamp
      }]);
      entryError = error;
    }

    if (entryError) {
      alert(`Failed to record ${actionType}`);
      console.error(entryError.message);
      return;
    }

 const logEntries = [
  {
    sku,
    quantity: qty,
    action: actionType === 'waste' ? 'waste' : 'transfer_out',
    dining_unit: diningUnit,
    unit: diningUnit,
    target_unit: actionType === 'transfer' ? toUnit : null,
    email: currentUser.email,
    timestamp,
    notes,
  }
];

if (actionType === 'transfer') {
  logEntries.push({
    sku,
    quantity: qty,
    action: 'transfer_in',
    dining_unit: toUnit,
    unit: toUnit,
    target_unit: null,
    email: currentUser.email,
    timestamp,
    notes,
  });
}


    const { error: logError } = await supabase.from('inventory_logs').insert(logEntries);
    if (logError) {
      alert(`Failed to log ${actionType} in inventory logs.`);
      console.error(logError.message);
      return;
    }

    alert('✅ Entry recorded');
    setForm({ sku: '', name: '', quantity: '', unitOfMeasure: '', reason: '', toUnit: '', notes: '', actionType: 'waste', selectedDiningUnit: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackToInventoryDashboard />

      {isAdminUser && (
        <select value={form.selectedDiningUnit} onChange={(e) => setForm({ ...form, selectedDiningUnit: e.target.value })} className="border rounded p-2 w-full">
          <option value="">Select Dining Unit</option>
          {availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      )}

      <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} className="border rounded p-2 w-full">
        <option value="waste">Waste</option>
        <option value="transfer">Transfer</option>
      </select>

     <Select
  options={itemOptions.map(item => ({
    value: item.sku,
    label: `${item.sku} – ${item.name}`,
    unit: item.unit
  }))}
  onChange={(selected) => {
    setForm({
      ...form,
      sku: selected?.value || '',
      name: selected?.label?.split('–')[1]?.trim() || '',
      unit_of_measure: selected?.unit || '',
    });
  }}
  placeholder="Search by SKU or Item Name..."
  isClearable
  isSearchable
  className="w-full"
/>


      <input type="text" placeholder="Item Name" value={form.name} readOnly className="border p-2 rounded w-full bg-gray-100" />
      <input type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="border p-2 rounded w-full" />

      <select value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} className="border p-2 rounded w-full">
        <option value="">Select Unit of Measure</option>
        <option value="each">Each</option>
        <option value="case">Case</option>
        <option value="lb">Pound</option>
        <option value="oz">Ounce</option>
      </select>

      {form.actionType === 'waste' && (
        <input type="text" placeholder="Reason for Waste" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="border p-2 rounded w-full" />
      )}

      {form.actionType === 'transfer' && (
        <select value={form.toUnit} onChange={(e) => setForm({ ...form, toUnit: e.target.value })} className="border p-2 rounded w-full">
          <option value="">Select Target Unit</option>
          {availableUnits.filter(u => u !== (isAdminUser ? form.selectedDiningUnit : user.unit)).map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      )}

      <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border p-2 rounded w-full" />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
}

export default WasteAndTransferForm;
