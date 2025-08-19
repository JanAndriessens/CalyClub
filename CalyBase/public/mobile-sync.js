// Enhanced Mobile Sync Manager for CalyClub
// Provides advanced offline capabilities, smart sync, and mobile-optimized data management

class MobileSyncManager {
    constructor() {
        this.isInitialized = false;
        this.db = null;
        this.auth = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.syncStatusIndicator = null;
        this.localStoragePrefix = 'calyclub_';
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        // Wait for Firebase initialization
        if (typeof window.firebaseConfigPromise !== 'undefined') {
            await window.firebaseConfigPromise;
        }

        this.db = window.db;
        this.auth = window.auth;

        // Initialize offline storage
        await this.initializeOfflineStorage();
        
        // Set up network listeners
        this.setupNetworkListeners();
        
        // Create sync status indicator
        this.createSyncStatusIndicator();
        
        // Start periodic sync checks
        this.startPeriodicSync();
        
        // Handle app visibility changes
        this.handleVisibilityChange();
        
        this.isInitialized = true;
    }

    // Initialize offline storage (IndexedDB)
    async initializeOfflineStorage() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CalyClubOffline', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.offlineDB = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for different data types
                const stores = ['membres', 'events', 'payments', 'syncQueue', 'metadata'];
                
                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        
                        // Add indexes for common queries
                        if (storeName === 'membres') {
                            store.createIndex('nom', 'nom', { unique: false });
                            store.createIndex('email', 'email', { unique: false });
                        }
                        
                        if (storeName === 'events') {
                            store.createIndex('date', 'date', { unique: false });
                            store.createIndex('type', 'type', { unique: false });
                        }
                        
                        if (storeName === 'payments') {
                            store.createIndex('status', 'status', { unique: false });
                            store.createIndex('date', 'date', { unique: false });
                        }
                        
