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
 * UPSERT sales logs with STRICT uniqueness constraint: user + bread_type + shift + date
 * Enforces one record per (recorded_by + bread_type_id + shift + date) combination
 * REPLACES quantity (never adds to existing)
 * Always fetches from database (no state trust)
 */
export async function upsertSalesLogs(salesData: SalesLogUpsertData[]) {
  try {
    const supabase = await createServer();
    const results = [];
    
    // Get current date in Nigeria timezone for constraint enforcement
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    for (const sale of salesData) {
      if (sale.quantity <= 0) continue; // Skip zero quantities

      // CONSTRAINT CHECK: Find existing record for user + bread_type + shift + date
      // This enforces the uniqueness constraint in application logic
      const { data: existingRecords, error: checkError } = await supabase
        .from('sales_logs')
        .select('id, quantity, created_at')
        .eq('recorded_by', sale.recorded_by)
        .eq('bread_type_id', sale.bread_type_id)
        .eq('shift', sale.shift)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: false }); // Get most recent first

      if (checkError) throw checkError;

      // CONSTRAINT ENFORCEMENT: Should only be 0 or 1 record
      if (existingRecords && existingRecords.length > 1) {
        console.warn(`⚠️ Found ${existingRecords.length} records for constraint (user:${sale.recorded_by}, bread:${sale.bread_type_id}, shift:${sale.shift}, date:${today})`);
        // Continue with the most recent record (first in array due to ordering)
      }

      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

      if (existingRecord) {
        // CONSTRAINT SATISFIED: Update the existing record (REPLACE quantity)
        const { data: updated, error: updateError } = await supabase
          .from('sales_logs')
          .update({
            quantity: sale.quantity, // DIRECT REPLACEMENT - no addition
            unit_price: sale.unit_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        results.push({ 
          action: 'updated', 
          data: updated,
          previousQuantity: existingRecord.quantity,
          newQuantity: sale.quantity,
          constraint: `user:${sale.recorded_by}+bread:${sale.bread_type_id}+shift:${sale.shift}+date:${today}`
        });
      } else {
        // CONSTRAINT SATISFIED: No existing record, safe to INSERT
        const { data: inserted, error: insertError } = await supabase
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

        if (insertError) throw insertError;
        
        results.push({ 
          action: 'inserted', 
          data: inserted,
          constraint: `user:${sale.recorded_by}+bread:${sale.bread_type_id}+shift:${sale.shift}+date:${today}`
        });
      }
    }

    // Log constraint enforcement summary
    const insertedCount = results.filter(r => r.action === 'inserted').length;
    const updatedCount = results.filter(r => r.action === 'updated').length;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Sales logs UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated (constraint enforced)`);
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error upserting sales logs with constraint enforcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * UPSERT remaining bread with GLOBAL constraint: bread_type ONLY
 * Remaining bread is GLOBAL - any sales rep can edit any remaining bread record
 * Enforces one record per bread_type_id (latest wins, regardless of user/shift/date)
 * REPLACES quantity (never adds to existing)
 * Always fetches from database (no state trust)
 */
export async function upsertRemainingBread(
  remainingData: RemainingBreadUpsertData[]
) {
  try {
    const supabase = await createServer();
    const results = [];

    for (const remaining of remainingData) {
      if (remaining.quantity <= 0) continue; // Skip zero quantities

      // GLOBAL CONSTRAINT: Find existing record for bread_type ONLY (ignore user/shift/date)
      // Any sales rep can edit remaining bread for any bread type
      const { data: existingRecords, error: checkError } = await supabase
        .from('remaining_bread')
        .select('id, quantity, created_at, recorded_by, shift')
        .eq('bread_type_id', remaining.bread_type_id)
        .order('created_at', { ascending: false }); // Get most recent first

      if (checkError) throw checkError;

      // GLOBAL ACCESS: Use most recent record regardless of who created it
      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

      if (existingRecord) {
        // GLOBAL UPDATE: Update existing record (any user can edit any remaining bread)
        const { data: updated, error: updateError } = await supabase
          .from('remaining_bread')
          .update({
            quantity: remaining.quantity, // DIRECT REPLACEMENT - no addition
            unit_price: remaining.unit_price,
            total_value: remaining.quantity * remaining.unit_price,
            recorded_by: remaining.recorded_by, // Update to current user
            shift: remaining.shift, // Update to current shift
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        results.push({ 
          action: 'updated', 
          breadType: remaining.bread_type,
          data: updated,
          previousQuantity: existingRecord.quantity,
          newQuantity: remaining.quantity,
          previousUser: existingRecord.recorded_by,
          newUser: remaining.recorded_by,
          constraint: `bread:${remaining.bread_type_id} (global access)`
        });
      } else {
        // GLOBAL INSERT: No existing record for this bread type
        const { data: inserted, error: insertError } = await supabase
          .from('remaining_bread')
          .insert({
            bread_type_id: remaining.bread_type_id,
            bread_type: remaining.bread_type,
            quantity: remaining.quantity,
            unit_price: remaining.unit_price,
            total_value: remaining.quantity * remaining.unit_price,
            shift: remaining.shift,
            recorded_by: remaining.recorded_by
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        results.push({ 
          action: 'inserted', 
          breadType: remaining.bread_type,
          data: inserted,
          constraint: `bread:${remaining.bread_type_id} (global access)`
        });
      }
    }

    // Log global access summary
    const insertedCount = results.filter(r => r.action === 'inserted').length;
    const updatedCount = results.filter(r => r.action === 'updated').length;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🍞 Remaining bread GLOBAL UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated (global access)`);
    }

    revalidatePath('/dashboard/sales/end-shift');
    return { success: true, results, needsUserConfirmation: false };
  } catch (error) {
    console.error('Error upserting remaining bread with global access:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}