// Comprehensive logout utility that clears ALL Firebase storage
// Including IndexedDB databases that cause login conflicts

window.comprehensiveLogout = async function() {
    console.log('🔓 Starting comprehensive logout...');
    
    try {
        // Step 1: Clear Safari-specific session data FIRST
        if (window.SafariSession) {
            window.SafariSession.clear();
            console.log('✅ Safari session data cleared');
        }
        
        if (window.SafeStorage) {
            window.SafeStorage.clear();
            console.log('✅ SafeStorage cleared');
        }
        
        // Step 2: Sign out from Firebase
        if (window.auth) {
            await window.auth.signOut();
            console.log('✅ Firebase signout successful');
        }
        
        // Step 3: Clear regular browser storage
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ localStorage and sessionStorage cleared');
        
        // Step 4: Clear Firebase IndexedDB databases (CRITICAL FOR PREVENTING CONFLICTS)
        if ('indexedDB' in window) {
            const firebaseDBs = [
                'firestore',
                'firebase-heartbeat-database', 
                'firebase-installations-database'
            ];
            
            for (const dbName of firebaseDBs) {
                try {
                    const deleteReq = indexedDB.deleteDatabase(dbName);
                    await new Promise((resolve) => {
                        deleteReq.onsuccess = () => {
                            console.log(`✅ Cleared IndexedDB: ${dbName}`);
                            resolve();
                        };
                        deleteReq.onerror = () => {
                            console.log(`⚠️ Could not clear IndexedDB: ${dbName}`);
                            resolve(); // Don't fail on individual DB errors
                        };
                        deleteReq.onblocked = () => {
                            console.log(`⚠️ IndexedDB deletion blocked: ${dbName} (continuing...)`);
                            resolve();
                        };
                    });
                } catch (error) {
                    console.log(`⚠️ Error clearing ${dbName}:`, error);
                }
            }
            console.log('✅ Firebase IndexedDB databases cleared');
        }
        
        // Step 5: Enhanced iPad Safari detection and cache clearing
        const userAgent = navigator.userAgent;
        const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const hasTouchEvents = 'ontouchstart' in window;
        const maxTouchPoints = navigator.maxTouchPoints || 0;
        const hasOrientationAPI = 'orientation' in window;
        const isLikelyIPad = (
            maxTouchPoints > 1 && 
            hasTouchEvents && 
            isSafari && 
            (isIOS || userAgent.includes('Macintosh')) &&
            hasOrientationAPI
        );
        const isIPadSafari = isIOS || isLikelyIPad;
        
        console.log(`🔍 Device detection: Safari=${isSafari}, iPad=${isIPadSafari}`);
        
        // Step 6: Clear Service Worker caches (especially important for Safari)
        if ('caches' in window && (isSafari || isIPadSafari)) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ Service Worker caches cleared');
            } catch (error) {
                console.warn('⚠️ Could not clear Service Worker caches:', error);
            }
        }
        
        console.log('🎉 Comprehensive logout complete!');
        return true;
        
    } catch (error) {
        console.error('❌ Comprehensive logout error:', error);
        throw error;
    }
};

// Make available globally
console.log('🔧 Comprehensive logout utility loaded');
console.log('💡 Usage: await window.comprehensiveLogout()'); 