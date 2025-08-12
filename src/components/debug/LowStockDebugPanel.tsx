'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getDailyLowStockCount } from '@/lib/low-stock/server-actions';

/**
 * Debug panel for testing low stock tracking system
 * Add this temporarily to your owner dashboard to test the system
 */
export function LowStockDebugPanel() {
  const [testResults, setTestResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔍 Testing Low Stock System...\n');

      // Test 1: Check server action
      results.push('📊 Test 1: Server Action');
      const totalCount = await getDailyLowStockCount();
      results.push(`   Total count from server action: ${totalCount}\n`);

      // Test 2: Check available stock
      results.push('📦 Test 2: Available Stock Query');
      const { data: stockData, error: stockError } = await supabase
        .from('available_stock')
        .select('bread_type_name, quantity')
        .gt('quantity', 0)
        .lte('quantity', 5);
      
      if (stockError) {
        results.push(`   Error: ${stockError.message}`);
      } else {
        results.push(`   Low stock items found: ${stockData?.length || 0}`);
        stockData?.forEach(item => {
          results.push(`   - ${item.bread_type_name}: ${item.quantity} units`);
        });
      }
      results.push('');

      // Test 3: Check daily counts table
      results.push('🗓️ Test 3: Daily Counts Table');
      try {
        const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_low_stock_count', {
          p_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
        });
        
        if (dailyError) {
          results.push(`   RPC Error: ${dailyError.message}`);
        } else {
          results.push(`   RPC Result: ${dailyData}`);
        }
      } catch (err) {
        results.push(`   Exception: ${err}`);
      }
      results.push('');

      // Test 4: Force refresh
      results.push('🔄 Test 4: Force Refresh');
      try {
        const { data: refreshData, error: refreshError } = await supabase.rpc('refresh_low_stock_counts_now');
        
        if (refreshError) {
          results.push(`   Refresh Error: ${refreshError.message}`);
        } else if (refreshData && refreshData.length > 0) {
          const result = refreshData[0];
          results.push(`   Refresh Success:`);
          results.push(`   - Morning: ${result.morning_count || 0}`);
          results.push(`   - Night: ${result.night_count || 0}`);
          results.push(`   - Total: ${result.total_count || 0}`);
        } else {
          results.push(`   Refresh returned no data`);
        }
      } catch (err) {
        results.push(`   Refresh Exception: ${err}`);
      }

      results.push('\n✅ Tests Complete!');
      
    } catch (error) {
      results.push(`\n❌ Error: ${error}`);
    }
    
    setTestResults(results.join('\n'));
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults('');
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">🔧 Low Stock Debug Panel</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={runTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Run Tests'}
        </button>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Clear
        </button>
      </div>

      {testResults && (
        <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
          {testResults}
        </pre>
      )}
    </div>
  );
}