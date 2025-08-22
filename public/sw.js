// HomeBake Unified Service Worker - Production Grade v3.0
// Enhanced push notifications with Workbox integration and cross-browser compatibility

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

// Version and cache management
const SW_VERSION = '3.0.0';
const CACHE_PREFIX = 'homebake-v3';
const NOTIFICATION_CACHE = `${CACHE_PREFIX}-notifications`;

// Workbox precaching setup
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Enhanced activity icons for better notification experience
const ACTIVITY_ICONS = {
  sale: '🛒',
  batch: '📦',
  report: '📊',
  login: '👤',
  end_shift: '🕐',
  created: '➕',
  default: '🔔'
};

// Browser-specific notification options for maximum compatibility
const BROWSER_CONFIGS = {
  chrome: {
    supportsActions: true,
    supportsImage: true,
    supportsVibrate: true,
    maxActions: 2
  },
  firefox: {
    supportsActions: true,
    supportsImage: false,
    supportsVibrate: true,
    maxActions: 2
  },
  safari: {
    supportsActions: false,
    supportsImage: false,
    supportsVibrate: false,
    maxActions: 0
  },
  edge: {
    supportsActions: true,
    supportsImage: true,
    supportsVibrate: true,
    maxActions: 2
  }
};

// Detect browser type for optimized notification handling
function getBrowserType() {
  const userAgent = self.navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'chrome';
  } else if (userAgent.includes('firefox')) {
    return 'firefox';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  } else if (userAgent.includes('edg')) {
    return 'edge';
  }
  
  return 'chrome'; // Default to chrome capabilities
}

// Enhanced install event with comprehensive caching
self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Installing HomeBake Service Worker...`);
  
  event.waitUntil(
    Promise.all([
      // Cache essential resources
      caches.open(`${CACHE_PREFIX}-core`).then(cache => {
        return cache.addAll([
          '/',
          '/owner-dashboard',
          '/dashboard',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png',
          '/icons/icon-72x72.png',
          '/icons/icon-96x96.png'
        ]).catch(error => {
          console.warn('[SW] Some core resources failed to cache:', error);
          // Don't fail installation if some resources can't be cached
        });
      }),
      
      // Initialize notification cache
      caches.open(NOTIFICATION_CACHE)
    ])
    .then(() => {
      console.log(`[SW v${SW_VERSION}] Installation complete`);
      return self.skipWaiting();
    })
  );
});

// Enhanced activate event with thorough cleanup
self.addEventListener('activate', (event) => {
  console.log(`[SW v${SW_VERSION}] Activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.startsWith(CACHE_PREFIX)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log(`[SW v${SW_VERSION}] Activated successfully`);
      
      // Notify clients of successful activation
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: SW_VERSION,
            timestamp: Date.now()
          });
        });
      });
    })
  );
});

