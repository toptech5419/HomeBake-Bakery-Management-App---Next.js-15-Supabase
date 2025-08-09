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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch bread types
      const { data: breadTypesData } = await supabase
        .from('bread_types')
        .select('id, name, unit_price')
        .order('name');

      if (breadTypesData) {
        setBreadTypes(breadTypesData);
        setQuickRecordItems(breadTypesData.map(bt => ({ breadType: bt, quantity: 0 })));
        setQuickRemainingItems(breadTypesData.map(bt => ({ breadType: bt, quantity: 0 })));
      }

      // Fetch all sales logs for current shift
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

      // Load existing remaining bread data from sales_logs
      await loadRemainingBreadData();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentShift, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadRemainingBreadData = async () => {
    try {
      // Load all remaining bread records
      const { data: remainingData } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('recorded_by', userId);

      if (remainingData && remainingData.length > 0) {
        setQuickRemainingItems(prevItems => 
          prevItems.map(item => {
            const totalRemaining = remainingData
              .filter(r => (r as unknown as {bread_type_id: string}).bread_type_id === item.breadType.id)
              .reduce((sum, r) => sum + ((r as unknown as {quantity: number}).quantity || 0), 0);
            return { ...item, quantity: totalRemaining };
          })
        );
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
      const salesToRecord = quickRecordItems.filter(item => item.quantity > 0);
      const remainingToRecord = quickRemainingItems.filter(item => item.quantity > 0);
      
      // Update or create sales records based on final quantities
      for (const item of salesToRecord) {
        const existingRecord = salesLogs.find(log => 
          log.bread_type_id === item.breadType.id
        );
        
        if (existingRecord) {
          // Update existing record to the new quantity
          const { error: updateError } = await supabase
            .from('sales_logs')
            .update({
              quantity: item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error('Error updating sale:', updateError);
            throw updateError;
          }
        } else {
          // Create new record if none exists using server action
          await createSalesLog({
            bread_type_id: item.breadType.id,
            quantity: item.quantity,
            unit_price: item.breadType.unit_price,
            shift: currentShift,
            recorded_by: userId
          });
        }
      }

      // Handle remaining breads - update, insert, or delete based on quantity
      const allBreadTypes = [...new Set([...remainingToRecord.map(item => item.breadType), ...breadTypes])];
      
      for (const breadType of allBreadTypes) {
        const item = remainingToRecord.find(r => r.breadType.id === breadType.id);
        const quantity = item ? item.quantity : 0;

        if (quantity === 0) {
          // Delete any existing record for this bread type
          await supabase
            .from('remaining_bread')
            .delete()
            .eq('bread_type_id', breadType.id)
            .eq('recorded_by', userId);
        } else {
          // Update or insert record
          const { data: existingRecords } = await supabase
            .from('remaining_bread')
            .select('id')
            .eq('bread_type_id', breadType.id)
            .eq('recorded_by', userId)
            .limit(1);

          const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

          if (existingRecord) {
            // Update existing record
            await supabase
              .from('remaining_bread')
              .update({
                shift: currentShift,
                bread_type: breadType.name,
                bread_type_id: breadType.id,
                quantity: quantity,
                unit_price: breadType.unit_price,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingRecord.id);
          } else {
            // Insert new record
            await supabase
              .from('remaining_bread')
              .insert({
                shift: currentShift,
                bread_type: breadType.name,
                bread_type_id: breadType.id,
                quantity: quantity,
                unit_price: breadType.unit_price,
                recorded_by: userId
              });
          }
        }
      }

      // Calculate monetary values for remaining bread
      const totalRemainingMonetaryValue = remainingToRecord.reduce((sum, item) => {
        return sum + (item.quantity * item.breadType.unit_price);
      }, 0);

      // Generate report data using only the final quantities from the form
      const reportData = {
        salesRecords: salesToRecord.map(item => ({
          breadType: item.breadType.name,
          quantity: item.quantity,
          unitPrice: item.breadType.unit_price,
          totalAmount: item.quantity * item.breadType.unit_price,
          timestamp: new Date().toISOString()
        })),
        remainingBreads: remainingToRecord.map(item => ({
          breadType: item.breadType.name,
          quantity: item.quantity,
          unitPrice: item.breadType.unit_price,
          totalAmount: item.quantity * item.breadType.unit_price
        })),
        totalRevenue: salesToRecord.reduce((sum, item) => 
          sum + (item.quantity * item.breadType.unit_price), 0),
        totalItemsSold: salesToRecord.reduce((sum, item) => 
          sum + item.quantity, 0),
        totalRemaining: totalRemainingMonetaryValue,
        feedback: feedback.trim() || null,
        shift: currentShift,
        timeOfSales: new Date().toLocaleTimeString(),
        userId: userId
      };

      toast.success('Shift feedback submitted successfully!');

      // Set navigation history so final-report knows to come back here
      setNavigationHistory('/dashboard/sales/end-shift', 'sales_rep', 'end-shift');

      // Navigate to final report page with data
      const encodedData = encodeURIComponent(JSON.stringify(reportData));
      router.push(`/dashboard/sales/final-report?data=${encodedData}`);

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit shift feedback. Please try again.');
      setSubmitting(false);
    }
  };

  // Check if Submit Report should be enabled
  const hasSalesLogs = salesLogs.length > 0;
  const hasSalesToRecord = quickRecordItems.some(item => item.quantity > 0);
  const hasRemainingToRecord = quickRemainingItems.some(item => item.quantity > 0);
  const shouldEnableSubmit = hasSalesLogs || hasSalesToRecord || hasRemainingToRecord;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
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
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0"
                      >
                        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0)}
                        className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1)}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0"
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
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0"
                      >
                        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true)}
                        className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true)}
                        className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0"
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
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-sm sm:text-base font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={submitting || !shouldEnableSubmit}
            className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] sm:min-h-[56px]"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <div className="rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent animate-spin" />
                <span className="text-sm sm:text-base font-semibold">Processing...</span>
              </div>
            ) : (
              <span className="text-sm sm:text-base font-semibold">Submit Report</span>
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
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">No Remaining Bread</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  You haven't recorded any remaining bread. Do you want to proceed with the report anyway?
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
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    Proceed
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
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">Shift Feedback</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  Share any feedback about this shift (optional)
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="If there&apos;s no feedback, you can proceed to report..."
                  className="w-full h-24 sm:h-32 p-3 border rounded-lg sm:rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base touch-manipulation"
                />
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
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <div className="rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent animate-spin" />
                        <span className="text-sm sm:text-base font-semibold">Submitting...</span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-semibold">Submit Report</span>
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