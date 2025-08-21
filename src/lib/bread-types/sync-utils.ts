import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Utility functions for bread type name synchronization
 * These functions work with the database triggers to ensure data consistency
 */

export interface BreadTypeSyncLog {
  id: string;
  bread_type_id: string;
  old_name?: string;
  new_name?: string;
  tables_affected?: string[];
  total_rows_updated: number;
  error_message?: string;
  sync_timestamp: string;
}

export interface ConsistencyCheckResult {
  total_stock_records: number;
  inconsistent_records: number;
  consistency_percentage: number;
  is_consistent: boolean;
  checked_at: string;
}

export interface BatchFixResult {
  bread_types_processed: number;
  errors: number;
  timestamp: string;
}

/**
 * Check data consistency between bread_types and related tables
 */
export async function checkBreadTypeConsistency(): Promise<ConsistencyCheckResult> {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase.rpc('check_bread_type_consistency');
    
    if (error) {
      console.error('Error checking bread type consistency:', error);
      throw new Error(`Failed to check consistency: ${error.message}`);
    }
    
    return data as ConsistencyCheckResult;
  } catch (error) {
    console.error('Error in checkBreadTypeConsistency:', error);
    throw error;
  }
}

/**
 * Fix all inconsistent bread type names across tables
 * This is a one-time operation that should be run after the trigger is installed
 */
export async function fixAllBreadTypeNames(): Promise<BatchFixResult> {
  try {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase.rpc('fix_all_bread_type_names');
    
    if (error) {
      console.error('Error fixing bread type names:', error);
      throw new Error(`Failed to fix bread type names: ${error.message}`);
    }
    
    return data as BatchFixResult;
  } catch (error) {
    console.error('Error in fixAllBreadTypeNames:', error);
    throw error;
  }
}

/**
 * Get the synchronization log for a specific bread type
 */
export async function getBreadTypeSyncLog(breadTypeId?: string, limit: number = 50): Promise<BreadTypeSyncLog[]> {
  try {
    const supabase = createServiceRoleClient();
    
    let query = supabase
      .from('bread_type_sync_log')
      .select('*')
      .order('sync_timestamp', { ascending: false })
      .limit(limit);
    
    if (breadTypeId) {
      query = query.eq('bread_type_id', breadTypeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching sync log:', error);
      throw new Error(`Failed to fetch sync log: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getBreadTypeSyncLog:', error);
    throw error;
  }
}

/**
 * Validate that a bread type update was properly synchronized
 * Call this after updating a bread type to verify the trigger worked
 */
export async function validateBreadTypeSync(breadTypeId: string, expectedName: string): Promise<{
  isValid: boolean;
  details: {
    bread_type_name: string;
    available_stock_synced: boolean;
    last_sync_timestamp?: string;
  };
}> {
  try {
    const supabase = createServiceRoleClient();
    
    // Get the current bread type name
    const { data: breadType, error: breadTypeError } = await supabase
      .from('bread_types')
      .select('name')
      .eq('id', breadTypeId)
      .single();
    
    if (breadTypeError || !breadType) {
      throw new Error('Bread type not found');
    }
    
    // Check if available_stock is synchronized
    const { data: stockRecords, error: stockError } = await supabase
      .from('available_stock')
      .select('bread_type_name')
      .eq('bread_type_id', breadTypeId);
    
    if (stockError) {
      throw new Error(`Failed to check stock synchronization: ${stockError.message}`);
    }
    
    // Get the latest sync log entry for this bread type
    const { data: syncLog, error: syncLogError } = await supabase
      .from('bread_type_sync_log')
      .select('sync_timestamp, new_name')
      .eq('bread_type_id', breadTypeId)
      .order('sync_timestamp', { ascending: false })
      .limit(1)
      .single();
    
    // Check if all stock records have the correct name
    const allStockSynced = stockRecords?.every(record => record.bread_type_name === expectedName) ?? true;
    const breadTypeNameMatches = breadType.name === expectedName;
    
    return {
      isValid: breadTypeNameMatches && allStockSynced,
      details: {
        bread_type_name: breadType.name,
        available_stock_synced: allStockSynced,
        last_sync_timestamp: syncLog?.sync_timestamp
      }
    };
  } catch (error) {
    console.error('Error validating bread type sync:', error);
    throw error;
  }
}

/**
 * Enhanced error handling for sync operations
 */
export class BreadTypeSyncError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  
  constructor(message: string, code: string = 'SYNC_ERROR', details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BreadTypeSyncError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Retry mechanism for sync operations
 */
export async function withSyncRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`Sync operation failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw new BreadTypeSyncError(
    `Sync operation failed after ${maxRetries} attempts: ${lastError!.message}`,
    'SYNC_RETRY_EXHAUSTED',
    { maxRetries, lastError: lastError!.message }
  );
}

/**
 * Health check for the synchronization system
 */
export async function checkSyncSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    trigger_exists: boolean;
    consistency_check: boolean;
    recent_sync_logs: boolean;
  };
  message: string;
}> {
  try {
    const supabase = createServiceRoleClient();
    
    // Check if the trigger function exists
    const { data: triggerExists, error: triggerError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'sync_bread_type_name')
      .eq('routine_schema', 'public')
      .single();
    
    // Run consistency check
    let consistencyResult: ConsistencyCheckResult;
    try {
      consistencyResult = await checkBreadTypeConsistency();
    } catch (error) {
      throw new BreadTypeSyncError('Consistency check failed', 'CONSISTENCY_CHECK_FAILED');
    }
    
    // Check for recent sync logs (last 24 hours)
    const { data: recentLogs, error: logsError } = await supabase
      .from('bread_type_sync_log')
      .select('id')
      .gte('sync_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    
    const checks = {
      trigger_exists: !triggerError && !!triggerExists,
      consistency_check: consistencyResult.is_consistent,
      recent_sync_logs: !logsError && (recentLogs?.length ?? 0) > 0
    };
    
    const healthyChecks = Object.values(checks).filter(check => check).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (healthyChecks === 3) {
      status = 'healthy';
      message = 'Bread type synchronization system is operating normally';
    } else if (healthyChecks >= 2) {
      status = 'degraded';
      message = 'Bread type synchronization system is partially operational';
    } else {
      status = 'unhealthy';
      message = 'Bread type synchronization system requires attention';
    }
    
    return { status, checks, message };
  } catch (error) {
    console.error('Error checking sync system health:', error);
    return {
      status: 'unhealthy',
      checks: {
        trigger_exists: false,
        consistency_check: false,
        recent_sync_logs: false
      },
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}