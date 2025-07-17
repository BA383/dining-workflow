import { supabase } from '../supabaseClient';

export const logVisit = async (user, page) => {
  if (!user) {
    console.warn('⚠️ User missing – visit not logged.');
    return;
  }

  console.log('📌 Attempting to log visit:', {
    user_id: user.id,
    page: page || window.location.pathname,
  });

  const { error } = await supabase.from('visits').insert([
    {
      user_id: user.id,
      page: page || window.location.pathname,
    }
  ]);

  if (error) {
    console.error('❌ Visit logging failed:', error.message);
  } else {
    console.log('✅ Visit logged successfully');
  }
};
