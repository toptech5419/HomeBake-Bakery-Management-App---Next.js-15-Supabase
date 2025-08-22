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
  variant?: "mobile" | "desktop";
}

export function Toast({ message, type, onClose, title, duration = 4000, variant = "desktop" }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    const iconSize = variant === "mobile" ? "w-6 h-6" : "w-5 h-5";
    const iconClass = `${iconSize} flex-shrink-0`;
    
    switch (type) {
      case "success":
        return <CheckCircle className={iconClass} />;
      case "error":
        return <AlertCircle className={iconClass} />;
      case "warning":
        return <AlertTriangle className={iconClass} />;
      case "info":
        return <Info className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getStyles = () => {
    // Mobile-first responsive sizing and positioning
    const mobileStyles = variant === "mobile" 
      ? "p-5 rounded-2xl text-base min-h-[80px] toast-shadow-mobile" 
      : "p-4 rounded-lg text-sm";
    
    const baseStyles = `relative w-full flex items-start gap-4 ${mobileStyles} shadow-lg border transition-all duration-300 ease-in-out transform toast-no-select`;
    
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

  const getAnimation = () => {
    return variant === "mobile" ? "animate-slide-in-right" : "animate-slide-in-right";
  };

  const getCloseButtonSize = () => {
    return variant === "mobile" ? "w-6 h-6" : "w-4 h-4";
  };

  const getCloseButtonPadding = () => {
    return variant === "mobile" ? "p-2" : "p-1";
  };

  const getTitleStyles = () => {
    return variant === "mobile" ? "font-semibold text-base mb-2" : "font-medium text-sm mb-1";
  };

  const getMessageStyles = () => {
    return variant === "mobile" ? "text-base leading-relaxed" : "text-sm leading-relaxed";
  };

  return (
    <div
      className={`${getStyles()} ${getAnimation()}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className={`flex-shrink-0 ${variant === "mobile" ? "mt-1" : "mt-0.5"}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <div className={getTitleStyles()}>{title}</div>
        )}
        <div className={getMessageStyles()}>{message}</div>
      </div>
      
      <button
        onClick={onClose}
        className={`flex-shrink-0 ml-2 ${getCloseButtonPadding()} rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors toast-close-button`}
        aria-label="Dismiss notification"
      >
        <X className={getCloseButtonSize()} />
      </button>
    </div>
  );
} 