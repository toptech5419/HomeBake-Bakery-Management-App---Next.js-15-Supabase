import { createServer } from '@/lib/supabase/server';
import { fetchProductionHistory } from '@/lib/production/actions';
import { getBreadTypes } from '@/lib/bread-types/actions';
import ImprovedHistoryFilters from '@/components/production/improved-history-filters';
import ProductionTable from '@/components/production/production-table';
import CSVExport from '@/components/production/csv-export';
import { Card } from '@/components/ui/card';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/ui/loading';
import { Package } from 'lucide-react';

export default async function ProductionHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  let user = data?.user ? {
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

  if (!user || user.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only managers can access production history.</p>
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
    recorded_by: user.id,
    bread_type_id,
    shift,
    date,
  });
  const breadTypes = await getBreadTypes();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production History</h1>
            <p className="text-gray-600 mt-1">View and filter past bread production logs</p>
          </div>
        </div>
        <ImprovedHistoryFilters breadTypes={breadTypes} />
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="text-lg font-semibold">Entries: {logs.length}</div>
            <CSVExport logs={logs} filename="production-history" />
          </div>
          <Suspense fallback={<LoadingSpinner message="Loading production history..." />}>
            <ProductionTable logs={logs} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
} 