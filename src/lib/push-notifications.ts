'use client';

interface PushNotificationSettings {
  enabled: boolean;
  sales: boolean;
  batches: boolean;
  reports: boolean;
  staff: boolean;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  enabled: true,
  sales: true,
  batches: true,
  reports: true,
  staff: true
};

const STORAGE_KEY = 'homebake_push_notifications';
const USER_PREFERENCE_KEY = 'homebake_push_preference';

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  
  private constructor() {}
  
  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  /**
   * Get current notification settings
   */
  getSettings(): PushNotificationSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update notification settings
   */
  updateSettings(settings: Partial<PushNotificationSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      
      // Store user preference in Supabase if needed
      this.saveUserPreference(newSettings.enabled);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  /**
   * Toggle main notification setting
   */
  toggleNotifications(): boolean {
    const settings = this.getSettings();
    const newState = !settings.enabled;
    this.updateSettings({ enabled: newState });
    return newState;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.getSettings().enabled;
  }

  /**
   * Check if specific notification type is enabled
   */
  isTypeEnabled(type: keyof Omit<PushNotificationSettings, 'enabled'>): boolean {
    const settings = this.getSettings();
    return settings.enabled && settings[type];
  }

  /**
   * Request browser notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Show browser notification
   */
  async showNotification(
    title: string, 
    options: {
      body?: string;
      icon?: string;
      tag?: string;
      badge?: string;
      type?: keyof Omit<PushNotificationSettings, 'enabled'>;
    } = {}
  ): Promise<void> {
    // Check if notifications are enabled
    if (!this.isEnabled()) {
      return;
    }

    // Check if specific type is enabled
    if (options.type && !this.isTypeEnabled(options.type)) {
      return;
    }

    // Request permission if needed
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        tag: options.tag,
        requireInteraction: false,
        silent: false
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click events
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show sale notification
   */
  async showSaleNotification(
    user: string, 
    breadType: string, 
    quantity: number, 
    amount: number
  ): Promise<void> {
    await this.showNotification(
      '💰 New Sale Recorded',
      {
        body: `${user} sold ${quantity} ${breadType} for ₦${amount.toLocaleString()}`,
        tag: 'sale',
        type: 'sales'
      }
    );
  }

  /**
   * Show batch notification
   */
  async showBatchNotification(
    user: string, 
    breadType: string, 
    quantity: number
  ): Promise<void> {
    await this.showNotification(
      '🏭 New Batch Started',
      {
        body: `${user} started production: ${quantity} ${breadType}`,
        tag: 'batch',
        type: 'batches'
      }
    );
  }

  /**
   * Show report notification
   */
  async showReportNotification(
    user: string, 
    shift: string
  ): Promise<void> {
    await this.showNotification(
      '📊 Shift Report Generated',
      {
        body: `${user} completed ${shift} shift report`,
        tag: 'report',
        type: 'reports'
      }
    );
  }

  /**
   * Show staff notification
   */
  async showStaffNotification(
    user: string, 
    action: 'login' | 'logout' | 'created'
  ): Promise<void> {
    const actionText = {
      login: 'logged in',
      logout: 'logged out', 
      created: 'joined the team'
    };

    await this.showNotification(
      '👤 Staff Update',
      {
        body: `${user} ${actionText[action]}`,
        tag: 'staff',
        type: 'staff'
      }
    );
  }

  /**
   * Save user preference to localStorage and optionally Supabase
   */
  private saveUserPreference(enabled: boolean): void {
    try {
      localStorage.setItem(USER_PREFERENCE_KEY, JSON.stringify({ enabled }));
      
      // TODO: Save to Supabase user metadata if needed
      // This would require a Supabase client instance
    } catch (error) {
      console.error('Error saving user preference:', error);
    }
  }

  /**
   * Initialize notification system
   */
  async initialize(): Promise<void> {
    try {
      // Request permission on first load if notifications are enabled
      if (this.isEnabled()) {
        await this.requestPermission();
      }

      // Set up service worker for background notifications if available
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          console.log('Service Worker ready for notifications:', registration);
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }
}

// Export singleton instance
export const pushNotifications = PushNotificationManager.getInstance();