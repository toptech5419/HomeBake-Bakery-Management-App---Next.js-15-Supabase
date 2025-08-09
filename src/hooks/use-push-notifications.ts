'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushNotifications } from '@/lib/push-notifications/index';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { supabase } from '@/lib/supabase/client';

export interface PushNotificationHook {
  isEnabled: boolean;
  isSupported: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;
  toggleNotifications: (userId?: string) => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications(userId?: string): PushNotificationHook {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useOptimizedToast();

  /**
   * Initialize push notification status
   */
  const initializePushNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check browser support
      const supported = pushNotifications.isSupported();
      setIsSupported(supported);

      if (!supported) {
        setError('Push notifications are not supported in this browser');
        return;
      }

      // Initialize the service
      const initialized = await pushNotifications.initialize();
      if (!initialized) {
        setError('Failed to initialize push notifications');
        return;
      }

      // Get current status
      setIsEnabled(pushNotifications.isEnabled());
      setPermission(pushNotifications.getPermissionStatus());

    } catch (error: any) {
      console.error('❌ Push notification initialization failed:', error);
      setError(error.message || 'Failed to initialize push notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle push notifications on/off
   */
  const toggleNotifications = useCallback(async (overrideUserId?: string): Promise<boolean> => {
    try {
      setError(null);
      
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Use provided userId, or the hook userId, or try to get from auth
      let finalUserId = overrideUserId || userId;
      
      if (!finalUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!user?.id) {
          throw new Error('You must be logged in to enable push notifications');
        }
        finalUserId = user.id;
      }

      const newState = await pushNotifications.toggleNotifications(finalUserId);
      setIsEnabled(newState);
      setPermission(pushNotifications.getPermissionStatus());

      if (newState) {
        toast({
          title: '🔔 Notifications Enabled',
          description: 'You\'ll receive real-time alerts when staff perform activities.',
          type: 'success',
          duration: 6000
        });
      } else {
        toast({
          title: '🔕 Notifications Disabled',
          description: 'You won\'t receive alerts for bakery activities.',
          type: 'info',
          duration: 4000
        });
      }

      return newState;
    } catch (error: any) {
      console.error('❌ Failed to toggle push notifications:', error);
      
      // Set specific error messages
      if (error.message.includes('permission denied') || error.message.includes('Notification permission denied')) {
        setError('Browser notification permission was denied. Please enable notifications in your browser settings and try again.');
        toast({
          title: '❌ Permission Denied',
          description: 'Browser notification permission was denied. Please enable notifications in your browser settings and try again.',
          type: 'error',
          duration: 8000
        });
      } else if (error.message.includes('not supported')) {
        setError('Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.');
        toast({
          title: '⚠️ Not Supported',
          description: 'Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.',
          type: 'warning',
          duration: 6000
        });
      } else if (error.message.includes('VAPID key')) {
        setError('Push notifications are not properly configured. Please contact support.');
        toast({
          title: '🔧 Configuration Error',
          description: 'Push notifications are not properly configured. Please contact support.',
          type: 'error',
          duration: 6000
        });
      } else {
        setError('Failed to toggle push notifications. Please try again or refresh the page.');
        toast({
          title: '❌ Toggle Failed',
          description: 'Failed to toggle push notifications. Please try again or refresh the page.',
          type: 'error',
          duration: 5000
        });
      }

      // Revert state on error
      setIsEnabled(pushNotifications.isEnabled());
      setPermission(pushNotifications.getPermissionStatus());
      
      return false;
    }
  }, [isSupported, toast, userId]);

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async (): Promise<void> => {
    try {
      if (!isEnabled) {
        throw new Error('Push notifications are not enabled');
      }

      await pushNotifications.sendTestNotification();
      
      toast({
        title: '✨ Test Sent',
        description: 'Check if you received the test notification!',
        type: 'info',
        duration: 3000
      });
    } catch (error: any) {
      console.error('❌ Failed to send test notification:', error);
      
      toast({
        title: '❌ Test Failed',
        description: 'Failed to send test notification. Please try again.',
        type: 'error',
        duration: 4000
      });
    }
  }, [isEnabled, toast]);

  // Initialize on mount
  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  // Listen for permission changes
  useEffect(() => {
    const checkPermissionStatus = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    // Check permission status periodically
    const interval = setInterval(checkPermissionStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    isEnabled,
    isSupported,
    permission,
    isLoading,
    error,
    toggleNotifications,
    sendTestNotification
  };
}