'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

export function ModernCard({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}: ModernCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        'transition-all duration-200 hover:shadow-md',
        variant === 'elevated' && 'shadow-lg hover:shadow-xl',
        variant === 'outlined' && 'border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ModernCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function ModernCardHeader({ 
  title, 
  subtitle, 
  icon, 
  className, 
  children, 
  ...props 
}: ModernCardHeaderProps) {
  return (
    <div className={cn('p-6 border-b border-gray-100', className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-gray-600">{icon}</div>}
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModernCardContent({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function ModernCardFooter({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 border-t border-gray-100', className)} {...props}>
      {children}
    </div>
  );
}
