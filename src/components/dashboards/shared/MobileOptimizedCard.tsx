// MOBILE-FIRST RESPONSIVE CARD COMPONENT (2024-06)
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value?: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
  touchFeedback?: boolean;
}

const statusColors = {
  success: 'border-green-200 bg-green-50',
  warning: 'border-orange-200 bg-orange-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50'
};

export function MobileOptimizedCard({
  title,
  subtitle,
  icon,
  value,
  trend,
  status,
  onClick,
  loading = false,
  children,
  className,
  touchFeedback = true
}: MobileOptimizedCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 w-full max-w-full min-h-[44px] p-2 sm:p-4 overflow-x-hidden',
        status && statusColors[status],
        onClick && 'cursor-pointer',
        touchFeedback && onClick && 'active:scale-[0.98] active:shadow-lg',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {loading ? (
        <div className="animate-pulse w-full max-w-full">
          <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-2 w-full max-w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {icon && (
                <div className="flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {onClick && (
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 w-full max-w-full">
            {children ? (
              children
            ) : (
              <>
                {value !== undefined && (
                  <div className="mb-1 w-full max-w-full">
                    <span className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </span>
                  </div>
                )}
                {trend && (
                  <div className="flex items-center gap-1 w-full max-w-full">
                    <span className={cn('text-xs font-medium flex-shrink-0', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
                      {trend.isPositive ? '↗' : '↘'} {trend.value}%
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {trend.label}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TouchOptimizedButton({
  children,
  onClick,
  className,
  disabled = false,
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 w-full max-w-full',
        'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const [startX, setStartX] = React.useState<number | null>(null);
  const [currentX, setCurrentX] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (startX && currentX) {
      const diff = startX - currentX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diff < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    }

    setStartX(null);
    setCurrentX(null);
  };

  const translateX = startX && currentX ? startX - currentX : 0;

  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out',
        className
      )}
      style={{
        transform: `translateX(${translateX}px)`
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {children}
    </div>
  );
} 