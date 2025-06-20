import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin } from '../utils/permissions';
import { getCurrentUser } from '../utils/userSession';

function InventoryAdminTable() {
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);


  const [unitFilter, setUnitFilter] = useState('All'); // ✅ Make sure this line is here
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;



const fetchItems = async () => {
  let query = supabase.from('inventory').select('*');

  if (unitFilter !== 'All') {
    query = query.eq('dining_unit', unitFilter);
  }

  const { data, error } = await query;

  if (!error) setItems(data);
  else console.error(error);
};

useEffect(() => {
  fetchItems();
}, [unitFilter]);



  useEffect(() => {
    async function fetchUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setSelectedUnit(currentUser?.unit || '');
    }
    fetchUser();
  }, []);


  if (!isAdmin()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Access Denied: Admins only.</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-red-600">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  // ✅ Then return your actual table below...
}



 const handleQtyChange = (index, value) => {
  const updatedItems = [...items];
  updatedItems[index].qty_on_hand = Number(value);
  setItems(updatedItems);
};


  const UNIT_OPTIONS = ['Commons', 'Regattas', 'Discovery', 'Palette', 'Einstein'];
  const CATEGORY_OPTIONS = [
    'BAKED GOODS', 'BEVERAGES', 'FRESH BREAD', 'DAIRY PRODUCTS', 'DELI MEATS', 'SEAFOOD',
    'BEEF', 'PORK', 'MEAT', 'POULTRY', 'DRY SPICES', 'FRESH HERBS', 'FRUITS & VEGETABLES',
    'ICE CREAM & SHERBERT', 'DRY PASTA', 'FROZEN GOODS', 'DRY GOODS', 'OTHER'
  ];

  const handleChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleUpdate = async (item) => {
    await supabase.rpc('set_config', {
      config_key: 'request.unit',
      config_value: item.dining_unit || user.unit,
    });

    const { id, ...updateFields } = item;
    const { error } = await supabase.from('inventory').update(updateFields).eq('id', id);

    if (error) return alert('Update failed: ' + error.message);

const { error: logError } = await supabase.from('inventory_logs').insert([{
  sku: item.sku,
  name: item.name,
  quantity: item.quantity ?? item.qty_on_hand ?? 0,
  location: item.location || '',
  category: item.category || '',
  unit: item.unit || '',
  action: 'edit',
  dining_unit: item.dining_unit || user.unit,
  email: user.email || '',
  timestamp: new Date(),
}]);


    if (logError) console.error('Log insert error:', logError.message);

    alert('Update successful!');
    setEditingItemId(null);
    fetchItems();
  };




const handleDelete = async (id) => {
  const item = items.find(i => i.id === id);
  if (!item) {
    console.warn('⚠️ Item not found for deletion');
    return;
  }

  console.log('🧩 Full item before delete:', item);

  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: item.dining_unit || user.unit,
  });

  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) {
    alert('Delete failed: ' + error.message);
    return;
  }

  const logEntry = {
    sku: item.sku,
    name: item.name,
    quantity: item.quantity ?? item.qty_on_hand ?? 0,
    location: item.location || '',
    category: item.category || '',
    unit: item.unit || '',
    action: 'delete',
    dining_unit: item.dining_unit || user.unit,
    email: user.email || '',
    timestamp: new Date(),
  };

  console.log('🪵 Attempting to log delete:', logEntry);

  const { error: logError } = await supabase.from('inventory_logs').insert([logEntry]);

  if (logError) {
    console.error('❌ Log insert failed:', logError.message);
  } else {
    console.log('✅ Log successfully inserted for deletion');
  }

  alert('Item deleted.');
  fetchItems();
};

