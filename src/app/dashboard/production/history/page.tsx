import { createServer } from '@/lib/supabase/server';
import { fetchProductionHistory } from '@/lib/production/actions';
import { getBreadTypes } from '@/lib/bread-types/actions';
import ProfessionalHistoryFilters from '@/components/production/professional-history-filters';
import ProductionTable from '@/components/production/production-table';
import CSVExport from '@/components/production/csv-export';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/ui/loading';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ProductionHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;

  // If role is not 'manager', fetch from business users table
  if (user && user.role !== 'manager') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) {
      user.role = profile.role;
    }
  }

  // Allow all authenticated users to view production history
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access production history.</p>
        </Card>
      </div>
    );
  }

  // Parse filters from searchParams
  const params = await searchParams;
  const bread_type_id = typeof params?.bread_type_id === 'string' ? params.bread_type_id : undefined;
  const shift = typeof params?.shift === 'string' ? params.shift as 'morning' | 'night' : undefined;
  const date = typeof params?.date === 'string' ? params.date : undefined;

  const logs = await fetchProductionHistory({
    bread_type_id,
    shift,
    date,
  });
  const breadTypes = await getBreadTypes();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/production">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Production</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production History</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">View and filter past bread production logs</p>
            </div>
          </div>
        </div>

        {/* Responsive Filters */}
        <div className="w-full">
          <ProfessionalHistoryFilters breadTypes={breadTypes} />
        </div>

        {/* Responsive Results Card */}
        <Card className="w-full">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="text-lg font-semibold">
                <span className="block sm:inline">Production Entries: </span>
                <span className="text-orange-600 font-bold">{logs.length}</span>
              </div>
              <div className="w-full sm:w-auto">
                <CSVExport logs={logs} filename="production-history" />
              </div>
            </div>
            
            {/* Responsive Table Container */}
            <div className="w-full overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner message="Loading production history..." />
                </div>
              }>
                <div className="overflow-x-auto">
                  <ProductionTable logs={logs} />
                </div>
              </Suspense>
            </div>
          </div>
        </Card>

        {/* Mobile Bottom Padding */}
        <div className="h-4 sm:h-8" />
      </div>
    </div>
  );
} 