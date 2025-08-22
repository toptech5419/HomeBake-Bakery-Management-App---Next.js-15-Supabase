'use client';

import { useMobileNotifications, NotificationHelpers } from './mobile-notifications-enhanced';

/**
 * Toast API compatibility layer for existing components
 * Wraps the existing MobileNotificationProvider with a simple toast.success/error API
 */
export function useToast() {
  const { showNotification } = useMobileNotifications();
  
  return {
    success: (message: string) => {
      showNotification(NotificationHelpers.success('Success', message));
    },
    
    error: (message: string) => {
      showNotification(NotificationHelpers.error('Error', message));
    },
    
    warning: (message: string) => {
      showNotification(NotificationHelpers.warning('Warning', message));
    },
    
    info: (message: string) => {
      showNotification(NotificationHelpers.info('Info', message));
    }
  };
}

// Export empty ToastProvider since MobileNotificationProvider handles everything
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}