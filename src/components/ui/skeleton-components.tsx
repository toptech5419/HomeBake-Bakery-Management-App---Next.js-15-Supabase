/**
 * Production-ready skeleton components for loading states
 * Optimized for HomeBake's mobile-first design
 */

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

// Base skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted skeleton',
        className
      )}
      {...props}
    />
  );
}

// Dashboard card skeleton
export function DashboardCardSkeleton() {
  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    </Card>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Batch list skeleton
export function BatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Sales log skeleton
export function SalesLogSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-2 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number; 
  columns?: number; 
}) {
  return (
    <div className="w-full">
      {/* Table header */}
      <div className="flex items-center space-x-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center space-x-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'w-16', // First column smaller
                colIndex === columns - 1 && 'w-20' // Last column medium
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ 
  fields = 3,
  hasSubmitButton = true 
}: { 
  fields?: number;
  hasSubmitButton?: boolean;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      
      {hasSubmitButton && (
        <div className="pt-4">
          <Skeleton className="h-10 w-full md:w-32 rounded-md" />
        </div>
      )}
    </div>
  );
}

// Navigation skeleton
export function NavigationSkeleton() {
  return (
    <nav className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-2">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </nav>
  );
}

// Chart skeleton
export function ChartSkeleton({ 
  height = 300,
  showLegend = true 
}: { 
  height?: number;
  showLegend?: boolean;
}) {
  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-4">
        {/* Chart title */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        
        {/* Chart area */}
        <div className="space-y-2">
          <Skeleton className={`w-full`} style={{ height: `${height}px` }} />
        </div>
        
        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-center space-x-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Activity feed skeleton
export function ActivityFeedSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3">
          <Skeleton className="h-8 w-8 rounded-full mt-1" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page skeleton with layout
export function PageSkeleton({
  hasHeader = true,
  hasSidebar = false,
  headerHeight = 16,
  sidebarWidth = 64,
}: {
  hasHeader?: boolean;
  hasSidebar?: boolean;
  headerHeight?: number;
  sidebarWidth?: number;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {hasHeader && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        {/* Sidebar */}
        {hasSidebar && (
          <aside className={`w-${sidebarWidth} border-r bg-card p-4`}>
            <NavigationSkeleton />
          </aside>
        )}
        
        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {/* Page title */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            
            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DashboardCardSkeleton />
                <TableSkeleton />
              </div>
              <div className="space-y-6">
                <Card className="p-4">
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <ActivityFeedSkeleton count={4} />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Loading overlay skeleton
export function LoadingOverlaySkeleton({
  message = 'Loading...'
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="absolute inset-0 animate-spin">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-24 mx-auto" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Mobile-optimized skeleton components
export function MobileBatchCardSkeleton() {
  return (
    <Card className="p-4 touch-target">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

export function MobileStatsCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-8 rounded-md mx-auto" />
        <Skeleton className="h-6 w-20 mx-auto" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </div>
    </Card>
  );
}

// Responsive skeleton grid
export function ResponsiveSkeletonGrid({
  desktop = 4,
  tablet = 2,
  mobile = 1,
  count = 8,
  component: Component = DashboardCardSkeleton
}: {
  desktop?: number;
  tablet?: number;
  mobile?: number;
  count?: number;
  component?: React.ComponentType;
}) {
  return (
    <div className={cn(
      'grid gap-4 md:gap-6',
      `grid-cols-${mobile}`,
      `md:grid-cols-${tablet}`,
      `lg:grid-cols-${desktop}`
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}