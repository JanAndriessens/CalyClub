// Import Firebase configuration
import './firebase-config.js';
// Import debug utilities
import './debug-utils.js';

// Function to display error messages
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

// Function to hide error messages
function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Check if we're on the login page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            DebugLogger.log('Connexion réussie:', userCredential.user);
            
            // CRITICAL: Store session data for emergency bypass
            const now = Date.now().toString();
            
            // Store in regular localStorage (for emergency bypass)
            localStorage.setItem('loginTime', now);
            localStorage.setItem('lastActivity', now);
            DebugLogger.log('✅ Regular session data stored for emergency bypass');
            
            // Store in Safari storage if available
            if (window.SafeStorage) {
                window.SafeStorage.setItem('loginTime', now);
                window.SafeStorage.setItem('lastActivity', now);
                DebugLogger.log('✅ Safari storage session data stored');
            }
            
            // Safari-compatible redirect with session setup
            if (window.SafariSession) {
                window.SafariSession.setLoginTime();
                DebugLogger.log('🍎 Safari session data set before redirect');
            }
            
            // Enhanced delay for Safari compatibility
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const isIPadSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && isSafari;
            const redirectDelay = isIPadSafari ? 1000 : 300;
            
            DebugLogger.log(`🔄 Redirecting to home in ${redirectDelay}ms...`);
            setTimeout(() => {
                window.location.href = '/'; // Redirect to home page after successful login
            }, redirectDelay);
            
        } catch (error) {
            DebugLogger.error('Erreur de connexion:', error);
            alert(error.message);
        }
    });
}

// Check if we're on the registration page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            DebugLogger.log('Inscription réussie:', userCredential.user);
            
            // CRITICAL: Store session data for emergency bypass (same as login)
            const now = Date.now().toString();
            
            // Store in regular localStorage (for emergency bypass)
            localStorage.setItem('loginTime', now);
            localStorage.setItem('lastActivity', now);
            DebugLogger.log('✅ Registration: Regular session data stored for emergency bypass');
            
            // Store in Safari storage if available
            if (window.SafeStorage) {
                window.SafeStorage.setItem('loginTime', now);
                window.SafeStorage.setItem('lastActivity', now);
                DebugLogger.log('✅ Registration: Safari storage session data stored');
            }
            
            // Safari-compatible redirect with session setup
            if (window.SafariSession) {
                window.SafariSession.setLoginTime();
                DebugLogger.log('🍎 Registration: Safari session data set before redirect');
            }
            
            // Enhanced delay for Safari compatibility
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            const isIPadSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && isSafari;
            const redirectDelay = isIPadSafari ? 1000 : 300;
            
            DebugLogger.log(`🔄 Registration: Redirecting to home in ${redirectDelay}ms...`);
            setTimeout(() => {
                window.location.href = '/'; // Redirect to home page after successful registration
            }, redirectDelay);
        } catch (error) {
            DebugLogger.error('Erreur d\'inscription:', error);
            alert(error.message);
        }
    });
}

// Navigation rendering can remain static if desired. 