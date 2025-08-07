'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity } from '@/lib/activities/activity-service';

const LAST_VIEWED_KEY = 'owner_notifications_last_viewed';
const NOTIFICATION_STORAGE_KEY = 'owner_notification_counter';

interface UseNotificationCounterOptions {
  activities: Activity[];
  isLoading: boolean;
}

interface UseNotificationCounterReturn {
  unreadCount: number;
  markAllAsRead: () => void;
  getLastViewedTime: () => Date | null;
  hasNewActivities: boolean;
}

export function useNotificationCounter({
  activities,
  isLoading
}: UseNotificationCounterOptions): UseNotificationCounterReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastViewedTime, setLastViewedTime] = useState<Date | null>(null);
  const [hasNewActivities, setHasNewActivities] = useState(false);

  // Load last viewed time from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_VIEWED_KEY);
      if (stored) {
        const lastViewed = new Date(stored);
        setLastViewedTime(lastViewed);
      } else {
        // If no previous view time, consider all activities as read for first-time users
        const now = new Date();
        setLastViewedTime(now);
        localStorage.setItem(LAST_VIEWED_KEY, now.toISOString());
      }
    } catch (error) {
      console.error('Error loading notification counter:', error);
      const now = new Date();
      setLastViewedTime(now);
    }
  }, []);

  // Calculate unread count when activities or lastViewedTime changes
  useEffect(() => {
    if (!lastViewedTime || isLoading || !activities.length) {
      setUnreadCount(0);
      setHasNewActivities(false);
      return;
    }

    try {
      // Count activities newer than last viewed time
      const unreadActivities = activities.filter(activity => {
        const activityTime = new Date(activity.created_at);
        return activityTime > lastViewedTime;
      });

      const newCount = unreadActivities.length;
      setUnreadCount(newCount);
      setHasNewActivities(newCount > 0);

      // Store count in localStorage for persistence across page reloads
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
        count: newCount,
        lastUpdated: new Date().toISOString(),
        lastViewedTime: lastViewedTime.toISOString()
      }));

    } catch (error) {
      console.error('Error calculating unread notifications:', error);
      setUnreadCount(0);
      setHasNewActivities(false);
    }
  }, [activities, lastViewedTime, isLoading]);

  // Load persisted count on mount (for immediate display before activities load)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        const { count, lastViewedTime: storedLastViewed } = JSON.parse(stored);
        
        // Only use stored count if it matches our current lastViewedTime
        const currentLastViewed = localStorage.getItem(LAST_VIEWED_KEY);
        if (currentLastViewed && currentLastViewed === storedLastViewed) {
          setUnreadCount(count || 0);
          setHasNewActivities(count > 0);
        }
      }
    } catch (error) {
      console.error('Error loading persisted notification count:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    try {
      const now = new Date();
      setLastViewedTime(now);
      setUnreadCount(0);
      setHasNewActivities(false);
      
      // Update localStorage
      localStorage.setItem(LAST_VIEWED_KEY, now.toISOString());
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
        count: 0,
        lastUpdated: now.toISOString(),
        lastViewedTime: now.toISOString()
      }));

      console.log('[NotificationCounter] Marked all notifications as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  // Get last viewed time
  const getLastViewedTime = useCallback(() => {
    return lastViewedTime;
  }, [lastViewedTime]);

  return {
    unreadCount,
    markAllAsRead,
    getLastViewedTime,
    hasNewActivities
  };
}