const handleBulkDelete = async () => {
  const deletedItems = items.filter(item => selectedItems.includes(item.id));
  if (deletedItems.length === 0) {
    console.warn('⚠️ No items selected for bulk delete');
    return;
  }

  console.log('📦 Deleting items:', deletedItems);

  const unitForConfig = deletedItems[0]?.dining_unit || user.unit;

  await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: unitForConfig,
  });

  const { error } = await supabase.from('inventory')
    .delete()
    .in('id', selectedItems);

  if (error) {
    alert('Bulk delete failed: ' + error.message);
    return;
  }

  const logs = deletedItems.map(item => {
    const log = {
      sku: item.sku,
      name: item.name,
      quantity: Math.round(Number(item.quantity ?? item.qty_on_hand ?? 0)),
      location: item.location || '',
      category: item.category || '',
      unit: item.unit || '',
      action: 'bulk delete',
      dining_unit: item.dining_unit || user.unit,
      email: user.email || '',
      timestamp: new Date(),
    };
    console.log('🪵 Log entry for bulk delete:', log);
    return log;
  });

  const { error: logError } = await supabase.from('inventory_logs').insert(logs);
  if (logError) {
    console.error('❌ Logging bulk delete failed:', logError.message);
  } else {
    console.log('✅ Bulk delete logs inserted');
  }

  alert('Selected items deleted.');
  setSelectedItems([]);
  fetchItems();
};

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );


  return (
    <div className="p-6">
    <BackToInventoryDashboard />  
      <h1 className="text-2xl font-bold mb-4">Admin Inventory Management</h1>

      {selectedItems.length > 0 && (
        <button
          onClick={handleBulkDelete}
          className="mb-4 bg-red-500 text-white px-4 py-2 rounded"
        >
          Delete Selected ({selectedItems.length})
        </button>
      )}
<div className="flex justify-between items-center mb-4">
  <div>
    <label className="mr-2 font-medium">Filter by Dining Unit:</label>
    <select
      value={unitFilter}
      onChange={(e) => {
        setUnitFilter(e.target.value);
        setCurrentPage(1); // reset page when unit changes
      }}
      className="border p-1 rounded"
    >
      <option value="All">All</option>
      {UNIT_OPTIONS.map(unit => (
        <option key={unit} value={unit}>{unit}</option>
      ))}
    </select>
  </div>
  <div className="flex gap-2 items-center">
    <button
      disabled={currentPage === 1}
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      ◀ Prev
    </button>
    <span className="text-sm">
      Page {currentPage} of {Math.ceil(items.length / rowsPerPage)}
    </span>
    <button
      disabled={currentPage === Math.ceil(items.length / rowsPerPage)}
      onClick={() => setCurrentPage(prev => prev + 1)}
      className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      Next ▶
    </button>
  </div>
</div>
      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Select</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Dining Unit</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">Unit Price</th>
            <th className="border p-2">Notes</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items
  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  .map((item, i) => (
  <tr key={item.id}>
              <td className="border p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                />
              </td>
              <td className="border p-2">
                <input
                  value={item.name || ''}
                  onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                  className="w-full"
                />
              </td>
              <td className="border p-2">
                <input
                  value={item.sku || ''}
                  onChange={(e) => handleChange(item.id, 'sku', e.target.value)}
                  className="w-full"
                />
              </td>
              <td className="border p-2">
                <select
                  value={item.category || ''}
                  onChange={(e) => handleChange(item.id, 'category', e.target.value)}
                  className="w-full"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
  <input
    type="number"
    value={item.qty_on_hand || 0 }
    onChange={(e) => handleQtyChange(i, e.target.value)}
    className="w-full text-right"
  />
</td>
              <td className="border p-2">
                <select
                  value={item.dining_unit || ''}
                  onChange={(e) => handleChange(item.id, 'dining_unit', e.target.value)}
                  className="w-full"
                >
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
                <select
                  value={item.location || ''}
                  onChange={(e) => handleChange(item.id, 'location', e.target.value)}
                  className="w-full"
                >
                  <option value="">Select</option>
                  <option value="Dry">Dry</option>
                  <option value="Refer">Refer</option>
                  <option value="Freezer">Freezer</option>
                  <option value="Storage Room">Other</option>
                </select>
              </td>
              <td className="border p-2">
  <div className="flex items-center">
    <span className="mr-1 text-gray-500">$</span>
    <input
      type="number"
      value={item.unitPrice || 0}
      onChange={(e) => handleChange(item.id, 'unitPrice', e.target.value)}
      className="w-full"
    />
  </div>
</td>
              <td className="border p-2">
                <input
                  value={item.notes || ''}
                  onChange={(e) => handleChange(item.id, 'notes', e.target.value)}
                  className="w-full"
                />
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleUpdate(item)}
                  className="text-green-600 hover:underline mr-2"
                >
                  Save
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryAdminTable;
