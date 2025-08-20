// Firebase configuration for CalyClub - Version 2.0
console.log('🔥 Firebase Config v2.0 Loading...');

async function loadFirebaseConfig() {
    const hostname = window.location.hostname.toLowerCase();
    console.log('🔧 Loading Firebase config for hostname:', hostname);
    
    // Always use production config for caly.club domain
    if (hostname === 'caly.club' || hostname === 'www.caly.club') {
        console.log('✅ Using production Firebase configuration for caly.club');
        
        const config = {
            apiKey: "AIzaSyAJHe5b04puLllWJAlqQz9or-Dz4cvs2gU",
            authDomain: "calyclub-72808.firebaseapp.com",
            projectId: "calyclub-72808",
            storageBucket: "calyclub-72808.firebasestorage.app",
            messagingSenderId: "496335267337",
            appId: "1:496335267337:web:a92d7f2447ced926243ad8",
            measurementId: "G-585K5JBB4J"
        };
        
        // Make Firebase config available globally
        window.firebaseConfig = config;
        window.recaptchaSiteKey = "your-recaptcha-site-key";
        window.oauthConfig = {
            google: { clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com" }
        };
        
        console.log('🔥 Firebase config loaded successfully for caly.club');
        return config;
    }
    
    // For other domains (Vercel, Firebase hosting)
    const isProduction = hostname.includes('vercel.app') || 
                        hostname.includes('calyclub') || 
                        hostname.includes('firebaseapp.com');
    
    if (isProduction) {
        console.log('✅ Using production Firebase configuration for:', hostname);
        
        const config = {
            apiKey: "AIzaSyAJHe5b04puLllWJAlqQz9or-Dz4cvs2gU",
            authDomain: "calyclub-72808.firebaseapp.com",
            projectId: "calyclub-72808",
            storageBucket: "calyclub-72808.firebasestorage.app",
            messagingSenderId: "496335267337",
            appId: "1:496335267337:web:a92d7f2447ced926243ad8",
            measurementId: "G-585K5JBB4J"
        };
        
        window.firebaseConfig = config;
        window.recaptchaSiteKey = "your-recaptcha-site-key";
        window.oauthConfig = {
            google: { clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com" }
        };
        
        return config;
    }
    
    // For local development, try API endpoints
    console.log('🔧 Attempting to load from local development endpoints...');
    
    const endpoints = [
        '/api/config',
        'http://localhost:3001/api/config'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                const config = await response.json();
                console.log(`✅ Firebase configuration loaded from: ${endpoint}`);
                
                window.firebaseConfig = config.firebase;
                window.recaptchaSiteKey = config.recaptcha?.siteKey || "your-recaptcha-site-key";
                window.oauthConfig = config.oauth || {
                    google: { clientId: "108529148364-4jt6ucd02f92jaco7pvcheo0dld2k1fq.apps.googleusercontent.com" }
                };
                
                return config.firebase;
            }
        } catch (error) {
            console.log(`❌ Failed to load config from: ${endpoint}`);
        }
    }
    
    // Final fallback
    console.log('⚠️ Using fallback Firebase configuration');
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

// Load configuration immediately
console.log('🚀 Starting Firebase config promise...');
window.firebaseConfigPromise = loadFirebaseConfig();
console.log('✅ Firebase config promise created');