// CalyBase Service Worker - PWA Offline Support
const CACHE_NAME = 'calybase-v1.0.0';
const RUNTIME_CACHE = 'calybase-runtime';

// Files to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/membres.html',
  '/events.html',
  '/login.html',
  '/styles.css',
  '/critical.css',
  '/firebase-config.js',
  '/firebase-app.js',
  '/auth-guard.js',
  '/navigation.js',
  '/membres.js',
  '/events.js',
  '/constants.js',
  '/logger.js',
  '/error-handler.js',
  '/session-manager.js',
  '/cache-manager.js',
  '/device-utils.js',
  '/deployment-timestamp.js',
  '/avatars/default-avatar.svg',
  '/images/CalypsoDC-VerticPos_rvb.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[ServiceWorker] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip Firebase and API requests (always fetch fresh)
  if (url.pathname.includes('firebaseapp.com') || 
      url.pathname.includes('googleapis.com') ||
      url.pathname.includes('/__/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Clone the request
        const fetchRequest = request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(RUNTIME_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback for HTML pages
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // Return default avatar for failed avatar requests
        if (request.url.includes('/avatars/')) {
          return caches.match('/avatars/default-avatar.svg');
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push received');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || 'CalyBase Notification';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data.url;
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Check if there is already a window/tab open
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Message handling for skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Offline data sync function
async function syncOfflineData() {
  try {
    // Get any queued offline data from IndexedDB
    const db = await openDB();
    const tx = db.transaction('offline_queue', 'readonly');
    const store = tx.objectStore('offline_queue');
    const allData = await store.getAll();

    // Process each queued item
    for (const item of allData) {
      try {
        // Attempt to sync the data
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        // If successful, remove from queue
        const deleteTx = db.transaction('offline_queue', 'readwrite');
        await deleteTx.objectStore('offline_queue').delete(item.id);
      } catch (error) {
        console.error('[ServiceWorker] Sync failed for item:', item.id);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync error:', error);
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CalyBaseOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}