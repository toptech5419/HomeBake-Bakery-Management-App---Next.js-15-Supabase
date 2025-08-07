'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
  unreadCount: number;
  hasNewActivities: boolean;
  isLoading: boolean;
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  hasNewActivities,
  isLoading,
  onClick,
  className = ''
}) => {
  return (
    <div className="relative">
      <motion.button 
        onClick={onClick}
        className={`
          p-2 rounded-full transition-all duration-200 relative group
          ${hasNewActivities 
            ? 'hover:bg-orange-50 bg-orange-25' 
            : 'hover:bg-gray-100'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          ${className}
        `}
        disabled={isLoading}
        title={
          isLoading 
            ? 'Loading notifications...' 
            : unreadCount > 0 
              ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`
              : 'No new notifications'
        }
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={hasNewActivities ? { rotate: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, repeat: hasNewActivities ? Infinity : 0, repeatDelay: 3 }}
        >
          <Bell 
            size={20} 
            className={`
              transition-colors duration-200
              ${hasNewActivities 
                ? 'text-orange-600 group-hover:text-orange-700' 
                : 'text-gray-600 group-hover:text-gray-700'
              }
              ${isLoading ? 'animate-pulse' : ''}
            `} 
          />
        </motion.div>
        
        {/* Unread count badge with animation */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* New activity indicator */}
        <AnimatePresence>
          {hasNewActivities && unreadCount === 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              exit={{ scale: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full"
            />
          )}
        </AnimatePresence>
        
        {/* Loading indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { repeat: Infinity, duration: 1, ease: "linear" } }}
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};