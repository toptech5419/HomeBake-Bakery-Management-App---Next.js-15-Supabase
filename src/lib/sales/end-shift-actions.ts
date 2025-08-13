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
 * Upsert sales logs - update if exists for same user/shift/date/bread_type, insert if not
 */
export async function upsertSalesLogs(salesData: SalesLogUpsertData[]) {
  try {
    const supabase = await createServer();
    const results = [];

    for (const sale of salesData) {
      if (sale.quantity <= 0) continue; // Skip zero quantities

      // Check if record exists for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('sales_logs')
        .select('id, quantity')
        .eq('recorded_by', sale.recorded_by)
        .eq('shift', sale.shift)
        .eq('bread_type_id', sale.bread_type_id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .single();

      if (existing) {
        // Update existing record if quantity is different
        if (existing.quantity !== sale.quantity) {
          const { data: updated, error } = await supabase
            .from('sales_logs')
            .update({
              quantity: sale.quantity,
              unit_price: sale.unit_price,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          results.push({ action: 'updated', data: updated });
        } else {
          results.push({ action: 'skipped', reason: 'same_quantity', data: existing });
        }
      } else {
        // Insert new record
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
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error upserting sales logs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check existing remaining bread for validation
 */
export async function checkExistingRemainingBread(
  breadTypeId: string,
  quantity: number,
  shift: 'morning' | 'night',
  userId: string
): Promise<ExistingRemainingBreadCheck> {
  try {
    const supabase = await createServer();
    const today = new Date().toISOString().split('T')[0];

    // Check for today's record
    const { data: todayRecord } = await supabase
      .from('remaining_bread')
      .select('*')
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .eq('bread_type_id', breadTypeId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .single();

    if (todayRecord) {
      return {
        exists: true,
        sameDate: true,
        sameQuantity: todayRecord.quantity === quantity,
        existingRecord: todayRecord
      };
    }

    // Check for any previous record with same quantity (different date)
    const { data: previousRecord } = await supabase
      .from('remaining_bread')
      .select('*')
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .eq('bread_type_id', breadTypeId)
      .eq('quantity', quantity)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (previousRecord) {
      return {
        exists: true,
        sameDate: false,
        sameQuantity: true,
        existingRecord: previousRecord
      };
    }

    return {
      exists: false,
      sameDate: false,
      sameQuantity: false
    };
  } catch (error) {
    console.error('Error checking existing remaining bread:', error);
    return {
      exists: false,
      sameDate: false,
      sameQuantity: false
    };
  }
}

/**
 * Upsert remaining bread with conflict handling
 */
export async function upsertRemainingBread(
  remainingData: RemainingBreadUpsertData[],
  forceOverwrite: boolean = false
) {
  try {
    const supabase = await createServer();
    const results = [];
    const conflictsDetected = [];

    for (const remaining of remainingData) {
      if (remaining.quantity <= 0) continue; // Skip zero quantities

      const existingCheck = await checkExistingRemainingBread(
        remaining.bread_type_id,
        remaining.quantity,
        remaining.shift,
        remaining.recorded_by
      );

      // Handle same date, same quantity - skip
      if (existingCheck.exists && existingCheck.sameDate && existingCheck.sameQuantity) {
        results.push({ 
          action: 'skipped', 
          reason: 'same_date_same_quantity',
          breadType: remaining.bread_type,
          data: existingCheck.existingRecord 
        });
        continue;
      }

      // Handle same date, different quantity - update
      if (existingCheck.exists && existingCheck.sameDate && !existingCheck.sameQuantity) {
        if (!existingCheck.existingRecord?.id) {
          console.error('Cannot update: Missing existing record ID', existingCheck);
          throw new Error('Cannot update record: Missing existing record ID');
        }

        const { data: updated, error } = await supabase
          .from('remaining_bread')
          .update({
            quantity: remaining.quantity,
            unit_price: remaining.unit_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCheck.existingRecord.id)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        results.push({ 
          action: 'updated', 
          breadType: remaining.bread_type,
          data: updated 
        });
        continue;
      }

      // Handle different date, same quantity - needs user confirmation
      if (existingCheck.exists && !existingCheck.sameDate && existingCheck.sameQuantity && !forceOverwrite) {
        if (!existingCheck.existingRecord?.created_at) {
          console.error('Cannot detect conflict: Missing existing record data', existingCheck);
          // Fall through to insert as new record
        } else {
          conflictsDetected.push({
            breadType: remaining.bread_type,
            quantity: remaining.quantity,
            existingDate: existingCheck.existingRecord.created_at,
            currentData: remaining
          });
          continue;
        }
      }

      // Insert new record (no conflict or force overwrite)
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
    
    if (conflictsDetected.length > 0) {
      return { 
        success: true, 
        results, 
        conflicts: conflictsDetected,
        needsUserConfirmation: true 
      };
    }

    return { success: true, results, needsUserConfirmation: false };
  } catch (error) {
    console.error('Error upserting remaining bread:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    };
  }
}