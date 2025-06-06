import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';

const ALL_UNITS = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein', 'Administration'];

function InventoryTable() {
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState({});
  const [collapsedUnits, setCollapsedUnits] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    setSelectedUnit(storedUser.unit || '');
  }, []);

  useEffect(() => {
    if (selectedUnit && user?.role) {
      fetchItems();
    }
  }, [selectedUnit, user]);

  const fetchItems = async () => {
  // ✅ Set request.unit for RLS policies
 await supabase.rpc('set_config', {
  config_key: 'request.unit',
  config_value: user.role === 'admin' ? selectedUnit : user.unit,
});


  // Now fetch data
  let query = supabase.from('inventory').select('*');
  if (!(user.role === 'admin' && selectedUnit === 'Administration')) {
    const unitToFetch = user.role === 'admin' ? selectedUnit : user.unit;
    query = query.eq('dining_unit', unitToFetch);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching inventory:', error.message);
  } else {
    setItems(data);

    if (selectedUnit === 'Administration') {
      const grouped = data.reduce((acc, item) => {
        acc[item.dining_unit] = acc[item.dining_unit] || [];
        acc[item.dining_unit].push(item);
        return acc;
      }, {});
      setGroupedItems(grouped);
      setCollapsedUnits(Object.fromEntries(Object.keys(grouped).map(unit => [unit, true])));
    }
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

const uploadToSupabase = async (rows) => {
  // Normalize keys: trim spaces, lowercase
  rows = rows.map(row => {
    const normalized = {};
    for (const key in row) {
      normalized[key.trim().toLowerCase()] = row[key];
    }
    return normalized;
  });

  const formatted = rows.map(row => {
    const quantity = Number(row['qty'] || row['quantity'] || 0);
    const unitPrice = Number(String(row['unit price'] || 0).replace(/[$,]/g, ''));
    const reorder_level = Number(row['reorder level'] || 0);

    return {
      name: row['item name'] || row.name || '',
      sku: row['sku'] || '',
      category: row['category'] || '',


      quantity,
      unitPrice,
      extendedPrice: quantity * unitPrice,
      expiration: row['expiration'] ? new Date(row['expiration']).toISOString().split('T')[0] : null,
      date_received: row['date received'] ? new Date(row['date received']).toISOString().split('T')[0] : null,
      reorder_level,
      location: row['LOCATION'] || row['Location'] || row.location || '',
      unitlocation: row['unit location'] || '',
      notes: row['notes'] || '',
      dining_unit: row['Dining Unit']?.trim() || (user.role === 'admin' ? selectedUnit : user.unit) || 'Unknown',


      unit: row['unit'] || '',
      user_email: user.email || '',
    };
  });
console.log('Category in formatted upload:', formatted.map(f => f.category));

  console.log('Uploading this to Supabase:', formatted);

  const { error } = await supabase.from('inventory').insert(formatted);
  if (error) {
    console.error('Upload failed:', error);
    alert('❌ Upload failed. See console for details.');
    return;
  }

  alert('✅ Upload successful!');
  fetchItems();

  // === Generate QR codes for SKUs ===
  const zip = new JSZip();
  await Promise.all(
    formatted.map(async (item) => {
      if (!item.sku || typeof item.sku !== 'string' || item.sku.trim() === '') return;
      try {
        const qrDataUrl = await QRCode.toDataURL(item.sku);
        const base64 = qrDataUrl.split(',')[1];
        zip.file(`${item.sku}.png`, base64, { base64: true });
      } catch (err) {
        console.error(`Failed to generate QR for SKU: ${item.sku}`, err);
      }
    })
  );

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'Inventory_QRCodes.zip');
};




  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, 'Inventory_Report.xlsx');
  };

  const toggleCollapse = (unit) => {
    setCollapsedUnits(prev => ({ ...prev, [unit]: !prev[unit] }));
  };

  const renderChart = (data) => {
    const categoryTotals = data.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.quantity);
      return acc;
    }, {});
    const chartData = Object.entries(categoryTotals).map(([category, quantity]) => ({ category, quantity }));

    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="quantity" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6">
      <BackToInventoryDashboard />
      <h2 className="text-xl font-bold mb-4">
        Master Inventory View — {user.role === 'admin' ? (selectedUnit === 'Administration' ? 'All Units' : selectedUnit) : user.unit}
      </h2>

      {user?.role === 'admin' && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">View dining_unit:</label>
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

      <input
        type="text"
        placeholder="Search by item name, SKU, or category"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border rounded px-3 py-2 mb-4 w-full md:w-1/2"
      />

      <div className="mb-4 flex items-center gap-4">
        <button onClick={exportToExcel} className="bg-blue-500 text-white px-3 py-1 rounded shadow">
          Export to Excel
        </button>
        {selectedUnit !== 'Administration' && (
          <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="border rounded p-2" />
        )}
      </div>

      {selectedUnit === 'Administration' ? (
        Object.entries(groupedItems).map(([unit, unitItems]) => {
          const filteredItems = unitItems.filter(item =>
            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
          );

          const totalQty = filteredItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
          const totalVal = filteredItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0);

          return (
            <div key={unit} className="mb-6">
              <button className="text-lg font-bold text-blue-700" onClick={() => toggleCollapse(unit)}>
                {collapsedUnits[unit] ? '+' : '−'} {unit} — {filteredItems.length} items
              </button>
              {!collapsedUnits[unit] && (
                <>
                  <div className="my-2">{renderChart(filteredItems)}</div>
                  <table className="w-full border-collapse border text-sm mb-2">
                    <thead className="bg-gray-100">
  <tr>
    <th className="border p-2">Item</th>
    <th className="border p-2">SKU</th>
    <th className="border p-2">Category</th>
    <th className="border p-2">Qty</th>
    <th className="border p-2">Dining Unit</th>
    <th className="border p-2">Location</th>
    <th className="border p-2">Price</th>
    <th className="border p-2">Ext Price</th>
  </tr>
</thead>


                    <tbody>
                      {filteredItems.map((item, i) => (
                        <tr key={i}>
                          <td className="border p-2">{item.name}</td>
                          <td className="border p-2">{item.sku}</td>
                          <td className="border p-2">{item.category}</td>
                          <td className="border p-2">{item.quantity}</td>
                          <td className="border p-2">{item.dining_unit}</td>
                          <td className="border p-2">{item.location || '-'}</td>
                          <td className="border p-2">${item.unitPrice?.toFixed(2)}</td>
<td className="border p-2 text-right">
  ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
</td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-sm font-bold text-black-600">Total Qty: {totalQty} | Total Value: ${totalVal.toFixed(2)}</p>
                </>
              )}
            </div>
          );
        })
      ) : (
        <table className="w-full border-collapse border text-sm">
         <thead className="bg-gray-100">
  <tr>
    <th className="border p-2">Item</th>
    <th className="border p-2">SKU</th>
    <th className="border p-2">Category</th>
    <th className="border p-2">Qty</th>
    <th className="border p-2">Dining Unit</th>
    <th className="border p-2">Location</th> {/* ✅ Add this */}
    <th className="border p-2">Price</th>
    <th className="border p-2">Ext Price</th>
  </tr>
</thead>

<tbody>
  {items
    .filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((item, i) => (
      <tr key={i}>
        <td className="border p-2">{item.name}</td>
        <td className="border p-2">{item.sku}</td>
        <td className="border p-2">{item.category}</td>
        <td className="border p-2">{item.quantity}</td>
        <td className="border p-2">{item.dining_unit}</td>
        <td className="border p-2">{item.location || '-'}</td> {/* ✅ Add this */}
        <td className="border p-2">${item.unitPrice?.toFixed(2)}</td>
        <td className="border p-2 text-right">
        ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
        </td>
      </tr>
    ))}
</tbody>

        </table>
      )}
    </div>
  );
}

export default InventoryTable;
