'use client';

import React, { useState, useEffect } from 'react';
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

interface ReportData {
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
  feedback?: string | null;
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
  const [finalReportData, setFinalReportData] = useState<ReportData | null>(null);
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
      // Get today's date boundaries in UTC to match database timestamps
      const today = new Date();
      const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1));

      // Fetch production data for current shift
      const { data: productionData } = await supabase
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

      // Calculate production target (total bread produced)
      const productionTarget = productionData?.reduce((sum: number, prod: ProductionLog) => sum + prod.quantity, 0) || 0;

      // Fetch sales data for current user and shift
      const { data: salesData } = await supabase
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

      // Fetch all remaining bread records with bread_types for unit prices
      const { data: remainingData } = await supabase
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
      console.log('Dashboard Data Debug:', {
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

      // Format recent sales
      const recentSales = salesData?.slice(0, 10).map((sale: SalesLog) => ({
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

  // Handle final report display via direct callback
  const handleQuickRecordComplete = (reportData: any) => {
    // Set the report data immediately
    setFinalReportData(reportData);
    
    // Immediately switch to final report modal - no delays
    setShowQuickRecordModal(false);
    setShowFinalReportModal(true);
    
    // Reset transition states
    setIsTransitioning(false);
    setIsInModalTransition(false);
    setShowTransitionOverlay(false);
  };

  // Refresh data when sales are recorded
  const handleSalesRecorded = () => {
    // Don't refresh data during modal transitions to prevent flashing
    if (!isInModalTransition) {
      fetchDashboardData();
    }
  };

  // Handle end shift - clear dashboard data except production-based tabs
  const handleEndShift = async () => {
    try {
      // Delete all records from sales_logs table
      const { error: deleteError } = await supabase
        .from('sales_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows

      if (deleteError) {
    
        toast.error('Failed to clear shift data. Please try again.');
        return;
      }

      // Reset metrics to initial state, but preserve production-related data
      setMetrics(prev => ({
        todaySales: 0,
        transactions: 0,
        itemsSold: 0,
        productionTarget: prev.productionTarget, // Preserve
        remainingTarget: prev.remainingTarget, // Preserve
        salesTarget: prev.salesTarget, // Preserve
        topProducts: [],
        recentSales: []
      }));
      
      // Refresh dashboard data to reflect the cleared state
      await fetchDashboardData();
      
      toast.success('Shift ended successfully. All sales data has been cleared.');
    } catch (error) {
  
      toast.error('Failed to end shift. Please try again.');
    }
  };

  // Register the end shift handler with the context
  useEffect(() => {
    setEndShiftHandler(handleEndShift);
  }, [setEndShiftHandler]);

  const getProgressPercentage = () => {
    if (metrics.salesTarget === 0) return 0;
    const soldQuantity = metrics.salesTarget - metrics.remainingTarget;
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

      {/* Transition Overlay to Prevent Homepage Flash */}
      {showTransitionOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Final Report</h3>
              <p className="text-sm text-gray-600">Please wait while we prepare your shift report...</p>
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
                    {(metrics.salesTarget - metrics.remainingTarget).toLocaleString()}
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
      <SalesLog transactions={metrics.recentSales} title={`Sales Log - ${currentShift} Shift`} />

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
        userId={userId}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
