'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MessageSquare, Download, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useShift } from '@/contexts/ShiftContext';
import { createShiftReport } from '@/lib/reports/actions';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getNavigationHistory } from '@/lib/utils/navigation-history';

interface FinalReportClientProps {
  userId: string;
  userName: string;
}

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

export function FinalReportClient({ userName }: FinalReportClientProps) {
  const { currentShift } = useShift();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [shiftFeedback, setShiftFeedback] = useState<ShiftFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Load report data from URL params
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        setReportData(decodedData);
      } catch (error) {
        console.error('Error parsing report data:', error);
        toast.error('Invalid report data');
        router.back();
      }
    } else {
      toast.error('No report data found');
      router.back();
    }
  }, [searchParams, router]);

  // Fetch shift feedback when component loads
  const fetchShiftFeedback = useCallback(async () => {
    const effectiveUserId = reportData?.userId || user?.id;
    if (!effectiveUserId || !reportData?.shift) return;
    
    setLoadingFeedback(true);
    try {
      const { data, error } = await supabase
        .from('shift_feedback')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('shift', reportData.shift as 'morning' | 'night')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
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

  // Save report function
  const handleSaveReport = useCallback(async () => {
    const effectiveUserId = reportData?.userId || user?.id;
    if (!effectiveUserId || !reportData || hasSaved) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    setHasSaved(true);

    try {
      const result = await createShiftReport({
        user_id: effectiveUserId,
        shift: (reportData.shift || currentShift) as 'morning' | 'night',
        total_revenue: reportData.totalRevenue,
        total_items_sold: reportData.totalItemsSold,
        total_remaining: reportData.totalRemaining,
        feedback: reportData.feedback || null,
        sales_data: reportData.salesRecords,
        remaining_breads: reportData.remainingBreads,
      });

      if (result.success) {
        setSaveStatus('success');
        
        if (result.wasUpdated) {
          toast.success(result.message || 'Existing shift report updated successfully!');
        } else {
          toast.success(result.message || 'New shift report created successfully!');
        }
      } else {
        setSaveStatus('error');
        
        if (result.code === 'DUPLICATE_REPORT') {
          toast.error('A report already exists for this shift. The system will update the existing report.');
        } else {
          toast.error(`Failed to save report: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error saving shift report:', error);
      setSaveStatus('error');
      toast.error(`Failed to save shift report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [reportData, currentShift, user?.id, hasSaved]);

  // Auto-save when data is loaded
  useEffect(() => {
    if (reportData && !hasSaved) {
      handleSaveReport();
      fetchShiftFeedback();
    }
  }, [reportData, hasSaved, handleSaveReport, fetchShiftFeedback]);

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

  // Smart back navigation using history
  const handleBackNavigation = useCallback(() => {
    const historyPath = getNavigationHistory(user?.user_metadata?.role || 'sales_rep');
    console.log('Final Report back navigation:', { historyPath, userRole: user?.user_metadata?.role });
    router.push(historyPath);
  }, [router, user]);

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-3 rounded-xl">
              <span className="text-lg">📊</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Final Report</h1>
              <div className="text-sm text-white/90 capitalize">
                {reportData.shift || currentShift} Shift • {new Date().toLocaleDateString()} • {userName}
              </div>
            </div>
          </div>
          
          {/* Save Status */}
          {saveStatus !== 'idle' && (
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

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          
          {/* Summary Cards */}
          <div className="space-y-4">
            {/* Revenue Card - Hero Style */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">💰</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">Total Revenue</span>
                </div>
                <div className="text-4xl font-bold text-green-800 mb-2">
                  {formatCurrencyNGN(reportData.totalRevenue)}
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Items Sold */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="text-3xl font-bold text-blue-800 mb-2">
                  {reportData.totalItemsSold}
                </div>
                <div className="text-sm font-semibold text-blue-600">Items Sold</div>
              </div>
              
              {/* Remaining Value */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl">🍞</span>
                </div>
                <div className="text-2xl font-bold text-amber-800 mb-2">
                  {formatCurrencyNGN(reportData.totalRemaining)}
                </div>
                <div className="text-sm font-semibold text-amber-600">Remaining</div>
              </div>
            </div>
          </div>

          {/* Sales Records */}
          {reportData.salesRecords.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-sm">💳</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Sales ({reportData.salesRecords.length})</h2>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {reportData.salesRecords.map((sale, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 touch-manipulation min-h-[72px]">
                    <div className="flex-1">
                      <div className="text-base font-bold text-gray-900">{sale.breadType}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {sale.quantity} units • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-base font-bold text-green-600 ml-3">
                      {formatCurrencyNGN(sale.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining Inventory */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Remaining Stock</h2>
            </div>
            
            {(() => {
              const filteredBreads = reportData.remainingBreads.filter(bread => bread.quantity > 0);
              if (filteredBreads.length > 0) {
                return (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                    {filteredBreads.map((bread, index) => (
                      <div key={index} className="flex justify-between items-center p-4 border-b border-amber-100 last:border-b-0 touch-manipulation min-h-[72px]">
                        <div className="flex-1">
                          <div className="text-base font-bold text-gray-900">{bread.breadType}</div>
                          <div className="text-sm text-amber-600 mt-1">{bread.quantity} left</div>
                        </div>
                        <div className="text-base font-bold text-amber-700 ml-3">
                          {formatCurrencyNGN(bread.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
                    <div className="text-green-600 text-base font-medium">✅ All items sold out!</div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Shift Feedback */}
          {(shiftFeedback || reportData.feedback) && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Feedback</h2>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                {loadingFeedback ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name || user?.email || 'Sales Rep'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {shiftFeedback?.created_at 
                          ? new Date(shiftFeedback.created_at).toLocaleTimeString()
                          : new Date().toLocaleTimeString()
                        }
                      </span>
                    </div>
                    <div className="text-base text-gray-800">
                      {shiftFeedback?.note || reportData.feedback || 'No feedback provided'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Bottom Actions */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Share & Download Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-base transition-all duration-200 disabled:opacity-50 touch-manipulation min-h-[56px]"
            >
              <Share2 className="w-5 w-5" />
              <span>Share & Export</span>
              {showShareMenu ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {/* Dropdown Menu */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-10">
                <div className="p-2">
                  {/* Download Options */}
                  <div className="space-y-1">
                    <button
                      onClick={downloadCSV}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation min-h-[52px]"
                    >
                      <Download className="w-5 h-5 text-green-600" />
                      <span>Download CSV</span>
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation min-h-[52px]"
                    >
                      <Download className="w-5 h-5 text-red-600" />
                      <span>Download PDF</span>
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => shareToSocial('whatsapp')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation min-h-[52px]"
                    >
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">W</span>
                      </div>
                      <span>Share to WhatsApp</span>
                    </button>
                    <button
                      onClick={() => shareToSocial('email')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation min-h-[52px]"
                    >
                      <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
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
            onClick={handleBackNavigation}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-base hover:shadow-lg transition-all duration-200 disabled:opacity-50 touch-manipulation min-h-[56px]"
          >
            Close Report
          </button>
        </div>
      </div>

      {/* Alert Badge - Only show if there are high remaining amounts */}
      {reportData.totalRemaining > 1000 && (
        <div className="fixed top-20 left-4 bg-red-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg">
          ⚠️ {reportData.totalRemaining > 2000 ? 'High Stock' : 'Stock Alert'}
        </div>
      )}
    </div>
  );
}