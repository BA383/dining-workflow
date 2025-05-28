import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
const user = JSON.parse(localStorage.getItem('user'));

function InventoryTable() {
  const selectedUnit = user?.unit || 'Regattas';

  const [items, setItems] = useState([]);

  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    fetchItems();
  }, [selectedUnit]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('unit', selectedUnit);

    if (error) console.error(error);
    else setItems(data);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      let rows = [];

      if (file.name.endsWith('.xlsx')) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            rows = results.data;
            await uploadToSupabase(rows);
          },
        });
        return; // early return for CSV async
      }

      await uploadToSupabase(rows);
    };

    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };
// ✅ Add this before uploadToSupabase()
const formatDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d) ? null : d.toISOString().split('T')[0];
};

const handleDelete = async (item) => {
  // 1. Remove from Supabase
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('sku', item.sku)
    .eq('unit', user.unit); // make sure unit matches

  if (error) {
    console.error('Delete error:', error);
    alert('❌ Failed to delete: ' + error.message);
    return;
  }

  // 2. Log the deletion
  await supabase.from('inventory_logs').insert([{
    sku: item.sku,
    name: item.name,
    quantity: item.quantity || 0,
    action: 'delete',
    unit: user.unit,
    email: user.email,
    timestamp: new Date(),
  }]);

  // 3. Update the UI
  setItems(prev => prev.filter(i => i.sku !== item.sku));
  alert('✅ Item deleted and logged.');
};




  const uploadToSupabase = async (rows) => {
  const formatted = rows.map(row => {
    const quantity = Number(row['QTY'] || row['Quantity'] || row.quantity || 0);
    const unitPrice = Number(String(row['Unit Price'] || row.unitPrice || 0).replace(/[$,]/g, ''));

    return {
      name: row['ITEM NAME'] || row['Item Name'] || row.name || '',
      sku: row['SKU'] || row.sku || '',
      category: row['CATEGORY'] || row.category || '',
      quantity,
      unit: row['UNIT'] || row.unit || '',
      unitPrice, // <- use the parsed value here
      extendedPrice: quantity * unitPrice,
      expiration: formatDate(row['EXPIRATION'] || row.expiration),
      date_received: formatDate(row['DATE RECEIVED'] || row.date_received),
      reorder_level: Number(row['REORDER LEVEL'] || row.reorder_level || 0),
      location: row['LOCATION'] || row.location || '',
      unitlocation: row['UNIT LOCATION'] || row.unitlocation || '',
      notes: row['NOTES'] || row.notes || '',
      unit: selectedUnit,
      user_email: userEmail,
    };
  });

  const { error } = await supabase.from('inventory').insert(formatted);
  if (error) {
    console.error('Upload failed:', error);
    alert('❌ Upload failed. See console for details.');
  } else {
    alert('✅ Upload successful!');
    fetchItems(); // Refresh the table
  }
};

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Inventory Overview</h2>

      {/* Unit Selector */}
      <div className="mb-4 flex items-center gap-4">
        <p className="text-sm text-gray-600 mb-3">
  <strong>Unit:</strong> {selectedUnit}
</p>


        {/* Upload Input */}
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileUpload}
          className="border rounded p-2"
        />
      </div>

      {/* Table */}
      <table className="w-full border-collapse border text-sm">
  <thead>
    <tr className="bg-gray-100">
      <th className="border p-2">Item Name</th>
      <th className="border p-2">SKU</th>
      <th className="border p-2">Category</th>
      <th className="border p-2">Qty</th>
      <th className="border p-2">Unit</th>
      <th className="border p-2">Unit Price</th>
      <th className="border p-2">Extended Price</th>
      <th className="border p-2">Expiration</th>
      <th className="border p-2">Notes</th>
      {user?.role === 'admin' && <th className="border p-2">Action</th>}
    </tr>
  </thead>
  <tbody>
    {items.map((item, i) => (
      <tr key={i}>
        <td className="border p-2">{item.name}</td>
        <td className="border p-2">{item.sku}</td>
        <td className="border p-2">{item.category}</td>
        <td className="border p-2">{item.quantity}</td>
        <td className="border p-2">{item.unit}</td>
        <td className="border p-2">${item.unitPrice?.toFixed(2)}</td>
        <td className="border p-2 text-right">
          ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
        </td>
        <td className="border p-2">{item.expiration || '-'}</td>
        <td className="border p-2">{item.notes}</td>

        {user?.role === 'admin' && (
          <td className="border p-2 text-center">
            <button
              onClick={() => handleDelete(item)}
              className="text-red-600 hover:underline"
            >
              Delete
            </button>
          </td>
        )}
      </tr>
    ))}
  </tbody>


      </table>
    </div>
  );
}

export default InventoryTable;
