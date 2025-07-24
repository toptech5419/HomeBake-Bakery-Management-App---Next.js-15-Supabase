import { createServer } from '@/lib/supabase/server';
import { getRelativeTime } from '@/lib/utils/timezone';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
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

  // --- Shift detection ---
  let currentShift: 'morning' | 'night' = 'morning';
  let shiftStartTime: string | null = null;
  
  // Infer from current hour (Nigeria time)
  const now = new Date();
  const tz = 'Africa/Lagos';
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const hour = local.getHours();
  currentShift = hour >= 6 && hour < 14 ? 'morning' : 'night';
  shiftStartTime = null;

  try {
    // --- Active Batches - Only active batches for current shift ---
    const { data: activeBatches, error: activeBatchesError } = await supabase
      .from('batches')
      .select('id, bread_type_id, actual_quantity, status, created_at, batch_number')
      .eq('status', 'active')
      .eq('shift', currentShift) // Filter by current shift
      .order('created_at', { ascending: false });

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

    // --- Active Batches Count ---
    const activeBatchesCount = activeBatches?.length || 0;

    // --- Recent Batches - Only active batches for current shift ---
    const recentActiveBatches = (activeBatches || []).slice(0, 5).map(b => ({
      id: b.id,
      product: breadTypeMap[b.bread_type_id] || 'Unknown',
      quantity: b.actual_quantity || 0,
      status: b.status,
      time: getRelativeTime(b.created_at),
      batchNumber: b.batch_number || 'N/A',
    }));

    // --- Production Overview - Based on active batches for current shift ---
    const progressPercentage = Math.min(100, Math.max(0, (activeBatchesCount * 15)));

    // --- Pass all data to client component ---
    return (
      <ManagerDashboardClient
        userName={profile.name}
        currentShift={currentShift}
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
        currentShift={currentShift}
        shiftStartTime={shiftStartTime}
        activeBatchesCount={0}
        recentBatches={[]}
        totalBatches={0}
        progressPercentage={0}
      />
    );
  }
}
