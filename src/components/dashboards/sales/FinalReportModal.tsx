'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useShift } from '@/contexts/ShiftContext';
import { createShiftReport } from '@/lib/reports/actions';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

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
  shift?: string;
  feedback?: string;
  userId?: string;
}

interface ShiftFeedback {
  id: string;
  user_id: string;
  shift: 'morning' | 'night';
  note: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
    role: string;
  };
}

interface FinalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  viewOnly?: boolean; // When true, disable save functionality and show as read-only
}

export function FinalReportModal({ isOpen, onClose, reportData, viewOnly = false }: FinalReportModalProps) {
  const { currentShift } = useShift();
  const { user } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [reportAction, setReportAction] = useState<'created' | 'updated' | null>(null);
  const [shiftFeedback, setShiftFeedback] = useState<ShiftFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  // Use refs to track state across re-renders without causing re-renders
  const hasSavedRef = useRef(false);

  // Fetch shift feedback when modal opens
  const fetchShiftFeedback = useCallback(async () => {
    // Use user.id if reportData?.userId is missing
    const userId = reportData?.userId || user?.id;
    if (!userId || !reportData?.shift) return;
    
    setLoadingFeedback(true);
    try {
      const { data, error } = await supabase
        .from('shift_feedback')
        .select('*') // Remove users join
        .eq('user_id', userId)
        .eq('shift', reportData.shift as 'morning' | 'night')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching shift feedback:', error);
      } else if (data) {
        setShiftFeedback(data);
      }
    } catch (error) {
      console.error('Error fetching shift feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  }, [reportData?.userId, reportData?.shift, user?.id]);

  // Memoized save function to prevent unnecessary re-creations
  const handleSaveReport = useCallback(async () => {
    // Always use user.id if reportData.userId is missing
    const userId = reportData?.userId || user?.id;
    if (!userId) {
      toast.error('User not authenticated. Please log in again.');
      setSaveStatus('error');
      return;
    }
    console.log('🔄 handleSaveReport called');
    console.log('📊 reportData:', reportData);
    
    if (!reportData) {
      console.error('❌ Missing report data');
      setSaveStatus('error');
      toast.error('Missing report data. Please try again.');
      return;
    }

    // Prevent multiple saves for the same report instance
    if (hasSavedRef.current) {
      console.log('⚠️ Report already saved, skipping duplicate save');
      return;
    }

    console.log('💾 Starting save process...');
    setIsSaving(true);
    setSaveStatus('saving');
    hasSavedRef.current = true;

    try {
      console.log('📤 Calling createShiftReport with data:', {
        user_id: userId,
        shift: reportData.shift || currentShift,
        total_revenue: reportData.totalRevenue,
        total_items_sold: reportData.totalItemsSold,
        total_remaining: reportData.totalRemaining,
        feedback: reportData.feedback,
        sales_data_length: reportData.salesRecords?.length || 0,
        remaining_breads_length: reportData.remainingBreads?.length || 0
      });
      
      // Call server action without timeout - let it complete naturally
      const result = await createShiftReport({
        user_id: userId,
        shift: (reportData.shift || currentShift) as 'morning' | 'night',
        total_revenue: reportData.totalRevenue,
        total_items_sold: reportData.totalItemsSold,
        total_remaining: reportData.totalRemaining,
        feedback: reportData.feedback || null,
        sales_data: reportData.salesRecords,
        remaining_breads: reportData.remainingBreads,
      });

      console.log('📥 createShiftReport result:', result);

      if (result.success) {
        setSaveStatus('success');
        
        // Show appropriate message based on whether it was created or updated
        if (result.wasUpdated) {
          setReportAction('updated');
          toast.success(result.message || 'Existing shift report updated successfully!');
          console.log('✅ Existing shift report updated successfully');
        } else {
          setReportAction('created');
          toast.success(result.message || 'New shift report created successfully!');
          console.log('✅ New shift report created successfully');
        }
      } else {
        setSaveStatus('error');
        
        // Handle specific error cases
        if (result.code === 'DUPLICATE_REPORT') {
          toast.error('A report already exists for this shift. The system will update the existing report.');
        } else {
          toast.error(`Failed to save report: ${result.error}`);
        }
        console.error('❌ Failed to save shift report:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving shift report:', error);
      setSaveStatus('error');
      toast.error(`Failed to save shift report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('🏁 Save process completed');
      setIsSaving(false);
    }
  }, [reportData, currentShift, user?.id]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSaveStatus('idle');
      setReportAction(null);
      setShiftFeedback(null);
      hasSavedRef.current = false; // Reset for next time
    }, 300);
  }, [onClose]);

  // Handle modal open/close and auto-save logic
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Auto-save report when modal opens (only if not in viewOnly mode)
      if (reportData && !hasSavedRef.current && !viewOnly) {
        handleSaveReport();
      }

      // Fetch shift feedback when modal opens
      fetchShiftFeedback();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, reportData, handleSaveReport, handleClose, fetchShiftFeedback]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Memoized download functions
  const downloadCSV = useCallback(() => {
    if (!reportData) return;
    
    const csvContent = [
      ['Shift Report', reportData.shift || currentShift, new Date().toLocaleDateString()],
      [''],
      ['Sales Records'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Amount', 'Time'],
      ...reportData.salesRecords.map(record => [
        record.breadType,
        record.quantity,
        record.unitPrice,
        record.totalAmount,
        new Date(record.timestamp).toLocaleTimeString()
      ]),
      [''],
      ['Remaining Breads'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Value'],
      ...reportData.remainingBreads.map(item => [item.breadType, item.quantity, item.unitPrice, item.totalAmount]),
      [''],
      ['Summary'],
      ['Total Revenue', reportData.totalRevenue],
      ['Total Items Sold', reportData.totalItemsSold],
      ['Total Remaining', reportData.totalRemaining]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-report-${reportData.shift || currentShift}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [reportData, currentShift]);

  const downloadPDF = useCallback(() => {
    alert('PDF download feature coming soon!');
  }, []);

  const shareToSocial = useCallback((platform: string) => {
    if (!reportData) return;

    const text = `🍞 Shift Report - ${reportData.shift || currentShift}
💰 Revenue: ${formatCurrencyNGN(reportData.totalRevenue)}
📦 Items Sold: ${reportData.totalItemsSold}
🥖 Remaining: ${formatCurrencyNGN(reportData.totalRemaining)}`;

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=Shift Report - ${reportData.shift || currentShift}&body=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
    }
  }, [reportData, currentShift]);

  // Early return if modal is not open or no report data
  if (!isOpen || !reportData) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Loading Overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Saving Report</h3>
              <p className="text-sm text-gray-600">Please wait while we save your shift report...</p>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-[95%] max-w-md max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        } ${isSaving ? 'pointer-events-none opacity-50' : ''}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 md:p-5 sticky top-0 z-10">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
            aria-label="Close report"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold mb-1 pr-8">
            {viewOnly ? 'Shift Report' : 'Final Shift Report'}
          </h1>
          <div className="text-xs md:text-sm opacity-90 font-medium">
            {reportData.shift || currentShift} Shift - {viewOnly ? 'Viewing' : 'Completed'} • {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </div>
          
          {/* Save Status Indicator - Only show when not in viewOnly mode */}
          {!viewOnly && (
          <div className="mt-2 flex items-center gap-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving report...</span>
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-xs text-green-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span>
                  {reportAction === 'updated' ? 'Report updated successfully!' : 'Report created successfully!'}
                </span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-red-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <span>Failed to save report</span>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 md:p-5 text-center border border-green-100">
              <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 md:mb-2">Total Revenue</h3>
              <div className="text-2xl md:text-3xl font-extrabold text-green-600">
                {formatCurrencyNGN(reportData.totalRevenue)}
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 md:p-5 text-center border border-blue-100">
              <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 md:mb-2">Items Sold</h3>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                {reportData.totalItemsSold}
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 md:p-5 text-center border border-amber-100">
              <h3 className="text-xs md:text-sm font-semibold text-gray-600 mb-1 md:mb-2">Remaining</h3>
              <div className="text-2xl md:text-3xl font-extrabold text-amber-600">
                {formatCurrencyNGN(reportData.totalRemaining)}
              </div>
            </div>
          </div>

          {/* Sales Records */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Sales Records ({reportData.salesRecords.length})</h3>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              {reportData.salesRecords.map((sale, index) => (
                <div key={index} className="flex justify-between items-center py-2 md:py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex flex-col">
                    <div className="text-sm md:text-base font-semibold text-gray-900">{sale.breadType}</div>
                    <div className="text-xs text-gray-500">{new Date(sale.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-xs md:text-sm text-gray-600">{sale.quantity} units</div>
                    <div className="text-sm md:text-base font-bold text-green-600">{formatCurrencyNGN(sale.totalAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remaining Breads */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <h3 className="text-base md:text-lg font-bold text-gray-900">Remaining Breads</h3>
            </div>
            
            {/* Filter remaining breads with quantity > 0 */}
            {(() => {
              const filteredBreads = reportData.remainingBreads.filter(bread => bread.quantity > 0);
              if (filteredBreads.length > 0) {
                return (
                  <div className="space-y-2 md:space-y-3">
                    {filteredBreads.map((bread, index) => (
                      <div key={index} className="flex justify-between items-center py-2 md:py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex flex-col">
                          <div className="text-sm md:text-base font-semibold text-gray-900">{bread.breadType}</div>
                          <div className="text-xs text-gray-500">{bread.quantity} units remaining</div>
                        </div>
                        <div className="text-sm md:text-base font-bold text-amber-600">
                          {formatCurrencyNGN(bread.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500 text-sm md:text-base">
                    <span className="mb-2">No remaining breads recorded for this shift.</span>
                  </div>
                );
              }
            })()}
          </div>

          {/* Shift Feedback */}
          {(shiftFeedback || reportData.feedback) && (
            <div className="mb-4 md:mb-6">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Shift Feedback</h3>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 md:p-5 border border-blue-100">
                {loadingFeedback ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading feedback...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {user?.email || 'Sales Representative'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {shiftFeedback?.created_at 
                          ? new Date(shiftFeedback.created_at).toLocaleTimeString()
                          : new Date().toLocaleTimeString()
                        }
                      </span>
                    </div>
                    <div className="text-sm md:text-base text-gray-800 leading-relaxed">
                      {shiftFeedback?.note || reportData.feedback || 'No feedback provided'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-5">
              <button
                onClick={downloadCSV}
                disabled={isSaving}
                className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 px-2 md:px-4 border-2 border-gray-200 bg-white rounded-lg md:rounded-xl text-gray-700 font-semibold text-xs md:text-sm hover:border-green-500 hover:text-green-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={downloadPDF}
                disabled={isSaving}
                className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 px-2 md:px-4 border-2 border-gray-200 bg-white rounded-lg md:rounded-xl text-gray-700 font-semibold text-xs md:text-sm hover:border-green-500 hover:text-green-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>

            <h3 className="text-sm md:text-base font-bold text-gray-900 mb-3 md:mb-4">Share to Social Media</h3>
            <div className="grid grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
              <button
                onClick={() => shareToSocial('twitter')}
                disabled={isSaving}
                className="flex flex-col items-center gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded-lg md:rounded-xl hover:bg-blue-50 hover:text-blue-500 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="text-[10px] md:text-xs font-semibold">Twitter</span>
              </button>
              <button
                onClick={() => shareToSocial('facebook')}
                disabled={isSaving}
                className="flex flex-col items-center gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded-lg md:rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-[10px] md:text-xs font-semibold">Facebook</span>
              </button>
              <button
                onClick={() => shareToSocial('email')}
                disabled={isSaving}
                className="flex flex-col items-center gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded-lg md:rounded-xl hover:bg-orange-50 hover:text-orange-500 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span className="text-[10px] md:text-xs font-semibold">Email</span>
              </button>
              <button
                onClick={() => shareToSocial('whatsapp')}
                disabled={isSaving}
                className="flex flex-col items-center gap-1 md:gap-2 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded-lg md:rounded-xl hover:bg-green-50 hover:text-green-500 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.520-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span className="text-[10px] md:text-xs font-semibold">WhatsApp</span>
              </button>
            </div>

            <button
              onClick={handleClose}
              disabled={isSaving}
              className="w-full py-3 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close Report
            </button>
          </div>
        </div>

        {/* Issues Badge - Only show if there are issues */}
        {reportData.totalRemaining > 1000 && (
          <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 bg-red-500 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-semibold">
            {reportData.totalRemaining > 2000 ? '3 Issues' : '2 Issues'}
          </div>
        )}
      </div>
    </div>
  );
}
