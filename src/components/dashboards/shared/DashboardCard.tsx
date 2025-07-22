// MOBILE-FIRST RESPONSIVE REFACTOR (2024-06)
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const statusColors = {
  success: 'border-green-200 bg-green-50',
  warning: 'border-orange-200 bg-orange-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50'
};

export function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  status,
  className,
  children,
  onClick,
  loading = false
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 w-full max-w-full min-h-[44px] p-2 sm:p-4 overflow-x-hidden',
        status && statusColors[status],
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
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
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                {title}
              </h3>
            </div>
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
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-2 w-full max-w-full">
                    {subtitle}
                  </p>
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

export function MetricCard(props: Omit<DashboardCardProps, 'size'>) {
  return <DashboardCard {...props} />;
}

export function ActionCard(props: Omit<DashboardCardProps, 'value' | 'size'>) {
  return <DashboardCard {...props} />;
} 