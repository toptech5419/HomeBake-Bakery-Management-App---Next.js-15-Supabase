'use server';

import { createServer } from '@/lib/supabase/server';
import { salesEntrySchema } from '@/lib/validations/sales';
import { revalidatePath } from 'next/cache';

export async function insertSalesLog({ 
  bread_type_id, 
  quantity_sold, 
  discount_percentage = 0, 
  shift, 
  user_id 
}: {
  bread_type_id: string;
  quantity_sold: number;
  discount_percentage?: number;
  shift: 'morning' | 'night';
  user_id: string;
}) {
  const supabase = await createServer();
  const parsed = salesEntrySchema.safeParse({ 
    bread_type_id, 
    quantity_sold, 
    discount_percentage, 
    shift 
  });
  
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase.from('sales_logs').insert({
    bread_type_id,
    quantity_sold,
    discount_percentage,
    shift,
    user_id,
    created_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  
  revalidatePath('/dashboard/sales');
  return { success: true };
}

export async function fetchTodaySalesLogs(user_id: string) {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data, error } = await supabase
    .from('sales_logs')
    .select(`
      id, 
      bread_type_id, 
      quantity_sold, 
      discount_percentage, 
      shift, 
      created_at, 
      bread_types(name, unit_price)
    `)
    .eq('user_id', user_id)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return data || [];
}

export async function fetchShiftSalesLogs(user_id: string, shift: 'morning' | 'night') {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const { data, error } = await supabase
    .from('sales_logs')
    .select(`
      id, 
      bread_type_id, 
      quantity_sold, 
      discount_percentage, 
      shift, 
      created_at, 
      bread_types(name, unit_price)
    `)
    .eq('user_id', user_id)
    .eq('shift', shift)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return data || [];
}

export async function getSalesRepRole(user_id: string) {
  const supabase = await createServer();
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user_id)
    .single();
    
  if (error) return null;
  return data?.role;
} 