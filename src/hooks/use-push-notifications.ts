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
  supportMessage: string;
  recommendedBrowsers: string[];
  supportLevel: 'full' | 'partial' | 'none';
  showUnsupportedMessage: boolean;
  toggleNotifications: (userId?: string) => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
  retryInitialization: () => Promise<void>;
}

/**
 * Enhanced hook for managing push notifications with better UX
 */
export function usePushNotifications(userId?: string): PushNotificationHook {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState<string>('Checking browser support...');
  const [recommendedBrowsers, setRecommendedBrowsers] = useState<string[]>([]);
  const [supportLevel, setSupportLevel] = useState<'full' | 'partial' | 'none'>('none');
  const { toast } = useOptimizedToast();

  /**
   * Initialize push notification status with enhanced support detection
   */
  const initializePushNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Initializing push notifications...');

      // Get detailed browser support information
      const supported = pushNotifications.isSupported();
      const browserSupport = pushNotifications.getBrowserSupport();
      const message = pushNotifications.getSupportMessage();
      const browsers = pushNotifications.getRecommendedBrowsers();
      
      setIsSupported(supported);
      setSupportMessage(message);
      setRecommendedBrowsers(browsers);
      setSupportLevel(browserSupport?.supportLevel || 'none');

      if (!supported) {
        console.warn('⚠️ Push notifications not supported:', message);
        setError(message);
        setIsEnabled(false);
        return;
      }

      // Initialize the service with retry logic
      const initialized = await pushNotifications.initialize();
      if (!initialized) {
        console.warn('⚠️ Push notifications service initialization failed');
        setError('Failed to initialize push notifications service. Please refresh the page and try again.');
        setIsEnabled(false);
        return;
      }

      // Load user preferences from database
      await pushNotifications.loadUserPreferences(userId);

      // Get current state
      const userPreference = pushNotifications.getUserPreference();
      setIsEnabled(userPreference);
      setPermission(pushNotifications.getPermissionStatus());
      
      console.log('✅ Push notifications initialized successfully:', { 
        userPreference, 
        fullyEnabled: pushNotifications.isEnabled(), 
        permission: pushNotifications.getPermissionStatus(),
        supportLevel: browserSupport?.supportLevel
      });

    } catch (error: any) {
      console.error('❌ Push notification initialization failed:', error);
      const errorMessage = error.message || 'Failed to initialize push notifications';
      setError(errorMessage);
      setIsEnabled(false);
      
      // Show user-friendly error toast
      toast({
        title: '⚠️ Notification Setup Issue',
        description: 'Push notifications could not be initialized. You can still use the app normally.',
        type: 'warning',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);
  
  /**
   * Retry initialization (useful for temporary failures)
   */
  const retryInitialization = useCallback(async () => {
    await initializePushNotifications();
  }, [initializePushNotifications]);

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
      
      // Enhanced error handling with specific messages
      let errorTitle = '❌ Notification Error';
      let errorDescription = error.message;
      let toastType: 'error' | 'warning' = 'error';
      let duration = 5000;
      
      if (error.message.includes('permission') && error.message.includes('denied')) {
        errorTitle = '🚫 Permission Denied';
        errorDescription = 'Please enable notifications in your browser settings and refresh the page.';
        duration = 8000;
      } else if (error.message.includes('iOS') && error.message.includes('16.4')) {
        errorTitle = '📱 iOS Update Required';
        errorDescription = 'Push notifications require iOS 16.4+. Please update your device.';
        toastType = 'warning';
        duration = 8000;
      } else if (error.message.includes('not supported')) {
        errorTitle = '🌐 Browser Not Supported';
        errorDescription = `Try using: ${recommendedBrowsers.join(', ')}`;
        toastType = 'warning';
        duration = 6000;
      } else if (error.message.includes('VAPID') || error.message.includes('configured')) {
        errorTitle = '🔧 Configuration Issue';
        errorDescription = 'Push notifications are not properly set up. Please contact support.';
        duration = 6000;
      } else if (error.message.includes('Service worker')) {
        errorTitle = '🔄 Service Issue';
        errorDescription = 'Please refresh the page and try again.';
        duration = 5000;
      }
      
      setError(errorDescription);
      toast({
        title: errorTitle,
        description: errorDescription,
        type: toastType,
        duration
      });

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

  const showUnsupportedMessage = !isSupported && !isLoading && (supportLevel === 'none' || supportLevel === 'partial');
  
  return {
    isEnabled: isLoading ? false : Boolean(isEnabled),
    isSupported,
    permission,
    isLoading,
    error,
    supportMessage,
    recommendedBrowsers,
    supportLevel,
    showUnsupportedMessage,
    toggleNotifications,
    sendTestNotification,
    retryInitialization
  };
}