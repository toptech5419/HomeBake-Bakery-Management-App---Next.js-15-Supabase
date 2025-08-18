'use client';

import { supabase } from '@/lib/supabase/client';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

class SimplePushNotifications {
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Check if push notifications are supported in this browser
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current notification permission status
   */
  getPermission(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'default';
  }

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🚀 Initializing push notifications...');

      if (!this.isSupported()) {
        console.log('ℹ️ Push notifications not supported in this browser');
        return false;
      }

      // Register service worker
      await this.registerServiceWorker();
      
      this.isInitialized = true;
      console.log('✅ Push notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      this.initPromise = null; // Allow retry
      return false;
    }
  }

  /**
   * Register service worker with simple retry logic
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      // Check for existing registration first
      const existingReg = await navigator.serviceWorker.getRegistration('/');
      if (existingReg && existingReg.active) {
        this.registration = existingReg;
        console.log('♻️ Using existing service worker');
        return;
      }

      // Register new service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('✅ Service worker registered');
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      throw new Error('Failed to register service worker');
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied. Please enable in browser settings.');
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      throw new Error('Failed to request notification permission');
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionData> {
    await this.initialize();

    if (!this.registration) {
      throw new Error('Service worker not available');
    }

    // Request permission first
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission required');
    }

    try {
      // Check for existing subscription
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
          throw new Error('VAPID key not configured');
        }

        const applicationServerKey = this.urlBase64ToUint8Array(vapidKey);
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      // Convert to our format
      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth
        }
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Failed to subscribe to push notifications');
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.registration) return;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw new Error('Failed to unsubscribe from push notifications');
    }
  }

  /**
   * Save push subscription to database with retry logic
   */
  async saveSubscription(userId: string, subscriptionData: PushSubscriptionData): Promise<void> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💾 Attempting to save subscription (${attempt}/${maxRetries})...`);

        const { error } = await supabase
          .from('push_notification_preferences')
          .upsert({
            user_id: userId,
            enabled: true,
            endpoint: subscriptionData.endpoint,
            p256dh_key: subscriptionData.keys.p256dh,
            auth_key: subscriptionData.keys.auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (error) {
          throw error;
        }

        console.log('✅ Push subscription saved successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Save attempt ${attempt}/${maxRetries} failed:`, {
          error: lastError.message,
          userId,
          endpoint: subscriptionData.endpoint.substring(0, 50) + '...'
        });

        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown error';
    console.error('🚨 All save attempts failed:', errorMessage);
    
    // Provide user-friendly error message
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    } else if (errorMessage.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    } else if (errorMessage.includes('row-level security policy')) {
      throw new Error('Authentication issue. Please refresh the page and try again.');
    } else if (errorMessage.includes('PGRST')) {
      throw new Error('Database error. Please try again or contact support.');
    } else {
      throw new Error(`Failed to save push subscription: ${errorMessage}`);
    }
  }

  /**
   * Remove push subscription from database with retry logic
   */
  async removeSubscription(userId: string): Promise<void> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗑️ Attempting to remove subscription (${attempt}/${maxRetries})...`);

        const { error } = await supabase
          .from('push_notification_preferences')
          .update({
            enabled: false,
            endpoint: null,
            p256dh_key: null,
            auth_key: null,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        console.log('✅ Push subscription removed successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Remove attempt ${attempt}/${maxRetries} failed:`, {
          error: lastError.message,
          userId
        });

        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    console.error('🚨 All remove attempts failed:', errorMessage);
    
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    } else if (errorMessage.includes('row-level security policy')) {
      throw new Error('Authentication issue. Please refresh the page and try again.');
    } else {
      throw new Error(`Failed to remove push subscription: ${errorMessage}`);
    }
  }

  /**
   * Get user's push notification preferences with retry logic
   */
  async getUserPreferences(userId: string): Promise<{ enabled: boolean; hasSubscription: boolean }> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📋 Getting user preferences (${attempt}/${maxRetries})...`);

        const { data, error } = await supabase
          .from('push_notification_preferences')
          .select('enabled, endpoint')
          .eq('user_id', userId)
          .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

        if (error && error.code !== 'PGRST116') throw error;

        const result = {
          enabled: data?.enabled ?? false,
          hasSubscription: !!(data?.endpoint)
        };

        console.log('✅ User preferences retrieved:', result);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Get preferences attempt ${attempt}/${maxRetries} failed:`, {
          error: lastError.message,
          userId
        });

        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('🚨 All get preferences attempts failed, using defaults');
    return { enabled: false, hasSubscription: false };
  }

  /**
   * Show a local notification (for testing)
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Notifications not available');
    }

    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        tag: payload.tag || 'homebake-notification',
        requireInteraction: false,
        silent: false
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw new Error('Failed to show notification');
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.showNotification({
      title: 'HomeBake Test',
      body: 'Push notifications are working! 🍞',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification'
    });
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// Export singleton instance
export const pushNotifications = new SimplePushNotifications();