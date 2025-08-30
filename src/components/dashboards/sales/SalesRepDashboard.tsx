'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSeamlessNavigation } from '@/hooks/use-seamless-navigation';
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
import { toast } from 'sonner';
import ShiftToggle from '@/components/shift/shift-toggle';
import { NavigationTransitionOverlay } from '@/components/navigation/NavigationTransition';

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

// Removed unused SalesReportData interface

export function SalesRepDashboard({ userId, userName }: SalesRepDashboardProps) {
  const { currentShift, setCurrentShift } = useShift();
  const { setEndShiftHandler } = useEndShiftContext();
  const { navigateWithTransition, transition, isTransitionActive } = useSeamlessNavigation();
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
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [hasSalesLogs, setHasSalesLogs] = useState(false);

  // Removed unused checkSalesLogsExist function

  const fetchDashboardDataFallback = useCallback(async () => {
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
  }, [userId, currentShift]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const metricsData = await getSalesRepDashboardMetrics(userId, currentShift);
      
      // Production-grade null checking and validation
      if (!metricsData || typeof metricsData !== 'object') {
        console.warn('⚠️ Invalid metricsData received, falling back to manual fetch');
        await fetchDashboardDataFallback();
        return;
      }
      
      // Ensure all required properties exist with fallbacks
      const safeMetricsData = {
        todaySales: metricsData.todaySales || 0,
        transactions: metricsData.transactions || 0,
        itemsSold: metricsData.itemsSold || 0,
        remainingTarget: metricsData.remainingTarget || 0,
        topProducts: Array.isArray(metricsData.topProducts) ? metricsData.topProducts : [],
        recentSales: Array.isArray(metricsData.recentSales) ? metricsData.recentSales : []
      };
      
      const hasData = safeMetricsData.transactions > 0;
      setHasSalesLogs(hasData);
      
      // Fetch production data with enhanced error handling
      let productionTotalAmount = 0;
      try {
        const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
        const nigeriaDate = nigeriaTime.toISOString().split('T')[0];
        
        const productionResponse = await fetch(`/api/sales-rep/production?shift=${currentShift}&date=${nigeriaDate}`);
        if (productionResponse.ok) {
          const productionData = await productionResponse.json();
          if (productionData && Array.isArray(productionData.productionItems)) {
            productionTotalAmount = productionData.productionItems.reduce((sum: number, item: { unit_price: number; quantity: number }) => {
              return sum + ((item.unit_price || 0) * (item.quantity || 0));
            }, 0);
          }
        } else {
          console.warn('⚠️ Production API request failed:', productionResponse.status);
        }
      } catch (error) {
        console.error('❌ Error fetching production data:', error);
      }
      
      const salesTarget = productionTotalAmount + safeMetricsData.remainingTarget;

      setMetrics({
        todaySales: safeMetricsData.todaySales,
        transactions: safeMetricsData.transactions,
        itemsSold: safeMetricsData.itemsSold,
        productionTotalAmount,
        remainingTarget: safeMetricsData.remainingTarget,
        salesTarget,
        topProducts: safeMetricsData.topProducts,
        recentSales: safeMetricsData.recentSales
      });
      
      console.log('✅ Dashboard data loaded successfully:', {
        transactions: safeMetricsData.transactions,
        revenue: safeMetricsData.todaySales,
        production: productionTotalAmount
      });
      
    } catch (error) {
      console.error('❌ Critical error in fetchDashboardData:', error);
      console.log('🔄 Falling back to manual data fetch...');
      await fetchDashboardDataFallback();
    } finally {
      setLoading(false);
    }
  }, [userId, currentShift, fetchDashboardDataFallback]);

  useEffect(() => {
    fetchDashboardData();
  }, [currentShift, userId, fetchDashboardData]);

  // Removed visibility change handlers that could cause authentication loops

  // Removed modal transition handler - now using page routes

  // Removed unused handleSalesRecorded function

  // PRODUCTION END SHIFT - USING SERVER ACTION
  const handleEndShift = useCallback(async () => {
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
  }, [currentShift, fetchDashboardData]);

  // Register the end shift handler with the context - SIMPLE VERSION
  useEffect(() => {
    setEndShiftHandler(handleEndShift);
  }, [setEndShiftHandler, handleEndShift]);

  const handleNavigation = (path: string, transitionType: 'shift-reports' | 'record-sale' | 'all-sales' | 'reports-history') => {
    navigateWithTransition(path, transitionType);
  };


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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 animate-pulse rounded-lg w-64" />
          <div className="h-4 bg-gray-200 animate-pulse rounded w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Seamless Navigation Transition Overlay */}
      <NavigationTransitionOverlay transition={transition} />
      
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
      {/* Removed modal overlay completely - using page-level loading.tsx files instead */}

      {/* Removed all transition overlays - using page-level navigation */}

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
            <div className="text-sm text-gray-600 mt-1">Today&apos;s Sales</div>
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
              onClick={() => handleNavigation('/dashboard/sales/all-sales', 'all-sales')}
              className="hover-lift transition-all duration-200"
              disabled={isTransitionActive()}
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
              onClick={() => handleNavigation('/dashboard/sales/end-shift', 'shift-reports')}
              className="hover-lift transition-all duration-200"
              disabled={isTransitionActive()}
              fullWidth
            >
              Generate Shift Reports
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              onClick={() => handleNavigation('/dashboard/sales/record', 'record-sale')}
              className="hover-lift transition-all duration-200"
              disabled={isTransitionActive()}
              fullWidth
            >
              Record Sale
            </ModernButton>
            
            <ModernButton
              variant="secondary"
              size="lg"
              leftIcon={<History className="h-4 w-5" />}
              onClick={() => handleNavigation('/dashboard/sales-reports-history', 'reports-history')}
              className="hover-lift transition-all duration-200"
              disabled={isTransitionActive()}
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
        className="fixed bottom-8 right-8 rounded-full shadow-xl z-50 h-16 w-16 hover-lift transition-all duration-200"
        onClick={() => handleNavigation('/dashboard/sales/record', 'record-sale')}
        disabled={isTransitionActive()}
      >
        <Plus className="h-6 w-6" />
      </ModernButton>
    </div>
  );
}

