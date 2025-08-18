// Firestore Cache Manager for CalyBase
// Intelligent caching for Firestore queries with cache invalidation

(function() {
    'use strict';

    const logger = new Logger('CacheManager');

    // Cache configuration
    const CACHE_CONFIG = {
        DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
        MAX_CACHE_SIZE: 100, // Maximum number of cached queries
        STORAGE_KEY: 'calybase_cache',
        VERSION: '1.0.0'
    };

    // Cache entry structure
    class CacheEntry {
        constructor(data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
            this.data = data;
            this.timestamp = Date.now();
            this.ttl = ttl;
            this.hits = 0;
            this.lastAccess = Date.now();
        }

        isExpired() {
            return Date.now() - this.timestamp > this.ttl;
        }

        isStale(staleTolerance = 0) {
            return Date.now() - this.timestamp > (this.ttl + staleTolerance);
        }

        touch() {
            this.hits++;
            this.lastAccess = Date.now();
        }
    }

    // Main cache manager
    class FirestoreCacheManager {
        constructor() {
            this.memoryCache = new Map();
            this.queryListeners = new Map();
            this.invalidationRules = new Map();
            this.stats = {
                hits: 0,
                misses: 0,
                invalidations: 0,
                networkRequests: 0
            };
            
            this.loadFromStorage();
            this.setupPeriodicCleanup();
        }

        // Generate cache key from query
        generateKey(collection, queryParams = {}) {
            const sortedParams = Object.keys(queryParams)
                .sort()
                .reduce((obj, key) => {
                    obj[key] = queryParams[key];
                    return obj;
                }, {});
                
            return `${collection}:${JSON.stringify(sortedParams)}`;
        }

        // Cache a query result
        set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
            const entry = new CacheEntry(data, ttl);
            this.memoryCache.set(key, entry);
            
            // Trim cache if too large
            this.trimCache();
            
            // Save to persistent storage
            this.saveToStorage();
            
            logger.debug('Cache entry stored', { key, ttl, size: this.memoryCache.size });
        }

        // Get from cache
        get(key, allowStale = false) {
            const entry = this.memoryCache.get(key);
            
            if (!entry) {
                this.stats.misses++;
                return null;
            }

            if (entry.isExpired() && !allowStale) {
                this.memoryCache.delete(key);
                this.stats.misses++;
                logger.debug('Cache entry expired', { key });
                return null;
            }

            entry.touch();
            this.stats.hits++;
            logger.debug('Cache hit', { key, age: Date.now() - entry.timestamp });
            
            return entry.data;
        }

        // Check if entry exists and is valid
        has(key) {
            const entry = this.memoryCache.get(key);
            return entry && !entry.isExpired();
        }

        // Invalidate cache entries
        invalidate(pattern) {
            let invalidated = 0;
            
            if (typeof pattern === 'string') {
                // Exact match
                if (this.memoryCache.delete(pattern)) {
                    invalidated = 1;
                }
            } else if (pattern instanceof RegExp) {
                // Pattern match
                for (const key of this.memoryCache.keys()) {
                    if (pattern.test(key)) {
                        this.memoryCache.delete(key);
                        invalidated++;
                    }
                }
            } else if (typeof pattern === 'function') {
                // Custom function
                for (const [key, entry] of this.memoryCache.entries()) {
                    if (pattern(key, entry)) {
                        this.memoryCache.delete(key);
                        invalidated++;
                    }
                }
            }

            this.stats.invalidations += invalidated;
            logger.debug('Cache invalidated', { pattern, count: invalidated });
            
            if (invalidated > 0) {
                this.saveToStorage();
            }
            
            return invalidated;
        }

        // Cached Firestore query
        async query(collection, queryFn = null, cacheOptions = {}) {
            const queryParams = this.extractQueryParams(queryFn);
            const cacheKey = this.generateKey(collection, queryParams);
            const ttl = cacheOptions.ttl || CACHE_CONFIG.DEFAULT_TTL;
            const allowStale = cacheOptions.allowStale || false;

            // Try cache first
            const cached = this.get(cacheKey, allowStale);
            if (cached) {
                // If stale but allowed, fetch in background
                if (allowStale && this.memoryCache.get(cacheKey)?.isExpired()) {
                    this.refreshInBackground(collection, queryFn, cacheKey, ttl);
                }
                return cached;
            }

            // Cache miss - fetch from Firestore
            logger.debug('Cache miss, fetching from Firestore', { cacheKey });
            this.stats.networkRequests++;
            
            try {
                let query = window.db.collection(collection);
                
                // Apply query function if provided
                if (queryFn) {
                    query = queryFn(query);
                }

                const snapshot = await query.get();
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Cache the result
                this.set(cacheKey, data, ttl);
                
                return data;
            } catch (error) {
                logger.error('Firestore query failed', { collection, error });
                
                // Return stale data if available
                const stale = this.get(cacheKey, true);
                if (stale) {
                    logger.warn('Returning stale data due to network error', { cacheKey });
                    return stale;
                }
                
                throw error;
            }
        }

        // Background refresh
        async refreshInBackground(collection, queryFn, cacheKey, ttl) {
            try {
                let query = window.db.collection(collection);
                if (queryFn) {
                    query = queryFn(query);
                }

                const snapshot = await query.get();
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                this.set(cacheKey, data, ttl);
                logger.debug('Background refresh completed', { cacheKey });
            } catch (error) {
                logger.warn('Background refresh failed', { cacheKey, error });
            }
        }

        // Real-time query with cache
        async queryRealtime(collection, queryFn = null, callback, cacheOptions = {}) {
            const queryParams = this.extractQueryParams(queryFn);
            const cacheKey = this.generateKey(collection, queryParams);
            const listenerKey = `${cacheKey}_listener`;

            // Return cached data immediately if available
            const cached = this.get(cacheKey);
            if (cached) {
                callback(cached);
            }

            // Clean up existing listener
            if (this.queryListeners.has(listenerKey)) {
                this.queryListeners.get(listenerKey)();
                this.queryListeners.delete(listenerKey);
            }

            // Set up real-time listener
            let query = window.db.collection(collection);
            if (queryFn) {
                query = queryFn(query);
            }

            const unsubscribe = query.onSnapshot(
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Update cache
                    this.set(cacheKey, data, cacheOptions.ttl);
                    
                    // Call callback with fresh data
                    callback(data);
                    
                    logger.debug('Real-time update received', { collection, size: data.length });
                },
                (error) => {
                    logger.error('Real-time listener error', { collection, error });
                    
                    // Try to return cached data on error
                    const fallback = this.get(cacheKey, true);
                    if (fallback) {
                        callback(fallback);
                    }
                }
            );

            // Store listener for cleanup
            this.queryListeners.set(listenerKey, unsubscribe);
            
            return unsubscribe;
        }

        // Extract query parameters for cache key generation
        extractQueryParams(queryFn) {
            if (!queryFn) return {};
            
            // This is a simplified implementation
            // In practice, you'd want to parse the query function more thoroughly
            const fnString = queryFn.toString();
            const params = {};
            
            // Extract common query patterns
            const whereMatch = fnString.match(/\.where\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`],\s*([^)]+)\)/g);
            if (whereMatch) {
                params.where = whereMatch;
            }
            
            const orderByMatch = fnString.match(/\.orderBy\(['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]+)['"`])?\)/g);
            if (orderByMatch) {
                params.orderBy = orderByMatch;
            }
            
            const limitMatch = fnString.match(/\.limit\((\d+)\)/);
            if (limitMatch) {
                params.limit = parseInt(limitMatch[1]);
            }

            return params;
        }

        // Cache maintenance
        trimCache() {
            if (this.memoryCache.size <= CACHE_CONFIG.MAX_CACHE_SIZE) return;

            // Sort by last access time and remove oldest entries
            const entries = Array.from(this.memoryCache.entries())
                .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

            const toRemove = entries.slice(0, this.memoryCache.size - CACHE_CONFIG.MAX_CACHE_SIZE);
            
            for (const [key] of toRemove) {
                this.memoryCache.delete(key);
            }

            logger.debug('Cache trimmed', { removed: toRemove.length, remaining: this.memoryCache.size });
        }

        // Periodic cleanup
        setupPeriodicCleanup() {
            setInterval(() => {
                this.cleanupExpired();
            }, 60000); // Every minute
        }

        cleanupExpired() {
            let cleaned = 0;
            
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.isExpired()) {
                    this.memoryCache.delete(key);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                logger.debug('Expired entries cleaned', { count: cleaned });
                this.saveToStorage();
            }
        }

        // Persistence
        saveToStorage() {
            try {
                const data = {
                    version: CACHE_CONFIG.VERSION,
                    timestamp: Date.now(),
                    cache: Array.from(this.memoryCache.entries())
                };
                
                localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(data));
            } catch (error) {
                logger.warn('Failed to save cache to storage', error);
            }
        }

        loadFromStorage() {
            try {
                const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
                if (!stored) return;

                const data = JSON.parse(stored);
                if (data.version !== CACHE_CONFIG.VERSION) {
                    logger.info('Cache version mismatch, clearing cache');
                    this.clearAll();
                    return;
                }

                // Restore cache entries
                for (const [key, entryData] of data.cache) {
                    const entry = new CacheEntry(entryData.data, entryData.ttl);
                    entry.timestamp = entryData.timestamp;
                    entry.hits = entryData.hits;
                    entry.lastAccess = entryData.lastAccess;
                    
                    if (!entry.isExpired()) {
                        this.memoryCache.set(key, entry);
                    }
                }

                logger.debug('Cache loaded from storage', { entries: this.memoryCache.size });
            } catch (error) {
                logger.warn('Failed to load cache from storage', error);
                this.clearAll();
            }
        }

        // Cache management
        clearAll() {
            this.memoryCache.clear();
            this.stats = { hits: 0, misses: 0, invalidations: 0, networkRequests: 0 };
            
            try {
                localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
            } catch (error) {
                logger.warn('Failed to clear storage', error);
            }
            
            logger.info('Cache cleared');
        }

        getStats() {
            const hitRate = this.stats.hits + this.stats.misses > 0 
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
                : '0.00';

            return {
                ...this.stats,
                hitRate: `${hitRate}%`,
                cacheSize: this.memoryCache.size,
                totalQueries: this.stats.hits + this.stats.misses
            };
        }

        // Debug utilities
        debug() {
            return {
                stats: this.getStats(),
                keys: Array.from(this.memoryCache.keys()),
                entries: Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
                    key,
                    age: Date.now() - entry.timestamp,
                    hits: entry.hits,
                    expired: entry.isExpired()
                }))
            };
        }
    }

    // Global cache manager instance
    const cacheManager = new FirestoreCacheManager();

    // Export to window
    window.CacheManager = cacheManager;
    
    // Convenience methods
    window.cachedQuery = (collection, queryFn, options) => 
        cacheManager.query(collection, queryFn, options);
    
    window.realtimeQuery = (collection, queryFn, callback, options) =>
        cacheManager.queryRealtime(collection, queryFn, callback, options);

    logger.info('Firestore Cache Manager initialized');

})();