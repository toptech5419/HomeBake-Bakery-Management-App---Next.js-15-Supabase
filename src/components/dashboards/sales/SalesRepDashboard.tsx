'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Target,
  TrendingUp,
  Clock,
  Plus,
  BarChart3,
  RotateCcw,
  History,
  TrendingDown
} from 'lucide-react';
import { GridContainer } from '../shared/GridContainer';
import { MetricCard } from '../shared/MetricCard';
import { SalesLog } from '../shared/SalesLog';
import { ModernButton } from '@/components/ui/modern-button';
import { ModernCard, ModernCardHeader, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useShift } from '@/contexts/ShiftContext';
import { useEndShiftContext } from '@/contexts/EndShiftContext';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { clearDashboardExceptProductionTabs } from '@/lib/utils/dashboard-clear';
import { SalesModal } from '@/components/dashboards/sales/SalesModal';
import { QuickRecordAllModal } from '@/components/dashboards/sales/QuickRecordAllModal';
import { FinalReportModal } from '@/components/dashboards/sales/FinalReportModal';
import { ViewAllSalesModal } from '@/components/modals/ViewAllSalesModal';
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
  productionTarget: number;
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

interface ProductionLog {
  id: string;
  quantity: number;
  bread_types?: {
    id: string;
    name: string;
    unit_price: number;
  };
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
  feedback?: string; // Changed from string | null to string to match FinalReportModal
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
    productionTarget: 0,
    remainingTarget: 0,
    salesTarget: 0,
    topProducts: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const [showQuickRecordModal, setShowQuickRecordModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);
  const [showViewAllSalesModal, setShowViewAllSalesModal] = useState(false);
  const [finalReportData, setFinalReportData] = useState<SalesReportData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInModalTransition, setIsInModalTransition] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);

  const fetchDashboardData = async () => {
    // Don't fetch data during modal transitions to prevent flashing
    if (isInModalTransition) {
      return;
    }
    
    setLoading(true);
    try {
      // Get today's date boundaries in LOCAL timezone to match user's time
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      console.log('🔍 Fetching dashboard data with filters:', {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        currentShift,
        userId
      });

      // Fetch production data for current shift
      const { data: productionData, error: productionError } = await supabase
        .from('production_logs')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .eq('shift', currentShift);

      if (productionError) {
        console.error('❌ Error fetching production data:', productionError);
      }

      // Calculate production target (total bread produced)
      const productionTarget = productionData?.reduce((sum: number, prod: ProductionLog) => sum + prod.quantity, 0) || 0;

      // Fetch sales data for current user and shift
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
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .eq('shift', currentShift)
        .eq('recorded_by', userId)
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('❌ Error fetching sales data:', salesError);
        toast.error('Failed to fetch sales data. Please check your permissions.');
      }

      // Fetch all remaining bread records with bread_types for unit prices
      const { data: remainingData, error: remainingError } = await supabase
        .from('remaining_bread')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price
          )
        `)
        .eq('recorded_by', userId);

      if (remainingError) {
        console.error('❌ Error fetching remaining bread data:', remainingError);
      }

      // Calculate total monetary value of remaining bread
      const totalRemainingMonetaryValue = remainingData?.reduce((sum: number, item) => {
        const unitPrice = item.bread_types?.unit_price || 0;
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
      
      // Calculate unique bread types sold
      const uniqueBreadTypes = new Set(salesData?.map(sale => sale.bread_type_id) || []);
      const itemsSold = totalUnitsSold; // Changed to total units instead of unique types

      // Debug logging to help identify issues
      console.log('📊 Dashboard Data Debug:', {
        salesDataLength: salesData?.length || 0,
        transactions,
        itemsSold,
        uniqueBreadTypes: Array.from(uniqueBreadTypes),
        totalUnitsSold: salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0,
        salesBreakdown: salesData?.map(sale => ({
          breadType: sale.bread_types?.name,
          quantity: sale.quantity,
          unitPrice: sale.unit_price,
          totalAmount: (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0)
        })),
        dateRange: {
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString()
        },
        filters: {
          shift: currentShift,
          userId,
          dateRange: `${startOfDay.toISOString()} to ${endOfDay.toISOString()}`
        }
      });

      // Calculate production monetary value
      const productionMonetaryValue = productionData?.reduce((sum: number, prod: ProductionLog) => {
        const unitPrice = prod.bread_types?.unit_price || 0;
        return sum + (prod.quantity * unitPrice);
      }, 0) || 0;

      // Calculate sales monetary value
      const salesMonetaryValue = salesData?.reduce((sum: number, sale: SalesLog) => {
        const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
        return sum + amount;
      }, 0) || 0;

      // Calculate remaining target in monetary terms
      const remainingFromProduction = Math.max(0, productionMonetaryValue - salesMonetaryValue);
      
      // Total remaining includes both production remaining and recorded remaining bread (monetary)
      const remainingTarget = remainingFromProduction + totalRemainingMonetaryValue;
      
      // Sales target equals production monetary value
      const salesTarget = productionMonetaryValue;

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
        productionTarget,
        remainingTarget,
        salesTarget,
        topProducts,
        recentSales
      });
    } catch (error) {
  
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentShift, userId]);

  // Enhanced transition handler with proper state coordination
  const handleQuickRecordComplete = useCallback(async (reportData: any) => {
    try {
      // Step 1: Set transition states immediately
      setIsTransitioning(true);
      setIsInModalTransition(true);
      setShowTransitionOverlay(true);
      
      // Step 2: Close QuickRecordModal with smooth transition
      setShowQuickRecordModal(false);
      
      // Step 3: Wait for QuickRecordModal to close (300ms for smooth transition)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 4: Set final report data with proper typing
      setFinalReportData(reportData as SalesReportData);
      
      // Step 5: Open FinalReportModal
      setShowFinalReportModal(true);
      
      // Step 6: Wait for FinalReportModal to open (200ms)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 7: Clear transition states
      setIsTransitioning(false);
      setIsInModalTransition(false);
      setShowTransitionOverlay(false);
      
    } catch (error) {
      console.error('Error during modal transition:', error);
      // Reset all states on error
      setIsTransitioning(false);
      setIsInModalTransition(false);
      setShowTransitionOverlay(false);
      setShowQuickRecordModal(false);
      setShowFinalReportModal(false);
      setFinalReportData(null);
    }
  }, []);

  // Enhanced sales recorded handler with transition awareness
  const handleSalesRecorded = useCallback(() => {
    console.log('🔄 handleSalesRecorded called - Refreshing dashboard data');
    
    // Don't refresh data during modal transitions to prevent flashing
    if (!isInModalTransition && !isTransitioning) {
      // Add a small delay to ensure the database transaction is committed
      setTimeout(() => {
        fetchDashboardData();
      }, 500);
    } else {
      console.log('⏸️ Skipping refresh due to modal transition');
    }
  }, [isInModalTransition, isTransitioning, fetchDashboardData]);

  // Handle end shift - clear dashboard data except production-based tabs
  // This should ONLY be called when user explicitly chooses to end their shift
  // NOT automatically after shift report creation
  const handleEndShift = async () => {
    try {
      console.log('🔄 handleEndShift called - User explicitly chose to end shift');
      
      console.log('🗑️ Clearing ALL sales data for:', {
        userId,
        currentShift
      });

      // Delete ALL sales_logs records for current user and shift (no date filtering)
      const { error: salesDeleteError } = await supabase
        .from('sales_logs')
        .delete()
        .eq('recorded_by', userId)
        .eq('shift', currentShift);

      if (salesDeleteError) {
        console.error('❌ Error clearing sales data:', salesDeleteError);
        toast.error('Failed to clear sales data. Please try again.');
        return;
      }

      console.log('✅ Successfully cleared all sales data for current user and shift');

      // Reset only sales-related metrics, preserve production and target data
      setMetrics(prev => ({
        todaySales: 0,
        transactions: 0,
        itemsSold: 0,
        productionTarget: prev.productionTarget, // Preserve
        remainingTarget: prev.remainingTarget, // Preserve - don't reset
        salesTarget: prev.salesTarget, // Preserve - don't reset
        topProducts: [],
        recentSales: []
      }));
      
      // Refresh dashboard data to reflect the cleared state
      await fetchDashboardData();
      
      toast.success('Shift ended successfully. All sales data has been cleared.');
    } catch (error) {
      console.error('❌ Error in handleEndShift:', error);
      toast.error('Failed to end shift. Please try again.');
    }
  };

  // Register the end shift handler with the context
  useEffect(() => {
    // Only register the handler if it's not already registered
    console.log('📝 Registering handleEndShift with EndShiftContext');
    setEndShiftHandler(handleEndShift);
  }, [setEndShiftHandler]);

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
      <ShiftToggle showLabel={true} compact={false} />
      {/* Global Loading Overlay for Transitions */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparing Report</h3>
              <p className="text-sm text-gray-600">Please wait while we generate your shift report...</p>
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Welcome back, {userName}
          </h1>
          <p className="text-gray-600 mt-1">
            Track your sales performance for the {currentShift} shift
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
              {metrics.productionTarget.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Production Target</div>
          </ModernCardContent>
        </ModernCard>

        <ModernCard variant="elevated" className="hover-lift">
          <ModernCardContent className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-display font-bold text-gray-900">
              {metrics.remainingTarget.toLocaleString()}
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
              {metrics.salesTarget.toLocaleString()}
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

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-display font-bold text-gray-900">
                    {formatCurrencyNGN(metrics.todaySales)}
                  </div>
                  <div className="text-sm text-gray-600">Sold</div>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-gray-900">
                    {metrics.remainingTarget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Remaining</div>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-gray-900">
                    {metrics.salesTarget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Target</div>
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
              onClick={() => setShowViewAllSalesModal(true)}
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
              onClick={() => setShowQuickRecordModal(true)}
              className="hover-lift"
              fullWidth
            >
              Generate Shift Reports
            </ModernButton>
            
            <ModernButton
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              onClick={() => setShowSalesModal(true)}
              className="hover-lift"
              fullWidth
            >
              Record Sale
            </ModernButton>
            
            <ModernButton
              variant="secondary"
              size="lg"
              leftIcon={<History className="h-5 w-5" />}
              onClick={() => router.push('/dashboard/sales-reports-history')}
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
        onClick={() => setShowSalesModal(true)}
      >
        <Plus className="h-6 w-6" />
      </ModernButton>

      {/* Modals */}
      <SalesModal
        isOpen={showSalesModal}
        onClose={() => setShowSalesModal(false)}
        userId={userId}
        currentShift={currentShift}
        onSalesRecorded={handleSalesRecorded}
      />

      <QuickRecordAllModal
        isOpen={showQuickRecordModal}
        onClose={() => setShowQuickRecordModal(false)}
        userId={userId}
        onSalesRecorded={handleSalesRecorded}
        onRemainingUpdated={handleSalesRecorded}
        onReportComplete={handleQuickRecordComplete}
      />

      <FinalReportModal
        isOpen={showFinalReportModal}
        onClose={() => {
          setShowFinalReportModal(false);
          // Refresh dashboard data when final report modal closes
          fetchDashboardData();
        }}
        reportData={finalReportData}
      />

      <ViewAllSalesModal
        isOpen={showViewAllSalesModal}
        onClose={() => setShowViewAllSalesModal(false)}
        currentShift={currentShift}
        userId={userId}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
