import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { isAdmin } from '../utils/permissions';
import BackToAdminDashboard from '../BackToAdminDashboard';

export default function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: '', unit: '' });


  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error('❌ Failed to fetch users:', error.message);
    else setUsers(data);
  };

  const handleAddUser = async () => {
  if (!newUser.email || !newUser.role) {
    alert('Email and role are required');
    return;
  }

  // 🔐 Step 1: Set RLS context
  const { error: configError } = await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: 'admin',
    is_local: false
  });

  if (configError) {
    alert('❌ Failed to set admin context: ' + configError.message);
    return;
  }

  // 🔍 Step 2: Get Supabase Auth user ID by email
  const { data: userRecord, error: lookupError } = await supabase
    .from('users') // 👈 You may need a Supabase function/view to expose this if RLS is blocking direct access
    .select('id')
    .eq('email', newUser.email)
    .single();

  if (lookupError || !userRecord) {
    alert('⚠️ Email not found. Ask the user to sign up first.');
    return;
  }

  // ✅ Step 3: Insert into profiles with correct ID
  const { error } = await supabase.from('profiles').insert([{
    id: userRecord.id,
    email: newUser.email,
    role: newUser.role,
    unit: newUser.unit || null
  }]);

  if (error) {
    alert('❌ Failed to add user: ' + error.message);
  } else {
    alert('✅ User added!');
    setNewUser({ email: '', role: '', unit: '' });
    setShowAddModal(false);
    fetchUsers(); // Refresh list
  }
};


  const handleUpdate = async (user) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        role: user.role,
        unit: user.unit,
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Update error:', error.message);
      alert('Update failed.');
    } else {
      alert('✅ User updated!');
      setEditing(null);
      fetchUsers();
    }
  };

  if (!isAdmin()) {
    return <p className="p-6 text-red-600 font-semibold">🚫 Admins only.</p>;
  }




  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToAdminDashboard />
      <h2 className="text-2xl font-bold mb-4">Manage User Roles & Units</h2>

{/* Add User Button */}
<button
  className="mb-4 bg-blue-600 text-white px-4 py-2 rounded shadow"
  onClick={() => setShowAddModal(true)}
>
  + Add User
</button>

{showAddModal && (
  <div className="border p-4 mb-4 rounded bg-gray-50">
    <h3 className="text-lg font-semibold mb-2">New User</h3>
    
    <input
      placeholder="Email"
      value={newUser.email}
      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
      className="border p-2 rounded w-full mb-2"
    />
    
    <select
  value={newUser.role}
  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
  className="border p-2 rounded w-full mb-2"
>
  <option value="">-- Select Role --</option>
  <option value="admin">Admin</option>
  <option value="vendor">Vendor</option>
  <option value="business">Business Office</option>
  <option value="group">CNU Community (Group Form Only)</option>
  <option value="dining">Dining Services</option> {/* 🔥 Dining = parent role */}
</select>

{/* 🔥 Show dining unit dropdown only if role is 'dining' */}
{newUser.role === 'dining' && (
  <select
    value={newUser.unit}
    onChange={(e) => setNewUser({ ...newUser, unit: e.target.value })}
    className="border p-2 rounded w-full mb-2"
  >
    <option value="">-- Assign Dining Unit --</option>
    <option value="Commons">Commons</option>
    <option value="Regattas">Regattas</option>
    <option value="Discovery">Discovery</option>
    <option value="Palette">Palette</option>
    <option value="Einstein">Einstein</option>
  </select>
)}


    <div className="flex gap-2">
      <button onClick={handleAddUser} className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
      <button onClick={() => setShowAddModal(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
    </div>
  </div>
)}

      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Email</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">
                {editing === user.id ? (
                  <select
                    value={user.role}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.id === user.id ? { ...u, role: e.target.value } : u
                        )
                      )
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="dining">Dining</option>
                    <option value="vendor">Vendor</option>
                    <option value="business">Business Office</option>
                    <option value="group">Group Access</option>
                  </select>
                ) : (
                  user.role || '—'
                )}
              </td>
              <td className="border p-2">
                {editing === user.id ? (
                  <select
                    value={user.unit || ''}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.id === user.id ? { ...u, unit: e.target.value } : u
                        )
                      )
                    }
                  >
                    <option value="">-- Select --</option>
                    <option value="Administration">Administration</option>
                    <option value="Regattas">Regattas</option>
                    <option value="Commons">Commons</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Palette">Palette</option>
                    <option value="Einstein">Einstein</option>
                  </select>
                ) : (
                  user.unit || '—'
                )}
              </td>
              <td className="border p-2">
                {editing === user.id ? (
                  <>
                    <button
                      onClick={() => handleUpdate(user)}
                      className="bg-green-600 text-white px-2 py-1 rounded mr-2"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(user.id)}
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
