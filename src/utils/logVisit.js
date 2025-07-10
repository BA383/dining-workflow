import { supabase } from '../supabaseClient';


export const logVisit = async (user, page) => {
  if (!user) return;

  const { error } = await supabase.from('visits').insert([
    {
      user_id: user.id,
      page: page || window.location.pathname,
    }
  ]);

  if (error) console.error('Visit logging failed:', error);
};
