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

  // Use RPC function to handle creation/update safely (avoids materialized view permission issues)
  const { data: salesId, error } = await (supabase as any).rpc('create_user_sales_log', {
    p_bread_type_id: data.bread_type_id,
    p_quantity: data.quantity,
    p_shift: data.shift,
    p_unit_price: data.unit_price,
    p_discount: data.discount,
    p_returned: data.returned || false,
    p_leftover: data.leftover || 0,
    p_user_id: data.recorded_by
  });

  if (error) {
    throw new Error(`Failed to create sales log: ${error.message}`);
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
  
  // Fetch sales logs and bread types separately to avoid relationship issues
  const [salesResult, breadTypesResult] = await Promise.all([
    supabase
      .from('sales_logs')
      .select(`
        id, 
        bread_type_id, 
        quantity, 
        discount, 
        shift, 
        created_at
      `)
      .eq('recorded_by', user_id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('bread_types').select('id, name, unit_price').eq('is_active', true)
  ]);
  
  if (salesResult.error || breadTypesResult.error) return [];
  
  // Join data manually
  const breadTypeMap = new Map(breadTypesResult.data?.map(bt => [bt.id, bt]) || []);
  const data = salesResult.data?.map(sale => ({
    ...sale,
    bread_types: breadTypeMap.get(sale.bread_type_id) || { name: 'Unknown', unit_price: 0 }
  })) || [];
    
  return data;
}

export async function fetchShiftSalesLogs(user_id: string, shift: 'morning' | 'night') {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Fetch sales logs and bread types separately to avoid relationship issues
  const [salesResult, breadTypesResult] = await Promise.all([
    supabase
      .from('sales_logs')
      .select(`
        id, 
        bread_type_id, 
        quantity, 
        discount, 
        shift, 
        created_at
      `)
      .eq('recorded_by', user_id)
      .eq('shift', shift)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('bread_types').select('id, name, unit_price').eq('is_active', true)
  ]);
  
  if (salesResult.error || breadTypesResult.error) return [];
  
  // Join data manually
  const breadTypeMap = new Map(breadTypesResult.data?.map(bt => [bt.id, bt]) || []);
  const data = salesResult.data?.map(sale => ({
    ...sale,
    bread_types: breadTypeMap.get(sale.bread_type_id) || { name: 'Unknown', unit_price: 0 }
  })) || [];
    
  return data;
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