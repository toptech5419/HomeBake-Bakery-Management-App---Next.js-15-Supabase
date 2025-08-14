'use server';

import { createServer } from '@/lib/supabase/server';

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Array<{
    breadType: string;
    quantity: number;
    existingDate: string;
    currentData: any;
  }>;
}

/**
 * USER-AGNOSTIC conflict checker for remaining bread
 * Checks for conflicts across ALL users (not just current user)
 * Since remaining bread is now shared, we check for any existing record regardless of who created it
 */
export async function checkRemainingBreadConflicts(
  remainingData: Array<{
    bread_type_id: string;
    bread_type: string;
    quantity: number;
    unit_price: number;
    shift: 'morning' | 'night';
    recorded_by: string;
  }>
): Promise<ConflictCheckResult> {
  try {
    const supabase = await createServer();
    const conflicts = [];
    const today = new Date().toISOString().split('T')[0];

    console.log('🔍 USER-AGNOSTIC conflict check starting for:', remainingData.map(d => d.bread_type));

    for (const remaining of remainingData) {
      // Step 1: Check if ANY record exists for today (user-agnostic)
      const { data: todayRecord } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('shift', remaining.shift)
        .eq('bread_type_id', remaining.bread_type_id)
        .eq('record_date', today)
        .maybeSingle();

      if (todayRecord) {
        // Same date record exists - this will be handled by upsert logic
        console.log(`🔍 Today's record exists for ${remaining.bread_type}, will be updated`);
        continue;
      }

      // Step 2: Check for ANY previous record with same quantity (different date, any user)
      const { data: previousRecords } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('shift', remaining.shift)
        .eq('bread_type_id', remaining.bread_type_id)
        .eq('quantity', remaining.quantity)
        .neq('record_date', today) // Different date
        .order('created_at', { ascending: false })
        .limit(1);

      const previousRecord = previousRecords?.[0];

      if (previousRecord) {
        console.log(`🔍 Conflict found for ${remaining.bread_type}: quantity ${remaining.quantity} exists on ${previousRecord.created_at}`);
        conflicts.push({
          breadType: remaining.bread_type,
          quantity: remaining.quantity,
          existingDate: previousRecord.created_at,
          currentData: remaining
        });
      } else {
        console.log(`🔍 No conflicts for ${remaining.bread_type}`);
      }
    }

    console.log('🔍 Conflict check complete:', {
      totalItems: remainingData.length,
      conflictsFound: conflicts.length,
      hasConflicts: conflicts.length > 0
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error checking remaining bread conflicts:', error);
    return {
      hasConflicts: false,
      conflicts: []
    };
  }
}