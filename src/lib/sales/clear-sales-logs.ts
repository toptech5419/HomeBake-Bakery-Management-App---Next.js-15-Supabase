'use server';

import { createServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ClearSalesLogsResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

export async function clearSalesLogsAction(shift: 'morning' | 'night'): Promise<ClearSalesLogsResult> {
  try {
    console.log('🔥 SERVER ACTION: clearSalesLogsAction called for shift:', shift);
    
    // Use server-side Supabase with proper authentication
    const supabase = await createServer();
    
    // Get the authenticated user from server session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ AUTH ERROR:', authError);
      return { 
        success: false, 
        deletedCount: 0, 
        error: 'Not authenticated' 
      };
    }
    
    console.log('✅ Authenticated user ID:', user.id);
    
    // First check what records exist
    const { data: existing, error: selectError } = await supabase
      .from('sales_logs')
      .select('id, created_at')
      .eq('recorded_by', user.id)
      .eq('shift', shift);
    
    if (selectError) {
      console.error('❌ SELECT ERROR:', selectError);
      return {
        success: false,
        deletedCount: 0,
        error: selectError.message
      };
    }
    
    console.log('📊 Found', existing?.length || 0, 'sales logs to delete');
    
    if (!existing || existing.length === 0) {
      console.log('ℹ️ No sales logs found to delete');
      return { success: true, deletedCount: 0 };
    }
    
    // Delete the records
    const { error: deleteError, count } = await supabase
      .from('sales_logs')
      .delete({ count: 'exact' })
      .eq('recorded_by', user.id)
      .eq('shift', shift);
    
    if (deleteError) {
      console.error('❌ DELETE ERROR:', deleteError);
      return {
        success: false,
        deletedCount: 0,
        error: deleteError.message
      };
    }
    
    const deletedCount = count || 0;
    console.log('✅ Successfully deleted', deletedCount, 'sales logs');
    
    // Revalidate pages to ensure UI updates
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/sales/all-sales');
    
    return { success: true, deletedCount };
    
  } catch (error) {
    console.error('❌ FATAL ERROR in clearSalesLogsAction:', error);
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}