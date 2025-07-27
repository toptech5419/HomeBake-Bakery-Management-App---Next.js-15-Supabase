'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShift } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { 
  ArrowLeft, 
  Package, 
  TrendingUp, 
  Clock, 
  Plus, 
  RotateCcw, 
  FileText,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  History,
  BarChart3,
  Target,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { SalesModal } from '@/components/dashboards/sales/SalesModal';
import { QuickRecordAllModal } from '@/components/dashboards/sales/QuickRecordAllModal';
import { FinalReportModal } from '@/components/dashboards/sales/FinalReportModal';
import { ViewAllSalesModal } from '@/components/modals/ViewAllSalesModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface ProductionItem {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number;
  bread_types: BreadType;
  produced: number;
  sold: number;
  available: number;
}

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
  bread_types: BreadType;
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
  breadTypes: BreadType[];
}

export default function SalesManagementClient({
  userId,
  userName,
  userRole,
  breadTypes
}: SalesManagementClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  
  // State management
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaySales: 0,
    transactions: 0,
    itemsSold: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'low'>('all');
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showQuickRecordModal, setShowQuickRecordModal] = useState(false);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);
  const [showViewAllSalesModal, setShowViewAllSalesModal] = useState(false);
  const [finalReportData, setFinalReportData] = useState<any>(null);
  
  // Transition state management
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInModalTransition, setIsInModalTransition] = useState(false);

  // Check if any modal is open
  const isAnyModalOpen = showSalesModal || showQuickRecordModal || showFinalReportModal || showViewAllSalesModal;

  // Fetch production and sales data
  const fetchData = async () => {
    if (isTransitioning) {
      return;
    }
    
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

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

      // Fetch sales data for current shift
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
        .order('created_at', { ascending: false });

      // Process production items with calculated values
      if (productionData && salesData) {
        const processedItems = productionData.map(prod => {
          const sold = salesData
            .filter(sale => sale.bread_type_id === prod.bread_type_id)
            .reduce((sum, sale) => sum + sale.quantity, 0);
          
          return {
            id: prod.id,
            bread_type_id: prod.bread_type_id,
            quantity: prod.quantity,
            unit_price: prod.bread_types.unit_price,
            bread_types: prod.bread_types,
            produced: prod.quantity,
            sold,
            available: Math.max(0, prod.quantity - sold)
          };
        });

        setProductionItems(processedItems);

        // Calculate metrics
        const todaySales = salesData.reduce((sum, sale) => {
          const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
          return sum + amount;
        }, 0);

        const itemsSold = salesData.reduce((sum, sale) => sum + sale.quantity, 0);

        setMetrics({
          todaySales,
          transactions: salesData.length,
          itemsSold
        });

        setSalesRecords(salesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentShift]);

  const getStatusIndicator = (available: number) => {
    if (available === 0) return <XCircle className="h-4 w-4 text-red-500" />;
    if (available <= 5) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const handleSalesRecorded = () => {
    fetchData();
    toast.success('Sale recorded successfully');
  };

  const handleFinalSubmit = async (feedbackData: any) => {
    try {
      setShowTransitionOverlay(true);
      setIsTransitioning(true);
      setIsInModalTransition(true);
      
      const processedData = {
        ...feedbackData,
        submittedAt: new Date().toISOString(),
      };
    
      setShowQuickRecordModal(false);
      setShowFinalReportModal(true);
      setFinalReportData(processedData);
    
      setTimeout(() => {
        setShowTransitionOverlay(false);
        setIsTransitioning(false);
        setIsInModalTransition(false);
      }, 100);
      
    } catch (error) {
      console.error('Error processing feedback:', error);
      setShowTransitionOverlay(false);
      setIsTransitioning(false);
      setIsInModalTransition(false);
      toast.error('Failed to process report');
    }
  };

  const handleModalClose = () => {
    setShowQuickRecordModal(false);
    setShowFinalReportModal(false);
    setFinalReportData(null);
    setIsTransitioning(false);
    setIsInModalTransition(false);
    setShowTransitionOverlay(false);
  };

  const goBack = () => {
    router.back();
  };

  const quickSale = (breadType: string) => {
    setShowSalesModal(true);
    toast.info(`Quick sale for ${breadType} bread initiated!`);
  };

  const recordNewSale = () => {
    setShowSalesModal(true);
  };

  const recordBulkSale = () => {
    setShowQuickRecordModal(true);
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
    fetchData();
    toast.success('Data refreshed');
  };

  if (loading && !isTransitioning) {
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
        {/* Quick Stats */}
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
          </div>
          
          {productionItems
            .filter(item => {
              const matchesSearch = item.bread_types.name.toLowerCase().includes(searchTerm.toLowerCase());
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
                    <span className="font-semibold text-gray-900">{item.bread_types.name}</span>
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
                    {formatCurrencyNGN(item.bread_types.unit_price)}
                  </div>
                  <button
                    onClick={() => quickSale(item.bread_types.name.toLowerCase())}
                    disabled={item.available === 0}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      item.available === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600"
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    {item.available === 0 ? 'Sold Out' : 'Available'}
                  </button>
                </div>
              </div>
            ))}
          
          {productionItems.filter(item => {
            const matchesSearch = item.bread_types.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = 
              activeFilter === 'all' ||
              (activeFilter === 'available' && item.available > 0) ||
              (activeFilter === 'low' && item.available <= 5 && item.available > 0);
            return matchesSearch && matchesFilter;
          }).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>No products found</p>
            </div>
          )}
        </div>

        {/* Recent Sales Section */}
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
