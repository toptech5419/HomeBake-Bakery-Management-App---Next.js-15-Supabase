'use client';

import { useOptimizedToast, createToastHelpers } from '@/components/ui/toast-optimized';
import { useCallback } from 'react';

/**
 * Enhanced toast hook with convenience methods and smart defaults
 * Provides Apple-quality feedback messages optimized for bakery operations
 */
export function useToast() {
  const { toast, dismiss, dismissAll } = useOptimizedToast();
  
  // Create helper methods with smart defaults
  const helpers = createToastHelpers(toast);
  
  // Enhanced methods with bakery-specific context
  const enhanced = {
    // Success messages
    success: useCallback((title: string, description?: string) => {
      helpers.success(title, description);
    }, [helpers]),

    // Error messages with retry support
    error: useCallback((title: string, description?: string, retryFn?: () => void) => {
      if (retryFn) {
        toast({
          title,
          description,
          type: 'error',
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: retryFn
          }
        });
      } else {
        helpers.error(title, description);
      }
    }, [helpers, toast]),

    // Info messages
    info: useCallback((title: string, description?: string) => {
      helpers.info(title, description);
    }, [helpers]),

    // Warning messages
    warning: useCallback((title: string, description?: string) => {
      helpers.warning(title, description);
    }, [helpers]),

    // Network status messages
    networkStatus: useCallback((isOnline: boolean) => {
      if (isOnline) {
        toast({
          title: '🌐 Connection Restored',
          description: 'You are back online',
          type: 'success',
          duration: 3000
        });
      } else {
        toast({
          title: '📡 Connection Lost',
          description: 'Working offline - changes will sync when connected',
          type: 'network',
          persistent: true
        });
      }
    }, [toast]),

    // Bakery-specific operation messages
    batchCreated: useCallback((batchName: string) => {
      helpers.success(
        '🥖 Batch Created',
        `${batchName} has been added to production`
      );
    }, [helpers]),

    saleRecorded: useCallback((breadType: string, quantity: number) => {
      helpers.success(
        '💰 Sale Recorded',
        `${quantity} ${breadType} sold successfully`
      );
    }, [helpers]),

    inventoryUpdated: useCallback(() => {
      helpers.success(
        '📦 Inventory Updated',
        'Stock levels have been refreshed'
      );
    }, [helpers]),

    shiftEnded: useCallback((shift: 'morning' | 'night') => {
      helpers.success(
        '🔄 Shift Completed',
        `${shift.charAt(0).toUpperCase() + shift.slice(1)} shift has ended`
      );
    }, [helpers]),

    // Auth-related messages
    loginSuccess: useCallback((userName: string) => {
      helpers.success(
        '👋 Welcome Back',
        `Hello ${userName}! Ready to bake?`
      );
    }, [helpers]),

    loginError: useCallback((errorMsg?: string) => {
      helpers.error(
        '🔒 Login Failed',
        errorMsg || 'Please check your credentials and try again'
      );
    }, [helpers]),

    // Form validation messages
    validationError: useCallback((field: string) => {
      helpers.warning(
        '⚠️ Incomplete Form',
        `Please check the ${field} field`
      );
    }, [helpers]),

    // Sync and data messages
    syncStarted: useCallback(() => {
      toast({
        title: '🔄 Syncing Data',
        description: 'Updating information...',
        type: 'info',
        duration: 2000
      });
    }, [toast]),

    syncCompleted: useCallback(() => {
      helpers.success(
        '✅ Sync Complete',
        'All data is up to date'
      );
    }, [helpers]),

    // Generic loading with auto-dismiss when operation completes
    loading: useCallback((message: string, operationPromise?: Promise<any>) => {
      const toastId = Date.now().toString();
      
      toast({
        title: '⏳ ' + message,
        type: 'info',
        persistent: true
      });

      if (operationPromise) {
        operationPromise
          .then(() => {
            dismiss(toastId);
            helpers.success('✅ Operation Complete');
          })
          .catch(() => {
            dismiss(toastId);
            helpers.error('❌ Operation Failed', 'Please try again');
          });
      }

      return toastId;
    }, [toast, dismiss, helpers]),

    // Utility methods
    dismiss,
    dismissAll,

    // Quick feedback for button presses
    buttonPressed: useCallback((actionName: string) => {
      toast({
        title: `${actionName}`,
        type: 'info',
        duration: 1500
      });
    }, [toast])
  };

  return enhanced;
}

export default useToast;