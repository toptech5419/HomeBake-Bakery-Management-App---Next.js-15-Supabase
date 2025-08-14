'use server';

import { createServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SalesLogUpsertData {
  bread_type_id: string;
  quantity: number;
  unit_price: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}

export interface RemainingBreadUpsertData {
  bread_type_id: string;
  bread_type: string;
  quantity: number;
  unit_price: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}

export interface ExistingRemainingBreadCheck {
  exists: boolean;
  sameDate: boolean;
  sameQuantity: boolean;
  existingRecord?: Record<string, unknown>;
}

/**
 * Simple insert sales logs - no constraint checking needed
 */
export async function upsertSalesLogs(salesData: SalesLogUpsertData[]) {
  try {
    const supabase = await createServer();
    const results = [];

    for (const sale of salesData) {
      if (sale.quantity <= 0) continue; // Skip zero quantities

      // Direct insert - no constraints to worry about
      const { data: inserted, error } = await supabase
        .from('sales_logs')
        .insert({
          bread_type_id: sale.bread_type_id,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          shift: sale.shift,
          recorded_by: sale.recorded_by,
          returned: false,
          leftovers: 0
        })
        .select()
        .single();

      if (error) throw error;
      results.push({ action: 'inserted', data: inserted });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error inserting sales logs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Simple insert remaining bread - no constraint checking needed
 */
export async function upsertRemainingBread(
  remainingData: RemainingBreadUpsertData[]
) {
  try {
    const supabase = await createServer();
    const results = [];

    for (const remaining of remainingData) {
      if (remaining.quantity <= 0) continue; // Skip zero quantities

      // Direct insert - no constraints to worry about
      const { data: inserted, error } = await supabase
        .from('remaining_bread')
        .insert({
          bread_type_id: remaining.bread_type_id,
          bread_type: remaining.bread_type,
          quantity: remaining.quantity,
          unit_price: remaining.unit_price,
          shift: remaining.shift,
          recorded_by: remaining.recorded_by
        })
        .select()
        .single();

      if (error) throw error;
      results.push({ 
        action: 'inserted', 
        breadType: remaining.bread_type,
        data: inserted 
      });
    }

    revalidatePath('/dashboard/sales/end-shift');
    return { success: true, results, needsUserConfirmation: false };
  } catch (error) {
    console.error('Error inserting remaining bread:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}