'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, TrendingUp, Package, FileText, Clock, AlertTriangle, Send, ChevronDown, ChevronUp } from 'lucide-react';
// Removed framer-motion imports to fix DOM removeChild errors
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
// import { createSalesLog } from '@/lib/sales/actions'; // Removed unused import
import { getBreadTypesForSales, getSalesDataForShift, createShiftReport } from '@/lib/reports/sales-reports-server-actions';
import { getRemainingBread } from '@/lib/reports/actions';
import { upsertSalesLogs } from '@/lib/sales/end-shift-actions';
import { upsertRemainingBread } from '@/lib/remaining-bread/actions';
import { useRouter } from 'next/navigation';
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
          
          // Auto-fill "Record Additional Sales" with LATEST quantities from sales_logs
          // Show the most recent quantity for each bread type (no summing)
          const salesQuantities = new Map<string, SalesLog>();
          
          // Keep only the latest record for each bread type
          salesData.forEach((sale: SalesLog) => {
            const breadTypeId = sale.bread_type_id;
            const existingRecord = salesQuantities.get(breadTypeId);
            
            // If no existing record OR this record is newer, use it
            if (!existingRecord || new Date(sale.created_at) > new Date(existingRecord.created_at)) {
              salesQuantities.set(breadTypeId, sale);
            }
          });

          // Update quickRecordItems with LATEST quantities (not summed)
          setQuickRecordItems(prevItems => 
            prevItems.map(item => {
              const latestSale = salesQuantities.get(item.breadType.id);
              return {
                ...item,
                quantity: latestSale ? latestSale.quantity : 0
              };
            })
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
          
          // Auto-fill "Record Additional Sales" with LATEST quantities from sales_logs
          // Show the most recent quantity for each bread type (no summing)
          const salesQuantities = new Map<string, SalesLog>();
          
          // Keep only the latest record for each bread type
          salesData.forEach((sale: SalesLog) => {
            const breadTypeId = sale.bread_type_id;
            const existingRecord = salesQuantities.get(breadTypeId);
            
            // If no existing record OR this record is newer, use it
            if (!existingRecord || new Date(sale.created_at) > new Date(existingRecord.created_at)) {
              salesQuantities.set(breadTypeId, sale);
            }
          });

          // Update quickRecordItems with LATEST quantities (not summed)
          setQuickRecordItems(prevItems => 
            prevItems.map(item => {
              const latestSale = salesQuantities.get(item.breadType.id);
              return {
                ...item,
                quantity: latestSale ? latestSale.quantity : 0
              };
            })
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

  // Mobile keyboard detection using visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const viewport = window.visualViewport!;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const heightDifference = windowHeight - viewportHeight;
      
      // Keyboard is considered visible if viewport height is significantly reduced
      const keyboardVisible = heightDifference > 150; // 150px threshold for keyboard detection
      
      setIsKeyboardVisible(keyboardVisible);
      setKeyboardHeight(keyboardVisible ? heightDifference : 0);
      
      // Debug logging for mobile testing
      console.log('📱 Viewport change:', {
        windowHeight,
        viewportHeight,
        heightDifference,
        keyboardVisible,
        keyboardHeight: keyboardVisible ? heightDifference : 0
      });
    };

    // Initial measurement
    handleViewportChange();
    
    // Listen for viewport changes
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

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
            // Get all records for this bread type
            const breadRecords = result.data.filter(r => r.bread_type_id === item.breadType.id);
            
            // Find the LATEST record (most recent created_at) instead of summing all
            const latestRecord = breadRecords.reduce((latest: any, current: any) => {
              if (!latest) return current;
              return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            }, null);
            
            return { ...item, quantity: latestRecord ? latestRecord.quantity || 0 : 0 };
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
      // Step 1: Process Sales Data (if any)
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
        const insertedCount = salesResult.results?.filter(r => r.action === 'inserted').length || 0;
        const updatedCount = salesResult.results?.filter(r => r.action === 'updated').length || 0;
        
        if (insertedCount > 0 && updatedCount > 0) {
          toast.success(`Added ${insertedCount} new sales, updated ${updatedCount} existing records`);
        } else if (insertedCount > 0) {
          toast.success(`Added ${insertedCount} sales records`);
        } else if (updatedCount > 0) {
          toast.success(`Updated ${updatedCount} existing sales records`);
        }

        // Manually refresh the sales data without triggering infinite loop
        try {
          const updatedSalesData = await getSalesDataForShift(userId, currentShift!);
          if (updatedSalesData) {
            setSalesLogs(updatedSalesData);
            
            // Update quickRecordItems with LATEST refreshed quantities from sales_logs
            const salesQuantities = new Map<string, SalesLog>();
            
            // Keep only the latest record for each bread type
            updatedSalesData.forEach((sale: SalesLog) => {
              const breadTypeId = sale.bread_type_id;
              const existingRecord = salesQuantities.get(breadTypeId);
              
              // If no existing record OR this record is newer, use it
              if (!existingRecord || new Date(sale.created_at) > new Date(existingRecord.created_at)) {
                salesQuantities.set(breadTypeId, sale);
              }
            });

            // Update quickRecordItems with LATEST quantities (not summed)
            setQuickRecordItems(prevItems => 
              prevItems.map(item => {
                const latestSale = salesQuantities.get(item.breadType.id);
                return {
                  ...item,
                  quantity: latestSale ? latestSale.quantity : 0
                };
              })
            );
          }
        } catch (error) {
          console.error('Error refreshing sales data after upsert:', error);
        }
      }

      // Step 2: Process Remaining Bread Data (if any)
      const remainingToSave = quickRemainingItems.filter(item => item.quantity > 0);
      
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

        const remainingResult = await upsertRemainingBread(remainingBreadData);
        toast.dismiss('save-remaining');
        
        if (!remainingResult.success) {
          setIsProcessingSales(false); // Reset flag on error
          throw new Error('Failed to save remaining bread: ' + remainingResult.error);
        }
        
        // Show appropriate message based on what happened
        const remainingInserted = remainingResult.results?.filter(r => r.action === 'inserted').length || 0;
        const remainingUpdated = remainingResult.results?.filter(r => r.action === 'updated').length || 0;
        
        if (remainingInserted > 0 && remainingUpdated > 0) {
          toast.success(`Added ${remainingInserted} new remaining bread records, updated ${remainingUpdated} existing records`);
        } else if (remainingInserted > 0) {
          toast.success(`Added ${remainingInserted} remaining bread records`);
        } else if (remainingUpdated > 0) {
          toast.success(`Updated ${remainingUpdated} existing remaining bread records`);
        }
      }
      
      setIsProcessingSales(false); // 🔧 Reset flag after all processing

      // Step 3: Determine Modal Route
      const totalRemainingQuantity = remainingToSave.length;
      const hasSalesData = additionalSales.length > 0;
      const hasRemainingData = remainingToSave.length > 0;

      setSubmitting(false);

      // Show feedback modal if any data was processed, otherwise show confirmation
      if (hasSalesData || hasRemainingData) {
        setShowFeedbackModal(true);
      } else {
        setShowConfirmationModal(true);
      }

    } catch (error) {
      console.error('Error processing data:', error);
      toast.dismiss('save-sales');
      toast.dismiss('save-remaining');
      toast.error('Failed to process data. Please try again.');
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
      
      // Step 1: Fetch FRESH data from database (sales and remaining bread already saved)
      toast.loading('Fetching latest sales and remaining bread data...', { id: 'fetch-fresh' });
      
      // Fetch FRESH sales_logs data (already saved in handleSubmitReport)
      const freshSalesData = await getSalesDataForShift(userId, currentShift!);
      
      // Fetch FRESH remaining_bread data (already saved in handleSubmitReport)
      const freshRemainingResult = await getRemainingBread(userId);
      const freshRemainingData = freshRemainingResult.success ? freshRemainingResult.data || [] : [];
      
      toast.dismiss('fetch-fresh');
      
      // Step 2: Calculate totals from FRESH database data
      let totalRevenue = 0;
      let totalItemsSold = 0;
      
      // Process FRESH sales data for shift report
      const salesDataItems = (freshSalesData || []).map(sale => {
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
      
      // Process FRESH remaining bread data for shift report (JSON summary)
      // Group by bread_type_id and get latest record for each
      const remainingBreadMap = new Map();
      freshRemainingData.forEach(item => {
        const existing = remainingBreadMap.get(item.bread_type_id);
        if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
          remainingBreadMap.set(item.bread_type_id, item);
        }
      });
      
      const remainingBreadItems = Array.from(remainingBreadMap.values())
        .filter(item => item.quantity > 0)
        .map(item => ({
          breadType: item.bread_type,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalAmount: item.quantity * item.unit_price
        }));
      
      const totalRemaining = remainingBreadItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Step 3: Create/Update shift report with FRESH data (UPSERT logic)
      toast.loading('Creating shift report...', { id: 'create-report' });
      
      const reportData = {
        user_id: userId,
        shift: currentShift,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        total_remaining: totalRemaining,
        feedback: feedback, // Include feedback note from modal
        sales_data: salesDataItems, // FRESH sales data from database
        remaining_breads: remainingBreadItems // FRESH remaining bread data from database
      };
      
      console.log('📊 Creating shift report with FRESH data:', {
        user_id: reportData.user_id,
        shift: reportData.shift,
        feedback: reportData.feedback,
        sales_count: salesDataItems.length,
        remaining_count: remainingBreadItems.length,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        total_remaining: totalRemaining
      });
      
      const shiftReport = await createShiftReport(reportData);
      toast.dismiss('create-report');
      
      console.log('📊 Shift report UPSERT result:', shiftReport);
      
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
  // const hasSalesLogs = salesLogs.length > 0; // Removed unused variable
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
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 overflow-x-hidden overflow-y-auto px-3 sm:px-4 md:px-6">
      {/* Back Navigation Loading Overlay - Mobile-First Responsive */}
      {isNavigatingBack && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm z-50 pointer-events-auto"
          style={{ 
            touchAction: 'none',
            width: '100vw',
            height: 'calc(100vh - 4rem)',
            margin: 0,
            padding: 0
          }}
        >
          <div 
            className="bg-white flex flex-col"
            style={{
              width: '100vw',
              height: 'calc(100vh - 4rem)',
              minHeight: 'calc(100vh - 4rem)',
              maxHeight: 'calc(100vh - 4rem)'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-full">
                  <ArrowLeft className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center">Going Back</h1>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-4">
              <div className="relative mb-4 sm:mb-6 md:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 border-orange-200 rounded-full opacity-25"></div>
              </div>
              <p className="text-gray-600 text-base sm:text-lg md:text-xl text-center px-4">
                Loading previous page...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Loading Overlay - Mobile-First Responsive */}
      {submitting && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm z-50 pointer-events-auto"
          style={{ 
            touchAction: 'none',
            width: '100vw',
            height: 'calc(100vh - 4rem)',
            margin: 0,
            padding: 0
          }}
        >
          <div 
            className="bg-white flex flex-col"
            style={{
              width: '100vw',
              height: 'calc(100vh - 4rem)',
              minHeight: 'calc(100vh - 4rem)',
              maxHeight: 'calc(100vh - 4rem)'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-full">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center">Generating Report</h1>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-4">
              <div className="relative mb-4 sm:mb-6 md:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 border-green-200 rounded-full opacity-25"></div>
              </div>
              <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 max-w-lg px-4">
                <p className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">
                  Creating comprehensive shift report...
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6">
                  <p className="text-green-800 text-xs sm:text-sm md:text-base">
                    This may take a few moments while we process your sales data and remaining inventory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header - Mobile-First Responsive */}
      <div className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg sm:rounded-xl p-4 sm:p-6 ${isAnyModalOpen ? 'pointer-events-none opacity-50' : ''}`}>
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
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Generate Shift Report</h1>
            <p className="text-blue-100 text-xs sm:text-sm md:text-base truncate">
              {currentShift ? `${currentShift.charAt(0).toUpperCase()}${currentShift.slice(1)} Shift • ` : ''}{userName}
            </p>
          </div>
        </div>
      </div>

      {/* Content Area - Constrained Container */}
      <div className={`w-full max-w-full min-w-0 ${isAnyModalOpen ? 'pointer-events-none opacity-50' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-6 text-gray-600 text-xl">Loading...</p>
          </div>
        ) : (
          <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
            
            {/* Sales Log Display */}
            {salesLogs.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200/50 shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-green-800">
                  <div className="bg-green-100 p-3 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="truncate">Recorded Sales</span>
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white/80 backdrop-blur-sm">
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <div
                onClick={() => setIsAdditionalSalesOpen(!isAdditionalSalesOpen)}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-blue-100/30 transition-colors cursor-pointer select-none touch-manipulation min-h-[64px] sm:min-h-[72px]"
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
                <div className="flex items-center gap-3 text-blue-800 min-w-0">
                  <div className="bg-blue-100 p-3 rounded-xl flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="text-lg sm:text-xl font-bold truncate">Record Additional Sales</h2>
                    <p className="text-xs sm:text-sm text-blue-600 mt-1 truncate">
                      <span className="inline-block">{quickRecordItems.filter(i => i.quantity > 0).length} items</span>
                      <span className="hidden sm:inline"> • {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units</span>
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
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  {quickRecordItems.map((item) => (
                    <div key={item.breadType.id} className="p-4 border rounded-xl bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:bg-white space-y-3">
                      {/* Bread Type Info - Full Width */}
                      <div className="w-full">
                        <p className="font-medium text-base leading-tight mb-1" style={{ wordBreak: 'break-word' }}>
                          {item.breadType.name}
                        </p>
                        <p className="text-sm text-gray-600">{formatCurrencyNGN(item.breadType.unit_price)} each</p>
                      </div>
                      
                      {/* Quantity Input - Centered */}
                      <div className="flex justify-center pt-2">
                        <SimpleQuantityInput
                          itemId={item.breadType.id}
                          initialValue={item.quantity}
                          variant="blue"
                          onChange={handleQuickRecordQuantityChange}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Record Remaining Breads Section - Collapsible */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
              {/* Header - Always Visible */}
              <div
                onClick={() => setIsRemainingBreadOpen(!isRemainingBreadOpen)}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-amber-100/30 transition-colors cursor-pointer select-none touch-manipulation min-h-[64px] sm:min-h-[72px]"
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
                <div className="flex items-center gap-3 text-amber-800 min-w-0">
                  <div className="bg-amber-100 p-3 rounded-xl flex-shrink-0">
                    <Package className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="text-lg sm:text-xl font-bold truncate">Record Remaining Breads</h2>
                    <p className="text-xs sm:text-sm text-amber-600 mt-1 truncate">
                      <span className="inline-block">{quickRemainingItems.filter(i => i.quantity > 0).length} items</span>
                      <span className="hidden sm:inline"> • {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)} total units</span>
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
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  {quickRemainingItems.map((item) => (
                    <div key={item.breadType.id} className="p-4 border rounded-xl bg-gradient-to-r from-yellow-50/80 to-amber-50/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:from-yellow-100/80 hover:to-amber-100/80 space-y-3">
                      {/* Bread Type Info - Full Width */}
                      <div className="w-full">
                        <p className="font-medium text-base leading-tight mb-1" style={{ wordBreak: 'break-word' }}>
                          {item.breadType.name}
                        </p>
                        <p className="text-sm text-gray-600">Remaining quantity</p>
                      </div>
                      
                      {/* Quantity Input - Centered */}
                      <div className="flex justify-center pt-2">
                        <SimpleQuantityInput
                          itemId={item.breadType.id}
                          initialValue={item.quantity}
                          variant="amber"
                          onChange={handleRemainingQuantityChange}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-purple-200/50 shadow-sm">
              <h3 className="font-semibold mb-4 text-xl text-purple-800 flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0" />
                <span className="truncate">Summary</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="space-y-3 min-w-0">
                  <div className="flex justify-between items-center min-w-0">
                    <span className="text-xs sm:text-sm text-gray-600 truncate flex-shrink-0">Sales to record:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1 ml-2">
                      {quickRecordItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate flex-shrink-0">Total units:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1 ml-2">
                      {quickRecordItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 min-w-0">
                  <div className="flex justify-between items-center min-w-0">
                    <span className="text-xs sm:text-sm text-gray-600 truncate flex-shrink-0">Remaining to record:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1 ml-2">
                      {quickRemainingItems.filter(i => i.quantity > 0).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 truncate flex-shrink-0">Total units:</span>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1 ml-2">
                      {quickRemainingItems.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.quantity, 0)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons - Mobile-First Responsive Design */}
            <div className="w-full max-w-full min-w-0 flex gap-2 sm:gap-3 md:gap-4 pt-4 sm:pt-6 px-1 sm:px-0">
              <Button
                variant="outline"
                onClick={handleBackNavigation}
                disabled={submitting || isNavigatingBack}
                className="flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 rounded-xl sm:rounded-2xl border-2 hover:border-blue-400 transition-all duration-200 text-sm sm:text-base font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px] max-w-[120px] sm:max-w-none"
              >
                <span className="truncate">Cancel</span>
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={submitting || !shouldEnableEndShift}
                className="flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation min-h-[48px] sm:min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                aria-label="Record all sales and proceed to shift report generation"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent animate-spin" />
                    <span className="text-sm sm:text-base font-semibold truncate">
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">Processing</span>
                    </span>
                  </div>
                ) : (
                  <span className="text-sm sm:text-base font-semibold truncate">
                    <span className="hidden sm:inline">Record All Sale</span>
                    <span className="sm:hidden">Record Sale</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Mobile-First Responsive */}
      {showConfirmationModal && !submitting && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm z-50 pointer-events-auto"
          style={{ 
            touchAction: 'none',
            width: '100vw',
            height: 'calc(100vh - 4rem)',
            margin: 0,
            padding: 0
          }}
        >
          <div 
            className="bg-white flex flex-col"
            style={{
              width: '100vw',
              height: 'calc(100vh - 4rem)',
              minHeight: 'calc(100vh - 4rem)',
              maxHeight: 'calc(100vh - 4rem)'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-center mb-3 sm:mb-6">
                <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-full">
                  <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center">No Remaining Bread</h1>
            </div>

            {/* Content - Takes remaining space */}
            <div className="flex-1 flex flex-col justify-center px-3 sm:px-6 py-4 sm:py-8 md:py-12 overflow-y-auto">
              <div className="max-w-md mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8 w-full">
                <p className="text-gray-700 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed px-4">
                  You didn&apos;t record any remaining bread. Do you want to continue generating the shift report?
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 mx-4">
                  <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-600" />
                  </div>
                  <p className="text-yellow-800 font-medium text-xs sm:text-sm md:text-base">
                    This will generate a shift report with no remaining inventory recorded.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer with Buttons - Fixed at bottom */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-6 md:pb-8">
              <div className="flex gap-2 sm:gap-3 md:gap-4 max-w-md mx-auto w-full">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1 py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-gray-300 hover:border-gray-400 transition-colors text-sm sm:text-base md:text-lg font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px] md:min-h-[60px]"
                  aria-label="Cancel and go back to main page"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmProceed}
                  className="flex-1 py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm sm:text-base md:text-lg font-semibold touch-manipulation min-h-[48px] sm:min-h-[56px] md:min-h-[60px] shadow-lg hover:shadow-xl transition-all text-white"
                  aria-label="Proceed to feedback modal"
                >
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal - Mobile-First Responsive Design */}
      {showFeedbackModal && !submitting && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm z-50 pointer-events-auto"
          style={{ 
            touchAction: 'none',
            width: '100vw',
            height: isKeyboardVisible ? `calc(${window.visualViewport?.height || window.innerHeight}px - 4rem)` : 'calc(100vh - 4rem)',
            margin: 0,
            padding: 0
          }}
        >
          <div 
            className="bg-white flex flex-col"
            style={{
              width: '100vw',
              height: isKeyboardVisible ? `calc(${window.visualViewport?.height || window.innerHeight}px - 4rem)` : 'calc(100vh - 4rem)',
              minHeight: 'auto',
              maxHeight: isKeyboardVisible ? `calc(${window.visualViewport?.height || window.innerHeight}px - 4rem)` : 'calc(100vh - 4rem)'
            }}
          >
            {/* Header - Collapsible on mobile when keyboard is visible */}
            <div className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white transition-all duration-300 ${
              isKeyboardVisible 
                ? 'px-3 py-2' // Compact header when keyboard is visible
                : 'px-3 sm:px-6 py-4 sm:py-6' // Full header when keyboard is hidden
            }`}>
              {!isKeyboardVisible && (
                <div className="flex items-center justify-center mb-3 sm:mb-6">
                  <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-full">
                    <Send className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                  </div>
                </div>
              )}
              <h1 className={`font-bold text-center transition-all duration-300 ${
                isKeyboardVisible 
                  ? 'text-base' // Smaller title when keyboard visible
                  : 'text-lg sm:text-xl md:text-2xl lg:text-3xl' // Full size when keyboard hidden
              }`}>Add Feedback</h1>
              {!isKeyboardVisible && (
                <p className="text-blue-100 text-center mt-1 sm:mt-2 md:mt-3 text-xs sm:text-sm md:text-base lg:text-lg">
                  Optional feedback for this shift
                </p>
              )}
            </div>

            {/* Content - Responsive height calculation */}
            <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${
              isKeyboardVisible 
                ? 'px-3 py-1' // Compact padding when keyboard visible
                : 'px-3 sm:px-6 py-4 sm:py-6 md:py-8' // Full padding when keyboard hidden
            }`}>
              <div className="max-w-2xl mx-auto w-full space-y-2 sm:space-y-3 md:space-y-4">
                {/* Info box - hide on mobile when keyboard is visible to save space */}
                {!isKeyboardVisible && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6">
                    <p className="text-blue-800 text-center font-medium text-xs sm:text-sm md:text-base">
                      Add any feedback or notes about this shift before generating the report.
                    </p>
                  </div>
                )}
                
                <div className="space-y-1 sm:space-y-2 md:space-y-3">
                  <label className="block text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                    Shift Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter feedback about this shift (optional)..."
                    className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg sm:rounded-xl resize-none text-sm sm:text-base leading-relaxed focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                    style={{
                      // Mobile-first responsive height calculation - accounting for header height
                      height: isKeyboardVisible 
                        ? 'calc(100vh - 320px)' // When keyboard visible: full viewport minus all chrome + header
                        : 'calc(100vh - 480px)', // When keyboard hidden: full viewport minus all chrome + header + info box
                      minHeight: '100px', // Ensure minimum usable height for small screens
                      maxHeight: isKeyboardVisible ? 'calc(100vh - 320px)' : '300px'
                    }}
                    aria-label="Shift feedback textarea"
                    autoComplete="off"
                    spellCheck="true"
                  />
                  {/* Help text - hide on mobile when keyboard visible to save space */}
                  {!isKeyboardVisible && (
                    <p className="text-gray-500 text-xs sm:text-sm">
                      This feedback will be included in the shift report for management review.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Buttons - Always visible and accessible */}
            <div className={`bg-white border-t border-gray-100 transition-all duration-300 ${
              isKeyboardVisible 
                ? 'px-3 py-2' // Compact footer when keyboard visible
                : 'px-3 sm:px-6 pb-4 sm:pb-6 md:pb-8 pt-3 sm:pt-4' // Full footer when keyboard hidden
            }`}>
              <div className="flex gap-2 sm:gap-3 md:gap-4 max-w-lg mx-auto w-full">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackModal(false)}
                  className={`flex-1 rounded-lg sm:rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-colors font-semibold touch-manipulation ${
                    isKeyboardVisible 
                      ? 'py-2 px-3 text-sm min-h-[44px]' // Compact when keyboard visible
                      : 'py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 text-sm sm:text-base md:text-lg min-h-[48px] sm:min-h-[56px] md:min-h-[60px]' // Full size when keyboard hidden
                  }`}
                  aria-label="Go back to previous step"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitWithFeedback}
                  disabled={submitting}
                  className={`flex-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all text-white font-semibold ${
                    isKeyboardVisible 
                      ? 'py-2 px-3 text-sm min-h-[44px]' // Compact when keyboard visible  
                      : 'py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6 text-sm sm:text-base md:text-lg min-h-[48px] sm:min-h-[56px] md:min-h-[60px]' // Full size when keyboard hidden
                  }`}
                  aria-label="Generate shift report with feedback"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <div className={`rounded-full border-2 border-white border-t-transparent animate-spin ${
                        isKeyboardVisible ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'
                      }`} />
                      <span className={isKeyboardVisible ? 'text-sm' : 'text-sm sm:text-base md:text-lg'}>
                        Generating...
                      </span>
                    </div>
                  ) : (
                    <span className={isKeyboardVisible ? 'text-sm' : 'text-sm sm:text-base md:text-lg'}>
                      Generate Report
                    </span>
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