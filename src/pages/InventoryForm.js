import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';

function InventoryForm() {
  const user = JSON.parse(localStorage.getItem('user'));

  const [form, setForm] = useState({
    barcode: '',
    unit: user?.unit || '',
    email: user?.email || '',
    itemName: '',
    category: '',
    quantity: '',
    unitPrice: '',
    unitMeasure: '',
    location: '',
    dateReceived: '',
    notes: '',
  });

  const toNumber = (val) => parseFloat(val) || 0;
  const extendedPrice = toNumber(form.quantity) * toNumber(form.unitPrice);
  const unitOptions = ['ea', 'case', 'lbs', 'gallons', 'box', 'can', 'pack', 'tray'];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.barcode || !form.itemName) {
      alert('Please provide a barcode and item name.');
      return;
    }

    // Check for duplicates
    const { data: existing, error: checkError } = await supabase
      .from('inventory')
      .select('sku')
      .eq('sku', form.barcode)
      .maybeSingle();

    if (existing) {
      alert('❌ Item with this barcode already exists.');
      return;
    }

    const newItem = {
      sku: form.barcode,
      name: form.itemName,
      category: form.category,
      unit: form.unit,
      quantity: toNumber(form.quantity),
      unitPrice: toNumber(form.unitPrice),
      extendedPrice,
      location: form.location,
      date_received: form.dateReceived || null,
      notes: form.notes,
      user_email: form.email,
    };

    const { error } = await supabase.from('inventory').insert([newItem]);

    if (error) {
      alert('❌ Error submitting: ' + error.message);
      return;
    }

    // Log it
    await supabase.from('inventory_logs').insert([{
      sku: form.barcode,
      name: form.itemName,
      quantity: form.quantity,
      action: 'register',
      unit: form.unit,
      email: form.email,
      timestamp: new Date(),
    }]);

    alert('✅ New inventory item registered.');

    setForm({
      barcode: '',
      unit: user?.unit || '',
      email: user?.email || '',
      itemName: '',
      category: '',
      quantity: '',
      unitPrice: '',
      unitMeasure: '',
      location: '',
      dateReceived: '',
      notes: '',
    });
  };

  const handleScan = useCallback((barcode) => {
    setForm(prev => ({ ...prev, barcode }));
    console.log('📸 Barcode scanned in Register Form:', barcode);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register Inventory Item</h1>
<p className="text-sm text-gray-700 mb-2">
  <strong>Active Unit:</strong> {form.unit || 'Unknown'}
</p>

      <ScannerComponent onScan={handleScan} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="barcode"
          placeholder="Scan Barcode or Enter SKU"
          value={form.barcode}
          onChange={(e) => setForm(prev => ({ ...prev, barcode: e.target.value }))}
          className="border rounded p-2 w-full"
        />

        <input
          type="text"
          name="unit"
          value={form.unit}
          readOnly
          className="border rounded p-2 w-full bg-gray-100 text-gray-600"
        />

        <input type="text" name="itemName" placeholder="Item Name" value={form.itemName} onChange={handleChange} className="border rounded p-2 w-full" />
        <input type="text" name="category" placeholder="Category" value={form.category} onChange={handleChange} className="border rounded p-2 w-full" />
        <input type="number" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} className="border rounded p-2 w-full" />
        <select name="unitMeasure" value={form.unitMeasure} onChange={handleChange} className="border rounded p-2 w-full">
          <option value="">Select Unit of Measure</option>
          {unitOptions.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
        <input type="number" name="unitPrice" placeholder="Unit Price" value={form.unitPrice} onChange={handleChange} className="border rounded p-2 w-full" />
        
        <div className="text-right font-semibold text-blue-900">
          Extended Price: ${extendedPrice.toFixed(2)}
        </div>

        <input type="text" name="location" placeholder="Storage Location" value={form.location} onChange={handleChange} className="border rounded p-2 w-full" />
        <input type="date" name="dateReceived" value={form.dateReceived} onChange={handleChange} className="border rounded p-2 w-full" />
        <textarea name="notes" placeholder="Notes or Expiry Info" value={form.notes} onChange={handleChange} className="border rounded p-2 w-full" />

        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Submit
        </button>
      </form>
    </div>
  );
}

export default InventoryForm;
