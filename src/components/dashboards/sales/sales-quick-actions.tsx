'use client';

import { Button } from '@/components/ui/button';
import { 
  Plus,
  ShoppingCart,
  Users,
  Target,
  Package,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface SalesQuickActionsProps {
  salesData?: {
    todayTarget: number;
    currentSales: number;
    targetProgress: number;
    customerCount: number;
    averageOrderValue: number;
  };
  currentShift?: 'morning' | 'night';
  alerts?: {
    lowStock: number;
    targetBehind: boolean;
    customerFollow: number;
  };
}

export function SalesQuickActions({ 
  salesData, 
  currentShift = 'morning',
  alerts = { lowStock: 0, targetBehind: false, customerFollow: 0 }
}: SalesQuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const primaryActions = [
    {
      id: 'new-sale',
      title: 'Record Sale',
      description: 'Add new transaction',
      icon: <Plus className="w-5 h-5" />,
      href: '/dashboard/sales-management',
      color: 'green',
      badge: 0,
      shortcut: '⌘N',
      urgent: false
    },
    {
      id: 'sales-history',
      title: 'Sales History',
      description: 'View transactions',
      icon: <ShoppingCart className="w-5 h-5" />,
      href: '/dashboard/sales',
      color: 'blue',
      badge: salesData?.customerCount || 0,
      shortcut: '⌘H',
      urgent: false
    },
    {
      id: 'customer-orders',
      title: 'Customer Orders',
      description: 'Track customer orders',
      icon: <Users className="w-5 h-5" />,
      href: '/dashboard/sales',
      color: 'purple',
      badge: alerts.customerFollow,
      shortcut: '⌘C',
      urgent: alerts.customerFollow > 0
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Track progress',
      icon: <Target className="w-5 h-5" />,
      href: '/dashboard/reports',
      color: 'orange',
      badge: 0,
      shortcut: '⌘P',
      urgent: alerts.targetBehind
    }
  ];

  const quickSaleActions = [
    {
      id: 'common-bread',
      title: 'Common Breads',
      icon: <Package className="w-4 h-4" />,
      href: '/dashboard/sales-management',
      description: 'Quick sale shortcuts',
      items: ['White Bread', 'Brown Bread', 'Agege Bread']
    },
    {
      id: 'bulk-sale',
      title: 'Bulk Sale',
      icon: <ShoppingCart className="w-4 h-4" />,
      href: '/dashboard/sales-management',
      description: 'Large quantity orders',
      items: ['Wholesale', 'Events', 'Retailers']
    },
    {
      id: 'customer-sale',
      title: 'Regular Customer',
      icon: <Users className="w-4 h-4" />,
      href: '/dashboard/sales-management',
      description: 'Frequent customer orders',
      items: ['Saved Orders', 'Preferences', 'Discounts']
    }
  ];

  const reportingActions = [
    {
      id: 'daily-report',
      title: 'Daily Report',
      icon: <FileText className="w-4 h-4" />,
      href: '/dashboard/reports',
      description: 'Generate daily summary'
    },
    {
      id: 'shift-summary',
      title: 'Shift Summary',
      icon: <Clock className="w-4 h-4" />,
      href: '/dashboard/sales/shift',
      description: 'End shift report'
    },
    {
      id: 'target-progress',
      title: 'Target Progress',
      icon: <TrendingUp className="w-4 h-4" />,
      href: '/dashboard/reports',
      description: 'Track goal achievement'
    }
  ];

  const getColorClasses = (color: string, variant: 'bg' | 'border' | 'text' | 'hover') => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        hover: 'hover:bg-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-600',
        hover: 'hover:bg-green-100'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        hover: 'hover:bg-purple-100'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-600',
        hover: 'hover:bg-orange-100'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        hover: 'hover:bg-red-100'
      }
    };
    return colors[color as keyof typeof colors]?.[variant] || '';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sales Actions</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} shift tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
        </div>
      </div>

      {/* Primary Actions Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {primaryActions.map((action) => (
          <motion.div
            key={action.id}
            variants={itemVariants}
            onMouseEnter={() => setHoveredAction(action.id)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <Link href={action.href}>
              <div className={cn(
                "relative p-6 bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 cursor-pointer group",
                "hover:shadow-md hover:border-gray-300 hover:-translate-y-1",
                hoveredAction === action.id && "ring-2 ring-orange-200",
                action.urgent && "border-red-300 bg-red-50"
              )}>
                {/* Badge */}
                {action.badge > 0 && (
                  <div className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 text-white text-xs font-bold rounded-full flex items-center justify-center",
                    action.urgent ? "bg-red-500" : "bg-orange-500"
                  )}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}

                {/* Urgent Indicator */}
                {action.urgent && (
                  <div className="absolute top-2 left-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                )}

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  action.urgent ? "bg-red-100 text-red-600" : getColorClasses(action.color, 'bg'),
                  action.urgent ? "group-hover:bg-red-200" : getColorClasses(action.color, 'hover')
                )}>
                  <div className={action.urgent ? "text-red-600" : getColorClasses(action.color, 'text')}>
                    {action.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>

                {/* Shortcut */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {action.shortcut}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Sale Actions */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">Quick Sale Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickSaleActions.map((action) => (
            <motion.div key={action.id} variants={itemVariants}>
              <Link href={action.href}>
                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <div className="text-green-600">
                        {action.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700 mb-1">
                        {action.title}
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">
                        {action.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {action.items.map((item) => (
                          <span key={item} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Performance Summary */}
      <motion.div 
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ₦{salesData?.currentSales?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-500">Current Sales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {salesData?.targetProgress?.toFixed(1) || '0'}%
            </div>
            <div className="text-sm text-gray-500">Target Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {salesData?.customerCount || 0}
            </div>
            <div className="text-sm text-gray-500">Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ₦{salesData?.averageOrderValue?.toFixed(0) || '0'}
            </div>
            <div className="text-sm text-gray-500">Avg Order</div>
          </div>
        </div>

        {/* Performance Status */}
        <div className="mt-4 p-3 rounded-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {alerts.targetBehind ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium text-gray-900">
                {alerts.targetBehind ? 'Target Behind Schedule' : 'On Track for Target'}
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              alerts.targetBehind ? "text-red-600" : "text-green-600"
            )}>
              {alerts.targetBehind ? 'Focus Needed' : 'Great Progress!'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Reporting Actions */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">Reports & Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportingActions.map((action) => (
            <motion.div key={action.id} variants={itemVariants}>
              <Link href={action.href}>
                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 shadow-sm hover:shadow-md hover:from-orange-100 hover:to-orange-200 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center group-hover:bg-orange-300 transition-colors">
                      <div className="text-orange-600">
                        {action.icon}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                        {action.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mobile Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="flex items-center justify-around">
          {primaryActions.slice(0, 4).map((action) => (
            <Link key={action.id} href={action.href}>
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                {action.badge > 0 && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center",
                    action.urgent ? "bg-red-500" : "bg-orange-500"
                  )}>
                    {action.badge > 9 ? '9+' : action.badge}
                  </div>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  action.urgent ? "bg-red-100 text-red-600" : `${getColorClasses(action.color, 'bg')} ${getColorClasses(action.color, 'text')}`
                )}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {action.title.split(' ')[0]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}