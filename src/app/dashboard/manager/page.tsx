import { createServer } from '@/lib/supabase/server';
import { getRelativeTime } from '@/lib/utils/timezone';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import ManagerDashboardClient from './ManagerDashboardClient';

export const metadata: Metadata = {
  title: 'Manager Dashboard - HomeBake',
  description: 'Production management and team coordination dashboard for bakery managers',
};

export default async function ManagerDashboardPage() {
  const supabase = await createServer();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', user.id)
    .single();
  if (profileError || !profile || (profile.role !== 'manager' && profile.role !== 'owner')) redirect('/dashboard');

  // --- Let client handle shift selection ---
  // Server provides fallback data, but client will use user's stored preference
  const shiftStartTime: string | null = null;

  // Default safe fallback data
  let safeBatches: any[] = [];
  let breadTypeMap: Record<string, string> = {};

  try {
    // --- Active Batches - CRITICAL FIX: Filter by current user like the API does ---
    const { data: activeBatches, error: activeBatchesError } = await supabase
      .from('batches')
      .select('id, bread_type_id, actual_quantity, status, created_at, batch_number, shift')
      .eq('status', 'active')
      .eq('created_by', user.id) // CRITICAL FIX: Filter by current user
      .order('created_at', { ascending: false })
      .limit(10);

    if (activeBatchesError) {
      console.error('Error fetching active batches for user:', user.id, activeBatchesError);
    } else {
      // Use fetched data if successful
      safeBatches = activeBatches || [];
      console.log(`📊 Manager dashboard server: Found ${safeBatches.length} batches for user ${user.id}`);
    }

    // Get bread type names for batches with safe error handling
    if (safeBatches && safeBatches.length > 0) {
      try {
        const breadTypeIds = [...new Set(safeBatches
          .filter(b => b && b.bread_type_id) // Filter out invalid entries
          .map(b => b.bread_type_id)
        )];
        
        if (breadTypeIds.length > 0) {
          const { data: breadTypes, error: breadError } = await supabase
            .from('bread_types')
            .select('id, name')
            .in('id', breadTypeIds);

          if (!breadError && breadTypes) {
            breadTypeMap = breadTypes.reduce((acc, bt) => {
              if (bt && bt.id && bt.name) {
                acc[bt.id] = bt.name;
              }
              return acc;
            }, {} as Record<string, string>);
          }
        }
      } catch (breadTypeError) {
        console.error('Error fetching bread types:', breadTypeError);
        // Continue with empty breadTypeMap
      }
    }

  } catch (serverError) {
    console.error('Server error in manager dashboard:', serverError);
    // On any server error, use safe fallback data
    safeBatches = [];
    breadTypeMap = {};
  }

  // Always provide safe data to prevent crashes
  const activeBatchesCount = safeBatches?.length || 0;

  // Process batches safely
  const recentActiveBatches = safeBatches
    .filter(b => b && b.id && b.created_at) // Filter out invalid batches
    .slice(0, 5)
    .map(b => {
      try {
        return {
          id: b.id,
          product: breadTypeMap[b.bread_type_id] || 'Unknown',
          quantity: b.actual_quantity || 0,
          status: b.status || 'active',
          time: b.created_at ? getRelativeTime(b.created_at) : 'Unknown time',
          batchNumber: b.batch_number || 'N/A',
          shift: (b.shift as 'morning' | 'night') || 'morning',
        };
      } catch (error) {
        console.error('Error processing batch:', error, b);
        return {
          id: b.id || 'unknown',
          product: 'Unknown',
          quantity: 0,
          status: 'active',
          time: 'Unknown time',
          batchNumber: 'N/A',
          shift: 'morning' as 'morning' | 'night',
        };
      }
    });

  const progressPercentage = Math.min(100, Math.max(0, (activeBatchesCount * 15)));

  // Always return a valid component
  return (
    <ManagerDashboardClient
      userName={profile.name}
      userId={profile.id}
      shiftStartTime={shiftStartTime}
      activeBatchesCount={activeBatchesCount}
      recentBatches={recentActiveBatches}
      totalBatches={activeBatchesCount}
      progressPercentage={progressPercentage}
    />
  );
}
