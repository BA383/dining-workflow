import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const ALL_UNITS = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein', 'Administration'];


function InventoryTable() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedUnit, setSelectedUnit] = useState(user?.unit || '');
  const [items, setItems] = useState([]);
  const userEmail = user?.email || '';


  useEffect(() => {
    fetchItems();
  }, [selectedUnit]);

 const fetchItems = async () => {
  if (!selectedUnit) return;

  const unitToFetch = user?.role === 'admin' ? selectedUnit : user.unit;

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('unit', unitToFetch);

  if (error) {
    console.error('Error fetching inventory:', error.message);
  } else {
    setItems(data);
  }
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
        return;
      }

      await uploadToSupabase(rows);
    };

    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const formatDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d) ? null : d.toISOString().split('T')[0];
  };

  const handleDelete = async (item) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('sku', item.sku)
      .eq('unit', selectedUnit);

    if (error) {
      console.error('Delete error:', error);
      alert('❌ Failed to delete: ' + error.message);
      return;
    }

    await supabase.from('inventory_logs').insert([{
      sku: item.sku,
      name: item.name,
      quantity: item.quantity || 0,
      action: 'delete',
      unit: selectedUnit,
      email: userEmail,
      timestamp: new Date(),
    }]);

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
        unitPrice,
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
      fetchItems();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">
  Inventory Overview — {user.role === 'admin' ? selectedUnit : user.unit}
</h2>


      {/* Unit Selector for Admins */}
      {user?.role === 'admin' && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">View Unit:</label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="border rounded p-2"
          >
            {ALL_UNITS.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4">
        <p className="text-sm text-gray-600 mb-3">
  <strong>Unit:</strong> {user.role === 'admin' ? selectedUnit : user.unit}
</p>


        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileUpload}
          className="border rounded p-2"
        />
      </div>

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
