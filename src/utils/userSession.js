import { supabase } from '../supabaseClient';

export async function getCurrentUser() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('unit, role')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch user profile:', error.message);
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    unit: profile.unit,
    role: profile.role
  };
}

// ✅ Add this so it can be used in InventoryTable
export async function setRLSContext(unit, role) {
  const { error: unitError } = await supabase.rpc('set_config', {
    config_key: 'request.unit',
    config_value: unit,
    is_local: false
  });

  const { error: roleError } = await supabase.rpc('set_config', {
    config_key: 'request.role',
    config_value: role,
    is_local: false
  });

  if (unitError) console.error('❌ Failed to set RLS unit:', unitError.message);
  if (roleError) console.error('❌ Failed to set RLS role:', roleError.message);
}
