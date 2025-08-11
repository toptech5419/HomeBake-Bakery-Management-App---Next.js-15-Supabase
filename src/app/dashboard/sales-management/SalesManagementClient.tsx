'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useShift } from '@/contexts/ShiftContext';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { getSalesManagementData } from '@/lib/reports/actions';
import { useSalesRepProduction } from '@/hooks/use-sales-rep-production';
import { cn } from '@/lib/utils';
import { 
  Package, 
  TrendingUp, 
  Clock, 
  Plus, 
  FileText,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Target,
  Loader2
} from 'lucide-react';
// Removed modal imports - now using page routes
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ProductionTableSkeleton } from '@/components/ui/loading-skeleton';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';

interface SalesRecord {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  shift: string;
  recorded_by: string;
  created_at: string;
  bread_types: {
    id: string;
    name: string;
    unit_price: number;
  };
}

interface DashboardMetrics {
  todaySales: number;
  transactions: number;
  itemsSold: number;
}

interface AvailableStock {
  id: string;
  bread_type_id: string;
  bread_type_name: string;
  quantity: number;
  unit_price: number;
  last_updated: string;
}

interface SalesManagementData {
  salesRecords: SalesRecord[];
  availableStock: AvailableStock[];
  metrics: DashboardMetrics;
}

interface SalesManagementClientProps {
  userId: string;
  userName: string;
  userRole: string;
  initialData: SalesManagementData | null;
}

