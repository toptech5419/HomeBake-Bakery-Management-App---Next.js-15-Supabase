const CACHE_NAME = 'homebake-v1.0.0';
const STATIC_CACHE = 'homebake-static-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Cache strategies for different types of requests
const CACHE_STRATEGIES = {
  static: ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico'],
  staleWhileRevalidate: ['/api/', '/_next/'],
  networkFirst: ['/dashboard/', '/login', '/register']
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(handleFetchRequest(request));
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'homebake-sync') {
    event.waitUntil(backgroundSync());
  }
});

// Enhanced push notifications with better compatibility
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data received:', data);
    
    // Enhanced notification options with better mobile support
    const options = {
      body: data.body || 'HomeBake notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: data.tag || 'homebake',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      silent: false,
      timestamp: Date.now(),
      data: {
        url: data.url || '/dashboard',
        activity_type: data.activity_type,
        user_name: data.user_name,
        metadata: data.metadata || {}
      },
      actions: data.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      // Enhanced options for better mobile experience
      vibrate: data.vibrate || [200, 100, 200],
      image: data.image || null
    };

    // Fallback for browsers that don't support all options
    const safeOptions = {
      body: options.body,
      icon: options.icon,
      badge: options.badge,
      tag: options.tag,
      data: options.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'HomeBake', 
        // Try enhanced options first, fall back to safe options
        self.registration.showNotification.length > 1 ? options : safeOptions
      ).catch(error => {
        console.error('[SW] Failed to show notification:', error);
        // Fallback: show basic notification
        return self.registration.showNotification(data.title || 'HomeBake', safeOptions);
      })
    );
  } catch (error) {
    console.error('[SW] Error processing push event:', error);
    
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('HomeBake', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        tag: 'homebake-fallback',
        data: { url: '/dashboard' }
      })
    );
  }
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  console.log('[SW] Action clicked:', event.action);
  
  event.notification.close();
  
  // Handle action buttons
  if (event.action === 'dismiss') {
    return; // Just close the notification
  }
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate to the URL
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              data: event.notification.data
            });
            return;
          }
        }
        
        // Open new window if app is not open
        return clients.openWindow(urlToOpen);
      })
      .catch(error => {
        console.error('[SW] Error handling notification click:', error);
        // Fallback: just open the URL
        return clients.openWindow(urlToOpen);
      })
  );
});

// Enhanced notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Track notification dismissals for analytics
  event.waitUntil(
    fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dismissed',
        tag: event.notification.tag,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.warn('[SW] Failed to track notification dismissal:', error);
    })
  );
});

// Enhanced service worker registration and update handling
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Enhanced activation with better cache management
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
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
        console.log('[SW] Service Worker activated successfully');
      })
      .catch(error => {
        console.error('[SW] Service Worker activation failed:', error);
      })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      timestamp: Date.now()
    });
  }
});

// Handle fetch requests with appropriate caching strategy
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API requests - network first with cache fallback
  if (pathname.startsWith('/api/')) {
    return networkFirstStrategy(request);
  }

  // Static assets - cache first
  if (CACHE_STRATEGIES.static.some(ext => pathname.endsWith(ext))) {
    return cacheFirstStrategy(request);
  }

  // App shell and pages - stale while revalidate
  if (pathname.startsWith('/dashboard/') || pathname === '/' || pathname.startsWith('/_next/')) {
    return staleWhileRevalidateStrategy(request);
  }

  // Default - network first
  return networkFirstStrategy(request);
}

// Network first strategy - try network, fall back to cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Cache first strategy - try cache, fall back to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Cache and network both failed:', request.url);
    throw error;
  }
}

// Stale while revalidate - return cache immediately, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch((error) => {
    console.log('[SW] Background fetch failed:', request.url);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return fetchPromise;
}

// Background sync for offline data
async function backgroundSync() {
  try {
    console.log('[SW] Starting background sync...');
    
    // This would integrate with the offline sync system
    // For now, we'll just log and potentially trigger a sync message
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Helper function to register background sync
function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register('homebake-sync');
    }).catch((error) => {
      console.error('[SW] Background sync registration failed:', error);
    });
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  switch (event.data.type) {
    case 'TRIGGER_SYNC':
      registerBackgroundSync();
      break;
      
    case 'CACHE_UPDATE':
      // Handle cache updates from main thread
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    default:
      console.log('[SW] Unknown message type:', event.data.type);
  }
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'homebake-periodic-sync') {
    event.waitUntil(backgroundSync());
  }
});

console.log('[SW] Service Worker loaded successfully');