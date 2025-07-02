import { Suspense } from 'react';
import { Metadata } from 'next';
import { OwnerMetrics } from '@/components/dashboards/owner/owner-metrics';
import { OwnerQuickActions } from '@/components/dashboards/owner/owner-quick-actions';
import { OwnerActivityFeed } from '@/components/dashboards/owner/owner-activity-feed';
import { createServer } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';


export const metadata: Metadata = {
  title: 'Owner Dashboard - HomeBake',
  description: 'Strategic overview and management dashboard for bakery owners',
};

// Types for the dashboard data
type SaleRecord = {
  id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  bread_type_id: string;
  created_at: string;
};

type ProductionRecord = {
  id: string;
  quantity: number;
  shift: 'morning' | 'night';
  created_at: string;
};



interface Activity {
  id: string;
  type: 'sale' | 'production' | 'inventory' | 'staff' | 'alert' | 'system';
  title: string;
  description: string;
  amount?: number;
  user?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  status?: 'success' | 'warning' | 'error' | 'info';
}

// Real-time data fetching function
async function getOwnerDashboardData() {
  const supabase = await createServer();
  
  // Check authentication and role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile and check if they're an owner
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'owner') {
    notFound();
  }

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Fetch dashboard metrics
  const [
    { data: todaySales },
    { data: yesterdaySales },
    { data: production },
    { data: staff }
  ] = await Promise.all([
    // Today's sales
    supabase
      .from('sales_logs')
      .select('id, quantity, unit_price, discount, bread_type_id, created_at')
      .gte('created_at', today)
      .order('created_at', { ascending: false }),
    
    // Yesterday's sales for comparison
    supabase
      .from('sales_logs')
      .select('id, quantity, unit_price, discount, bread_type_id, created_at')
      .gte('created_at', yesterdayStr)
      .lt('created_at', today),
    
    // Production data
    supabase
      .from('production_logs')
      .select('id, quantity, shift, created_at')
      .order('created_at', { ascending: false }),
    
    // Staff data
    supabase
      .from('users')
      .select('id, name, role, created_at')
      .neq('role', 'owner')
  ]);

  // Calculate today's revenue
  const todayRevenue = todaySales?.reduce((sum: number, sale: SaleRecord) => {
    const saleAmount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
    return sum + saleAmount;
  }, 0) || 0;

  // Calculate yesterday's revenue
  const yesterdayRevenue = yesterdaySales?.reduce((sum: number, sale: SaleRecord) => {
    const saleAmount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
    return sum + saleAmount;
  }, 0) || 0;

  // Production metrics - simulate status based on creation time
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  
  const activeProduction = production?.filter((p: ProductionRecord) => 
    new Date(p.created_at) > threeHoursAgo
  ).length || 0;
  const totalProduction = production?.length || 0;

  // Inventory metrics (simulated)
  const inventoryValue = 50000; // This would come from an inventory table
  const lowStockItems = 3; // This would be calculated from inventory thresholds

  // Staff metrics (simulated online status)
  const staffOnline = Math.floor((staff?.length || 0) * 0.7); // 70% online simulation
  const totalStaff = staff?.length || 0;

  // Determine current shift
  const currentHour = new Date().getHours();
  const currentShift: 'morning' | 'night' = (currentHour >= 6 && currentHour < 14) ? 'morning' : 'night';

  // Generate sample activities based on real data
  const activities: Activity[] = [
    ...(todaySales?.slice(0, 5).map((sale: SaleRecord) => ({
      id: sale.id,
      type: 'sale' as const,
      title: 'New Sale Recorded',
      description: `${sale.quantity} items sold`,
      amount: (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0),
      user: 'Sales Rep',
      timestamp: sale.created_at,
      priority: 'medium' as const,
      status: 'success' as const
    })) || []),
    ...(production?.slice(0, 3).map((prod: ProductionRecord) => ({
      id: prod.id,
      type: 'production' as const,
      title: 'Production Completed',
      description: `${prod.quantity} items produced in ${prod.shift} shift`,
      user: 'Production Team',
      timestamp: prod.created_at,
      priority: 'low' as const,
      status: 'success' as const
    })) || []),
    {
      id: 'alert-1',
      type: 'alert' as const,
      title: 'Low Stock Alert',
      description: `${lowStockItems} items below threshold`,
      timestamp: new Date().toISOString(),
      priority: 'high' as const,
      status: 'warning' as const
    }
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    user: {
      name: profile.name,
      role: profile.role
    },
    metrics: {
      todayRevenue,
      yesterdayRevenue,
      activeProduction,
      totalProduction,
      inventoryValue,
      lowStockItems,
      staffOnline,
      totalStaff,
      currentShift,
      lastUpdate: new Date().toISOString()
    },
    alerts: {
      lowStock: lowStockItems,
      pendingReports: 0,
      staffNotifications: 0
    },
    activities
  };
}

// Loading components
function MetricsLoading() {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
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
    </div>
  );
}

function ActivityFeedLoading() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function OwnerDashboardPage() {
  const data = await getOwnerDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {data.user.name}
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Here&apos;s your bakery&apos;s performance overview
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-600">
                  Live Data
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Metrics Section */}
          <ErrorBoundary fallback={<div>Error loading metrics</div>}>
            <Suspense fallback={<MetricsLoading />}>
              <OwnerMetrics data={data.metrics} />
            </Suspense>
          </ErrorBoundary>

          {/* Quick Actions Section */}
          <ErrorBoundary fallback={<div>Error loading actions</div>}>
            <Suspense fallback={<QuickActionsLoading />}>
              <OwnerQuickActions alerts={data.alerts} />
            </Suspense>
          </ErrorBoundary>

          {/* Activity Feed Section */}
          <ErrorBoundary fallback={<div>Error loading activity feed</div>}>
            <Suspense fallback={<ActivityFeedLoading />}>
              <OwnerActivityFeed activities={data.activities} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile Bottom Padding */}
      <div className="h-20 md:hidden" />
    </div>
  );
}