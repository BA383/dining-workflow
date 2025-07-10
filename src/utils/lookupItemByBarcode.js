import { supabase } from '../supabaseClient';

export const lookupItemByBarcode = async (barcode) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('item_code', barcode)
    .single();

  if (error) {
    console.error('Item lookup failed:', error);
    return null;
  }

  return data;
};
