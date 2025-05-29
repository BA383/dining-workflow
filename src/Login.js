import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoleContext } from './UserRoleContext';

function Login() {
  const { login } = useContext(UserRoleContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    unit: '',
    role: ''
  });

  const [error, setError] = useState('');

  const mockUsers = [
    { username: 'admin', password: 'admin123', email: 'admin@cnu.edu', unit: 'Administration', role: 'admin' },
    { username: 'vendorUser', password: 'vendor123', email: 'vendor@biz.com', unit: '', role: 'vendor' },
    { username: 'bizstaff', password: 'bizpass', email: 'staff@office.com', unit: '', role: 'business' },
    { username: 'discoveryUser', password: 'discovery123', email: 'discovery@cnu.edu', unit: 'Discovery', role: 'dining' },
    { username: 'regattasUser', password: 'regattas123', email: 'regattas@cnu.edu', unit: 'Regattas', role: 'dining' },
    { username: 'commonsUser', password: 'commons123', email: 'commons@cnu.edu', unit: 'Commons', role: 'dining' },
    { username: 'paletteUser', password: 'palette123', email: 'palette@cnu.edu', unit: 'Palette', role: 'dining' },
    { username: 'einsteinUser', password: 'einstein123', email: 'einstein@cnu.edu', unit: 'Einstein', role: 'dining' }
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = () => {
    const matched = mockUsers.find(
      (user) =>
        user.username === form.username &&
        user.password === form.password &&
        user.role === form.role
    );

    if (matched) {
      login(matched); // Store full user object
      navigate('/');
    } else {
      setError('Invalid credentials or role mismatch.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Log In</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <input name="username" placeholder="Username" onChange={handleChange} className="border p-2 w-full mb-4" />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} className="border p-2 w-full mb-4" />

      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="border p-2 w-full mb-6"
      >
        <option value="">-- Select Role --</option>
        <option value="admin">Admin</option>
        <option value="dining">Dining Services</option>
        <option value="vendor">Vendor</option>
        <option value="business">Business Office</option>
      </select>

      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Log In</button>
    </div>
  );
}

export default Login;
