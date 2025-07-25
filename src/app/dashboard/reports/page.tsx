import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import ReportsClient from './ReportsClient';
import { getReportData, getBreadTypes, ReportFilters } from '@/lib/reports/queries';

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

  // Allow owners, managers, and sales reps to access reports
  if (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'sales_rep') {
    return redirect('/dashboard');
  }

  // Parse search params for filters
  const params = await searchParams;
  const filters: ReportFilters = {
    startDate: typeof params.startDate === 'string' ? params.startDate : undefined,
    endDate: typeof params.endDate === 'string' ? params.endDate : undefined,
    shift: typeof params.shift === 'string' ? params.shift as 'morning' | 'night' : undefined,
    breadTypeId: typeof params.breadTypeId === 'string' ? params.breadTypeId : undefined,
  };

  // Restrict manager and sales rep to only their data
  if (user.role === 'manager' || user.role === 'sales_rep') {
    filters.recordedBy = user.id;
  }

  // Fetch data in parallel
  const [reportData, breadTypes] = await Promise.all([
    getReportData(filters),
    getBreadTypes()
  ]);

  return (
    <ReportsClient
      initialReportData={reportData}
      breadTypes={breadTypes}
      userRole={user.role as UserRole}
      userId={user.id}
      initialFilters={filters}
    />
  );
}