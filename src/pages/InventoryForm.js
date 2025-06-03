import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';

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

  const unitOptions = ['ea', 'case', 'lbs', 'gallons', 'box', 'can', 'pack', 'tray'];
  const categoryOptions = [
    'BAKED GOODS', 'BEVERAGES', 'FRESH BREAD', 'DAIRY PRODUCTS', 'DELI MEATS',
    'SEAFOOD', 'BEEF', 'PORK', 'MEAT', 'POULTRY', 'DRY SPICES', 'FRESH HERBS',
    'FRUITS & VEGETABLE', 'ICE CREAM & SHERBERT', 'DRY PASTA', 'FROZEN GOODS', 'DRY GOODS', 'OTHER'
  ];

  const toNumber = (val) => parseFloat(val) || 0;
  const extendedPrice = toNumber(form.quantity) * toNumber(form.unitPrice);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.barcode || !form.itemName) {
      alert('Please provide a barcode and item name.');
      return;
    }
    if (!form.unit) {
      alert('Please select a unit to register this item under.');
      return;
    }

    const { data: existing, error: checkError } = await supabase
      .from('inventory')
      .select('sku')
      .eq('sku', form.barcode)
      .eq('unit', form.unit)
      .maybeSingle();

    if (existing) {
      alert(`❌ Item with this barcode already exists for ${form.unit}.`);
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

    await supabase.from('inventory_logs').insert([{
      sku: form.barcode,
      name: form.itemName,
      quantity: form.quantity,
      action: 'register',
      unit: form.unit,
      email: form.email,
      timestamp: new Date(),
    }]);

    await generateAndDownloadQRCode(form.barcode);

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

  const generateAndDownloadQRCode = async (sku) => {
    if (!sku) return;
    try {
      const qrDataUrl = await QRCode.toDataURL(sku);
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${sku}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('❌ QR code generation failed:', err);
    }
  };

  const handleScan = useCallback((barcode) => {
    setForm(prev => ({ ...prev, barcode }));
    console.log('📸 Barcode scanned in Register Form:', barcode);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register Inventory Item</h1>
      <p className="text-sm text-gray-700 mb-2">
        <strong>Active unit:</strong> {form.unit || 'Unknown'}
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

        {user?.role === 'admin' ? (
          <select
            name="unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border rounded p-2 w-full"
          >
            <option value="">Select Unit</option>
            <option value="Discovery">Discovery</option>
            <option value="Regattas">Regattas</option>
            <option value="Commons">Commons</option>
            <option value="Palette">Palette</option>
            <option value="Einstein">Einstein</option>
          </select>
        ) : (
          <input
            type="text"
            name="unit"
            value={form.unit}
            readOnly
            className="border rounded p-2 w-full bg-gray-100 text-gray-600"
          />
        )}

        <input
          type="text"
          name="itemName"
          placeholder="Item Name"
          value={form.itemName}
          onChange={handleChange}
          className="border rounded p-2 w-full"
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="border rounded p-2 w-full"
        >
          <option value="">Select Category</option>
          {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <input type="number" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} className="border rounded p-2 w-full" />

        <select name="unitMeasure" value={form.unitMeasure} onChange={handleChange} className="border rounded p-2 w-full">
          <option value="">Select Unit of Measure</option>
          {unitOptions.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>

        <input type="number" name="unitPrice" placeholder="Unit Price" value={form.unitPrice} onChange={handleChange} className="border rounded p-2 w-full" />

        <div className="text-right font-semibold text-blue-900">
          Extended Price: ${extendedPrice.toFixed(2)}
        </div>

        <select
  name="location"
  value={form.location}
  onChange={handleChange}
  className="border rounded p-2 w-full"
>
  <option value="">Select Storage Location</option>
  <option value="Dry">Dry</option>
  <option value="Refrigerated">Refrigerated</option>
  <option value="Freezer">Freezer</option>
  <option value="Other">Other</option>
</select>

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
