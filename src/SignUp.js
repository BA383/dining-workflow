import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: '',
    unit: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);



   // ✅ This must be inside the component
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

 const handleSignUp = async () => {
  setError('');
  setSuccess('');

  const { email, password, role, unit } = form;

  if (!email || !password || !role) {
    setError('Please fill out all required fields.');
    return;
  }

  if (role === 'dining' && !unit) {
    setError('Dining staff must select a dining unit.');
    return;
  }

  // ✅ STEP 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp(
    { email, password },
    { emailRedirectTo: 'http://localhost:3000/login' }
  );

  if (authError) {
    setError('Signup failed: ' + authError.message);
    return;
  }

  // ✅ SAFE: Extract userId even if confirmation is off
  const userId = authData.user?.id || authData.session?.user?.id;

  if (!userId) {
    setError('Signup succeeded but user ID was not returned.');
    return;
  }

  // ✅ STEP 2: Set RLS context (optional depending on your Supabase RLS config)
  const { error: configError } = await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: 'public',
    is_local: false
  });

  if (configError) {
    console.error('❌ Failed to set config:', configError.message);
    setError('Signup succeeded, but context setup failed.');
    return;
  }

  // ✅ STEP 3: Insert into `profiles` table
  const { error: profileError } = await supabase.from('profiles').insert([
    {
      id: userId,
      email,
      role,
      unit: role === 'dining' ? unit : null
    }
  ]);

  if (profileError) {
    console.error('Profile insert error:', profileError.message);
    setError('Signup succeeded but failed to create profile.');
    return;
  }

  setSuccess('✅ Account created! Please check your email to confirm.');
  setTimeout(() => navigate('/login'), 3000);
};



  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Sign Up</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {success && <p className="text-green-600 mb-3">{success}</p>}

      <input
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="border p-2 w-full mb-4"
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        className="border p-2 w-full mb-4"
      />

      <select
  name="role"
  value={form.role}
  onChange={handleChange}
  className="border p-2 w-full mb-4"
>
  <option value="">-- Select Role --</option>
  <option value="vendor">Vendor</option>
  <option value="business">Business Office</option>
  <option value="group">CNU Community</option>
  <option value="dining">Dining Services</option> {/* ✅ Add this */}
</select>

{form.role === 'dining' && (
  <select
    name="unit"
    value={form.unit}
    onChange={handleChange}
    className="border p-2 w-full mb-4"
    required
  >
    <option value="">-- Select Dining Unit --</option>
    <option value="Regattas">Regattas</option>
    <option value="Commons">Commons</option>
    <option value="Discovery">Discovery</option>
    <option value="Palette">Palette</option>
    <option value="Einstein">Einstein</option>
  </select>
)}


      <button
  onClick={handleSignUp}
  className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
  disabled={loading}
>
  {loading ? 'Creating Account...' : 'Create Account'}
</button>

    </div>
  );
}

export default SignUp;
