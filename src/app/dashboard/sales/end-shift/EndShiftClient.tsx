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
import { checkRemainingBreadConflicts } from '@/lib/sales/conflict-checker';
import { upsertRemainingBread } from '@/lib/remaining-bread/actions';
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
  const [showRemainingBreadConflictModal, setShowRemainingBreadConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  // Initialize loading state to true so page shows loading on first render
  const [initialLoading, setInitialLoading] = useState(true);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // State to track user interactions for dynamic button behavior
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // State for dropdown toggles - start with dropdowns open for better UX
  const [isAdditionalSalesOpen, setIsAdditionalSalesOpen] = useState(true);
  const [isRemainingBreadOpen, setIsRemainingBreadOpen] = useState(true);
  
  // Add flag to prevent data fetching during sales processing
  const [isProcessingSales, setIsProcessingSales] = useState(false);
  const [hasManualRemainingInput, setHasManualRemainingInput] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentShift) {
      console.warn('No current shift available, skipping data fetch');
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
          
          // Don't reset remaining items if user has manual input
          if (!hasManualRemainingInput) {
            setQuickRemainingItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
          } else {
            console.log('🔍 Preserving user remaining bread input during fetchData');
          }
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
          
          // Don't reset remaining items if user has manual input
          if (!hasManualRemainingInput) {
            setQuickRemainingItems(breadTypesData.map((bt: any) => ({ breadType: bt, quantity: 0 })));
          } else {
            console.log('🔍 Preserving user remaining bread input during fetchData fallback');
          }
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
  }, [currentShift, userId, isProcessingSales, submitting, hasManualRemainingInput]);

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

  // Check for existing data whenever salesLogs, quickRemainingItems, or quickRecordItems change
  useEffect(() => {
    const hasSalesData = salesLogs.length > 0;
    const hasRemainingData = quickRemainingItems.some(item => item.quantity > 0);
    const hasRecordData = quickRecordItems.some(item => item.quantity > 0);
    const hasExistingData = hasSalesData || hasRemainingData || hasRecordData;
    
    if (hasExistingData && !hasUserInteracted) {
      setHasUserInteracted(true);
    }
  }, [salesLogs, quickRemainingItems, quickRecordItems, hasUserInteracted]);

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
      console.log('🍞 loadRemainingBreadData called, hasManualRemainingInput:', hasManualRemainingInput);
      // Don't override manual user input
      if (hasManualRemainingInput) {
        console.log('🍞 Skipping auto-load - user has manual input');
        return;
      }

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
          
          // Trigger user interaction if we found remaining bread data
          if (updatedItems.some(item => item.quantity > 0)) {
            setHasUserInteracted(true);
          }
          
          return updatedItems;
        });
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
    
    // Mark that user has manual input for remaining bread
    if (isRemaining) {
      setHasManualRemainingInput(true);
      console.log('🔍 User updating remaining bread:', { breadTypeId, quantity });
    }
    
    setItems(items.map(item => 
      item.breadType.id === breadTypeId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ));
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
      console.log('🔍 setSubmitting(false) called, about to check remaining bread modal logic');

      // Check remaining bread quantity to determine which modal to show
      if (totalRemainingQuantity === 0) {
        // No remaining bread recorded → show confirmation modal
        setShowConfirmationModal(true);
      } else {
        // Step 3: Has remaining bread → check for conflicts
        const remainingData = remainingToRecord.map(item => ({
          bread_type_id: item.breadType.id,
          bread_type: item.breadType.name,
          quantity: item.quantity,
          unit_price: item.breadType.unit_price,
          shift: currentShift!,
          recorded_by: userId
        }));

        console.log('🔍 About to check conflicts for remaining data:', remainingData);
        const conflictResult = await checkRemainingBreadConflicts(remainingData);
        console.log('🔍 Conflict check result:', conflictResult);
        
        if (conflictResult.hasConflicts) {
          // Conflicts found → show conflict modal
          setConflictData(conflictResult.conflicts);
          setShowRemainingBreadConflictModal(true);
        } else {
          // No conflicts → proceed directly to feedback modal
          console.log('🔍 No conflicts, proceeding to feedback modal');
          console.log('🔍 quickRemainingItems before opening feedback modal:');
          quickRemainingItems.forEach((item, index) => {
            console.log(`  ${index}: ${item.breadType.name} = ${item.quantity}`);
          });
          setShowFeedbackModal(true);
        }
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

  const handleConflictProceed = () => {
    console.log('🔍 User clicked proceed in conflict modal, quickRemainingItems:', quickRemainingItems.filter(i => i.quantity > 0));
    setShowRemainingBreadConflictModal(false);
    setShowFeedbackModal(true);
  };

  const handleConflictCancel = () => {
    setShowRemainingBreadConflictModal(false);
    // Navigate back to previous page
    handleBackNavigation();
  };

  const handleSubmitWithFeedback = async () => {
    setSubmitting(true);
    
    try {
      // Show loading toast
      toast.loading('Generating shift report...', { id: 'generate-report' });
      
      // Step 1: Save remaining bread to remaining_bread table first
      const remainingToSave = quickRemainingItems.filter(item => item.quantity > 0);
      
      console.log('🔍 DEBUG: Current quickRemainingItems in feedback modal:', quickRemainingItems);
      console.log('🔍 DEBUG: Quantities in quickRemainingItems:');
      quickRemainingItems.forEach((item, index) => {
        console.log(`  ${index}: ${item.breadType.name} = ${item.quantity}`);
      });
      console.log('🔍 DEBUG: Filtered remainingToSave:', remainingToSave);
      
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

  // Check for existing data in sales_logs or remaining_bread tables
  const hasSalesLogs = salesLogs.length > 0;
  const hasRemainingBreadData = quickRemainingItems.some(item => item.quantity > 0);
  const hasSalesInputs = quickRecordItems.some(item => item.quantity > 0);
  const hasAnyUserInput = hasSalesInputs || hasRemainingBreadData;
  
  // Determine if button should be active (green) and show "Record All Sale"
  const shouldShowRecordAllSale = hasUserInteracted || hasSalesLogs || hasRemainingBreadData || hasAnyUserInput;
  // FIXED: Button should be enabled for ANY activity, not just sales logs
  const shouldEnableEndShift = shouldShowRecordAllSale;


  // Show error if shift context is not available
  if (!currentShift) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/sales')}
                className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">Shift Not Available</h1>
                <p className="text-blue-100 text-xs sm:text-sm truncate">
                  Unable to load shift data
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
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
      </div>
    );
  }

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
            <p className="text-lg text-gray-600 animate-pulse">Loading Record all...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
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

      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              disabled={submitting || isNavigatingBack}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Generate Shift Report</h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {currentShift ? `${currentShift.charAt(0).toUpperCase()}${currentShift.slice(1)} Shift • ` : ''}{userName}
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

            {/* Record Additional Sales Section - Collapsible */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl lg:rounded-2xl border border-blue-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <button
                onClick={() => setIsAdditionalSalesOpen(!isAdditionalSalesOpen)}
                disabled={submitting}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-blue-100/30 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 sm:gap-3 text-blue-800">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Record Additional Sales</h2>
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                      {quickRecordItems.filter(i => i.quantity > 0).length} items • {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isAdditionalSalesOpen ? (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isAdditionalSalesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
              {isAdditionalSalesOpen && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
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
                          onClick={() => {
                            updateQuickRecordQuantity(item.breadType.id, item.quantity - 1);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateQuickRecordQuantity(item.breadType.id, item.quantity + 1);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Record Remaining Breads Section - Collapsible */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl lg:rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <button
                onClick={() => setIsRemainingBreadOpen(!isRemainingBreadOpen)}
                disabled={submitting}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-amber-100/30 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 sm:gap-3 text-amber-800">
                  <div className="bg-amber-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Record Remaining Breads</h2>
                    <p className="text-xs sm:text-sm text-amber-600 mt-1">
                      {quickRemainingItems.filter(i => i.quantity > 0).length} items • {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isRemainingBreadOpen ? (
                    <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isRemainingBreadOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
              {isRemainingBreadOpen && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
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
                          onClick={() => {
                            updateQuickRecordQuantity(item.breadType.id, item.quantity - 1, true);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            updateQuickRecordQuantity(item.breadType.id, parseInt(e.target.value) || 0, true);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="w-16 sm:w-20 h-10 sm:h-12 text-center border rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateQuickRecordQuantity(item.breadType.id, item.quantity + 1, true);
                            setHasUserInteracted(true);
                          }}
                          disabled={submitting}
                          className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            onClick={handleBackNavigation}
            disabled={submitting || isNavigatingBack}
            className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-sm sm:text-base font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={submitting || !shouldEnableEndShift}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] sm:min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed ${
              shouldShowRecordAllSale 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <div className="rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent animate-spin" />
                <span className="text-xs sm:text-sm md:text-base font-semibold truncate">Generating Report...</span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm md:text-base font-semibold truncate">
                Record All Sale
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Modal - Mobile First */}
      {showConfirmationModal && !submitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl shadow-2xl mx-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">No Remaining Bread</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  You didn't record remaining bread, do you want to continue?
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
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Feedback Modal - Mobile First */}
      {showFeedbackModal && !submitting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl shadow-2xl mx-auto max-h-[90vh] flex flex-col">
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                    <Send className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-center mb-2">Add Feedback (Optional)</h3>
                <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  Add any feedback or notes about this shift before generating the report.
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback about this shift (optional)..."
                  className="w-full p-3 border rounded-lg resize-none mb-4"
                  rows={3}
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
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <div className="rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent animate-spin" />
                        <span className="text-sm sm:text-base font-semibold">Generating Report...</span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-semibold">Generate Report</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Remaining Bread Conflict Modal - Mobile First */}
      {showRemainingBreadConflictModal && !submitting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl shadow-2xl mx-auto max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-center mb-2">Remaining Bread Conflict</h3>
              <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                Same quantity found on different date. Do you want to proceed?
              </p>
              
              {/* Show conflict data */}
              <div className="space-y-3 mb-4 sm:mb-6">
                {conflictData.map((conflict, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{conflict.breadType}</span>
                      <span className="text-yellow-700 text-sm font-semibold">{conflict.quantity} units</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Previous entry: {new Date(conflict.existingDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 pt-0 sm:pt-0 flex-shrink-0">
              <div className="flex gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={handleConflictCancel}
                  className="flex-1 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConflictProceed}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm sm:text-base font-semibold touch-manipulation min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl"
                >
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}