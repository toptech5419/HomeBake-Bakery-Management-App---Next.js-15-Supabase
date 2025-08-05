'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Download, Share2, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [, setReportAction] = useState<'created' | 'updated' | null>(null);
  const [shiftFeedback, setShiftFeedback] = useState<ShiftFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
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
    setShowShareMenu(false);
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
  }, [isOpen, reportData, viewOnly, handleSaveReport, handleClose, fetchShiftFeedback]);

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
    toast.info('PDF download feature coming soon!');
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
    setShowShareMenu(false);
  }, [reportData, currentShift]);

  // Early return if modal is not open or no report data
  if (!isOpen || !reportData) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Enhanced Loading Overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 mx-4 max-w-xs w-full">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-orange-200 border-t-orange-500"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Saving Report</h3>
              <p className="text-sm text-gray-600">Please wait...</p>
              <div className="mt-3 flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile-First Modal Container */}
      <div className="flex items-end justify-center min-h-screen p-2 sm:items-center">
        <div 
          className={`bg-white w-full max-w-md max-h-[95vh] flex flex-col transition-all duration-300 shadow-2xl ${
            isClosing 
              ? 'scale-95 opacity-0 translate-y-4 sm:translate-y-2' 
              : 'scale-100 opacity-100 translate-y-0'
          } ${isSaving ? 'pointer-events-none opacity-50' : ''} rounded-t-2xl sm:rounded-2xl`}
        >
          {/* Mobile-Optimized Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex-shrink-0 rounded-t-2xl relative">
            {/* Close Button - Always Visible */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              aria-label="Close report"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="pr-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight">
                    {viewOnly ? 'Shift Report' : 'Final Report'}
                  </h1>
                  <div className="text-sm text-white/90 capitalize">
                    {reportData.shift || currentShift} Shift • {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Save Status - More Prominent */}
              {!viewOnly && saveStatus !== 'idle' && (
                <div className="mt-3">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center gap-2 text-sm bg-white/20 rounded-lg px-3 py-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span className="text-white font-medium">Saving report...</span>
                    </div>
                  )}
                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-sm bg-green-500/30 rounded-lg px-3 py-2">
                      <span className="text-green-100 font-medium">✓ Report saved successfully!</span>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-sm bg-red-500/30 rounded-lg px-3 py-2">
                      <span className="text-red-100 font-medium">✗ Failed to save report</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Summary Cards - Mobile Optimized */}
            <div className="space-y-3">
              {/* Revenue Card - Hero Style */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 shadow-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">💰</span>
                    </div>
                    <span className="text-sm font-bold text-green-700">Total Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrencyNGN(reportData.totalRevenue)}
                  </div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Items Sold */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-base">📦</span>
                  </div>
                  <div className="text-xl font-bold text-blue-800 mb-1">
                    {reportData.totalItemsSold}
                  </div>
                  <div className="text-xs font-semibold text-blue-600">Items Sold</div>
                </div>
                
                {/* Remaining Value */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-base">🍞</span>
                  </div>
                  <div className="text-lg font-bold text-amber-800 mb-1">
                    {formatCurrencyNGN(reportData.totalRemaining)}
                  </div>
                  <div className="text-xs font-semibold text-amber-600">Remaining</div>
                </div>
              </div>
            </div>

            {/* Sales Records */}
            {reportData.salesRecords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs">💳</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Sales ({reportData.salesRecords.length})</h3>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {reportData.salesRecords.map((sale, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">{sale.breadType}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {sale.quantity} units • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-600 ml-3">
                        {formatCurrencyNGN(sale.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Inventory */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-xs">📋</span>
                </div>
                <h3 className="text-base font-bold text-gray-900">Remaining Stock</h3>
              </div>
              
              {(() => {
                const filteredBreads = reportData.remainingBreads.filter(bread => bread.quantity > 0);
                if (filteredBreads.length > 0) {
                  return (
                    <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                      {filteredBreads.map((bread, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border-b border-amber-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">{bread.breadType}</div>
                            <div className="text-xs text-amber-600 mt-1">{bread.quantity} left</div>
                          </div>
                          <div className="text-sm font-bold text-amber-700 ml-3">
                            {formatCurrencyNGN(bread.totalAmount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
                      <div className="text-green-600 text-sm font-medium">✅ All items sold out!</div>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Shift Feedback */}
            {(shiftFeedback || reportData.feedback) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <h3 className="text-base font-bold text-gray-900">Feedback</h3>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  {loadingFeedback ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="ml-2 text-xs text-gray-600">Loading...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">
                          {user?.name || user?.email || 'Sales Rep'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {shiftFeedback?.created_at 
                            ? new Date(shiftFeedback.created_at).toLocaleTimeString()
                            : new Date().toLocaleTimeString()
                          }
                        </span>
                      </div>
                      <div className="text-sm text-gray-800">
                        {shiftFeedback?.note || reportData.feedback || 'No feedback provided'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Actions - Mobile Optimized */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 space-y-3">
            {/* Share & Download Button with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Share & Export</span>
                {showShareMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Dropdown Menu */}
              {showShareMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-10">
                  <div className="p-2">
                    {/* Download Options */}
                    <div className="space-y-1">
                      <button
                        onClick={downloadCSV}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4 text-green-600" />
                        <span>Download CSV</span>
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4 text-red-600" />
                        <span>Download PDF</span>
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => shareToSocial('whatsapp')}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">W</span>
                        </div>
                        <span>Share to WhatsApp</span>
                      </button>
                      <button
                        onClick={() => shareToSocial('email')}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">@</span>
                        </div>
                        <span>Share via Email</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              Close Report
            </button>
          </div>

          {/* Alert Badge - Only show if there are high remaining amounts */}
          {reportData.totalRemaining > 1000 && (
            <div className="absolute top-16 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
              ⚠️ {reportData.totalRemaining > 2000 ? 'High Stock' : 'Stock Alert'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}