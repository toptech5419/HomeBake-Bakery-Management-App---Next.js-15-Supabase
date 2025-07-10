"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Toast, ToastMessage } from "./Toast";

interface ToastContextType {
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<{ [id: string]: NodeJS.Timeout }>({});

  const removeToast = useCallback((id: string) => {
    setToasts((toasts) => toasts.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback((
    type: ToastMessage["type"], 
    message: string, 
    title?: string, 
    duration?: number
  ) => {
    const id = Math.random().toString(36).slice(2);
    const toast: ToastMessage = { 
      id, 
      type, 
      message, 
      title, 
      duration: duration || 4000 
    };
    
    setToasts((toasts) => [...toasts, toast]);
    
    // Auto-remove after duration (handled by Toast component)
    if (duration !== 0) { // 0 means persistent
      timers.current[id] = setTimeout(() => removeToast(id), duration || 4000);
    }
  }, [removeToast]);

  const contextValue: ToastContextType = {
    success: (msg, title, duration) => addToast("success", msg, title, duration),
    error: (msg, title, duration) => addToast("error", msg, title, duration),
    info: (msg, title, duration) => addToast("info", msg, title, duration),
    warning: (msg, title, duration) => addToast("warning", msg, title, duration),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Mobile-first positioning: bottom on mobile, top-right on desktop */}
      <div className="fixed z-50 bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            title={toast.title}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
} 