'use server';

import { createServer } from '@/lib/supabase/server';
import { logSaleActivity } from '@/lib/activities/server-activity-service';

export async function createSalesLog(data: {
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  returned?: boolean;
  leftover?: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}) {
  const supabase = await createServer();
  
  // Check if a record exists for today (same user, shift, bread_type, date)
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('sales_logs')
    .select('id, quantity, unit_price, discount, leftovers')
    .eq('recorded_by', data.recorded_by)
    .eq('shift', data.shift)
    .eq('bread_type_id', data.bread_type_id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .single();

  if (existing) {
    // Update existing record by adding the new quantity and discount
    const newQuantity = existing.quantity + data.quantity;
    const newDiscount = (existing.discount || 0) + (data.discount || 0);
    const newLeftovers = (existing.leftovers || 0) + (data.leftover || 0);
    
    const { error } = await supabase
      .from('sales_logs')
      .update({
        quantity: newQuantity,
        unit_price: data.unit_price, // Use latest unit price
        discount: newDiscount,
        leftovers: newLeftovers,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Failed to update sales log: ${error.message}`);
    }
  } else {
    // Insert new record
    const { error } = await supabase.from('sales_logs').insert({
      bread_type_id: data.bread_type_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      discount: data.discount,
      returned: data.returned || false,
      leftovers: data.leftover || 0,
      shift: data.shift,
      recorded_by: data.recorded_by,
    });

    if (error) {
      throw new Error(`Failed to create sales log: ${error.message}`);
    }
  }

  // Get user and bread type info for activity logging
  try {
    const [userResult, breadTypeResult] = await Promise.all([
      supabase.from('users').select('name, role').eq('id', data.recorded_by).single(),
      supabase.from('bread_types').select('name').eq('id', data.bread_type_id).single()
    ]);

    if (userResult.data && breadTypeResult.data && userResult.data.role !== 'owner') {
      const revenue = (data.unit_price || 0) * data.quantity - (data.discount || 0);
      
      await logSaleActivity({
        user_id: data.recorded_by,
        user_name: userResult.data.name,
        shift: data.shift,
        bread_type: breadTypeResult.data.name,
        quantity: data.quantity,
        revenue: revenue
      });
    }
  } catch (activityError) {
    // Don't fail the sale if activity logging fails
    console.error('Failed to log sale activity:', activityError);
  }

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