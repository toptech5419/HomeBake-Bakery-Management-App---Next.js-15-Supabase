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
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: any;
  };
  url?: string;
}

interface BrowserSupport {
  isSupported: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotifications: boolean;
  isIOSSafari: boolean;
  isIOSVersionSupported: boolean;
  isMobileSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  supportLevel: 'full' | 'partial' | 'none';
  reason?: string;
}

class PushNotificationService {
  private _isSupported: boolean = false;
  private _isEnabled: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscriptionData | null = null;
  private browserSupport: BrowserSupport | null = null;
  private _initPromise: Promise<boolean> | null = null;

  constructor() {
    this.checkSupport();
  }

  /**
   * Comprehensive browser support detection
   */
  private checkSupport(): void {
    const userAgent = navigator.userAgent;
    
    // Basic feature detection
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotifications = 'Notification' in window;
    
    // Browser detection
    const isIOSSafari = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMobileSafari = /Safari/.test(userAgent) && /Mobile/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    
    // iOS version detection for Safari
    let isIOSVersionSupported = true;
    if (isIOSSafari) {
      const match = userAgent.match(/OS (\d+)_(\d+)/);
      if (match) {
        const majorVersion = parseInt(match[1]);
        const minorVersion = parseInt(match[2]);
        // iOS 16.4+ required for web push
        isIOSVersionSupported = majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
      } else {
        // If we can't detect version, assume it's too old
        isIOSVersionSupported = false;
      }
    }
    
    // Determine support level
    let supportLevel: 'full' | 'partial' | 'none' = 'none';
    let reason: string | undefined;
    
    if (!hasServiceWorker || !hasPushManager || !hasNotifications) {
      supportLevel = 'none';
      reason = 'Browser lacks essential web push APIs';
    } else if (isIOSSafari && !isIOSVersionSupported) {
      supportLevel = 'none';
      reason = 'iOS Safari requires version 16.4 or later for web push notifications';
    } else if (isMobileSafari && !isIOSSafari) {
      supportLevel = 'partial';
      reason = 'Mobile Safari has limited push notification support';
    } else if (isChrome || isFirefox || (isIOSSafari && isIOSVersionSupported)) {
      supportLevel = 'full';
    } else {
      supportLevel = 'partial';
      reason = 'Browser may have limited push notification support';
    }
    
    this.browserSupport = {
      isSupported: supportLevel !== 'none',
      hasServiceWorker,
      hasPushManager,
      hasNotifications,
      isIOSSafari,
      isIOSVersionSupported,
      isMobileSafari,
      isChrome,
      isFirefox,
      supportLevel,
      reason
    };
    
    this._isSupported = this.browserSupport.isSupported;
    
    console.log('🔍 Browser support analysis:', this.browserSupport);
  }

  /**
   * Initialize push notification service with proper timing and error handling
   */
  async initialize(): Promise<boolean> {
    // Return existing promise if already initializing
    if (this._initPromise) {
      return this._initPromise;
    }
    
    this._initPromise = this._doInitialize();
    return this._initPromise;
  }
  
  private async _doInitialize(): Promise<boolean> {
    if (!this._isSupported) {
      const reason = this.browserSupport?.reason || 'Push notifications are not supported in this browser';
      console.warn('🚫 Push notifications not supported:', reason);
      return false;
    }

    try {
      // Register service worker with retry logic
      await this.registerServiceWorker();
      
      // Wait for service worker to be fully ready
      await this.waitForServiceWorkerReady();
      
      console.log('✅ Push notifications service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notifications service:', error);
      this._initPromise = null; // Reset so we can retry
      return false;
    }
  }

  /**
   * Register service worker with enhanced error handling and timing
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      console.log('🔄 Registering service worker...');
      
      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        console.log('♻️ Using existing service worker registration');
        this.registration = existingRegistration;
      } else {
        console.log('📝 Creating new service worker registration');
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
      }
      
      // Listen for registration events
      this.registration.addEventListener('updatefound', () => {
        console.log('🔄 Service worker update found');
      });
      
      console.log('✅ Service worker registered successfully');
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      throw new Error(`Service worker registration failed: ${error.message}`);
    }
  }
  
  /**
   * Wait for service worker to be fully ready with timeout
   */
  private async waitForServiceWorkerReady(): Promise<void> {
    try {
      console.log('⏳ Waiting for service worker to be ready...');
      
      // Wait for service worker to be ready with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Service worker ready timeout')), 10000);
      });
      
