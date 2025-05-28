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

    // Log the edit
    await supabase.from('inventory_logs').insert([{
      sku: item.sku,
      name: item.name,
      action: 'edit',
      unit: user.unit,
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

    // Log the delete
    await supabase.from('inventory_logs').insert([{
      sku,
      name,
      action: 'delete',
      unit: user.unit,
      email: user.email,
      timestamp: new Date(),
    }]);

    alert('Item deleted.');
    fetchItems();
  };

  if (user?.role !== 'admin') {
    return <p className="text-red-600">Unauthorized: Admins only.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Inventory Management</h1>

      <table className="w-full text-sm border border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Item</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">Unit Price</th>
            <th className="border p-2">Notes</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
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
                <input
                  value={item.category || ''}
                  onChange={(e) => handleChange(item.id, 'category', e.target.value)}
                  className="w-full"
                />
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
                <input
                  value={item.unit || ''}
                  onChange={(e) => handleChange(item.id, 'unit', e.target.value)}
                  className="w-full"
                />
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
