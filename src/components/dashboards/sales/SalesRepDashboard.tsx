'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Clock,
  Plus,
  BarChart3,
  History,
  Target,
  RotateCcw
} from 'lucide-react';
import { SalesLog } from '../shared/SalesLog';
import { ModernButton } from '@/components/ui/modern-button';
import { ModernCard, ModernCardHeader, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/contexts/ShiftContext';
import { useEndShiftContext } from '@/contexts/EndShiftContext';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { getSalesRepDashboardMetrics } from '@/lib/dashboard/server-actions';
import { clearSalesLogsAction } from '@/lib/sales/clear-sales-logs';
import { cn } from '@/lib/utils';
// Removed modal imports - now using page routes
import { toast } from 'sonner';
import ShiftToggle from '@/components/shift/shift-toggle';

interface SalesRepDashboardProps {
  userId: string;
  userName: string;
}

interface DashboardMetrics {
  todaySales: number;
  transactions: number;
  itemsSold: number;
  productionTotalAmount: number;
  remainingTarget: number;
  salesTarget: number;
  topProducts: Array<{
    breadTypeId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    breadType: string;
    quantity: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'card' | 'mobile' | 'transfer';
    timestamp: string;
  }>;
}

interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  shift: 'morning' | 'night';
  recorded_by: string;
  created_at: string;
  bread_types?: {
    id: string;
    name: string;
    unit_price: number;
  };
}

interface SalesReportData {
  salesRecords: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    timestamp: string;
  }>;
  remainingBreads: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  totalRevenue: number;
  totalItemsSold: number;
  totalRemaining: number;
  feedback?: string;
  shift?: string;
  timeOfSales?: string;
  userId?: string;
}