      await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise
      ]);
      
      // Additional small delay to ensure everything is fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Service worker is ready');
    } catch (error) {
      console.error('❌ Service worker ready timeout:', error);
      throw error;
    }
  }

  /**
   * Load user preferences from database with explicit userId
   */
  async loadUserPreferences(userId?: string): Promise<void> {
    try {
      console.log('🔍 Loading push preferences for user:', userId);

      // Use server action instead of direct client query
      const preferences = await getUserPushPreferences(userId);
      
      console.log('📊 Server action result:', preferences);

      if (preferences) {
        // Handle boolean values from database
        this._isEnabled = Boolean(preferences.enabled);
        console.log('✅ Loaded push notification preference from DB:', this._isEnabled, '(raw value:', preferences.enabled, ')');
        
        if (preferences.endpoint && preferences.p256dh_key && preferences.auth_key) {
          this.subscription = {
            endpoint: preferences.endpoint,
            keys: {
              p256dh: preferences.p256dh_key,
              auth: preferences.auth_key
            }
          };
          console.log('✅ Loaded existing subscription from DB');
        }
      } else {
        console.log('ℹ️ No push notification preferences found in DB - creating default record with enabled=true');
        try {
          // Create default record with enabled=true (matching database default)
          await createDefaultPushPreferences(userId);
          this._isEnabled = true;
        } catch (createError) {
          console.warn('⚠️ Failed to create default preferences, using fallback enabled=true');
          this._isEnabled = true; // Still default to enabled as per schema
        }
      }
    } catch (error) {
      console.error('❌ Failed to load user preferences:', error);
      // On database failure, default to enabled (to match database default) but don't crash
      this._isEnabled = true;
    }
  }

  /**
   * Create default preferences record for new users
   */
  private async createDefaultPreferences(userId: string): Promise<void> {
    try {
      // Use server action instead of direct client operation
      await createDefaultPushPreferences(userId);
      console.log('✅ Created default push notification preferences for user');
    } catch (error) {
      console.error('❌ Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications with enhanced error handling
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered. Please refresh the page and try again.');
    }

    try {
      console.log('🔄 Creating push subscription...');
      
      // Check for existing subscription first
      let browserSubscription = await this.registration.pushManager.getSubscription();
      
      if (!browserSubscription) {
        // Create new subscription
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        
        if (!vapidPublicKey) {
          throw new Error('Push notifications are not properly configured. Please contact support.');
        }
        
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

        browserSubscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        
        console.log('✅ New push subscription created');
      } else {
        console.log('♻️ Using existing push subscription');
      }

      // Convert to our format
      const subscriptionJson = browserSubscription.toJSON();
      if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription keys received from browser');
      }
      
      this.subscription = {
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth
        }
      };

      // Save subscription to database
      await this.saveSubscriptionToDatabase();
      console.log('✅ Push subscription saved to database');

    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not supported')) {
          throw new Error('Push notifications are not supported in this browser.');
        } else if (error.message.includes('permission')) {
          throw new Error('Notification permission was denied or revoked.');
        } else if (error.message.includes('VAPID')) {
          throw new Error('Push notifications are not properly configured.');
        } else {
          throw error;
        }
      } else {
        throw new Error('Failed to create push subscription. Please try again.');
      }
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
   * Toggle push notifications with comprehensive error handling
   */
  async toggleNotifications(userId?: string): Promise<boolean> {
    const currentState = this._isEnabled;
    
    try {
      // Check support first
      if (!this._isSupported) {
        const reason = this.browserSupport?.reason || 'Push notifications are not supported in this browser';
        throw new Error(reason);
      }
      
      // Ensure service is initialized
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize push notification service');
      }

      const targetState = !currentState;

      if (targetState) {
        // Enabling notifications
        console.log('🔔 Enabling push notifications...');
        
        // Request permission with better error handling
        let permission: NotificationPermission;
        try {
          permission = await Notification.requestPermission();
        } catch (permError) {
          throw new Error('Failed to request notification permission. Please enable notifications in your browser settings.');
        }
        
        if (permission === 'denied') {
          throw new Error('Notification permission was denied. Please enable notifications in your browser settings and refresh the page.');
        }
        
        if (permission !== 'granted') {
          throw new Error('Notification permission is required for push notifications.');
        }
        
        // Subscribe to push notifications
        await this.subscribeToPush();
        
        // Verify subscription was created
        if (!this.subscription) {
          throw new Error('Failed to create push subscription. Please try again.');
        }
        
        this._isEnabled = true;
        await this.savePreferences(userId);
        console.log('✅ Push notifications enabled successfully');
        
      } else {
        // Disabling notifications
        console.log('🔕 Disabling push notifications...');
        this._isEnabled = false;
        await this.unsubscribeFromPush();
        await this.savePreferences(userId);
        console.log('✅ Push notifications disabled successfully');
      }
      
      return this._isEnabled;
    } catch (error) {
      console.error('❌ Push notification toggle failed:', error);
      
      // Restore previous state on error
      this._isEnabled = currentState;
      
      // Re-throw with enhanced error message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`An unexpected error occurred: ${String(error)}`);
      }
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

      // Use server action instead of direct client operation
      await updatePushPreferences({
        enabled: Boolean(this._isEnabled),
        ...subscriptionData,
        user_agent: navigator.userAgent
      }, userId);
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
   * Get user preference only (regardless of browser permission)
   */
  getUserPreference(): boolean {
    return this._isEnabled;
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
   * Get detailed browser support information
   */
  getBrowserSupport(): BrowserSupport | null {
    return this.browserSupport;
  }
  
  /**
   * Get user-friendly support message
   */
  getSupportMessage(): string {
    if (!this.browserSupport) {
      return 'Checking browser support...';
    }
    
    const { supportLevel, reason, isIOSSafari, isIOSVersionSupported, isMobileSafari } = this.browserSupport;
    
    switch (supportLevel) {
      case 'full':
        return 'Push notifications are fully supported in your browser.';
      case 'partial':
        if (isMobileSafari) {
          return 'Push notifications have limited support in Mobile Safari. For best experience, use Chrome or Firefox.';
        }
        return reason || 'Push notifications have limited support in your browser.';
      case 'none':
      default:
        if (isIOSSafari && !isIOSVersionSupported) {
          return 'Push notifications require iOS 16.4 or later. Please update your device or use a supported browser.';
        }
        return reason || 'Push notifications are not supported in your browser. Please use Chrome, Firefox, or Safari 16.4+.';
    }
  }
  
  /**
   * Get recommended browsers for current platform
   */
  getRecommendedBrowsers(): string[] {
    if (!this.browserSupport) return [];
    
    const { isIOSSafari, isMobileSafari } = this.browserSupport;
    
    if (isIOSSafari) {
      return ['Safari 16.4+', 'Chrome for iOS', 'Firefox for iOS'];
    } else if (isMobileSafari) {
      return ['Chrome for Android', 'Firefox for Android'];
    } else {
      return ['Chrome', 'Firefox', 'Safari'];
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
export const pushNotifications = new PushNotificationService();

// Debug export - Make service globally accessible for debugging
if (typeof window !== 'undefined') {
  // @ts-ignore - For debugging purposes
  window.pushNotifications = pushNotifications;
  console.log('[PushNotifications] Service exported with methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pushNotifications)));
  console.log('[PushNotifications] isEnabled method type:', typeof pushNotifications.isEnabled);
  console.log('[PushNotifications] getEnabledStatus method type:', typeof pushNotifications.getEnabledStatus);
  console.log('[PushNotifications] Service now available globally as window.pushNotifications');
}