'use server';

import { createServer } from '@/lib/supabase/server';
import { productionEntrySchema } from '@/lib/validations/production';
import { revalidatePath } from 'next/cache';

export async function saveFeedback({ user_id, shift, note }: {
  user_id: string;
  shift: 'morning' | 'night';
  note: string;
}) {
  const supabase = await createServer();
  try {
    const { error } = await supabase.from('shift_feedback').insert({
      user_id,
      shift,
      note: note.trim(),
    });
    
    if (error) return { error: error.message };
    return { success: true };
  } catch (error) {
    return { error: `Failed to save feedback: ${(error as Error).message}` };
  }
}

export async function createProductionLog(data: {
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}) {
  const supabase = await createServer();
  
  const { error } = await supabase.from('production_logs').insert({
    bread_type_id: data.bread_type_id,
    quantity: data.quantity,
    shift: data.shift,
    recorded_by: data.recorded_by,
  });

  if (error) {
    throw new Error(`Failed to create production log: ${error.message}`);
  }

  return { success: true };
}

export async function fetchTodayProductionLogs(recorded_by: string) {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);
  const { data, error } = await supabase
    .from('production_logs')
    .select('id, bread_type_id, quantity, shift, created_at, bread_types(name)')
    .eq('recorded_by', recorded_by)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchProductionHistory({ recorded_by, bread_type_id, shift, date }: {
  recorded_by?: string;
  bread_type_id?: string;
  shift?: 'morning' | 'night';
  date?: string; // ISO date string (YYYY-MM-DD)
}) {
  const supabase = await createServer();
  let query = supabase
    .from('production_logs')
    .select('id, bread_type_id, quantity, shift, created_at, bread_types(name), recorded_by')
    .order('created_at', { ascending: false });
  if (recorded_by) query = query.eq('recorded_by', recorded_by);
  if (bread_type_id) query = query.eq('bread_type_id', bread_type_id);
  if (shift) query = query.eq('shift', shift);
  if (date) {
    // Filter logs to those created on the specified date (local time)
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
  }
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function generateProductionCSV(logs: any[]) {
  const headers = ['Date', 'Bread Type', 'Quantity', 'Shift', 'Time'];
  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleDateString(),
    log.bread_types?.name || log.bread_type_id,
    log.quantity,
    log.shift.charAt(0).toUpperCase() + log.shift.slice(1),
    new Date(log.created_at).toLocaleTimeString(),
  ]);
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csvContent;
} 