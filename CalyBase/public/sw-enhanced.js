// Enhanced Service Worker for CalyBase
// Intelligent caching, background sync, and offline capabilities

const CACHE_VERSION = 'calybase-v2.1.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    CACHE_ONLY: 'cache-only',
    NETWORK_ONLY: 'network-only',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/logger.js',
    '/debug-utils.js',
    '/constants.js',
    '/device-utils.js',
    '/ipad-enhancements.js',
    '/ipad-safari-fix.js',
    '/page-protection.js',
    '/navigation.js',
    '/auth-guard.js',
    '/firebase-config.js',
    // '/firebase-v9.js', // DISABLED: Conflicts with Firebase v8
    '/table-touch-enhancements.js'
];

// API endpoints to cache
const API_PATTERNS = [
    /\/api\/config/,
    /\/api\/membres/,
    /\/api\/events/
];

// Images and media to cache
const MEDIA_PATTERNS = [
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\/images\//,
    /\/avatars\//
];

// Cache configuration
const CACHE_CONFIG = {
    static: {
        strategy: CACHE_STRATEGIES.CACHE_FIRST,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxEntries: 100
    },
    dynamic: {
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        maxEntries: 50
    },
    api: {
        strategy: CACHE_STRATEGIES.NETWORK_FIRST,
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxEntries: 100
    },
    media: {
        strategy: CACHE_STRATEGIES.CACHE_FIRST,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxEntries: 200
    }
};

// Utility functions
function log(message, data = null) {
    console.log(`[SW] ${message}`, data || '');
}

function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset));
}

function isApiRequest(url) {
    return API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isMediaRequest(url) {
    return MEDIA_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function getCacheName(type) {
    return `${CACHE_VERSION}-${type}`;
}

// Cache management
class CacheManager {
    static async cleanOldCaches() {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('calybase-') && !name.startsWith(CACHE_VERSION)
        );
        
        await Promise.all(oldCaches.map(name => caches.delete(name)));
        log('Cleaned old caches', { deleted: oldCaches.length });
    }

    static async trimCache(cacheName, maxEntries) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            log(`Trimmed cache ${cacheName}`, { deleted: keysToDelete.length });
        }
    }

    static async isStale(response, maxAge) {
        if (!response) return true;
        
        const cachedTime = response.headers.get('sw-cache-time');
        if (!cachedTime) return true;
        
        return Date.now() - parseInt(cachedTime) > maxAge;
    }

    static addTimestamp(response) {
        const clonedResponse = response.clone();
        const headers = new Headers(clonedResponse.headers);
        headers.set('sw-cache-time', Date.now().toString());
        
        return new Response(clonedResponse.body, {
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers: headers
        });
    }
}

// Cache strategies implementation
class CacheStrategy {
    static async cacheFirst(request, cacheName, config) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse && !await CacheManager.isStale(cachedResponse, config.maxAge)) {
            return cachedResponse;
        }
        
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                const responseToCache = CacheManager.addTimestamp(networkResponse);
                cache.put(request, responseToCache.clone());
                await CacheManager.trimCache(cacheName, config.maxEntries);
            }
            return networkResponse;
        } catch (error) {
            if (cachedResponse) {
                log('Network failed, serving stale cache', request.url);
                return cachedResponse;
            }
            throw error;
        }
    }

    static async networkFirst(request, cacheName, config) {
        const cache = await caches.open(cacheName);
        
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                const responseToCache = CacheManager.addTimestamp(networkResponse);
                cache.put(request, responseToCache.clone());
                await CacheManager.trimCache(cacheName, config.maxEntries);
            }
            return networkResponse;
        } catch (error) {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                log('Network failed, serving cache', request.url);
                return cachedResponse;
            }
            throw error;
        }
    }

    static async staleWhileRevalidate(request, cacheName, config) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        // Always try to fetch in background
        const networkPromise = fetch(request).then(async (networkResponse) => {
            if (networkResponse.ok) {
                const responseToCache = CacheManager.addTimestamp(networkResponse);
                cache.put(request, responseToCache.clone());
                await CacheManager.trimCache(cacheName, config.maxEntries);
            }
            return networkResponse;
        }).catch(() => null);
        
        // Return cached response immediately if available
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Wait for network if no cache
        return networkPromise;
    }
}

