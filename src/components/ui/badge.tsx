import { cn } from '@/lib/utils';
import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'morning' | 'night';
}

const colorMap = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  morning: 'bg-orange-100 text-orange-800 border-orange-200',
  night: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export function Badge({ children, color = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        colorMap[color],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 