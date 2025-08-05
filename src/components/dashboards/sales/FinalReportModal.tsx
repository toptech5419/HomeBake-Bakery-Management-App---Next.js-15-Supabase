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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg transition-all duration-300 animate-modal-backdrop ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Enhanced Loading Overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-20">
          <div className="bg-card rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 border border-border/20 animate-modal-content">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent animate-pulse"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-display font-bold text-foreground mb-3">Saving Your Report</h3>
              <p className="text-muted-foreground">Please wait while we securely save your shift report...</p>
              <div className="mt-4 flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className={`bg-white rounded-xl shadow-2xl w-[98%] max-w-sm max-h-[95vh] flex flex-col transition-all duration-300 border border-gray-200 ${
          isClosing ? 'scale-95 opacity-0 translate-y-2' : 'scale-100 opacity-100 translate-y-0'
        } ${isSaving ? 'pointer-events-none opacity-50' : ''}`}
      >
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 flex-shrink-0 rounded-t-xl">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 text-white w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Close report"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="pr-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 bg-white/20 rounded-md">
                <span className="text-sm">📊</span>
              </div>
              <h1 className="text-base font-bold">
                {viewOnly ? 'Report' : 'Final Report'}
              </h1>
            </div>
            <div className="text-xs text-white/90">
              {reportData.shift || currentShift} • {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {/* Compact Save Status */}
          {!viewOnly && saveStatus !== 'idle' && (
          <div className="mt-2">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1 text-xs bg-white/20 rounded-md px-2 py-1">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-white/90">Saving...</span>
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="flex items-center gap-1 text-xs bg-green-500/20 rounded-md px-2 py-1">
                <span className="text-green-200">✓ Saved!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1 text-xs bg-red-500/20 rounded-md px-2 py-1">
                <span className="text-red-200">✗ Failed</span>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Compact Summary Cards */}
          <div className="space-y-2">
            {/* Revenue Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs">💰</span>
                  </div>
                  <span className="text-xs font-semibold text-green-700">Total Revenue</span>
                </div>
                <div className="text-lg font-bold text-green-800">
                  {formatCurrencyNGN(reportData.totalRevenue)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Items Sold */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xs">📦</span>
                    <span className="text-xs font-semibold text-blue-700">Sold</span>
                  </div>
                  <div className="text-lg font-bold text-blue-800">
                    {reportData.totalItemsSold}
                  </div>
                </div>
              </div>
              
              {/* Remaining */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-xs">🍞</span>
                    <span className="text-xs font-semibold text-amber-700">Left</span>
                  </div>
                  <div className="text-lg font-bold text-amber-800">
                    {formatCurrencyNGN(reportData.totalRemaining)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Records */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              <h3 className="text-sm font-bold text-gray-900">Sales ({reportData.salesRecords.length})</h3>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200">
              {reportData.salesRecords.map((sale, index) => (
                <div key={index} className="flex justify-between items-center p-2.5 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{sale.breadType}</div>
                    <div className="text-xs text-gray-500">{sale.quantity} units • {new Date(sale.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-sm font-bold text-green-600">{formatCurrencyNGN(sale.totalAmount)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Remaining Inventory */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <h3 className="text-sm font-bold text-gray-900">Remaining</h3>
            </div>
            
            {(() => {
              const filteredBreads = reportData.remainingBreads.filter(bread => bread.quantity > 0);
              if (filteredBreads.length > 0) {
                return (
                  <div className="bg-amber-50 rounded-lg border border-amber-200">
                    {filteredBreads.map((bread, index) => (
                      <div key={index} className="flex justify-between items-center p-2.5 border-b border-amber-100 last:border-b-0">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{bread.breadType}</div>
                          <div className="text-xs text-amber-600">{bread.quantity} left</div>
                        </div>
                        <div className="text-sm font-bold text-amber-700">
                          {formatCurrencyNGN(bread.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
                    <div className="text-green-600 text-sm font-medium">✅ All sold!</div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Shift Feedback */}
          {(shiftFeedback || reportData.feedback) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Feedback</h3>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                {loadingFeedback ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-xs text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
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
        
        {/* Bottom Actions */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 space-y-3">
          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={downloadCSV}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 bg-white rounded-lg text-gray-700 font-medium text-sm hover:border-green-500 hover:text-green-600 transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              CSV
            </button>
            <button
              onClick={downloadPDF}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 bg-white rounded-lg text-gray-700 font-medium text-sm hover:border-green-500 hover:text-green-600 transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
              </svg>
              PDF
            </button>
          </div>

          {/* Share Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-900">Share Report</span>
              <div className="h-px bg-gray-200 flex-1 ml-3"></div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => shareToSocial('whatsapp')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </button>
              <button
                onClick={() => shareToSocial('email')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span className="text-sm font-medium">Email</span>
              </button>
            </div>

          
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            Close Report
          </button>
          </div>
        </div>

        {/* Issues Badge - Only show if there are issues */}
        {reportData.totalRemaining > 1000 && (
          <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
            ⚠️ {reportData.totalRemaining > 2000 ? 'High' : 'Alert'}
          </div>
        )}
      </div>
    </div>
  );
}
