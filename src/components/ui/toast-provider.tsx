'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  icon?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (props: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...props, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after specified duration or default 4 seconds
    const duration = props.duration || 4000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (variant: Toast['variant']) => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400';
      case 'destructive':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400';
      default:
        return 'bg-white/95 backdrop-blur-md text-foreground border-border shadow-xl';
    }
  };

  const getToastIcon = (variant: Toast['variant'], customIcon?: string) => {
    if (customIcon) return customIcon;
    switch (variant) {
      case 'success': return '✅';
      case 'destructive': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toastItem, index) => (
          <div
            key={toastItem.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-slide-in-right border hover-lift-subtle",
              getToastStyles(toastItem.variant)
            )}
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-lg">
                {getToastIcon(toastItem.variant, toastItem.icon)}
              </span>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold font-display text-sm">
                {toastItem.title}
              </div>
              {toastItem.description && (
                <div className="text-xs mt-1 opacity-90 leading-relaxed">
                  {toastItem.description}
                </div>
              )}
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => removeToast(toastItem.id)}
              className="flex-shrink-0 p-1 rounded-lg transition-all duration-200 hover:bg-white/20 hover-scale focus-ring"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}