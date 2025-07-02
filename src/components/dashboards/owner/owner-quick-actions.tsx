'use client';

import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  Users,
  Package,
  DollarSign,
  Settings,
  FileText,
  TrendingUp,
  AlertTriangle,
  Plus,
  Download,
  Bell,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface OwnerQuickActionsProps {
  alerts?: {
    lowStock: number;
    pendingReports: number;
    staffNotifications: number;
  };
}

export function OwnerQuickActions({ alerts }: OwnerQuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const primaryActions = [
    {
      id: 'reports',
      title: 'View Reports',
      description: 'Analytics & insights',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/reports',
      color: 'blue',
      badge: alerts?.pendingReports || 0,
      shortcut: '⌘R'
    },
    {
      id: 'staff',
      title: 'Staff Management',
      description: 'Team overview',
      icon: <Users className="w-5 h-5" />,
      href: '/staff',
      color: 'green',
      badge: alerts?.staffNotifications || 0,
      shortcut: '⌘S'
    },
    {
      id: 'inventory',
      title: 'Inventory Status',
      description: 'Stock levels',
      icon: <Package className="w-5 h-5" />,
      href: '/inventory',
      color: 'purple',
      badge: alerts?.lowStock || 0,
      shortcut: '⌘I'
    },
    {
      id: 'finances',
      title: 'Financial Overview',
      description: 'Revenue & costs',
      icon: <DollarSign className="w-5 h-5" />,
      href: '/finances',
      color: 'orange',
      badge: 0,
      shortcut: '⌘F'
    }
  ];

  const secondaryActions = [
    {
      id: 'settings',
      title: 'System Settings',
      icon: <Settings className="w-4 h-4" />,
      href: '/settings',
      description: 'Configure system'
    },
    {
      id: 'export',
      title: 'Export Data',
      icon: <Download className="w-4 h-4" />,
      href: '/export',
      description: 'Download reports'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      href: '/notifications',
      description: 'View all alerts'
    }
  ];

  const quickCreateActions = [
    {
      id: 'new-report',
      title: 'Generate Report',
      icon: <FileText className="w-4 h-4" />,
      href: '/reports/new',
      description: 'Create custom report'
    },
    {
      id: 'add-staff',
      title: 'Add Staff Member',
      icon: <Plus className="w-4 h-4" />,
      href: '/staff/new',
      description: 'Register new employee'
    },
    {
      id: 'performance-check',
      title: 'Performance Check',
      icon: <TrendingUp className="w-4 h-4" />,
      href: '/performance',
      description: 'Run system analysis'
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
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Frequently used management tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Automation
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
                hoveredAction === action.id && "ring-2 ring-orange-200"
              )}>
                {/* Badge */}
                {action.badge > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  getColorClasses(action.color, 'bg'),
                  getColorClasses(action.color, 'hover')
                )}>
                  <div className={getColorClasses(action.color, 'text')}>
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

                {/* Alert indicator */}
                {action.badge > 0 && (
                  <div className="absolute bottom-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Actions */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">System Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {secondaryActions.map((action) => (
            <motion.div key={action.id} variants={itemVariants}>
              <Link href={action.href}>
                <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      {action.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                        {action.title}
                      </h4>
                      <p className="text-sm text-gray-500">
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

      {/* Quick Create Actions */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">Quick Create</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickCreateActions.map((action) => (
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
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {action.badge > 9 ? '9+' : action.badge}
                  </div>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  getColorClasses(action.color, 'bg'),
                  getColorClasses(action.color, 'text')
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