import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom'; // ✅ Make sure this is at the top


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
  setLoading(true);

  try {
const email = form.email.trim();
const password = form.password.trim();
const role = form.role.trim();
const unit = form.unit.trim();


    if (!email || !password || !role) {
      setError('Please fill out all required fields.');
      return;
    }

    if (role === 'dining' && !unit) {
      setError('Dining Services must select a unit.');
      return;
    }

    // ✅ Supabase signUp with correct structure
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://dining-workflow.vercel.app/login' // change for prod
      }
    });

    if (authError || !authData?.user?.id) {
      setError('Signup failed: ' + (authError?.message || 'User ID missing.'));
      return;
    }

   const { data: userData, error: lookupError } = await supabase
  .from('users')  // ⚠️ May need a view if RLS blocks this
  .select('id')
  .eq('email', email)
  .single();

if (lookupError || !userData?.id) {
  setError('Signup succeeded, but could not retrieve user ID. Ask user to confirm email and try logging in.');
  return;
}

const userId = userData.id;


    // ✅ Insert into profiles
    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: userId,
        email,
        role,
        unit: role === 'dining' ? unit : null
      }
    ]);

    if (profileError) {
      console.error('❌ Profile insert error:', profileError.message);
      setError('Signup succeeded but profile creation failed.');
      return;
    }

    setSuccess('✅ Account created! Check your email to confirm.');
    setTimeout(() => navigate('/login'), 3000);
  } finally {
    setLoading(false);
  }
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


{/* 👇 Add this */}
    <p className="text-sm text-center mt-4">
      Already have an account?{' '}
      <Link to="/login" className="text-blue-600 hover:underline">
        Log in here
      </Link>
    </p>
  </div>
);
}

export default SignUp;
