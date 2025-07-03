// src/components/AuthGate.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthGate({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
      } else {
        setChecking(false);
      }
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login', { replace: true });
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div className="p-4 text-center">🔒 Verifying access...</div>;
  }

  return <>{children}</>;
}
