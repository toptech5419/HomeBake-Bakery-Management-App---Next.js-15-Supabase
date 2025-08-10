'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { checkAndSaveBatchesToAllBatches, deleteAllBatches } from '@/lib/batches/actions';

interface BatchInfo {
  id: string;
  batch_number: string;
  shift: string;
  status: string;
  created_at: string;
  created_by: string;
  actual_quantity: number;
  bread_type_name?: string;
}

interface DebugResults {
  currentUser?: any;
  batchesTable: BatchInfo[];
  allBatchesTable: BatchInfo[];
  currentShift: string;
}

export default function ShiftDebugger() {
  const [debugResults, setDebugResults] = useState<DebugResults>({
    batchesTable: [],
    allBatchesTable: [],
    currentShift: 'morning'
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Load current state
  const loadDebugInfo = async () => {
    setLoading(true);
    addLog('🔍 Loading current database state...');

    try {
      // Get current user with session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        addLog('❌ User not authenticated - please login first');
        addLog(`❌ Session error: ${sessionError?.message || 'No session found'}`);
        return;
      }

      const user = session.user;
      addLog(`✅ Current user: ${user.id} (${user.email})`);

      // Also check if user exists in users table
      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', user.id)
        .single();

      if (userRecordError) {
        addLog(`❌ User not found in users table: ${userRecordError.message}`);
        return;
      }

      addLog(`✅ Current user: ${user.id}`);

      // Get user details
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (userData) {
        addLog(`✅ User details: ${userData.name} (${userData.role})`);
      }

      // Get batches from 'batches' table
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select(`
          id, batch_number, shift, status, created_at, created_by, actual_quantity,
          bread_types (name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (batchesError) {
        addLog(`❌ Error loading batches: ${batchesError.message}`);
      } else {
        addLog(`✅ Loaded ${batches?.length || 0} batches from 'batches' table`);
      }

      // Get batches from 'all_batches' table
      const { data: allBatches, error: allBatchesError } = await supabase
        .from('all_batches')
        .select(`
          id, batch_number, shift, status, created_at, created_by, actual_quantity,
          bread_types (name)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (allBatchesError) {
        addLog(`❌ Error loading all_batches: ${allBatchesError.message}`);
      } else {
        addLog(`✅ Loaded ${allBatches?.length || 0} batches from 'all_batches' table`);
      }

      // Process and format the data
      const formatBatches = (batchData: any[]): BatchInfo[] => {
        return batchData?.map(batch => ({
          id: batch.id,
          batch_number: batch.batch_number,
          shift: batch.shift,
          status: batch.status,
          created_at: batch.created_at,
          created_by: batch.created_by,
          actual_quantity: batch.actual_quantity,
          bread_type_name: batch.bread_types?.name || 'Unknown'
        })) || [];
      };

      setDebugResults({
        currentUser: { ...user, ...userData },
        batchesTable: formatBatches(batches || []),
        allBatchesTable: formatBatches(allBatches || []),
        currentShift: 'morning' // Default, can be changed by user
      });

      addLog('✅ Debug info loaded successfully');

    } catch (error: any) {
      addLog(`❌ Error loading debug info: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test save batches to all_batches
  const testSaveBatches = async (shift: 'morning' | 'night') => {
    addLog(`🧪 Testing batch save process for ${shift} shift...`);
    
    try {
      const result = await checkAndSaveBatchesToAllBatches(shift);
      if (result.needsSaving) {
        addLog(`✅ Saved ${result.savedCount} batches to all_batches`);
      } else {
        addLog(`ℹ️ No batches needed saving (already saved)`);
      }
      
      // Reload data to see changes
      await loadDebugInfo();
      
    } catch (error: any) {
      addLog(`❌ Error testing batch save: ${error.message}`);
    }
  };

  // Test delete batches
  const testDeleteBatches = async (shift: 'morning' | 'night') => {
    addLog(`🧪 Testing batch deletion for ${shift} shift...`);
    
    try {
      await deleteAllBatches(shift);
      addLog(`✅ Successfully deleted ${shift} shift batches`);
      
      // Reload data to see changes
      await loadDebugInfo();
      
    } catch (error: any) {
      addLog(`❌ Error testing batch deletion: ${error.message}`);
    }
  };

  // Simulate full end shift process
  const simulateEndShift = async (shift: 'morning' | 'night') => {
    addLog(`🎭 Simulating full end shift process for ${shift} shift...`);
    
    try {
      // Step 1: Save batches to all_batches
      addLog(`Step 1: Saving ${shift} batches to all_batches...`);
      const saveResult = await checkAndSaveBatchesToAllBatches(shift);
      if (saveResult.needsSaving) {
        addLog(`✅ Step 1 complete: Saved ${saveResult.savedCount} batches`);
      } else {
        addLog(`ℹ️ Step 1 complete: All batches already saved`);
      }
      
      // Step 2: Delete batches from batches table
      addLog(`Step 2: Deleting ${shift} batches from batches table...`);
      await deleteAllBatches(shift);
      addLog(`✅ Step 2 complete: Deleted ${shift} shift batches`);
      
      addLog(`🎉 End shift simulation complete for ${shift} shift`);
      
      // Reload data to see final state
      await loadDebugInfo();
      
    } catch (error: any) {
      addLog(`❌ End shift simulation failed: ${error.message}`);
    }
  };

  // Load debug info on mount
  useEffect(() => {
    loadDebugInfo();
  }, []);

  const getBatchesForShift = (batches: BatchInfo[], shift: string) => {
    return batches.filter(b => b.shift === shift);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Debug Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <select
            value={debugResults.currentShift}
            onChange={(e) => setDebugResults(prev => ({ ...prev, currentShift: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="morning">Morning Shift</option>
            <option value="night">Night Shift</option>
          </select>
          
          <button
            onClick={loadDebugInfo}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Reload Data'}
          </button>
          
          <button
            onClick={() => testSaveBatches(debugResults.currentShift as 'morning' | 'night')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Test Save Batches
          </button>
          
          <button
            onClick={() => testDeleteBatches(debugResults.currentShift as 'morning' | 'night')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Test Delete Batches
          </button>
        </div>
        
        <button
          onClick={() => simulateEndShift(debugResults.currentShift as 'morning' | 'night')}
          className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
        >
          🎭 Simulate Full End Shift Process ({debugResults.currentShift})
        </button>
      </div>

      {/* Current State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batches Table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Current Batches (Live)</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {debugResults.batchesTable.length} total
            </span>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {['morning', 'night'].map(shift => {
              const shiftBatches = getBatchesForShift(debugResults.batchesTable, shift);
              return (
                <div key={shift} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{shift} Shift</h4>
                    <span className="text-sm text-gray-500">{shiftBatches.length} batches</span>
                  </div>
                  {shiftBatches.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No batches</p>
                  ) : (
                    <div className="space-y-1">
                      {shiftBatches.map(batch => (
                        <div key={batch.id} className="text-xs bg-gray-50 p-2 rounded">
                          <div className="font-medium">{batch.batch_number}</div>
                          <div className="text-gray-600">
                            {batch.bread_type_name} • {batch.actual_quantity} units • {batch.status}
                          </div>
                          <div className="text-gray-500">
                            {new Date(batch.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* All Batches Table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Historical Batches (Archive)</h3>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {debugResults.allBatchesTable.length} total
            </span>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {['morning', 'night'].map(shift => {
              const shiftBatches = getBatchesForShift(debugResults.allBatchesTable, shift);
              return (
                <div key={shift} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{shift} Shift</h4>
                    <span className="text-sm text-gray-500">{shiftBatches.length} batches</span>
                  </div>
                  {shiftBatches.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No batches</p>
                  ) : (
                    <div className="space-y-1">
                      {shiftBatches.slice(0, 5).map(batch => (
                        <div key={batch.id} className="text-xs bg-gray-50 p-2 rounded">
                          <div className="font-medium">{batch.batch_number}</div>
                          <div className="text-gray-600">
                            {batch.bread_type_name} • {batch.actual_quantity} units • {batch.status}
                          </div>
                          <div className="text-gray-500">
                            {new Date(batch.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      {shiftBatches.length > 5 && (
                        <div className="text-xs text-gray-500 text-center">
                          ... and {shiftBatches.length - 5} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Debug Logs</h3>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Clear Logs
          </button>
        </div>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet... Click "Reload Data" to start</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}