// Production-grade push notification handler with cross-browser compatibility
self.addEventListener('push', (event) => {
  console.log(`[SW v${SW_VERSION}] Push event received`);
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data received:', data);

    const browserType = getBrowserType();
    const browserConfig = BROWSER_CONFIGS[browserType];
    
    const {
      title = 'HomeBake',
      body = 'New activity in your bakery',
      activity_type = 'default',
      user_name,
      metadata = {},
      url = '/owner-dashboard',
      requireInteraction = false
    } = data;

    // Enhanced notification body with context
    let enhancedBody = body;
    if (user_name) {
      enhancedBody = `${user_name}: ${body}`;
    }
    
    // Add contextual information
    if (metadata.bread_type && metadata.quantity) {
      enhancedBody += `\n${metadata.quantity}x ${metadata.bread_type}`;
    }
    
    if (metadata.revenue) {
      enhancedBody += ` (₦${metadata.revenue.toLocaleString()})`;
    }

    // Base notification options (supported by all browsers)
    const baseOptions = {
      body: enhancedBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `homebake-${activity_type}-${Date.now()}`,
      requireInteraction,
      silent: false,
      timestamp: Date.now(),
      data: {
        url,
        activity_type,
        user_name,
        metadata,
        browserType
      }
    };

    // Enhanced options based on browser capabilities
    const enhancedOptions = { ...baseOptions };
    
    // Add actions if supported
    if (browserConfig.supportsActions && browserConfig.maxActions > 0) {
      enhancedOptions.actions = [
        {
          action: 'view',
          title: 'View Dashboard',
          icon: '/icons/icon-72x72.png'
        }
      ];
      
      if (browserConfig.maxActions > 1) {
        enhancedOptions.actions.push({
          action: 'dismiss',
          title: 'Dismiss'
        });
      }
    }
    
    // Add vibration if supported
    if (browserConfig.supportsVibrate) {
      enhancedOptions.vibrate = metadata.urgent ? [300, 200, 300] : [200, 100, 200];
    }
    
    // Add image if supported and provided
    if (browserConfig.supportsImage && metadata.image) {
      enhancedOptions.image = metadata.image;
    }

    const icon = ACTIVITY_ICONS[activity_type] || ACTIVITY_ICONS.default;
    const notificationTitle = `${icon} ${title}`;

    event.waitUntil(
      // Try enhanced options first, fallback to base options
      self.registration.showNotification(notificationTitle, enhancedOptions)
        .catch(error => {
          console.warn('[SW] Enhanced notification failed, using fallback:', error);
          return self.registration.showNotification(notificationTitle, baseOptions);
        })
        .then(() => {
          console.log(`[SW] Notification shown successfully (${browserType})`);
          
          // Cache notification for analytics
          return caches.open(NOTIFICATION_CACHE).then(cache => {
            const notificationLog = {
              timestamp: Date.now(),
              title: notificationTitle,
              body: enhancedBody,
              activity_type,
              browserType,
              success: true
            };
            
            return cache.put(
              `/notifications/${Date.now()}`,
              new Response(JSON.stringify(notificationLog))
            );
          }).catch(error => {
            console.warn('[SW] Failed to cache notification log:', error);
          });
        })
    );
    
  } catch (error) {
    console.error('[SW] Error processing push event:', error);
    
    // Ultra-fallback: show basic notification
    event.waitUntil(
      self.registration.showNotification('🍞 HomeBake', {
        body: 'New activity in your bakery',
        icon: '/icons/icon-192x192.png',
        tag: `homebake-error-${Date.now()}`,
        data: { url: '/owner-dashboard', error: true }
      })
    );
  }
});

