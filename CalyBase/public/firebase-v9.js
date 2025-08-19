// Modern Firebase v9+ modular SDK configuration with tree-shaking
// Import only the Firebase services you need

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// Wait for configuration to be loaded
let firebaseConfig;
try {
    firebaseConfig = await window.firebaseConfigPromise;
} catch (error) {
    DebugLogger.error('Failed to load Firebase configuration:', error);
    throw error;
}

// Initialize Firebase with the loaded configuration
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with tree-shaking
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in development
if (window.location.hostname === 'localhost') {
    try {
        // Only connect to emulators if they're not already connected
        if (!auth._delegate?._config?.emulator) {
            connectAuthEmulator(auth, 'http://localhost:9099');
            DebugLogger.log('🔧 Connected to Auth emulator');
        }
        
        if (!db._delegate?._databaseId?.database) {
            connectFirestoreEmulator(db, 'localhost', 8080);
            DebugLogger.log('🔧 Connected to Firestore emulator');
        }
        
        if (!storage._delegate?._host?.includes('localhost')) {
            connectStorageEmulator(storage, 'localhost', 9199);
            DebugLogger.log('🔧 Connected to Storage emulator');
        }
    } catch (error) {
        DebugLogger.warn('Emulator connection failed (may already be connected):', error.message);
    }
}

// Export for global use (maintaining backward compatibility)
window.firebase = {
    app,
    auth,
    db,
    storage,
    // Legacy compatibility methods
    initializeApp: () => app,
    auth: () => auth,
    firestore: () => db,
    storage: () => storage
};

// Also export individual services for modern usage
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

// Notification that Firebase is ready
window.dispatchEvent(new CustomEvent('firebaseReady', { 
    detail: { auth, db, storage, app } 
}));

DebugLogger.log('🔥 Firebase v9+ modular SDK initialized successfully');

export { app, auth, db, storage };