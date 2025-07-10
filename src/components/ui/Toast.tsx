import React from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  title?: string;
  duration?: number;
}

interface ToastProps {
  message: string;
  type: ToastMessage["type"];
  onClose: () => void;
  title?: string;
  duration?: number;
}

export function Toast({ message, type, onClose, title, duration = 4000 }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case "error":
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case "info":
        return <Info className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "fixed z-50 flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 ease-in-out transform";
    
    switch (type) {
      case "success":
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case "error":
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case "warning":
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case "info":
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  return (
    <div
      className={`${getStyles()} animate-slide-in-right`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-medium text-sm mb-1">{title}</div>
        )}
        <div className="text-sm leading-relaxed">{message}</div>
      </div>
      
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
} 