'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShift } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
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
  Target
} from 'lucide-react';
import { SalesModal } from '@/components/dashboards/sales/SalesModal';
import { QuickRecordAllModal } from '@/components/dashboards/sales/QuickRecordAllModal';
import { FinalReportModal } from '@/components/dashboards/sales/FinalReportModal';
import { ViewAllSalesModal } from '@/components/modals/ViewAllSalesModal';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useSalesRepProduction } from '@/hooks/use-sales-rep-production';

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

interface SalesManagementClientProps {
  userId: string;
  userName: string;
  userRole: string;
}

export default function SalesManagementClient({
  userId,
  userName,
  userRole
}: SalesManagementClientProps) {
  console.log('🔄 SalesManagementClient: Component rendering...', { userId, userName, userRole });
  
  const { currentShift } = useShift();
  const router = useRouter();
  const { user: clientUser } = useAuth();
  
  // Use server user if available, otherwise fall back to client user
  const user = clientUser || { id: userId };
  
  console.log('🔄 SalesManagementClient: Shift and user info:', { 
    currentShift, 
    userId, 
    clientUserId: clientUser?.id 
  });
  
  // Use sales rep production hook for production items
  const { 
    productionItems, 
    totalUnits, 
    isLoading, 
    error, 
    refetch,
    source,
    isEmpty,
    shift,
    currentTime,
    currentHour,
    currentDate
  } = useSalesRepProduction();
  
  // Debug log the production data
  useEffect(() => {
    console.log('🔧 Client Production Debug:', {
      currentUser: user?.id,
      userRole: userRole || 'unknown',
      currentShift,
      currentDate,
      productionItemsLength: productionItems.length,
      totalUnits,
      isEmpty,
      source,
      isLoading,
      error,
      note: 'Sales rep viewing ALL production items'
    });
  }, [productionItems, totalUnits, isLoading, error, source, isEmpty, shift, currentTime, currentHour, currentShift, user, currentDate, userRole]);

  // State management
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaySales: 0,
    transactions: 0,
    itemsSold: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'low'>('all');
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showQuickRecordModal, setShowQuickRecordModal] = useState(false);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);
  const [showViewAllSalesModal, setShowViewAllSalesModal] = useState(false);
  const [finalReportData, setFinalReportData] = useState<unknown>(null);
  
  // Transition state management
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch sales data for current shift and current user only - NO DATE FILTERING
  const fetchSalesData = async () => {
    if (isTransitioning) {
      return;
    }
    
    try {
      // Fetch sales data for current shift and current user only
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

      // Process sales data
      if (salesData) {
        setSalesRecords(salesData);

        // Calculate metrics - same logic as SalesRepDashboard
        const todaySales = salesData.reduce((sum: number, sale: SalesRecord) => {
          const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
          return sum + amount;
        }, 0);

        const transactions = salesData.length;
        
        // Calculate total units sold (sum of all quantities)
        const totalUnitsSold = salesData.reduce((sum, sale) => sum + sale.quantity, 0);
        const itemsSold = totalUnitsSold; // Total units instead of unique types

        // Debug logging to help identify issues
        console.log('📊 Sales Management Data Debug:', {
          salesDataLength: salesData.length || 0,
          transactions,
          itemsSold,
          totalUnitsSold: salesData.reduce((sum, sale) => sum + sale.quantity, 0) || 0,
          salesBreakdown: salesData.map(sale => ({
            breadType: sale.bread_types?.name,
            quantity: sale.quantity,
            unitPrice: sale.unit_price,
            totalAmount: (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0)
          })),
          filters: {
            shift: currentShift,
            userId
          }
        });

        setMetrics({
          todaySales,
          transactions,
          itemsSold
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [currentShift, userId]);

  // Calculate available quantities based on production items and sales
  const calculateAvailableQuantities = () => {
    const processedItems = productionItems.map((item: { id: string; bread_type_id: string; quantity: number; unit_price: number; name: string; size: string | null; produced: number }) => {
      // Calculate total sold for this bread type in current shift
      const sold = salesRecords
        .filter(sale => sale.bread_types.name === item.name)
        .reduce((sum, sale) => sum + sale.quantity, 0);
      
      return {
        id: item.id,
        bread_type_id: item.bread_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: item.name,
        size: item.size,
        produced: item.produced,
        sold,
        available: Math.max(0, item.quantity - sold)
      };
    });

    return processedItems;
  };

  const processedProductionItems = calculateAvailableQuantities();

  const getStatusIndicator = (available: number) => {
    if (available === 0) return <XCircle className="h-4 w-4 text-red-500" />;
    if (available <= 5) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const handleSalesRecorded = () => {
    fetchSalesData();
    refetch(); // Refresh production data
    toast.success('Sale recorded successfully');
  };

  const handleFinalSubmit = async (feedbackData: unknown) => {
    try {
      setShowTransitionOverlay(true);
      setIsTransitioning(true);
      
      const processedData = {
        ...feedbackData as Record<string, unknown>,
        submittedAt: new Date().toISOString(),
      };
    
      setShowQuickRecordModal(false);
      setShowFinalReportModal(true);
      setFinalReportData(processedData);
    
      setTimeout(() => {
        setShowTransitionOverlay(false);
        setIsTransitioning(false);
      }, 100);
      
    } catch (error) {
      console.error('Error processing feedback:', error);
      setShowTransitionOverlay(false);
      setIsTransitioning(false);
      toast.error('Failed to process report');
    }
  };

  const goBack = () => {
    router.back();
  };

  const recordNewSale = () => {
    setShowSalesModal(true);
  };

  const viewReportsHistory = () => {
    router.push('/dashboard/sales-reports-history');
  };

  const generateShiftReport = () => {
    setShowQuickRecordModal(true);
  };

  const viewAllSales = () => {
    setShowViewAllSalesModal(true);
  };

  const filterProducts = (filter: 'all' | 'available' | 'low') => {
    setActiveFilter(filter);
  };

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

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              className="text-2xl text-gray-600 hover:text-gray-900 transition-colors"
              title="Go back"
            >
              ←
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Sales Management</h1>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium capitalize",
              currentShift === 'morning' 
                ? "bg-yellow-100 text-yellow-800" 
                : "bg-indigo-100 text-indigo-800"
            )}>
              {currentShift}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats - Updated with proper metrics calculation */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 mb-1">
                {formatCurrencyNGN(metrics.todaySales)}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium">Today's Sales</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 mb-1">
                {metrics.transactions}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 mb-1">
                {metrics.itemsSold}
              </div>
              <div className="text-xs text-gray-600 uppercase font-medium">Items Sold</div>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <span className="text-blue-800 text-sm">
            {currentShift} shift active. Production data loaded successfully.
          </span>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200 flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bread types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-none outline-none text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl p-1 mb-4 shadow-sm border border-gray-200 flex">
          <button
            onClick={() => filterProducts('all')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'all' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            All Products
          </button>
          <button
            onClick={() => filterProducts('available')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'available' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Available
          </button>
          <button
            onClick={() => filterProducts('low')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'low' 
                ? "bg-orange-500 text-white" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Low Stock
          </button>
        </div>

        {/* Production Table Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            Available Products
          </h2>
          <button
            onClick={refreshProducts}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-6">
          <div className="bg-gray-50 px-4 py-4 border-b border-gray-200 font-semibold text-gray-700 text-sm">
            Production Items for Current Shift
            {source && (
              <span className="ml-2 text-xs text-gray-500">
                (Source: {source})
              </span>
            )}
            {shift && (
              <span className="ml-2 text-xs text-gray-500">
                | Shift: {shift}
              </span>
            )}
            {currentHour !== undefined && (
              <span className="ml-2 text-xs text-gray-500">
                | Hour: {currentHour}
              </span>
            )}
          </div>
          
          {isEmpty ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <div className="space-y-2">
                <p className="font-medium">Production cleared for current shift</p>
                <p className="text-sm">
                  {shift === 'morning' 
                    ? 'Morning shift clears at midnight (12:00 AM)' 
                    : 'Night shift clears at 3:00 PM'
                  }
                </p>
                {currentTime && (
                  <p className="text-xs text-gray-400">
                    Current time: {new Date(currentTime).toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}
                  </p>
                )}
              </div>
            </div>
          ) : processedProductionItems
            .filter(item => {
              const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesFilter = 
                activeFilter === 'all' ||
                (activeFilter === 'available' && item.available > 0) ||
                (activeFilter === 'low' && item.available <= 5 && item.available > 0);
              return matchesSearch && matchesFilter;
            })
            .map((item) => (
              <div key={item.id} className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIndicator(item.available)}
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium">
                      {item.available} available
                    </span>
                    <span>{item.produced} produced</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600 text-sm mb-1">
                    {formatCurrencyNGN(item.unit_price)}
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium",
                    item.available === 0
                      ? "bg-gray-100 text-gray-400"
                      : "bg-green-100 text-green-800"
                  )}>
                    {item.available === 0 ? 'Sold Out' : 'Available'}
                  </div>
                </div>
              </div>
            ))}
          
          {!isEmpty && processedProductionItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = 
              activeFilter === 'all' ||
              (activeFilter === 'available' && item.available > 0) ||
              (activeFilter === 'low' && item.available <= 5 && item.available > 0);
            return matchesSearch && matchesFilter;
          }).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>No production items for current shift</p>
            </div>
          )}
          
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-gray-100 text-xs text-gray-600 border-t border-gray-200">
              <p>Debug: Shift={shift}, Empty={isEmpty.toString()}, Source={source}, Hour={currentHour}</p>
              {currentTime && (
                <p>Current Time: {currentTime}</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Sales Section - Updated with proper data */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Recent Sales
          </h2>
          <button
            onClick={viewAllSales}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            View All
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          {salesRecords.slice(0, 3).map((record) => (
            <div key={record.id} className="px-4 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">{record.bread_types.name}</div>
                <div className="text-xs text-gray-600">
                  {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ago
                </div>
                <div className="text-xs text-gray-600 mt-1">Qty: {record.quantity}</div>
              </div>
              <div className="font-bold text-green-600 text-lg">
                {formatCurrencyNGN((record.quantity * (record.unit_price || 0)) - (record.discount || 0))}
              </div>
            </div>
          ))}
          
          {salesRecords.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <TrendingUp className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>No sales recorded today</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={recordNewSale}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Record Sale
          </button>
          
          <button
            onClick={viewReportsHistory}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors shadow-sm"
          >
            <Clock className="h-4 w-4" />
            Reports History
          </button>
        </div>

        <div className="mb-20">
          <button
            onClick={generateShiftReport}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Generate Shift Report
          </button>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={recordNewSale}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="h-6 w-6" />
      </button>

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
        onReportComplete={handleFinalSubmit}
      />

      <FinalReportModal
        isOpen={showFinalReportModal}
        onClose={() => setShowFinalReportModal(false)}
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
