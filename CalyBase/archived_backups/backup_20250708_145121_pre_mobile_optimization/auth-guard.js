// Authentication Guard System for CalyBase
// This script protects pages and manages authentication state

class AuthGuard {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.authCheckPromise = null;
        this.protectedPages = [
            '/membres.html',
            '/membre-detail.html', 
            '/events.html',
            '/event-detail.html',
            '/avatars.html'
        ];
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 AuthGuard initializing...');
            
            // Wait for Firebase to be initialized
            await this.waitForFirebase();
            
            // Setup authentication listener
            this.setupAuthListener();
            
            // Check current page protection
            this.checkPageAccess();
            
            console.log('✅ AuthGuard initialization complete');
            
        } catch (error) {
            console.error('❌ AuthGuard initialization failed:', error);
            this.handleAuthError('Erreur d\'initialisation de l\'authentification');
        }
    }

    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Firebase loading timeout'));
            }, 10000); // 10 second timeout

            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && window.firebaseConfig) {
                    clearInterval(checkFirebase);
                    clearTimeout(timeout);
                    
                    // Initialize Firebase auth
                    this.auth = firebase.auth();
                    console.log('🔥 Firebase Auth initialized');
                    resolve();
                }
            }, 100);
        });
    }

    setupAuthListener() {
        this.authCheckPromise = new Promise((resolve) => {
            this.auth.onAuthStateChanged(async (user) => {
                console.log('🔄 Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
                
                this.currentUser = user;
                this.isInitialized = true;
                
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    // Update navigation
                    this.updateNavigation();
                    
                    // Check page access after auth state change
                    this.checkPageAccess();
                }, 100);
                
                // Resolve the auth check promise
                resolve(user);
            });
        });
    }

    updateNavigation() {
        console.log('🔧 Updating navigation. User authenticated:', !!this.currentUser);
        
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) {
            console.log('❌ No nav-links element found');
            return;
        }

        // Find the auth link by ID first, then by href pattern
        let authLink = document.getElementById('authLink') || navLinks.querySelector('a[href*="login"], .logout-link');
        
        if (!authLink) {
            console.log('❌ No auth link found, creating one');
            // Create auth link if it doesn't exist
            authLink = document.createElement('a');
            authLink.id = 'authLink';
            navLinks.appendChild(authLink);
        }

        if (this.currentUser) {
            // User is authenticated - show logout
            console.log('✅ Setting navigation to logout mode');
            authLink.textContent = 'Déconnexion';
            authLink.href = '#';
            authLink.className = 'logout-link';
            authLink.style.color = '#ff4444';
            authLink.style.fontWeight = 'bold';
            authLink.style.cursor = 'pointer';
            authLink.id = 'authLink'; // Preserve ID
            
            // Remove any existing click handlers by cloning
            const newAuthLink = authLink.cloneNode(true);
            authLink.parentNode.replaceChild(newAuthLink, authLink);
            authLink = newAuthLink;
            
            authLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔓 Logout clicked');
                this.logout();
            });

            // Add user email display
            this.addUserDisplay();
            
        } else {
            // User is not authenticated - show login
            console.log('❌ Setting navigation to login mode');
            authLink.textContent = 'Connexion';
            authLink.href = '/login.html';
            authLink.className = '';
            authLink.style.color = '';
            authLink.style.fontWeight = '';
            authLink.style.cursor = '';
            authLink.id = 'authLink'; // Preserve ID
            
            // Remove any existing click handlers
            const newAuthLink = authLink.cloneNode(true);
            authLink.parentNode.replaceChild(newAuthLink, authLink);
            
            // Remove user display
            this.removeUserDisplay();
        }
    }

    addUserDisplay() {
        if (!this.currentUser) return;

        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Remove existing user display
        this.removeUserDisplay();

        // Add new user display
        const userDisplay = document.createElement('div');
        userDisplay.className = 'user-display';
        userDisplay.innerHTML = `
            <span class="user-email">${this.currentUser.email}</span>
        `;
        navbar.appendChild(userDisplay);
    }

    removeUserDisplay() {
        const existingDisplay = document.querySelector('.user-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }
    }

    checkPageAccess() {
        if (!this.isInitialized) return;

        const currentPath = window.location.pathname;
        const isProtectedPage = this.protectedPages.some(page => 
            currentPath.endsWith(page) || currentPath === page
        );

        if (isProtectedPage && !this.currentUser) {
            console.log('🚫 Access denied to protected page:', currentPath);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        // Show a message before redirecting
        this.showMessage('Vous devez être connecté pour accéder à cette page', 'warning');
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    }

    async logout() {
        try {
            console.log('🔓 Logging out user...');
            
            // Show loading message
            this.showMessage('Déconnexion en cours...', 'info');
            
            // Sign out from Firebase
            await this.auth.signOut();
            
            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();
            
            console.log('✅ Logout successful');
            this.showMessage('Déconnexion réussie', 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.handleAuthError('Erreur lors de la déconnexion: ' + error.message);
        }
    }

    // Utility methods
    isAuthenticated() {
        return this.currentUser !== null;
    }

    async waitForAuth() {
        if (this.authCheckPromise) {
            await this.authCheckPromise;
        }
        return this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message auth-message--${type}`;
        messageDiv.textContent = message;
        
        // Insert at top of body
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    handleAuthError(message) {
        this.showMessage(message, 'error');
    }
}

// CSS Styles for the authentication system
const authStyles = `
    .user-display {
        position: absolute;
        bottom: -30px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
    }
    
    .navbar {
        position: relative;
    }
    
    .logout-link {
        color: #ff4444 !important;
        font-weight: bold !important;
        transition: color 0.3s ease;
    }
    
    .logout-link:hover {
        color: #ff6666 !important;
    }
    
    .auth-message {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px;
        text-align: center;
        z-index: 9999;
        font-weight: bold;
        animation: slideDown 0.3s ease;
    }
    
    .auth-message--success {
        background: #4caf50;
        color: white;
    }
    
    .auth-message--error {
        background: #f44336;
        color: white;
    }
    
    .auth-message--warning {
        background: #ff9800;
        color: white;
    }
    
    .auth-message--info {
        background: #2196f3;
        color: white;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
        }
        to {
            transform: translateY(0);
        }
    }
    
    @media (max-width: 768px) {
        .user-display {
            right: 10px;
            font-size: 10px;
            bottom: -25px;
        }
    }
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = authStyles;
document.head.appendChild(styleSheet);

// Initialize AuthGuard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing AuthGuard...');
    window.authGuard = new AuthGuard();
});

// Export for use in other scripts
window.AuthGuard = AuthGuard; 