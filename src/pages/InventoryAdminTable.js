import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function InventoryAdminTable() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-red-600">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const UNIT_OPTIONS = ['Commons', 'Regattas', 'Discovery', 'Palette', 'Einstein'];
  const CATEGORY_OPTIONS = [
    'BAKED GOODS', 'BEVERAGES', 'FRESH BREAD', 'DAIRY PRODUCTS', 'DELI MEATS', 'SEAFOOD',
    'BEEF', 'PORK', 'MEAT', 'POULTRY', 'DRY SPICES', 'FRESH HERBS', 'FRUITS & VEGETABLES',
    'ICE CREAM & SHERBERT', 'DRY PASTA', 'FROZEN GOODS', 'DRY GOODS', 'OTHER'
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('inventory').select('*');
    if (!error) setItems(data);
    else console.error(error);
  };

  const handleChange = (id, field, value) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleUpdate = async (item) => {
    const { id, ...updateFields } = item;
    const { error } = await supabase.from('inventory').update(updateFields).eq('id', id);

    if (error) return alert('Update failed: ' + error.message);

    await supabase.from('inventory_logs').insert([{
  sku: item.sku,
  name: item.name,
  quantity: item.quantity,
  location: item.location,
  action: 'edit',
  dining_unit: user.unit,
  email: user.email,
  timestamp: new Date(),
}]);


    alert('Update successful!');
    setEditingItemId(null);
    fetchItems();
  };

  const handleDelete = async (id, sku, name) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) return alert('Delete failed: ' + error.message);

    await supabase.from('inventory_logs').insert([{
  sku,
  name,
  quantity: item.quantity,     // You may need to pass `item` instead of just id, sku, name
  location: item.location,
  action: 'delete',
  dining_unit: user.unit,
  email: user.email,
  timestamp: new Date(),
}]);


    alert('Item deleted.');
    fetchItems();
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase.from('inventory').delete().in('id', selectedItems);
    if (error) return alert('Bulk delete failed: ' + error.message);

    const deletedItems = items.filter(item => selectedItems.includes(item.id));
    const logs = deletedItems.map(item => ({
      sku: item.sku,
      name: item.name,
      action: 'bulk delete',
      dining_unit: user.unit,
      email: user.email,
      timestamp: new Date(),
    }));

    await supabase.from('inventory_logs').insert(logs);
    alert('Selected items deleted.');
    setSelectedItems([]);
    fetchItems();
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Inventory Management</h1>

      {selectedItems.length > 0 && (
        <button
          onClick={handleBulkDelete}
          className="mb-4 bg-red-500 text-white px-4 py-2 rounded"
        >
          Delete Selected ({selectedItems.length})
        </button>
      )}

      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Select</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">Unit Price</th>
            <th className="border p-2">Notes</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
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
                  value={item.quantity || 0}
                  onChange={(e) => handleChange(item.id, 'quantity', e.target.value)}
                  className="w-full"
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
                <input
                  type="number"
                  value={item.unitPrice || 0}
                  onChange={(e) => handleChange(item.id, 'unitPrice', e.target.value)}
                  className="w-full"
                />
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
                  onClick={() => handleDelete(item.id, item.sku, item.name)}
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
