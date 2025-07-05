'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
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
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg p-4 shadow-lg transition-all animate-in slide-in-from-bottom-2",
              toast.variant === 'destructive' 
                ? 'bg-red-600 text-white' 
                : 'bg-white border border-gray-200'
            )}
          >
            <div className="flex-1">
              <div className={cn(
                "font-medium",
                toast.variant === 'destructive' ? 'text-white' : 'text-gray-900'
              )}>
                {toast.title}
              </div>
              {toast.description && (
                <div className={cn(
                  "text-sm mt-1",
                  toast.variant === 'destructive' ? 'text-red-100' : 'text-gray-600'
                )}>
                  {toast.description}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={cn(
                "rounded-md p-1 transition-colors",
                toast.variant === 'destructive' 
                  ? 'hover:bg-red-700' 
                  : 'hover:bg-gray-100'
              )}
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