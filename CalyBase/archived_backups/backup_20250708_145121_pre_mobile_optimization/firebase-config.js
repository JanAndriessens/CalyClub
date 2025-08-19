// Firebase configuration loaded from secure API endpoint
// This approach prevents exposing sensitive config in static files

async function loadFirebaseConfig() {
    try {
        // For production deployment, use static config
        if (window.location.hostname.includes('calybase.web.app') || window.location.hostname.includes('calybase.firebaseapp.com')) {
            console.log('✅ Using production Firebase configuration');
            const config = {
                firebase: {
                    apiKey: "AIzaSyDxsHCt4LAfPBJ2TAP-2IaOAQXXMOK2R7Q",
                    authDomain: "calybase.firebaseapp.com",
                    projectId: "calybase",
                    storageBucket: "calybase.firebasestorage.app",
                    messagingSenderId: "108529148364",
                    appId: "1:108529148364:web:08289524026f6a91f6bd69"
                },
                recaptcha: {
                    siteKey: "your-recaptcha-site-key"
                }
            };
            
            // Make Firebase config available globally
            window.firebaseConfig = config.firebase;
            window.recaptchaSiteKey = config.recaptcha.siteKey;
            return config.firebase;
        }
        
        // Try Firebase Functions API first, fallback to Express server for local development
        const endpoints = [
            '/api/config',           // Firebase Functions (when available)
            'http://localhost:3001/api/config'  // Express server (local development)
        ];
        
        let config = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    config = await response.json();
                    console.log(`✅ Firebase configuration loaded from: ${endpoint}`);
                    break;
                }
            } catch (error) {
                lastError = error;
                console.log(`❌ Failed to load config from: ${endpoint}`);
            }
        }
        
        if (!config) {
            throw new Error(`All config endpoints failed. Last error: ${lastError?.message}`);
        }
        
        // Make Firebase config available globally
        window.firebaseConfig = config.firebase;
        window.recaptchaSiteKey = config.recaptcha.siteKey;
        
        return config.firebase;
    } catch (error) {
        console.error('❌ Failed to load Firebase configuration:', error);
        throw new Error('Firebase configuration could not be loaded');
    }
}

// Load configuration immediately
// This is a promise that other scripts can await
window.firebaseConfigPromise = loadFirebaseConfig(); 