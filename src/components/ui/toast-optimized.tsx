'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Wifi } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'network';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toast: (props: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Queue Manager for performance
class ToastQueue {
  private queue: Toast[] = [];
  private maxToasts = 5;
  private listeners: Set<() => void> = new Set();

  add(toast: Toast) {
    // Remove oldest toast if at capacity
    if (this.queue.length >= this.maxToasts) {
      this.queue.shift();
    }
    
    this.queue.push(toast);
    this.notifyListeners();
  }

  remove(id: string) {
    this.queue = this.queue.filter(t => t.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.queue = [];
    this.notifyListeners();
  }

  getAll(): Toast[] {
    return [...this.queue];
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

const toastQueue = new ToastQueue();

export function OptimizedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Subscribe to toast queue changes
  useEffect(() => {
    const unsubscribe = toastQueue.subscribe(() => {
      setToasts(toastQueue.getAll());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    
    toastQueue.remove(id);
  }, []);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    const newToast: Toast = { 
      ...props, 
      id,
      duration: props.duration ?? (props.type === 'error' ? 6000 : 4000)
    };
    
    toastQueue.add(newToast);
    
    // Auto-dismiss timer
    if (!newToast.persistent && newToast.duration !== 0) {
      const timer = setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
      
      timers.current.set(id, timer);
    }
  }, [dismiss]);

  const dismissAll = useCallback(() => {
    // Clear all timers
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current.clear();
    
    toastQueue.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Individual Toast Component
const ToastItem = React.memo(({ 
  toast, 
  onDismiss,
  isMobile = false
}: { 
  toast: Toast; 
  onDismiss: (id: string) => void;
  isMobile?: boolean;
}) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
      case 'network':
        return <Wifi className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    const baseStyles = cn(
      "flex items-start gap-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ease-in-out transform",
      isMobile 
        ? "p-5 min-h-[80px] touch-manipulation text-base shadow-2xl" 
        : "p-4 max-w-md text-sm shadow-lg"
    );
    
    switch (toast.type) {
      case 'success':
        return cn(baseStyles, "bg-green-50/95 border-green-200 text-green-900 shadow-green-100");
      case 'error':
        return cn(baseStyles, "bg-red-50/95 border-red-200 text-red-900 shadow-red-100");
      case 'warning':
        return cn(baseStyles, "bg-yellow-50/95 border-yellow-200 text-yellow-900 shadow-yellow-100");
      case 'info':
        return cn(baseStyles, "bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-100");
      case 'network':
        return cn(baseStyles, "bg-orange-50/95 border-orange-200 text-orange-900 shadow-orange-100");
      default:
        return cn(baseStyles, "bg-white/95 border-gray-200 text-gray-900 shadow-gray-100");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 50 : -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ 
        opacity: 0, 
        y: isMobile ? 50 : -50, 
        scale: 0.95,
        transition: { duration: 0.2 }
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.3
      }}
      layout
      className={getStyles()}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <motion.div 
        className="flex-shrink-0 mt-0.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
      >
        {getIcon()}
      </motion.div>
      
      <div className="flex-1 min-w-0">
        <motion.div 
          className={cn("font-medium mb-1", isMobile ? "text-base" : "text-sm")}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          {toast.title}
        </motion.div>
        {toast.description && (
          <motion.div 
            className={cn("leading-relaxed", isMobile ? "text-base" : "text-sm")}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {toast.description}
          </motion.div>
        )}
        {toast.action && (
          <motion.button
            onClick={toast.action.onClick}
            className={cn(
              "mt-2 text-xs font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded",
              isMobile ? "min-h-[44px] px-2 py-1 touch-manipulation" : ""
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {toast.action.label}
          </motion.button>
        )}
      </div>
      
      <motion.button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          "flex-shrink-0 ml-2 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors",
          isMobile ? "p-2 min-h-[44px] min-w-[44px] touch-manipulation" : "p-1"
        )}
        aria-label="Dismiss notification"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
      </motion.button>
    </motion.div>
  );
});
ToastItem.displayName = 'ToastItem';

// Toast Container with mobile-first positioning and smooth animations
const ToastContainer = React.memo(({ 
  toasts, 
  onDismiss 
}: { 
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) => {
  return (
    <>
      {/* Mobile toasts - bottom positioned with safe area support */}
      <div className="fixed z-50 bottom-4 left-4 right-4 sm:hidden pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <AnimatePresence mode="popLayout">
          <motion.div
            className="flex flex-col gap-3"
            layout
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItem toast={toast} onDismiss={onDismiss} isMobile />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Desktop toasts - top-right positioned */}
      <div className="hidden sm:flex fixed z-50 top-4 right-4 max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          <motion.div
            className="flex flex-col gap-3"
            layout
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <ToastItem toast={toast} onDismiss={onDismiss} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
});
ToastContainer.displayName = 'ToastContainer';

// Hook for using toast
export function useOptimizedToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useOptimizedToast must be used within OptimizedToastProvider');
  }
  return context;
}

// Convenience methods
export const createToastHelpers = (toast: ToastContextType['toast']) => ({
  success: (title: string, description?: string) => 
    toast({ title, description, type: 'success' }),
  error: (title: string, description?: string) => 
    toast({ title, description, type: 'error' }),
  warning: (title: string, description?: string) => 
    toast({ title, description, type: 'warning' }),
  info: (title: string, description?: string) => 
    toast({ title, description, type: 'info' }),
  network: (title: string, description?: string) => 
    toast({ title, description, type: 'network' }),
  persistent: (title: string, description?: string, type: Toast['type'] = 'info') => 
    toast({ title, description, type, persistent: true }),
  withAction: (title: string, description: string, action: Toast['action'], type: Toast['type'] = 'info') => 
    toast({ title, description, type, action }),
});

// Network status toast helper
export const showNetworkStatus = (isOnline: boolean, toast: ToastContextType['toast']) => {
  if (isOnline) {
    toast({
      title: 'Connection Restored',
      description: 'You are back online',
      type: 'success',
      duration: 3000
    });
  } else {
    toast({
      title: 'Connection Lost',
      description: 'You are currently offline',
      type: 'network',
      duration: 0, // Persistent until connection restored
      persistent: true
    });
  }
};

// Error toast helper with retry action
export const showErrorWithRetry = (
  title: string, 
  description: string, 
  retryFn: () => void,
  toast: ToastContextType['toast']
) => {
  toast({
    title,
    description,
    type: 'error',
    action: {
      label: 'Retry',
      onClick: retryFn
    },
    duration: 8000
  });
};

// Success toast helper
export const showSuccess = (title: string, toast: ToastContextType['toast'], description?: string) => {
  toast({
    title,
    description,
    type: 'success',
    duration: 4000
  });
};

// Info toast helper
export const showInfo = (title: string, toast: ToastContextType['toast'], description?: string) => {
  toast({
    title,
    description,
    type: 'info',
    duration: 4000
  });
};