// Background sync
const SYNC_TAGS = {
    MEMBER_UPDATE: 'member-update',
    EVENT_UPDATE: 'event-update',
    OFFLINE_ACTIONS: 'offline-actions'
};

// Install event
self.addEventListener('install', event => {
    log('Service Worker installing');
    
    event.waitUntil(
        (async () => {
            const staticCache = await caches.open(STATIC_CACHE);
            await staticCache.addAll(STATIC_ASSETS);
            log('Static assets cached');
            
            // Skip waiting to activate immediately
            await self.skipWaiting();
        })()
    );
});

// Activate event
self.addEventListener('activate', event => {
    log('Service Worker activating');
    
    event.waitUntil(
        (async () => {
            await CacheManager.cleanOldCaches();
            await self.clients.claim();
            log('Service Worker activated');
        })()
    );
});

// Fetch event with intelligent caching
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and cross-origin requests
    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                // Determine cache strategy based on request type
                if (isStaticAsset(url)) {
                    return await CacheStrategy.cacheFirst(request, STATIC_CACHE, CACHE_CONFIG.static);
                } else if (isApiRequest(url)) {
                    return await CacheStrategy.networkFirst(request, API_CACHE, CACHE_CONFIG.api);
                } else if (isMediaRequest(url)) {
                    return await CacheStrategy.cacheFirst(request, getCacheName('media'), CACHE_CONFIG.media);
                } else {
                    return await CacheStrategy.staleWhileRevalidate(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic);
                }
            } catch (error) {
                log('Fetch failed', { url: request.url, error: error.message });
                
                // Return offline page for navigation requests
                if (request.destination === 'document') {
                    const cache = await caches.open(STATIC_CACHE);
                    return await cache.match('/') || new Response('Offline', { status: 503 });
                }
                
                // Return empty response for other requests
                return new Response('', { status: 503 });
            }
        })()
    );
});

// Background sync
self.addEventListener('sync', event => {
    log('Background sync triggered', event.tag);
    
    switch (event.tag) {
        case SYNC_TAGS.MEMBER_UPDATE:
            event.waitUntil(syncMemberUpdates());
            break;
        case SYNC_TAGS.EVENT_UPDATE:
            event.waitUntil(syncEventUpdates());
            break;
        case SYNC_TAGS.OFFLINE_ACTIONS:
            event.waitUntil(syncOfflineActions());
            break;
    }
});

// Sync functions
async function syncMemberUpdates() {
    try {
        log('Syncing member updates');
        // Implementation for syncing member data
        // This would sync any offline member changes
    } catch (error) {
        log('Member sync failed', error.message);
    }
}

async function syncEventUpdates() {
    try {
        log('Syncing event updates');
        // Implementation for syncing event data
    } catch (error) {
        log('Event sync failed', error.message);
    }
}

async function syncOfflineActions() {
    try {
        log('Syncing offline actions');
        // Implementation for syncing queued offline actions
    } catch (error) {
        log('Offline action sync failed', error.message);
    }
}

// Message handling for cache management
self.addEventListener('message', event => {
    const { action, data } = event.data;
    
    switch (action) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.delete(data.cacheName).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;
            
        case 'GET_CACHE_INFO':
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    const cacheInfo = {};
                    
                    for (const name of cacheNames) {
                        const cache = await caches.open(name);
                        const keys = await cache.keys();
                        cacheInfo[name] = keys.length;
                    }
                    
                    event.ports[0].postMessage({ cacheInfo });
                })()
            );
            break;
    }
});

log('Enhanced Service Worker loaded');