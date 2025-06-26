import { createServer } from '@/lib/supabase/server';
import { fetchTodayProductionLogs } from '@/lib/production/actions';
import ProductionTable from '@/components/production/production-table';
import ProductionForm from '@/components/production/production-form';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getBreadTypes } from '@/lib/bread-types/actions';
import LoadingSpinner from '@/components/ui/loading';
import { Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function ProductionPage() {
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
          <p className="text-muted-foreground">Only managers can access production logging.</p>
        </Card>
      </div>
    );
  }

  const logs = await fetchTodayProductionLogs(user.id);
  const breadTypes = await getBreadTypes();

  const totalToday = logs.reduce((sum, log) => sum + log.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Log</h1>
            <p className="text-gray-600 mt-1">Log today's bread production</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/production/history">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
          </div>
        </div>

        {/* Today's Summary */}
        <Card className="flex flex-row items-center justify-between gap-4">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-primary">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Entries</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-green-600">{totalToday}</div>
            <div className="text-sm text-muted-foreground">Total Units</div>
          </div>
        </Card>

        {/* Production Form */}
        <Suspense fallback={<LoadingSpinner message="Loading production form..." />}>
          <ProductionForm breadTypes={breadTypes} managerId={user.id} />
        </Suspense>

        {/* Today's Entries */}
        <Card>
          <div className="mb-4 text-lg font-semibold">Today's Production Entries</div>
          <Suspense fallback={<LoadingSpinner message="Loading production logs..." />}>
            <ProductionTable logs={logs} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
} 