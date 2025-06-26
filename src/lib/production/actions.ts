'use server';

import { createServer } from '@/lib/supabase/server';
import { productionEntrySchema } from '@/lib/validations/production';
import { revalidatePath } from 'next/cache';

export async function insertProductionLog({ bread_type_id, quantity, shift, manager_id, feedback }: {
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  manager_id: string;
  feedback?: string;
}) {
  const supabase = await createServer();
  const parsed = productionEntrySchema.safeParse({ bread_type_id, quantity, shift, feedback });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Start a transaction-like operation
  try {
    // 1. Insert production log
    const { error: productionError } = await supabase.from('production_logs').insert({
      bread_type_id,
      quantity,
      shift,
      manager_id,
      feedback: feedback || null,
      created_at: new Date().toISOString(),
    });
    
    if (productionError) return { error: productionError.message };

    // 2. Update inventory
    const { data: existingInventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('bread_type_id', bread_type_id)
      .single();

    if (existingInventory) {
      // Update existing inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          quantity: existingInventory.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('bread_type_id', bread_type_id);
      
      if (inventoryError) return { error: `Production logged but inventory update failed: ${inventoryError.message}` };
    } else {
      // Create new inventory entry
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          bread_type_id,
          quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (inventoryError) return { error: `Production logged but inventory creation failed: ${inventoryError.message}` };
    }

    revalidatePath('/dashboard/production');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { error: `Transaction failed: ${(error as Error).message}` };
  }
}

export async function fetchTodayProductionLogs(manager_id: string) {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);
  const { data, error } = await supabase
    .from('production_logs')
    .select('id, bread_type_id, quantity, shift, created_at, feedback, bread_types(name)')
    .eq('manager_id', manager_id)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function fetchProductionHistory({ manager_id, bread_type_id, shift, date }: {
  manager_id?: string;
  bread_type_id?: string;
  shift?: 'morning' | 'night';
  date?: string; // ISO date string (YYYY-MM-DD)
}) {
  const supabase = await createServer();
  let query = supabase
    .from('production_logs')
    .select('id, bread_type_id, quantity, shift, created_at, feedback, bread_types(name), manager_id')
    .order('created_at', { ascending: false });
  if (manager_id) query = query.eq('manager_id', manager_id);
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