                        if (storeName === 'syncQueue') {
                            store.createIndex('timestamp', 'timestamp', { unique: false });
                            store.createIndex('status', 'status', { unique: false });
                        }
                    }
                });
            };
        });
    }

    // Set up network event listeners
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus('online');
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('offline');
        });
    }

    // Create sync status indicator
    createSyncStatusIndicator() {
        // Only show on mobile devices
        if (!this.isMobileDevice()) return;

        const indicator = document.createElement('div');
        indicator.id = 'mobile-sync-indicator';
        indicator.innerHTML = `
            <style>
                #mobile-sync-indicator {
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    pointer-events: none;
                    opacity: 0;
                    transition: all 0.3s ease;
                }

                #mobile-sync-indicator.show {
                    opacity: 1;
                    pointer-events: auto;
                }

                .sync-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                }

                .sync-badge.online {
                    background: rgba(34, 139, 34, 0.9);
                }

                .sync-badge.offline {
                    background: rgba(255, 69, 58, 0.9);
                }

                .sync-badge.syncing {
                    background: rgba(0, 102, 204, 0.9);
                }

                .sync-icon {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .sync-icon.syncing {
                    animation: pulse 1.5s infinite;
                }

                .sync-spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .sync-queue-count {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 10px;
                    margin-left: 4px;
                }

                /* Toast-style notifications */
                .sync-notification {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 9998;
                    opacity: 0;
                    transition: all 0.3s ease;
                    pointer-events: none;
                    max-width: 300px;
                    text-align: center;
                }

                .sync-notification.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-10px);
                }

                .sync-notification.success {
                    background: rgba(34, 139, 34, 0.9);
                }

                .sync-notification.error {
                    background: rgba(255, 69, 58, 0.9);
                }
            </style>
            <div class="sync-badge offline">
                <div class="sync-icon"></div>
                <span class="sync-text">Hors ligne</span>
                <span class="sync-queue-count" style="display: none;">0</span>
            </div>
        `;

        document.body.appendChild(indicator);
        this.syncStatusIndicator = indicator;

        // Initial status
        this.updateSyncStatus(this.isOnline ? 'online' : 'offline');
    }

    // Update sync status indicator
    updateSyncStatus(status, message = null, showTime = 3000) {
        if (!this.syncStatusIndicator) return;

        const badge = this.syncStatusIndicator.querySelector('.sync-badge');
        const icon = this.syncStatusIndicator.querySelector('.sync-icon');
        const text = this.syncStatusIndicator.querySelector('.sync-text');
        const queueCount = this.syncStatusIndicator.querySelector('.sync-queue-count');

        // Remove all status classes
        badge.classList.remove('online', 'offline', 'syncing');
        
        // Update based on status
        switch (status) {
            case 'online':
                badge.classList.add('online');
                icon.innerHTML = '';
                icon.className = 'sync-icon';
                text.textContent = message || 'En ligne';
                break;
                
            case 'offline':
                badge.classList.add('offline');
                icon.innerHTML = '';
                icon.className = 'sync-icon';
                text.textContent = message || 'Hors ligne';
                break;
                
            case 'syncing':
                badge.classList.add('syncing');
                icon.innerHTML = '';
                icon.className = 'sync-spinner';
                text.textContent = message || 'Synchronisation...';
                break;
        }

        // Update queue count
        const queueLength = this.syncQueue.length;
        if (queueLength > 0) {
            queueCount.textContent = queueLength;
            queueCount.style.display = 'inline';
        } else {
            queueCount.style.display = 'none';
        }

        // Show indicator
        this.syncStatusIndicator.classList.add('show');

        // Auto-hide after specified time (except for offline/queue states)
        if (status === 'online' && queueLength === 0) {
            setTimeout(() => {
                this.syncStatusIndicator.classList.remove('show');
            }, showTime);
        }
    }

    // Show sync notification
    showSyncNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `sync-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Save data locally
    async saveToOfflineStorage(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.offlineDB.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Add timestamp and sync status
            const dataWithMeta = {
                ...data,
                lastModified: Date.now(),
                syncStatus: 'pending',
                offline: true
            };
            
            const request = store.put(dataWithMeta);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get data from offline storage
    async getFromOfflineStorage(storeName, id = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.offlineDB.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            if (id) {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    }

    // Add action to sync queue
    async addToSyncQueue(action) {
        const queueItem = {
            id: Date.now() + Math.random(),
            action: action.type,
            data: action.data,
            timestamp: Date.now(),
            status: 'pending',
            retries: 0,
            collection: action.collection,
            operation: action.operation // 'create', 'update', 'delete'
        };

        this.syncQueue.push(queueItem);
        
        // Save to offline storage
        await this.saveToOfflineStorage('syncQueue', queueItem);
        
        // Update status indicator
        this.updateSyncStatus(this.isOnline ? 'online' : 'offline');
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.processSyncQueue();
        }
    }

    // Process sync queue
    async processSyncQueue() {
        if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        this.updateSyncStatus('syncing');

        const pendingItems = this.syncQueue.filter(item => item.status === 'pending');
        
        for (const item of pendingItems) {
            try {
                await this.syncItem(item);
                item.status = 'completed';
                
                // Remove from queue
                this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
                
                // Remove from offline storage
                await this.removeFromOfflineStorage('syncQueue', item.id);
                
            } catch (error) {
                console.error('Sync error:', error);
                
                item.retries++;
                
                if (item.retries >= this.maxRetries) {
                    item.status = 'failed';
                    this.showSyncNotification(`Échec sync: ${item.action}`, 'error');
                } else {
                    // Retry later
                    setTimeout(() => {
                        if (this.isOnline) {
                            this.processSyncQueue();
                        }
                    }, this.retryDelay * item.retries);
                }
            }
        }

        this.syncInProgress = false;
        this.lastSyncTime = Date.now();
        
        if (this.syncQueue.length === 0) {
            this.updateSyncStatus('online', 'Synchronisé');
            this.showSyncNotification('Synchronisation terminée', 'success');
        } else {
            this.updateSyncStatus('offline');
        }
    }

    // Sync individual item
    async syncItem(item) {
        const { collection, operation, data } = item;
        
        switch (operation) {
            case 'create':
                await this.db.collection(collection).add(data);
                break;
                
            case 'update':
                await this.db.collection(collection).doc(data.id).update(data);
                break;
                
            case 'delete':
                await this.db.collection(collection).doc(data.id).delete();
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    // Remove from offline storage
    async removeFromOfflineStorage(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.offlineDB.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Smart data caching
    async cacheData(collection, data, expiryMinutes = 30) {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + (expiryMinutes * 60 * 1000),
            collection: collection
        };

        await this.saveToOfflineStorage('metadata', {
            id: `cache_${collection}`,
            ...cacheItem
        });
    }

    // Get cached data
    async getCachedData(collection) {
        try {
            const cached = await this.getFromOfflineStorage('metadata', `cache_${collection}`);
            
            if (cached && cached.expiry > Date.now()) {
                return cached.data;
            }
            
            return null;
        } catch (error) {
            console.error('Cache retrieval error:', error);
            return null;
        }
    }

    // Periodic sync
    startPeriodicSync() {
        // Sync every 5 minutes when online
        setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 5 * 60 * 1000);
    }

    // Handle app visibility changes
    handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline && this.syncQueue.length > 0) {
                // App became visible, try to sync
                setTimeout(() => {
                    this.processSyncQueue();
                }, 1000);
            }
        });
    }

    // Detect mobile device
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Public API methods

    // Save member offline
    async saveMemberOffline(memberData, operation = 'create') {
        // Save to local storage
        await this.saveToOfflineStorage('membres', memberData);
        
        // Add to sync queue
        await this.addToSyncQueue({
            type: 'member',
            collection: 'membres',
            operation: operation,
            data: memberData
        });
        
        this.showSyncNotification('Membre sauvegardé localement', 'info');
    }

    // Save event offline
    async saveEventOffline(eventData, operation = 'create') {
        await this.saveToOfflineStorage('events', eventData);
        
        await this.addToSyncQueue({
            type: 'event',
            collection: 'events',
            operation: operation,
            data: eventData
        });
        
        this.showSyncNotification('Événement sauvegardé localement', 'info');
    }

    // Save payment offline
    async savePaymentOffline(paymentData, operation = 'create') {
        await this.saveToOfflineStorage('payments', paymentData);
        
        await this.addToSyncQueue({
            type: 'payment',
            collection: 'payments',
            operation: operation,
            data: paymentData
        });
        
        this.showSyncNotification('Paiement sauvegardé localement', 'info');
    }

    // Get offline members
    async getOfflineMembers() {
        const cachedMembers = await this.getCachedData('membres');
        if (cachedMembers) {
            return cachedMembers;
        }
        
        return await this.getFromOfflineStorage('membres');
    }

    // Get offline events
    async getOfflineEvents() {
        const cachedEvents = await this.getCachedData('events');
        if (cachedEvents) {
            return cachedEvents;
        }
        
        return await this.getFromOfflineStorage('events');
    }

    // Get offline payments
    async getOfflinePayments() {
        const cachedPayments = await this.getCachedData('payments');
        if (cachedPayments) {
            return cachedPayments;
        }
        
        return await this.getFromOfflineStorage('payments');
    }

    // Force sync
    async forceSync() {
        if (!this.isOnline) {
            this.showSyncNotification('Impossible de synchroniser hors ligne', 'error');
            return;
        }

        this.showSyncNotification('Synchronisation forcée...', 'info');
        await this.processSyncQueue();
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            queueLength: this.syncQueue.length,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime
        };
    }

    // Clear offline data
    async clearOfflineData() {
        if (confirm('Effacer toutes les données locales ?')) {
            const stores = ['membres', 'events', 'payments', 'syncQueue', 'metadata'];
            
            for (const storeName of stores) {
                const transaction = this.offlineDB.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                await store.clear();
            }
            
            this.syncQueue = [];
            this.showSyncNotification('Données locales effacées', 'success');
        }
    }
}

// Initialize mobile sync manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileSyncManager = new MobileSyncManager();
    });
} else {
    window.mobileSyncManager = new MobileSyncManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileSyncManager;
}