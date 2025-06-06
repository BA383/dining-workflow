import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';


function InventoryForm() {
  const user = JSON.parse(localStorage.getItem('user'));

  const [form, setForm] = useState({
  barcode: '',
  dining_unit: user?.role === 'admin' ? 'Administration' : user?.unit || '',
  email: user?.email || '',
  itemName: '',
  category: '',
  quantity: '',
  unitPrice: '',
  unitMeasure: '',
  location: '',
  dateReceived: '',
  notes: '',
  reorder_level: '', // ✅ Add this line
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
    if (!form.dining_unit) {
  alert('Please select a unit to register this item under.');
  return;
}


// ✅ Check for existing SKU within the same dining unit
const { data: existing, error: checkError } = await supabase
  .from('inventory')
  .select('id')
  .eq('sku', form.barcode)
  .eq('dining_unit', form.dining_unit);

if (checkError) {
  console.error('Error checking SKU uniqueness:', checkError.message);
  alert('❌ Could not verify SKU. Please try again.');
  return;
}

if (existing && existing.length > 0) {
  alert('⚠️ This SKU is already registered for this dining unit. Please use a unique SKU or update the existing item.');
  return;
}




const newItem = {
  sku: form.barcode,
  name: form.itemName,
  category: form.category,
  unit: form.unitMeasure,
  quantity: toNumber(form.quantity),
  unitPrice: toNumber(form.unitPrice),
  extendedPrice,
  location: form.location,
  date_received: form.dateReceived || null,
  notes: form.notes,
  user_email: form.email,
  dining_unit: (form.dining_unit || '').trim(),   // ✅ Trim any whitespace
  reorder_level: toNumber(form.reorder_level),    // ✅ Store as number
};





   const { error: insertError } = await supabase.from('inventory').insert([newItem]);


    if (error) {
      alert('❌ Error submitting: ' + error.message);
      return;
    }
await supabase.rpc('set_config', {
  config_key: 'request.unit',
  config_value: form.dining_unit,
});

await supabase.from('inventory_logs').insert([{
  sku: form.barcode,
  name: form.itemName,
  quantity: form.quantity,
  action: 'register',
  unit: form.unitMeasure,           // ✅ this means unit of measure
  location: form.location,          // ✅ include this
  dining_unit: form.dining_unit,    // ✅ correct field!
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
      reorder_level: '', // ✅ Reset here
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
      <BackToInventoryDashboard />

      <h1 className="text-2xl font-bold mb-4">Register Inventory Item</h1>
      <p className="text-sm text-gray-700 mb-2">
  <strong>Active unit:</strong> {form.dining_unit || 'Not Assigned'}
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
    name="dining_unit"
    value={form.dining_unit}
    onChange={(e) => setForm({ ...form, dining_unit: e.target.value })}
    
    className="border rounded p-2 w-full"
  >
    <option value="">Select Dining Unit</option>
    <option value="Discovery">Discovery</option>
    <option value="Regattas">Regattas</option>
    <option value="Commons">Commons</option>
    <option value="Palette">Palette</option>
    <option value="Einstein">Einstein</option>
  </select>
) : (
  <input
    type="text"
    name="dining_unit"
    value={form.dining_unit}
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
<input
  type="number"
  name="reorder_level"
  placeholder="Set Low Stock Threshold (Reorder Level)"
  value={form.reorder_level}
  onChange={handleChange}
  className="border rounded p-2 w-full"
/>
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
  <option value="Refer">Refer</option>
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
