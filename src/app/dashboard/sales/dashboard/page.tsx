import { Suspense } from 'react';
import { Metadata } from 'next';
import { SalesMetrics } from '@/components/dashboards/sales/sales-metrics';
import { SalesQuickActions } from '@/components/dashboards/sales/sales-quick-actions';
import { createServer } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'Sales Dashboard - HomeBake',
  description: 'Sales performance and transaction management dashboard for sales representatives',
};

// Types for sales dashboard data
type SalesRecord = {
  id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  bread_type_id: string;
  created_at: string;
  shift: 'morning' | 'night';
  recorded_by: string;
};

interface SalesTarget {
  dailyTarget: number;
  currentSales: number;
  completion: number;
  timeRemaining: number; // hours until shift end
}

// Real-time data fetching function
async function getSalesDashboardData() {
  const supabase = await createServer();
  
  // Check authentication and role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile and check if they're a sales rep
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'sales_rep') {
    notFound();
  }

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Determine current shift
  const currentHour = new Date().getHours();
  const currentShift: 'morning' | 'night' = (currentHour >= 6 && currentHour < 14) ? 'morning' : 'night';

  // Fetch sales data
  const [
    { data: todaySales },
    { data: yesterdaySales },
    { data: breadTypes }
  ] = await Promise.all([
    // Today's sales
    supabase
      .from('sales_logs')
      .select('id, quantity, unit_price, discount, bread_type_id, created_at, shift, recorded_by')
      .gte('created_at', today)
      .order('created_at', { ascending: false }),
    
    // Yesterday's sales for comparison
    supabase
      .from('sales_logs')
      .select('id, quantity, unit_price, discount, bread_type_id, created_at, shift, recorded_by')
      .gte('created_at', yesterdayStr)
      .lt('created_at', today),
    
    // Bread types for analysis
    supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .order('name', { ascending: true })
  ]);

  // Transform sales data to match component expectations
  const transformedTodaySales = todaySales?.map(sale => ({
    id: sale.id,
    breadType: breadTypes?.find(bt => bt.id === sale.bread_type_id)?.name || 'Unknown',
    quantity: sale.quantity,
    unitPrice: sale.unit_price || 0,
    discount: sale.discount || 0,
    timestamp: sale.created_at,
    customerType: 'individual' as const // Default customer type
  })) || [];

  // Calculate today's revenue
  const todayRevenue = transformedTodaySales.reduce((sum, sale) => {
    const saleAmount = (sale.quantity * sale.unitPrice) - sale.discount;
    return sum + saleAmount;
  }, 0);

  // Calculate yesterday's revenue
  const yesterdayRevenue = yesterdaySales?.reduce((sum: number, sale: SalesRecord) => {
    const saleAmount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
    return sum + saleAmount;
  }, 0) || 0;

  // Calculate weekly average (simplified - last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const { data: weeklySales } = await supabase
    .from('sales_logs')
    .select('quantity, unit_price, discount')
    .gte('created_at', weekAgoStr);

  const weeklyRevenue = weeklySales?.reduce((sum: number, sale: any) => {
    const saleAmount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
    return sum + saleAmount;
  }, 0) || 0;
  const weeklyAverage = weeklyRevenue / 7;

  // Calculate customer count (unique recorded_by users)
  const customerCount = new Set(todaySales?.map(sale => sale.recorded_by) || []).size;

  // Find top selling bread
  const breadTypeSales = breadTypes?.map(breadType => {
    const relevantSales = transformedTodaySales.filter(sale => sale.breadType === breadType.name) || [];
    const totalQuantity = relevantSales.reduce((sum, sale) => sum + sale.quantity, 0);
    return { name: breadType.name, quantity: totalQuantity };
  }) || [];
  
  const topSellingBread = breadTypeSales.reduce((max, current) => 
    current.quantity > max.quantity ? current : max, 
    { name: 'No Sales', quantity: 0 }
  ).name;

  // Calculate average order value
  const averageOrderValue = customerCount > 0 ? todayRevenue / customerCount : 0;

  // Calculate sales target and time remaining
  const dailyTarget = 50000; // ₦50,000 daily target
  const currentTime = new Date();
  const shiftEnd = currentShift === 'morning' ? 14 : 22; // 2 PM for morning, 10 PM for night
  const timeRemaining = Math.max(0, shiftEnd - currentTime.getHours());

  const salesTarget: SalesTarget = {
    dailyTarget,
    currentSales: todayRevenue,
    completion: (todayRevenue / dailyTarget) * 100,
    timeRemaining
  };

  // Calculate alerts
  const alerts = {
    lowStock: 2, // Would be calculated from inventory
    targetBehind: todayRevenue < (dailyTarget * 0.5), // Behind if less than 50% of target
    customerFollow: 0 // Would be calculated from customer data
  };

  return {
    user: {
      name: profile.name,
      role: profile.role
    },
    salesData: {
      todaySales: transformedTodaySales,
      salesTarget,
      averageOrderValue,
      customerCount,
      topSellingBread,
      currentShift,
      previousDaySales: yesterdayRevenue,
      weeklyAverage,
      lastUpdate: new Date().toISOString()
    },
    alerts,
    currentShift
  };
}

// Loading components
function SalesMetricsLoading() {
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
    </div>
  );
}

function SalesQuickActionsLoading() {
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

export default async function SalesDashboardPage() {
  const data = await getSalesDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Sales Dashboard, {data.user.name}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1">
                  Track sales performance and manage transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={data.salesData.salesTarget.completion > 50 ? 
                  "w-3 h-3 bg-green-400 rounded-full animate-pulse" : 
                  "w-3 h-3 bg-yellow-400 rounded-full"
                } />
                <span className="text-sm font-medium text-gray-600">
                  {data.salesData.salesTarget.completion > 50 ? 'On Target' : 'Behind Target'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Sales Metrics Section - Performance overview */}
          <ErrorBoundary fallback={<div>Error loading sales metrics</div>}>
            <Suspense fallback={<SalesMetricsLoading />}>
              <SalesMetrics data={data.salesData} />
            </Suspense>
          </ErrorBoundary>

          {/* Quick Actions Section - Essential sales tools */}
          <ErrorBoundary fallback={<div>Error loading quick actions</div>}>
            <Suspense fallback={<SalesQuickActionsLoading />}>
              <SalesQuickActions 
                salesData={{
                  todayTarget: data.salesData.salesTarget.dailyTarget,
                  currentSales: data.salesData.salesTarget.currentSales,
                  targetProgress: data.salesData.salesTarget.completion,
                  customerCount: data.salesData.customerCount,
                  averageOrderValue: data.salesData.averageOrderValue
                }}
                currentShift={data.currentShift}
                alerts={data.alerts}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
} 