// /src/utils/useUser.js

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user);
    };

    getUser();
  }, []);

  return { user };
}