// Enhanced notification click handler with smart window management
self.addEventListener('notificationclick', (event) => {
  console.log(`[SW v${SW_VERSION}] Notification clicked:`, event.notification.tag);
  
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed via action');
    return;
  }

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/owner-dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      // Smart window management
      const origin = self.location.origin;
      
      // Look for existing HomeBake windows
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        
        if (client.url.startsWith(origin)) {
          console.log('[SW] Focusing existing window:', client.url);
          
          // Focus and navigate existing window
          return client.focus().then(() => {
            // Send navigation message to client
            return client.postMessage({
              type: 'NOTIFICATION_CLICK_NAVIGATE',
              url: urlToOpen,
              data: notificationData
            });
          });
        }
      }
      
      // No existing window found, open new one
      console.log('[SW] Opening new window:', urlToOpen);
      return self.clients.openWindow(urlToOpen);
    })
    .catch(error => {
      console.error('[SW] Error handling notification click:', error);
      // Fallback: try to open the URL anyway
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Enhanced notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log(`[SW v${SW_VERSION}] Notification closed:`, event.notification.tag);
  
  const notificationData = event.notification.data || {};
  
  // Track notification dismissal
  event.waitUntil(
    caches.open(NOTIFICATION_CACHE).then(cache => {
      const dismissalLog = {
        timestamp: Date.now(),
        tag: event.notification.tag,
        activity_type: notificationData.activity_type,
        browserType: notificationData.browserType,
        action: 'dismissed'
      };
      
      return cache.put(
        `/dismissals/${Date.now()}`,
        new Response(JSON.stringify(dismissalLog))
      );
    }).catch(error => {
      console.warn('[SW] Failed to log notification dismissal:', error);
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log(`[SW v${SW_VERSION}] Background sync event:`, event.tag);
  
  if (event.tag === 'homebake-sync') {
    event.waitUntil(backgroundSync());
  }
  
  if (event.tag === 'homebake-notification-sync') {
    event.waitUntil(syncNotificationLogs());
  }
});

// Enhanced message handler for client communication
self.addEventListener('message', (event) => {
  const { data } = event;
  console.log(`[SW v${SW_VERSION}] Message received:`, data);
  
  if (!data || !data.type) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      if (event.ports[0]) {
        event.ports[0].postMessage({
          type: 'VERSION_RESPONSE',
          version: SW_VERSION,
          timestamp: Date.now()
        });
      }
      break;
      
    case 'CLEAR_NOTIFICATION_CACHE':
      event.waitUntil(clearNotificationCache());
      break;
      
    case 'GET_NOTIFICATION_STATS':
      event.waitUntil(getNotificationStats().then(stats => {
        if (event.ports[0]) {
          event.ports[0].postMessage({
            type: 'NOTIFICATION_STATS_RESPONSE',
            stats
          });
        }
      }));
      break;
      
    default:
      console.log('[SW] Unknown message type:', data.type);
  }
});

// Workbox routing for different content types
registerRoute(
  // API routes - network first with cache fallback
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-api`,
    networkTimeoutSeconds: 3
  })
);

registerRoute(
  // Static assets - cache first
  ({ request }) => request.destination === 'image' || 
                   request.destination === 'script' || 
                   request.destination === 'style',
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}-assets`
  })
);

registerRoute(
  // App pages - stale while revalidate
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: `${CACHE_PREFIX}-pages`
  })
);

// Helper functions
async function backgroundSync() {
  try {
    console.log('[SW] Starting background sync...');
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

async function syncNotificationLogs() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const requests = await cache.keys();
    
    // Send logs to analytics endpoint (implement as needed)
    console.log(`[SW] Syncing ${requests.length} notification logs`);
    
    // Clean up old logs (keep last 100)
    if (requests.length > 100) {
      const toDelete = requests.slice(100);
      await Promise.all(toDelete.map(req => cache.delete(req)));
    }
    
  } catch (error) {
    console.error('[SW] Failed to sync notification logs:', error);
  }
}

async function clearNotificationCache() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const requests = await cache.keys();
    
    await Promise.all(requests.map(req => cache.delete(req)));
    console.log('[SW] Notification cache cleared');
    
  } catch (error) {
    console.error('[SW] Failed to clear notification cache:', error);
  }
}

async function getNotificationStats() {
  try {
    const cache = await caches.open(NOTIFICATION_CACHE);
    const requests = await cache.keys();
    
    const stats = {
      total: 0,
      byType: {},
      byBrowser: {},
      dismissalRate: 0
    };
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        
        stats.total++;
        stats.byType[data.activity_type] = (stats.byType[data.activity_type] || 0) + 1;
        stats.byBrowser[data.browserType] = (stats.byBrowser[data.browserType] || 0) + 1;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('[SW] Failed to get notification stats:', error);
    return { total: 0, byType: {}, byBrowser: {}, dismissalRate: 0 };
  }
}

// Global error handling
self.addEventListener('error', (event) => {
  console.error(`[SW v${SW_VERSION}] Global error:`, event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error(`[SW v${SW_VERSION}] Unhandled promise rejection:`, event.reason);
});

console.log(`[SW v${SW_VERSION}] HomeBake Service Worker loaded successfully`);