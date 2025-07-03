// src/components/AuthGate.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthGate({ children }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Step 1: Check if a session exists
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        navigate('/login', { replace: true }); // use replace to avoid back button issues
      } else {
        setLoading(false);
      }
    };

    checkSession();

    // Step 2: Listen for changes in session (auth state)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    // Cleanup listener
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [navigate]); // ✅ Include navigate in dependency array

  if (loading) return <div className="p-4 text-center">🔐 Checking login status...</div>;

  return <>{children}</>;
}
