'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Minus, TrendingUp, Package, FileText, Clock, AlertTriangle, Send, ChevronDown, ChevronUp } from 'lucide-react';
// Removed framer-motion imports to fix DOM removeChild errors
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
import { createSalesLog } from '@/lib/sales/actions';
import { getBreadTypesForSales, getSalesDataForShift, getRemainingBreadData, createShiftReport } from '@/lib/reports/sales-reports-server-actions';
import { getRemainingBread, updateRemainingBread } from '@/lib/reports/actions';
import { upsertSalesLogs } from '@/lib/sales/end-shift-actions';
import { upsertRemainingBread } from '@/lib/remaining-bread/actions';
import { useRouter } from 'next/navigation';
import { setNavigationHistory } from '@/lib/utils/navigation-history';
import { SimpleQuantityInput } from './SimpleQuantityInput';

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
  // Add error boundary protection for useShift
  let currentShift: 'morning' | 'night' | null = null;
  try {
    const shiftContext = useShift();
    currentShift = shiftContext.currentShift;
  } catch (error) {
    console.error('Error accessing shift context:', error);
    currentShift = 'morning'; // fallback
  }
  
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Simplified state - no complex interaction tracking

  // State for dropdown toggles - start with dropdowns closed, user clicks to open
  const [isAdditionalSalesOpen, setIsAdditionalSalesOpen] = useState(false);
  const [isRemainingBreadOpen, setIsRemainingBreadOpen] = useState(false);
  
  // Add flag to prevent data fetching during sales processing
  const [isProcessingSales, setIsProcessingSales] = useState(false);
  // Removed hasManualRemainingInput - not needed for simple inputs

  // Check if any modal is open
  const isAnyModalOpen = showConfirmationModal || showFeedbackModal;

  const fetchData = useCallback(async () => {
    if (!currentShift) {
      setLoading(false);
      setInitialLoading(false);
      return;
    }
    
    // CRITICAL FIX: Don't fetch data during sales processing to prevent loops
    if (isProcessingSales || submitting) {
      console.log('⏹️ Skipping data fetch - sales processing in progress');
      return;
    }
    
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
        if (salesData && salesData.length > 0) {
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

      // Check if there's existing data to set interaction state
      // This will be handled by the useEffect that monitors salesLogs and quickRemainingItems
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentShift, userId, isProcessingSales, submitting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Track feedback modal state changes
  useEffect(() => {
    if (showFeedbackModal) {
      console.log('🔍 Feedback modal opened, checking quickRemainingItems:');
      quickRemainingItems.forEach((item, index) => {
        console.log(`  ${index}: ${item.breadType.name} = ${item.quantity}`);
      });
    }
  }, [showFeedbackModal, quickRemainingItems]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showFeedbackModal) {
          setShowFeedbackModal(false);
        } else if (showConfirmationModal) {
          setShowConfirmationModal(false);
        }
      }
    };

    if (isAnyModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isAnyModalOpen, showFeedbackModal, showConfirmationModal]);

  // Removed complex user interaction tracking - using simple state now

  // Utility function to get cookie value
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  };

  // Enhanced back navigation with cookie-based previous page detection
  const handleBackNavigation = () => {
    setIsNavigatingBack(true);
    
    // Get the previous page from cookie
    const previousPage = getCookie('previousPage');
    
    // Add a longer delay to ensure smooth transition and loading state visibility
    setTimeout(() => {
      if (previousPage && (previousPage === '/dashboard/sales-management' || previousPage.startsWith('/dashboard/'))) {
        // Clear the cookie after using it
        document.cookie = `previousPage=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        router.push(previousPage);
      } else {
        // Default fallback to sales dashboard
        router.push('/dashboard/sales');
      }
    }, 500);
  };

  const loadRemainingBreadData = async () => {
    try {
      // Use new server action
      const result = await getRemainingBread(userId);
      
      if (result.success && result.data && result.data.length > 0) {
        setQuickRemainingItems(prevItems => {
          const updatedItems = prevItems.map(item => {
            const totalRemaining = result.data
              .filter(r => r.bread_type_id === item.breadType.id)
              .reduce((sum, r) => sum + (r.quantity || 0), 0);
            return { ...item, quantity: totalRemaining };
          });
          
          return updatedItems;
        });
      } else if (!result.success) {
        console.error('Error loading remaining bread:', result.error);
      }
    } catch (error) {
      console.error('Error loading remaining bread:', error);
    }
  };

  // Handler for updating quick record quantities
  const handleQuickRecordQuantityChange = (itemId: string, value: number) => {
    setQuickRecordItems(prevItems => 
      prevItems.map(item => 
        item.breadType.id === itemId 
          ? { ...item, quantity: value }
          : item
      )
    );
  };

  // Handler for updating remaining bread quantities
  const handleRemainingQuantityChange = (itemId: string, value: number) => {
    setQuickRemainingItems(prevItems => 
      prevItems.map(item => 
        item.breadType.id === itemId 
          ? { ...item, quantity: value }
          : item
      )
    );
  };

  const handleSubmitReport = async () => {
    if (!currentShift) {
      toast.error('Current shift not available');
      return;
    }

    setSubmitting(true);
    setIsProcessingSales(true); // 🔧 Prevent data fetching during sales processing

    try {
      // Step 1: Sales Logs Check - Process sales data first if there are any
      const additionalSales = quickRecordItems.filter(item => item.quantity > 0);
      
      if (additionalSales.length > 0) {
        toast.loading('Checking and saving sales data...', { id: 'save-sales' });
        
        const salesData = additionalSales.map(item => ({
          bread_type_id: item.breadType.id,
          quantity: item.quantity,
          unit_price: item.breadType.unit_price,
          shift: currentShift!,
          recorded_by: userId
        }));

        const salesResult = await upsertSalesLogs(salesData);
        toast.dismiss('save-sales');
        
        if (!salesResult.success) {
          setIsProcessingSales(false); // Reset flag on error
          throw new Error('Failed to save sales data: ' + salesResult.error);
        }
        
        // Show appropriate message based on what happened
        const savedCount = salesResult.results?.filter(r => r.action === 'inserted' || r.action === 'updated').length || 0;
        const skippedCount = salesResult.results?.filter(r => r.action === 'skipped').length || 0;
        
        if (savedCount > 0 && skippedCount > 0) {
          toast.success(`Saved ${savedCount} new sales, skipped ${skippedCount} duplicates`);
        } else if (savedCount > 0) {
          toast.success(`Saved ${savedCount} sales records`);
        } else if (skippedCount > 0) {
          toast.info(`Skipped ${skippedCount} duplicate sales records`);
        }

        // Manually refresh the sales data without triggering infinite loop
        try {
          const updatedSalesData = await getSalesDataForShift(userId, currentShift!);
          if (updatedSalesData) {
            setSalesLogs(updatedSalesData);
            
            // Update quickRecordItems with refreshed quantities from sales_logs
            const salesQuantities = new Map<string, number>();
            
            updatedSalesData.forEach((sale: SalesLog) => {
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
        } catch (error) {
          console.error('Error refreshing sales data after upsert:', error);
        }
      }
      
      setIsProcessingSales(false); // 🔧 Reset flag after sales processing

      // Step 2: Check remaining bread and proceed to appropriate modal
      const remainingToRecord = quickRemainingItems.filter(item => item.quantity > 0);
      const totalRemainingQuantity = remainingToRecord.reduce((sum, item) => sum + item.quantity, 0);

      setSubmitting(false);

      // Simple logic - show confirmation if no remaining bread, otherwise go to feedback
      if (totalRemainingQuantity === 0) {
        setShowConfirmationModal(true);
      } else {
        setShowFeedbackModal(true);
      }

    } catch (error) {
      console.error('Error processing sales data:', error);
      toast.dismiss('save-sales');
      toast.error('Failed to process sales data. Please try again.');
      setIsProcessingSales(false); // Reset flag on error
      setSubmitting(false);
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
      toast.loading('Generating shift report...', { id: 'generate-report' });
      
      // Step 1: Save remaining bread to remaining_bread table first
      const remainingToSave = quickRemainingItems.filter(item => item.quantity > 0);
      
      // Production-ready: Log only essential information
      if (process.env.NODE_ENV === 'development') {
        console.log('Remaining bread items to save:', remainingToSave.length);
      }
      
      if (remainingToSave.length > 0) {
        toast.loading('Saving remaining bread data...', { id: 'save-remaining' });
        
        const remainingBreadData = remainingToSave.map(item => ({
          bread_type_id: item.breadType.id,
          bread_type: item.breadType.name,
          quantity: item.quantity,
          unit_price: item.breadType.unit_price,
          shift: currentShift!,
          recorded_by: userId
        }));

        console.log('🍞 About to save remaining bread data:', remainingBreadData);
        console.log('🍞 Current quickRemainingItems state:', quickRemainingItems.filter(item => item.quantity > 0));
        const remainingResult = await upsertRemainingBread(remainingBreadData);
        console.log('🍞 Remaining bread save result:', remainingResult);
        toast.dismiss('save-remaining');
        
        if (!remainingResult.success) {
          throw new Error('Failed to save remaining bread: ' + remainingResult.error);
        }
        
        // Show appropriate feedback
        const savedCount = remainingResult.results?.filter(r => r.action === 'inserted' || r.action === 'updated').length || 0;
        const skippedCount = remainingResult.results?.filter(r => r.action === 'skipped').length || 0;
        
        if (savedCount > 0 && skippedCount > 0) {
          toast.success(`Saved ${savedCount} remaining bread records, skipped ${skippedCount} duplicates`);
        } else if (savedCount > 0) {
          toast.success(`Saved ${savedCount} remaining bread records`);
        } else if (skippedCount > 0) {
          toast.info(`Skipped ${skippedCount} duplicate remaining bread records`);
        }
      }
      
      // Step 2: Calculate totals ONLY from existing sales logs (no duplication)
      let totalRevenue = 0;
      let totalItemsSold = 0;
      
      // Process ONLY existing sales logs (already saved to sales_logs table)
      const salesDataItems = salesLogs.map(sale => {
        const revenue = sale.quantity * (sale.unit_price || 0);
        totalRevenue += revenue;
        totalItemsSold += sale.quantity;
        
        return {
          breadType: sale.bread_types?.name || 'Unknown',
          quantity: sale.quantity,
          unitPrice: sale.unit_price || 0,
          totalAmount: revenue,
          timestamp: sale.created_at
        };
      });
      
      // NOTE: We don't add quickRecordItems here because they were already 
      // processed and saved to sales_logs in the "Record All Sale" step
      // The salesLogs state should already contain all current sales
      
      // Process remaining bread data for shift report (JSON summary)
      const remainingBreadItems = quickRemainingItems
        .filter(item => item.quantity > 0)
        .map(item => ({
          breadType: item.breadType.name,
          quantity: item.quantity,
          unitPrice: item.breadType.unit_price,
          totalAmount: item.quantity * item.breadType.unit_price
        }));
      
      const totalRemaining = remainingBreadItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Step 3: Create shift report (summary data for reporting)
      const reportData = {
        user_id: userId,
        shift: currentShift,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        total_remaining: totalRemaining,
        feedback: feedback,
        sales_data: salesDataItems,
        remaining_breads: remainingBreadItems // JSON summary for reports
      };
      
      
      console.log('📊 About to create shift report:', reportData);
      
      const shiftReport = await createShiftReport(reportData);
      
      console.log('📊 Shift report result:', shiftReport);
      
      if (shiftReport) {
        // Close all modals first to prevent DOM conflicts
        setShowFeedbackModal(false);
        setShowConfirmationModal(false);
        
        // Clean dismiss of toasts
        setTimeout(() => {
          toast.dismiss('generate-report');
        }, 100);
        
        console.log('📊 Navigating to final report with ID:', shiftReport.id);
        
        // Use a cleaner navigation approach - navigate directly without data in URL
        // The final report page can fetch the data using the report ID
        setTimeout(() => {
          try {
            router.push(`/dashboard/sales/final-report?reportId=${shiftReport.id}`);
          } catch (navError) {
            console.error('Navigation error:', navError);
            // Fallback navigation
            window.location.href = `/dashboard/sales/final-report?reportId=${shiftReport.id}`;
          }
        }, 200);
        
      } else {
        console.error('❌ No shift report returned');
        toast.dismiss('generate-report');
        toast.error('Report created but no data returned');
        setSubmitting(false);
        setShowFeedbackModal(false);
      }

    } catch (error) {
      console.error('Error generating shift report:', error);
      toast.dismiss('generate-report');
      toast.error('Failed to generate report. Please try again.');
      
      // Clean up modals and state
      setSubmitting(false);
      setShowFeedbackModal(false);
      setShowConfirmationModal(false);
    }
  };

  // Simplified button logic - always enable the button
  const hasSalesLogs = salesLogs.length > 0;
  const shouldEnableEndShift = true; // Always enabled for simple functionality


  // Show error if shift context is not available
  if (!currentShift) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shift Context Not Available</h2>
          <p className="text-gray-600 mb-6">
            Please select a shift in your dashboard before generating a report.
          </p>
          <Button
            onClick={() => router.push('/dashboard/sales')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show initial loading screen on first render
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 animate-pulse">Loading Record all...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Back Navigation Loading Overlay */}
      {isNavigatingBack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-orange-200 rounded-full opacity-25"></div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Going Back
                </h3>
                <p className="text-gray-600 text-sm">
                  Loading...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  Generating Report
                </h3>
                <p className="text-gray-600 text-sm">
                  Creating comprehensive shift report...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-6 ${isAnyModalOpen ? 'pointer-events-none opacity-50' : ''}`}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackNavigation}
            disabled={submitting || isNavigatingBack}
            className="h-12 w-12 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Go back to previous page"
            title="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="bg-white/20 p-3 rounded-xl flex-shrink-0">
            <FileText className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Generate Shift Report</h1>
            <p className="text-blue-100 text-sm sm:text-base truncate">
              {currentShift ? `${currentShift.charAt(0).toUpperCase()}${currentShift.slice(1)} Shift • ` : ''}{userName}
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`${isAnyModalOpen ? 'pointer-events-none opacity-50' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-6 text-gray-600 text-xl">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Sales Log Display */}
            {salesLogs.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/50 shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-green-800">
                  <div className="bg-green-100 p-3 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="truncate">Recorded Sales</span>
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto border rounded-xl p-4 bg-white/80 backdrop-blur-sm">
                  {salesLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-green-100/50 hover:shadow-md transition-all duration-200 touch-manipulation min-h-[60px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base truncate">{log.bread_types?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-bold text-base sm:text-base">{log.quantity} units</p>
                        <p className="text-sm sm:text-sm text-gray-600">
                          {formatCurrencyNGN(log.quantity * (log.unit_price || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record Additional Sales Section - Collapsible */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <div
                onClick={() => setIsAdditionalSalesOpen(!isAdditionalSalesOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-blue-100/30 transition-colors cursor-pointer select-none touch-manipulation min-h-[72px]"
                role="button"
                aria-expanded={isAdditionalSalesOpen}
                aria-label={`${isAdditionalSalesOpen ? 'Collapse' : 'Expand'} additional sales section`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsAdditionalSalesOpen(!isAdditionalSalesOpen);
                  }
                }}
              >
                <div className="flex items-center gap-3 text-blue-800">
                  <div className="bg-blue-100 p-3 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold truncate">Record Additional Sales</h2>
                    <p className="text-sm text-blue-600 mt-1">
                      {quickRecordItems.filter(i => i.quantity > 0).length} items • {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isAdditionalSalesOpen ? (
                    <ChevronUp className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </div>

              {/* Collapsible Content */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isAdditionalSalesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
              {isAdditionalSalesOpen && (
                <div className="px-6 pb-6 space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  {quickRecordItems.map((item) => (
                    <div key={item.breadType.id} className="flex items-center gap-4 p-4 border rounded-xl bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:bg-white min-h-[68px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base truncate">{item.breadType.name}</p>
                        <p className="text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                      </div>
                      <SimpleQuantityInput
                        itemId={item.breadType.id}
                        initialValue={item.quantity}
                        variant="blue"
                        onChange={handleQuickRecordQuantityChange}
                      />
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Record Remaining Breads Section - Collapsible */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <div
                onClick={() => setIsRemainingBreadOpen(!isRemainingBreadOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-amber-100/30 transition-colors cursor-pointer select-none touch-manipulation min-h-[72px]"
                role="button"
                aria-expanded={isRemainingBreadOpen}
                aria-label={`${isRemainingBreadOpen ? 'Collapse' : 'Expand'} remaining bread section`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsRemainingBreadOpen(!isRemainingBreadOpen);
                  }
                }}
              >
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="bg-amber-100 p-3 rounded-xl flex-shrink-0">
                    <Package className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold truncate">Record Remaining Breads</h2>
                    <p className="text-sm text-amber-600 mt-1">
                      {quickRemainingItems.filter(i => i.quantity > 0).length} items • {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isRemainingBreadOpen ? (
                    <ChevronUp className="h-6 w-6 text-amber-600" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-amber-600" />
                  )}
                </div>
              </div>

              {/* Collapsible Content */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isRemainingBreadOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
              {isRemainingBreadOpen && (
                <div className="px-6 pb-6 space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  {quickRemainingItems.map((item) => (
                    <div key={item.breadType.id} className="flex items-center gap-4 p-4 border rounded-xl bg-gradient-to-r from-yellow-50/80 to-amber-50/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:from-yellow-100/80 hover:to-amber-100/80 min-h-[68px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base truncate">{item.breadType.name}</p>
                        <p className="text-sm text-gray-600">Remaining quantity</p>
                      </div>
                      <SimpleQuantityInput
                        itemId={item.breadType.id}
                        initialValue={item.quantity}
                        variant="amber"
                        onChange={handleRemainingQuantityChange}
                      />
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50 shadow-sm">
              <h3 className="font-semibold mb-4 text-xl text-purple-800 flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0" />
                <span className="truncate">Summary</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">Sales to record:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-sm px-3 py-1">
                      {quickRecordItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">Total units:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-sm px-3 py-1">
                      {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">Remaining to record:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0 text-sm px-3 py-1">
                      {quickRemainingItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">Total units:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0 text-sm px-3 py-1">
                      {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                variant="outline"
                onClick={handleBackNavigation}
                disabled={submitting || isNavigatingBack}
                className="flex-1 py-4 px-6 rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-base font-semibold touch-manipulation min-h-[56px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={submitting || !shouldEnableEndShift}
                className="flex-1 py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="rounded-full h-5 w-5 border-2 border-white border-t-transparent animate-spin" />
                    <span className="text-base font-semibold truncate">Generating Report...</span>
                  </div>
                ) : (
                  <span className="text-base font-semibold truncate">
                    Record All Sale
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Mobile First */}
      {showConfirmationModal && !submitting && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // Only close if clicking on backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setShowConfirmationModal(false);
            }
          }}
        >
            <div 
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-yellow-100 p-4 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center mb-3">No Remaining Bread</h3>
                <p className="text-gray-600 text-center mb-6 text-base leading-relaxed">
                  You didn't record remaining bread, do you want to continue?
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmationModal(false)}
                    className="flex-1 text-base font-semibold touch-manipulation min-h-[52px] rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmProceed}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-base font-semibold touch-manipulation min-h-[52px] rounded-xl"
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Feedback Modal - Mobile First */}
      {showFeedbackModal && !submitting && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Only close if clicking on backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowFeedbackModal(false);
              }
            }}
          >
            <div 
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl mx-auto max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-blue-100 p-4 rounded-full">
                    <Send className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center mb-3">Add Feedback (Optional)</h3>
                <p className="text-gray-600 text-center mb-6 text-base leading-relaxed">
                  Add any feedback or notes about this shift before generating the report.
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback about this shift (optional)..."
                  className="w-full p-4 border rounded-xl resize-none mb-4 text-base min-h-[120px]"
                  rows={4}
                />
              </div>
              <div className="p-6 pt-0 flex-shrink-0">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 text-base font-semibold touch-manipulation min-h-[52px] rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitWithFeedback}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 touch-manipulation min-h-[52px] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="rounded-full h-4 w-4 border-2 border-white border-t-transparent animate-spin" />
                        <span className="text-base font-semibold">Generating Report...</span>
                      </div>
                    ) : (
                      <span className="text-base font-semibold">Generate Report</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}