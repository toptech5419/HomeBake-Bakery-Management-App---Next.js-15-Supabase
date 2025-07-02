import { Suspense } from 'react';
import { Metadata } from 'next';
import { ManagerProductionOverview } from '@/components/dashboards/manager/manager-production-overview';
import { ManagerQuickActions } from '@/components/dashboards/manager/manager-quick-actions';
import { ManagerShiftControl } from '@/components/dashboards/manager/manager-shift-control';
import { ManagerBatchSystem } from '@/components/dashboards/manager/manager-batch-system';
import { createServer } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Database } from '@/types/supabase';

export const metadata: Metadata = {
  title: 'Manager Dashboard - HomeBake',
  description: 'Production management and team coordination dashboard for bakery managers',
};

// Types for manager dashboard data

interface ProductionBatch {
  id: string;
  breadType: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
  startTime: string;
  estimatedCompletion: string;
  assignedStaff: string[];
  priority: 'low' | 'medium' | 'high';
  qualityScore?: number;
}

interface ProductionTarget {
  breadType: string;
  targetQuantity: number;
  currentQuantity: number;
  completion: number;
  shift: 'morning' | 'night';
}

// Real-time data fetching function
async function getManagerDashboardData() {
  const supabase = await createServer();
  
  // Check authentication and role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile and check if they're a manager
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'manager') {
    notFound();
  }

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Determine current shift
  const currentHour = new Date().getHours();
  const currentShift: 'morning' | 'night' = (currentHour >= 6 && currentHour < 14) ? 'morning' : 'night';

  // Fetch dashboard data
  const [
    { data: productionLogs },
    { data: breadTypes },
    { data: staff }
  ] = await Promise.all([
    // Production logs for today
    supabase
      .from('production_logs')
      .select('id, bread_type_id, quantity, shift, recorded_by, created_at')
      .gte('created_at', today)
      .order('created_at', { ascending: false }),
    
    // Bread types for targets and batch system
    supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .order('name', { ascending: true }),
    
    // Staff data
    supabase
      .from('users')
      .select('id, name, role')
      .neq('role', 'owner')
  ]);

  // Process production data into batches and metrics
  const activeBatches: ProductionBatch[] = productionLogs?.slice(0, 6).map(log => {
    const startTime = new Date(log.created_at);
    const estimatedCompletion = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    const breadType = breadTypes?.find(bt => bt.id === log.bread_type_id);
    
    // Simulate batch status based on time
    const now = new Date();
    const timeDiff = now.getTime() - startTime.getTime();
    const hoursPassed = timeDiff / (1000 * 60 * 60);
    
    let status: ProductionBatch['status'] = 'pending';
    if (hoursPassed > 0.5) status = 'in_progress';
    if (hoursPassed > 1.5) status = 'quality_check';
    if (hoursPassed > 2) status = 'completed';
    
    // Simulate priority
    const priority: ProductionBatch['priority'] = log.quantity > 50 ? 'high' : log.quantity > 25 ? 'medium' : 'low';
    
    return {
      id: log.id,
      breadType: breadType?.name || 'Unknown Bread',
      quantity: log.quantity,
      status,
      startTime: log.created_at,
      estimatedCompletion: estimatedCompletion.toISOString(),
      assignedStaff: [log.recorded_by], // Simplified
      priority,
      qualityScore: status === 'completed' ? Math.floor(Math.random() * 20) + 80 : undefined
    };
  }) || [];

  // Calculate production targets
  const targets: ProductionTarget[] = breadTypes?.map(breadType => {
    const relevantLogs = productionLogs?.filter(log => 
      log.bread_type_id === breadType.id && log.shift === currentShift
    ) || [];
    
    const currentQuantity = relevantLogs.reduce((sum, log) => sum + log.quantity, 0);
    const targetQuantity = 100; // Default target
    const completion = (currentQuantity / targetQuantity) * 100;
    
    return {
      breadType: breadType.name,
      targetQuantity,
      currentQuantity,
      completion: Math.min(completion, 100),
      shift: currentShift
    };
  }).slice(0, 5) || [];

  // Calculate metrics
  const completedToday = productionLogs?.filter(log => {
    const logTime = new Date(log.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - logTime.getTime();
    return timeDiff > 2 * 60 * 60 * 1000; // Completed if older than 2 hours
  }).length || 0;

  const todayTarget = targets.reduce((sum, target) => sum + target.targetQuantity, 0);
  const averageProductionTime = 85; // minutes, simulated
  const qualityScore = 92; // percentage, simulated
  const staffUtilization = 78; // percentage, simulated

  // Calculate alerts
  const overdeuBatches = activeBatches.filter(batch => 
    new Date(batch.estimatedCompletion) < new Date()
  ).length;

  const alerts = {
    activeBatches: activeBatches.filter(b => b.status === 'in_progress').length,
    overdeuBatches,
    staffIssues: 0, // Would be calculated from staff data
    inventoryAlerts: 2 // Simulated
  };

  return {
    user: {
      id: user.id,
      name: profile.name,
      role: profile.role
    },
    productionData: {
      activeBatches,
      completedToday,
      todayTarget,
      averageProductionTime,
      qualityScore,
      staffUtilization,
      currentShift,
      targets,
      lastUpdate: new Date().toISOString()
    },
    alerts,
    currentShift,
    breadTypes
  };
}

// Loading components
function ProductionOverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function QuickActionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ManagerDashboardPage() {
  const data = await getManagerDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Production Manager, {data.user.name}
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Manage production operations and team coordination
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={data.productionData.activeBatches.length > 0 ? 
                  "w-3 h-3 bg-green-400 rounded-full animate-pulse" : 
                  "w-3 h-3 bg-yellow-400 rounded-full"
                } />
                <span className="text-sm font-medium text-gray-600">
                  {data.productionData.activeBatches.length > 0 ? 'Production Active' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Shift Control Section - MOVED FROM PRODUCTION PAGE */}
          <ErrorBoundary fallback={<div>Error loading shift control</div>}>
            <Suspense fallback={<div className="h-32 bg-gray-100 rounded-lg animate-pulse" />}>
              <ManagerShiftControl currentUserId={data.user.id} />
            </Suspense>
          </ErrorBoundary>

          {/* Interactive Batch Management System */}
          <ErrorBoundary fallback={<div>Error loading batch system</div>}>
            <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />}>
              <ManagerBatchSystem 
                currentShift={data.currentShift}
                managerId={data.user.id}
                breadTypes={data.breadTypes || []}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Production Overview Section */}
          <ErrorBoundary fallback={<div>Error loading production overview</div>}>
            <Suspense fallback={<ProductionOverviewLoading />}>
              <ManagerProductionOverview data={data.productionData} />
            </Suspense>
          </ErrorBoundary>

          {/* Quick Actions Section */}
          <ErrorBoundary fallback={<div>Error loading actions</div>}>
            <Suspense fallback={<QuickActionsLoading />}>
              <ManagerQuickActions 
                alerts={data.alerts} 
                currentShift={data.currentShift}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile Bottom Padding */}
      <div className="h-20 md:hidden" />
    </div>
  );
}