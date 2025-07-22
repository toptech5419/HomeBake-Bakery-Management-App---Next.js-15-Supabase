'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large' | 'full';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  badge?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray';
}

const statusColors = {
  success: 'border-green-200 bg-green-50',
  warning: 'border-orange-200 bg-orange-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
  neutral: 'border-gray-200 bg-white'
};

const colorClasses = {
  green: 'text-green-600 bg-green-100',
  blue: 'text-blue-600 bg-blue-100',
  purple: 'text-purple-600 bg-purple-100',
  orange: 'text-orange-600 bg-orange-100',
  red: 'text-red-600 bg-red-100',
  gray: 'text-gray-600 bg-gray-100'
};

const sizeClasses = {
  small: 'p-3 min-h-[100px]',
  medium: 'p-4 min-h-[120px]',
  large: 'p-6 min-h-[160px]',
  full: 'p-4 sm:p-6'
};

export function ModernCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  status = 'neutral',
  size = 'medium',
  className,
  children,
  onClick,
  loading = false,
  badge,
  color = 'gray'
}: ModernCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 w-full',
        sizeClasses[size],
        status && statusColors[status],
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      {loading ? (
        <div className="animate-pulse w-full">
          <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2 w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {icon && (
                <div className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  colorClasses[color]
                )}>
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {badge && (
              <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full flex-shrink-0">
                {badge}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            {children ? (
              children
            ) : (
              <>
                {value !== undefined && (
                  <div className="mb-2">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </span>
                  </div>
                )}
                {trend && (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-medium flex items-center gap-1',
                      trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}>
                      {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                    </span>
                    <span className="text-sm text-gray-500">
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

export function MetricCard(props: Omit<ModernCardProps, 'size'>) {
  return <ModernCard {...props} size="medium" />;
}

export function ActionCard(props: Omit<ModernCardProps, 'value' | 'size'>) {
  return <ModernCard {...props} size="small" />;
}

export function InfoCard(props: Omit<ModernCardProps, 'size'>) {
  return <ModernCard {...props} size="large" />;
}
