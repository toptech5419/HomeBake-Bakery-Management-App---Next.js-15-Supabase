'use client';

import { supabase } from '@/lib/supabase/client';
import { getUserPushPreferences, createDefaultPushPreferences, updatePushPreferences } from './server-actions';

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
  metadata?: Record<string, any>;
  url?: string;
}

class SimplePushNotificationService {
  private _isSupported: boolean = true; // Always assume supported
  private _isEnabled: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscriptionData | null = null;
  private _initPromise: Promise<boolean> | null = null;

  constructor() {
    // Always assume browser support - let actual usage determine compatibility
    this._isSupported = true;
    console.log('🔔 Simple push notification service initialized');
  }

  /**
   * Simple initialization - just try to enable notifications
   */
  async initialize(): Promise<boolean> {
    if (this._initPromise) {
      return this._initPromise;
    }
    
    this._initPromise = this._doInitialize();
    return this._initPromise;
  }
  
  private async _doInitialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing push notifications...');
      
      // Try to register service worker
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('✅ Service worker registered');
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ Service worker registration failed:', error);
      return true; // Still return true to allow notification attempts
    }
  }

  /**
   * Simple toggle function - just try to enable/disable
   */
  async toggle(enable: boolean, userId: string): Promise<boolean> {
    try {
      if (enable) {
        console.log('🔔 Enabling push notifications...');
        
        // Request notification permission
        if (!('Notification' in window)) {
          throw new Error('This browser does not support notifications');
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'denied') {
          throw new Error('Notification permission was denied');
        }
        
        if (permission !== 'granted') {
          throw new Error('Notification permission is required');
        }

        // Try to subscribe to push notifications
        await this.subscribeToPush();
        
        this._isEnabled = true;
        await this.savePreferences(userId);
        console.log('✅ Push notifications enabled');
        
      } else {
        console.log('🔕 Disabling push notifications...');
        this._isEnabled = false;
        await this.unsubscribeFromPush();
        await this.savePreferences(userId);
        console.log('✅ Push notifications disabled');
      }
      
      return this._isEnabled;
    } catch (error) {
      console.error('❌ Push notification toggle failed:', error);
      throw error;
    }
  }

  /**
   * Simple push subscription
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.registration) {
      // Try to initialize if not already done
      await this.initialize();
    }

    if (!this.registration) {
      throw new Error('Service worker not available');
    }

    try {
      // Check for existing subscription
      let browserSubscription = await this.registration.pushManager.getSubscription();
      
      if (!browserSubscription) {
        // Create new subscription
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        
        if (!vapidPublicKey) {
          throw new Error('Push notifications are not configured properly');
        }
        
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

        browserSubscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('✅ New push subscription created');
      }

      // Convert to our format
      this.subscription = {
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(browserSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(browserSubscription.getKey('auth')!)
        }
      };

    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw new Error('Failed to set up push notifications');
    }
  }

  /**
   * Simple unsubscribe
   */
  private async unsubscribeFromPush(): Promise<void> {
    try {
      if (this.registration) {
        const subscription = await this.registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          console.log('✅ Push subscription removed');
        }
      }
      this.subscription = null;
    } catch (error) {
      console.warn('⚠️ Failed to unsubscribe:', error);
    }
  }

  /**
   * Save preferences to database
   */
  private async savePreferences(userId: string): Promise<void> {
    try {
      await updatePushPreferences(userId, {
        enabled: this._isEnabled,
        endpoint: this.subscription?.endpoint || null,
        p256dh_key: this.subscription?.keys.p256dh || null,
        auth_key: this.subscription?.keys.auth || null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.warn('⚠️ Failed to save preferences:', error);
    }
  }

  /**
   * Utility: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Public getters
   */
  isSupported(): boolean {
    return this._isSupported;
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  getBrowserSupport() {
    return {
      isSupported: true,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotifications: 'Notification' in window
    };
  }

  /**
   * Load user preferences
   */
  async loadPreferences(userId: string): Promise<void> {
    try {
      const preferences = await getUserPushPreferences(userId);
      this._isEnabled = preferences?.enabled || false;
    } catch (error) {
      console.warn('⚠️ Failed to load preferences:', error);
      this._isEnabled = false;
    }
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'default';
  }
}

// Export singleton instance
export const simplePushNotifications = new SimplePushNotificationService();

// Debug export
if (typeof window !== 'undefined') {
  (window as any).simplePushNotifications = simplePushNotifications;
}

export default SimplePushNotificationService;