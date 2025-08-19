// UNIFIED PAGE PROTECTION SYSTEM - Optimized for all devices
// Simplified, fast, and reliable authentication for desktop, mobile, and tablets

console.log('🛡️ Unified Page Protection: Initializing...');

// Device detection for optimization (use global device info from index.html)
const isMobileProtection = window.deviceInfo?.isMobile || /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Enhanced iPad detection for newer Safari versions that spoof desktop user agent
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const hasTouchEvents = 'ontouchstart' in window;
const maxTouchPoints = navigator.maxTouchPoints || 0;
const hasOrientationAPI = 'orientation' in window;
const isLikelyIPad = (
    maxTouchPoints > 1 && 
    hasTouchEvents && 
    isSafari && 
    (isIOS || navigator.userAgent.includes('Macintosh')) &&
    hasOrientationAPI
);

const isIPadSafari = isIOS || isLikelyIPad;

console.log(`📱 Device type: ${isMobileProtection ? 'Mobile/Tablet' : 'Desktop'}, Safari: ${isSafari}, iPad Safari: ${isIPadSafari}`);
console.log(`🔍 Enhanced iPad detection: iOS=${isIOS}, Touch=${hasTouchEvents}, TouchPoints=${maxTouchPoints}, Orientation=${hasOrientationAPI}, LikelyIPad=${isLikelyIPad}`);

// Safari-enhanced Security Configuration
const SECURITY_CONFIG = {
    // Safari-specific extended timeouts for better compatibility
    maxSessionDuration: isIPadSafari ? 45 * 60 * 1000 : 30 * 60 * 1000, // 45min for iPad, 30min others
    inactivityTimeout: isIPadSafari ? 30 * 60 * 1000 : 20 * 60 * 1000, // 30min for iPad, 20min others
    authTimeout: 30000, // 30s timeout for Vercel compatibility
    maxAuthAttempts: isIPadSafari ? 75 : 40, // Even more attempts for slower Safari
    protectedPages: [
        '/',
        '/index.html',
        '/membres.html',
        '/membre-detail.html',
        '/events.html',
        '/event-detail.html',
        '/avatars.html',
        '/user-management.html',
        '/system-settings.html'
    ]
};

console.log(`🔧 Security config: Auth timeout ${SECURITY_CONFIG.authTimeout}ms, Max session ${SECURITY_CONFIG.maxSessionDuration/60000}min`);

// Global security functions
window.emergencyLogout = async function() {
    console.log('🚨 Emergency logout triggered');
    localStorage.clear();
    sessionStorage.clear();
    if (window.auth) {
        try {
            await window.auth.signOut();
        } catch (error) {
            console.log('Warning: Auth signout error:', error);
        }
    }
    window.location.href = '/login.html?security=emergency_logout';
};

// Check if current page needs protection
const currentPath = window.location.pathname;
const isProtectedPage = SECURITY_CONFIG.protectedPages.some(page => 
    currentPath.endsWith(page) || currentPath === page || 
    (page === '/' && (currentPath === '/' || currentPath === '/index.html'))
);

console.log(`🔍 Current path: ${currentPath}, Protected: ${isProtectedPage}`);

