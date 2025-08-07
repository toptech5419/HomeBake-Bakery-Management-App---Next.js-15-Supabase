'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, RefreshCw } from 'lucide-react';
import { Activity } from '@/lib/activities/activity-service';
import ActivityNotifications from './ActivityNotifications';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const AllNotificationsModal = ({ 
  isOpen, 
  onClose, 
  activities, 
  onRefresh,
  isRefreshing = false 
}: AllNotificationsModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Bell size={16} className="text-orange-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    All Notifications
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                      title="Refresh notifications"
                    >
                      <RefreshCw 
                        size={18} 
                        className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
                      />
                    </button>
                  )}
                  
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Stats bar */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {activities.length} notification{activities.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-500">
                    Last 3 days
                  </span>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="p-4">
                {activities.length > 0 ? (
                  <ActivityNotifications 
                    activities={activities} 
                    showDateSeparators={true}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell size={32} className="text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-2">No notifications yet</h3>
                    <p className="text-sm text-gray-500">
                      Activity from your team will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer with quick actions */}
            {activities.length > 0 && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing recent activity
                  </span>
                  <span>
                    Auto-refreshes every 30s
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AllNotificationsModal;