export default function SalesManagementClient({
  userId,
  userName,
  userRole,
  initialData
}: SalesManagementClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(!initialData);

  // State management
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(initialData?.salesRecords || []);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>(initialData?.availableStock || []);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialData?.metrics || {
    todaySales: 0,
    transactions: 0,
    itemsSold: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'low'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Navigation loading states
  const [isNavigating, setIsNavigating] = useState<{
    recordSale: boolean;
    reportsHistory: boolean;
    generateReport: boolean;
    viewAllSales: boolean;
    goBack: boolean;
  }>({
    recordSale: false,
    reportsHistory: false,
    generateReport: false,
    viewAllSales: false,
    goBack: false
  });
  
  // Transition state management
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get production data using the existing hook with real-time updates
  const {
    productionItems,
    totalUnits,
    source,
    isEmpty,
    shift,
    currentTime,
    currentHour,
    reason,
    nextClearTime,
    isLoading: isProductionLoading,
    error: productionError,
    refetch,
    isFetching,
    isCleared,
    isRealTimeActive
  } = useSalesRepProduction();

  // Memoized pagination calculations for production items
  const paginatedData = useMemo(() => {
    if (!productionItems.length) {
      return {
        items: [],
        totalPages: 0,
        filteredCount: 0
      };
    }

    // Apply search and filter first
    const filteredItems = productionItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        activeFilter === 'all' ||
        (activeFilter === 'available' && item.available > 0) ||
        (activeFilter === 'low' && item.available <= 5 && item.available > 0);
      return matchesSearch && matchesFilter;
    });

    // Then paginate
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalPages,
      filteredCount: filteredItems.length
    };
  }, [productionItems, searchTerm, activeFilter, currentPage, itemsPerPage]);

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  // Fetch fresh data using server action
  const fetchSalesData = useCallback(async () => {
    if (isTransitioning) {
      return;
    }
    
    try {
      setIsRefreshing(true);
      const result = await getSalesManagementData(userId, currentShift);
      
      if (result.success && result.data && 'salesRecords' in result.data) {
        setSalesRecords(result.data.salesRecords);
        setAvailableStock(result.data.availableStock || []);
        setMetrics(result.data.metrics);
        
        console.log('📊 Sales Management Data Updated:', {
          salesRecordsCount: result.data.salesRecords.length,
          availableStockCount: (result.data.availableStock || []).length,
          metrics: result.data.metrics
        });
      } else {
        console.error('Error fetching sales data:', result.error);
        toast.error('Failed to fetch sales data');
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, currentShift, isTransitioning]);

  useEffect(() => {
    fetchSalesData();
  }, [currentShift, userId, fetchSalesData]);


  const getStatusIndicator = (quantity: number) => {
    if (quantity === 0) return <XCircle className="h-4 w-4 text-red-500" />;
    if (quantity <= 5) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const handleSalesRecorded = () => {
    fetchSalesData();
    toast.success('Sale recorded successfully');
  };

  // Removed modal transition handler - now using page routes

  // Navigation functions with loading states
  const goBack = async () => {
    setIsNavigating(prev => ({ ...prev, goBack: true }));
    try {
      router.back();
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(prev => ({ ...prev, goBack: false }));
    }
  };

  const recordNewSale = async () => {
    setIsNavigating(prev => ({ ...prev, recordSale: true }));
    try {
      router.push('/dashboard/sales/record');
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(prev => ({ ...prev, recordSale: false }));
    }
  };

  const viewReportsHistory = async () => {
    setIsNavigating(prev => ({ ...prev, reportsHistory: true }));
    try {
      router.push('/dashboard/sales-reports-history');
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(prev => ({ ...prev, reportsHistory: false }));
    }
  };

  const generateShiftReport = async () => {
    setIsNavigating(prev => ({ ...prev, generateReport: true }));
    try {
      router.push('/dashboard/sales/end-shift');
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(prev => ({ ...prev, generateReport: false }));
    }
  };

  const viewAllSales = async () => {
    setIsNavigating(prev => ({ ...prev, viewAllSales: true }));
    try {
      router.push('/dashboard/sales/all-sales');
    } catch (error) {
      console.error('Navigation error:', error);
      setIsNavigating(prev => ({ ...prev, viewAllSales: false }));
    }
  };

  const filterProducts = (filter: 'all' | 'available' | 'low') => {
    setActiveFilter(filter);
  };

  // Reset navigation states after route changes
  useEffect(() => {
    const handleRouteChangeComplete = () => {
      setIsNavigating({
        recordSale: false,
        reportsHistory: false,
        generateReport: false,
        viewAllSales: false,
        goBack: false
      });
    };

    // Reset navigation states after a delay (when user comes back)
    const timer = setTimeout(() => {
      handleRouteChangeComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const refreshProducts = () => {
    refetch();
    fetchSalesData();
    toast.success('Data refreshed');
  };

  if (isLoading && !isTransitioning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Transition Overlay */}
      {showTransitionOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 rounded-full opacity-25"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Processing Feedback
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Generating your report...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Mobile-first responsive */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goBack}
              disabled={isNavigating.goBack}
              className="text-xl sm:text-2xl text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] w-10 flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Go back"
              aria-label="Go back"
            >
              {isNavigating.goBack ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                '←'
              )}
            </button>
            <h1 className="text-base sm:text-xl font-semibold text-gray-900 text-center truncate px-2">Sales Management</h1>
            <div className={cn(
              "px-2 sm:px-3 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0",
              currentShift === 'morning' 
                ? "bg-yellow-100 text-yellow-800" 
                : "bg-indigo-100 text-indigo-800"
            )}>
              {currentShift}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Quick Stats - Mobile-first responsive */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 mb-4 shadow-sm border border-gray-200">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {formatCurrencyNGN(metrics.todaySales)}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium leading-tight">Today&apos;s Sales</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {metrics.transactions}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium leading-tight">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {metrics.itemsSold}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium leading-tight">Items Sold</div>
            </div>
          </div>
        </div>

        {/* Alert - Mobile optimized */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 flex items-start sm:items-center gap-2">
          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 sm:mt-0 flex-shrink-0" />
          <span className="text-blue-800 text-sm leading-tight">
            {currentShift} shift active. Production data loaded successfully.
          </span>
        </div>

        {/* Search Bar - Mobile optimized */}
        <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm border border-gray-200 flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search bread types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400 min-w-0"
          />
        </div>

        {/* Filter Tabs - Mobile-first responsive */}
        <div className="bg-white rounded-xl p-1 mb-4 shadow-sm border border-gray-200 flex">
          <button
            onClick={() => filterProducts('all')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center",
              activeFilter === 'all' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="leading-tight">All Products</span>
          </button>
          <button
            onClick={() => filterProducts('available')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center",
              activeFilter === 'available' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="leading-tight">Available</span>
          </button>
          <button
            onClick={() => filterProducts('low')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center",
              activeFilter === 'low' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <span className="leading-tight">Low Stock</span>
          </button>
        </div>

        {/* Production Table Section - Mobile responsive header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 min-w-0">
            <Package className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 flex-shrink-0" />
            <span className="truncate">Production Batches</span>
            <span className="hidden sm:inline">({currentShift} shift)</span>
          </h2>
          <button
            onClick={refreshProducts}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm min-h-[44px] flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <ErrorBoundary>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-6">
            <div className="bg-gray-50 px-4 py-4 border-b border-gray-200 font-semibold text-gray-700 text-sm flex items-center justify-between">
              <div>
                Production Items for Current Shift
                {source && source !== 'cleared' && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Source: {source})
                  </span>
                )}
                {isRealTimeActive && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live
                  </span>
                )}
              </div>
              {isFetching && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              )}
            </div>
            
            {/* Loading State */}
            {isProductionLoading && <ProductionTableSkeleton rows={5} />}
            
            {/* Error State */}
            {productionError && (
              <div className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load production data</h3>
                <p className="text-sm text-red-700 mb-4">{productionError.message}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {/* Empty/Cleared State - Mobile optimized */}
            {!isProductionLoading && !productionError && (isEmpty || isCleared) && (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Package className="mx-auto h-8 sm:h-12 w-8 sm:w-12 mb-4 text-gray-300" />
                <div className="space-y-3">
                  <p className="font-medium text-base sm:text-lg">
                    {isCleared ? 'Production cleared for current shift' : 'No production items yet'}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {reason || (shift === 'morning' 
                      ? 'Morning shift clears at midnight (00:00)' 
                      : 'Night shift clears at 3:00 PM (15:00)'
                    )}
                  </p>
                  {nextClearTime && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                      {nextClearTime}
                    </p>
                  )}
                  {currentTime && (
                    <p className="text-xs text-gray-400 px-2">
                      Current time: {new Date(currentTime).toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}
                    </p>
                  )}
                  {!isCleared && (
                    <p className="text-sm text-blue-600 mt-4">
                      Waiting for production batches to be created...
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Production Items */}
            {!isProductionLoading && !productionError && !isEmpty && !isCleared && (
              <>
                {paginatedData.items.map((item) => (
                  <div key={item.id} className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Mobile-first responsive layout */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIndicator(item.available)}
                          <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.name}</span>
                          {item.size && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0 hidden sm:inline">
                              {item.size}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-1">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">
                            {item.available} available
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-medium">
                            {item.produced} produced
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Batch: {item.batch_number}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-green-600 text-sm mb-1">
                          {formatCurrencyNGN(item.unit_price)}
                        </div>
                        <div className={cn(
                          "px-2 sm:px-3 py-1 rounded-lg text-xs font-medium text-center",
                          item.available === 0
                            ? "bg-gray-100 text-gray-400"
                            : item.available <= 5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        )}>
                          {item.available === 0 ? 'Sold Out' : 
                           item.available <= 5 ? 'Low Stock' : 'Available'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* No items after filtering - Mobile optimized */}
                {paginatedData.items.length === 0 && productionItems.length > 0 && (
                  <div className="p-6 sm:p-8 text-center text-gray-500">
                    <Package className="mx-auto h-8 sm:h-12 w-8 sm:w-12 mb-4 text-gray-300" />
                    <p className="font-medium text-sm sm:text-base">No items match your search criteria</p>
                    <p className="text-xs sm:text-sm mt-1 px-2">Try adjusting your search or filter options</p>
                  </div>
                )}
                
                {/* Pagination */}
                {paginatedData.totalPages > 1 && (
                  <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={paginatedData.totalPages}
                      onPageChange={setCurrentPage}
                      className="justify-center"
                    />
                    <div className="text-center text-sm text-gray-600 mt-2">
                      Showing {paginatedData.items.length} of {paginatedData.filteredCount} items
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ErrorBoundary>


        {/* Recent Sales Section - Mobile optimized */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 min-w-0">
            <BarChart3 className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600 flex-shrink-0" />
            <span className="truncate">Recent Sales</span>
          </h2>
          <button
            onClick={viewAllSales}
            disabled={isNavigating.viewAllSales}
            className="px-2 sm:px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm min-h-[44px] flex-shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNavigating.viewAllSales && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></div>
            )}
            <span className="hidden sm:inline">{isNavigating.viewAllSales ? 'Loading...' : 'View All'}</span>
            <span className="sm:hidden">{isNavigating.viewAllSales ? '' : 'All'}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          {salesRecords.slice(0, 3).map((record) => (
            <div key={record.id} className="px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm sm:text-base mb-1 truncate">{record.bread_types.name}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <span>{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>Qty: {record.quantity}</span>
                  </div>
                </div>
                <div className="font-bold text-green-600 text-sm sm:text-lg flex-shrink-0">
                  {formatCurrencyNGN((record.quantity * (record.unit_price || 0)) - (record.discount || 0))}
                </div>
              </div>
            </div>
          ))}
          
          {salesRecords.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <TrendingUp className="mx-auto h-8 sm:h-12 w-8 sm:w-12 mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No sales recorded today</p>
            </div>
          )}
        </div>

        {/* Quick Actions - Mobile optimized */}
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            onClick={recordNewSale}
            disabled={isNavigating.recordSale}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-sm min-h-[52px] disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
          >
            {isNavigating.recordSale ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Record Sale
              </>
            )}
          </button>
          
          <button
            onClick={viewReportsHistory}
            disabled={isNavigating.reportsHistory}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors shadow-sm min-h-[52px] disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-gray-500"
          >
            {isNavigating.reportsHistory ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Reports History
              </>
            )}
          </button>
        </div>

        <div className="mb-20">
          <button
            onClick={generateShiftReport}
            disabled={isNavigating.generateReport}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-sm min-h-[52px] disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-green-500"
          >
            {isNavigating.generateReport ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Shift Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Action Button - Mobile optimized */}
      <button
        onClick={recordNewSale}
        disabled={isNavigating.recordSale}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center z-40 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
        aria-label="Record new sale"
      >
        {isNavigating.recordSale ? (
          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
        ) : (
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </button>

      {/* All modals converted to page routes */}
    </div>
  );
}
