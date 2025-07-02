import { Suspense } from 'react';
import { Metadata } from 'next';
import { SalesMetrics } from '@/components/dashboards/sales/sales-metrics';
import { SalesQuickActions } from '@/components/dashboards/sales/sales-quick-actions';
import { createServer } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Database } from '@/types/supabase';

export const metadata: Metadata = {
  title: 'Sales Dashboard - HomeBake',
  description: 'Sales tracking and customer management dashboard for sales representatives',
};

// Types for sales dashboard data
type SalesLogRow = Database['public']['Tables']['sales_logs']['Row'];
type BreadTypeRow = Database['public']['Tables']['bread_types']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

interface SalesRecord {
  id: string;
  breadType: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  timestamp: string;
  customerType: 'individual' | 'bulk' | 'regular';
}

interface SalesTarget {
  dailyTarget: number;
  currentSales: number;
  completion: number;
  timeRemaining: number;
}

// Real-time data fetching function
async function getSalesRepDashboardData() {
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

  // Calculate time remaining in shift
  const now = new Date();
  let shiftEndHour = currentShift === 'morning' ? 14 : 6; // 2 PM or 6 AM next day
  let shiftEnd = new Date(now);
  
  if (currentShift === 'morning') {
    shiftEnd.setHours(14, 0, 0, 0);
  } else {
    // Night shift ends at 6 AM next day
    shiftEnd.setDate(shiftEnd.getDate() + 1);
    shiftEnd.setHours(6, 0, 0, 0);
  }
  
  const timeRemaining = Math.max(0, (shiftEnd.getTime() - now.getTime()) / (1000 * 60 * 60)); // hours

  // Fetch dashboard data
  const [
    { data: todaySales, error: salesError },
    { data: yesterdaySales, error: yesterdaySalesError },
    { data: breadTypes, error: breadTypesError },
    { data: weekSales, error: weekSalesError }
  ] = await Promise.all([
    // Today's sales by current user
    supabase
      .from('sales_logs')
      .select('id, bread_type_id, quantity, unit_price, discount, shift, created_at')
      .eq('recorded_by', user.id)
      .gte('created_at', today)
      .order('created_at', { ascending: false }),
    
    // Yesterday's sales for comparison
    supabase
      .from('sales_logs')
      .select('quantity, unit_price, discount')
      .eq('recorded_by', user.id)
      .gte('created_at', yesterdayStr)
      .lt('created_at', today),
    
    // Bread types for reference
    supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .order('name', { ascending: true }),
    
    // Week's sales for average calculation
    supabase
      .from('sales_logs')
      .select('quantity, unit_price, discount, created_at')
      .eq('recorded_by', user.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  ]);

  // Process sales data
  const processedSales: SalesRecord[] = todaySales?.map(sale => {
    const breadType = breadTypes?.find(bt => bt.id === sale.bread_type_id);
    
    // Simulate customer type based on quantity
    let customerType: 'individual' | 'bulk' | 'regular' = 'individual';
    if (sale.quantity > 20) customerType = 'bulk';
    else if (sale.quantity > 5) customerType = 'regular';
    
    return {
      id: sale.id,
      breadType: breadType?.name || 'Unknown',
      quantity: sale.quantity,
      unitPrice: sale.unit_price || breadType?.unit_price || 0,
      discount: sale.discount || 0,
      timestamp: sale.created_at,
      customerType
    };
  }) || [];

  // Calculate metrics
  const totalRevenue = processedSales.reduce((sum, sale) => 
    sum + (sale.quantity * sale.unitPrice) - sale.discount, 0
  );

  const yesterdayRevenue = yesterdaySales?.reduce((sum, sale) => 
    sum + (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0), 0
  ) || 0;

  const weeklyRevenue = weekSales?.reduce((sum, sale) => 
    sum + (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0), 0
  ) || 0;
  const weeklyAverage = weeklyRevenue / 7;

  // Simulate daily target (this would come from settings/targets table)
  const dailyTarget = 15000; // ₦15,000 daily target
  const targetProgress = (totalRevenue / dailyTarget) * 100;

  const salesTarget: SalesTarget = {
    dailyTarget,
    currentSales: totalRevenue,
    completion: Math.min(targetProgress, 100),
    timeRemaining
  };

  // Calculate customer metrics
  const customerCount = processedSales.length;
  const averageOrderValue = customerCount > 0 ? totalRevenue / customerCount : 0;

  // Find top selling bread
  const breadSales = processedSales.reduce((acc, sale) => {
    acc[sale.breadType] = (acc[sale.breadType] || 0) + sale.quantity;
    return acc;
  }, {} as Record<string, number>);
  
  const topSellingBread = Object.entries(breadSales)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No sales yet';

  // Calculate alerts
  const alerts = {
    lowStock: 2, // Simulated
    targetBehind: targetProgress < 50 && timeRemaining < 4, // Behind if less than 50% with <4 hours left
    customerFollow: 0 // Simulated follow-up customers
  };

  return {
    user: {
      name: profile.name,
      role: profile.role
    },
    salesData: {
      todaySales: processedSales,
      salesTarget,
      averageOrderValue,
      customerCount,
      topSellingBread,
      currentShift,
      previousDaySales: yesterdayRevenue,
      weeklyAverage,
      lastUpdate: new Date().toISOString()
    },
    quickActionData: {
      todayTarget: dailyTarget,
      currentSales: totalRevenue,
      targetProgress,
      customerCount,
      averageOrderValue
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
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesActionsLoading() {
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SalesRepDashboardPage() {
  const data = await getSalesRepDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Sales Rep, {data.user.name}
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Track sales performance and achieve daily targets
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={data.alerts.targetBehind ? 
                  "w-3 h-3 bg-red-400 rounded-full animate-pulse" : 
                  data.salesData.salesTarget.completion > 75 ?
                  "w-3 h-3 bg-green-400 rounded-full" :
                  "w-3 h-3 bg-orange-400 rounded-full animate-pulse"
                } />
                <span className="text-sm font-medium text-gray-600">
                  {data.alerts.targetBehind ? 'Target Alert' : 
                   data.salesData.salesTarget.completion > 75 ? 'On Track' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Sales Metrics Section */}
          <ErrorBoundary fallback={<div>Error loading sales metrics</div>}>
            <Suspense fallback={<SalesMetricsLoading />}>
              <SalesMetrics data={data.salesData} />
            </Suspense>
          </ErrorBoundary>

          {/* Quick Actions Section */}
          <ErrorBoundary fallback={<div>Error loading actions</div>}>
            <Suspense fallback={<SalesActionsLoading />}>
              <SalesQuickActions 
                salesData={data.quickActionData}
                currentShift={data.currentShift}
                alerts={data.alerts}
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