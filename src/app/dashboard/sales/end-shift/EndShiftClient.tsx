'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Minus, TrendingUp, Package, FileText, Clock, AlertTriangle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
import { createSalesLog } from '@/lib/sales/actions';
import { getBreadTypesForSales, getSalesDataForShift, getRemainingBreadData } from '@/lib/reports/sales-reports-server-actions';
import { getRemainingBread, updateRemainingBread } from '@/lib/reports/actions';
import { useRouter } from 'next/navigation';
import { setNavigationHistory } from '@/lib/utils/navigation-history';

interface EndShiftClientProps {
  userId: string;
  userName: string;
}

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface QuickRecordItem {
  breadType: BreadType;
  quantity: number;
}

interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  leftover?: number | null;
  shift: 'morning' | 'night';
  recorded_by: string;
  created_at: string;
  bread_types?: {
    id: string;
    name: string;
    unit_price: number;
  };
}

export function EndShiftClient({ userId, userName }: EndShiftClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [quickRecordItems, setQuickRecordItems] = useState<QuickRecordItem[]>([]);
  const [quickRemainingItems, setQuickRemainingItems] = useState<QuickRecordItem[]>([]);
  const [salesLogs, setSalesLogs] = useState<SalesLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Initialize loading state to true so page shows loading on first render
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch bread types using server action
      try {
        const breadTypesData = await getBreadTypesForSales();
        if (breadTypesData) {
          setBreadTypes(breadTypesData);
          setQuickRecordItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
          setQuickRemainingItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
        }
      } catch (serverActionError) {
        console.error('Server action failed, falling back to direct query:', serverActionError);
        // Fallback to direct query
        const { data: breadTypesData } = await supabase
          .from('bread_types')
          .select('id, name, unit_price')
          .order('name');

        if (breadTypesData) {
          setBreadTypes(breadTypesData);
          setQuickRecordItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
          setQuickRemainingItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
        }
      }

      // Fetch sales data using server action
      try {
        const salesData = await getSalesDataForShift(userId, currentShift);
        if (salesData) {
          setSalesLogs(salesData);
          
          // Auto-fill "Record Additional Sales" with quantities from sales_logs
          const salesQuantities = new Map<string, number>();
          
          salesData.forEach((sale: SalesLog) => {
            const breadTypeId = sale.bread_type_id;
            const currentQuantity = salesQuantities.get(breadTypeId) || 0;
            salesQuantities.set(breadTypeId, currentQuantity + sale.quantity);
          });

          // Update quickRecordItems with quantities from sales_logs
          setQuickRecordItems(prevItems => 
            prevItems.map(item => ({
              ...item,
              quantity: salesQuantities.get(item.breadType.id) || 0
            }))
          );
        }
      } catch (serverActionError) {
        console.error('Server action failed, falling back to direct query:', serverActionError);
        // Fallback to direct query
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
          .eq('shift', currentShift)
          .eq('recorded_by', userId)
          .order('created_at', { ascending: false });

        if (salesError) {
          console.error('❌ Error fetching sales data:', salesError);
          throw salesError;
        }

        if (salesData) {
          setSalesLogs(salesData);
          
          // Auto-fill "Record Additional Sales" with quantities from sales_logs
          const salesQuantities = new Map<string, number>();
          
          salesData.forEach((sale: SalesLog) => {
            const breadTypeId = sale.bread_type_id;
            const currentQuantity = salesQuantities.get(breadTypeId) || 0;
            salesQuantities.set(breadTypeId, currentQuantity + sale.quantity);
          });

          // Update quickRecordItems with quantities from sales_logs
          setQuickRecordItems(prevItems => 
            prevItems.map(item => ({
              ...item,
              quantity: salesQuantities.get(item.breadType.id) || 0
            }))
          );
        }
      }

      // Load existing remaining bread data
      await loadRemainingBreadData();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentShift, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadRemainingBreadData = async () => {
    try {
      // Use new server action
      const result = await getRemainingBread(userId);
      
      if (result.success && result.data && result.data.length > 0) {
        setQuickRemainingItems(prevItems => 
          prevItems.map(item => {
            const totalRemaining = result.data
              .filter(r => r.bread_type_id === item.breadType.id)
              .reduce((sum, r) => sum + (r.quantity || 0), 0);
            return { ...item, quantity: totalRemaining };
          })
        );
      } else if (!result.success) {
        console.error('Error loading remaining bread:', result.error);
      }
    } catch (error) {
      console.error('Error loading remaining bread:', error);
    }
  };

  const updateQuickRecordQuantity = (breadTypeId: string, quantity: number, isRemaining: boolean = false) => {
    const items = isRemaining ? quickRemainingItems : quickRecordItems;
    const setItems = isRemaining ? setQuickRemainingItems : setQuickRecordItems;
    
    setItems(items.map(item => 
      item.breadType.id === breadTypeId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ));
  };

  const handleSubmitReport = async () => {
    const remainingToRecord = quickRemainingItems.filter(item => item.quantity > 0);

    // Check if there are remaining breads
    if (remainingToRecord.length === 0) {
      setShowConfirmationModal(true);
    } else {
      setShowFeedbackModal(true);
    }
  };

  const handleConfirmProceed = () => {
    setShowConfirmationModal(false);
    setShowFeedbackModal(true);
  };

  const handleSubmitWithFeedback = async () => {
    setSubmitting(true);
    
    try {
      // Show loading toast
      toast.loading('Ending shift and clearing data...', { id: 'end-shift' });
      
      // END SHIFT: Clear all sales logs for the current user and shift
      console.log('🧹 END SHIFT: Clearing all sales logs for current user/shift:', { userId, currentShift });
      
      const { error: clearError, count } = await supabase
        .from('sales_logs')
        .delete({ count: 'exact' })
        .eq('recorded_by', userId)
        .eq('shift', currentShift);

      if (clearError) {
        console.error('❌ Error clearing sales logs:', clearError);
        toast.error('Failed to clear shift data. Please try again.', { id: 'end-shift' });
        setSubmitting(false);
        return;
      }

      console.log('✅ END SHIFT: Sales logs cleared successfully', { deletedCount: count });
      
      // Dismiss loading toast and show success
      toast.dismiss('end-shift');
      toast.success(`Shift ended! Cleared ${count || 0} sales records.`);

      // Add a small delay for UI feedback, then navigate with replace for smooth transition
      setTimeout(() => {
        // Use replace for smoother transition without history stack
        router.replace('/dashboard/sales');
        
        // Force refresh the page after navigation
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 1000);

    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('Failed to end shift. Please try again.', { id: 'end-shift' });
      setSubmitting(false);
    }
  };

  // Enable End Shift button if there are any sales logs to clear
  const hasSalesLogs = salesLogs.length > 0;
  const shouldEnableEndShift = hasSalesLogs;

  // Show initial loading screen on first render
  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-amber-50">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
              <div className="h-10 w-10 bg-white/20 rounded-xl animate-pulse"></div>
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl">
                <div className="h-5 w-5 sm:h-6 sm:w-6 bg-white/30 rounded animate-pulse"></div>
              </div>
              <div className="flex-1">
                <div className="h-6 w-32 bg-white/20 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 animate-pulse">Loading End Shift...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* End Shift Loading Overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-red-200 rounded-full opacity-25"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ending Shift
                </h3>
                <p className="text-gray-600 text-sm">
                  Clearing all sales data...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/sales')}
              disabled={submitting}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">End Shift - Quick Record</h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {currentShift?.charAt(0).toUpperCase() + currentShift?.slice(1)} Shift • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50/30 to-yellow-50/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-6 text-gray-600 text-lg">Loading...</p>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6 lg:space-y-8">
            
            {/* Sales Log Display */}
            {salesLogs.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-green-200/50 shadow-sm">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 text-green-800">
                  <div className="bg-green-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <span className="truncate">Recorded Sales</span>
                </h2>
                <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto border rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white/80 backdrop-blur-sm">
                  {salesLogs.map((log) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl shadow-sm border border-green-100/50 hover:shadow-md transition-all duration-200 touch-manipulation">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{log.bread_types?.name || 'Unknown'}</p>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 sm:gap-2 mt-1">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-bold text-sm sm:text-base">{log.quantity} units</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {formatCurrencyNGN(log.quantity * (log.unit_price || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record Additional Sales Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-blue-200/50 shadow-sm">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-blue-800">
                <div className="bg-blue-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <span className="truncate">Record Additional Sales</span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {quickRecordItems.map((item) => (
                  <div key={item.breadType.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:bg-white touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{item.breadType.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1)}
                        disabled={submitting}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0)}
                        disabled={submitting}
                        className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1)}
                        disabled={submitting}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Record Remaining Breads Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-amber-200/50 shadow-sm">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 text-amber-800">
                <div className="bg-amber-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <span className="truncate">Record Remaining Breads</span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {quickRemainingItems.map((item) => (
                  <div key={item.breadType.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg sm:rounded-xl bg-gradient-to-r from-yellow-50/80 to-amber-50/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:from-yellow-100/80 hover:to-amber-100/80 touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{item.breadType.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Remaining quantity</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1, true)}
                        disabled={submitting}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true)}
                        disabled={submitting}
                        className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true)}
                        disabled={submitting}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-purple-200/50 shadow-sm">
              <h3 className="font-semibold mb-3 sm:mb-4 text-lg sm:text-xl text-purple-800 flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded-full flex-shrink-0" />
                <span className="truncate">Summary</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate">Sales to record:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0">
                      {quickRecordItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate">Total units:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0">
                      {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate">Remaining to record:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0">
                      {quickRemainingItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate">Total units:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0">
                      {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar - Mobile First */}
      <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 safe-area-bottom">
        <div className="max-w-6xl mx-auto flex gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/sales')}
            disabled={submitting}
            className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-sm sm:text-base font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={submitting || !shouldEnableEndShift}
            className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] sm:min-h-[56px]"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <div className="rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent animate-spin" />
                <span className="text-sm sm:text-base font-semibold">Ending Shift...</span>
              </div>
            ) : (
              <span className="text-sm sm:text-base font-semibold">End Shift</span>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal - Mobile First */}
      <AnimatePresence>
        {showConfirmationModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl shadow-2xl mx-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">End Current Shift</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  This will clear all your sales data for the current shift. Are you sure you want to end the shift?
                </p>
                <div className="flex gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmationModal(false)}
                    className="flex-1 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmProceed}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    End Shift
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal - Mobile First */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl shadow-2xl mx-auto max-h-[90vh] flex flex-col"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                    <Send className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">End Shift Confirmation</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  This will permanently clear all your sales data for this shift. Continue?
                </p>
              </div>
              <div className="p-4 sm:p-6 pt-0 sm:pt-0 flex-shrink-0">
                <div className="flex gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitWithFeedback}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <div className="rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent animate-spin" />
                        <span className="text-sm sm:text-base font-semibold">Ending Shift...</span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-semibold">End Shift Now</span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}