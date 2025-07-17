// src/Components/PageTracker.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { logVisit } from '../utils/visitLogger';

export default function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user) {
        console.log('✅ User found for visit tracking:', user);
        await logVisit(user, location.pathname);
      } else {
        console.warn('❌ No user found for visit tracking.');
      }

      if (error) {
        console.error('❌ Error getting session:', error.message);
      }
    };

    track();
  }, [location]);

  return null; // nothing rendered
}
