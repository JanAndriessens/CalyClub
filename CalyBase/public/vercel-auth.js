// VERCEL-COMPATIBLE AUTHENTICATION
// Simple client-side authentication that doesn't rely on server sessions

console.log('🔧 Vercel Auth: Initializing client-side authentication...');

// Ensure we wait for DOM to be completely ready
function waitForDOM() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });
}

// Ensure Firebase is loaded
function waitForFirebase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const checkFirebase = () => {
            attempts++;
            if (window.firebase && window.firebaseConfig && typeof window.firebase.auth === 'function') {
                console.log('✅ Firebase ready after', attempts, 'attempts');
                resolve();
            } else if (attempts > 100) { // 10 seconds timeout
                console.log('⏰ Firebase timeout after 10 seconds');
                resolve(); // Continue anyway
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Simple Firebase Auth check without complex session management
window.vercelAuth = {
    async checkAuth() {
        return new Promise((resolve) => {
            // Wait for Firebase to initialize
            const waitForFirebase = () => {
                if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                    console.log('✅ Firebase Auth ready for Vercel check');
                    
                    // Simple auth state check
                    window.auth.onAuthStateChanged((user) => {
                        if (user) {
                            console.log('✅ User authenticated in Vercel environment:', user.email);
                            // Set simple client-side session markers
                            localStorage.setItem('vercel_auth_user', user.email);
                            localStorage.setItem('vercel_auth_time', Date.now());
                            resolve({ authenticated: true, user });
                        } else {
                            console.log('❌ No authenticated user in Vercel environment');
                            localStorage.removeItem('vercel_auth_user');
                            localStorage.removeItem('vercel_auth_time');
                            resolve({ authenticated: false });
                        }
                    });
                } else {
                    console.log('⏳ Waiting for Firebase Auth...');
                    setTimeout(waitForFirebase, 100);
                }
            };
            
            waitForFirebase();
            
            // Timeout after 10 seconds
            setTimeout(() => {
                console.log('⏰ Auth check timeout in Vercel environment');
                resolve({ authenticated: false, timeout: true });
            }, 10000);
        });
    },
    
    redirectToLogin() {
        console.log('🔄 Redirecting to login (Vercel mode)');
        window.location.href = '/login.html?security=vercel_auth_required';
    },
    
    allowAccess() {
        console.log('✅ Access granted (Vercel mode)');
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        
        // Remove any security overlay
        const overlay = document.getElementById('securityOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

// Auto-run protection for protected pages
const protectedPages = [
    '/',
    '/index.html',
    '/membres.html',
    '/membre-detail.html',
    '/events.html',
    '/event-detail.html',
    '/avatars.html',
    '/user-management.html',
    '/system-settings.html'
];

const currentPath = window.location.pathname;
const isProtectedPage = protectedPages.some(page => 
    currentPath.endsWith(page) || currentPath === page || 
    (page === '/' && (currentPath === '/' || currentPath === '/index.html'))
);

if (isProtectedPage) {
    console.log('🛡️ Protected page detected (Vercel mode)');
    
    // Hide content immediately
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';
    
    // Initialize protection once everything is ready
    async function initializeProtection() {
        try {
            console.log('⏳ Waiting for DOM and Firebase...');
            
            // Wait for both DOM and Firebase to be ready
            await Promise.all([waitForDOM(), waitForFirebase()]);
            
            console.log('✅ DOM and Firebase ready, creating overlay...');
            
            // Create loading overlay
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
                justify-content: center;
                align-items: center;
                z-index: 999999;
                color: white;
                font-family: Arial, sans-serif;
            `;
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 20px;">🔐 CalyBase</div>
                    <div style="opacity: 0.8;">Vérification de l'authentification...</div>
                </div>
            `;
            
            // Safely add to DOM
            if (document.body) {
                document.body.appendChild(overlay);
                console.log('✅ Overlay added to DOM');
            }
            
            // Check authentication
            console.log('🔍 Starting authentication check...');
            const result = await window.vercelAuth.checkAuth();
            
            if (result.authenticated) {
                console.log('✅ Authentication successful');
                window.vercelAuth.allowAccess();
            } else {
                console.log('❌ Authentication failed, redirecting to login');
                window.vercelAuth.redirectToLogin();
            }
            
        } catch (error) {
            console.error('❌ Protection initialization error:', error);
            // On error, redirect to login as fallback
            window.location.href = '/login.html?security=vercel_auth_error';
        }
    }
    
    // Start initialization
    initializeProtection();
}