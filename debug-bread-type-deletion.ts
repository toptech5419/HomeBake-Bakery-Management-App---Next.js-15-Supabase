/**
 * Debug script to check why bread type deletion is failing
 * 
 * The issue: deleteBreadType function checks production_logs and sales_logs tables,
 * but according to CLAUDE.md, the actual tables that reference bread_types are:
 * - batches (references bread_types.id)
 * - all_batches (references bread_types.id) 
 * - available_stock (references bread_types.id)
 * - sales_logs (references bread_types.id)
 * 
 * However, the deletion function only checks:
 * - production_logs (may not exist)
 * - sales_logs (correct)
 * 
 * This script will check all possible tables for the specific bread_type_id.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BREAD_TYPE_ID = '0245e4c2-40b4-4a61-a801-953013932f2a';

// Create direct Supabase client for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function debugBreadTypeDeletion() {
  
  console.log('🔍 Debugging bread type deletion for ID:', BREAD_TYPE_ID);
  console.log('========================================');
  
  try {
    // First, verify the bread type exists
    console.log('\n1. Checking if bread type exists...');
    const { data: breadType, error: breadTypeError } = await supabase
      .from('bread_types')
      .select('*')
      .eq('id', BREAD_TYPE_ID)
      .single();
    
    if (breadTypeError) {
      console.error('❌ Error fetching bread type:', breadTypeError);
      return;
    }
    
    if (!breadType) {
      console.log('❌ Bread type not found!');
      return;
    }
    
    console.log('✅ Bread type found:', breadType);
    
    // Check all possible referencing tables
    const tablesToCheck = [
      'batches',
      'all_batches', 
      'available_stock',
      'sales_logs',
      'production_logs'  // Also check this one from the current code
    ];
    
    console.log('\n2. Checking for references in related tables...');
    
    for (const tableName of tablesToCheck) {
      console.log(`\n📊 Checking ${tableName} table...`);
      
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('id, created_at', { count: 'exact' })
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(5); // Get first 5 records to see examples
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`⚠️  Table ${tableName} does not exist in database`);
          } else {
            console.error(`❌ Error querying ${tableName}:`, error);
          }
          continue;
        }
        
        console.log(`📈 ${tableName}: Found ${count} record(s)`);
        
        if (data && data.length > 0) {
          console.log(`🔗 Sample records from ${tableName}:`);
          data.forEach((record, index) => {
            console.log(`   ${index + 1}. ID: ${record.id}, Created: ${record.created_at}`);
          });
          
          if (count && count > 0) {
            console.log(`⚠️  BLOCKING: ${tableName} has ${count} record(s) referencing this bread_type_id`);
          }
        }
        
      } catch (catchError) {
        console.error(`❌ Exception checking ${tableName}:`, catchError);
      }
    }
    
    // Check what the UPDATED deletion function now checks
    console.log('\n3. Checking what UPDATED deleteBreadType function now checks...');
    
    try {
      // Replicate the exact checks from the UPDATED deletion function
      const checks = await Promise.all([
        // Check current batches
        supabase
          .from('batches')
          .select('id')
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(1),
        
        // Check all batches (historical records)
        supabase
          .from('all_batches')
          .select('id')
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(1),
        
        // Check available stock
        supabase
          .from('available_stock')
          .select('id')
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(1),
        
        // Check sales logs
        supabase
          .from('sales_logs')
          .select('id')
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(1),
          
        // Check production logs (if table exists)
        supabase
          .from('production_logs')
          .select('id')
          .eq('bread_type_id', BREAD_TYPE_ID)
          .limit(1)
      ]);
      
      const [batchesResult, allBatchesResult, stockResult, salesResult, productionResult] = checks;
      
      console.log('Updated function now checks:');
      console.log('- batches:', {
        error: batchesResult.error?.message,
        hasRecords: batchesResult.data && batchesResult.data.length > 0
      });
      console.log('- all_batches:', {
        error: allBatchesResult.error?.message,
        hasRecords: allBatchesResult.data && allBatchesResult.data.length > 0
      });
      console.log('- available_stock:', {
        error: stockResult.error?.message,
        hasRecords: stockResult.data && stockResult.data.length > 0
      });
      console.log('- sales_logs:', {
        error: salesResult.error?.message,
        hasRecords: salesResult.data && salesResult.data.length > 0
      });
      console.log('- production_logs:', {
        error: productionResult.error?.message,
        hasRecords: productionResult.data && productionResult.data.length > 0
      });
      
      // Determine if deletion would be blocked by the new checks
      const wouldBlock = (allBatchesResult.data && allBatchesResult.data.length > 0);
      console.log(`\n🎯 RESULT: Updated function would ${wouldBlock ? '❌ BLOCK' : '✅ ALLOW'} deletion`);
      if (wouldBlock) {
        console.log('🔍 Reason: Historical batch records found in all_batches table');
      }
      
    } catch (error) {
      console.error('❌ Error replicating updated function checks:', error);
    }
    
    // Test the actual deletion to see what error occurs
    console.log('\n4. Testing actual deletion...');
    
    try {
      const { error: deleteError } = await supabase
        .from('bread_types')
        .delete()
        .eq('id', BREAD_TYPE_ID);
      
      if (deleteError) {
        console.error('❌ Deletion failed with error:', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
        
        // Analyze the error
        if (deleteError.code === '23503') {
          console.log('🔍 Foreign key constraint violation detected');
          console.log('This means there ARE records in related tables preventing deletion');
          
          if (deleteError.message.includes('batches')) {
            console.log('💡 The constraint violation is from the BATCHES table');
          }
          if (deleteError.message.includes('available_stock')) {
            console.log('💡 The constraint violation is from the AVAILABLE_STOCK table');
          }
          if (deleteError.message.includes('all_batches')) {
            console.log('💡 The constraint violation is from the ALL_BATCHES table');
          }
          if (deleteError.message.includes('sales_logs')) {
            console.log('💡 The constraint violation is from the SALES_LOGS table');
          }
        }
        
      } else {
        console.log('✅ Deletion would succeed! No blocking references found.');
      }
      
    } catch (error) {
      console.error('❌ Exception during deletion test:', error);
    }
    
  } catch (error) {
    console.error('❌ Script execution error:', error);
  }
}

// Run the debug script
debugBreadTypeDeletion().catch(console.error);