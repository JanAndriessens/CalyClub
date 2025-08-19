// Real-time Data Manager for CalyBase
// Handles real-time Firestore listeners, optimistic updates, and data synchronization

(function() {
    'use strict';

    const logger = new Logger('RealtimeManager');

    // Connection states
    const CONNECTION_STATE = {
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        RECONNECTING: 'reconnecting'
    };

    // Update types for optimistic updates
    const UPDATE_TYPE = {
        CREATE: 'create',
        UPDATE: 'update',
        DELETE: 'delete'
    };

    class RealtimeDataManager {
        constructor() {
            this.listeners = new Map();
            this.optimisticUpdates = new Map();
            this.connectionState = CONNECTION_STATE.DISCONNECTED;
            this.eventHandlers = new Map();
            this.retryAttempts = new Map();
            this.maxRetries = 3;
            
            this.setupConnectionMonitoring();
            this.setupOptimisticUpdateQueue();
        }

        // Connection monitoring
        setupConnectionMonitoring() {
            // Monitor online/offline state
            window.addEventListener('online', () => {
                this.setConnectionState(CONNECTION_STATE.CONNECTED);
                this.retryFailedListeners();
            });

            window.addEventListener('offline', () => {
                this.setConnectionState(CONNECTION_STATE.DISCONNECTED);
            });

            // Initial state
            this.setConnectionState(navigator.onLine ? CONNECTION_STATE.CONNECTED : CONNECTION_STATE.DISCONNECTED);
        }

        setConnectionState(state) {
            if (this.connectionState !== state) {
                const previousState = this.connectionState;
                this.connectionState = state;
                
                logger.info('Connection state changed', { from: previousState, to: state });
                this.emit('connectionStateChanged', { state, previousState });
            }
        }

        // Event handling
        on(event, handler) {
            if (!this.eventHandlers.has(event)) {
                this.eventHandlers.set(event, []);
            }
            this.eventHandlers.get(event).push(handler);
        }

        off(event, handler) {
            if (this.eventHandlers.has(event)) {
                const handlers = this.eventHandlers.get(event);
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }

        emit(event, data) {
            if (this.eventHandlers.has(event)) {
                this.eventHandlers.get(event).forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        logger.error('Event handler error', { event, error });
                    }
                });
            }
        }

        // Real-time listeners with intelligent error handling
        async subscribe(collection, queryFn = null, callback, options = {}) {
            const listenerId = this.generateListenerId(collection, queryFn);
            const cacheKey = options.cacheKey || listenerId;
            
            logger.debug('Setting up real-time subscription', { listenerId, collection });

            // Clean up existing listener
            this.unsubscribe(listenerId);

            try {
                // Get initial cached data if available
                if (window.CacheManager) {
                    const cached = window.CacheManager.get(cacheKey);
                    if (cached) {
                        logger.debug('Serving cached data while setting up listener', { listenerId });
                        callback(cached, { fromCache: true });
                    }
                }

                // Set up Firestore listener
                let query = window.db.collection(collection);
                if (queryFn) {
                    query = queryFn(query);
                }

                const unsubscribe = query.onSnapshot(
                    (snapshot) => {
                        this.handleSnapshot(snapshot, listenerId, cacheKey, callback, options);
                    },
                    (error) => {
                        this.handleListenerError(error, listenerId, collection, queryFn, callback, options);
                    }
                );

                // Store listener info
                this.listeners.set(listenerId, {
                    unsubscribe,
                    collection,
                    queryFn,
                    callback,
                    options,
                    cacheKey,
                    createdAt: Date.now(),
                    errorCount: 0
                });

                // Reset retry counter on successful setup
                this.retryAttempts.delete(listenerId);

                return listenerId;

            } catch (error) {
                logger.error('Failed to set up listener', { listenerId, error });
                
                // Try to serve cached data as fallback
                if (window.CacheManager) {
                    const cached = window.CacheManager.get(cacheKey, true); // Allow stale
                    if (cached) {
                        callback(cached, { fromCache: true, error: true });
                    }
                }
                
                throw error;
            }
        }

        handleSnapshot(snapshot, listenerId, cacheKey, callback, options) {
            try {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Apply optimistic updates
                const dataWithOptimistic = this.applyOptimisticUpdates(data, cacheKey);

                // Update cache
                if (window.CacheManager) {
                    window.CacheManager.set(cacheKey, data, options.ttl);
                }

                // Call callback with data
                callback(dataWithOptimistic, { 
                    fromCache: false, 
                    optimistic: dataWithOptimistic.length !== data.length 
                });

                // Reset error count on successful update
                const listener = this.listeners.get(listenerId);
                if (listener) {
                    listener.errorCount = 0;
                }

                logger.debug('Real-time update processed', { 
                    listenerId, 
                    items: data.length, 
                    optimistic: dataWithOptimistic.length - data.length 
                });

            } catch (error) {
                logger.error('Error processing snapshot', { listenerId, error });
            }
        }

        handleListenerError(error, listenerId, collection, queryFn, callback, options) {
            const listener = this.listeners.get(listenerId);
            if (listener) {
                listener.errorCount++;
            }

            logger.error('Real-time listener error', { 
                listenerId, 
                error: error.message, 
                errorCount: listener?.errorCount 
            });

            // Emit error event
            this.emit('listenerError', { listenerId, error, collection });

            // Try to serve cached data
            if (window.CacheManager) {
                const cached = window.CacheManager.get(listener.cacheKey, true);
                if (cached) {
                    const dataWithOptimistic = this.applyOptimisticUpdates(cached, listener.cacheKey);
                    callback(dataWithOptimistic, { fromCache: true, error: true });
                }
            }

            // Schedule retry if not too many attempts
            this.scheduleRetry(listenerId, collection, queryFn, callback, options);
        }

        scheduleRetry(listenerId, collection, queryFn, callback, options) {
            const currentAttempts = this.retryAttempts.get(listenerId) || 0;
            
            if (currentAttempts < this.maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000); // Exponential backoff, max 30s
                
                logger.info('Scheduling listener retry', { listenerId, attempt: currentAttempts + 1, delay });
                
                setTimeout(() => {
                    this.retryAttempts.set(listenerId, currentAttempts + 1);
                    this.subscribe(collection, queryFn, callback, options);
                }, delay);
            } else {
                logger.error('Max retry attempts reached for listener', { listenerId });
                this.emit('listenerFailed', { listenerId, collection });
            }
        }

        retryFailedListeners() {
            logger.info('Retrying failed listeners after reconnection');
            
            for (const [listenerId, listener] of this.listeners.entries()) {
                if (listener.errorCount > 0) {
                    logger.debug('Retrying listener', { listenerId });
                    this.subscribe(listener.collection, listener.queryFn, listener.callback, listener.options);
                }
            }
        }

        // Optimistic updates
        setupOptimisticUpdateQueue() {
            // Process optimistic updates periodically
            setInterval(() => {
                this.cleanupExpiredOptimisticUpdates();
            }, 10000); // Every 10 seconds
        }

        applyOptimisticUpdate(collection, id, data, type, options = {}) {
            const cacheKey = options.cacheKey || collection;
            const updateId = `${type}_${id}_${Date.now()}`;
            const ttl = options.ttl || 30000; // 30 seconds default TTL

            const update = {
                id: updateId,
                collection,
                documentId: id,
                data,
                type,
                timestamp: Date.now(),
                ttl,
                applied: false
            };

            // Store optimistic update
            if (!this.optimisticUpdates.has(cacheKey)) {
                this.optimisticUpdates.set(cacheKey, []);
            }
            this.optimisticUpdates.get(cacheKey).push(update);

            logger.debug('Optimistic update applied', { updateId, type, documentId: id });

            // Notify listeners
            this.emit('optimisticUpdate', { update, cacheKey });

            return updateId;
        }

        applyOptimisticUpdates(data, cacheKey) {
            const updates = this.optimisticUpdates.get(cacheKey);
            if (!updates || updates.length === 0) {
                return data;
            }

            let result = [...data];

            for (const update of updates) {
                if (Date.now() - update.timestamp > update.ttl) {
                    continue; // Skip expired updates
                }

                switch (update.type) {
                    case UPDATE_TYPE.CREATE:
                        // Add new item if not already in data
                        if (!result.find(item => item.id === update.documentId)) {
                            result.push({ id: update.documentId, ...update.data });
                        }
                        break;

                    case UPDATE_TYPE.UPDATE:
                        // Update existing item
                        const updateIndex = result.findIndex(item => item.id === update.documentId);
                        if (updateIndex > -1) {
                            result[updateIndex] = { ...result[updateIndex], ...update.data };
                        }
                        break;

                    case UPDATE_TYPE.DELETE:
                        // Remove item
                        result = result.filter(item => item.id !== update.documentId);
                        break;
                }
            }

            return result;
        }

        removeOptimisticUpdate(updateId) {
            for (const [cacheKey, updates] of this.optimisticUpdates.entries()) {
                const index = updates.findIndex(update => update.id === updateId);
                if (index > -1) {
                    updates.splice(index, 1);
                    logger.debug('Optimistic update removed', { updateId, cacheKey });
                    break;
                }
            }
        }

        cleanupExpiredOptimisticUpdates() {
            const now = Date.now();
            let cleaned = 0;

            for (const [cacheKey, updates] of this.optimisticUpdates.entries()) {
                const originalLength = updates.length;
                const validUpdates = updates.filter(update => now - update.timestamp < update.ttl);
                
                if (validUpdates.length !== originalLength) {
                    this.optimisticUpdates.set(cacheKey, validUpdates);
                    cleaned += originalLength - validUpdates.length;
                }
            }

            if (cleaned > 0) {
                logger.debug('Cleaned expired optimistic updates', { count: cleaned });
            }
        }

        // Utility methods
        unsubscribe(listenerId) {
            const listener = this.listeners.get(listenerId);
            if (listener) {
                listener.unsubscribe();
                this.listeners.delete(listenerId);
                logger.debug('Listener unsubscribed', { listenerId });
            }
        }

        unsubscribeAll() {
            for (const [listenerId] of this.listeners) {
                this.unsubscribe(listenerId);
            }
            logger.info('All listeners unsubscribed');
        }

        generateListenerId(collection, queryFn) {
            const queryStr = queryFn ? queryFn.toString() : 'all';
            const hash = this.simpleHash(queryStr);
            return `${collection}_${hash}`;
        }

        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(36);
        }

        // Statistics and debugging
        getStats() {
            return {
                activeListeners: this.listeners.size,
                connectionState: this.connectionState,
                optimisticUpdates: Array.from(this.optimisticUpdates.values()).reduce((sum, updates) => sum + updates.length, 0),
                totalRetries: Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0)
            };
        }

        debug() {
            return {
                stats: this.getStats(),
                listeners: Array.from(this.listeners.entries()).map(([id, listener]) => ({
                    id,
                    collection: listener.collection,
                    errorCount: listener.errorCount,
                    age: Date.now() - listener.createdAt
                })),
                optimisticUpdates: Array.from(this.optimisticUpdates.entries()).map(([key, updates]) => ({
                    cacheKey: key,
                    updates: updates.map(u => ({
                        id: u.id,
                        type: u.type,
                        age: Date.now() - u.timestamp
                    }))
                }))
            };
        }
    }

    // Global real-time manager instance
    const realtimeManager = new RealtimeDataManager();

    // Export to window
    window.RealtimeManager = realtimeManager;

    // Convenience methods
    window.subscribeToCollection = (collection, queryFn, callback, options) =>
        realtimeManager.subscribe(collection, queryFn, callback, options);

    window.optimisticUpdate = (collection, id, data, type, options) =>
        realtimeManager.applyOptimisticUpdate(collection, id, data, type, options);

    // Constants for convenience
    window.UPDATE_TYPE = UPDATE_TYPE;

    logger.info('Real-time Data Manager initialized');

})();