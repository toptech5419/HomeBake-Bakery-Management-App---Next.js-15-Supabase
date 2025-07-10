'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function MobileNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timers = useRef<{ [id: string]: NodeJS.Timeout }>({});

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newNotification: Notification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove after duration (unless persistent)
    if (!notification.persistent && notification.duration !== 0) {
      timers.current[id] = setTimeout(() => {
        clearNotification(id);
      }, notification.duration || 4000);
    }
  }, [clearNotification]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Bell className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = (type: Notification['type']) => {
    const baseStyles = "flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 ease-in-out transform";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification, clearAll }}>
      {children}
      
      {/* Mobile-first notification container */}
      <div className="fixed z-50 bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto flex flex-col gap-3 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              getStyles(notification.type),
              "animate-slide-in-bottom"
            )}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">{notification.title}</div>
              <div className="text-sm leading-relaxed">{notification.message}</div>
              
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-2 text-xs font-medium underline hover:no-underline transition-all"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            
            <button
              onClick={() => clearNotification(notification.id)}
              className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useMobileNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useMobileNotifications must be used within MobileNotificationProvider');
  }
  return context;
}

// Predefined notification helpers
export const NotificationHelpers = {
  success: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'success' as const, title, message, ...options };
  },
  
  error: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'error' as const, title, message, ...options };
  },
  
  warning: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'warning' as const, title, message, ...options };
  },
  
  info: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'info' as const, title, message, ...options };
  },
  
  // Role-specific notifications
  salesSuccess: (message: string) => ({
    type: 'success' as const,
    title: 'Sale Recorded',
    message,
    duration: 3000
  }),
  
  productionAlert: (message: string) => ({
    type: 'warning' as const,
    title: 'Production Alert',
    message,
    duration: 5000
  }),
  
  inventoryWarning: (item: string, quantity: number) => ({
    type: 'warning' as const,
    title: 'Low Stock Alert',
    message: `${item} is running low (${quantity} remaining)`,
    duration: 6000,
    action: {
      label: 'View Inventory',
      onClick: () => window.location.href = '/dashboard/inventory'
    }
  }),
  
  syncComplete: (itemCount: number) => ({
    type: 'success' as const,
    title: 'Sync Complete',
    message: `${itemCount} items successfully synced`,
    duration: 3000
  }),
  
  offlineWarning: () => ({
    type: 'warning' as const,
    title: 'Offline Mode',
    message: 'You are offline. Data will sync when connection is restored.',
    persistent: true,
    action: {
      label: 'Retry Connection',
      onClick: () => window.location.reload()
    }
  })
}; 