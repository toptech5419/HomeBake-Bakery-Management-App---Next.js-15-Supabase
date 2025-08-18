// HomeBake Service Worker - Simple & Production Ready
// Handles push notifications with cross-browser compatibility

const CACHE_NAME = 'homebake-v2.0';
const ACTIVITY_ICONS = {
  sale: '🛒',
  batch: '📦', 
  report: '📊',
  login: '👤',
  end_shift: '🕐',
  created: '➕',
  default: '🔔'
};

// Install service worker with enhanced caching
self.addEventListener('install', (event) => {
  console.log('[SW] Installing HomeBake Service Worker v2.0 - Simple & Production Ready');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          '/',
          '/owner-dashboard',
          '/dashboard',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-72x72.png'
        ]).catch(error => {
          console.warn('[SW] Failed to cache some resources during install:', error);
          // Don't fail installation if some resources can't be cached
        });
      })
  );
  self.skipWaiting();
});

// Activate service worker with enhanced cleanup
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating HomeBake Service Worker v2.0 - Production Ready');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
  
  // Notify all clients that service worker is ready
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_ACTIVATED', version: '2.0' });
    });
  });
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
    event.waitUntil(syncOfflineNotifications());
  } else if (event.tag === 'homebake-retry-requests') {
    event.waitUntil(processQueuedRequests());
  }
});

// Listen for online events to process queued requests
self.addEventListener('online', () => {
  console.log('[SW] Device came online, processing queued requests');
  processQueuedRequests();
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

// Add message handling for health checks and communication
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'HEALTH_CHECK') {
    // Respond to health check
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'HEALTH_CHECK_RESPONSE',
        timestamp: Date.now(),
        status: 'healthy'
      });
    }
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Force update to new service worker
    self.skipWaiting();
  }
});

// Production-ready fetch handling with offline strategy
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  const request = event.request;
  const url = new URL(request.url);
  
  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests: Network-first with offline queue
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets: Cache-first (immutable)
    event.respondWith(handleStaticAssets(request));
  } else if (request.mode === 'navigate') {
    // Navigation requests: Network-first with offline fallback
    event.respondWith(handleNavigation(request));
  } else {
    // Other resources: Stale-while-revalidate
    event.respondWith(handleOtherResources(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    // Only cache successful GET requests
    if (request.method === 'GET' && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(error => {
        console.warn('[SW] Failed to cache API response:', error);
      });
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed:', request.method, request.url);
    
    // Try to serve from cache for GET requests only
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving cached API response:', request.url);
        return cachedResponse;
      }
    }
    
    // Queue non-GET requests for later retry
    if (request.method !== 'GET') {
      try {
        await queueFailedRequest(request);
        console.log('[SW] Queued failed request:', request.method, request.url);
      } catch (queueError) {
        console.warn('[SW] Failed to queue request:', queueError);
      }
    }
    
    // Return appropriate offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: request.method === 'GET' 
          ? 'Data not available offline' 
          : 'Request queued for when connection is restored',
        method: request.method,
        queued: request.method !== 'GET'
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  // Only handle GET requests for static assets
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone()).catch(error => {
        console.warn('[SW] Failed to cache static asset:', error);
      });
    }
    return response;
  } catch (error) {
    console.log('[SW] Static asset failed to load:', request.url);
    throw error;
  }
}

// Handle navigation with network-first and offline fallback
async function handleNavigation(request) {
  // Only handle GET navigation requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful navigation responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(error => {
        console.warn('[SW] Failed to cache navigation response:', error);
      });
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, trying cache:', request.url);
    
    // Try cached version of the exact request
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to cached index page
    const indexResponse = await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Last resort: offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>HomeBake - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 2rem;
              background: linear-gradient(135deg, #f97316, #fb923c);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 2rem;
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 1rem 0; font-size: 2rem; }
            p { margin: 0.5rem 0; opacity: 0.9; }
            button {
              background: white;
              color: #f97316;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-weight: 600;
              cursor: pointer;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🍞 HomeBake</h1>
            <p>You're currently offline</p>
            <p>Please check your internet connection</p>
            <button onclick="location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle other resources with stale-while-revalidate
async function handleOtherResources(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Only cache GET requests
  if (request.method !== 'GET') {
    // For non-GET requests, just fetch without caching
    try {
      return await fetch(request);
    } catch (error) {
      console.log('[SW] Non-GET request failed:', request.url);
      throw error;
    }
  }
  
  const cachedResponse = await cache.match(request);
  
  // Fetch in the background regardless
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.status === 200) {
        // Only cache successful GET responses
        cache.put(request, response.clone()).catch(error => {
          console.warn('[SW] Failed to cache response:', error);
        });
      }
      return response;
    })
    .catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

// Queue failed requests for retry when online
async function queueFailedRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB or simpler storage
    const cache = await caches.open('offline-requests');
    const queueKey = `queue-${Date.now()}-${Math.random()}`;
    
    await cache.put(
      queueKey,
      new Response(JSON.stringify(requestData), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    
    console.log('[SW] Queued failed request:', request.url);
  } catch (error) {
    console.error('[SW] Failed to queue request:', error);
  }
}

// Process queued requests when online
async function processQueuedRequests() {
  try {
    const cache = await caches.open('offline-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const requestData = await response.json();
        
        try {
          // Recreate and send the request
          const fetchOptions = {
            method: requestData.method,
            headers: requestData.headers,
            body: requestData.body
          };
          
          const result = await fetch(requestData.url, fetchOptions);
          
          if (result.ok) {
            // Remove from queue on success
            await cache.delete(request);
            console.log('[SW] Successfully processed queued request:', requestData.url);
          }
        } catch (error) {
          console.log('[SW] Queued request still failing:', requestData.url);
          // Keep in queue for next attempt
        }
      }
    }
  } catch (error) {
    console.error('[SW] Error processing queued requests:', error);
  }
}