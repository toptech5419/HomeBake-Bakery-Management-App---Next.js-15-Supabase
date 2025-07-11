'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'skeleton' | 'progressive';
  className?: string;
}

export const OptimizedLoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'md',
  variant = 'spinner',
  className
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 sm:h-8 sm:w-8',
    md: 'h-12 w-12 sm:h-16 sm:w-16',
    lg: 'h-16 w-16 sm:h-24 sm:w-24'
  };

  const messageSizeClasses = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg'
  };

  const containerClasses = cn(
    "flex flex-col items-center justify-center min-h-screen w-full bg-background px-4 py-8",
    className
  );

  if (variant === 'dots') {
    return (
      <div className={containerClasses} aria-busy="true" aria-live="polite" role="status">
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                sizeClasses[size],
                "bg-orange-500 rounded-full animate-pulse"
              )}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
        {message && (
          <p className={cn(
            "mt-6 text-center font-medium text-orange-500 max-w-sm",
            messageSizeClasses[size]
          )}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={containerClasses} aria-busy="true" aria-live="polite" role="status">
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
        {message && (
          <p className={cn(
            "mt-6 text-center font-medium text-orange-500 max-w-sm",
            messageSizeClasses[size]
          )}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'progressive') {
    return (
      <div className={containerClasses} aria-busy="true" aria-live="polite" role="status">
        <div className="space-y-4 w-full max-w-md">
          <div className="flex items-center space-x-3">
            <div className={cn(
              sizeClasses[size],
              "animate-spin text-orange-500"
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          {message && (
            <p className={cn(
              "text-center font-medium text-orange-500",
              messageSizeClasses[size]
            )}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} aria-busy="true" aria-live="polite" role="status">
      <div className="flex items-center justify-center">
        <svg
          className={cn(sizeClasses[size], "animate-spin text-orange-500")}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {message && (
        <p className={cn(
          "mt-6 text-center font-medium text-orange-500 max-w-sm",
          messageSizeClasses[size]
        )}>
          {message}
        </p>
      )}
    </div>
  );
};

// Skeleton Components for different content types
export const SkeletonCard = React.memo(({ className }: { className?: string }) => (
  <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
    <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
  </div>
));

export const SkeletonTable = React.memo(({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex space-x-2">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="h-3 bg-gray-200 rounded animate-pulse flex-1"></div>
        ))}
      </div>
    ))}
  </div>
));

export const SkeletonForm = React.memo(() => (
  <div className="space-y-4">
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
      <div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/5"></div>
      <div className="h-20 bg-gray-200 rounded animate-pulse w-full"></div>
    </div>
    <div className="h-10 bg-gray-200 rounded animate-pulse w-1/3"></div>
  </div>
));

export const SkeletonDashboard = React.memo(() => (
  <div className="space-y-6 p-4">
    {/* Header */}
    <div className="space-y-2">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
    </div>
    
    {/* Metrics Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    
    {/* Content Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
));

export const SkeletonList = React.memo(({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
        <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
      </div>
    ))}
  </div>
));

// Progressive Loading Component
export const ProgressiveLoading = React.memo(({ 
  steps, 
  currentStep = 0,
  onComplete 
}: { 
  steps: string[];
  currentStep?: number;
  onComplete?: () => void;
}) => {
  React.useEffect(() => {
    if (currentStep >= steps.length && onComplete) {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              index < currentStep 
                ? "bg-green-500 text-white" 
                : index === currentStep 
                ? "bg-orange-500 text-white animate-pulse"
                : "bg-gray-200 text-gray-500"
            )}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={cn(
              "text-sm",
              index < currentStep 
                ? "text-green-600 font-medium" 
                : index === currentStep 
                ? "text-orange-600 font-medium"
                : "text-gray-500"
            )}>
              {step}
            </span>
          </div>
        ))}
      </div>
      
      {currentStep < steps.length && (
        <div className="text-center text-sm text-gray-600">
          Loading... {currentStep + 1} of {steps.length}
        </div>
      )}
    </div>
  );
});

// Mobile-optimized loading components
export const MobileLoading = React.memo(({ 
  className, 
  message = 'Loading...', 
  fullScreen = false 
}: { 
  className?: string;
  message?: string;
  fullScreen?: boolean;
}) => {
  const wrapperClass = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={cn(wrapperClass, className)}>
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-8 h-8 bg-orange-500 rounded-full animate-ping absolute"></div>
          <div className="w-8 h-8 bg-orange-600 rounded-full relative"></div>
        </div>
        <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
});

export const MobilePageLoading = React.memo(() => (
  <div className="space-y-4 p-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
    <div className="grid gap-4">
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
));

// Export all components
export default OptimizedLoadingSpinner; 