if (isProtectedPage) {
    console.log('🛡️ Protected page detected, securing content...');
    
    // Hide content immediately
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';
    
    // Simple loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'securityOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <h2 style="margin: 0 0 10px 0; font-size: 18px;">🔐 Vérification</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Authentification en cours...</p>
            ${isIPadSafari ? '<p style="margin: 5px 0 0 0; opacity: 0.7; font-size: 12px;">🍎 Mode iPad optimisé</p>' : ''}
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Add overlay
    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(overlay);
        });
    }

    // Safari-enhanced authentication check
    async function checkAuthentication() {
        console.log('🔍 Starting Safari-enhanced authentication check...');
        
        // EMERGENCY BYPASS: If we have very recent login activity, skip complex checks
        // Enhanced to work for Safari (both iPad and desktop) since auth state loss affects both
        if (isSafari) {
            const storage = window.SafeStorage || localStorage;
            const loginTime = storage.getItem('loginTime') || storage.getItem('safari_loginTime');
            
            console.log('🔍 EMERGENCY BYPASS CHECK:', {
                isSafari,
                isIPadSafari,
                storageType: storage === window.SafeStorage ? 'SafeStorage' : 'localStorage',
                loginTime: loginTime,
                loginTimeReadable: loginTime ? new Date(parseInt(loginTime)).toLocaleString() : 'null'
            });
            
            if (loginTime) {
                const loginAge = Date.now() - parseInt(loginTime);
                const bypassWindow = isIPadSafari ? 3 * 60 * 1000 : 2 * 60 * 1000; // 3min for iPad, 2min for Safari
                console.log(`🔍 Login age: ${loginAge / 1000} seconds, bypass window: ${bypassWindow / 1000} seconds`);
                
                if (loginAge < bypassWindow) {
                    console.log('🚀 EMERGENCY BYPASS: Recent login detected, skipping complex auth checks');
                    console.log(`Login age: ${loginAge / 1000} seconds (bypass window: ${bypassWindow / 1000}s)`);
                    console.log(`Device: ${isIPadSafari ? 'iPad Safari' : 'Safari'}`);
                    return true;
                } else {
                    console.log(`⚠️ Login too old for emergency bypass: ${loginAge / 1000}s > ${bypassWindow / 1000}s`);
                }
            } else {
                console.log('❌ EMERGENCY BYPASS: No login time found in storage');
                console.log('🔍 Checking all storage locations for debug...');
                console.log('localStorage loginTime:', localStorage.getItem('loginTime'));
                console.log('localStorage safari_loginTime:', localStorage.getItem('safari_loginTime'));
                if (window.SafeStorage) {
                    console.log('SafeStorage loginTime:', window.SafeStorage.getItem('loginTime'));
                    console.log('SafeStorage safari_loginTime:', window.SafeStorage.getItem('safari_loginTime'));
                }
            }
        }
        
        // Use Safari-enhanced auth checker if available
        if (window.SafariSession && isIPadSafari) {
            console.log('🍎 Using Safari enhanced authentication for iPad');
            try {
                const safariResult = await performSafariAuthCheck();
                console.log('🍎 Safari auth check completed:', safariResult);
                if (safariResult) {
                    return true; // Safari auth successful
                } else {
                    console.log('🍎 Safari auth returned false, trying standard method...');
                    // Don't return false yet, try standard method
                }
            } catch (error) {
                console.error('❌ Safari auth check failed, falling back to standard:', error);
                console.error('Error details:', error.message);
                // Fall through to standard check
            }
        }
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = SECURITY_CONFIG.maxAuthAttempts;
            const authTimeout = SECURITY_CONFIG.authTimeout;
            
            console.log(`⏰ Auth timeout: ${authTimeout}ms, Max attempts: ${maxAttempts}`);
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                console.log('❌ Authentication timeout reached');
                resolve(false);
            }, authTimeout);
            
            const checkAuth = async () => {
                attempts++;
                
                // Check if Firebase auth is ready
                if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                    console.log('✅ Firebase Auth ready');
                    clearTimeout(timeoutId);
                    
                    // Use enhanced auth state listening for Safari
                    let authResolved = false;
                    const resolveOnce = (result) => {
                        if (!authResolved) {
                            authResolved = true;
                            resolve(result);
                        }
                    };
                    
                    window.auth.onAuthStateChanged(async (user) => {
                        if (user) {
                            console.log('✅ User authenticated:', user.email);
                            
                            try {
                                // Enhanced token validation for Safari
                                console.log('🔍 Validating user token...');
                                await user.getIdToken(true);
                                console.log('✅ Token validation successful');
                                
                                // Use Safari-safe storage
                                const storage = window.SafeStorage || localStorage;
                                const now = Date.now();
                                let loginTime = storage.getItem('loginTime');
                                let lastActivity = storage.getItem('lastActivity');
                                
                                console.log('🔍 Current session data:', {
                                    loginTime,
                                    lastActivity,
                                    now,
                                    storageType: storage === window.SafeStorage ? 'SafeStorage' : 'localStorage'
                                });
                                
                                // For Safari, also check Safari-specific session data
                                if (window.SafariSession && (!loginTime || !lastActivity)) {
                                    const safariLogin = storage.getItem('safari_loginTime');
                                    const safariActivity = storage.getItem('safari_lastActivity');
                                    if (safariLogin) loginTime = safariLogin;
                                    if (safariActivity) lastActivity = safariActivity;
                                    console.log('🍎 Using Safari-specific session data as fallback:', {
                                        safariLogin,
                                        safariActivity
                                    });
                                }
                                
                                // Set login time if not exists (Vercel compatibility)
                                if (!loginTime) {
                                    loginTime = now;
                                    storage.setItem('loginTime', loginTime);
                                    console.log('🔧 Set initial login time for Vercel environment');
                                }
                                if (!lastActivity) {
                                    lastActivity = now;
                                    storage.setItem('lastActivity', lastActivity);
                                    console.log('🔧 Set initial activity time for Vercel environment');
                                }
                                
                                // Continue with existing session validation
                                if (!loginTime) {
                                    console.log('🔍 No login time found, setting new session...');
                                    storage.setItem('loginTime', now.toString());
                                    if (window.SafariSession) {
                                        window.SafariSession.setLoginTime();
                                    }
                                    console.log('✅ New session time set');
                                }
                                
                                // Check session timeout with Safari-aware limits
                                if (loginTime) {
                                    const sessionAge = now - parseInt(loginTime);
                                    console.log('🔍 Session age check:', {
                                        sessionAge: sessionAge / 1000 / 60 + ' minutes',
                                        maxAllowed: SECURITY_CONFIG.maxSessionDuration / 1000 / 60 + ' minutes'
                                    });
                                    
                                    if (sessionAge > SECURITY_CONFIG.maxSessionDuration) {
                                        console.log('❌ Session expired');
                                        await forceLogout();
                                        resolveOnce(false);
                                        return;
                                    }
                                }
                                
                                // Check inactivity with Safari-aware limits
                                if (lastActivity) {
                                    const inactiveTime = now - parseInt(lastActivity);
                                    console.log('🔍 Inactivity check:', {
                                        inactiveTime: inactiveTime / 1000 / 60 + ' minutes',
                                        maxAllowed: SECURITY_CONFIG.inactivityTimeout / 1000 / 60 + ' minutes'
                                    });
                                    
                                    if (inactiveTime > SECURITY_CONFIG.inactivityTimeout) {
                                        console.log('❌ Inactivity timeout');
                                        await forceLogout();
                                        resolveOnce(false);
                                        return;
                                    }
                                }
                                
                                // Update activity using Safari-safe storage
                                console.log('🔍 Updating last activity...');
                                if (window.SafeStorage) {
                                    window.SafeStorage.setItem('lastActivity', now.toString());
                                    if (window.SafariSession) {
                                        window.SafariSession.updateActivity();
                                    }
                                    console.log('✅ Activity updated via SafeStorage');
                                } else {
                                    localStorage.setItem('lastActivity', now.toString());
                                    console.log('✅ Activity updated via localStorage');
                                }
                                
                                console.log('✅ Authentication successful - granting access');
                                resolveOnce(true);
                                
                            } catch (error) {
                                console.log('❌ Token validation failed:', error);
                                console.error('Token error details:', error.message, error.code);
                                await forceLogout();
                                resolveOnce(false);
                            }
                        } else {
                            console.log('❌ No user authenticated');
                            
                            // Safari debugging: check if there's session data but no user
                            if (window.SafeStorage && isIPadSafari) {
                                const safariLogin = window.SafeStorage.getItem('safari_loginTime');
                                const regularLogin = window.SafeStorage.getItem('loginTime');
                                console.log('🔍 Checking for conflicting session data:', {
                                    safariLogin: !!safariLogin,
                                    regularLogin: !!regularLogin,
                                    currentTime: Date.now(),
                                    attempts
                                });
                                
                                if (safariLogin || regularLogin) {
                                    console.log('⚠️ Safari debug: Found session data but no auth user - potential conflict');
                                    
                                    // Wait a bit longer for Safari auth state to stabilize
                                    if (attempts < 5) {
                                        console.log(`🍎 Waiting for Safari auth state to stabilize... (attempt ${attempts}/5)`);
                                        setTimeout(() => checkAuth(), 1000);
                                        return;
                                    } else {
                                        console.log('❌ Safari auth state never stabilized, clearing conflicting data');
                                        // Clear the conflicting session data
                                        if (window.SafeStorage) {
                                            window.SafeStorage.removeItem('safari_loginTime');
                                            window.SafeStorage.removeItem('loginTime');
                                        }
                                    }
                                }
                            }
                            
                            console.log('❌ Final result: No authenticated user found');
                            resolveOnce(false);
                        }
                    });
                } else if (attempts < maxAttempts) {
                    // Firebase not ready, wait longer for Safari
                    const waitTime = isIPadSafari ? 200 : 100;
                    setTimeout(checkAuth, waitTime);
                } else {
                    console.log('❌ Authentication timeout - Firebase not ready');
                    clearTimeout(timeoutId);
                    resolve(false);
                }
            };
            
            checkAuth();
        });
    }

    // Safari-specific auth check using enhanced checker
    async function performSafariAuthCheck() {
        console.log('🍎 Performing Safari-specific auth check');
        
        if (window.createSafariAuthStateChecker) {
            try {
                console.log('🍎 Calling Safari auth state checker...');
                const result = await window.createSafariAuthStateChecker();
                console.log('🍎 Safari auth checker result:', result);
                
                if (result && result.authenticated) {
                    // Set session for Safari
                    if (window.SafariSession) {
                        window.SafariSession.setLoginTime();
                        console.log('🍎 Safari session time set');
                    }
                    console.log('✅ Safari enhanced authentication successful');
                    return true;
                } else {
                    console.log('❌ Safari enhanced authentication failed:', result);
                    return false;
                }
            } catch (error) {
                console.error('❌ Safari enhanced auth check error:', error);
                console.error('Error details:', error.message, error.stack);
                throw error;
            }
        } else {
            const errorMsg = 'Safari enhanced auth checker not available';
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
    }

    // Force logout with cleanup
    async function forceLogout() {
        console.log('🚪 FORCE LOGOUT: Clearing all session data...');
        console.log('🔍 Force logout called from:', new Error().stack);
        
        try {
            // Clear Safari-specific storage first
            if (window.SafariSession) {
                window.SafariSession.clear();
                console.log('✅ Force logout: Safari session cleared');
            }
            
            if (window.SafeStorage) {
                window.SafeStorage.clear();
                console.log('✅ Force logout: SafeStorage cleared');
            }
            
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Force logout: localStorage and sessionStorage cleared');
            
            if (window.auth) {
                await window.auth.signOut();
                console.log('✅ Force logout: Firebase signout complete');
            }
            
            // Safari-specific cleanup
            if (isIPadSafari) {
                try {
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                        console.log('✅ Force logout: Safari caches cleared');
                    }
                } catch (error) {
                    console.warn('⚠️ Could not clear Safari caches:', error);
                }
            }
        } catch (error) {
            console.log('Warning: Logout error:', error);
        }
    }

    // Redirect to login
    function redirectToLogin() {
        console.log('🔄 Redirecting to login...');
        
        // CRITICAL FIX: Don't clear session data on redirect!
        // Session data should only be cleared on explicit logout
        // Clearing here prevents emergency bypass from working
        
        console.log('⚠️ Auth check failed - redirecting but preserving session data for emergency bypass');
        window.location.href = '/login.html?security=session_expired';
    }

    // Allow access to content
    function allowAccess() {
        console.log('✅ Access granted - showing content');
        
        // Show content with smooth transition
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'opacity 0.3s ease';
        
        // Remove overlay
        const overlay = document.getElementById('securityOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
        
        // Setup simple monitoring
        setupMonitoring();
    }

    // Safari-enhanced monitoring system
    function setupMonitoring() {
        console.log('🔍 Setting up Safari-enhanced monitoring...');
        
        // Safari-optimized intervals based on device type
        const tokenCheckInterval = isIPadSafari ? 15 * 60 * 1000 : (isMobileProtection ? 10 * 60 * 1000 : 5 * 60 * 1000); // 15min iPad, 10min mobile, 5min desktop
        const activityCheckInterval = isIPadSafari ? 8 * 60 * 1000 : (isMobileProtection ? 5 * 60 * 1000 : 2 * 60 * 1000); // 8min iPad, 5min mobile, 2min desktop
        
        console.log(`⏰ Monitoring intervals - Token check: ${tokenCheckInterval/60000}min, Activity check: ${activityCheckInterval/60000}min`);
        
        // Periodic token validation
        setInterval(async () => {
            if (window.auth && window.auth.currentUser) {
                try {
                    await window.auth.currentUser.getIdToken(true);
                    
                    // Use Safari-safe storage for activity tracking
                    const storage = window.SafeStorage || localStorage;
                    storage.setItem('lastActivity', Date.now().toString());
                    
                    if (window.SafariSession) {
                        window.SafariSession.updateActivity();
                    }
                } catch (error) {
                    console.log('❌ Token validation failed in monitoring');
                    redirectToLogin();
                }
            } else {
                console.log('❌ No user in monitoring');
                redirectToLogin();
            }
        }, tokenCheckInterval);
        
        // Activity tracking with Safari-safe storage
        const updateActivity = () => {
            const storage = window.SafeStorage || localStorage;
            storage.setItem('lastActivity', Date.now().toString());
            
            if (window.SafariSession) {
                window.SafariSession.updateActivity();
            }
        };
        
        // Safari-optimized event listeners
        const events = isIPadSafari ? 
            ['touchstart', 'touchend', 'scroll', 'visibilitychange'] : 
            (isMobileProtection ? ['touchstart', 'click', 'scroll'] : ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']);
        
        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Safari visibility handling
        if (isIPadSafari) {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    console.log('🍎 Safari tab became visible - re-validating auth');
                    updateActivity();
                    
                    // Re-validate auth on tab focus for Safari
                    if (window.auth && window.auth.currentUser) {
                        window.auth.currentUser.getIdToken(true)
                            .then(() => {
                                console.log('✅ Safari auth validated on focus');
                            })
                            .catch((error) => {
                                console.error('❌ Safari auth validation failed on focus:', error);
                                redirectToLogin();
                            });
                    }
                }
            });
        }
        
        // Inactivity check with Safari-safe storage
        setInterval(() => {
            const storage = window.SafeStorage || localStorage;
            const lastActivity = storage.getItem('lastActivity');
            
            // Also check Safari-specific activity data
            let finalActivity = lastActivity;
            if (window.SafeStorage && !lastActivity) {
                const safariActivity = window.SafeStorage.getItem('safari_lastActivity');
                if (safariActivity) finalActivity = safariActivity;
            }
            
            if (finalActivity) {
                const inactiveTime = Date.now() - parseInt(finalActivity);
                if (inactiveTime > SECURITY_CONFIG.inactivityTimeout) {
                    console.log('❌ Inactivity timeout in monitoring');
                    redirectToLogin();
                }
            }
        }, activityCheckInterval);
        
        console.log(`✅ Monitoring active (${isIPadSafari ? 'iPad Safari' : (isMobileProtection ? 'mobile' : 'desktop')} optimized)`);
    }

    // Main Safari-enhanced security check
    async function performSecurityCheck() {
        try {
            console.log('🛡️ Starting Safari-enhanced security check...');
            
            // CRITICAL: Wait for Safari fixes to be ready FIRST (especially for iPad Safari)
            if (isIPadSafari) {
                console.log('🍎 iPad Safari detected - waiting for Safari fixes...');
                let safariFixAttempts = 0;
                const maxSafariAttempts = 50; // 5 seconds max
                
                while ((!window.SafeStorage || !window.SafariSession || !window.createSafariAuthStateChecker) && safariFixAttempts < maxSafariAttempts) {
                    console.log(`🍎 Waiting for Safari fixes... attempt ${safariFixAttempts + 1}/${maxSafariAttempts}`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    safariFixAttempts++;
                }
                
                if (window.SafeStorage && window.SafariSession && window.createSafariAuthStateChecker) {
                    console.log('✅ Safari fixes ready after', safariFixAttempts, 'attempts');
                } else {
                    console.warn('⚠️ Safari fixes not fully loaded after', safariFixAttempts, 'attempts - proceeding anyway');
                }
            }
            
            // Safari debugging info
            console.log('🔍 Security check browser info:', {
                isSafari,
                isIPadSafari,
                safariFixLoaded: !!window.SafeStorage,
                safariSessionLoaded: !!window.SafariSession,
                createSafariAuthStateChecker: !!window.createSafariAuthStateChecker,
                authTimeout: SECURITY_CONFIG.authTimeout,
                maxSessionDuration: SECURITY_CONFIG.maxSessionDuration / 60000 + ' minutes'
            });
            
            // Wait for Firebase with Safari-extended timeout
            let firebaseReady = false;
            let attempts = 0;
            const maxFirebaseAttempts = isIPadSafari ? 50 : 30; // 5 seconds for iPad, 3 seconds for others
            const firebaseWaitTime = isIPadSafari ? 100 : 100;
            
            console.log(`⏰ Waiting for Firebase - max ${maxFirebaseAttempts} attempts (${maxFirebaseAttempts * firebaseWaitTime}ms)`);
            
            while (!firebaseReady && attempts < maxFirebaseAttempts) {
                if (typeof firebase !== 'undefined' && window.firebaseConfig) {
                    firebaseReady = true;
                } else {
                    await new Promise(resolve => setTimeout(resolve, firebaseWaitTime));
                    attempts++;
                }
            }
            
            if (!firebaseReady) {
                console.error('❌ Firebase failed to load after', attempts, 'attempts');
                redirectToLogin();
                return;
            }
            
            console.log('✅ Firebase ready after', attempts, 'attempts');
            
            // Perform authentication check
            const isAuthenticated = await checkAuthentication();
            
            if (isAuthenticated) {
                allowAccess();
            } else {
                console.log('❌ Authentication failed, redirecting to login');
                redirectToLogin();
            }
            
        } catch (error) {
            console.error('❌ Security check failed:', error);
            redirectToLogin();
        }
    }

    // Start security check
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', performSecurityCheck);
    } else {
        performSecurityCheck();
    }
    
} else {
    console.log('🛡️ Public page - no protection needed');
} 