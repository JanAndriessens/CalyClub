// CRITICAL: Enhanced Page Protection System - Prevents unauthorized access to sensitive data
// This script runs FIRST to immediately protect the page content with robust authentication checks

// IMMEDIATE TEST: Log as soon as script starts parsing
console.log('🚨 PAGE PROTECTION: SCRIPT LOADING TEST - If you see this, the script is loading!');
console.log('🛡️ Enhanced Page Protection: Script loaded and initializing...');
console.log('🔍 Enhanced Page Protection: Current URL =', window.location.href);

console.log('🛡️ Enhanced Page Protection: Initializing security check...');

// CRITICAL: Make global security functions available immediately
// These functions must be available even if security checks are still running
console.log('🔧 Enhanced Page Protection: Setting up global security functions...');

// Global emergency logout function (always available)
window.emergencyLogout = async function() {
    console.log('🚨 Emergency logout triggered');
    localStorage.clear();
    sessionStorage.clear();
    if (window.auth) {
        try {
            await window.auth.signOut();
        } catch (error) {
            console.log('Warning: Error during auth signout:', error);
        }
    }
    window.location.href = '/login.html?security=emergency_logout';
};

// Global session status check function (always available)
window.checkSessionStatus = function() {
    const loginTime = localStorage.getItem('loginTime');
    const lastActivity = localStorage.getItem('lastActivity');
    const now = Date.now();
    
    console.log('📊 Session Status Report:');
    console.log(`🔧 System Configuration:`);
    if (window.SECURITY_CONFIG) {
        console.log(`   - Session timeout: ${Math.floor(window.SECURITY_CONFIG.maxSessionDuration / (60 * 1000))} minutes`);
        console.log(`   - Inactivity timeout: ${Math.floor(window.SECURITY_CONFIG.inactivityTimeout / (60 * 1000))} minutes`);
        console.log(`   - Token validation interval: ${Math.floor(window.SECURITY_CONFIG.tokenValidationInterval / (60 * 1000))} minutes`);
    } else {
        console.log('   - SECURITY_CONFIG not yet loaded');
    }
    
    if (loginTime) {
        const sessionAge = now - parseInt(loginTime);
        const sessionHours = Math.floor(sessionAge / (60 * 60 * 1000));
        const sessionMinutes = Math.floor((sessionAge % (60 * 60 * 1000)) / (60 * 1000));
        
        console.log(`⏱️ Session Age: ${sessionHours}h ${sessionMinutes}m`);
        
        if (window.SECURITY_CONFIG) {
            const remainingTime = window.SECURITY_CONFIG.maxSessionDuration - sessionAge;
            const remainingMinutes = Math.floor(remainingTime / (60 * 1000));
            console.log(`⏱️ Time Remaining: ${Math.max(0, remainingMinutes)} minutes`);
        }
    }
    
    if (lastActivity) {
        const inactiveTime = now - parseInt(lastActivity);
        const inactiveMinutes = Math.floor(inactiveTime / (60 * 1000));
        
        console.log(`💤 Inactive for: ${inactiveMinutes} minutes`);
        
        if (window.SECURITY_CONFIG) {
            const remainingInactivity = window.SECURITY_CONFIG.inactivityTimeout - inactiveTime;
            const remainingInactivityMinutes = Math.floor(remainingInactivity / (60 * 1000));
            console.log(`💤 Inactivity remaining: ${Math.max(0, remainingInactivityMinutes)} minutes`);
        }
    }
    
    // Also show current system config value for comparison
    if (window.systemConfig?.initialized) {
        const configuredTimeout = window.systemConfig.get('security.sessionTimeoutMinutes');
        console.log(`🎛️ Current system setting: ${configuredTimeout} minutes`);
    } else {
        console.log(`🎛️ System config not yet initialized`);
    }
};

console.log('✅ Enhanced Page Protection: Global security functions ready');

