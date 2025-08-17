'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ProductionPushNotificationsProps {
  userId: string;
  className?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPreferences {
  enabled: boolean;
  endpoint: string | null;
  p256dh_key: string | null;
  auth_key: string | null;
  user_agent: string;
}

export function ProductionPushNotifications({ userId, className = '' }: ProductionPushNotificationsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);

  useEffect(() => {
    initializeNotifications();
  }, [userId]);

  // Utility: Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Utility: Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Save preferences to database
  const savePreferences = async (enabled: boolean, subscriptionData: PushSubscriptionData | null): Promise<void> => {
    try {
      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: userId,
          enabled,
          endpoint: subscriptionData?.endpoint || null,
          p256dh_key: subscriptionData?.keys.p256dh || null,
          auth_key: subscriptionData?.keys.auth || null,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Failed to save push preferences:', error);
      }
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  };

  // Subscribe to push notifications with VAPID
  const subscribeToPush = async (): Promise<PushSubscriptionData | null> => {
    if (!registration) {
      throw new Error('Service worker not available');
    }

    try {
      // Check for existing subscription
      let browserSubscription = await registration.pushManager.getSubscription();
      
      if (!browserSubscription) {
        // Create new subscription with VAPID key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BNxVgm6xOemQ7qBRSXWnRIqQNDaKyJLEiGTiJbpEDOi2NDL-ZFY4Xq8xvQ_QO6Qh8yg8R2vQq2qPYo_3qz5-A';
        
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        browserSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('✅ New push subscription created');
      }

      // Convert to our format
      const subscriptionData: PushSubscriptionData = {
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(browserSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(browserSubscription.getKey('auth')!)
        }
      };

      setSubscription(subscriptionData);
      return subscriptionData;

    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw new Error('Failed to set up push notifications');
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async (): Promise<void> => {
    try {
      if (registration) {
        const browserSubscription = await registration.pushManager.getSubscription();
        if (browserSubscription) {
          await browserSubscription.unsubscribe();
          console.log('✅ Push subscription removed');
        }
      }
      setSubscription(null);
    } catch (error) {
      console.warn('⚠️ Failed to unsubscribe:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      // Register service worker first
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/service-worker.js');
          setRegistration(reg);
          console.log('✅ Service worker registered');
        } catch (swError) {
          console.warn('Service worker registration failed:', swError);
        }
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        setStatus('error');
        setMessage('Notifications not supported in this browser');
        return;
      }

      // Load existing preferences from database
      try {
        const { data: preferences } = await supabase
          .from('push_notification_preferences')
          .select('enabled, endpoint, p256dh_key, auth_key')
          .eq('user_id', userId)
          .single();

        if (preferences?.enabled && preferences.endpoint) {
          setIsEnabled(true);
          setStatus('success');
          setMessage('Receiving real-time notifications');
          setSubscription({
            endpoint: preferences.endpoint,
            keys: {
              p256dh: preferences.p256dh_key || '',
              auth: preferences.auth_key || ''
            }
          });
          return;
        }
      } catch (error) {
        console.log('No existing preferences found');
      }

      // Check current permission status
      const permission = Notification.permission;
      if (permission === 'granted') {
        setIsEnabled(false); // Not enabled until VAPID subscription is created
        setStatus('idle');
        setMessage('Turn on to get notified about bakery activities');
      } else if (permission === 'denied') {
        setIsEnabled(false);
        setStatus('error');
        setMessage('Notifications blocked. Click for help with browser settings');
      } else {
        setIsEnabled(false);
        setStatus('idle');
        setMessage('Turn on to get notified about bakery activities');
      }
    } catch (error) {
      console.warn('Failed to initialize notifications:', error);
      setIsEnabled(false);
      setStatus('idle');
      setMessage('Turn on to get notified about bakery activities');
    }
  };

  const handleToggle = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setMessage('');

      if (!isEnabled) {
        // Enabling notifications
        if (!('Notification' in window)) {
          setStatus('error');
          setMessage('Notifications not supported in this browser');
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          try {
            // Create VAPID subscription for actual push notifications
            const subscriptionData = await subscribeToPush();
            
            // Save to database
            await savePreferences(true, subscriptionData);
            
            // Set success state after everything is set up
            setIsEnabled(true);
            setStatus('success');
            setMessage('✅ Push notifications enabled! You\'ll receive real-time updates');
            
            // Show test notification
            try {
              new Notification('HomeBake', {
                body: 'Push notifications are now enabled!',
                icon: '/icons/icon-192x192.png'
              });
            } catch (notifError) {
              console.warn('Test notification failed:', notifError);
            }
          } catch (vapidError) {
            console.error('VAPID subscription failed:', vapidError);
            setStatus('error');
            setMessage('❌ Failed to set up push notifications. Please try again');
          }
          
        } else if (permission === 'denied') {
          setStatus('error');
          setMessage('❌ Permission denied. Please enable notifications in your browser settings');
        } else {
          setStatus('error');
          setMessage('❌ Permission required. Please allow notifications to continue');
        }
      } else {
        // Disabling notifications
        try {
          await unsubscribeFromPush();
          await savePreferences(false, null);
          
          setIsEnabled(false);
          setStatus('idle');
          setMessage('Notifications disabled');
        } catch (error) {
          console.warn('Failed to disable notifications:', error);
          setIsEnabled(false);
          setStatus('idle');
          setMessage('Notifications disabled');
        }
      }
    } catch (error) {
      // Only show error if we actually failed (not if just test notification failed)
      if (!isEnabled) {
        setStatus('error');
        setMessage('❌ Failed to enable notifications. Please try again');
        console.error('Toggle failed:', error);
      }
      // If isEnabled is true, we succeeded despite the error
    } finally {
      setIsLoading(false);
    }
  };

  const openBrowserSettings = () => {
    setMessage('💡 Go to browser settings → Privacy & Security → Notifications → Allow for this site');
  };

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V12a1 1 0 00-1-1H9a1 1 0 00-1 1v5l-5 5 5-5h5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-500">Real-time bakery updates</p>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            isEnabled ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {isEnabled ? (
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-500">
              {isEnabled ? 'Receiving updates' : 'No notifications'}
            </p>
          </div>
        </div>

        {/* iOS Style Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 ${
            isEnabled ? 'bg-orange-500' : 'bg-gray-300'
          }`}
          style={{
            boxShadow: isEnabled ? '0 2px 4px rgba(249, 115, 22, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
              isEnabled ? 'translate-x-7' : 'translate-x-1'
            } ${isLoading ? 'animate-pulse' : ''}`}
          />
        </button>
      </div>

      {/* Status Message */}
      <div className={`p-3 rounded-lg text-sm ${
        status === 'success' ? 'bg-green-50 border border-green-200' :
        status === 'error' ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <p className={`${
          status === 'success' ? 'text-green-700' :
          status === 'error' ? 'text-red-700' :
          'text-gray-700'
        }`}>
          {isLoading ? '⏳ Updating...' : message}
        </p>
        
        {/* Error Actions */}
        {status === 'error' && (message.includes('Permission denied') || message.includes('blocked')) && (
          <button
            onClick={openBrowserSettings}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            How to enable in browser settings →
          </button>
        )}
        
        {status === 'error' && !message.includes('not supported') && !message.includes('blocked') && (
          <button
            onClick={() => {
              setStatus('idle');
              setMessage('Turn on to get notified about bakery activities');
              handleToggle();
            }}
            disabled={isLoading}
            className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Success Additional Info */}
      {status === 'success' && isEnabled && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 You'll receive notifications for new sales, production updates, and important bakery activities.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProductionPushNotifications;