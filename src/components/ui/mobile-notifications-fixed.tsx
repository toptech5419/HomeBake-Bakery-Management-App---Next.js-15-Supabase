'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
  // Enhanced properties
  dismissible?: boolean;
  soundEnabled?: boolean;
  priority?: 'low' | 'normal' | 'high';
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
  const [safeAreaInsets, setSafeAreaInsets] = useState({ bottom: 16, top: 16, left: 16, right: 16 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Detect mounting and screen size on client side only
  useEffect(() => {
    setIsMounted(true);
    const updateScreenSize = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);
  
  // Detect safe area insets on mount
  useEffect(() => {
    if (!isMounted) return;
    
    const updateSafeAreas = () => {
      // Get CSS safe area values or fallback to defaults
      const bottomInset = Math.max(
        16, 
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom').replace('px', '')) || 0
      );
      const topInset = Math.max(
        16,
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top').replace('px', '')) || 0
      );
      const leftInset = Math.max(
        16,
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left').replace('px', '')) || 0
      );
      const rightInset = Math.max(
        16,
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right').replace('px', '')) || 0
      );
      
      setSafeAreaInsets({
        bottom: bottomInset,
        top: topInset,
        left: leftInset,
        right: rightInset,
      });
    };
    
    updateSafeAreas();
    window.addEventListener('resize', updateSafeAreas);
    return () => window.removeEventListener('resize', updateSafeAreas);
  }, [isMounted]);

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
    const newNotification: Notification = { 
      dismissible: true, 
      soundEnabled: false,
      priority: 'normal',
      ...notification, 
      id 
    };
    
    // Limit to max 5 notifications for performance
    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 5);
      return updated;
    });
    
    // Play notification sound if enabled and supported
    if (newNotification.soundEnabled && isMounted && 'Audio' in window) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors silently
      } catch (error) {
        // Ignore audio errors
      }
    }
    
    // Auto-remove after duration (unless persistent)
    if (!notification.persistent && notification.duration !== 0) {
      timers.current[id] = setTimeout(() => {
        clearNotification(id);
      }, notification.duration || 4000);
    }
  }, [clearNotification, isMounted]);

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
    const baseStyles = "flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-md";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50/95 border-green-200 text-green-800 shadow-green-500/20`;
      case 'error':
        return `${baseStyles} bg-red-50/95 border-red-200 text-red-800 shadow-red-500/20`;
      case 'warning':
        return `${baseStyles} bg-yellow-50/95 border-yellow-200 text-yellow-800 shadow-yellow-500/20`;
      case 'info':
        return `${baseStyles} bg-blue-50/95 border-blue-200 text-blue-800 shadow-blue-500/20`;
      default:
        return `${baseStyles} bg-gray-50/95 border-gray-200 text-gray-800`;
    }
  };
  
  // Handle swipe to dismiss
  const handleDragEnd = (id: string) => {
    return (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldDismiss = Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500;
      if (shouldDismiss) {
        clearNotification(id);
      }
    };
  };

  // Don't render notifications until mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <NotificationContext.Provider value={{ showNotification, clearNotification, clearAll }}>
        {children}
      </NotificationContext.Provider>
    );
  }

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification, clearAll }}>
      {children}
      
      {/* Enhanced mobile-first notification container */}
      <div 
        className={cn(
          "fixed z-40 pointer-events-none",
          // Use Tailwind responsive classes instead of inline styles
          isDesktop 
            ? "top-4 right-4 left-auto bottom-auto" 
            : "bottom-4 left-4 right-4 top-auto"
        )}
        style={{
          // Only apply safe area insets, no responsive logic here
          paddingBottom: !isDesktop ? `${Math.max(safeAreaInsets.bottom - 16, 0)}px` : '0px',
          paddingTop: isDesktop ? `${Math.max(safeAreaInsets.top - 16, 0)}px` : '0px',
          paddingLeft: `${Math.max(safeAreaInsets.left - 16, 0)}px`,
          paddingRight: `${Math.max(safeAreaInsets.right - 16, 0)}px`,
        }}
      >
        <div className="flex flex-col gap-2 max-w-sm mx-auto sm:mx-0 sm:ml-auto">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ 
                  opacity: 0, 
                  y: isDesktop ? -50 : 50,
                  scale: 0.95,
                  filter: 'blur(4px)'
                }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)',
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: isDesktop ? -30 : 30,
                  scale: 0.9,
                  filter: 'blur(2px)',
                  transition: {
                    duration: 0.2
                  }
                }}
                drag={notification.dismissible ? "x" : false}
                dragConstraints={{ left: -200, right: 200 }}
                dragElastic={0.2}
                onDragEnd={notification.dismissible ? handleDragEnd(notification.id) : undefined}
                whileDrag={{ 
                  scale: 1.05, 
                  rotate: Math.random() * 4 - 2,
                  zIndex: 10000 + index
                }}
                style={{
                  zIndex: 9999 - index,
                  // Stacking offset for multiple notifications
                  marginTop: index > 0 ? '-8px' : '0',
                }}
                className={cn(
                  getStyles(notification.type),
                  "pointer-events-auto cursor-default",
                  notification.dismissible && "cursor-grab active:cursor-grabbing",
                  notification.priority === 'high' && "ring-2 ring-orange-400 ring-opacity-50"
                )}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1 select-none">{notification.title}</div>
                  <div className="text-sm leading-relaxed select-none">{notification.message}</div>
                  
                  {notification.action && (
                    <button
                      onClick={notification.action.onClick}
                      className="mt-2 text-xs font-medium underline hover:no-underline transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded px-1"
                    >
                      {notification.action.label}
                    </button>
                  )}
                  
                  {notification.dismissible && (
                    <div className="text-xs text-gray-500 mt-1 select-none opacity-70">
                      Swipe to dismiss
                    </div>
                  )}
                </div>
                
                {notification.dismissible !== false && (
                  <button
                    onClick={() => clearNotification(notification.id)}
                    className="flex-shrink-0 ml-2 p-2 rounded-full hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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

// Enhanced notification helpers
export const NotificationHelpers = {
  success: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'success' as const, title, message, ...options };
  },
  
  error: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'error' as const, title, message, priority: 'high' as const, ...options };
  },
  
  warning: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'warning' as const, title, message, priority: 'normal' as const, ...options };
  },
  
  info: (title: string, message: string, options?: Partial<Notification>) => {
    return { type: 'info' as const, title, message, priority: 'low' as const, ...options };
  },
  
  // Role-specific notifications with enhanced features
  salesSuccess: (message: string) => ({
    type: 'success' as const,
    title: 'Sale Recorded',
    message,
    duration: 3000,
    soundEnabled: true,
    priority: 'normal' as const
  }),
  
  productionAlert: (message: string) => ({
    type: 'warning' as const,
    title: 'Production Alert',
    message,
    duration: 5000,
    priority: 'high' as const,
    soundEnabled: true
  }),
  
  inventoryWarning: (item: string, quantity: number) => ({
    type: 'warning' as const,
    title: 'Low Stock Alert',
    message: `${item} is running low (${quantity} remaining)`,
    duration: 6000,
    priority: 'high' as const,
    soundEnabled: true,
    action: {
      label: 'View Inventory',
      onClick: () => window.location.href = '/dashboard/inventory'
    }
  }),
  
  syncComplete: (itemCount: number) => ({
    type: 'success' as const,
    title: 'Sync Complete',
    message: `${itemCount} items successfully synced`,
    duration: 3000,
    priority: 'low' as const
  }),
  
  offlineWarning: () => ({
    type: 'warning' as const,
    title: 'Offline Mode',
    message: 'You are offline. Data will sync when connection is restored.',
    persistent: true,
    priority: 'high' as const,
    dismissible: false,
    action: {
      label: 'Retry Connection',
      onClick: () => window.location.reload()
    }
  }),
  
  // New enhanced helpers
  criticalError: (title: string, message: string) => ({
    type: 'error' as const,
    title,
    message,
    persistent: true,
    priority: 'high' as const,
    soundEnabled: true,
    dismissible: false
  }),
  
  quickSuccess: (message: string) => ({
    type: 'success' as const,
    title: 'Success',
    message,
    duration: 2000,
    priority: 'low' as const
  })
};