// Dynamic Security Configuration (reads from system settings)
let SECURITY_CONFIG = {
    // Default fallback values (will be overridden by system config)
    maxSessionDuration: 10 * 60 * 1000, // 10 minutes default (CHANGED FROM 30)
    inactivityTimeout: 10 * 60 * 1000, // 10 minutes default (CHANGED FROM 30)
    tokenValidationInterval: 5 * 60 * 1000, // Check token every 5 minutes
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

// Expose security config immediately for debugging
window.SECURITY_CONFIG = SECURITY_CONFIG;
console.log('✅ Enhanced Page Protection: SECURITY_CONFIG exposed globally');

// Function to load security configuration from system settings
async function loadSecurityConfig() {
    try {
        console.log('🔧 Loading security configuration from system settings...');
        
        // Wait for system config to be available - INCREASED TIMEOUT
        let attempts = 0;
        while (!window.systemConfig?.initialized && attempts < 300) { // CHANGED: 30 seconds instead of 10
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.systemConfig?.initialized) {
            // Read configured session timeout
            const sessionTimeoutMinutes = window.systemConfig.get('security.sessionTimeoutMinutes');
            const warningTimeoutMinutes = window.systemConfig.get('security.warningTimeoutMinutes');
            
            console.log(`🔍 Raw config value: sessionTimeoutMinutes = ${sessionTimeoutMinutes}`);
            
            if (sessionTimeoutMinutes && sessionTimeoutMinutes > 0) {
                // Update security config with system values
                SECURITY_CONFIG.maxSessionDuration = sessionTimeoutMinutes * 60 * 1000; // Convert to milliseconds
                SECURITY_CONFIG.inactivityTimeout = sessionTimeoutMinutes * 60 * 1000; // Use same value for inactivity
                
                // Update the global reference
                window.SECURITY_CONFIG = SECURITY_CONFIG;
                
                console.log(`✅ Security config loaded: Session timeout = ${sessionTimeoutMinutes} minutes`);
                console.log(`✅ Security config loaded: Inactivity timeout = ${sessionTimeoutMinutes} minutes`);
                console.log(`✅ Security config loaded: Max session duration = ${SECURITY_CONFIG.maxSessionDuration} ms`);
            } else {
                console.warn(`⚠️ Invalid session timeout value: ${sessionTimeoutMinutes}, using default`);
            }
        } else {
            console.error('❌ CRITICAL: System configuration not available after 30 seconds, using default values');
            console.error('❌ This means your 10-minute timeout setting is NOT being applied!');
        }
        
    } catch (error) {
        console.error('❌ CRITICAL: Error loading security configuration, using defaults:', error);
    }
}

// Check if current page is protected
const currentPath = window.location.pathname;
console.log(`🔍 Enhanced Page Protection: Current path = "${currentPath}"`);
console.log(`🔍 Enhanced Page Protection: Checking against protected pages:`, SECURITY_CONFIG.protectedPages);

const isProtectedPage = SECURITY_CONFIG.protectedPages.some(page => {
    const isMatch = currentPath.endsWith(page) || currentPath === page || 
                   (page === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
                   (page === '/index.html' && currentPath === '/');
    console.log(`🔍 Checking "${currentPath}" against "${page}" = ${isMatch}`);
    return isMatch;
});

console.log(`🔍 Enhanced Page Protection: Is protected page = ${isProtectedPage}`);

if (isProtectedPage) {
    console.log('🛡️ Enhanced Page Protection: Protected page detected, securing content...');
    
    // IMMEDIATELY hide all page content
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';
    
    // Add loading overlay with enhanced messaging
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
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <h2 style="margin: 0 0 10px 0;">🛡️ Vérification de Sécurité Renforcée</h2>
            <p style="margin: 0; opacity: 0.9;">Validation de votre authentification...</p>
            <p style="margin: 10px 0 0 0; opacity: 0.7; font-size: 12px;">Vérification des tokens et des sessions</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Insert overlay immediately
    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(overlay);
        });
    }

    // Enhanced authentication check function with token validation
    async function checkAuthentication() {
        return new Promise((resolve) => {
            let authCheckAttempts = 0;
            const maxAttempts = window.location.hostname.includes('localhost') ? 50 : 100;
            
            const checkAuth = async () => {
                authCheckAttempts++;
                
                // Check if Firebase auth is available and initialized
                if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                    console.log('🛡️ Enhanced Page Protection: Firebase Auth found, performing comprehensive check...');
                    
                    window.auth.onAuthStateChanged(async (user) => {
                        if (user) {
                            console.log('🛡️ Enhanced Page Protection: User object found, validating token...');
                            
                            try {
                                // 1. CRITICAL: Force token refresh to verify it's still valid
                                console.log('🔍 Enhanced Page Protection: Validating authentication token...');
                                const freshToken = await user.getIdToken(true); // Force refresh
                                if (!freshToken) {
                                    console.log('❌ Enhanced Page Protection: Token refresh failed - forcing logout');
                                    await forceLogout();
                                    resolve(false);
                                    return;
                                }
                                
                                // 2. Check session duration (with fresh login detection)
                                const now = Date.now();
                                const loginTime = localStorage.getItem('loginTime');
                                const lastActivity = localStorage.getItem('lastActivity');
                                
                                // ⚡ FIX: Detect fresh logins and reset timing
                                if (loginTime) {
                                    const sessionDuration = now - parseInt(loginTime);
                                    const timeSinceLastActivity = lastActivity ? (now - parseInt(lastActivity)) : 0;
                                    
                                    // If session duration > max BUT no recent activity, this might be a fresh login
                                    if (sessionDuration > SECURITY_CONFIG.maxSessionDuration) {
                                        // If there's been no activity for a long time, this is likely a fresh login
                                        if (timeSinceLastActivity > (30 * 60 * 1000)) { // 30 minutes of inactivity = fresh login
                                            console.log('🔄 Enhanced Page Protection: Detected fresh login after long inactivity, resetting session timing');
                                            localStorage.setItem('loginTime', now.toString());
                                            localStorage.setItem('lastActivity', now.toString());
                                        } else {
                                            const timeoutMinutes = Math.floor(SECURITY_CONFIG.maxSessionDuration / (60 * 1000));
                                            console.log(`❌ Enhanced Page Protection: Session exceeded maximum duration (${timeoutMinutes} minutes)`);
                                            await forceLogout();
                                            resolve(false);
                                            return;
                                        }
                                    }
                                }
                                
                                // 3. Check inactivity timeout
                                if (lastActivity) {
                                    const inactivityDuration = now - parseInt(lastActivity);
                                    if (inactivityDuration > SECURITY_CONFIG.inactivityTimeout) {
                                        const timeoutMinutes = Math.floor(SECURITY_CONFIG.inactivityTimeout / (60 * 1000));
                                        console.log(`❌ Enhanced Page Protection: Session expired due to inactivity (${timeoutMinutes} minutes)`);
                                        await forceLogout();
                                        resolve(false);
                                        return;
                                    }
                                }
                                
                                // 4. Verify user still exists and is active in Firestore
                                if (window.db) {
                                    try {
                                        console.log('🔍 Enhanced Page Protection: Verifying user status in Firestore...');
                                        const userDoc = await window.db.collection('users').doc(user.uid).get();
                                        if (!userDoc.exists) {
                                            console.log('❌ Enhanced Page Protection: User document not found in Firestore');
                                            await forceLogout();
                                            resolve(false);
                                            return;
                                        }
                                        
                                        const userData = userDoc.data();
                                        if (userData.status !== 'active') {
                                            console.log(`⏳ Enhanced Page Protection: User account status is "${userData.status}" - redirecting to login for proper message`);
                                            // Clear session data but don't show "session expired" - redirect to login for proper status message
                                            localStorage.removeItem('lastActivity');
                                            localStorage.removeItem('loginTime');
                                            if (window.auth) {
                                                await window.auth.signOut();
                                            }
                                            // Redirect to login without the confusing "session expired" parameters
                                            window.location.href = '/login.html';
                                            resolve(false);
                                            return;
                                        }
                                    } catch (firestoreError) {
                                        console.warn('⚠️ Enhanced Page Protection: Could not verify user in Firestore:', firestoreError);
                                        // Continue for now, but log the issue
                                    }
                                }
                                
                                // All security checks passed
                                console.log('✅ Enhanced Page Protection: All authentication checks passed');
                                
                                // ⚡ FIX: Always reset loginTime for fresh sessions to prevent re-login issues
                                const currentLoginTime = localStorage.getItem('loginTime');
                                if (!currentLoginTime || (now - parseInt(currentLoginTime)) > (5 * 60 * 1000)) {
                                    // Reset loginTime if it doesn't exist OR if it's older than 5 minutes (likely a new session)
                                    console.log('🔄 Enhanced Page Protection: Setting fresh loginTime for new session');
                                    localStorage.setItem('loginTime', now.toString());
                                }
                                
                                // Update activity tracking
                                localStorage.setItem('lastActivity', now.toString());
                                
                                resolve(true);
                                
                            } catch (tokenError) {
                                console.log('❌ Enhanced Page Protection: Token validation failed:', tokenError);
                                await forceLogout();
                                resolve(false);
                            }
                        } else {
                            console.log('❌ Enhanced Page Protection: No user authenticated');
                            resolve(false);
                        }
                    });
                } else if (authCheckAttempts < maxAttempts) {
                    // Firebase not ready yet, try again
                    setTimeout(checkAuth, 100);
                } else {
                    // Timeout - assume not authenticated for security
                    console.log('❌ Enhanced Page Protection: Authentication check timeout - denying access');
                    resolve(false);
                }
            };
            
            checkAuth();
        });
    }

    // Force logout function with comprehensive cleanup
    async function forceLogout() {
        console.log('🚪 Enhanced Page Protection: Forcing secure logout...');
        
        try {
            // ⚡ ENHANCED: More thorough session cleanup
            console.log('🗑️ Enhanced Page Protection: Clearing all session data...');
            
            // Clear specific session tracking items first
            localStorage.removeItem('lastActivity');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userPermissions');
            
            // Clear all local storage and session storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Sign out from Firebase
            if (window.auth) {
                await window.auth.signOut();
                console.log('🔓 Enhanced Page Protection: Firebase logout complete');
            }
            
            // Clear browser caches if possible
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('🗑️ Enhanced Page Protection: Cleared browser caches');
                } catch (cacheError) {
                    console.warn('⚠️ Enhanced Page Protection: Could not clear caches:', cacheError);
                }
            }
            
            // ⚡ ENHANCED: Clear any remaining Firebase state
            if (window.db) {
                try {
                    await window.db.disableNetwork();
                    await window.db.enableNetwork();
                    console.log('🔄 Enhanced Page Protection: Reset Firebase network state');
                } catch (fbError) {
                    console.warn('⚠️ Enhanced Page Protection: Could not reset Firebase state:', fbError);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Enhanced Page Protection: Error during forced logout:', error);
        }
    }
    
    // Redirect to login with security message
    function redirectToLogin() {
        console.log('🛡️ Enhanced Page Protection: Redirecting to login with security notice...');
        
        // Final cleanup
        localStorage.clear();
        sessionStorage.clear();
        
        // Add security alert parameters
        const params = new URLSearchParams();
        params.set('security', 'session_expired');
        params.set('reason', 'enhanced_protection');
        params.set('return', currentPath);
        
        window.location.href = `/login.html?${params.toString()}`;
    }
    
    // Allow access to protected content and setup monitoring
    function allowAccess() {
        console.log('🛡️ Enhanced Page Protection: Access granted - showing content');
        
        // Show page content immediately for better performance
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'opacity 0.2s ease'; // Faster transition
        
        // Remove security overlay quickly
        const overlay = document.getElementById('securityOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease'; // Faster removal
            setTimeout(() => overlay.remove(), 200); // Shorter delay
        }
        
        // Set up continuous security monitoring
        setupContinuousMonitoring();
    }

    // Setup continuous authentication monitoring
    function setupContinuousMonitoring() {
        console.log('🔍 Enhanced Page Protection: Setting up continuous security monitoring...');
        
        // Periodic token validation
        setInterval(async () => {
            if (window.auth && window.auth.currentUser) {
                try {
                    console.log('🔍 Continuous monitoring: Validating token...');
                    await window.auth.currentUser.getIdToken(true); // Force refresh
                    localStorage.setItem('lastActivity', Date.now().toString());
                } catch (error) {
                    console.log('❌ Continuous monitoring: Token validation failed, redirecting to login');
                    redirectToLogin();
                }
            } else {
                console.log('❌ Continuous monitoring: No user found, redirecting to login');
                redirectToLogin();
            }
        }, SECURITY_CONFIG.tokenValidationInterval);
        
        // Track user activity for inactivity timeout
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        // Listen for user activity events
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Check for inactivity timeout every minute
        setInterval(() => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const inactivityDuration = Date.now() - parseInt(lastActivity);
                if (inactivityDuration > SECURITY_CONFIG.inactivityTimeout) {
                    const timeoutMinutes = Math.floor(SECURITY_CONFIG.inactivityTimeout / (60 * 1000));
                    console.log(`❌ Continuous monitoring: Inactivity timeout reached (${timeoutMinutes} minutes)`);
                    redirectToLogin();
                }
            }
        }, 60000); // Check every minute
        
        // Check session duration every 5 minutes
        setInterval(() => {
            const loginTime = localStorage.getItem('loginTime');
            if (loginTime) {
                const sessionDuration = Date.now() - parseInt(loginTime);
                if (sessionDuration > SECURITY_CONFIG.maxSessionDuration) {
                    const timeoutMinutes = Math.floor(SECURITY_CONFIG.maxSessionDuration / (60 * 1000));
                    console.log(`❌ Continuous monitoring: Maximum session duration reached (${timeoutMinutes} minutes)`);
                    redirectToLogin();
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    
    // Main security check with enhanced error handling
    async function performSecurityCheck() {
        // 🛡️ BYPASS PROTECTION FOR DIAGNOSTIC PAGE
        const currentPath = window.location.pathname;
        if (currentPath.includes('debug-florence-account.html') || 
            window.DIAGNOSTIC_MODE || 
            localStorage.getItem('diagnosticMode') === 'true') {
            console.log('🔧 Enhanced Page Protection: DIAGNOSTIC MODE - Bypassing protection');
            allowAccess();
            return;
        }
        
        try {
            console.log('🛡️ Enhanced Page Protection: Starting comprehensive security check...');
            
            // 1. Wait for Firebase to initialize with timeout
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const checkFirebase = () => {
                    if (typeof firebase !== 'undefined' && (window.firebaseConfig || window.firebaseConfigPromise)) {
                        console.log('✅ Enhanced Page Protection: Firebase detected');
                        resolve();
                    } else if (attempts < 30) { // 3 second timeout
                        attempts++;
                        setTimeout(checkFirebase, 100);
                    } else {
                        // Firebase failed to load - security risk, deny access
                        console.error('❌ Enhanced Page Protection: Firebase failed to load within timeout');
                        reject(new Error('Firebase initialization timeout'));
                    }
                };
                checkFirebase();
            });
            
            // 2. Load security configuration from system settings
            await loadSecurityConfig();
            
            // 3. Perform enhanced authentication check
            const isAuthenticated = await checkAuthentication();
            
            if (isAuthenticated) {
                console.log('✅ Enhanced Page Protection: User authenticated - granting access');
                allowAccess();
            } else {
                console.log('❌ Enhanced Page Protection: Authentication failed - redirecting to login');
                redirectToLogin();
            }
            
        } catch (error) {
            console.error('❌ Enhanced Page Protection: Security check failed:', error);
            redirectToLogin();
        }
    }
    
    // Start security check immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', performSecurityCheck);
    } else {
        performSecurityCheck();
    }
    
} else {
    console.log('🛡️ Enhanced Page Protection: Public page - no protection needed');
} 