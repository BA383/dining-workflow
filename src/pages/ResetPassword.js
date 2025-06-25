import { supabase } from '../supabaseClient';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async () => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });


const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session) {
  console.error('❌ Failed to get session:', sessionError?.message);
  return;
}


    const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role, unit')
  .eq('email', session?.user?.email)
  .single();

if (!profile || profileError) {
  alert('Password updated, but no profile found. Please contact an admin.');
  return;
}


// ✅ Store enriched user object
const enrichedUser = {
  email: session.user.email,
  role: profile.role,
  unit: profile.unit,
};
localStorage.setItem('user', JSON.stringify(enrichedUser));


    if (error) {
      alert('❌ Failed to reset password: ' + error.message);
    } else {
      alert('✅ Password updated. You can now log in.');
      navigate('/login');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Reset Password</h2>
      <input
        type="password"
        placeholder="New Password"
        className="border p-2 w-full mb-4"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        onClick={handleUpdate}
      >
        Update Password
      </button>
    </div>
  );
}

export default ResetPassword;
