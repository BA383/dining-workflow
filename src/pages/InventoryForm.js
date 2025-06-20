import React, { useState, useCallback } from 'react';
import ScannerComponent from '../Components/ScannerComponent';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import QRCodeLabel from '../Components/QRCodeLabel';
import html2canvas from 'html2canvas';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed


const uploadQRCodeToStorage = async (sku, dataUrl) => {
  const fileName = `labels/${sku}_${Date.now()}.png`;
  const fileBlob = await (await fetch(dataUrl)).blob();
const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data, error } = await supabase.storage
    .from('qrlabels') // ✅ match your bucket name
    .upload(fileName, fileBlob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error(`❌ Failed to upload QR for ${sku}:`, error.message);
    return null;
  }

  return data.path;
};



function InventoryForm() {
 // ✅ Check permissions immediately
  if (!isAdmin() && !isDining()) {
  return (
    <div className="p-6">
      <p className="text-red-600 font-semibold text-lg">
        🚫 Access Denied: Only Admins and Dining staff can access this page.
      </p>
    </div>
  );
}



  const user = JSON.parse(localStorage.getItem('user'));

 const [form, setForm] = useState({
  barcode: '',
  dining_unit: user?.role === 'admin' ? '' : (user?.unit ?? ''),
  email: user?.email || '',
  itemName: '',
  category: '',
  quantity: '',       // ✅ update to match DB column
  unitPrice: '',        // ✅ update to match DB column
  unitMeasure: '',
  location: '',
  dateReceived: '',
  notes: '',
  reorder_level: '',
});


const uploadQRCodeLabel = async (element, barcode) => {
  try {
    const canvas = await html2canvas(element);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    const fileName = `labels/${barcode}_${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('qrlabels')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('❌ QR Label upload failed:', error.message);
      return null;
    }

    console.log('✅ QR Label uploaded to:', data.path);
    return data.path;
  } catch (err) {
    console.error('❌ Error capturing QR label:', err);
    return null;
  }
};
const labelRef = React.useRef();

const [lastRegisteredItem, setLastRegisteredItem] = useState(null);

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
    
    
    if (!form.dining_unit || form.dining_unit === 'Administration') {
  if (user?.role === 'admin') {
    alert('Please select a dining unit before submitting.');
    return;
  } else {
    console.warn('⚠️ Non-admin user is missing a unit unexpectedly.');
  }
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

// Assume you already inserted the item into inventory here...

// ✅ After successful insert, generate and upload QR:
try {
  const qrDataUrl = await QRCode.toDataURL(form.sku);
  const qrPath = await uploadQRCodeToStorage(form.sku, qrDataUrl);

  if (qrPath) {
    const { error: updateError } = await supabase.from('inventory')
      .update({ qr_path: qrPath }) // ✅ Ensure this matches the column in Supabase
      .eq('sku', form.sku)
      .eq('dining_unit', user.unit);

    if (updateError) {
      console.error(`❌ Failed to update qr_path for ${form.sku}:`, updateError.message);
    }
  }
} catch (err) {
  console.error(`QR gen/upload failed for ${form.sku}:`, err);
}





const newItem = {
  sku: form.barcode,
  name: form.itemName,
  category: form.category,
  unit: form.unitMeasure,
  qty_on_hand: toNumber(form.quantity),  // ✅ FIXED: use form.quantity and match DB field
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

if (insertError) {
  alert('❌ Error submitting: ' + insertError.message);
  return;
}

setLastRegisteredItem({
  sku: form.barcode,
  name: form.itemName,
  qty_on_hand: parseInt(form.qty_on_hand, 10) || 0,
  unitPrice: parseFloat(form.unitPrice) || 0,     // ✅ match table schema
  unit: form.unitMeasure,
  location: form.location,
  diningUnit: form.dining_unit,                   // ✅ match database field
  updated_at: new Date().toISOString()
});


await supabase.rpc('set_config', {
  config_key: 'request.unit',
  config_value: form.dining_unit,
});

await supabase.from('inventory_logs').insert([{
  sku: form.barcode,
  name: form.itemName,
  quantity: toNumber(form.quantity), // ✅ use the correct column name
  action: 'register',
  unit: form.unitMeasure,
  location: form.location,
  dining_unit: form.dining_unit,
  email: form.email,
  timestamp: new Date(),
}]);

// ✅ Upload the QR label snapshot to Supabase
const labelPath = await uploadQRCodeLabel(labelRef.current, form.barcode);
console.log("QR Label uploaded to:", labelPath);

// ✅ You can optionally store labelPath in the inventory table if needed

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

  const handleDownloadLabel = async () => {
  if (!labelRef.current) return;
  const canvas = await html2canvas(labelRef.current);
  const link = document.createElement('a');
  link.download = `${form.barcode}_label.png`;
  link.href = canvas.toDataURL();
  link.click();
};

const handlePrintLabel = async () => {
  if (!labelRef.current) return;
  const canvas = await html2canvas(labelRef.current);
  const imgData = canvas.toDataURL();
  const win = window.open('', '_blank');
  win.document.write(`<img src="${imgData}" onload="window.print();window.close()" />`);
  win.document.close();
};

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackToInventoryDashboard />

      <h1 className="text-2xl font-bold mb-4">Register Inventory Item</h1>
      <p className="text-sm text-gray-700 mb-2">
  <strong>Active unit:</strong> {user.unit || 'Not Assigned'}
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
    <option value="Administration">Select Dining Unit</option>
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

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Submit
        </button>

        <button
          type="button"
          onClick={() => {
            setForm({
              barcode: '',
              dining_unit: user?.role === 'admin' ? '' : (user?.unit ?? ''),
              email: user?.email || '',
              itemName: '',
              category: '',
              quantity: '',
              unitPrice: '',
              unitMeasure: '',
              location: '',
              dateReceived: '',
              notes: '',
              reorder_level: '',
            });
            setLastRegisteredItem(null);
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear Fields
        </button>
      </div>
    </form>  {/* ✅ CLOSE FORM HERE */}

    {lastRegisteredItem && (
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">QR Code Label</h3>
        <QRCodeLabel
          ref={labelRef}
          sku={lastRegisteredItem.sku}
          name={lastRegisteredItem.name}
          unit={lastRegisteredItem.unit}
          location={lastRegisteredItem.location}
          diningUnit={lastRegisteredItem.diningUnit}
        />

        <div className="mt-4 flex gap-4">
          <button
            onClick={handleDownloadLabel}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Download Label
          </button>
          <button
            onClick={handlePrintLabel}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
          >
            Print Label
          </button>
        </div>
      </div>
    )}
  </div>
); // ✅ Close the return JSX

}

export default InventoryForm;

