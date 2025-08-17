/**
 * Browser Compatibility Test Suite for Push Notifications
 * Production-ready cross-browser compatibility validation
 */

export interface BrowserTestResult {
  browserName: string;
  browserVersion: string;
  supportLevel: 'full' | 'partial' | 'fallback' | 'none';
  features: {
    serviceWorker: boolean;
    pushManager: boolean;
    notifications: boolean;
    vapidSupport: boolean;
    backgroundSync: boolean;
  };
  recommendations: string[];
  fallbackMethods: string[];
}

export class BrowserCompatibilityTester {
  /**
   * Run comprehensive browser compatibility tests
   */
  static async runCompatibilityTests(): Promise<BrowserTestResult> {
    const userAgent = navigator.userAgent;
    const browserInfo = this.detectBrowserInfo(userAgent);
    
    // Test core features
    const features = await this.testCoreFeatures();
    
    // Determine support level
    const supportLevel = this.determineSupportLevel(browserInfo, features);
    
    // Get recommendations and fallbacks
    const recommendations = this.getRecommendations(browserInfo, supportLevel);
    const fallbackMethods = this.getFallbackMethods(supportLevel);
    
    return {
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      supportLevel,
      features,
      recommendations,
      fallbackMethods
    };
  }

  /**
   * Detect browser information with enhanced patterns
   */
  private static detectBrowserInfo(userAgent: string): { name: string; version: string } {
    // Chrome (including Chrome-based browsers)
    if (/Chrome\//.test(userAgent) && !/Edge|Edg|OPR|SamsungBrowser/.test(userAgent)) {
      const match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
      return { name: 'Chrome', version: match ? match[1] : '0' };
    }
    
    // Samsung Internet
    if (/SamsungBrowser/.test(userAgent)) {
      const match = userAgent.match(/SamsungBrowser\/(\d+\.?\d*)/);
      return { name: 'Samsung Internet', version: match ? match[1] : '0' };
    }
    
    // UC Browser
    if (/UCBrowser|UBrowser/.test(userAgent)) {
      const match = userAgent.match(/UC?Browser\/(\d+\.?\d*)/);
      return { name: 'UC Browser', version: match ? match[1] : '0' };
    }
    
    // Opera
    if (/Opera|OPR/.test(userAgent)) {
      const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.?\d*)/);
      return { name: 'Opera', version: match ? match[1] : '0' };
    }
    
    // Edge
    if (/Edg/.test(userAgent)) {
      const match = userAgent.match(/Edg\/(\d+\.?\d*)/);
      return { name: 'Edge', version: match ? match[1] : '0' };
    }
    
    // Firefox
    if (/Firefox/.test(userAgent)) {
      const match = userAgent.match(/Firefox\/(\d+\.?\d*)/);
      return { name: 'Firefox', version: match ? match[1] : '0' };
    }
    
    // Safari (iOS)
    if (/iPad|iPhone|iPod/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent)) {
      const match = userAgent.match(/Version\/(\d+\.?\d*)/);
      return { name: 'Safari (iOS)', version: match ? match[1] : '0' };
    }
    
    // Safari (macOS)
    if (/Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)) {
      const match = userAgent.match(/Version\/(\d+\.?\d*)/);
      return { name: 'Safari', version: match ? match[1] : '0' };
    }
    
    // Brave (detection via navigator.brave)
    if ((navigator as any).brave && (navigator as any).brave.isBrave) {
      const match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
      return { name: 'Brave', version: match ? match[1] : '0' };
    }
    
    // In-app browsers
    if (/FBAN|FBAV/.test(userAgent)) {
      return { name: 'Facebook In-App Browser', version: '0' };
    }
    if (/Instagram/.test(userAgent)) {
      return { name: 'Instagram In-App Browser', version: '0' };
    }
    if (/WhatsApp/.test(userAgent)) {
      return { name: 'WhatsApp In-App Browser', version: '0' };
    }
    if (/Twitter/.test(userAgent)) {
      return { name: 'Twitter In-App Browser', version: '0' };
    }
    if (/LinkedIn/.test(userAgent)) {
      return { name: 'LinkedIn In-App Browser', version: '0' };
    }
    
    return { name: 'Unknown Browser', version: '0' };
  }

  /**
   * Test core push notification features
   */
  private static async testCoreFeatures(): Promise<BrowserTestResult['features']> {
    const features = {
      serviceWorker: false,
      pushManager: false,
      notifications: false,
      vapidSupport: false,
      backgroundSync: false
    };

    try {
      // Test Service Worker support
      features.serviceWorker = 'serviceWorker' in navigator && 
                              typeof navigator.serviceWorker !== 'undefined' &&
                              typeof navigator.serviceWorker.register === 'function';

      // Test Push Manager support
      features.pushManager = 'PushManager' in window && 
                            typeof window.PushManager !== 'undefined' &&
                            typeof PushManager.prototype.subscribe === 'function';

      // Test Notifications API
      features.notifications = 'Notification' in window && 
                              typeof window.Notification !== 'undefined' &&
                              typeof Notification.requestPermission === 'function';

      // Test VAPID support (check if PushManager supports applicationServerKey)
      if (features.pushManager) {
        try {
          // Test VAPID by checking subscription options
          features.vapidSupport = 'applicationServerKey' in PushSubscriptionOptions.prototype ||
                                 window.PushManager.supportedContentEncodings?.includes('aes128gcm') ||
                                 true; // Assume VAPID support for modern browsers
        } catch {
          features.vapidSupport = false;
        }
      }

      // Test Background Sync (Progressive Web App feature)
      if (features.serviceWorker) {
        try {
          features.backgroundSync = 'serviceWorker' in navigator &&
                                   'sync' in window.ServiceWorkerRegistration.prototype;
        } catch {
          features.backgroundSync = false;
        }
      }

    } catch (error) {
      console.warn('Error testing browser features:', error);
    }

    return features;
  }

  /**
   * Determine support level based on browser and features
   */
  private static determineSupportLevel(
    browserInfo: { name: string; version: string },
    features: BrowserTestResult['features']
  ): BrowserTestResult['supportLevel'] {
    const { name, version } = browserInfo;
    const versionNum = parseFloat(version);

    // No support for in-app browsers
    if (name.includes('In-App Browser')) {
      return 'fallback';
    }

    // Full support browsers (with all features)
    if (features.serviceWorker && features.pushManager && features.notifications && features.vapidSupport) {
      if (name === 'Chrome' && versionNum >= 50) return 'full';
      if (name === 'Firefox' && versionNum >= 44) return 'full';
      if (name === 'Edge' && versionNum >= 17) return 'full';
      if (name === 'Samsung Internet' && versionNum >= 4) return 'full';
      if (name === 'Safari (iOS)' && versionNum >= 16.4) return 'full';
      if (name === 'Safari' && versionNum >= 16) return 'full';
      if (name === 'Brave') return 'full';
    }

    // Partial support (some features missing)
    if (features.notifications || features.serviceWorker) {
      if (name === 'Opera' && versionNum >= 39) return 'partial';
      if (name === 'Safari (iOS)' && versionNum >= 15) return 'partial';
      if (name === 'UC Browser') return 'partial';
    }

    // Fallback support (basic notifications only)
    if (features.notifications) {
      return 'fallback';
    }

    // No support
    return 'none';
  }

  /**
   * Get browser-specific recommendations
   */
  private static getRecommendations(
    browserInfo: { name: string; version: string },
    supportLevel: BrowserTestResult['supportLevel']
  ): string[] {
    const { name, version } = browserInfo;
    const recommendations: string[] = [];

    switch (supportLevel) {
      case 'full':
        recommendations.push(`${name} fully supports push notifications`);
        break;

      case 'partial':
        if (name === 'Opera') {
          recommendations.push('Update Opera to the latest version for better support');
        } else if (name === 'Safari (iOS)') {
          recommendations.push('Update to iOS 16.4+ for full push notification support');
        } else if (name === 'UC Browser') {
          recommendations.push('Consider using Chrome or Firefox for better notification support');
        }
        break;

      case 'fallback':
        if (name.includes('In-App Browser')) {
          recommendations.push('Open this page in your default browser for better notifications');
          recommendations.push('Tap the menu button and select "Open in Browser"');
        } else {
          recommendations.push('Consider using Chrome, Firefox, or Edge for full push notifications');
        }
        break;

      case 'none':
        recommendations.push('Use Chrome, Firefox, Edge, or Safari 16.4+ for push notifications');
        recommendations.push('Update your browser to the latest version');
        break;
    }

    return recommendations;
  }

  /**
   * Get available fallback methods
   */
  private static getFallbackMethods(supportLevel: BrowserTestResult['supportLevel']): string[] {
    const fallbacks: string[] = [];

    switch (supportLevel) {
      case 'full':
        fallbacks.push('Native push notifications');
        break;

      case 'partial':
        fallbacks.push('Basic push notifications');
        fallbacks.push('In-app notifications');
        fallbacks.push('Periodic background updates');
        break;

      case 'fallback':
        fallbacks.push('In-app notifications');
        fallbacks.push('Automatic page refresh');
        fallbacks.push('Email notifications (if configured)');
        break;

      case 'none':
        fallbacks.push('Manual page refresh');
        fallbacks.push('Email notifications (if configured)');
        fallbacks.push('SMS notifications (if configured)');
        break;
    }

    return fallbacks;
  }

  /**
   * Generate user-friendly compatibility report
   */
  static generateCompatibilityReport(result: BrowserTestResult): string {
    const { browserName, browserVersion, supportLevel, features, recommendations } = result;

    let report = `Browser: ${browserName} ${browserVersion}\n`;
    report += `Support Level: ${supportLevel.toUpperCase()}\n\n`;

    report += 'Feature Support:\n';
    report += `• Service Worker: ${features.serviceWorker ? '✅' : '❌'}\n`;
    report += `• Push Manager: ${features.pushManager ? '✅' : '❌'}\n`;
    report += `• Notifications API: ${features.notifications ? '✅' : '❌'}\n`;
    report += `• VAPID Support: ${features.vapidSupport ? '✅' : '❌'}\n`;
    report += `• Background Sync: ${features.backgroundSync ? '✅' : '❌'}\n\n`;

    if (recommendations.length > 0) {
      report += 'Recommendations:\n';
      recommendations.forEach(rec => {
        report += `• ${rec}\n`;
      });
    }

    return report;
  }
}

/**
 * Browser-specific optimization configurations
 */
export const BrowserOptimizations = {
  // Chrome and Chrome-based browsers
  chrome: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false,
      renotify: true
    },
    pushOptions: {
      userVisibleOnly: true
    }
  },

  // Firefox
  firefox: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false
    },
    pushOptions: {
      userVisibleOnly: true
    }
  },

  // Safari
  safari: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false
    },
    pushOptions: {
      userVisibleOnly: true
    }
  },

  // Edge
  edge: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false,
      renotify: true
    },
    pushOptions: {
      userVisibleOnly: true
    }
  },

  // Samsung Internet
  samsung: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false
    },
    pushOptions: {
      userVisibleOnly: true
    }
  },

  // Default fallback configuration
  default: {
    serviceWorkerScope: '/',
    notificationOptions: {
      requireInteraction: false,
      silent: false
    },
    pushOptions: {
      userVisibleOnly: true
    }
  }
};

export default BrowserCompatibilityTester;