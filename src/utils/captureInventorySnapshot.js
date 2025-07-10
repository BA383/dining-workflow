import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';

export async function captureEndingSnapshot(unit) {
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');
  const currentMonth = yesterday.format('MMM').toUpperCase();
  const currentYear = yesterday.year();

  // Fetch inventory items with unit pricing
  const { data: inventoryItems, error } = await supabase
    .from('inventory')
    .select('qty_on_hand, unitPrice')
    .eq('dining_unit', unit);

  if (error) {
    console.error('Error fetching inventory:', error.message);
    return { success: false, message: error.message };
  }

  // Calculate total inventory value
  const totalValue = inventoryItems.reduce((sum, item) => {
    const qty = parseFloat(item.qty_on_hand) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  // Insert ending snapshot for current month
  const { error: insertError } = await supabase.from('inventory_snapshots').insert({
    unit,
    month: currentMonth,
    year: currentYear,
    type: 'ending',
    amount: totalValue,
  });

  if (insertError) {
    console.error('Error inserting ending snapshot:', insertError.message);
    return { success: false, message: insertError.message };
  }

  // Insert beginning snapshot for next month
  const nextMonth = dayjs().add(1, 'month').format('MMM').toUpperCase();
  const nextYear = dayjs().add(1, 'month').year();

  const { error: beginInsertError } = await supabase.from('inventory_snapshots').insert({
    unit,
    month: nextMonth,
    year: nextYear,
    type: 'beginning',
    amount: totalValue, // carry over same value
  });

  if (beginInsertError) {
    console.error('Error inserting beginning snapshot:', beginInsertError.message);
    return { success: false, message: beginInsertError.message };
  }

  // ✅ Final response
  return {
    success: true,
    message: `✅ Snapshot saved for ${unit} — ${currentMonth} ${currentYear}`,
    amount: totalValue,
    month: currentMonth,
    year: currentYear,
  };
}
