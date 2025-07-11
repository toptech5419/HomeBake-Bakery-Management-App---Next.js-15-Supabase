'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type CardSize = 'large' | 'medium' | 'compact';
export type CardType = 'primary' | 'secondary' | 'action' | 'metric';

interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  size?: CardSize;
  type?: CardType;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
    loading?: boolean;
  };
  badge?: {
    label: string;
    color: string;
  };
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const getSizeClasses = (size: CardSize): string => {
  switch (size) {
    case 'large':
      return 'h-40 min-w-[300px]';
    case 'medium':
      return 'h-32 min-w-[250px]';
    case 'compact':
      return 'h-24 min-w-[180px]';
    default:
      return 'h-32 min-w-[250px]';
  }
};

const getTypeClasses = (type: CardType): string => {
  switch (type) {
    case 'primary':
      return 'bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg hover:shadow-xl';
    case 'secondary':
      return 'bg-white border-gray-200 shadow-md hover:shadow-lg';
    case 'action':
      return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-md hover:shadow-lg hover:from-blue-100 hover:to-indigo-100 cursor-pointer';
    case 'metric':
      return 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200 shadow-lg';
    default:
      return 'bg-white border-gray-200 shadow-md hover:shadow-lg';
  }
};

export function DashboardCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  size = 'medium',
  type = 'secondary',
  trend,
  action,
  badge,
  children,
  className,
  onClick,
  disabled = false,
  loading = false,
}: DashboardCardProps) {
  const isClickable = onClick || type === 'action';

  return (
    <Card
      className={cn(
        getSizeClasses(size),
        getTypeClasses(type),
        'relative overflow-hidden transition-all duration-300 ease-in-out',
        isClickable && !disabled && 'transform hover:scale-[1.02] hover:-translate-y-1',
        disabled && 'opacity-60 cursor-not-allowed',
        loading && 'animate-pulse',
        className
      )}
      onClick={!disabled && onClick ? onClick : undefined}
    >
      <div className="h-full p-4 sm:p-6 flex flex-col justify-between">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {Icon && (
                <div className={cn('p-2 rounded-full bg-opacity-20', iconColor.replace('text-', 'bg-'))}>
                  <Icon className={cn('h-5 w-5', iconColor)} />
                </div>
              )}
              <h3 className="text-sm font-semibold text-gray-700 truncate">
                {title}
              </h3>
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          
          {badge && (
            <Badge 
              className={cn(
                'text-xs font-medium',
                badge.color
              )}
            >
              {badge.label}
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          ) : (
            <>
              {value && (
                <div className="mb-2">
                  <span className={cn(
                    'font-bold text-gray-900',
                    size === 'large' ? 'text-3xl' : size === 'medium' ? 'text-2xl' : 'text-xl'
                  )}>
                    {value}
                  </span>
                  {trend && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn(
                        'text-xs font-medium',
                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                      )}>
                        {trend.isPositive ? '↗' : '↘'} {trend.value}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {trend.label}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {description}
                </p>
              )}
              
              {children}
            </>
          )}
        </div>

        {/* Action Section */}
        {action && !loading && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.onClick}
              disabled={disabled || action.loading}
              className="w-full"
            >
              {action.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                action.label
              )}
            </Button>
          </div>
        )}

        {/* Subtle gradient overlay for primary cards */}
        {type === 'primary' && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        )}
        
        {/* Action cards hover effect */}
        {type === 'action' && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-indigo-500/0 hover:from-blue-500/10 hover:to-indigo-500/10 transition-all duration-300 pointer-events-none" />
        )}
      </div>
    </Card>
  );
}