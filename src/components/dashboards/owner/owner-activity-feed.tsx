'use client';

import { 
  User, 
  Package, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import { getRelativeTime } from '@/lib/utils/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Activity {
  id: string;
  type: 'sale' | 'production' | 'inventory' | 'staff' | 'alert' | 'system';
  title: string;
  description: string;
  amount?: number;
  user?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface OwnerActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

export function OwnerActivityFeed({ activities, loading = false }: OwnerActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'recent'>('all');
  const [expanded, setExpanded] = useState(false);

  const getActivityIcon = (type: Activity['type']) => {
    const iconMap = {
      sale: <DollarSign className="w-4 h-4" />,
      production: <Package className="w-4 h-4" />,
      inventory: <Package className="w-4 h-4" />,
      staff: <User className="w-4 h-4" />,
      alert: <AlertTriangle className="w-4 h-4" />,
      system: <CheckCircle className="w-4 h-4" />
    };
    return iconMap[type];
  };

  const getActivityColor = (type: Activity['type'], status?: Activity['status']) => {
    if (status) {
      const statusColors = {
        success: 'text-green-600 bg-green-50 border-green-200',
        warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        error: 'text-red-600 bg-red-50 border-red-200',
        info: 'text-blue-600 bg-blue-50 border-blue-200'
      };
      return statusColors[status];
    }

    const typeColors = {
      sale: 'text-green-600 bg-green-50 border-green-200',
      production: 'text-blue-600 bg-blue-50 border-blue-200',
      inventory: 'text-purple-600 bg-purple-50 border-purple-200',
      staff: 'text-orange-600 bg-orange-50 border-orange-200',
      alert: 'text-red-600 bg-red-50 border-red-200',
      system: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return typeColors[type];
  };

  const getPriorityIndicator = (priority: Activity['priority']) => {
    const indicators = {
      low: 'w-2 h-2 bg-gray-400 rounded-full',
      medium: 'w-2 h-2 bg-yellow-400 rounded-full',
      high: 'w-2 h-2 bg-red-400 rounded-full animate-pulse'
    };
    return indicators[priority];
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'high') return activity.priority === 'high';
    if (filter === 'recent') {
      const activityTime = new Date(activity.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return activityTime > oneHourAgo;
    }
    return true;
  });

  const displayedActivities = expanded ? filteredActivities : filteredActivities.slice(0, 5);

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
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Activity</h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time operations feed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={loading ? "w-3 h-3 bg-yellow-400 rounded-full animate-pulse" : "w-3 h-3 bg-green-400 rounded-full"} />
            <span className="text-sm font-medium text-gray-600">
              {loading ? 'Updating...' : 'Live'}
            </span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Activity
          </Button>
          <Button
            variant={filter === 'high' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('high')}
          >
            High Priority
          </Button>
          <Button
            variant={filter === 'recent' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('recent')}
          >
            Recent
          </Button>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="w-16 h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedActivities.length > 0 ? (
          <motion.div 
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {displayedActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-start gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  {/* Icon */}
                  <div className={[
                    "w-10 h-10 rounded-lg flex items-center justify-center border",
                    getActivityColor(activity.type, activity.status)
                  ].filter(Boolean).join(' ')}>
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                        {activity.title}
                      </h4>
                      <div className={getPriorityIndicator(activity.priority)} />
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {activity.user && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {activity.user}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Amount/Action */}
                  <div className="flex items-center gap-2">
                    {activity.amount && (
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">
                          ₦{activity.amount.toLocaleString()}
                        </span>
                        {activity.type === 'sale' && (
                          <div className="flex items-center text-xs text-green-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Revenue
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No Activity</h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' 
                ? 'No recent activity to display' 
                : `No ${filter} activity found`
              }
            </p>
          </div>
        )}

        {/* Show More/Less Button */}
        {filteredActivities.length > 5 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Show Less
                  <TrendingUp className="w-4 h-4 ml-2 rotate-180" />
                </>
              ) : (
                <>
                  Show {filteredActivities.length - 5} More
                  <TrendingDown className="w-4 h-4 ml-2 rotate-180" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {displayedActivities.length} of {filteredActivities.length} activities
          </span>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4 mr-2" />
            View All History
          </Button>
        </div>
      </div>
    </div>
  );
}

