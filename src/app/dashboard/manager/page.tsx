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
  let shiftStartTime: string | null = null;

  try {
    // --- Active Batches - Get minimal data (client will handle shift filtering) ---
    const { data: activeBatches, error: activeBatchesError } = await supabase
      .from('batches')
      .select('id, bread_type_id, actual_quantity, status, created_at, batch_number, shift')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10); // Limit for performance, client will filter and manage data

    if (activeBatchesError) {
      console.error('Error fetching active batches:', activeBatchesError);
    }

    // Get bread type names for batches
    let breadTypeMap: Record<string, string> = {};
    if (activeBatches && activeBatches.length > 0) {
      const breadTypeIds = [...new Set(activeBatches.map(b => b.bread_type_id))];
      const { data: breadTypes, error: breadError } = await supabase
        .from('bread_types')
        .select('id, name')
        .in('id', breadTypeIds);

      if (!breadError && breadTypes) {
        breadTypeMap = breadTypes.reduce((acc, bt) => {
          acc[bt.id] = bt.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // --- Provide initial data (client will filter by user's preferred shift) ---
    const activeBatchesCount = activeBatches?.length || 0;

    // --- Recent Batches - Provide initial data (client will filter) ---
    const recentActiveBatches = (activeBatches || []).slice(0, 5).map(b => ({
      id: b.id,
      product: breadTypeMap[b.bread_type_id] || 'Unknown',
      quantity: b.actual_quantity || 0,
      status: b.status,
      time: getRelativeTime(b.created_at),
      batchNumber: b.batch_number || 'N/A',
      shift: b.shift, // Include shift info for client filtering
    }));

    // --- Initial progress data ---
    const progressPercentage = Math.min(100, Math.max(0, (activeBatchesCount * 15)));

    // --- Pass all data to client component ---
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
  } catch (error) {
    console.error('Error in manager dashboard:', error);
    
    // Return empty state on error
    return (
      <ManagerDashboardClient
        userName={profile.name}
        userId={profile.id}
        shiftStartTime={null}
        activeBatchesCount={0}
        recentBatches={[]}
        totalBatches={0}
        progressPercentage={0}
      />
    );
  }
}
