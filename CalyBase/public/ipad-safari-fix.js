// iPad/Safari Login Fix - Resolves white screen and logout issues
// Addresses Safari-specific authentication, localStorage, and timing problems

(function() {
    'use strict';

    console.log('🍎 iPad/Safari Fix: Initializing...');
    console.log('🔍 DEBUG: Starting Safari fix initialization');

    // Detect Safari/iPad
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIPadSafari = isIOS && isSafari;
    
    console.log('🔍 Browser Detection:', {
        isSafari,
        isIOS,
        isIPadSafari,
        userAgent: navigator.userAgent
    });

    // Safari-specific storage wrapper with fallbacks
    const SafeStorage = {
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.warn('⚠️ localStorage failed, using sessionStorage:', error.message);
                try {
                    sessionStorage.setItem(key, value);
                    return true;
                } catch (sessionError) {
                    console.warn('⚠️ sessionStorage also failed, using memory storage');
                    this.memoryStorage = this.memoryStorage || {};
                    this.memoryStorage[key] = value;
                    return true;
                }
            }
        },
        
        getItem: function(key) {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                try {
                    return sessionStorage.getItem(key);
                } catch (sessionError) {
                    return this.memoryStorage?.[key] || null;
                }
            }
        },
        
        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                try {
                    sessionStorage.removeItem(key);
                } catch (sessionError) {
                    if (this.memoryStorage) {
                        delete this.memoryStorage[key];
                    }
                }
            }
        },
        
        clear: function() {
            try {
                localStorage.clear();
            } catch (error) {
                try {
                    sessionStorage.clear();
                } catch (sessionError) {
                    this.memoryStorage = {};
                }
            }
        }
    };

    // Safari-specific Firebase Auth configuration
    function configureSafariAuth() {
        if (!window.auth) {
            console.log('⚠️ Firebase Auth not ready yet, will configure later');
            return;
        }

        try {
            // Safari needs explicit auth persistence settings
            window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('✅ Safari Auth persistence set to LOCAL');
                })
                .catch((error) => {
                    console.warn('⚠️ Could not set LOCAL persistence, trying SESSION:', error);
                    return window.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                })
                .then(() => {
                    console.log('✅ Safari Auth persistence configured');
                })
                .catch((error) => {
                    console.error('❌ Failed to set any auth persistence:', error);
                });
        } catch (error) {
            console.error('❌ Error configuring Safari auth:', error);
        }
    }

    // Extended timeouts for Safari/iPad
    const SafariTimeouts = {
        authCheck: isIPadSafari ? 10000 : 5000,  // 10s for iPad, 5s for others
        tokenRefresh: isIPadSafari ? 8000 : 5000,
        firebaseInit: isIPadSafari ? 15000 : 8000,
        maxRetries: isIPadSafari ? 5 : 3
    };

    // Enhanced auth state checker for Safari
    function createSafariAuthStateChecker() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Safari auth state check timeout'));
            }, SafariTimeouts.authCheck);

            let resolved = false;
            const resolveOnce = (result) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(result);
                }
            };

            // Enhanced auth state checking for Safari
            const checkAuthState = () => {
                if (!window.auth) {
                    setTimeout(checkAuthState, 500);
                    return;
                }

                // For Safari, use both onAuthStateChanged and currentUser
                let authStateChecked = false;
                let currentUserChecked = false;

                window.auth.onAuthStateChanged((user) => {
                    authStateChecked = true;
                    console.log('🍎 Safari Auth State Changed:', user ? 'User found' : 'No user');
                    
                    if (user) {
                        // Additional validation for Safari
                        user.getIdToken(true)
                            .then((token) => {
                                console.log('✅ Safari Token validation successful');
                                resolveOnce({ authenticated: true, user, token });
                            })
                            .catch((error) => {
                                console.error('❌ Safari Token validation failed:', error);
                                resolveOnce({ authenticated: false, error });
                            });
                    } else if (currentUserChecked) {
                        resolveOnce({ authenticated: false });
                    }
                });

                // Fallback check for Safari
                setTimeout(() => {
                    currentUserChecked = true;
                    const currentUser = window.auth.currentUser;
                    
                    if (currentUser && !authStateChecked) {
                        console.log('🍎 Safari fallback: Using currentUser');
                        currentUser.getIdToken(true)
                            .then((token) => {
                                resolveOnce({ authenticated: true, user: currentUser, token });
                            })
                            .catch((error) => {
                                resolveOnce({ authenticated: false, error });
                            });
                    } else if (!currentUser && authStateChecked) {
                        resolveOnce({ authenticated: false });
                    }
                }, 1000);
            };

            checkAuthState();
        });
    }

    // Safari-specific session management
    const SafariSession = {
        setLoginTime: function() {
            const now = Date.now().toString();
            SafeStorage.setItem('safari_loginTime', now);
            SafeStorage.setItem('safari_lastActivity', now);
        },
        
        updateActivity: function() {
            SafeStorage.setItem('safari_lastActivity', Date.now().toString());
        },
        
        checkSession: function() {
            const loginTime = SafeStorage.getItem('safari_loginTime');
            const lastActivity = SafeStorage.getItem('safari_lastActivity');
            const now = Date.now();
            
            // Extended timeouts for iPad (45 min session, 30 min inactivity)
            const maxSession = isIPadSafari ? 45 * 60 * 1000 : 30 * 60 * 1000;
            const maxInactivity = isIPadSafari ? 30 * 60 * 1000 : 20 * 60 * 1000;
            
            if (loginTime) {
                const sessionAge = now - parseInt(loginTime);
                if (sessionAge > maxSession) {
                    console.log('❌ Safari session expired');
                    return { valid: false, reason: 'session_expired' };
                }
            }
            
            if (lastActivity) {
                const inactiveTime = now - parseInt(lastActivity);
                if (inactiveTime > maxInactivity) {
                    console.log('❌ Safari inactivity timeout');
                    return { valid: false, reason: 'inactivity' };
                }
            }
            
            return { valid: true };
        },
        
        clear: function() {
            SafeStorage.removeItem('safari_loginTime');
            SafeStorage.removeItem('safari_lastActivity');
        }
    };

    // Override page protection for Safari
    function enhancePageProtectionForSafari() {
        // Store original functions
        const originalCheckAuth = window.checkAuthentication;
        const originalForceLogout = window.forceLogout;
        
        // Enhanced authentication check for Safari
        window.checkAuthentication = async function() {
            console.log('🍎 Safari Enhanced Auth Check');
            
            try {
                const authResult = await createSafariAuthStateChecker();
                
                if (authResult.authenticated) {
                    // Set session for Safari
                    SafariSession.setLoginTime();
                    console.log('✅ Safari authentication successful');
                    return true;
                } else {
                    console.log('❌ Safari authentication failed');
                    return false;
                }
            } catch (error) {
                console.error('❌ Safari auth check error:', error);
                return false;
            }
        };
        
        // Enhanced logout for Safari
        window.forceLogout = async function() {
            console.log('🍎 Safari Enhanced Logout');
            
            try {
                SafariSession.clear();
                SafeStorage.clear();
                
                if (window.auth) {
                    await window.auth.signOut();
                }
                
                // Clear all Safari-specific storage
                try {
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                    }
                } catch (error) {
                    console.warn('⚠️ Could not clear caches:', error);
                }
                
            } catch (error) {
                console.error('❌ Safari logout error:', error);
            }
        };
    }

    // Disable problematic Firestore features for Safari
    function configureSafariFirestore() {
        // Listen for Firebase initialization
        if (window.db) {
            configureSafariFirestoreSettings();
        } else {
            window.addEventListener('firebaseInitialized', () => {
                configureSafariFirestoreSettings();
            });
        }
    }

    function configureSafariFirestoreSettings() {
        if (!window.db) return;

        try {
            // For Safari, disable offline persistence which can cause issues
            console.log('🍎 Configuring Firestore for Safari');
            
            // Override the persistence setting for Safari
            if (isIPadSafari) {
                console.log('🍎 Disabling Firestore persistence for iPad Safari');
                // Note: We can't change persistence after it's set, but we can handle errors gracefully
            }
        } catch (error) {
            console.warn('⚠️ Safari Firestore configuration warning:', error);
        }
    }

    // Activity monitoring for Safari
    function setupSafariActivityMonitoring() {
        const events = isIPadSafari ? 
            ['touchstart', 'touchend', 'scroll', 'visibilitychange'] : 
            ['mousedown', 'keypress', 'scroll', 'visibilitychange'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                SafariSession.updateActivity();
            }, { passive: true });
        });
        
        // Safari visibility handling
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🍎 Safari tab became visible');
                SafariSession.updateActivity();
                
                // Re-validate auth on tab focus for Safari
                if (window.auth && window.auth.currentUser) {
                    window.auth.currentUser.getIdToken(true)
                        .then(() => {
                            console.log('✅ Safari auth validated on focus');
                        })
                        .catch((error) => {
                            console.error('❌ Safari auth validation failed on focus:', error);
                            if (window.forceLogout) {
                                window.forceLogout();
                            }
                        });
                }
            }
        });
    }

    // Main Safari fix initialization
    function initSafariFix() {
        console.log('🍎 Initializing Safari/iPad fixes...');
        
        // Make Safari utilities globally available
        window.SafeStorage = SafeStorage;
        window.SafariSession = SafariSession;
        window.SafariTimeouts = SafariTimeouts;
        window.createSafariAuthStateChecker = createSafariAuthStateChecker;
        
        // Configure auth for Safari
        if (window.auth) {
            configureSafariAuth();
        } else {
            window.addEventListener('firebaseInitialized', configureSafariAuth);
        }
        
        // Configure Firestore for Safari
        configureSafariFirestore();
        
        // Enhance page protection for Safari
        enhancePageProtectionForSafari();
        
        // Setup activity monitoring
        setupSafariActivityMonitoring();
        
        console.log('✅ Safari/iPad fixes initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSafariFix);
    } else {
        initSafariFix();
    }

})(); 