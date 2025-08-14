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
 * Get the current authenticated user's auth ID (from Supabase Auth)
 */
async function getCurrentAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Failed to get current auth user:', error);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Error getting current auth user:', error);
    return null;
  }
}

/**
 * PRODUCTION-READY UPSERT with database constraint handling
 * Uses PostgreSQL UPSERT with ON CONFLICT to handle unique constraint
 * Prevents duplicate remaining bread records per bread_type_id
 */
export async function upsertRemainingBread(
  remainingData: RemainingBreadData[]
): Promise<RemainingBreadResult> {
  try {
    const supabase = await createServer();
    const results = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Get current authenticated user ID from Supabase Auth
    const currentAuthUserId = await getCurrentAuthUserId();
    if (!currentAuthUserId) {
      throw new Error('User not authenticated');
    }

    console.log('🍞 Database constraint UPSERT starting:', {
      count: remainingData.length,
      today,
      currentUser: currentAuthUserId.slice(-8)
    });

    for (const remaining of remainingData) {
      if (remaining.quantity <= 0) {
        console.log('🍞 Skipping zero quantity:', remaining.bread_type);
        results.push({
          action: 'skipped' as const,
          breadType: remaining.bread_type,
          reason: 'zero_quantity'
        });
        continue;
      }

      // Check if record exists to determine action for toast message
      const { data: existingRecord } = await supabase
        .from('remaining_bread')
        .select('id, quantity')
        .eq('bread_type_id', remaining.bread_type_id)
        .single();

      const isUpdate = !!existingRecord;
      const previousQuantity = existingRecord?.quantity || 0;

      // PRODUCTION UPSERT: Use existing UNIQUE constraint on bread_type_id
      // Note: total_value is a generated column (quantity * unit_price), don't set manually
      const { data: upserted, error } = await supabase
        .from('remaining_bread')
        .upsert({
          bread_type_id: remaining.bread_type_id,
          bread_type: remaining.bread_type,
          quantity: remaining.quantity,
          unit_price: remaining.unit_price,
          // total_value: NOT SET - it's auto-generated as (quantity * unit_price)
          shift: remaining.shift,
          recorded_by: currentAuthUserId,
          record_date: today,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'bread_type_id', // Use existing UNIQUE constraint
          ignoreDuplicates: false // Update on conflict instead of ignoring
        })
        .select()
        .single();

      if (error) {
        console.error(`🍞 UPSERT failed for ${remaining.bread_type}:`, error);
        throw error;
      }
      
      results.push({
        action: isUpdate ? 'updated' as const : 'inserted' as const,
        breadType: remaining.bread_type,
        data: upserted,
        previousQuantity: isUpdate ? previousQuantity : undefined,
        newQuantity: remaining.quantity
      });

      console.log(`🍞 ${isUpdate ? 'UPDATED' : 'INSERTED'}: ${remaining.bread_type} = ${remaining.quantity}${isUpdate ? ` (was ${previousQuantity})` : ''}`);
    }

    console.log('🍞 Database constraint UPSERT completed:', {
      total: results.length,
      inserted: results.filter(r => r.action === 'inserted').length,
      updated: results.filter(r => r.action === 'updated').length,
      skipped: results.filter(r => r.action === 'skipped').length
    });

    return { success: true, results };
  } catch (error) {
    console.error('🍞 Database constraint UPSERT failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * Get existing remaining bread records for ALL USERS (user-agnostic)
 * Now returns all remaining bread for the shift and date, regardless of who created it
 */
export async function getRemainingBreadForToday(
  userId: string, // Keep for backwards compatibility but don't use for filtering
  shift: 'morning' | 'night'
) {
  try {
    const supabase = await createServer();
    const today = new Date().toISOString().split('T')[0];

    // USER-AGNOSTIC: Get ALL remaining bread for this shift and date
    const { data, error } = await supabase
      .from('remaining_bread')
      .select('*')
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

/**
 * Get remaining bread data for reports and calculations
 * USER-AGNOSTIC: Returns all remaining bread for the specified parameters
 */
export async function getRemainingBreadData(
  shift: 'morning' | 'night',
  recordDate?: string
) {
  try {
    const supabase = await createServer();
    const targetDate = recordDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('remaining_bread')
      .select(`
        id,
        bread_type_id,
        bread_type,
        quantity,
        unit_price,
        total_value,
        shift,
        record_date,
        created_at,
        updated_at
      `)
      .eq('shift', shift)
      .eq('record_date', targetDate)
      .order('bread_type', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching remaining bread data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}