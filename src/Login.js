import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoleContext } from './UserRoleContext';
import { supabase } from './supabaseClient';




function Login() {
  const { login } = useContext(UserRoleContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleLogin = async (e) => {  // ✅ UPDATED LINE
  e.preventDefault();               // ✅ NEW LINE
  setError('');
  const { email, password } = form;

  // Step 1: Sign in with Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authUser) {
    console.error('❌ Login failed:', authError?.message);
    setError('Invalid email or password.');
    return;
  }

  // Step 2: Fetch profile metadata (role and unit)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, unit')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    console.error('❌ Failed to fetch profile:', profileError?.message);
    setError('Login succeeded, but user profile is missing.');
    return;
  }

  // Step 3: Store enriched user in localStorage and context
  const enrichedUser = {
    email: authUser.email,
    role: profile.role,
    unit: profile.unit
  };

  localStorage.setItem('user', JSON.stringify(enrichedUser));
  login(enrichedUser); // from UserRoleContext
  navigate('/');
};


const handleForgotPassword = async () => {
  if (!form.email) {
    setError('Please enter your email before resetting.');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
    redirectTo: 'http://localhost:3000/reset-password' // change for production
  });

  if (error) {
    console.error('❌ Password reset failed:', error.message);
    setError('Reset email failed. Try again later.');
  } else {
    alert('📬 Password reset email sent. Check your inbox.');
  }
};



  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Log In</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleLogin}>
        <input
          name="email"
          type="email"
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

        <p
          className="text-sm text-blue-600 hover:underline cursor-pointer mt-2"
          onClick={handleForgotPassword}
        >
          Forgot password?
        </p>

        <button
          type="submit" // ✅ Submit type button
          className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-4"
        >
          Log In
        </button>
      </form>
    </div>
  );
}

export default Login;