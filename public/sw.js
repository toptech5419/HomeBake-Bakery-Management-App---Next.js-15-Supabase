// HomeBake Unified Service Worker - Production Grade v3.0
// Enhanced push notifications with cross-browser compatibility

// Version and cache management
const SW_VERSION = '3.0.0';
const CACHE_PREFIX = 'homebake-v3';
const CACHE_NAMES = {
  STATIC: `${CACHE_PREFIX}-static-${SW_VERSION}`,
  DYNAMIC: `${CACHE_PREFIX}-dynamic-${SW_VERSION}`,
  IMAGES: `${CACHE_PREFIX}-images-${SW_VERSION}`,
  API: `${CACHE_PREFIX}-api-${SW_VERSION}`
};

// Cache configuration
const CACHE_STRATEGIES = {
  STATIC_CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC_CACHE_DURATION: 24 * 60 * 60 * 1000, // 1 day
  API_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_ENTRIES: 100
};

// Resources to precache
const STATIC_RESOURCES = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

console.log(`🚀 HomeBake Service Worker v${SW_VERSION} initializing...`);

// Install event - precache static resources
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC)
      .then(cache => {
        console.log('💾 Precaching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('✅ Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache static resources:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Cleanup old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX) && !Object.values(CACHE_NAMES).includes(name))
            .map(name => {
              console.log('🧹 Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log('✅ Service Worker activated successfully');
    })
    .catch(error => {
      console.error('❌ Service Worker activation failed:', error);
    })
  );
});

// Fetch event - handle network requests with caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const { url, method, destination } = request;
  
  // Only handle GET requests
  if (method !== 'GET') return;
  
  // Skip non-HTTP requests
  if (!url.startsWith('http')) return;
  
  event.respondWith(handleRequest(request));
});

// Request handling with different strategies
async function handleRequest(request) {
  const { url, destination } = request;
  
  try {
    // API requests - network first with short cache fallback
    if (url.includes('/api/')) {
      return await handleApiRequest(request);
    }
    
    // Images - cache first
    if (destination === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      return await handleImageRequest(request);
    }
    
    // Static resources - cache first
    if (url.includes('/_next/static/') || url.includes('/static/')) {
      return await handleStaticRequest(request);
    }
    
    // Navigation requests - network first with cache fallback
    if (destination === 'document') {
      return await handleNavigationRequest(request);
    }
    
    // Default strategy - network first
    return await handleDefaultRequest(request);
    
  } catch (error) {
    console.warn('⚠️ Request handling failed:', url, error);
    
    // Fallback for navigation requests
    if (request.destination === 'document') {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// API request handler - network first with short cache
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAMES.API);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses briefly
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('📡 Network failed for API request, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Image request handler - cache first
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.IMAGES);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the image
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('🖼️ Failed to fetch image:', request.url);
    throw error;
  }
}

// Static resource handler - cache first with long expiration
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache static resources for longer
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('📄 Failed to fetch static resource:', request.url);
    throw error;
  }
}

// Navigation request handler - network first
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAMES.DYNAMIC);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the page
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🧭 Network failed for navigation, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback to home page
    const homeCache = await cache.match('/');
    if (homeCache) {
      return homeCache;
    }
    
    throw error;
  }
}

// Default request handler
async function handleDefaultRequest(request) {
  const cache = await caches.open(CACHE_NAMES.DYNAMIC);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Push notification handler
self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  let notificationData = {
    title: 'HomeBake Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {},
    tag: 'homebake-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('📨 Push data received:', pushData);
      
      notificationData = {
        ...notificationData,
        title: pushData.title || notificationData.title,
        body: pushData.body || pushData.message || notificationData.body,
        data: pushData.data || {},
        tag: pushData.tag || notificationData.tag
      };
      
    } catch (error) {
      console.error('❌ Failed to parse push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('✅ Push notification displayed successfully');
      })
      .catch(error => {
        console.error('❌ Failed to display push notification:', error);
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('👆 Notification clicked:', event.notification);
  
  event.notification.close();
  
  const { action, data } = event;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    console.log('🚫 Notification dismissed');
    return;
  }
  
  // Default action or 'view' action
  const urlToOpen = notificationData.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        const existingClient = clientList.find(client => 
          client.url.includes(self.location.origin)
        );
        
        if (existingClient) {
          // Focus existing window and navigate
          return existingClient.focus().then(() => {
            return existingClient.navigate(urlToOpen);
          });
        } else {
          // Open new window
          return clients.openWindow(urlToOpen);
        }
      })
      .then(() => {
        console.log('✅ App opened from notification');
      })
      .catch(error => {
        console.error('❌ Failed to open app from notification:', error);
      })
  );
});

// Background sync (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync') {
      event.waitUntil(
        // Handle background sync operations
        Promise.resolve()
          .then(() => {
            console.log('✅ Background sync completed');
          })
          .catch(error => {
            console.error('❌ Background sync failed:', error);
          })
      );
    }
  });
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    console.log('⏰ Periodic sync triggered:', event.tag);
    
    if (event.tag === 'periodic-background-sync') {
      event.waitUntil(
        // Handle periodic sync operations
        Promise.resolve()
          .then(() => {
            console.log('✅ Periodic sync completed');
          })
          .catch(error => {
            console.error('❌ Periodic sync failed:', error);
          })
      );
    }
  });
}

// Message handler for communication with main app
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  console.log('💬 Message received from client:', type, data);
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: SW_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(cacheNames => Promise.all(
            cacheNames.map(name => caches.delete(name))
          ))
          .then(() => {
            event.ports[0].postMessage({ success: true });
          })
          .catch(error => {
            event.ports[0].postMessage({ success: false, error: error.message });
          })
      );
      break;
      
    default:
      console.log('❓ Unknown message type:', type);
  }
});

// Error handler
self.addEventListener('error', event => {
  console.error('💥 Service Worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', event => {
  console.error('💥 Service Worker unhandled rejection:', event.reason);
  event.preventDefault();
});

console.log(`✅ HomeBake Service Worker v${SW_VERSION} initialized successfully`);