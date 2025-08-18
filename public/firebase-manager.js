// Centralized Firebase Initialization Manager
// Replaces competing firebase-app.js, index.js Firebase init, and auth-guard.js init

window.FirebaseManager = (function() {
    'use strict';
    
    console.log('🔥 Firebase Manager: Initializing centralized Firebase system...');
    
    let isInitialized = false;
    let isInitializing = false;
    let initPromise = null;
    
    // Firebase services
    let firebaseApp = null;
    let db = null;
    let auth = null;
    let storage = null;
    
    // Initialization callbacks
    const initCallbacks = [];
    
    // Add callback for when Firebase is ready
    function onReady(callback) {
        if (isInitialized) {
            callback({ app: firebaseApp, db, auth, storage });
        } else {
            initCallbacks.push(callback);
        }
    }
    
    // Main initialization function
    async function initialize() {
        if (isInitialized) {
            console.log('🔥 Firebase Manager: Already initialized, returning existing services');
            return { app: firebaseApp, db, auth, storage };
        }
        
        if (isInitializing) {
            console.log('🔥 Firebase Manager: Initialization in progress, waiting...');
            return initPromise;
        }
        
        console.log('🔥 Firebase Manager: Starting Firebase initialization...');
        isInitializing = true;
        
        initPromise = performInitialization();
        
        try {
            const result = await initPromise;
            isInitialized = true;
            isInitializing = false;
            
            // Call all waiting callbacks
            initCallbacks.forEach(callback => {
                try {
                    callback(result);
                } catch (error) {
                    console.error('❌ Firebase Manager: Callback error:', error);
                }
            });
            
            console.log('🔥 Firebase Manager: All initialization callbacks completed');
            return result;
            
        } catch (error) {
            isInitializing = false;
            initPromise = null;
            console.error('❌ Firebase Manager: Initialization failed:', error);
            throw error;
        }
    }
    
    // Core initialization logic
    async function performInitialization() {
        console.log('🔥 Firebase Manager: Step 1 - Waiting for Firebase library...');
        
        // Wait for Firebase library to be available
        await waitForFirebaseLibrary();
        console.log('✅ Firebase Manager: Firebase library loaded');
        
        console.log('🔥 Firebase Manager: Step 2 - Waiting for Firebase config...');
        
        // Wait for Firebase config to be available
        await waitForFirebaseConfig();
        console.log('✅ Firebase Manager: Firebase config loaded');
        
        console.log('🔥 Firebase Manager: Step 3 - Initializing Firebase app...');
        
        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase Manager: Firebase app initialized');
        } else {
            firebaseApp = firebase.apps[0];
            console.log('✅ Firebase Manager: Using existing Firebase app');
        }
        
        console.log('🔥 Firebase Manager: Step 4 - Initializing services...');
        
        // Initialize Firestore
        if (firebase.firestore) {
            try {
                db = firebase.firestore();
                
                // Configure Firestore settings
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                });
                
                console.log('✅ Firebase Manager: Firestore initialized');
            } catch (error) {
                console.error('❌ Firebase Manager: Firestore initialization failed:', error);
            }
        }
        
        // Initialize Auth
        if (firebase.auth) {
            try {
                auth = firebase.auth();
                console.log('✅ Firebase Manager: Auth initialized');
            } catch (error) {
                console.error('❌ Firebase Manager: Auth initialization failed:', error);
            }
        }
        
        // Initialize Storage
        if (firebase.storage) {
            try {
                storage = firebase.storage();
                console.log('✅ Firebase Manager: Storage initialized');
            } catch (error) {
                console.error('❌ Firebase Manager: Storage initialization failed:', error);
            }
        }
        
        // Make services available globally
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.firebase = firebase;
        
        console.log('🔥 Firebase Manager: Step 5 - Services ready');
        console.log('🔥 Firebase Manager: Available services:', {
            app: !!firebaseApp,
            auth: !!auth,
            firestore: !!db,
            storage: !!storage
        });
        
        // Dispatch global event
        window.dispatchEvent(new CustomEvent('firebaseReady', {
            detail: { app: firebaseApp, db, auth, storage }
        }));
        
        console.log('🔥 Firebase Manager: Initialization complete!');
        
        return { app: firebaseApp, db, auth, storage };
    }
    
    // Wait for Firebase library to load
    function waitForFirebaseLibrary() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 20 seconds
            
            const checkFirebase = () => {
                attempts++;
                
                if (typeof firebase !== 'undefined') {
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error(`Firebase library not available after ${maxAttempts} attempts`));
                    return;
                }
                
                setTimeout(checkFirebase, 200);
            };
            
            checkFirebase();
        });
    }
    
    // Wait for Firebase config to load
    function waitForFirebaseConfig() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 10 seconds
            
            const checkConfig = () => {
                attempts++;
                
                if (window.firebaseConfig) {
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error(`Firebase config not available after ${maxAttempts} attempts`));
                    return;
                }
                
                setTimeout(checkConfig, 200);
            };
            
            checkConfig();
        });
    }
    
    // Public API
    return {
        initialize,
        onReady,
        get isInitialized() { return isInitialized; },
        get isInitializing() { return isInitializing; },
        get services() { 
            return { 
                app: firebaseApp, 
                db, 
                auth, 
                storage 
            }; 
        }
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.FirebaseManager.initialize();
    } catch (error) {
        console.error('❌ Firebase Manager: Auto-initialization failed:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; 
            background: #ff4444; color: white; padding: 15px; 
            text-align: center; z-index: 10000; font-weight: bold;
        `;
        errorDiv.innerHTML = `
            ⚠️ Erreur de connexion Firebase<br>
            <small>${error.message}</small>
        `;
        document.body.appendChild(errorDiv);
    }
});

console.log('🔥 Firebase Manager: Module loaded and ready');