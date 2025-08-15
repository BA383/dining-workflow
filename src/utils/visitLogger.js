// src/utils/visitLogger.js
// This utility file page is used to track visits of users to different pages in the application. 
// src/utils/visitLogger.js
import { supabase } from '.././supabaseClient';

/**
 * Logs a user's page visit into the `visits` table.
 * @param {object} user - The Supabase user object (must include id and email)
 * @param {string} page - The path visited (optional; defaults to current URL path)
 */
export const logVisit = async (user, page) => {
  if (!user) {
    console.warn('⚠️ User missing – visit not logged.');
    return;
  }

  const { id, email } = user;

  console.log('📌 Logging visit:', {
    user_id: id,
    email,
    page: page || window.location.pathname,
  });

  const { error } = await supabase.from('visits').insert([
    {
      user_id: id,
      email,
      page: page || window.location.pathname,
    }
  ]);

  if (error) {
    console.error('❌ Visit logging failed:', error.message);
  } else {
    console.log('✅ Visit logged successfully');
  }
};