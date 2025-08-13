'use server';

import { createServer } from '@/lib/supabase/server';

export interface RemainingBreadData {
  bread_type_id: string;
  bread_type: string;
  quantity: number;
  unit_price: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}

export interface RemainingBreadResult {
  success: boolean;
  results?: Array<{
    action: 'inserted' | 'updated' | 'skipped';
    breadType: string;
    data?: any;
    reason?: string;
  }>;
  error?: string;
}

/**
 * Upsert remaining bread records with constraint enforcement
 * One record per user per shift per day per bread_type
 */
export async function upsertRemainingBread(
  remainingData: RemainingBreadData[]
): Promise<RemainingBreadResult> {
  try {
    const supabase = await createServer();
    const results = [];
    const today = new Date().toISOString().split('T')[0];

    console.log('🍞 Starting upsert for remaining bread data:', {
      count: remainingData.length,
      today,
      data: remainingData
    });

    for (const remaining of remainingData) {
      if (remaining.quantity <= 0) {
        console.log('🍞 Skipping zero quantity for:', remaining.bread_type);
        continue; // Skip zero quantities
      }

      // Check if record exists for today (same user, shift, date, bread_type)
      console.log('🍞 Checking existing record for:', {
        bread_type: remaining.bread_type,
        recorded_by: remaining.recorded_by,
        shift: remaining.shift,
        bread_type_id: remaining.bread_type_id,
        record_date: today
      });

      const { data: existing, error: checkError } = await supabase
        .from('remaining_bread')
        .select('id, quantity')
        .eq('recorded_by', remaining.recorded_by)
        .eq('shift', remaining.shift)
        .eq('bread_type_id', remaining.bread_type_id)
        .eq('record_date', today)
        .single();

      console.log('🍞 Existing record check result:', { existing, checkError });

      if (existing) {
        // Record exists for today
        if (existing.quantity === remaining.quantity) {
          // Same quantity → skip
          results.push({
            action: 'skipped' as const,
            breadType: remaining.bread_type,
            reason: 'same_quantity',
            data: existing
          });
        } else {
          // Different quantity → update existing record
          const { data: updated, error } = await supabase
            .from('remaining_bread')
            .update({
              quantity: remaining.quantity,
              unit_price: remaining.unit_price,
              // total_value is auto-calculated by database - don't update manually
              updated_at: new Date().toISOString(),
              record_date: today // Ensure record_date is set
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          results.push({
            action: 'updated' as const,
            breadType: remaining.bread_type,
            data: updated
          });
        }
      } else {
        // No record exists for today → insert new record
        console.log('🍞 Inserting new record:', {
          bread_type_id: remaining.bread_type_id,
          bread_type: remaining.bread_type,
          quantity: remaining.quantity,
          unit_price: remaining.unit_price,
          shift: remaining.shift,
          recorded_by: remaining.recorded_by,
          record_date: today
        });

        const { data: inserted, error } = await supabase
          .from('remaining_bread')
          .insert({
            bread_type_id: remaining.bread_type_id,
            bread_type: remaining.bread_type,
            quantity: remaining.quantity,
            unit_price: remaining.unit_price,
            // total_value is auto-calculated by database - don't insert manually
            shift: remaining.shift,
            recorded_by: remaining.recorded_by,
            record_date: today
          })
          .select()
          .single();

        console.log('🍞 Insert result:', { inserted, error });

        if (error) throw error;
        results.push({
          action: 'inserted' as const,
          breadType: remaining.bread_type,
          data: inserted
        });
      }
    }

    console.log('🍞 Final upsert results:', results);
    return { success: true, results };
  } catch (error) {
    console.error('🍞 Error upserting remaining bread:', error);
    console.error('🍞 Error details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get existing remaining bread records for conflict checking
 */
export async function getRemainingBreadForToday(
  userId: string,
  shift: 'morning' | 'night'
) {
  try {
    const supabase = await createServer();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('remaining_bread')
      .select(`
        *,
        bread_types!remaining_bread_bread_type_id_fkey (
          id,
          name,
          unit_price
        )
      `)
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .eq('record_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching remaining bread for today:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}