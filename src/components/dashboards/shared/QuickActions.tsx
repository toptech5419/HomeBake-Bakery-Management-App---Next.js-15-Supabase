// MOBILE-FIRST RESPONSIVE REFACTOR (2024-06)
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
  green: 'bg-green-100 text-green-600 hover:bg-green-200',
  purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
  orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
  red: 'bg-red-100 text-red-600 hover:bg-red-200'
};

export function QuickActions({ actions, title = "Quick Actions", className }: QuickActionsProps) {
  const handleAction = (action: QuickAction) => {
    if (action.disabled) return;
    
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      window.location.href = action.href;
    }
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 w-full max-w-full p-2 sm:p-4 overflow-x-hidden', className)}>
      {title && (
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 truncate">{title}</h3>
      )}
      
      {/* Desktop Grid Layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={action.disabled}
            className={cn(
              'flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 text-left w-full max-w-full',
              action.disabled && 'opacity-50 cursor-not-allowed',
              !action.disabled && 'hover:scale-[1.02]'
            )}
          >
            <div className={cn(
              'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              action.color ? colorClasses[action.color] : 'bg-gray-100 text-gray-600'
            )}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{action.title}</h4>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{action.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Mobile Horizontal Scroll */}
      <div className="md:hidden w-full max-w-full overflow-x-hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 w-full max-w-full">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 min-w-[140px] sm:min-w-[160px] flex-shrink-0 w-full max-w-full',
                action.disabled && 'opacity-50 cursor-not-allowed',
                !action.disabled && 'hover:scale-[1.02]'
              )}
            >
              <div className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center',
                action.color ? colorClasses[action.color] : 'bg-gray-100 text-gray-600'
              )}>
                {action.icon}
              </div>
              <div className="text-center w-full max-w-full">
                <h4 className="font-medium text-gray-900 text-sm truncate">{action.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Role-specific quick actions
export const ownerActions: QuickAction[] = [
  {
    id: 'generate-report',
    title: 'Generate Report',
    description: 'Create comprehensive business reports',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: '/dashboard/reports',
    color: 'blue'
  },
  {
    id: 'add-staff',
    title: 'Add Staff',
    description: 'Invite new team members',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    href: '/dashboard/users/invite',
    color: 'green'
  },
  {
    id: 'performance-check',
    title: 'Performance Check',
    description: 'Review team performance',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: '/dashboard/reports',
    color: 'purple'
  },
  {
    id: 'inventory-check',
    title: 'Inventory Check',
    description: 'Review stock levels',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    href: '/dashboard/inventory',
    color: 'orange'
  }
];

export const managerActions: QuickAction[] = [
  {
    id: 'start-batch',
    title: 'Start Batch',
    description: 'Begin new production batch',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/dashboard/production',
    color: 'green'
  },
  {
    id: 'record-production',
    title: 'Record Production',
    description: 'Log completed production',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    href: '/dashboard/production',
    color: 'blue'
  },
  {
    id: 'quality-check',
    title: 'Quality Check',
    description: 'Perform quality inspection',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/dashboard/production',
    color: 'purple'
  },
  {
    id: 'finish-shift',
    title: 'Finish Shift',
    description: 'Complete shift and submit report',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    href: '/dashboard/production',
    color: 'orange'
  }
];

export const salesRepActions: QuickAction[] = [
  {
    id: 'record-sale',
    title: 'Record Sale',
    description: 'Log new sales transaction',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    href: '/dashboard/sales-management',
    color: 'green'
  },
  {
    id: 'view-products',
    title: 'View Products',
    description: 'Check available inventory',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    href: '/dashboard/inventory',
    color: 'blue'
  },
  {
    id: 'price-check',
    title: 'Price Check',
    description: 'Verify current pricing',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    href: '/dashboard/bread-types',
    color: 'purple'
  },
  {
    id: 'sales-report',
    title: 'Sales Report',
    description: 'Generate sales summary',
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: '/dashboard/reports',
    color: 'orange'
  }
]; 