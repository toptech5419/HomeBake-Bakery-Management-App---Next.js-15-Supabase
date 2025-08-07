// HomeBake Service Worker - Push Notifications Support
// Handles push notification events and background sync

const CACHE_NAME = 'homebake-v1';
const ACTIVITY_ICONS = {
  sale: '🛒',
  batch: '📦', 
  report: '📊',
  login: '👤',
  end_shift: '🕐',
  created: '➕',
  default: '🔔'
};

// Install service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing HomeBake Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          '/',
          '/owner-dashboard',
          '/manifest.json'
        ]);
      })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating HomeBake Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const {
      title = 'HomeBake Notification',
      body = 'New activity in your bakery',
      activity_type = 'default',
      user_name,
      metadata,
      url = '/owner-dashboard'
    } = data;

    const icon = ACTIVITY_ICONS[activity_type] || ACTIVITY_ICONS.default;
    
    // Enhanced notification body with activity details
    let enhancedBody = body;
    if (user_name) {
      enhancedBody = `${user_name}: ${body}`;
    }
    if (metadata?.bread_type && metadata?.quantity) {
      enhancedBody += `\n${metadata.quantity}x ${metadata.bread_type}`;
    }
    if (metadata?.revenue) {
      enhancedBody += ` (₦${metadata.revenue.toLocaleString()})`;
    }

    const options = {
      body: enhancedBody,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png', 
      tag: `homebake-${activity_type}`,
      data: { url, activity_type, timestamp: Date.now() },
      actions: [
        {
          action: 'view',
          title: 'View Dashboard',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss', 
          title: 'Dismiss',
          icon: '/icons/icon-72x72.png'
        }
      ],
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(`${icon} ${title}`, options)
    );
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('🍞 HomeBake', {
        body: 'New activity in your bakery',
        icon: '/icons/icon-192x192.png',
        tag: 'homebake-fallback',
        data: { url: '/owner-dashboard' }
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event.notification.tag);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }

  const urlToOpen = event.notification.data?.url || '/owner-dashboard';
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      // Check if a window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('owner-dashboard') && 'focus' in client) {
          // Focus existing window and navigate if needed
          return client.focus().then(() => {
            if (client.url !== urlToOpen) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Track notification dismissal analytics if needed
  event.waitUntil(
    fetch('/api/analytics/notification-dismissed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: event.notification.tag,
        timestamp: Date.now()
      })
    }).catch(() => {
      // Fail silently for analytics
      console.log('[SW] Analytics tracking failed');
    })
  );
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'homebake-offline-notifications') {
    event.waitUntil(
      // Sync any pending notification data when online
      syncOfflineNotifications()
    );
  }
});

// Sync function for offline notifications
async function syncOfflineNotifications() {
  try {
    console.log('[SW] Syncing offline notifications');
    
    // Get any cached notification data and send when back online
    const cache = await caches.open(CACHE_NAME);
    const offlineNotifications = await cache.match('/offline-notifications');
    
    if (offlineNotifications) {
      const data = await offlineNotifications.json();
      // Process offline notifications
      for (const notification of data.notifications) {
        await self.registration.showNotification(notification.title, notification.options);
      }
      // Clear offline cache
      await cache.delete('/offline-notifications');
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Log service worker errors
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});