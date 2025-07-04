import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import ReportsClient from './ReportsClient';
import { getReportData, getBreadTypes } from '@/lib/reports/queries';
import { ErrorBoundary } from '@/components/error-boundary';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ReportsErrorFallback, ClientErrorFallback } from '@/components/error-fallbacks/client-error-fallback';

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

  // Only owners and managers can access reports
  if (user.role !== 'owner' && user.role !== 'manager') {
    return redirect('/dashboard');
  }

  // Parse search params for filters
  const params = await searchParams;
  const filters = {
    startDate: typeof params.startDate === 'string' ? params.startDate : undefined,
    endDate: typeof params.endDate === 'string' ? params.endDate : undefined,
    shift: typeof params.shift === 'string' ? params.shift as 'morning' | 'night' : undefined,
    breadTypeId: typeof params.breadTypeId === 'string' ? params.breadTypeId : undefined,
  };

  // Fetch data in parallel with error handling
  try {
    const [reportData, breadTypes] = await Promise.all([
      getReportData(filters),
      getBreadTypes()
    ]);

    return (
      <ErrorBoundary 
        fallback={<ReportsErrorFallback />}
        componentName="Reports Dashboard"
      >
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading reports dashboard...</p>
            </Card>
          </div>
        }>
          <ReportsClient
            initialReportData={reportData}
            breadTypes={breadTypes}
            userRole={user.role as UserRole}
            userId={user.id}
            initialFilters={filters}
          />
        </Suspense>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error loading reports page:', error);
    return (
      <ClientErrorFallback 
        title="Failed to Load Reports"
        message="Unable to fetch report data. Please try again later."
      />
    );
  }
}