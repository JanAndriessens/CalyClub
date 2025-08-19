// Navigation component with logout functionality
class NavigationComponent {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Wait for Firebase to be loaded
        if (typeof firebase !== 'undefined') {
            this.auth = firebase.auth();
            console.log('🔥 Firebase auth initialized');
            this.setupAuthListener();
        } else {
            console.log('⏳ Waiting for Firebase to load...');
            // Retry after a short delay if Firebase isn't loaded yet
            setTimeout(() => this.init(), 100);
        }
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            console.log('🔄 Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
            this.currentUser = user;
            await this.updateNavigation();
        });
    }

    async updateNavigation() {
        console.log('🔧 Updating navigation. Current user:', this.currentUser ? this.currentUser.email : 'None');
        
        const navLinks = document.querySelector('.nav-links');
        
        // Handle standard navbar
        if (navLinks) {
            console.log('📋 Found nav-links element');
            
            // Find the login/logout link
            const authLink = navLinks.querySelector('a[href*="login"]');
            
            if (authLink) {
                if (this.currentUser) {
                    // User is logged in - change to logout
                    console.log('✅ User is authenticated, changing to logout');
                    authLink.textContent = 'Déconnexion';
                    authLink.href = '#';
                    authLink.onclick = (e) => {
                        e.preventDefault();
                        this.logout();
                    };
                } else {
                    // User is not logged in - show login
                    console.log('❌ User not authenticated, showing login');
                    authLink.textContent = 'Connexion';
                    authLink.href = '/login.html';
                    authLink.onclick = null;
                }
            }

            // Handle username display under the logo
            await this.updateUsernameDisplay();
        } else {
            console.log('❌ No nav-links element found');
        }
    }

    async updateUsernameDisplay() {
        console.log('🔧 updateUsernameDisplay called');
        console.log('🔧 Current user:', this.currentUser);
        
        const navbar = document.querySelector('.navbar');
        if (!navbar) {
            console.log('❌ No navbar found');
            return;
        }

        // Remove existing username display
        const existingUsername = document.querySelector('.username-display');
        if (existingUsername) {
            existingUsername.remove();
            console.log('🗑️ Removed existing username display');
        }

        // Add username display if user is logged in
        if (this.currentUser) {
            console.log('✅ User is logged in, creating display...');
            let displayName = this.currentUser.email; // Default fallback
            
            // Try to get username from Firestore
            try {
                if (window.db && this.currentUser.uid) {
                    const userDoc = await window.db.collection('users').doc(this.currentUser.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.username && userData.username.trim()) {
                            displayName = userData.username;
                            console.log('📧 Using Firestore username:', displayName);
                        } else {
                            console.log('📧 No username in Firestore, using email:', displayName);
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not fetch username from Firestore:', error.message);
            }

            // Create a container for logo and username
            const logo = document.querySelector('.logo');
            if (logo) {
                console.log('🎯 Found logo element:', logo);
                console.log('🎯 Logo current content:', logo.innerHTML);
                
                // Check if we've already wrapped it
                if (!logo.querySelector('.logo-container')) {
                    console.log('🆕 Creating new logo container');
                    // Wrap the existing logo content
                    const logoText = logo.textContent;
                    logo.innerHTML = '';
                    
                    const logoContainer = document.createElement('div');
                    logoContainer.className = 'logo-container';
                    
                    const logoTitle = document.createElement('div');
                    logoTitle.className = 'logo-title';
                    logoTitle.textContent = logoText;
                    
                    const usernameDiv = document.createElement('div');
                    usernameDiv.className = 'username-display';
                    usernameDiv.textContent = displayName;
                    
                    logoContainer.appendChild(logoTitle);
                    logoContainer.appendChild(usernameDiv);
                    logo.appendChild(logoContainer);
                    
                    console.log('✅ Logo container created with username:', displayName);
                } else {
                    console.log('🔄 Updating existing username display');
                    // Just update the username
                    const usernameDiv = logo.querySelector('.username-display');
                    if (usernameDiv) {
                        usernameDiv.textContent = displayName;
                        console.log('✅ Username updated:', displayName);
                    } else {
                        console.log('❌ Username div not found in existing container');
                    }
                }
                
                console.log('📧 Final logo content:', logo.innerHTML);
            } else {
                console.log('❌ Logo element not found');
            }
        } else {
            console.log('❌ No current user, removing username display');
            // User logged out - restore simple logo
            const logo = document.querySelector('.logo');
            if (logo && logo.querySelector('.logo-container')) {
                logo.innerHTML = 'CalyBase';
                console.log('🔄 Logo restored to simple text');
            }
        }
        
        // Handle member detail page special case
        const headerLogoutBtn = document.getElementById('headerLogoutBtn');
        if (headerLogoutBtn) {
            if (this.currentUser) {
                headerLogoutBtn.style.display = 'inline-block';
                headerLogoutBtn.onclick = () => this.logout();
                console.log('🔘 Showing header logout button');
            } else {
                headerLogoutBtn.style.display = 'none';
                console.log('🙈 Hiding header logout button');
            }
        }
    }

    async logout() {
        try {
            console.log('🔓 Logging out user...');
            
            // Sign out from Firebase
            await this.auth.signOut();
            
            // Clear any local storage or session data
            localStorage.clear();
            sessionStorage.clear();
            
            console.log('✅ Logout successful');
            
            // Redirect to login page
            window.location.href = '/login.html';
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('Erreur lors de la déconnexion: ' + error.message);
        }
    }

    // Method to check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Method to redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
}

// CSS styles for the navigation
const navigationStyles = `
    .logo {
        position: relative;
    }
    
    .logo-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    
    .logo-title {
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--primary-color);
        line-height: 1;
    }
    
    .username-display {
        font-size: 11px;
        color: rgba(74, 144, 226, 0.6);
        margin-top: 2px;
        font-weight: normal;
        white-space: nowrap;
        line-height: 1;
    }
    
    .navbar {
        position: relative;
    }
    
    /* Special styling for member detail page logout button */
    .btn-logout {
        background: #ff4444 !important;
        color: white !important;
        border: 1px solid #ff4444 !important;
    }
    
    .btn-logout:hover {
        background: #ff6666 !important;
        border-color: #ff6666 !important;
    }
    
    /* Style the auth link when it's a logout link */
    .nav-links a[href="#"] {
        color: #ff4444;
        font-weight: bold;
    }
    
    .nav-links a[href="#"]:hover {
        color: #ff6666;
    }
    
    @media (max-width: 768px) {
        .logo-title {
            font-size: 1.3rem;
        }
        
        .username-display {
            font-size: 9px;
            margin-top: 1px;
        }
    }
`;

// Inject CSS styles (prevent duplicates)
if (!document.querySelector('style[data-navigation-styles]')) {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-navigation-styles', 'true');
    styleSheet.textContent = navigationStyles;
    document.head.appendChild(styleSheet);
}

// DEBUG: Manual test function
window.testUsernameDisplay = function() {
    console.log('🧪 Testing username display manually...');
    console.log('🧪 Current user:', window.auth?.currentUser?.email);
    console.log('🧪 Logo element:', document.querySelector('.logo'));
    
    const logo = document.querySelector('.logo');
    if (logo) {
        // Force create the display
        logo.innerHTML = '';
        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
        
        const logoTitle = document.createElement('div');
        logoTitle.className = 'logo-title';
        logoTitle.textContent = 'CalyBase';
        logoTitle.style.fontSize = '1.5rem';
        logoTitle.style.fontWeight = 'bold';
        logoTitle.style.color = '#4a90e2';
        
        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'username-display';
        usernameDiv.textContent = 'TEST USER';
        usernameDiv.style.fontSize = '11px';
        usernameDiv.style.color = 'rgba(74, 144, 226, 0.6)';
        usernameDiv.style.marginTop = '2px';
        usernameDiv.style.lineHeight = '1';
        
        logoContainer.appendChild(logoTitle);
        logoContainer.appendChild(usernameDiv);
        logo.appendChild(logoContainer);
        
        console.log('🧪 Test display created');
    } else {
        console.log('❌ No logo element found');
    }
};

// DEBUG: Check navigation status
window.debugNavigation = function() {
    console.log('=== NAVIGATION DEBUG ===');
    console.log('1. Navigation instance:', window.navigation);
    console.log('2. Firebase auth:', window.auth);
    console.log('3. Current user:', window.auth?.currentUser);
    console.log('4. User email:', window.auth?.currentUser?.email);
    console.log('5. Logo element:', document.querySelector('.logo'));
    console.log('6. Navbar element:', document.querySelector('.navbar'));
    console.log('7. Username display:', document.querySelector('.username-display'));
    
    if (window.navigation && window.navigation.currentUser) {
        console.log('8. Navigation current user:', window.navigation.currentUser.email);
        console.log('9. Manually triggering update...');
        window.navigation.updateUsernameDisplay();
    } else {
        console.log('8. Navigation not ready or no user');
    }
    console.log('========================');
};

// Initialize navigation when DOM is loaded (prevent duplicates)
if (!window.navigation) {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.navigation) {
            console.log('🚀 DOM loaded, initializing navigation...');
            // Global navigation instance
            window.navigation = new NavigationComponent();
            
            // Also make the test functions available
            console.log('🧪 Debug functions available:');
            console.log('   - window.testUsernameDisplay() - Test username display');
            console.log('   - window.debugNavigation() - Check navigation status');
        }
    });
} 