export function SalesRepDashboard({ userId, userName }: SalesRepDashboardProps) {
  const { currentShift, setCurrentShift } = useShift();
  const { setEndShiftHandler } = useEndShiftContext();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaySales: 0,
    transactions: 0,
    itemsSold: 0,
    productionTotalAmount: 0,
    remainingTarget: 0,
    salesTarget: 0,
    topProducts: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  // Removed modal state - now using page routes
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInModalTransition, setIsInModalTransition] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [hasSalesLogs, setHasSalesLogs] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const checkSalesLogsExist = async () => {
    try {
      console.log('🔍 CHECKING SALES LOGS EXIST...');
      console.log('🔍 User ID:', userId);
      console.log('🔍 Current Shift:', currentShift);
      
      // Check if there are any sales logs for current user and shift
      const { data: salesLogs, error } = await supabase
        .from('sales_logs')
        .select('id')
        .eq('recorded_by', userId)
        .eq('shift', currentShift)
        .limit(1);

      console.log('🔍 Query result:', { salesLogs, error });

      if (!error && salesLogs) {
        const hasLogs = salesLogs.length > 0;
        console.log('🔍 Has sales logs:', hasLogs);
        setHasSalesLogs(hasLogs);
      } else {
        console.log('🔍 Error or no data, setting to false');
        setHasSalesLogs(false);
      }
    } catch (error) {
      console.error('❌ Error checking sales logs:', error);
      setHasSalesLogs(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Use server action to get metrics
      const metricsData = await getSalesRepDashboardMetrics(userId, currentShift);
      
      // Update hasDataToClear based on metrics (this is the most reliable source)
      const hasData = metricsData.transactions > 0;
      setHasSalesLogs(hasData);
      console.log('📊 MAIN: Found', metricsData.transactions, 'transactions, hasDataToClear:', hasData);
      
      // Calculate production total amount from actual production items (batches)
      let productionTotalAmount = 0;

      // Fetch production items for current shift to calculate total production value
      try {
        // Use Nigeria current date for proper clearing - always use current date
        const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
        const nigeriaDate = nigeriaTime.toISOString().split('T')[0];
        
        const productionResponse = await fetch(`/api/sales-rep/production?shift=${currentShift}&date=${nigeriaDate}`);
        if (productionResponse.ok) {
          const productionData = await productionResponse.json();
          
          // Calculate production total amount: sum of (unit_price * actual_quantity) for each production item
          productionTotalAmount = productionData.productionItems.reduce((sum: number, item: { unit_price: number; quantity: number }) => {
            const unitPrice = item.unit_price || 0;
            const quantity = item.quantity || 0;
            return sum + (unitPrice * quantity);
          }, 0);
        }
      } catch (error) {
        console.error('Error fetching production data:', error);
      }
      
      // Sales target equals production monetary value PLUS remaining target amount
      const salesTarget = productionTotalAmount + metricsData.remainingTarget;

      setMetrics({
        todaySales: metricsData.todaySales,
        transactions: metricsData.transactions,
        itemsSold: metricsData.itemsSold,
        productionTotalAmount,
        remainingTarget: metricsData.remainingTarget,
        salesTarget,
        topProducts: metricsData.topProducts,
        recentSales: metricsData.recentSales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to direct database queries if server action fails
      await fetchDashboardDataFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardDataFallback = async () => {
    try {
      // Fetch sales data for current shift and current user only - NO DATE FILTERING
      const { data: salesData, error: salesError } = await supabase
        .from('sales_logs')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price
          )
        `)
        .eq('recorded_by', userId)
        .eq('shift', currentShift)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Update hasDataToClear based on the fetched sales data
      const hasDataFallback = salesData && salesData.length > 0;
      setHasSalesLogs(hasDataFallback);
      console.log('📊 FALLBACK: Found', salesData?.length || 0, 'sales logs, hasDataToClear:', hasDataFallback);

      // Fetch remaining bread data from the remaining_bread table - ALL DATA
      const { data: remainingBreadData, error: remainingBreadError } = await supabase
        .from('remaining_bread')
        .select(`
          *,
          bread_types!remaining_bread_bread_type_id_fkey (
            id,
            name,
            unit_price
          )
        `);

      if (remainingBreadError) throw remainingBreadError;
      
      // Calculate total monetary value of remaining bread
      const totalRemainingMonetaryValue = remainingBreadData?.reduce((sum: number, item) => {
        const unitPrice = item.unit_price || item.bread_types?.unit_price || 0;
        return sum + (item.quantity * unitPrice);
      }, 0) || 0;

      // Calculate sales metrics
      const todaySales = salesData?.reduce((sum: number, sale: SalesLog) => {
        const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
        return sum + amount;
      }, 0) || 0;

      const transactions = salesData?.length || 0;
      
      // Calculate total units sold (sum of all quantities)
      const totalUnitsSold = salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;
      
      const itemsSold = totalUnitsSold;

      // Calculate production total amount from actual production items (batches)
      let productionTotalAmount = 0;

      // Fetch production items for current shift to calculate total production value
      try {
        // Use Nigeria current date for proper clearing - always use current date
        const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
        const nigeriaDate = nigeriaTime.toISOString().split('T')[0];
        
        const productionResponse = await fetch(`/api/sales-rep/production?shift=${currentShift}&date=${nigeriaDate}`);
        if (productionResponse.ok) {
          const productionData = await productionResponse.json();
          
          // Calculate production total amount: sum of (unit_price * actual_quantity) for each production item
          productionTotalAmount = productionData.productionItems.reduce((sum: number, item: { unit_price: number; quantity: number }) => {
            const unitPrice = item.unit_price || 0;
            const quantity = item.quantity || 0;
            return sum + (unitPrice * quantity);
          }, 0);
        }
      } catch (error) {
        console.error('Error fetching production data:', error);
      }

      // Calculate remaining target in monetary terms - only remaining bread total
      const remainingTarget = totalRemainingMonetaryValue;
      
      // Sales target equals production monetary value PLUS remaining target amount
      const salesTarget = productionTotalAmount + remainingTarget;

      // Calculate top products for current shift
      const productSales = new Map<string, { breadTypeId: string; name: string; quantity: number; revenue: number }>();
      salesData?.forEach((sale: SalesLog) => {
        const key = sale.bread_type_id;
        const existing = productSales.get(key) || { 
          breadTypeId: key, 
          name: sale.bread_types?.name || 'Unknown', 
          quantity: 0, 
          revenue: 0 
        };
        const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
        existing.quantity += sale.quantity;
        existing.revenue += amount;
        productSales.set(key, existing);
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      // Format recent sales - limit to 3 items
      const recentSales = salesData?.slice(0, 3).map((sale: SalesLog) => ({
        id: sale.id,
        breadType: sale.bread_types?.name || 'Unknown',
        quantity: sale.quantity,
        totalAmount: (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0),
        paymentMethod: 'cash' as const,
        timestamp: sale.created_at
      })) || [];

      setMetrics({
        todaySales,
        transactions,
        itemsSold,
        productionTotalAmount,
        remainingTarget,
        salesTarget,
        topProducts,
        recentSales
      });
    } catch (error) {
      console.error('Error in fallback data fetch:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentShift, userId]);

  // Refresh data when page becomes visible (user returns from record sales)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Page became visible, refreshing dashboard data...');
        fetchDashboardData();
      }
    };

    // Refresh data when window gains focus (desktop/mobile)
    const handleWindowFocus = () => {
      console.log('🎯 Window focused, refreshing dashboard data...');
      fetchDashboardData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Removed modal transition handler - now using page routes

  // Enhanced sales recorded handler with transition awareness
  const handleSalesRecorded = useCallback(() => {
    console.log('🔄 handleSalesRecorded called - Refreshing dashboard data');
    
    // Don't refresh data during modal transitions to prevent flashing
    if (!isInModalTransition && !isTransitioning) {
      // Add a small delay to ensure the database transaction is committed
      setTimeout(async () => {
        await fetchDashboardData();
      }, 500);
    } else {
      console.log('⏸️ Skipping refresh due to modal transition');
    }
  }, [isInModalTransition, isTransitioning, fetchDashboardData]);

  // PRODUCTION END SHIFT - USING SERVER ACTION
  const handleEndShift = async () => {
    console.log('🔥 END SHIFT: Production version called');
    console.log('🔥 Current Shift:', currentShift);
    
    setIsEndingShift(true);
    
    try {
      // Use server action for proper authentication and RLS
      console.log('🗑️ Calling server action to clear sales logs...');
      const result = await clearSalesLogsAction(currentShift as 'morning' | 'night');
      
      if (!result.success) {
        console.error('❌ Server action failed:', result.error);
        toast.error(`Failed to clear sales data: ${result.error}`);
        return;
      }
      
      console.log('✅ Server action success! Deleted:', result.deletedCount, 'records');

      // Clear UI immediately
      console.log('🔄 Clearing UI metrics...');
      setMetrics({
        todaySales: 0,
        transactions: 0,
        itemsSold: 0,
        productionTotalAmount: 0,
        remainingTarget: 0,
        salesTarget: 0,
        topProducts: [],
        recentSales: []
      });

      // Update sales logs state since we just cleared them
      setHasSalesLogs(false);

      // Refresh dashboard data
      console.log('🔄 Refreshing dashboard...');
      await fetchDashboardData();
      
      // Show success message
      if (result.deletedCount === 0) {
        toast.success('✅ Shift ended! No sales records found to clear.');
      } else {
        toast.success(`✅ Shift ended successfully! Cleared ${result.deletedCount} sales records.`);
      }
      
      console.log('✅ END SHIFT COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('❌ Fatal error in handleEndShift:', error);
      toast.error('Failed to end shift. Please try again.');
    } finally {
      setIsEndingShift(false);
    }
  };

  // Register the end shift handler with the context - SIMPLE VERSION
  useEffect(() => {
    setEndShiftHandler(handleEndShift);
  }, [setEndShiftHandler]);

  // Enhanced navigation with visual feedback
  const handleNavigation = async (path: string, label: string) => {
    setNavigationTarget(path);
    setIsTransitioning(true);
    
    // Add a small delay to show the loading state
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  // Reset transition state when component unmounts
  useEffect(() => {
    return () => {
      setIsTransitioning(false);
      setNavigationTarget(null);
    };
  }, []);

  const getProgressPercentage = () => {
    if (metrics.salesTarget === 0) return 0;
    // Use actual recorded sales instead of calculated remaining
    const soldQuantity = metrics.todaySales;
    return Math.min(100, (soldQuantity / metrics.salesTarget) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (percentage >= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  if (!currentShift) {
    return (
      <div className="flex flex-col items-center justify-center py-8 w-full">
        <span className="mb-4 text-lg font-semibold text-gray-700">Select your shift to continue</span>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentShift('morning')}
            className="bg-orange-100 text-orange-800 rounded-lg px-6 py-3 font-semibold text-lg shadow hover:bg-orange-200 transition"
          >
            ☀️ Morning Shift
          </button>
          <button
            onClick={() => setCurrentShift('night')}
            className="bg-indigo-100 text-indigo-800 rounded-lg px-6 py-3 font-semibold text-lg shadow hover:bg-indigo-200 transition"
          >
            🌙 Night Shift
          </button>
        </div>
      </div>
    );
  }

  if (loading && !isInModalTransition) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shift Control Card */}
      <ShiftToggle showLabel={true} compact={false} hasDataToClear={hasSalesLogs} />
      {/* END SHIFT FULL-SCREEN LOADING OVERLAY */}
      {isEndingShift && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-3xl p-12 shadow-2xl flex flex-col items-center gap-6 max-w-sm mx-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-red-200 opacity-25"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ending Shift</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Clearing all sales data and updating dashboard...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay for Transitions */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Page</h3>
              <p className="text-sm text-gray-600">
                {navigationTarget?.includes('end-shift') && 'Loading end shift page...'}
                {navigationTarget?.includes('record') && 'Loading record sales page...'}
                {navigationTarget?.includes('all-sales') && 'Loading all sales page...'}
                {navigationTarget?.includes('reports-history') && 'Loading reports history...'}
                {!navigationTarget && 'Please wait...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transition Overlay */}
      {showTransitionOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Report</h3>
              <p className="text-sm text-gray-600">Preparing your shift report...</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="heading-lg text-foreground animate-fade-in-up">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-muted-foreground mt-2 font-medium animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Track your sales performance for the <span className="text-primary font-semibold">{currentShift} shift</span>
          </p>
        </div>
      </div>

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {formatCurrencyNGN(metrics.todaySales)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Today's Sales</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {metrics.transactions}
            </div>
            <div className="text-sm text-gray-600 mt-1">Transactions</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {metrics.itemsSold}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Units Sold</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {formatCurrencyNGN(metrics.productionTotalAmount)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Production Total Amount</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {formatCurrencyNGN(metrics.remainingTarget)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Remaining Target</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {formatCurrencyNGN(metrics.salesTarget)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Sales Target</div>
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* Sales Target Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardHeader
            title="Sales Target Progress"
            subtitle="Track your daily performance"
            icon={<BarChart3 className="h-5 w-5 text-gray-600" />}
          />
          <ModernCardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Daily Progress</span>
                <span className="text-2xl font-display font-bold text-gray-900">
                  {getProgressPercentage().toFixed(1)}%
                </span>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={cn(
                      "h-3 rounded-full transition-all duration-500 ease-out",
                      getProgressColor(getProgressPercentage())
                    )}
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2 text-center">
                <div className="flex-1 min-w-0">
                  <div className="text-base md:text-lg lg:text-xl font-display font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    {formatCurrencyNGN(metrics.todaySales)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Sold</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base md:text-lg lg:text-xl font-display font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    {formatCurrencyNGN(metrics.remainingTarget)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Remaining</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base md:text-lg lg:text-xl font-display font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    {formatCurrencyNGN(metrics.salesTarget)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">Target</div>
                </div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardHeader
            title="Shift Performance"
            subtitle="Current shift analytics"
            icon={<Clock className="h-5 w-5 text-gray-600" />}
          />
          <ModernCardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Current Shift</span>
                <Badge variant="outline" className="capitalize">
                  {currentShift}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <span className="text-lg font-display font-semibold text-gray-900">
                  {formatCurrencyNGN(metrics.todaySales)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Average Transaction</span>
                <span className="text-lg font-display font-semibold text-gray-900">
                  {formatCurrencyNGN(metrics.transactions > 0 ? metrics.todaySales / metrics.transactions : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Top Product</span>
                <span className="text-lg font-display font-semibold text-gray-900">
                  {metrics.topProducts[0]?.name || 'N/A'}
                </span>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* Top Products */}
      <ModernCard variant="elevated" className="hover-lift">
        <ModernCardHeader
          title="Top Products"
          subtitle={`Best performing items in ${currentShift} shift`}
          icon={<TrendingUp className="h-5 w-5 text-gray-600" />}
        />
        <ModernCardContent>
          <div className="space-y-4">
            {metrics.topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No products sold in this shift yet</p>
            </div>
            ) : (
              metrics.topProducts.map((product, index) => (
                <div
                  key={product.breadTypeId}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.quantity} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-gray-900">
                      {formatCurrencyNGN(product.revenue)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Sales Log */}
      <div className="space-y-4">
        <SalesLog transactions={metrics.recentSales} title={`Sales Log - ${currentShift} Shift`} />
        {metrics.recentSales.length > 0 && (
          <div className="flex justify-center">
            <ModernButton
              variant="secondary"
              size="md"
              leftIcon={<History className="h-4 w-4" />}
              onClick={() => handleNavigation('/dashboard/sales/all-sales', 'View All Sales')}
              className="hover-lift"
            >
              View All Sales
            </ModernButton>
          </div>
        )}
      </div>

      {/* Sales Actions */}
      <ModernCard variant="elevated" className="hover-lift">
        <ModernCardHeader
          title="Quick Actions"
          subtitle="Manage your sales efficiently"
          icon={<Plus className="h-5 w-5 text-gray-600" />}
        />
        <ModernCardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ModernButton
              variant="success"
              size="lg"
              leftIcon={<RotateCcw className="h-5 w-5" />}
              onClick={() => handleNavigation('/dashboard/sales/end-shift', 'Generate Shift Reports')}
              className="hover-lift"
              fullWidth
            >
              Generate Shift Reports
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              onClick={() => handleNavigation('/dashboard/sales/record', 'Record Sale')}
              className="hover-lift"
              fullWidth
            >
              Record Sale
            </ModernButton>
            
            <ModernButton
              variant="secondary"
              size="lg"
              leftIcon={<History className="h-4 w-5" />}
              onClick={() => handleNavigation('/dashboard/sales-reports-history', 'View Reports History')}
              className="hover-lift"
              fullWidth
            >
              View Reports History
            </ModernButton>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Floating Action Button */}
      <ModernButton
        variant="primary"
        size="xl"
        className="fixed bottom-8 right-8 rounded-full shadow-xl z-50 h-16 w-16 hover-lift"
        onClick={() => handleNavigation('/dashboard/sales/record', 'Record Sale')}
      >
        <Plus className="h-6 w-6" />
      </ModernButton>
    </div>
  );
}

