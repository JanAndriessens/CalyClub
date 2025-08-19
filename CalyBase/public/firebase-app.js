// Firebase App initialization for version 8.10.1
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // MOBILE OPTIMIZATION: Use centralized device detection
        const isMobileDevice = window.DeviceUtils?.isMobileDevice || false;
        const checkInterval = window.DeviceUtils?.checkInterval || 100;
        
        if (isMobileDevice) {
            console.log('📱 Firebase App: Mobile device detected - using optimized intervals');
        }

        // Wait for Firebase to be available - MOBILE OPTIMIZED
        await new Promise((resolve) => {
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined') {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, checkInterval);
        });

        // Wait for firebase config to be available - MOBILE OPTIMIZED
        await new Promise((resolve) => {
            const checkConfig = setInterval(() => {
                if (window.firebaseConfig) {
                    clearInterval(checkConfig);
                    resolve();
                }
            }, checkInterval);
        });

        // Initialize Firebase if not already done
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase App initialized');
        }

        // Initialize Firestore if available
        let db = null;
        if (firebase.firestore) {
            try {
                db = firebase.firestore();
                
                // Configure Firestore settings
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                });

                // Try to enable offline persistence, but disable for Safari/iPad
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                const isIPadSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && isSafari;
                
                if (isIPadSafari) {
                    console.log('🍎 Skipping Firestore persistence for iPad Safari (known compatibility issues)');
                } else {
                    try {
                        await db.enablePersistence({
                            synchronizeTabs: true
                        });
                        console.log('✅ Firestore persistence enabled');
                    } catch (persistenceError) {
                        if (persistenceError.code === 'failed-precondition') {
                            console.log('⚠️ Persistence disabled: Multiple tabs open or version conflict');
                            // Clear IndexedDB to resolve version conflicts
                            if ('indexedDB' in window) {
                                try {
                                    const deleteReq = indexedDB.deleteDatabase('firestore');
                                    deleteReq.onsuccess = () => console.log('🗑️ Cleared old Firestore data');
                                    deleteReq.onerror = () => console.log('⚠️ Could not clear old Firestore data');
                                } catch (e) {
                                    console.log('⚠️ IndexedDB cleanup failed:', e);
                                }
                            }
                        } else if (persistenceError.code === 'unimplemented') {
                            console.log('⚠️ Persistence not supported by browser');
                        } else {
                            console.log('⚠️ Persistence error:', persistenceError.message);
                        }
                    }
                }
                
                console.log('✅ Firestore initialized');
            } catch (error) {
                console.error('❌ Firestore initialization failed:', error);
            }
        }

        // Initialize Auth if available
        let auth = null;
        if (firebase.auth) {
            try {
                auth = firebase.auth();
                console.log('✅ Firebase Auth initialized');
            } catch (error) {
                console.error('❌ Auth initialization failed:', error);
            }
        }

        // Initialize Storage if available
        let storage = null;
        if (firebase.storage) {
            try {
                storage = firebase.storage();
                console.log('✅ Firebase Storage initialized');
            } catch (error) {
                console.error('❌ Storage initialization failed:', error);
            }
        }

        // Make Firebase services available globally
        window.db = db;
        window.auth = auth;
        window.storage = storage;
        window.firebase = firebase;

        console.log('🔥 Firebase initialization complete');
        console.log('📊 Available services:', {
            auth: !!auth,
            firestore: !!db,
            storage: !!storage
        });
        
        // Trigger a custom event to notify other scripts
        window.dispatchEvent(new CustomEvent('firebaseInitialized', {
            detail: { auth, db, storage }
        }));
        
    } catch (error) {
        console.error('❌ Error initializing Firebase App:', error);
        
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            background: #ff4444; 
            color: white; 
            padding: 10px; 
            text-align: center; 
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-weight: bold;
        `;
        errorMessage.innerHTML = `
            ⚠️ Erreur de connexion à la base de données<br>
            <small>Veuillez rafraîchir la page ou vider le cache du navigateur</small>
        `;
        document.body.appendChild(errorMessage);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorMessage.parentNode) {
                errorMessage.remove();
            }
        }, 10000);
    }
}); 