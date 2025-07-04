import { createServer } from '@/lib/supabase/server';

import ProductionTable from '@/components/production/production-table';
import ProductionForm from '@/components/production/production-form';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBreadTypes } from '@/lib/bread-types/actions';
import LoadingSpinner from '@/components/ui/loading';
import { ErrorBoundary } from '@/components/error-boundary';

import { Package, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function ProductionPage() {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  const initialUser = data?.user ? {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || null,
  } : null;
  
  let user = initialUser;

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access production data.</p>
        </Card>
      </div>
    );
  }

  // Fetch today's production logs - OPTIMIZED with limits to prevent browser crashes
  const { data: allLogsData } = await supabase
    .from('production_logs')
    .select('id, bread_type_id, quantity, shift, created_at, bread_types(name), recorded_by')
    .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
    .order('created_at', { ascending: false })
    .limit(50); // Limit to prevent excessive data processing
    
  const logs = allLogsData || [];
  const breadTypes = await getBreadTypes();

  const totalToday = logs.reduce((sum, log) => sum + log.quantity, 0);
  
  // Get shift-specific metrics
  const morningLogs = logs.filter(log => log.shift === 'morning');
  const nightLogs = logs.filter(log => log.shift === 'night');
  const morningTotal = morningLogs.reduce((sum, log) => sum + log.quantity, 0);
  const nightTotal = nightLogs.reduce((sum, log) => sum + log.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Log</h1>
            <p className="text-gray-600 mt-1">Log today&apos;s bread production</p>
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

        {/* Note: Shift Control moved to Manager Dashboard */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Package className="h-4 w-4" />
            <span className="text-sm font-medium">
              Shift management has been moved to the Manager Dashboard for better production oversight.
            </span>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalToday}</div>
            <div className="text-sm text-muted-foreground">Total Units</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{morningTotal}</div>
            <div className="text-sm text-muted-foreground">Morning Shift</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{nightTotal}</div>
            <div className="text-sm text-muted-foreground">Night Shift</div>
          </Card>
        </div>

        {/* Production Form - Only for managers - OPTIMIZED with error boundary */}
        {user.role === 'manager' && breadTypes.length > 0 && (
          <ErrorBoundary fallback={
            <Card className="p-6 text-center border-red-200 bg-red-50">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold mb-2 text-red-800">Production Form Error</h3>
              <p className="text-red-700 mb-4">
                There was an issue loading the production form. Please refresh the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </Card>
          }>
            <Suspense fallback={<LoadingSpinner message="Loading production form..." />}>
              <ProductionForm 
                breadTypes={breadTypes.slice(0, 10)} // Limit bread types to prevent performance issues
                managerId={user.id}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        
        {user.role === 'manager' && breadTypes.length === 0 && (
          <Card className="p-6 text-center border-yellow-200 bg-yellow-50">
            <Package className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="text-lg font-semibold mb-2 text-yellow-800">No Bread Types Available</h3>
            <p className="text-yellow-700 mb-4">
              You need to create bread types before logging production.
            </p>
            <Link href="/dashboard/bread-types">
              <Button>
                Manage Bread Types
              </Button>
            </Link>
          </Card>
        )}
        
        {user.role !== 'manager' && (
          <Card className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Production Logging</h3>
            <p className="text-muted-foreground mb-4">
              Only managers can log new production entries. You can view all production data below.
            </p>
            <Badge className="bg-blue-100 text-blue-800">
              {user.role === 'owner' ? 'Owner' : 'Sales Rep'} - View Only Access
            </Badge>
          </Card>
        )}

        {/* Today's Entries - OPTIMIZED with limited data */}
        <Card className="p-6">
          <div className="mb-4 text-lg font-semibold">Today&apos;s Production Entries</div>
          <div className="mb-2 text-sm text-muted-foreground">
            Showing {logs.length} most recent entries {logs.length >= 50 && '(limited to 50)'}
          </div>
          <Suspense fallback={<LoadingSpinner message="Loading production logs..." />}>
            <ProductionTable logs={logs} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
} 