import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import { useUser } from '../UserRoleContext';


function InventoryForm() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [form, setForm] = useState({
  unit: user?.unit || '',
  email: user?.email || '',
  itemName: '',
  category: '',
  quantity: '',
  unitMeasure: '', // optional rename
  location: '',
  reorderLevel: '',
  dateReceived: '',
  notes: '',
});
const unitOptions = ['ea', 'case', 'lbs', 'gallons', 'box', 'can', 'pack', 'tray'];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

    // ✅ 6. ON SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('✅ Submitted Inventory Item:', form);

    const { error } = await supabase
      .from('inventory')
      .insert([form]);

    if (error) {
      alert('❌ Failed to submit: ' + error.message);
    } else {
      alert('✅ Inventory item added!');
      setForm({
        barcode: '',
        unit: '',
        email: '',
        itemName: '',
        category: '',
        quantity: '',
        unitMeasure: '',
        location: '',
        reorderLevel: '',
        dateReceived: '',
        notes: '',
      });
    }
  };


  // 🔍 Supabase lookup handler for scanned barcode
    // ✅ 7. ON SCAN
  const handleScan = useCallback(async (barcode) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('sku', barcode)
      .single();

    if (error || !data) {
      alert('Item not found in inventory');
      return;
    }

    setForm(prev => ({
      ...prev,
      barcode,
      itemName: data.name,
      category: data.category || '',
      quantity: 1,
      unitMeasure: data.unit || '',
    }));
  }, []);


    // ✅ 8. RETURN JSX (UI)
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register Inventory Item</h1>

      <ScannerComponent onScan={handleScan} />

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Barcode */}
        <input
          type="text"
          name="barcode"
          placeholder="Scan Barcode or Enter SKU"
          value={form.barcode}
          onChange={async (e) => {
            const barcode = e.target.value;
            setForm(prev => ({ ...prev, barcode }));

            const { data, error } = await supabase
              .from('inventory')
              .select('*')
              .eq('sku', barcode)
              .single();

            if (data) {
              setForm(prev => ({
                ...prev,
                itemName: data.name,
                category: data.category || '',
                quantity: 1,
                unitMeasure: data.unit || '',
              }));
            }
          }}
          className="border rounded p-2 w-full"
        />

        {/* Dining Unit */}
        <input
  type="text"
  name="unit"
  value={form.unit}
  readOnly
  className="border rounded p-2 w-full bg-gray-100 text-gray-600"
/>



        {/* Item Name */}
        <input type="text" name="itemName" placeholder="Item Name" value={form.itemName} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* Category */}
        <input type="text" name="category" placeholder="Category (e.g., Dairy, Produce)" value={form.category} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* Quantity */}
        <input type="number" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* ✅ Unit of Measure Dropdown */}
        <select
          name="unitMeasure"
          value={form.unitMeasure}
          onChange={handleChange}
          className="border rounded p-2 w-full"
        >
          <option value="">Select Unit of Measure</option>
          {unitOptions.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>

        {/* Location */}
        <input type="text" name="location" placeholder="Storage Location" value={form.location} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* Reorder Level */}
        <input type="number" name="reorderLevel" placeholder="Reorder Level" value={form.reorderLevel} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* Date Received */}
        <input type="date" name="dateReceived" value={form.dateReceived} onChange={handleChange} className="border rounded p-2 w-full" />
        
        {/* Notes */}
        <textarea name="notes" placeholder="Notes or Expiry Info" value={form.notes} onChange={handleChange} className="border rounded p-2 w-full" />

        {/* Submit Button */}
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Submit
        </button>
      </form>
    </div>
  );
}

export default InventoryForm;
