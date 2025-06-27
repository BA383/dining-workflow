import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed
import { getCurrentUser } from '../utils/userSession';
import QRCodeLabel from '../Components/QRCodeLabel';
import jsPDF from 'jspdf';


const { data, error } = await supabase.from('inventory').select('*');

const uploadQRCodeToStorage = async (sku, dataUrl) => {
  try {
    const fileName = `labels/${sku}_${Date.now()}.png`;
    const fileBlob = await (await fetch(dataUrl)).blob();

    const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
  console.error('❌ No valid Supabase session found');
  return null;
}

console.log('🔐 Supabase session:', session); // ✅ Log session info


    const { data, error } = await supabase.storage
      .from('qrlabels')
      .upload(fileName, fileBlob, {
        contentType: 'image/png',
        upsert: true,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

    if (error) {
      console.error(`❌ QR upload failed for SKU: ${sku}`, error.message);
      return null;
    }

    console.log(`✅ QR uploaded: ${data.path}`);
    return data.path;
  } catch (err) {
    console.error(`🔥 Unexpected QR upload failure for ${sku}:`, err);
    return null;
  }
};

const ALL_UNITS = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein', 'Administration'];

function InventoryTable() {
  const [user, setUser] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState({});
  const [collapsedUnits, setCollapsedUnits] = useState({});
  const [lastUploadedItems, setLastUploadedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const qrSectionRef = useRef(null);

  // 👍 useEffect and other logic follow here


const fetchItems = async (user) => {
  if (!user || !user?.role || !user?.unit) {
    console.warn('❗ fetchItems aborted: missing user info');
    return;
  }

  let query = supabase.from('inventory').select('*');

  if (user?.role === 'admin' && selectedUnit !== 'Administration') {
    query = query.eq('dining_unit', selectedUnit);
  } else if (user?.role === 'dining') {
    query = query.eq('dining_unit', user?.unit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching inventory:', error.message);
    return;
  }

  setItems(data);

  if (user?.role === 'admin' && selectedUnit === 'Administration') {
    const grouped = data.reduce((acc, item) => {
      acc[item.dining_unit] = acc[item.dining_unit] || [];
      acc[item.dining_unit].push(item);
      return acc;
    }, {});

    setGroupedItems(grouped);
    setCollapsedUnits(
      Object.fromEntries(Object.keys(grouped).map(unit => [unit, true]))
    );
  }
};

// ✅ NOW SAFE: fetchItems is declared before this
useEffect(() => {
  const init = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser?.unit || !currentUser?.role) {
      console.warn('❗ Missing user, unit, or role');
      return;
    }

    setUser(currentUser);
    setSelectedUnit(currentUser?.unit);

    const [{ error: unitError }, { error: roleError }] = await Promise.all([
      supabase.rpc('set_config', {
        config_key: 'request.unit',
        config_value: currentUser?.unit,
        is_local: false
      }),
      supabase.rpc('set_config', {
        config_key: 'request.role',
        config_value: currentUser?.role,
        is_local: false
      })
    ]);

    if (unitError) console.error('❌ set_config request.unit failed:', unitError.message);
    if (roleError) console.error('❌ set_config request.role failed:', roleError.message);

    fetchItems(currentUser);
  };


  init();
}, []);


useEffect(() => {
  const shouldFetch = user && selectedUnit;

  if (shouldFetch) {
    fetchItems(user);
  }
}, [user, selectedUnit]);

if (!user) {
return <p className="p-4 text-red-600">Loading user data...</p>;
//}


  let query = supabase.from('inventory').select('*');

  if (user?.role === 'admin' && selectedUnit !== 'Administration') {
    query = query.eq('dining_unit', selectedUnit);
  } else if (user?.role === 'dining') {
    query = query.eq('dining_unit', user?.unit);
  }

 
  if (error) {
    console.error('❌ Error fetching inventory:', error.message);
    return;
  }


  setItems(data);

  if (user?.role === 'admin' && selectedUnit === 'Administration') {
    const grouped = data.reduce((acc, item) => {
      acc[item.dining_unit] = acc[item.dining_unit] || [];
      acc[item.dining_unit].push(item);
      return acc;
    }, {});

    setGroupedItems(grouped);
    setCollapsedUnits(
      Object.fromEntries(Object.keys(grouped).map(unit => [unit, true]))
    );
  }
};

const generatePdfWithQRCodes = async () => {
  const pdf = new jsPDF();
  let x = 10;
  let y = 10;

  for (const item of lastUploadedItems) {
    try {
      const qrDataUrl = await QRCode.toDataURL(item.sku);
      pdf.addImage(qrDataUrl, 'PNG', x, y, 40, 40);

      // Details below the QR
      const details = [
        `Name: ${item.name || 'Unnamed'}`,
        `SKU: ${item.sku || '-'}`,
        `Unit: ${item.unit || '-'}`,
        `Location: ${item.location || '-'}`,
        `Dining Unit: ${item.dining_unit || '-'}`
      ];

      details.forEach((line, i) => {
        pdf.text(line, x, y + 50 + i * 6); // Slight vertical spacing per line
      });

      y += 90; // Move down for next item
      if (y > 250) {
        y = 10;
        pdf.addPage();
      }
    } catch (err) {
      console.error(`❌ Failed to generate QR for ${item.sku}`, err);
    }
  }

  pdf.save('QR_Labels.pdf');
};



// ✅ Define here — clean, top-level
const parseAndUpload = (rawRows, user) => {
  const normalized = rawRows.map((row) => {
    const cleaned = {};
    for (const key in row) {
      const normalizedKey = key.trim().toLowerCase().replace(/ /g, '_');
      let value = row[key];

      if (['sku'].includes(normalizedKey)) {
        cleaned['sku'] = String(value || '').trim();
        continue;
      }

      if (normalizedKey === 'unit_price') {
        value = parseFloat(String(value).replace(/[$,]/g, '')) || 0;
      }

      if (['quantity', 'qty', 'qty_on_hand'].includes(normalizedKey)) {
        cleaned['qty_on_hand'] = Number(value) || 0;
        continue;
      }

      if (['item_name', 'name'].includes(normalizedKey)) {
        cleaned['name'] = String(value || '').trim();
        continue;
      }

      cleaned[normalizedKey] = value;
    }

    cleaned['dining_unit'] =
      cleaned['dining_unit'] || (user?.role === 'admin' ? selectedUnit : user?.unit);
    cleaned['updated_at'] = new Date().toISOString();

    return cleaned;
  });

  processUploadRows(normalized, user);
};


const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    if (!user) {
      console.warn('❗ Cannot process upload — user not loaded');
      return;
    }

    let rows = [];

    // ✅ Correctly calling with user
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          rows = results.data;
          parseAndUpload(rows, user); // ✅ FIXED HERE
        }
      });
    } else if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet);
      parseAndUpload(rows, user); // ✅ FIXED HERE
    } else {
      console.error('❌ Unsupported file type');
    }
  };

  if (file.name.endsWith('.xlsx')) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsText(file);
  }
};

