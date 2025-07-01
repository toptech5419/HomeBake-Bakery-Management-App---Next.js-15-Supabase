'use client';

import { useState, useEffect } from 'react';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
  timestamp?: number;
}

export class PWANotifications {
  private static subscription: PushSubscription | null = null;
  private static registration: ServiceWorkerRegistration | null = null;

  // Check if notifications are supported
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  // Get current permission status
  static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  // Request notification permission
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notifications permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // Initialize push notifications
  static async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  static async subscribe(vapidPublicKey?: string): Promise<PushSubscriptionData | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service worker not available');
      return null;
    }

    // Request permission first
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return null;
    }

    try {
      // Use provided VAPID key or fallback to environment variable
      const publicKey = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!publicKey) {
        console.warn('No VAPID public key provided, using basic subscription');
      }

      const subscriptionOptions: any = {
        userVisibleOnly: true
      };
      
      if (publicKey) {
        subscriptionOptions.applicationServerKey = this.urlBase64ToUint8Array(publicKey);
      }

      this.subscription = await this.registration.pushManager.subscribe(subscriptionOptions);

      const subscriptionData: PushSubscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
        }
      };

      // Save subscription to Supabase (optional)
      await this.saveSubscriptionToDatabase(subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  static async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      const unsubscribed = await this.subscription.unsubscribe();
      if (unsubscribed) {
        this.subscription = null;
        // Remove from database
        await this.removeSubscriptionFromDatabase();
      }
      return unsubscribed;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Show local notification
  static async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.registration) {
      // Fallback to browser notification
      if (this.isSupported() && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          tag: payload.tag,
          requireInteraction: payload.requireInteraction,
          data: payload.data
        });
      }
      return;
    }

    try {
      const notificationOptions: any = {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        tag: payload.tag || 'homebake',
        requireInteraction: payload.requireInteraction || false,
        data: payload.data,
        vibrate: [100, 50, 100],
        renotify: true
      };
      
      if (payload.actions) {
        notificationOptions.actions = payload.actions;
      }
      
      await this.registration.showNotification(payload.title, notificationOptions);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Get current subscription
  static getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  // Check if currently subscribed
  static isSubscribed(): boolean {
    return this.subscription !== null;
  }

  // Utility: Convert VAPID key to Uint8Array
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
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
  }

  // Utility: Convert ArrayBuffer to base64
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Save subscription to Supabase database
  private static async saveSubscriptionToDatabase(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      // This would integrate with your Supabase setup
      // For now, just save to localStorage as fallback
      localStorage.setItem('push-subscription', JSON.stringify(subscriptionData));
      
      // TODO: Implement actual Supabase integration when push notification table is available
      /*
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: subscriptionData.endpoint,
            p256dh: subscriptionData.keys.p256dh,
            auth: subscriptionData.keys.auth,
            created_at: new Date().toISOString()
          });
      }
      */
    } catch (error) {
      console.error('Failed to save subscription to database:', error);
    }
  }

  // Remove subscription from database
  private static async removeSubscriptionFromDatabase(): Promise<void> {
    try {
      localStorage.removeItem('push-subscription');
      
      // TODO: Implement actual Supabase integration
      /*
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }
      */
    } catch (error) {
      console.error('Failed to remove subscription from database:', error);
    }
  }
}

// React hook for managing push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });

  useEffect(() => {
    const checkSupport = async () => {
      const supported = PWANotifications.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        setPermission(PWANotifications.getPermissionStatus());
        
        await PWANotifications.initialize();
        setIsSubscribed(PWANotifications.isSubscribed());
      }
    };

    checkSupport();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    const granted = await PWANotifications.requestPermission();
    setPermission(PWANotifications.getPermissionStatus());
    return granted;
  };

  const subscribe = async (vapidPublicKey?: string): Promise<boolean> => {
    const subscriptionData = await PWANotifications.subscribe(vapidPublicKey);
    const success = subscriptionData !== null;
    setIsSubscribed(success);
    return success;
  };

  const unsubscribe = async (): Promise<boolean> => {
    const success = await PWANotifications.unsubscribe();
    setIsSubscribed(!success);
    return success;
  };

  const showNotification = async (payload: NotificationPayload): Promise<void> => {
    await PWANotifications.showNotification(payload);
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  };
}

// Predefined notification templates for bakery use cases
export const NotificationTemplates = {
  shiftReminder: (shiftType: 'morning' | 'night'): NotificationPayload => ({
    title: 'Shift Reminder',
    body: `Your ${shiftType} shift is starting soon`,
    icon: '/icons/icon-192x192.png',
    tag: 'shift-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Start Shift',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-96x96.png'
      }
    ],
    data: { type: 'shift-reminder', shift: shiftType }
  }),

  lowStock: (breadType: string, quantity: number): NotificationPayload => ({
    title: 'Low Stock Alert',
    body: `${breadType} is running low (${quantity} remaining)`,
    icon: '/icons/icon-192x192.png',
    tag: 'low-stock',
    requireInteraction: false,
    actions: [
      {
        action: 'produce',
        title: 'Add Production',
        icon: '/icons/icon-96x96.png'
      }
    ],
    data: { type: 'low-stock', breadType, quantity }
  }),

  salesTarget: (achieved: number, target: number): NotificationPayload => ({
    title: 'Sales Update',
    body: `Great work! You've achieved ${achieved}% of today's target`,
    icon: '/icons/icon-192x192.png',
    tag: 'sales-target',
    requireInteraction: false,
    data: { type: 'sales-target', achieved, target }
  }),

  syncComplete: (itemCount: number): NotificationPayload => ({
    title: 'Data Synced',
    body: `${itemCount} items successfully synced to server`,
    icon: '/icons/icon-192x192.png',
    tag: 'sync-complete',
    requireInteraction: false,
    data: { type: 'sync-complete', itemCount }
  })
};