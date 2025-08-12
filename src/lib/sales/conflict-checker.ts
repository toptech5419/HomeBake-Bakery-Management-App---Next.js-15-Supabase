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
 * Check for remaining bread conflicts without saving data
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

    for (const remaining of remainingData) {
      // Check for today's record
      const { data: todayRecord } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('recorded_by', remaining.recorded_by)
        .eq('shift', remaining.shift)
        .eq('bread_type_id', remaining.bread_type_id)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .single();

      if (todayRecord) {
        // Same date record exists - this will be handled by upsert logic
        continue;
      }

      // Check for previous record with same quantity (different date)
      const { data: previousRecord } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('recorded_by', remaining.recorded_by)
        .eq('shift', remaining.shift)
        .eq('bread_type_id', remaining.bread_type_id)
        .eq('quantity', remaining.quantity)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (previousRecord) {
        conflicts.push({
          breadType: remaining.bread_type,
          quantity: remaining.quantity,
          existingDate: previousRecord.created_at,
          currentData: remaining
        });
      }
    }

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