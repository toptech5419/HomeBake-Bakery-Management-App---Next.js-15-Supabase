'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

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
    return unsubscribe;
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
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: (id: string) => void;
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
    const baseStyles = "flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 ease-in-out transform";
    
    switch (toast.type) {
      case 'success':
        return cn(baseStyles, "bg-green-50 border-green-200 text-green-800");
      case 'error':
        return cn(baseStyles, "bg-red-50 border-red-200 text-red-800");
      case 'warning':
        return cn(baseStyles, "bg-yellow-50 border-yellow-200 text-yellow-800");
      case 'info':
        return cn(baseStyles, "bg-blue-50 border-blue-200 text-blue-800");
      case 'network':
        return cn(baseStyles, "bg-orange-50 border-orange-200 text-orange-800");
      default:
        return cn(baseStyles, "bg-gray-50 border-gray-200 text-gray-800");
    }
  };

  return (
    <div
      className={cn(
        getStyles(),
        "animate-in slide-in-from-bottom-2"
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-1">{toast.title}</div>
        {toast.description && (
          <div className="text-sm leading-relaxed">{toast.description}</div>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
});

// Toast Container with mobile-first positioning
const ToastContainer = React.memo(({ 
  toasts, 
  onDismiss 
}: { 
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) => {
  return (
    <div className="fixed z-50 bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
});

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
export const showSuccess = (title: string, description?: string, toast: ToastContextType['toast']) => {
  toast({
    title,
    description,
    type: 'success',
    duration: 4000
  });
};

// Info toast helper
export const showInfo = (title: string, description?: string, toast: ToastContextType['toast']) => {
  toast({
    title,
    description,
    type: 'info',
    duration: 4000
  });
}; 