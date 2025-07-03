'use client';

import { Button } from '@/components/ui/button';
import { 
  Package,
  Users,
  ClipboardList,
  Settings,
  Plus,
  Play,
  Pause,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Timer,
  Target,
  Layers,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface ManagerQuickActionsProps {
  alerts?: {
    activeBatches: number;
    overdeuBatches: number;
    staffIssues: number;
    inventoryAlerts: number;
  };
  currentShift?: 'morning' | 'night';
}

export function ManagerQuickActions({ alerts, currentShift = 'morning' }: ManagerQuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const primaryActions = [
    {
      id: 'start-production',
      title: 'Start New Batch',
      description: 'Initialize production run',
      icon: <Play className="w-5 h-5" />,
      href: '/dashboard/production',
      color: 'green',
      badge: 0,
      shortcut: '⌘N',
      urgent: false
    },
    {
      id: 'monitor-batches',
      title: 'Monitor Batches',
      description: 'Track active production',
      icon: <Package className="w-5 h-5" />,
      href: '/dashboard/production/history',
      color: 'blue',
      badge: alerts?.activeBatches || 0,
      shortcut: '⌘M',
      urgent: (alerts?.overdeuBatches || 0) > 0
    },
    {
      id: 'team-status',
      title: 'Team Management',
      description: 'Staff coordination',
      icon: <Users className="w-5 h-5" />,
      href: '/dashboard/users',
      color: 'purple',
      badge: alerts?.staffIssues || 0,
      shortcut: '⌘T',
      urgent: (alerts?.staffIssues || 0) > 0
    },
    {
      id: 'inventory-check',
      title: 'Inventory Status',
      description: 'Raw materials check',
      icon: <Layers className="w-5 h-5" />,
      href: '/dashboard/inventory',
      color: 'orange',
      badge: alerts?.inventoryAlerts || 0,
      shortcut: '⌘I',
      urgent: (alerts?.inventoryAlerts || 0) > 2
    }
  ];

  const productionControls = [
    {
      id: 'pause-production',
      title: 'Pause All Batches',
      icon: <Pause className="w-4 h-4" />,
      href: '/dashboard/production',
      description: 'Emergency pause',
      color: 'red'
    },
    {
      id: 'quality-check',
      title: 'Quality Control',
      icon: <CheckCircle className="w-4 h-4" />,
      href: '/dashboard/production/history',
      description: 'Run quality checks',
      color: 'green'
    },
    {
      id: 'production-report',
      title: 'Production Report',
      icon: <BarChart3 className="w-4 h-4" />,
      href: '/dashboard/reports',
      description: 'Generate reports',
      color: 'blue'
    }
  ];

  const shiftActions = [
    {
      id: 'shift-handover',
      title: 'Shift Handover',
      icon: <ClipboardList className="w-4 h-4" />,
      href: '/dashboard/sales/shift',
      description: 'Prepare shift transition'
    },
    {
      id: 'shift-report',
      title: 'Shift Report',
      icon: <FileText className="w-4 h-4" />,
      href: '/dashboard/reports',
      description: 'Document shift activities'
    },
    {
      id: 'schedule-optimization',
      title: 'Schedule Optimization',
      icon: <Target className="w-4 h-4" />,
      href: '/dashboard/production',
      description: 'Optimize production schedule'
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
          <h2 className="text-xl font-bold text-gray-900">Production Control</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} shift management tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Timer className="w-4 h-4 mr-2" />
            Auto Mode
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
                    "absolute -top-2 -right-2 w-6 h-6  text-white text-xs font-bold rounded-full flex items-center justify-center",
                    action.urgent ? "bg-red-500" : "bg-orange-500"
                  )}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}

                {/* Urgent Indicator */}
                {action.urgent && (
                  <div className="absolute top-2 left-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
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

      {/* Production Controls */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">Production Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {productionControls.map((control) => (
            <motion.div key={control.id} variants={itemVariants}>
              <Link href={control.href}>
                <div className={cn(
                  "p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group",
                  control.color === 'red' && "border-red-200 bg-red-50 hover:bg-red-100"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      control.color === 'red' 
                        ? "bg-red-100 text-red-600 group-hover:bg-red-200" 
                        : `${getColorClasses(control.color, 'bg')} ${getColorClasses(control.color, 'text')} ${getColorClasses(control.color, 'hover')}`
                    )}>
                      {control.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                        {control.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {control.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Shift Management */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shiftActions.map((action) => (
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

      {/* Quick Stats */}
      <motion.div 
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Production Stats</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{alerts?.activeBatches || 0}</div>
            <div className="text-sm text-gray-500">Active Batches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{alerts?.overdeuBatches || 0}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {((alerts?.activeBatches || 0) - (alerts?.overdeuBatches || 0))}
            </div>
            <div className="text-sm text-gray-500">On Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{alerts?.inventoryAlerts || 0}</div>
            <div className="text-sm text-gray-500">Inventory Alerts</div>
          </div>
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
                    "absolute -top-1 -right-1 w-4 h-4  text-white text-xs font-bold rounded-full flex items-center justify-center",
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