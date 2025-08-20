// Firebase configuration loaded from secure API endpoint
// This approach prevents exposing sensitive config in static files

async function loadFirebaseConfig() {
    try {
        const hostname = window.location.hostname.toLowerCase();
        console.log('🔧 Loading Firebase config for hostname:', hostname);
        
        // For production deployment, use static config
        const isProduction = hostname.includes('caly.club') ||
                            hostname.includes('calyclub') || 
                            hostname.includes('vercel.app'); // Covers all deployments
        
        console.log('🔍 Domain check:', { hostname, isProduction, includes_caly: hostname.includes('caly.club') });
        
        if (isProduction) {
            console.log('✅ Using production Firebase configuration for:', hostname);
            const config = {
                firebase: {
                    apiKey: "AIzaSyAJHe5b04puLllWJAlqQz9or-Dz4cvs2gU",
                    authDomain: "calyclub-72808.firebaseapp.com",
                    projectId: "calyclub-72808",
                    storageBucket: "calyclub-72808.firebasestorage.app",
                    messagingSenderId: "496335267337",
                    appId: "1:496335267337:web:a92d7f2447ced926243ad8",
                    measurementId: "G-585K5JBB4J"
                },
                oauth: {
                    google: {
                        clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com"
                    }
                },
                recaptcha: {
                    siteKey: "your-recaptcha-site-key"
                }
            };
            
            // Make Firebase config available globally
            window.firebaseConfig = config.firebase;
            window.recaptchaSiteKey = config.recaptcha.siteKey;
            window.oauthConfig = config.oauth;
            
            console.log('🔥 Firebase config loaded successfully:', config.firebase.projectId);
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
        window.oauthConfig = config.oauth || {
            google: { clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com" }
        };
        
        return config.firebase;
    } catch (error) {
        console.error('❌ Failed to load Firebase configuration:', error);
        
        // Emergency fallback configuration for caly.club
        console.log('⚠️ Using emergency fallback Firebase configuration');
        const fallbackConfig = {
            apiKey: "AIzaSyAJHe5b04puLllWJAlqQz9or-Dz4cvs2gU",
            authDomain: "calyclub-72808.firebaseapp.com",
            projectId: "calyclub-72808",
            storageBucket: "calyclub-72808.firebasestorage.app",
            messagingSenderId: "496335267337",
            appId: "1:496335267337:web:a92d7f2447ced926243ad8",
            measurementId: "G-585K5JBB4J"
        };
        
        window.firebaseConfig = fallbackConfig;
        window.recaptchaSiteKey = "your-recaptcha-site-key";
        window.oauthConfig = {
            google: { clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com" }
        };
        
        return fallbackConfig;
    }
}

// Load configuration immediately
// This is a promise that other scripts can await
window.firebaseConfigPromise = loadFirebaseConfig(); 