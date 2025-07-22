'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, TrendingUp, Package, Check, FileText, Clock, AlertTriangle, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { toast } from 'sonner';

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
  onReportComplete: (reportData: any) => void;
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
  const [pendingReportData, setPendingReportData] = useState<any>(null);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

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

      // Fetch today's sales logs
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

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

  const updateQuickRecordQuantity = async (breadTypeId: string, quantity: number, isRemaining: boolean = false) => {
    const items = isRemaining ? quickRemainingItems : quickRecordItems;
    const setItems = isRemaining ? setQuickRemainingItems : setQuickRecordItems;
    
    // Set loading state for this specific item
    setLoadingItems(prev => new Set(prev).add(breadTypeId));
    
    setItems(items.map(item => 
      item.breadType.id === breadTypeId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ));

    // If this is a remaining bread update and quantity is 0, delete from Supabase
    if (isRemaining && quantity === 0) {
      await handleDeleteRemainingBread(breadTypeId);
    }
    
    // Clear loading state after a short delay to show the update
    setTimeout(() => {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(breadTypeId);
        return newSet;
      });
    }, 300);
  };

  const handleDeleteRemainingBread = async (breadTypeId: string) => {
    try {
      // Show loading state for the specific item
      const { error } = await supabase
        .from('remaining_bread')
        .delete()
        .eq('bread_type_id', breadTypeId)
        .eq('recorded_by', userId);

      if (error) {
        console.error('Error deleting remaining bread:', error);
        toast.error('Failed to remove remaining bread item');
      } else {
        // Show success toast for the specific action
        toast.success('Remaining bread item removed successfully');
        // Don't call onRemainingUpdated() here to prevent page reload
        // The UI will be updated locally through the state change
      }
    } catch (error) {
      console.error('Error deleting remaining bread:', error);
      toast.error('Failed to remove remaining bread item');
    }
  };

  const handleAddNewSale = async (breadType: BreadType, quantity: number) => {
    try {
      const { data: salesData, error } = await supabase
        .from('sales_logs')
        .insert({
          bread_type_id: breadType.id,
          quantity: quantity,
          unit_price: breadType.unit_price,
          shift: currentShift,
          recorded_by: userId
        })
        .select('*');

      if (error) {
        console.error('Error recording sale:', error);
        throw error;
      }

      if (salesData) {
        setSalesLogs(salesData);
      }

      // Don't call onSalesRecorded() during final submit to prevent page refresh
      // This prevents the flash when transitioning to FinalReportModal
      if (!submitting) {
      onSalesRecorded();
      }
      toast.success('Record saved successfully!');
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Failed to record sale');
    }
  };

  const handleSubmitReport = async () => {
    const salesToRecord = quickRecordItems.filter(item => item.quantity > 0);
    const remainingToRecord = quickRemainingItems.filter(item => item.quantity > 0);

      // Calculate monetary values for remaining bread
      const totalRemainingMonetaryValue = remainingToRecord.reduce((sum: number, item) => {
        return sum + (item.quantity * item.breadType.unit_price);
      }, 0);

      // Generate report data
      const reportData = {
        salesRecords: [
          ...salesLogs.filter(log => log.quantity > 0).map(log => ({
            breadType: log.bread_types?.name || 'Unknown',
            quantity: log.quantity,
            unitPrice: log.unit_price || 0,
            totalAmount: log.quantity * (log.unit_price || 0),
            timestamp: log.created_at
          })),
          ...salesToRecord.map(item => ({
            breadType: item.breadType.name,
            quantity: item.quantity,
            unitPrice: item.breadType.unit_price,
            totalAmount: item.quantity * item.breadType.unit_price,
            timestamp: new Date().toISOString()
          }))
        ],
        remainingBreads: remainingToRecord.map(item => ({
          breadType: item.breadType.name,
          quantity: item.quantity,
          unitPrice: item.breadType.unit_price,
          totalAmount: item.quantity * item.breadType.unit_price
        })),
        totalRevenue: [
          ...salesLogs.filter(log => log.quantity > 0),
          ...salesToRecord.map(item => ({ quantity: item.quantity, unit_price: item.breadType.unit_price }))
        ].reduce((sum: number, item: any) => sum + (item.quantity * (item.unit_price || 0)), 0),
        totalItemsSold: [
          ...salesLogs.filter(log => log.quantity > 0),
          ...salesToRecord
        ].reduce((sum: number, item: any) => sum + item.quantity, 0),
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
      
      // Record sales
      for (const item of salesToRecord) {
        await handleAddNewSale(item.breadType, item.quantity);
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

      // Remove shift_feedback insert logic
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
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">End Shift - Quick Record</h2>
                    <p className="text-blue-100 text-sm">
                      {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-6 text-gray-600 text-lg">Loading...</p>
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  
                  {/* Sales Log Display */}
                  {salesLogs.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recorded Sales
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                        {salesLogs.map((log) => (
                          <div key={log.id} className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                            <div>
                              <p className="font-medium">{log.bread_types?.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(log.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{log.quantity} units</p>
                              <p className="text-sm text-gray-600">
                                {formatCurrencyNGN(log.quantity * (log.unit_price || 0))}
                              </p>
                              {log.leftover && (
                                <p className="text-xs text-yellow-600">
                                  Remaining: {log.leftover}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Record Sales Section */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Record Additional Sales
                    </h3>
                    <div className="space-y-4">
                      {quickRecordItems.map((item) => (
                        <div key={item.breadType.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <p className="font-medium">{item.breadType.name}</p>
                            <p className="text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                              disabled={loadingItems.has(item.breadType.id)}
                            >
                              {loadingItems.has(item.breadType.id) ? (
                                <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />
                              ) : (
                              <Minus className="h-4 w-4" />
                              )}
                            </Button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center border rounded px-2 py-1 text-center font-semibold"
                              placeholder="0"
                              disabled={loadingItems.has(item.breadType.id)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                              disabled={loadingItems.has(item.breadType.id)}
                            >
                              {loadingItems.has(item.breadType.id) ? (
                                <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />
                              ) : (
                              <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Record Remaining Breads Section */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Record Remaining Breads
                    </h3>
                    <div className="space-y-4">
                      {quickRemainingItems.map((item) => (
                        <div key={item.breadType.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <p className="font-medium">{item.breadType.name}</p>
                            <p className="text-sm text-gray-600">Remaining quantity</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity - 1, true)}
                              className="h-8 w-8 p-0"
                              disabled={loadingItems.has(item.breadType.id)}
                            >
                              {loadingItems.has(item.breadType.id) ? (
                                <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />
                              ) : (
                              <Minus className="h-4 w-4" />
                              )}
                            </Button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true)}
                              className="w-16 text-center border rounded px-2 py-1 text-center font-semibold"
                              placeholder="0"
                              disabled={loadingItems.has(item.breadType.id)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true)}
                              className="h-8 w-8 p-0"
                              disabled={loadingItems.has(item.breadType.id)}
                            >
                              {loadingItems.has(item.breadType.id) ? (
                                <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />
                              ) : (
                              <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border">
                    <h4 className="font-semibold mb-3 text-lg">Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sales to record:</span>
                          <Badge variant="secondary">{quickRecordItems.filter(i => i.quantity > 0).length}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total units:</span>
                          <Badge variant="secondary">{quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Remaining to record:</span>
                          <Badge variant="secondary">{quickRemainingItems.filter(i => i.quantity > 0).length}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total units:</span>
                          <Badge variant="secondary">{quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t flex-shrink-0">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-lg font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  disabled={submitting || !shouldEnableSubmit}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg font-medium"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">No Remaining Bread</h3>
              <p className="text-gray-600 text-center mb-6">
                You haven't recorded any remaining bread. Do you want to proceed with the report anyway?
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmProceed}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Send className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Shift Feedback</h3>
              <p className="text-gray-600 text-center mb-6">
                Share any feedback about this shift (optional)
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="If there's no feedback, you can proceed to report..."
                className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitWithFeedback}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
