'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, TrendingUp, Package, FileText, Clock, AlertTriangle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
// Card components removed as they're not used in this modal
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
import { createSalesLog } from '@/lib/sales/actions';

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

interface QuickRecordAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSalesRecorded: () => void;
  onRemainingUpdated: () => void;
  onReportComplete: (reportData: {
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
  }) => void;
}

export function QuickRecordAllModal({ 
  isOpen, 
  onClose, 
  userId, 
  onSalesRecorded, 
  onRemainingUpdated,
  onReportComplete
}: QuickRecordAllModalProps) {
  const { currentShift } = useShift();
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [quickRecordItems, setQuickRecordItems] = useState<QuickRecordItem[]>([]);
  const [quickRemainingItems, setQuickRemainingItems] = useState<QuickRecordItem[]>([]);
  const [salesLogs, setSalesLogs] = useState<SalesLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [pendingReportData, setPendingReportData] = useState<{
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
  } | null>(null);


  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Disable body scroll when modal opens
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when modal closes
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchData = async () => {
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

      // Fetch all sales logs for current shift (no date filtering)
      console.log('🔍 QuickRecordAllModal: Fetching sales data...', {
        currentShift,
        userId,
        note: 'Fetching ALL sales for current shift (no date filtering)'
      });

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

      console.log('📊 Sales data received:', {
        count: salesData?.length || 0,
        salesData: salesData?.map(s => ({
          id: s.id.substring(0, 8),
          breadType: s.bread_types?.name,
          quantity: s.quantity,
          shift: s.shift,
          createdAt: s.created_at
        })) || []
      });

      if (salesData) {
        setSalesLogs(salesData);
        
        // Auto-fill "Record Additional Sales" with quantities from sales_logs
        const salesQuantities = new Map<string, number>();
        
        salesData.forEach((sale: SalesLog) => {
          const breadTypeId = sale.bread_type_id;
          const currentQuantity = salesQuantities.get(breadTypeId) || 0;
          const newQuantity = currentQuantity + sale.quantity;
          
          console.log('🔢 Aggregating sale:', {
            breadType: sale.bread_types?.name,
            breadTypeId: breadTypeId.substring(0, 8),
            saleQuantity: sale.quantity,
            previousTotal: currentQuantity,
            newTotal: newQuantity
          });
          
          salesQuantities.set(breadTypeId, newQuantity);
        });

        console.log('📈 Final aggregated quantities:', 
          Array.from(salesQuantities.entries()).map(([id, qty]) => ({
            breadTypeId: id.substring(0, 8),
            quantity: qty
          }))
        );

        // Update quickRecordItems with quantities from sales_logs
        setQuickRecordItems(prevItems => {
          const updatedItems = prevItems.map(item => {
            const aggregatedQuantity = salesQuantities.get(item.breadType.id) || 0;
            
            console.log('🍞 Setting quantity for:', {
              breadType: item.breadType.name,
              breadTypeId: item.breadType.id.substring(0, 8),
              aggregatedQuantity
            });
            
            return {
              ...item,
              quantity: aggregatedQuantity
            };
          });
          
          console.log('✅ Updated quickRecordItems:', 
            updatedItems.filter(item => item.quantity > 0).map(item => ({
              breadType: item.breadType.name,
              quantity: item.quantity
            }))
          );
          
          return updatedItems;
        });
      }

      // Load existing remaining bread data from sales_logs
      await loadRemainingBreadData();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRemainingBreadData = async () => {
    try {
      // Load all remaining bread records (cumulative across all shifts/days)
      const { data: remainingData } = await supabase
        .from('remaining_bread')
        .select('*')
        .eq('recorded_by', userId);

      if (remainingData && remainingData.length > 0) {
        setQuickRemainingItems(prevItems => 
          prevItems.map(item => {
            // Sum up all remaining bread for this type across all records
            const totalRemaining = remainingData
              .filter(r => (r as any).bread_type_id === item.breadType.id)
              .reduce((sum, r) => sum + ((r as any).quantity || 0), 0);
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
    
    // Only update local state - no database operations
    setItems(items.map(item => 
      item.breadType.id === breadTypeId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ));
  };



  const handleAddNewSale = async (breadType: BreadType, quantity: number) => {
    try {
      // Check for existing record for this bread type in current shift today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { data: existingRecords } = await supabase
        .from('sales_logs')
        .select('*')
        .eq('bread_type_id', breadType.id)
        .eq('shift', currentShift)
        .eq('recorded_by', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingRecords && existingRecords.length > 0) {
        // Update existing record - add to existing quantity
        const existingRecord = existingRecords[0];
        const { error: updateError } = await supabase
          .from('sales_logs')
          .update({
            quantity: existingRecord.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (updateError) {
          console.error('Error updating sale:', updateError);
          throw updateError;
        }
        
        // Update local state to reflect the change
        setSalesLogs(prev => 
          prev.map(log => 
            log.id === existingRecord.id 
              ? { ...log, quantity: log.quantity + quantity }
              : log
          )
        );
        
        toast.success(`Updated ${breadType.name} sales: ${existingRecord.quantity} + ${quantity} = ${existingRecord.quantity + quantity} units`);
      } else {
        // Create new record only if none exists using server action
        await createSalesLog({
          bread_type_id: breadType.id,
          quantity: quantity,
          unit_price: breadType.unit_price,
          shift: currentShift,
          recorded_by: userId
        });

        // Fetch updated sales logs after creation
        const { data: updatedSales } = await supabase
          .from('sales_logs')
          .select(`
            *,
            bread_types (
              id,
              name,
              unit_price
            )
          `)
          .eq('bread_type_id', breadType.id)
          .eq('shift', currentShift)
          .eq('recorded_by', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (updatedSales) {
          setSalesLogs(prev => [...updatedSales, ...prev.filter(log => log.bread_type_id !== breadType.id || log.created_at !== updatedSales[0].created_at)]);
        }
        
        toast.success(`Recorded ${quantity} units of ${breadType.name}`);
      }


    } catch (error: unknown) {
      console.error('Error recording sale:', error);
      
      // Handle specific database errors
      if (error instanceof Error && error.message?.includes('Duplicate sales record')) {
        toast.error('This sale was already recorded. Please check your entries.');
      } else {
        toast.error('Failed to record sale. Please try again.');
      }
    }
  };

  const handleSubmitReport = async () => {
    const salesToRecord = quickRecordItems.filter(item => item.quantity > 0);
    const remainingToRecord = quickRemainingItems.filter(item => item.quantity > 0);

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
        totalRemaining: totalRemainingMonetaryValue
      };

    setPendingReportData(reportData);

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
          
          // Update local state to reflect the change
          setSalesLogs(prev => 
            prev.map(log => 
              log.id === existingRecord.id 
                ? { ...log, quantity: item.quantity }
                : log
            )
          );
          
          toast.success(`Updated ${item.breadType.name} sales to ${item.quantity} units`);
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
          const { error: deleteError } = await supabase
            .from('remaining_bread')
            .delete()
            .eq('bread_type_id', breadType.id)
            .eq('recorded_by', userId);

          if (deleteError) {
            console.error('Error deleting remaining bread:', deleteError);
            // Don't throw error for deletion failures
          }
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
            const { error: updateError } = await supabase
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

            if (updateError) {
              console.error('Error updating remaining bread:', updateError);
              throw updateError;
            }
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('remaining_bread')
              .insert({
                shift: currentShift,
                bread_type: breadType.name,
                bread_type_id: breadType.id,
                quantity: quantity,
                unit_price: breadType.unit_price,
                recorded_by: userId
              });

            if (insertError) {
              console.error('Error inserting remaining bread:', insertError);
              throw insertError;
            }
          }
        }
      }

      // Add feedback to report data
      const finalReportData = {
        ...pendingReportData,
        feedback: feedback.trim() || null,
        shift: currentShift,
        timeOfSales: new Date().toLocaleTimeString(),
        userId: userId
      };

      // Show success toast first
      toast.success('Shift feedback submitted successfully!');

      // Close feedback modal immediately
      setShowFeedbackModal(false);

      // CRITICAL FIX: Don't call onSalesRecorded during final submit to prevent flash
      // onSalesRecorded(); // REMOVED THIS LINE - This was causing the flash!

      // Trigger final report modal immediately - no delays
      onReportComplete(finalReportData);

      // Reset states immediately
      setSubmitting(false);
      setFeedback('');

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

  if (!isOpen) return null;

  return (
    <>
      {/* Main Quick Record Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
        {/* Loading Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitting Report</h3>
                <p className="text-sm text-gray-600">Please wait while we process your shift report...</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-full w-full md:flex md:items-center md:justify-center md:p-4">
          <div className={`bg-white h-full w-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
            
            {/* Header */}
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 flex-shrink-0"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="bg-white/20 p-3 rounded-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FileText className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold">End Shift - Quick Record</h2>
                    <p className="text-blue-100 text-xs md:text-sm">
                      {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
                    </p>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-12 w-12 p-0 text-white hover:bg-white/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-white/20 backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50/30 to-yellow-50/30 pb-4">
              {loading ? (
                <motion.div 
                  className="flex flex-col items-center justify-center py-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="mt-6 text-gray-600 text-sm md:text-lg">Loading...</p>
                </motion.div>
              ) : (
                <motion.div 
                  className="p-4 md:p-6 space-y-6 md:space-y-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  
                  {/* Sales Log Display */}
                  <AnimatePresence>
                    {salesLogs.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/50 shadow-sm"
                      >
                        <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-green-800">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="bg-green-100 p-2 rounded-lg"
                          >
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          </motion.div>
                          <span className="text-sm md:text-xl">Recorded Sales</span>
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-4 bg-white/80 backdrop-blur-sm">
                          {salesLogs.map((log, index) => (
                            <motion.div 
                              key={log.id} 
                              className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-green-100/50 hover:shadow-md transition-all duration-200"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              <div>
                                <p className="font-medium text-sm md:text-base">{log.bread_types?.name || 'Unknown'}</p>
                                <p className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(log.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm md:text-base">{log.quantity} units</p>
                                <p className="text-xs md:text-sm text-gray-600">
                                  {formatCurrencyNGN(log.quantity * (log.unit_price || 0))}
                                </p>
                                {log.leftover && (
                                  <p className="text-xs text-yellow-600">
                                    Remaining: {log.leftover}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Record Additional Sales Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm"
                  >
                    <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="bg-blue-100 p-2 rounded-lg"
                      >
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </motion.div>
                      <span className="text-sm md:text-xl">Record Additional Sales</span>
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      {quickRecordItems.map((item, index) => (
                        <motion.div 
                          key={item.breadType.id} 
                          className="flex items-center justify-between p-4 border rounded-xl bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:bg-white"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm md:text-base">{item.breadType.name}</p>
                            <p className="text-xs md:text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1)}
                                className="h-10 w-10 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </motion.div>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-10 text-center border rounded-lg px-2 py-1 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm md:text-base"
                              placeholder="0"
                            />
                            <motion.div whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1)}
                                className="h-10 w-10 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Record Remaining Breads Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50 shadow-sm"
                  >
                    <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-amber-800">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="bg-amber-100 p-2 rounded-lg"
                      >
                        <Package className="h-5 w-5 text-amber-600" />
                      </motion.div>
                      <span className="text-sm md:text-xl">Record Remaining Breads</span>
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      {quickRemainingItems.map((item, index) => (
                        <motion.div 
                          key={item.breadType.id} 
                          className="flex items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-yellow-50/80 to-amber-50/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:from-yellow-100/80 hover:to-amber-100/80"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * index }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm md:text-base">{item.breadType.name}</p>
                            <p className="text-xs md:text-sm text-gray-600">Remaining quantity</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1, true)}
                                className="h-10 w-10 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </motion.div>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true)}
                              className="w-16 h-10 text-center border rounded-lg px-2 py-1 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm md:text-base"
                              placeholder="0"
                            />
                            <motion.div whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true)}
                                className="h-10 w-10 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Summary */}
                  <motion.div 
                    className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <h4 className="font-semibold mb-4 text-sm md:text-lg text-purple-800 flex items-center gap-2">
                      <motion.div 
                        className="w-2 h-2 bg-purple-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Sales to record:</span>
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs md:text-sm">
                              {quickRecordItems.filter(i => i.quantity > 0).length}
                            </Badge>
                          </motion.div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Total units:</span>
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs md:text-sm">
                              {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                            </Badge>
                          </motion.div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Remaining to record:</span>
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs md:text-sm">
                              {quickRemainingItems.filter(i => i.quantity > 0).length}
                            </Badge>
                          </motion.div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Total units:</span>
                          <motion.div whileHover={{ scale: 1.05 }}>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs md:text-sm">
                              {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                            </Badge>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <motion.div 
              className="p-4 md:p-6 bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-200/50 flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <div className="flex gap-3 md:gap-4">
                <motion.div 
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                    className="w-full py-3 md:py-4 rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-sm md:text-lg font-semibold bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm hover:shadow-md"
                  >
                    <span className="text-sm md:text-base font-semibold">Cancel</span>
                  </Button>
                </motion.div>
                <motion.div 
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleSubmitReport}
                    disabled={submitting || !shouldEnableSubmit}
                    className="w-full py-3 md:py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <motion.div 
                          className="rounded-full h-4 md:h-5 w-4 md:w-5 border-2 border-white border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-sm md:text-base font-semibold">Processing...</span>
                      </div>
                    ) : (
                      <span className="text-sm md:text-base font-semibold">Submit Report</span>
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmationModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <motion.div 
                    className="bg-yellow-100 p-3 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </motion.div>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-center mb-2">No Remaining Bread</h3>
                <p className="text-gray-600 text-center mb-6 text-sm md:text-base">
                  You haven't recorded any remaining bread. Do you want to proceed with the report anyway?
                </p>
                <div className="flex gap-4">
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmationModal(false)}
                      className="w-full text-sm md:text-base font-semibold"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleConfirmProceed}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm md:text-base font-semibold"
                    >
                      Proceed
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <motion.div 
                    className="bg-blue-100 p-3 rounded-full"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Send className="h-8 w-8 text-blue-600" />
                  </motion.div>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-center mb-2">Shift Feedback</h3>
                <p className="text-gray-600 text-center mb-6 text-sm md:text-base">
                  Share any feedback about this shift (optional)
                </p>
                <motion.textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="If there&apos;s no feedback, you can proceed to report..."
                  className="w-full h-32 p-3 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm md:text-base"
                  whileFocus={{ scale: 1.02 }}
                />
                <div className="flex gap-4 mt-6">
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      onClick={() => setShowFeedbackModal(false)}
                      className="w-full text-sm md:text-base font-semibold"
                    >
                      Back
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleSubmitWithFeedback}
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <motion.div 
                            className="rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span className="text-sm md:text-base font-semibold">Submitting...</span>
                        </div>
                      ) : (
                        <span className="text-sm md:text-base font-semibold">Submit Report</span>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
