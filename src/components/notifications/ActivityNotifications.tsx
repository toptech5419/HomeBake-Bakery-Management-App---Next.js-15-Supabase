'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  LogIn, 
  LogOut, 
  UserPlus,
  Clock,
  User
} from 'lucide-react';
import { Activity } from '@/lib/activities/activity-service';

interface ActivityNotificationsProps {
  activities: Activity[];
  isPreview?: boolean;
  showDateSeparators?: boolean;
}

interface NotificationCardProps {
  activity: Activity;
  isPreview?: boolean;
  showDate?: boolean;
}

const NotificationCard = ({ activity, isPreview = false, showDate = false }: NotificationCardProps) => {
  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'sale':
        return <ShoppingCart size={16} />;
      case 'batch':
        return <Package size={16} />;
      case 'report':
        return <FileText size={16} />;
      case 'login':
        return <LogIn size={16} />;
      case 'end_shift':
        return <LogOut size={16} />;
      case 'created':
        return <UserPlus size={16} />;
      default:
        return <User size={16} />;
    }
  };

  const getGradientClass = () => {
    switch (activity.activity_type) {
      case 'sale':
        return 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-green-200';
      case 'batch':
        return 'bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border-blue-200';
      case 'report':
        return 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200';
      case 'login':
        return 'bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 border-purple-200';
      case 'end_shift':
        return 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-red-200';
      case 'created':
        return 'bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-indigo-200';
      default:
        return 'bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-gray-200';
    }
  };

  const getBadgeClass = () => {
    switch (activity.activity_type) {
      case 'sale':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'batch':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'report':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'login':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'end_shift':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'created':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionLabel = () => {
    switch (activity.activity_type) {
      case 'sale':
        return 'Sale';
      case 'batch':
        return 'Batch';
      case 'report':
        return 'Report';
      case 'login':
        return 'Login';
      case 'end_shift':
        return 'End Shift';
      case 'created':
        return 'Created';
      default:
        return 'Activity';
    }
  };

  const getRoleColor = () => {
    switch (activity.user_role) {
      case 'manager':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'sales_rep':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getShiftBadgeClass = () => {
    if (!activity.shift) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    return activity.shift === 'morning'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-purple-100 text-purple-700 border-purple-200';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${getGradientClass()} border rounded-xl p-4 ${
        isPreview ? 'mb-2' : 'mb-3'
      } transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]`}
    >
      {showDate && (
        <div className="text-xs text-gray-500 mb-2 font-medium">
          {formatDate(activity.created_at)}
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          <span className={`${getBadgeClass()} px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1`}>
            {getActivityIcon()}
            {getActionLabel()}
          </span>
          
          <span className={`${getRoleColor()} px-2 py-1 rounded-full text-xs font-medium border`}>
            {activity.user_role.replace('_', ' ')}
          </span>
          
          {activity.shift && (
            <span className={`${getShiftBadgeClass()} px-2 py-1 rounded-full text-xs font-medium border`}>
              {activity.shift}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={12} />
          {formatTime(activity.created_at)}
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-800 font-medium leading-relaxed">
          {activity.message}
        </p>
        
        {/* Metadata display for sales and batches */}
        {(activity.activity_type === 'sale' || activity.activity_type === 'batch') && activity.metadata && (
          <div className="flex items-center gap-4 text-xs text-gray-600 bg-white bg-opacity-60 rounded-lg p-2">
            {activity.metadata.bread_type && (
              <span className="font-medium">
                🍞 {activity.metadata.bread_type}
              </span>
            )}
            {activity.metadata.quantity && (
              <span className="font-medium">
                📊 {activity.metadata.quantity}x
              </span>
            )}
            {activity.metadata.revenue && (
              <span className="font-medium text-green-600">
                💰 ₦{activity.metadata.revenue.toLocaleString()}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-600 font-medium">
            by {activity.user_name}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const ActivityNotifications = ({ 
  activities, 
  isPreview = false, 
  showDateSeparators = false 
}: ActivityNotificationsProps) => {
  if (!activities.length) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} className="text-gray-400" />
        </div>
        <p className="font-medium text-gray-600">No recent activity</p>
        <p className="text-sm mt-1 text-gray-500">Activity will appear here as staff work</p>
      </div>
    );
  }

  // Group activities by date if separators are requested
  const groupedActivities = showDateSeparators 
    ? groupActivitiesByDate(activities)
    : { 'All': activities };

  return (
    <div className="space-y-3">
      {Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => (
        <div key={dateLabel}>
          {showDateSeparators && dateLabel !== 'All' && (
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <span className="px-4 text-xs font-medium text-gray-500 bg-gray-50 rounded-full border border-gray-200">
                {dateLabel}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
          )}
          
          {dateActivities.map((activity, index) => (
            <NotificationCard
              key={activity.id}
              activity={activity}
              isPreview={isPreview}
              showDate={!showDateSeparators}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Helper function to group activities by date
const groupActivitiesByDate = (activities: Activity[]) => {
  const grouped: Record<string, Activity[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  activities.forEach(activity => {
    const activityDate = new Date(activity.created_at);
    let dateLabel: string;
    
    if (activityDate.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (activityDate.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = activityDate.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    
    if (!grouped[dateLabel]) {
      grouped[dateLabel] = [];
    }
    grouped[dateLabel].push(activity);
  });
  
  return grouped;
};

export default ActivityNotifications;