const processUploadRows = async (rows, user) => {
  const transformedRows = rows.map((row) => {
    const rawSku = row.sku || row.SKU || '';
    const qty = Number(row.qty_on_hand || row.qty || row.quantity || 0);
    const unitPrice = parseFloat(String(row.unit_price || '').replace(/[$,]/g, '')) || 0;
    const name = row.name || row.item_name;

    return {
      sku: typeof rawSku === 'string' ? rawSku.trim() : '',
      name: name?.trim(),
      category: row.category || '',
      unit: row.unit || '',
      quantity: qty,
      unitPrice: unitPrice,
      extendedPrice: qty * unitPrice,
      location: row.location || '',
      reorder_level: Number(row.reorder_level || 0),
      notes: row.notes || '',
      dining_unit: user?.role === 'admin' ? row.dining_unit?.trim() || user?.unit : user?.unit,
      qty_on_hand: qty,
      updated_at: new Date().toISOString(),
      user_email: user.email || '',
    };
  });

// Step 1: Merge uploaded items with existing inventory entries
const mergedRows = await Promise.all(
  transformedRows.map(async (newItem) => {
    const { data: existing, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('sku', newItem.sku)
      .eq('dining_unit', newItem.dining_unit)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching existing item:', error.message);
      return newItem; // fallback to original if fetch fails
    }

    if (existing) {
      const mergedQty = (existing.qty_on_hand || 0) + (newItem.qty_on_hand || 0);
      const unitPrice = newItem.unitPrice || existing.unitPrice || 0;

      return {
        ...existing,
        ...newItem,
        qty_on_hand: mergedQty,
        extendedPrice: mergedQty * unitPrice,
        updated_at: new Date().toISOString(),
      };
    }

    return newItem; // item didn't exist yet
  })
);

// Step 2: Upsert the merged inventory
const { error: upsertError } = await supabase
  .from('inventory')
  .upsert(mergedRows, { onConflict: ['sku', 'dining_unit'] });

if (upsertError) {
  console.error('❌ Merge upsert error:', upsertError.message);
  alert('Error saving inventory!');
} else {
  alert('✅ Inventory successfully merged and saved!');
}



  if (error) {
    console.error('❌ Upload error:', error.message);
    alert('Error uploading inventory: ' + error.message);
    return;
  } else {
    alert('✅ Inventory uploaded successfully!');
    fetchItems(user);
    setLastUploadedItems(transformedRows);
    setTimeout(() => {
      qrSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  console.log('🟢 Starting QR generation for:', transformedRows.map(r => r.sku));

  const zip = new JSZip();

  await Promise.all(
    transformedRows.map(async (item) => {
      if (!item.sku || typeof item.sku !== 'string' || item.sku.trim() === '') {
        console.warn(`⚠️ Skipping item due to missing SKU`, item);
        return;
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(item.sku);

        // ✅ Upload QR to Supabase Storage
        const qrPath = await uploadQRCodeToStorage(item.sku, qrDataUrl);

        if (qrPath) {
          const { error: updateError } = await supabase.from('inventory')
            .update({ qr_path: qrPath })
            .eq('sku', item.sku)
            .eq('dining_unit', item.dining_unit);

          if (updateError) {
            console.error(`❌ Failed to update qr_path for ${item.sku}:`, updateError.message);
          } else {
            console.log(`✅ qr_path saved for ${item.sku}`);
          }
        } else {
          console.warn(`⚠️ No qrPath returned for ${item.sku}`);
        }

        // ✅ Add QR to ZIP
        const base64 = qrDataUrl.split(',')[1];
        zip.file(`${item.sku}.png`, base64, { base64: true });

      } catch (err) {
        console.error(`❌ QR generation/upload failed for ${item.sku}`, err);
      }
    })
  );

  // ✅ Trigger ZIP download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'Inventory_QRCodes.zip');

  // ✅ Upload to inventory_logs
  const logs = transformedRows.map(item => ({
    sku: item.sku,
    name: item.name,
    quantity: Math.round(Number(item.qty_on_hand) || 0),
    action: 'upload',
    location: item.location || '',
    dining_unit: item.dining_unit,
    email: user.email || '',
    notes: item.notes || '',
    timestamp: new Date(),
  }));

  const { error: logError } = await supabase.from('inventory_logs').insert(logs);
  if (logError) console.error('⚠️ Log upload error:', logError.message);

  alert('✅ Inventory uploaded and logged successfully!');
  fetchItems(user);
};

const uploadToSupabase = async (rows) => {
  // Normalize keys: trim spaces, lowercase
 rows = rows.map(row => {
  const normalized = {};
  for (const key in row) {
    const cleanKey = key.trim().toLowerCase();
    switch (cleanKey) {
      case 'item name':
        normalized.name = row[key];
        break;
      case 'unit price':
        normalized.unitPrice = parseFloat(String(row[key]).replace(/[$,]/g, '')) || 0;
        break;
      case 'quantity':
      case 'qty':
      case 'qty on hand':
        normalized.qty_on_hand = Number(row[key]) || 0;
        break;
      case 'dining unit':
        normalized.dining_unit = row[key];
        break;
      case 'reorder level':
        normalized.reorder_level = Number(row[key]) || 0;
        break;
      case 'sku':
      case 'category':
      case 'unit':
      case 'location':
      case 'notes':
        normalized[cleanKey.replace(/ /g, '_')] = row[key];
        break;
      default:
        normalized[cleanKey.replace(/ /g, '_')] = row[key];
    }
  }
  normalized.updated_at = new Date().toISOString();
  return normalized;
});



  const formatted = rows.map(row => {
    const qty = Number(row.qty_on_hand || row.qty || row.quantity || 0);
    const unitPrice = Number(String(row['unit price'] || 0).replace(/[$,]/g, ''));
    const reorder_level = Number(row['reorder level'] || 0);

    return {
      name: row['item name'] || row.name || '',
      sku: row['sku'] || '',
      category: row['category'] || '',
      quantity: qty, // ✅ use the actual defined variable
      unitPrice,
      extendedPrice: qty * unitPrice,
      expiration: row['expiration'] ? new Date(row['expiration']).toISOString().split('T')[0] : null,
      date_received: row['date received'] ? new Date(row['date received']).toISOString().split('T')[0] : null,
      reorder_level,
      location: row['LOCATION'] || row['Location'] || row.location || '',
      unitlocation: row['unit location'] || '',
      notes: row['notes'] || '',
      dining_unit: row['Dining Unit']?.trim() || (user?.role === 'admin' ? selectedUnit : user?.unit) || 'Unknown',


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
  fetchItems(user); // ✅ Explicitly pass the logged-in user


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



const openQRCodeWindow = () => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('Pop-up blocked. Please allow pop-ups for this site.');
    return;
  }

  newWindow.document.write(`
    <html>
      <head>
        <title>QR Codes</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .qr-label {
            margin-bottom: 30px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 10px;
            width: fit-content;
          }
          .qr-label img {
            margin-top: 10px;
            display: block;
          }
        </style>
      </head>
      <body>
        <h2>📦 QR Code Labels for Uploaded Items</h2>
        ${lastUploadedItems.map(item => `
          <div class="qr-label">
            <strong>${item.name || 'Unnamed Item'}</strong><br/>
            <span><strong>SKU:</strong> ${item.sku}</span><br/>
            <span><strong>Unit:</strong> ${item.unit || '-'}</span><br/>
            <span><strong>Location:</strong> ${item.location || '-'}</span><br/>
            <span><strong>Dining Unit:</strong> ${item.dining_unit || '-'}</span>
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${item.sku}&size=120x120" alt="${item.sku}" />
          </div>
        `).join('')}
      </body>
    </html>
  `);
  newWindow.document.close();
};




const openQrPopup = (item) => {
  const popup = window.open('', '_blank', 'width=400,height=550');
  if (!popup) return;

  popup.document.write(`
    <html>
      <head>
        <title>QR Code for ${item.name || item.sku}</title>
        <style>
  body {
    font-family: sans-serif;
    text-align: center;
    padding: 20px;
    font-size: 14px;
  }

  h2 {
    font-size: 14px;
    margin-bottom: 10px;
  }

  img {
    margin-bottom: 20px;
    max-width: 200px;
    height: auto;
  }

  p {
    margin: 4px 0;
  }

  button {
    margin-top: 20px;
    padding: 8px 16px;
    font-size: 14px;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    background-color: #1e40af;
  }

  @media print {
    button {
      display: none; /* Hide print button when printing */
    }
  }
</style>

      </head>
      <body>
        <h2>${item.name || 'Unnamed Item'}</h2>
        <img src="https://xsnvzidsrlrsgiqhbfaz.supabase.co/storage/v1/object/public/qrlabels/${item.qr_path}" alt="QR Code" />
        <p><strong>SKU:</strong> ${item.sku}</p>
        <p><strong>Unit:</strong> ${item.unit || 'N/A'}</p>
        <p><strong>Location:</strong> ${item.location || 'N/A'}</p>
        <p><strong>Dining Unit:</strong> ${item.dining_unit || 'N/A'}</p>

        <button onclick="window.print()">🖨️ Print</button>
      </body>
    </html>
  `);

  popup.document.close();
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

  // ✅ Helper function
const renderChart = (data) => {
  const categoryTotals = data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.qty_on_hand);
    return acc;
  }, {});

  const chartData = Object.entries(categoryTotals).map(([category, qty_on_hand]) => ({
    category,
    qty_on_hand
  }));


  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="qty_on_hand" fill="#60a5fa" />
      </BarChart>
    </ResponsiveContainer>
  );
};





// ✅ This is now your main InventoryTable() component return:
return (

  <div className="p-6">
    <BackToInventoryDashboard />
    <h2 className="text-xl font-bold mb-4">
      Master Inventory View — {user?.role === 'admin'
        ? (selectedUnit === 'Administration' ? 'All Units' : selectedUnit)
        : user?.unit}
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

{lastUploadedItems.length > 0 && (
  <div ref={qrSectionRef} className="mt-10 border-t pt-6">
    <h2 className="text-xl font-semibold mb-4">📦 QR Code Labels for Uploaded Items</h2>

    <button
      onClick={openQRCodeWindow}
      className="mb-4 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
    >
      🖥️ Open QR Preview in New Window
    </button>

    <button
      onClick={generatePdfWithQRCodes}
      className="mb-4 ml-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
    >
      📄 Generate PDF with QR Codes
    </button>
  </div>
)}

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

          const totalQty = filteredItems.reduce((sum, i) => sum + (i.qty_on_hand || 0), 0);
          const totalVal = filteredItems.reduce((sum, i) => sum + (i.qty_on_hand || 0) * (i.unitPrice || 0), 0);


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
    <th className="border p-2">QR Code</th> {/* ✅ Add this */}
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
  <td className="border p-2">
  {item.qr_path ? (

   <button
  onClick={() => openQrPopup(item)}
  className="text-blue-600 underline"
>
  View QR
</button>

  ) : (
    <span className="text-gray-400">No QR</span>
  )}
</td>



                          <td className="border p-2">{item.category || '-'}</td>
                          <td className="border p-2">{item.qty_on_hand}</td>
                          <td className="border p-2">{item.dining_unit}</td>
                          <td className="border p-2">{item.location || '-'}</td>
                          <td className="border p-2">${Number(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="border p-2 text-right">
                          ${((item.qty_on_hand || 0) * (item.unitPrice || 0)).toFixed(2)}
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
    <th className="border p-2">Location</th>
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
        <td className="border p-2">{item.qty_on_hand}</td>
        <td className="border p-2">{item.dining_unit}</td>
        <td className="border p-2">{item.location || '-'}</td> {/* ✅ Add this */}
        <td className="border p-2">${item.unitPrice?.toFixed(2)}</td>
        <td className="border p-2 text-right">
        ${((item.qty_on_hand || 0) * (item.unitPrice || 0)).toFixed(2)}
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
