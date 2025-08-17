'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Package, BarChart3, Download, FileText, AlertCircle } from 'lucide-react';

interface ProductionLoadingProps {
  type?: 'page' | 'card' | 'inline' | 'modal' | 'button';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  icon?: React.ElementType;
}

export function ProductionLoading({ 
  type = 'card', 
  message, 
  size = 'md', 
  className = '',
  showIcon = true,
  icon: Icon = Loader2
}: ProductionLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const containerClasses = {
    page: 'min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center',
    card: 'bg-white rounded-xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center',
    inline: 'flex items-center justify-center',
    modal: 'flex flex-col items-center justify-center p-6',
    button: 'flex items-center justify-center gap-2'
  };

  if (type === 'button') {
    return (
      <div className={`${containerClasses[type]} ${className}`}>
        {showIcon && <Icon className={`${sizeClasses[size]} animate-spin`} />}
        {message && <span className="text-sm">{message}</span>}
      </div>
    );
  }

  if (type === 'inline') {
    return (
      <div className={`${containerClasses[type]} ${className}`}>
        {showIcon && <Icon className={`${sizeClasses[size]} animate-spin text-orange-500`} />}
        {message && <span className="ml-2 text-gray-600 text-sm">{message}</span>}
      </div>
    );
  }

  return (
    <div className={`${containerClasses[type]} ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {showIcon && (
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full blur opacity-20"></div>
            <div className="relative w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <Icon className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        )}
        
        {message ? (
          <p className="text-gray-600 font-medium">{message}</p>
        ) : (
          <p className="text-gray-600">Loading...</p>
        )}
        
        {type === 'page' && (
          <div className="mt-4">
            <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Skeleton components for consistent loading states
export function BatchSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="p-3 rounded-lg border border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-12 bg-gray-200 rounded"></div>
            </div>
            <div className="h-3 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="text-right">
            <div className="h-6 w-12 bg-gray-200 rounded mb-1"></div>
            <div className="h-2 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-20 bg-gray-200 rounded-full"></div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading states for specific page types
export function PageLoadingStates() {
  return {
    dashboard: (
      <ProductionLoading 
        type="page" 
        message="Loading dashboard..."
        icon={BarChart3}
      />
    ),
    batches: (
      <ProductionLoading 
        type="page" 
        message="Loading production batches..."
        icon={Package}
      />
    ),
    reports: (
      <ProductionLoading 
        type="page" 
        message="Loading reports..."
        icon={FileText}
      />
    ),
    export: (
      <ProductionLoading 
        type="page" 
        message="Preparing export..."
        icon={Download}
      />
    ),
  };
}

// Error states for consistent error handling
interface ProductionErrorProps {
  message?: string;
  onRetry?: () => void;
  type?: 'page' | 'card' | 'inline';
  showRetry?: boolean;
  className?: string;
}

export function ProductionError({ 
  message = "Something went wrong", 
  onRetry,
  type = 'card',
  showRetry = true,
  className = ''
}: ProductionErrorProps) {
  const containerClasses = {
    page: 'min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4',
    card: 'bg-white rounded-xl p-8 shadow-sm border border-red-100 flex flex-col items-center justify-center text-center',
    inline: 'flex items-center justify-center text-center'
  };

  return (
    <div className={`${containerClasses[type]} ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops!</h3>
        <p className="text-gray-600 mb-6 max-w-sm">{message}</p>
        
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
          >
            Try Again
          </button>
        )}
      </motion.div>
    </div>
  );
}