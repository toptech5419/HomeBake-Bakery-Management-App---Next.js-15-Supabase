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
  isEdge: boolean;
  isSamsungInternet: boolean;
  isOpera: boolean;
  isBrave: boolean;
  isUCBrowser: boolean;
  isInAppBrowser: boolean;
  browserName: string;
  browserVersion: string;
  supportLevel: 'full' | 'partial' | 'none' | 'fallback';
  reason?: string;
  fallbackMethods: string[];
  recommendedBrowsers: string[];
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
   * Comprehensive browser support detection with enhanced compatibility
   */
  private checkSupport(): void {
    const userAgent = navigator.userAgent;
    
    // Enhanced feature detection with fallbacks
    const hasServiceWorker = this.checkServiceWorkerSupport();
    const hasPushManager = this.checkPushManagerSupport();
    const hasNotifications = this.checkNotificationSupport();
    
    // Comprehensive browser detection
    const browserInfo = this.detectBrowser(userAgent);
    
    // iOS version detection with better parsing
    let isIOSVersionSupported = true;
    if (browserInfo.isIOSSafari) {
      isIOSVersionSupported = this.checkIOSVersion(userAgent);
    }
    
    // Determine support level with progressive enhancement
    const { supportLevel, reason, fallbackMethods, recommendedBrowsers } = this.determineSupportLevel({
      hasServiceWorker,
      hasPushManager,
      hasNotifications,
      browserInfo,
      isIOSVersionSupported
    });
    
    this.browserSupport = {
      isSupported: supportLevel !== 'none',
      hasServiceWorker,
      hasPushManager,
      hasNotifications,
      isIOSSafari: browserInfo.isIOSSafari,
      isIOSVersionSupported,
      isMobileSafari: browserInfo.isMobileSafari,
      isChrome: browserInfo.isChrome,
      isFirefox: browserInfo.isFirefox,
      isEdge: browserInfo.isEdge,
      isSamsungInternet: browserInfo.isSamsungInternet,
      isOpera: browserInfo.isOpera,
      isBrave: browserInfo.isBrave,
      isUCBrowser: browserInfo.isUCBrowser,
      isInAppBrowser: browserInfo.isInAppBrowser,
      browserName: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion,
      supportLevel,
      reason,
      fallbackMethods,
      recommendedBrowsers
    };
    
    this._isSupported = this.browserSupport.isSupported;
    
    console.log('🔍 Enhanced browser support analysis:', this.browserSupport);
  }

  /**
   * Enhanced service worker detection
   */
  private checkServiceWorkerSupport(): boolean {
    try {
      return 'serviceWorker' in navigator && 
             typeof navigator.serviceWorker !== 'undefined' &&
             typeof navigator.serviceWorker.register === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Enhanced push manager detection
   */
  private checkPushManagerSupport(): boolean {
    try {
      return 'PushManager' in window && 
             typeof window.PushManager !== 'undefined' &&
             typeof PushManager.prototype.subscribe === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Enhanced notification API detection
   */
  private checkNotificationSupport(): boolean {
    try {
      return 'Notification' in window && 
             typeof window.Notification !== 'undefined' &&
             typeof Notification.requestPermission === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Comprehensive browser detection
   */
  private detectBrowser(userAgent: string) {
    const browserInfo = {
      isIOSSafari: false,
      isMobileSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      isSamsungInternet: false,
      isOpera: false,
      isBrave: false,
      isUCBrowser: false,
      isInAppBrowser: false,
      browserName: 'Unknown',
      browserVersion: '0.0.0'
    };

    // iOS Safari
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      browserInfo.isIOSSafari = true;
      browserInfo.browserName = 'iOS Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Samsung Internet
    else if (/SamsungBrowser/.test(userAgent)) {
      browserInfo.isSamsungInternet = true;
      browserInfo.browserName = 'Samsung Internet';
      const match = userAgent.match(/SamsungBrowser\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // UC Browser
    else if (/UCBrowser|UBrowser/.test(userAgent)) {
      browserInfo.isUCBrowser = true;
      browserInfo.browserName = 'UC Browser';
      const match = userAgent.match(/UC?Browser\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Opera
    else if (/Opera|OPR/.test(userAgent)) {
      browserInfo.isOpera = true;
      browserInfo.browserName = 'Opera';
      const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Brave (detectable by checking for navigator.brave)
    else if ((navigator as any).brave && (navigator as any).brave.isBrave) {
      browserInfo.isBrave = true;
      browserInfo.browserName = 'Brave';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Edge
    else if (/Edg/.test(userAgent)) {
      browserInfo.isEdge = true;
      browserInfo.browserName = 'Microsoft Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Firefox
    else if (/Firefox/.test(userAgent)) {
      browserInfo.isFirefox = true;
      browserInfo.browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Chrome (must be after Edge and Samsung checks)
    else if (/Chrome/.test(userAgent) && !/Edge|Edg|SamsungBrowser|OPR/.test(userAgent)) {
      browserInfo.isChrome = true;
      browserInfo.browserName = 'Google Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }
    // Mobile Safari (non-iOS)
    else if (/Safari/.test(userAgent) && /Mobile/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)) {
      browserInfo.isMobileSafari = true;
      browserInfo.browserName = 'Mobile Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserInfo.browserVersion = match ? match[1] : '0.0.0';
    }

    // Detect in-app browsers
    if (/FBAN|FBAV|Instagram|Twitter|LinkedIn|WhatsApp|Telegram/.test(userAgent)) {
      browserInfo.isInAppBrowser = true;
      browserInfo.browserName += ' (In-App)';
    }

    return browserInfo;
  }

  /**
   * Enhanced iOS version checking
   */
  private checkIOSVersion(userAgent: string): boolean {
    try {
      const match = userAgent.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
      if (match) {
        const majorVersion = parseInt(match[1]);
        const minorVersion = parseInt(match[2]);
        // iOS 16.4+ required for web push
        return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
      }
      
      // Alternative check using Version string
      const versionMatch = userAgent.match(/Version\/(\d+)\.(\d+)/);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1]);
        const minorVersion = parseInt(versionMatch[2]);
        return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Determine support level with progressive enhancement
   */
  private determineSupportLevel({
    hasServiceWorker,
    hasPushManager,
    hasNotifications,
    browserInfo,
    isIOSVersionSupported
  }: {
    hasServiceWorker: boolean;
    hasPushManager: boolean;
    hasNotifications: boolean;
    browserInfo: any;
    isIOSVersionSupported: boolean;
  }) {
    let supportLevel: 'full' | 'partial' | 'none' | 'fallback' = 'none';
    let reason = '';
    let fallbackMethods: string[] = [];
    let recommendedBrowsers: string[] = [];

    // Full support browsers
    if ((browserInfo.isChrome || browserInfo.isFirefox || browserInfo.isEdge || 
         (browserInfo.isIOSSafari && isIOSVersionSupported) || browserInfo.isSamsungInternet) &&
        hasServiceWorker && hasPushManager && hasNotifications) {
      supportLevel = 'full';
      reason = `Push notifications are fully supported in ${browserInfo.browserName}.`;
    }
    // Partial support browsers
    else if ((browserInfo.isOpera || browserInfo.isBrave || 
              (browserInfo.isMobileSafari && hasNotifications)) &&
             hasServiceWorker && hasNotifications) {
      supportLevel = 'partial';
      reason = `${browserInfo.browserName} has partial push notification support.`;
      fallbackMethods = ['In-app notifications', 'Polling updates'];
    }
    // Fallback support
    else if (hasNotifications || browserInfo.isUCBrowser || browserInfo.isInAppBrowser) {
      supportLevel = 'fallback';
      reason = `${browserInfo.browserName} requires alternative notification methods.`;
      fallbackMethods = ['In-app notifications', 'Polling updates', 'Email notifications'];
      recommendedBrowsers = ['Chrome', 'Firefox', 'Edge', 'Samsung Internet'];
    }
    // No support
    else {
      supportLevel = 'none';
      if (browserInfo.isIOSSafari && !isIOSVersionSupported) {
        reason = 'iOS Safari requires version 16.4 or later for push notifications.';
        recommendedBrowsers = ['Update iOS to 16.4+', 'Chrome for iOS', 'Firefox for iOS'];
      } else if (browserInfo.isInAppBrowser) {
        reason = 'In-app browsers have limited notification support.';
        fallbackMethods = ['Open in external browser', 'In-app notifications'];
        recommendedBrowsers = ['Chrome', 'Firefox', 'Safari'];
      } else {
        reason = `${browserInfo.browserName} does not support push notifications.`;
        recommendedBrowsers = ['Chrome', 'Firefox', 'Edge', 'Safari 16.4+'];
      }
      fallbackMethods = ['In-app notifications', 'Email notifications', 'SMS alerts'];
    }

    return { supportLevel, reason, fallbackMethods, recommendedBrowsers };
  }

  /**
   * Initialize push notification service with enhanced error handling and progressive fallbacks
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
    console.log('🚀 Initializing push notifications with enhanced compatibility...');
    
    // Progressive enhancement - try even with limited support
    if (!this.browserSupport || this.browserSupport.supportLevel === 'none') {
      const reason = this.browserSupport?.reason || 'Push notifications are not supported in this browser';
      console.warn('⚠️ Limited push notification support:', reason);
      
      // Initialize fallback methods for unsupported browsers
      await this.initializeFallbackMethods();
      return false;
    }
    
    // Handle partial and fallback support browsers
    if (this.browserSupport.supportLevel === 'partial' || this.browserSupport.supportLevel === 'fallback') {
      console.log('📱 Initializing with partial support and fallbacks...');
      await this.initializeFallbackMethods();
    }

    const maxInitRetries = 3; // Increased retries for better reliability
    let initRetryCount = 0;
    
    while (initRetryCount < maxInitRetries) {
      try {
        console.log(`🚀 Initializing push notifications service... (attempt ${initRetryCount + 1}/${maxInitRetries})`);
        
        // Check if already initialized
        if (this.registration && this.registration.active) {
          console.log('♻️ Push notifications service already initialized');
          return true;
        }
        
        // Register service worker with retry logic
        await this.registerServiceWorker();
        
        // Wait for service worker to be fully ready
        await this.waitForServiceWorkerReady();
        
        // Verify the service worker is working properly
        await this.verifyServiceWorkerFunctionality();
        
        console.log('✅ Push notifications service initialized successfully');
        return true;
        
      } catch (error) {
        initRetryCount++;
        
        if (initRetryCount >= maxInitRetries) {
          console.error('❌ Failed to initialize push notifications service after all retries:', error);
          this._initPromise = null; // Reset so we can retry later
          return false;
        }
        
        console.warn(`⚠️ Push notification initialization attempt ${initRetryCount} failed, retrying...`, error);
        
        // Clear any partial state before retry
        this.registration = null;
        
        // Exponential backoff
        const retryDelay = Math.min(3000 * Math.pow(2, initRetryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return false;
  }
  
  /**
   * Verify service worker functionality for production reliability
   */
  private async verifyServiceWorkerFunctionality(): Promise<void> {
    try {
      if (!this.registration || !this.registration.active) {
        throw new Error('Service worker not active');
      }
      
      // Test message passing to ensure service worker is responsive
      const messageChannel = new MessageChannel();
      const responsePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service worker health check timeout'));
        }, 5000);
        
        messageChannel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          if (event.data && event.data.type === 'HEALTH_CHECK_RESPONSE') {
            resolve(event.data);
          } else {
            reject(new Error('Invalid health check response'));
          }
        };
      });
      
      // Send health check message
      this.registration.active.postMessage(
        { type: 'HEALTH_CHECK', timestamp: Date.now() },
        [messageChannel.port2]
      );
      
      await responsePromise;
      console.log('✅ Service worker health check passed');
      
    } catch (error) {
      console.warn('⚠️ Service worker health check failed:', error);
      // Don't throw here as it's a non-critical verification
    }
  }

  /**
   * Register service worker with enhanced error handling, retry logic and production optimizations
   */
  private async registerServiceWorker(): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Registering service worker... (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Check if service worker is already registered and active
        const existingRegistration = await navigator.serviceWorker.getRegistration('/');
        if (existingRegistration && existingRegistration.active) {
          console.log('♻️ Using existing active service worker registration');
          this.registration = existingRegistration;
          return;
        }
        
        console.log('📝 Creating new service worker registration');
        
        // Register with enhanced options for production
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        });
        
        // Enhanced event listeners with error handling
        this.registration.addEventListener('updatefound', () => {
          console.log('🔄 Service worker update found');
          const newWorker = this.registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('🔄 Service worker state changed:', newWorker.state);
            });
          }
        });
        
        // Wait for the registration to become active
        if (this.registration.installing) {
          await new Promise((resolve, reject) => {
            const worker = this.registration!.installing!;
            const timeout = setTimeout(() => {
              reject(new Error('Service worker installation timeout'));
            }, 15000);
            
            worker.addEventListener('statechange', () => {
              if (worker.state === 'activated' || worker.state === 'redundant') {
                clearTimeout(timeout);
                if (worker.state === 'activated') {
                  resolve(void 0);
                } else {
                  reject(new Error('Service worker became redundant'));
                }
              }
            });
          });
        }
        
        console.log('✅ Service worker registered and activated successfully');
        return;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error('❌ Service worker registration failed after all retries:', error);
          throw new Error(`Service worker registration failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        console.warn(`⚠️ Service worker registration attempt ${retryCount} failed, retrying...`, error);
        
        // Clear any partial registration before retry
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup registrations:', cleanupError);
        }
        
        // Exponential backoff before retry
        const retryDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  /**
   * Wait for service worker to be fully ready with enhanced timeout and retry logic
   */
  private async waitForServiceWorkerReady(): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`⏳ Waiting for service worker to be ready... (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Increased timeout to 30 seconds for production reliability
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Service worker ready timeout')), 30000);
        });
        
        // Check if service worker is already ready
        if (navigator.serviceWorker.controller) {
          console.log('♻️ Service worker already active and controlling');
          return;
        }
        
        await Promise.race([
          navigator.serviceWorker.ready,
          timeoutPromise
        ]);
        
        // Verify service worker is actually ready and controlling
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration || !registration.active) {
          throw new Error('Service worker registration not active');
        }
        
        // Additional validation delay with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log('✅ Service worker is ready and active');
        return;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error('❌ Service worker failed after all retries:', error);
          throw new Error(`Service worker initialization failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        console.warn(`⚠️ Service worker attempt ${retryCount} failed, retrying...`, error);
        
        // Exponential backoff before retry
        const retryDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
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

  /**
   * Initialize fallback notification methods for unsupported browsers
   */
  private async initializeFallbackMethods(): Promise<void> {
    console.log('🔄 Initializing fallback notification methods...');
    
    try {
      // Initialize in-app notification system
      await this.initializeInAppNotifications();
      
      // Initialize polling-based updates
      await this.initializePollingNotifications();
      
      // Initialize local storage for offline notifications
      await this.initializeOfflineNotifications();
      
      console.log('✅ Fallback notification methods initialized');
    } catch (error) {
      console.error('❌ Failed to initialize fallback methods:', error);
    }
  }

  /**
   * In-app notification system for browsers without push support
   */
  private async initializeInAppNotifications(): Promise<void> {
    // Create notification container if it doesn't exist
    if (typeof window !== 'undefined' && !document.getElementById('homebake-notifications')) {
      const container = document.createElement('div');
      container.id = 'homebake-notifications';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
  }

  /**
   * Polling-based notification system
   */
  private async initializePollingNotifications(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Set up periodic checks for new notifications
    const pollInterval = 30000; // 30 seconds
    
    setInterval(async () => {
      try {
        if (this._isEnabled) {
          await this.checkForNewNotifications();
        }
      } catch (error) {
        console.warn('Polling notification check failed:', error);
      }
    }, pollInterval);
  }

  /**
   * Offline notification storage system
   */
  private async initializeOfflineNotifications(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Initialize local storage for offline notifications
    if (!localStorage.getItem('homebake-offline-notifications')) {
      localStorage.setItem('homebake-offline-notifications', JSON.stringify([]));
    }
  }

  /**
   * Check for new notifications (polling fallback)
   */
  private async checkForNewNotifications(): Promise<void> {
    try {
      // Get user ID from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query for recent activities that should trigger notifications
      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Failed to fetch activities for notifications:', error);
        return;
      }

      // Show in-app notifications for new activities
      activities?.forEach(activity => {
        this.showInAppNotification({
          title: 'HomeBake Update',
          body: activity.message,
          activity_type: activity.activity_type,
          user_name: activity.user_name,
          metadata: activity.metadata || {}
        });
      });
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  }

  /**
   * Show in-app notification for browsers without push support
   */
  private showInAppNotification(payload: NotificationPayload): void {
    if (typeof window === 'undefined') return;

    const container = document.getElementById('homebake-notifications');
    if (!container) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      max-width: 100%;
      word-wrap: break-word;
    `;

    // Add animation keyframes
    if (!document.getElementById('homebake-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'homebake-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">
            ${payload.title}
          </h4>
          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.4;">
            ${payload.body}
          </p>
          ${payload.user_name ? `
            <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">
              by ${payload.user_name}
            </p>
          ` : ''}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0; margin-left: 12px; font-size: 18px;">
          ×
        </button>
      </div>
    `;

    // Add click handler for navigation
    if (payload.url) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', () => {
        window.location.href = payload.url!;
      });
    }

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, 5000);
  }

  /**
   * Enhanced browser support messaging
   */
  getBrowserSupportMessage(): string {
    if (!this.browserSupport) {
      return 'Unable to detect browser capabilities. Please try refreshing the page.';
    }
    
    const { supportLevel, reason, browserName, fallbackMethods } = this.browserSupport;
    
    switch (supportLevel) {
      case 'full':
        return `✅ Push notifications are fully supported in ${browserName}.`;
      case 'partial':
        return `⚠️ ${reason} Fallback methods available: ${fallbackMethods.join(', ')}.`;
      case 'fallback':
        return `🔄 ${reason} Using alternative notification methods: ${fallbackMethods.join(', ')}.`;
      case 'none':
      default:
        return `❌ ${reason} Available alternatives: ${fallbackMethods.join(', ')}.`;
    }
  }

  /**
   * Get recommended browsers based on current browser
   */
  getRecommendedBrowsers(): string[] {
    if (!this.browserSupport) return ['Chrome', 'Firefox', 'Edge', 'Safari'];
    
    const { recommendedBrowsers, isIOSSafari, isMobileSafari, isInAppBrowser } = this.browserSupport;
    
    if (recommendedBrowsers.length > 0) {
      return recommendedBrowsers;
    }
    
    if (isInAppBrowser) {
      return ['Open in Chrome', 'Open in Firefox', 'Open in Safari'];
    } else if (isIOSSafari) {
      return ['Update to iOS 16.4+', 'Chrome for iOS', 'Firefox for iOS'];
    } else if (isMobileSafari) {
      return ['Chrome for Android', 'Firefox for Android', 'Samsung Internet'];
    } else {
      return ['Chrome', 'Firefox', 'Edge', 'Safari 16.4+'];
    }
  }

  /**
   * Enhanced error handling with specific guidance
   */
  getDetailedErrorInfo(error: Error): {
    message: string;
    solution: string;
    fallbacks: string[];
  } {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('permission')) {
      return {
        message: 'Notification permission is required',
        solution: 'Please click the notification icon in your browser address bar and allow notifications.',
        fallbacks: ['In-app notifications will still work', 'Check browser settings → Notifications']
      };
    }
    
    if (errorMessage.includes('vapid') || errorMessage.includes('subscription')) {
      return {
        message: 'Push notification setup failed',
        solution: 'Please try refreshing the page or clearing your browser cache.',
        fallbacks: ['Alternative notification methods are available', 'Contact support if issue persists']
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('offline')) {
      return {
        message: 'Network connection required',
        solution: 'Please check your internet connection and try again.',
        fallbacks: ['Notifications will be cached for when you\'re online', 'In-app updates will continue working']
      };
    }
    
    return {
      message: 'An unexpected error occurred',
      solution: 'Please try refreshing the page or contact support.',
      fallbacks: ['In-app notifications are still available', 'All core features remain functional']
    };
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