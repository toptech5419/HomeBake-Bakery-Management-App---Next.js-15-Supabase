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
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  user_name?: string;
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: any;
  };
  url?: string;
}

class PushNotificationService {
  private _isSupported: boolean = false;
  private _isEnabled: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscriptionData | null = null;

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if push notifications are supported in this browser
   */
  private checkSupport(): void {
    this._isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<boolean> {
    if (!this._isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Check current permission status
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Load saved preferences
        await this.loadUserPreferences();
        
        // Subscribe to push notifications if enabled
        if (this._isEnabled) {
          await this.subscribeToPush();
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Register service worker for push notifications
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Load user preferences from database
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferences, error } = await supabase
        .from('push_notification_preferences')
        .select('enabled, endpoint, p256dh_key, auth_key')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('Error loading push preferences:', error);
        return;
      }

      if (preferences) {
        this._isEnabled = preferences.enabled;
        if (preferences.endpoint && preferences.p256dh_key && preferences.auth_key) {
          this.subscription = {
            endpoint: preferences.endpoint,
            keys: {
              p256dh: preferences.p256dh_key,
              auth: preferences.auth_key
            }
          };
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Use VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      const browserSubscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      this.subscription = {
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: browserSubscription.toJSON().keys!.p256dh!,
          auth: browserSubscription.toJSON().keys!.auth!
        }
      };

      // Save subscription to database
      await this.saveSubscriptionToDatabase();

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Save push subscription to database
   */
  private async saveSubscriptionToDatabase(): Promise<void> {
    if (!this.subscription) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscriptionData = {
        user_id: user.id,
        enabled: this._isEnabled,
        endpoint: this.subscription.endpoint,
        p256dh_key: this.subscription.keys.p256dh,
        auth_key: this.subscription.keys.auth,
        user_agent: navigator.userAgent
      };

      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert(subscriptionData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving push subscription:', error);
        throw error;
      }

    } catch (error) {
      console.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  /**
   * Toggle push notifications on/off
   */
  async toggleNotifications(userId?: string): Promise<boolean> {
    const currentState = this._isEnabled; // Move outside try block for scope access
    
    try {
      if (!this._isSupported) {
        throw new Error('Push notifications not supported');
      }

      // Request permission if not already granted
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const targetState = !currentState;

      if (targetState) {
        // Enabling notifications
        await this.subscribeToPush();
        
        // Verify we have a subscription before saving
        if (!this.subscription) {
          throw new Error('Failed to create push subscription');
        }
        
        // Save with the subscription data
        this._isEnabled = true;
        await this.savePreferences(userId);
        
      } else {
        // Disabling notifications
        this._isEnabled = false;
        await this.unsubscribeFromPush();
        await this.savePreferences(userId);
      }
      return this._isEnabled;
    } catch (error) {
      // Restore previous state on error
      this._isEnabled = currentState;
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  private async unsubscribeFromPush(): Promise<void> {
    if (this.subscription && this.registration) {
      try {
        const pushSubscription = await this.registration.pushManager.getSubscription();
        if (pushSubscription) {
          await pushSubscription.unsubscribe();
        }
        this.subscription = null;
      } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error);
      }
    }
  }

  /**
   * Save preferences to database
   */
  private async savePreferences(userId?: string): Promise<void> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('No authenticated user found - please pass user ID explicitly');
        }
        user_id = user.id;
      }
      
      // Prepare subscription data - only save if we're enabled AND have a subscription
      const subscriptionData = (this._isEnabled && this.subscription) ? {
        endpoint: this.subscription.endpoint,
        p256dh_key: this.subscription.keys.p256dh,
        auth_key: this.subscription.keys.auth
      } : {
        endpoint: null,
        p256dh_key: null,
        auth_key: null
      };

      const { error } = await supabase
        .from('push_notification_preferences')
        .upsert({
          user_id: user_id,
          enabled: this._isEnabled,
          ...subscriptionData,
          user_agent: navigator.userAgent
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a test notification (both browser and push notification)
   */
  async sendTestNotification(): Promise<void> {
    if (!this._isSupported || !this._isEnabled) {
      throw new Error('Push notifications not available');
    }

    try {
      // Show a browser notification for immediate feedback
      const testPayload: NotificationPayload = {
        title: 'HomeBake Test Notification',
        body: 'Push notifications are working perfectly! 🍞',
        activity_type: 'login',
        user_name: 'Test User',
        url: '/owner-dashboard'
      };

      await this.sendNotification(testPayload);
      
      // Also trigger a server-side push notification for testing
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/push-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity_type: 'login',
          user_id: 'test-user',
          user_name: 'Test User',
          user_role: 'sales_rep',
          message: 'This is a test notification from HomeBake! 🍞',
          metadata: { test: true }
        })
      });

      if (!response.ok) {
        throw new Error('Test notification API call failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send push notification (called by server when activity occurs)
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    // This would typically be called by the server via web push protocol
    // For now, we'll simulate it with a local notification for testing
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = this.getActivityIcon(payload.activity_type);
      new Notification(`${icon} ${payload.title}`, {
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        tag: `homebake-${payload.activity_type}`,
        data: payload
      });
    }
  }

  /**
   * Get emoji icon for activity type
   */
  private getActivityIcon(activityType: string): string {
    const icons = {
      sale: '🛒',
      batch: '📦',
      report: '📊', 
      login: '👤',
      end_shift: '🕐',
      created: '➕'
    };
    return icons[activityType as keyof typeof icons] || '🔔';
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if notifications are enabled (primary method)
   */
  isEnabled(): boolean {
    return this._isEnabled && this._isSupported && Notification.permission === 'granted';
  }

  /**
   * Get current notification status (alias for isEnabled)
   */
  getEnabledStatus(): boolean {
    return this.isEnabled();
  }

  /**
   * Get support status
   */
  getSupportStatus(): boolean {
    return this._isSupported;
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return this._isSupported;
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();

// Debug export
if (typeof window !== 'undefined') {
  console.log('[PushNotifications] Service exported with methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pushNotifications)));
  console.log('[PushNotifications] isEnabled method type:', typeof pushNotifications.isEnabled);
  console.log('[PushNotifications] getEnabledStatus method type:', typeof pushNotifications.getEnabledStatus);
}