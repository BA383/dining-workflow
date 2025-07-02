import { supabase } from '../supabaseClient';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Step 1: Read token from URL and set session
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({
          access_token,
          refresh_token,
        })
        .then(({ error }) => {
          if (error) {
            console.error('❌ Failed to set session:', error.message);
            setErrorMsg('Could not verify reset token. Try again.');
          } else {
            setSessionReady(true);
          }
        });
    } else {
      setErrorMsg('Missing reset token in URL. Try the link again.');
    }
  }, []);

  const handleUpdate = async () => {
    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setErrorMsg('Failed to update password: ' + updateError.message);
      return;
    }

    // Optional: enrich session from profile table
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (session) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, unit')
        .eq('id', session.user.id)
        .single();

      if (profile && !profileError) {
        localStorage.setItem(
          'user',
          JSON.stringify({
            email: session.user.email,
            role: profile.role,
            unit: profile.unit,
          })
        );
      }
    }

    alert('✅ Password updated! You can now log in.');
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Reset Password</h2>

      {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

      {sessionReady && (
        <>
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
        </>
      )}
    </div>
  );
}

export default ResetPassword;
