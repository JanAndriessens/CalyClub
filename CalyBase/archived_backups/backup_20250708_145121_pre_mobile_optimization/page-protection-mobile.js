// LIGHTWEIGHT Mobile-Optimized Page Protection System
// Optimized for iPad Safari and mobile devices - Reduced timers and resource usage

console.log('📱 Mobile Page Protection: Lightweight loading...');

// Global emergency logout (simplified)
window.emergencyLogout = async function() {
    console.log('🚨 Emergency logout');
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

// Simplified security config - reduced monitoring frequency for mobile
let SECURITY_CONFIG = {
    maxSessionDuration: 10 * 60 * 1000, // 10 minutes
    inactivityTimeout: 10 * 60 * 1000, // 10 minutes  
    tokenValidationInterval: 10 * 60 * 1000, // Check every 10 minutes instead of 5 (REDUCED for mobile)
    protectedPages: [
        '/', '/index.html', '/membres.html', '/membre-detail.html', 
        '/events.html', '/event-detail.html', '/avatars.html', 
        '/user-management.html', '/system-settings.html'
    ]
};

window.SECURITY_CONFIG = SECURITY_CONFIG;

// Lightweight config loading - reduced timeout attempts
async function loadSecurityConfig() {
    try {
        console.log('📱 Loading mobile security config...');
        
        // Reduced attempts for mobile - 10 seconds instead of 30
        let attempts = 0;
        while (!window.systemConfig?.initialized && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.systemConfig?.initialized) {
            const sessionTimeoutMinutes = window.systemConfig.get('security.sessionTimeoutMinutes');
            
            if (sessionTimeoutMinutes && sessionTimeoutMinutes > 0) {
                SECURITY_CONFIG.maxSessionDuration = sessionTimeoutMinutes * 60 * 1000;
                SECURITY_CONFIG.inactivityTimeout = sessionTimeoutMinutes * 60 * 1000;
                window.SECURITY_CONFIG = SECURITY_CONFIG;
                console.log(`📱 Mobile config loaded: ${sessionTimeoutMinutes} minutes`);
            }
        } else {
            console.warn('📱 Mobile: Using default config after timeout');
        }
        
    } catch (error) {
        console.error('📱 Mobile config error:', error);
    }
}

// Check if current page needs protection
const currentPath = window.location.pathname;
const isProtectedPage = SECURITY_CONFIG.protectedPages.some(page => {
    return currentPath.endsWith(page) || currentPath === page || 
           (page === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
           (page === '/index.html' && currentPath === '/');
});

if (isProtectedPage) {
    console.log('📱 Mobile: Protected page, securing...');
    
    // Lightweight loading overlay - reduced animations for mobile performance
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';
    
    const overlay = document.createElement('div');
    overlay.id = 'mobileSecurityOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #667eea;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: mobileSpin 1.5s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">
                Chargement sécurisé...
            </div>
            <div style="font-size: 14px; opacity: 0.8;">
                Vérification mobile optimisée
            </div>
        </div>
        <style>
            @keyframes mobileSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(overlay);
    
    // Mobile-optimized authentication check
    async function checkMobileAuthentication() {
        try {
            console.log('📱 Mobile: Starting auth check...');
            
            // Simplified auth check with faster timeout
            const authPromise = new Promise((resolve) => {
                let authChecked = false;
                
                const checkAuth = async () => {
                    if (authChecked) return;
                    
                    try {
                        console.log('📱 Mobile: Checking Firebase auth...');
                        
                        if (!window.firebase?.auth) {
                            console.log('📱 Mobile: Waiting for Firebase...');
                            return;
                        }
                        
                        const user = window.firebase.auth().currentUser;
                        const loginTime = localStorage.getItem('loginTime');
                        
                        if (!user || !loginTime) {
                            console.log('📱 Mobile: No user/login time - redirecting');
                            authChecked = true;
                            resolve({ authenticated: false, reason: 'no_auth' });
                            return;
                        }
                        
                        // Mobile-optimized session check (less frequent)
                        const now = Date.now();
                        const sessionAge = now - parseInt(loginTime);
                        
                        if (sessionAge > SECURITY_CONFIG.maxSessionDuration) {
                            console.log('📱 Mobile: Session expired');
                            authChecked = true;
                            resolve({ authenticated: false, reason: 'session_expired' });
                            return;
                        }
                        
                        console.log('📱 Mobile: Auth check passed');
                        authChecked = true;
                        resolve({ authenticated: true });
                        
                    } catch (error) {
                        console.error('📱 Mobile: Auth check error:', error);
                        if (!authChecked) {
                            authChecked = true;
                            resolve({ authenticated: false, reason: 'error' });
                        }
                    }
                };
                
                // Check immediately and then every 2 seconds (instead of every 500ms)
                checkAuth();
                const interval = setInterval(checkAuth, 2000);
                
                // Mobile timeout - 15 seconds instead of 30
                setTimeout(() => {
                    if (!authChecked) {
                        clearInterval(interval);
                        authChecked = true;
                        console.log('📱 Mobile: Auth timeout - allowing access');
                        resolve({ authenticated: true, reason: 'timeout_allow' });
                    }
                }, 15000);
            });
            
            const result = await authPromise;
            
            if (result.authenticated) {
                allowMobileAccess();
            } else {
                forceLogout(result.reason);
            }
            
        } catch (error) {
            console.error('📱 Mobile: Critical auth error:', error);
            allowMobileAccess(); // Fail-safe for mobile
        }
    }
    
    // Lightweight logout function
    async function forceLogout(reason = 'security') {
        console.log(`📱 Mobile: Force logout - ${reason}`);
        
        try {
            localStorage.clear();
            sessionStorage.clear();
            
            if (window.firebase?.auth) {
                await window.firebase.auth().signOut();
            }
        } catch (error) {
            console.log('📱 Mobile: Logout cleanup error:', error);
        }
        
        window.location.href = `/login.html?security=${reason}`;
    }
    
    // Allow access and clean up
    function allowMobileAccess() {
        console.log('📱 Mobile: Access granted');
        
        // Update activity timestamp
        localStorage.setItem('lastActivity', Date.now().toString());
        
        // Remove overlay and show content
        const overlay = document.getElementById('mobileSecurityOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        
        // Setup lightweight monitoring for mobile
        setupMobileMonitoring();
        
        console.log('📱 Mobile: Page protection complete');
    }
    
    // Reduced monitoring frequency for mobile performance
    function setupMobileMonitoring() {
        console.log('📱 Mobile: Setting up lightweight monitoring...');
        
        // REDUCED frequency: Check every 2 minutes instead of every 30 seconds
        setInterval(async () => {
            try {
                const user = window.firebase?.auth()?.currentUser;
                const loginTime = localStorage.getItem('loginTime');
                
                if (!user || !loginTime) {
                    console.log('📱 Mobile: Session lost during monitoring');
                    await forceLogout('session_lost');
                    return;
                }
                
                const sessionAge = Date.now() - parseInt(loginTime);
                if (sessionAge > SECURITY_CONFIG.maxSessionDuration) {
                    console.log('📱 Mobile: Session expired during monitoring');
                    await forceLogout('session_expired');
                }
                
            } catch (error) {
                console.error('📱 Mobile: Monitoring error:', error);
            }
        }, 2 * 60 * 1000); // 2 minutes instead of 30 seconds
        
        // Lightweight activity tracking
        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        
        // Reduced event listeners for mobile performance
        ['click', 'scroll', 'keydown'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        console.log('📱 Mobile: Lightweight monitoring active');
    }
    
    // Start the mobile-optimized security check
    setTimeout(async () => {
        await loadSecurityConfig();
        await checkMobileAuthentication();
    }, 100);
    
} else {
    console.log('📱 Mobile: Public page, no protection needed');
} 