import { createServer } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { UserRole } from '@/types';
import ShiftReportClient from './ShiftReportClient';
import { getShiftDetails } from '@/lib/reports/queries';

export default async function ShiftReportPage({
  params
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  
  let user = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;

  // If role is not in metadata, fetch from business users table
  if (user && !user.role) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      user = { ...user, role: profile.role };
    }
  }

  // Redirect if not authenticated
  if (!user) {
    return redirect('/login');
  }

  // Only owners and managers can access reports
  if (user.role !== 'owner' && user.role !== 'manager') {
    return redirect('/dashboard');
  }

  // Get shiftId from params
  const { shiftId } = await params;

  // Fetch shift details
  const shiftData = await getShiftDetails(shiftId);

  if (!shiftData) {
    notFound();
  }

  return (
    <ShiftReportClient
      shiftData={shiftData}
      userRole={user.role as UserRole}
      userId={user.id}
    />
  );
}