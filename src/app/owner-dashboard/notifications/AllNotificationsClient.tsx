'use client';

import React from 'react';
import { ArrowLeft, Bell, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useActivities } from '@/hooks/use-live-activities';
import ActivityNotifications from '@/components/notifications/ActivityNotifications';

interface AllNotificationsClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

export default function AllNotificationsClient({ user, displayName }: AllNotificationsClientProps) {
  const router = useRouter();
  const { activities, isLoading: activitiesLoading, refetch: refetchActivities } = useActivities({
    pollingInterval: 30000, // Poll every 30 seconds
    enablePolling: true
  });

  const handleBackNavigation = () => {
    router.back();
  };

  const handleRefresh = () => {
    refetchActivities();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">All Notifications</h1>
              <p className="text-orange-100 text-xs sm:text-sm truncate">
                Live team activity feed • {displayName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={activitiesLoading}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0 disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw 
                className={`h-5 w-5 ${activitiesLoading ? 'animate-spin' : ''}`} 
              />
            </Button>
          </div>
          
          {/* Stats Bar */}
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/90">
                {activities.length} notification{activities.length !== 1 ? 's' : ''}
              </span>
              <span className="text-white/70">
                Last 3 days • Auto-refreshes every 30s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-orange-50/30 to-amber-50/30">
        <div className="px-3 sm:px-4 py-4">
          {activitiesLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-orange-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading notifications...</p>
            </div>
          ) : activities.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ActivityNotifications 
                activities={activities} 
                showDateSeparators={true}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 sm:py-20"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-2 text-base sm:text-lg">No notifications yet</h3>
              <p className="text-sm sm:text-base text-gray-500 text-center px-4">
                Activity from your team will appear here
              </p>
              <Button
                onClick={handleRefresh}
                disabled={activitiesLoading}
                className="mt-4 sm:mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 sm:px-6 py-2 sm:py-3 touch-manipulation min-h-[44px]"
              >
                Check for Updates
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Live indicator footer - only show when there are notifications */}
      {activities.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-gray-600">
              Live activity feed • Updates automatically
            </span>
          </div>
        </div>
      )}
    </div>
  );
}