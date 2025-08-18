'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushNotifications } from '@/lib/push-notifications';
import { Logger } from '@/lib/utils/logger';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
  clearError: () => void;
}

export function usePushNotifications(userId?: string): UsePushNotificationsReturn {
  const [isSupported] = useState(() => pushNotifications.isSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    pushNotifications.getPermission()
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    if (!userId || !isSupported) return;

    try {
      const prefs = await pushNotifications.getUserPreferences(userId);
      setIsEnabled(prefs.enabled && prefs.hasSubscription && permission === 'granted');
    } catch (err) {
      Logger.error('Failed to load preferences', err);
    }
  }, [userId, isSupported, permission]);

  // Initialize and load preferences
  useEffect(() => {
    pushNotifications.initialize();
    loadPreferences();
  }, [loadPreferences]);

  // Monitor permission changes
  useEffect(() => {
    const checkPermission = () => {
      const currentPermission = pushNotifications.getPermission();
      if (currentPermission !== permission) {
        setPermission(currentPermission);
      }
    };

    const interval = setInterval(checkPermission, 2000);
    return () => clearInterval(interval);
  }, [permission]);

  // Enable push notifications
  const enable = useCallback(async () => {
    if (!userId || !isSupported) {
      setError('Push notifications not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Subscribe to push notifications
      const subscription = await pushNotifications.subscribe();
      
      // Save to database
      await pushNotifications.saveSubscription(userId, subscription);
      
      setIsEnabled(true);
      setPermission(pushNotifications.getPermission());
      
      Logger.success('Push notifications enabled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable notifications';
      setError(errorMessage);
      setIsEnabled(false);
      Logger.error('Failed to enable notifications', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isSupported]);

  // Disable push notifications
  const disable = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from push notifications
      await pushNotifications.unsubscribe();
      
      // Remove from database
      await pushNotifications.removeSubscription(userId);
      
      setIsEnabled(false);
      
      Logger.success('Push notifications disabled');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable notifications';
      setError(errorMessage);
      Logger.error('Failed to disable notifications', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Send test notification
  const sendTest = useCallback(async () => {
    setError(null);

    try {
      await pushNotifications.sendTestNotification();
      Logger.success('Test notification sent');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
      Logger.error('Failed to send test notification', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    error,
    enable,
    disable,
    sendTest,
    clearError
  };
}