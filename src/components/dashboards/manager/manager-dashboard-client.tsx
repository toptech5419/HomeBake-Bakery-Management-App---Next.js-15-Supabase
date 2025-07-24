"use client";
import { Suspense } from 'react';
import { useShift } from '@/contexts/ShiftContext';
import { ErrorBoundary } from '@/components/error-boundary';
import { ManagerShiftControl } from '@/components/dashboards/manager/manager-shift-control';
import { ManagerBatchSystem } from '@/components/dashboards/manager/manager-batch-system';
import { ManagerProductionOverview } from '@/components/dashboards/manager/manager-production-overview';
import { ManagerQuickActions } from '@/components/dashboards/manager/manager-quick-actions';
import { Skeleton } from '@/components/ui/skeleton';

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

interface ManagerDashboardClientProps {
  data: any; // You may want to type this more strictly
}

export function ManagerDashboardClient({ data }: ManagerDashboardClientProps) {
  const { currentShift } = useShift();
  // Pass currentShift to all components that need it
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Production Manager, {data.user.name}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1">
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

      {/* Shift Control Section */}
      <ErrorBoundary fallback={<div>Error loading shift control</div>}>
        <Suspense fallback={<div className="h-32 bg-gray-100 rounded-lg animate-pulse" />}>
          <ManagerShiftControl currentUserId={data.user.id} />
        </Suspense>
      </ErrorBoundary>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Interactive Batch Management System - Core production control */}
          <ErrorBoundary fallback={<div>Error loading batch system</div>}>
            <Suspense fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />}>
              <ManagerBatchSystem 
                currentShift={currentShift}
                managerId={data.user.id}
                breadTypes={data.breadTypes || []}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Production Overview Section - Key metrics */}
          <ErrorBoundary fallback={<div>Error loading production overview</div>}>
            <Suspense fallback={<ProductionOverviewLoading />}>
              <ManagerProductionOverview data={data.productionData} />
            </Suspense>
          </ErrorBoundary>

          {/* Quick Actions Section - Essential tools */}
          <ErrorBoundary fallback={<div>Error loading actions</div>}>
            <Suspense fallback={<QuickActionsLoading />}>
              <ManagerQuickActions 
                alerts={data.alerts} 
                currentShift={currentShift}
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