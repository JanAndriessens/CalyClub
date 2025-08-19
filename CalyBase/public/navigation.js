// Navigation component with logout functionality
class NavigationComponent {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.init();
        
        // Also listen for Firebase initialization event
        window.addEventListener('firebaseInitialized', () => {
            console.log('🔥 Firebase initialization event received in NavigationComponent');
            if (!this.auth && window.auth) {
                console.log('🔄 Re-initializing NavigationComponent after Firebase ready');
                this.init();
            }
        });
    }

    async init() {
        // Wait for Firebase to be loaded AND properly initialized
        if (typeof firebase !== 'undefined' && window.auth) {
            this.auth = window.auth; // Use the global auth object
            console.log('🔥 Firebase auth initialized in NavigationComponent');
            this.setupAuthListener();
        } else {
            console.log('⏳ Waiting for Firebase to load...');
            // Retry after a short delay if Firebase isn't loaded yet
            setTimeout(() => this.init(), 200);
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

            // SUPER SIMPLE: Just update the existing HTML element
            const usernameElement = document.getElementById('usernameText');
            if (usernameElement) {
                usernameElement.textContent = displayName;
                usernameElement.style.display = 'block';
                console.log('✅ Username displayed:', displayName);
            } else {
                console.log('❌ Username element not found');
            }
        } else {
            console.log('❌ No current user, hiding username');
            // User logged out - simply hide username
            const usernameElement = document.getElementById('usernameText');
            if (usernameElement) {
                usernameElement.style.display = 'none';
                console.log('🔄 Username hidden');
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
            console.log('🔓 Navigation logout starting...');
            
            // Use comprehensive logout if available, otherwise fallback to basic
            if (window.comprehensiveLogout) {
                await window.comprehensiveLogout();
            } else {
                console.log('⚠️ Comprehensive logout not available, using fallback');
                
                // Basic fallback clearing
                if (window.SafariSession) window.SafariSession.clear();
                if (window.SafeStorage) window.SafeStorage.clear();
                localStorage.clear();
                sessionStorage.clear();
                await this.auth.signOut();
            }
            
            console.log('✅ Navigation logout successful');
            
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
    
    /* Username display styling */
    .username-text {
        font-size: 0.9rem;
        color: #666;
        font-weight: normal;
        margin-top: 4px;
    }
`;

// Inject styles (prevent duplicates)
if (!document.querySelector('style[data-navigation-styles]')) {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-navigation-styles', 'true');
    styleSheet.type = 'text/css';
    styleSheet.innerText = navigationStyles;
    document.head.appendChild(styleSheet);
}

// DEBUG: Manual test function
window.testUsernameDisplay = function() {
    console.log('🧪 Testing username display manually...');
    console.log('🧪 Current user:', window.auth?.currentUser?.email);
    console.log('🧪 Username element:', document.getElementById('usernameText'));
    
    if (window.calybaseNavigation) {
        window.calybaseNavigation.updateUsernameDisplay();
        console.log('🧪 Triggered username update');
    } else {
        console.log('❌ Navigation component not available');
    }
};

// DEBUG: Check navigation status
window.debugNavigation = function() {
    console.log('=== NAVIGATION DEBUG ===');
    console.log('1. Navigation instance:', window.calybaseNavigation);
    console.log('2. Firebase auth:', window.auth);
    console.log('3. Current user:', window.auth?.currentUser);
    console.log('4. User email:', window.auth?.currentUser?.email);
    console.log('5. Logo container:', document.querySelector('.logo-container'));
    console.log('6. Navbar element:', document.querySelector('.navbar'));
    console.log('7. Username element:', document.getElementById('usernameText'));
    
    if (window.calybaseNavigation && window.calybaseNavigation.currentUser) {
        console.log('8. Navigation current user:', window.calybaseNavigation.currentUser.email);
        console.log('9. Manually triggering update...');
        window.calybaseNavigation.updateUsernameDisplay();
    } else {
        console.log('8. Navigation component not ready or no user');
    }
    console.log('========================');
};

// Initialize navigation when DOM is loaded (prevent duplicates)
if (!window.calybaseNavigation) {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.calybaseNavigation) {
            console.log('🚀 DOM loaded, initializing navigation...');
            // Global navigation instance
            window.calybaseNavigation = new NavigationComponent();
            
            // Also make the test functions available
            console.log('🧪 Debug functions available:');
            console.log('   - window.testUsernameDisplay() - Update username display');
            console.log('   - window.debugNavigation() - Check navigation status');
            
            // Verify our component was created successfully
            console.log('✅ CalyClub Navigation created:', window.calybaseNavigation);
            console.log('✅ Navigation type:', typeof window.calybaseNavigation);
            
            // Fallback check - ensure Firebase gets connected within 5 seconds
            setTimeout(() => {
                if (window.calybaseNavigation && !window.calybaseNavigation.auth && window.auth) {
                    console.log('🔄 Fallback: Forcing navigation re-initialization');
                    window.calybaseNavigation.init();
                }
            }, 5000);
        }
    });
}

// SIMPLE TEST FUNCTION - manually set username to test display
window.forceShowUsername = function(testName = 'TEST USER') {
    console.log('🧪 FORCING username display with:', testName);
    const usernameElement = document.getElementById('usernameText');
    if (usernameElement) {
        usernameElement.textContent = testName;
        usernameElement.style.display = 'block';
        console.log('✅ Forced username display successful');
    } else {
        console.log('❌ Could not find username element');
    }
};

// COMPREHENSIVE DEBUG FUNCTION
window.fullUsernameDebug = function() {
    console.log('=== FULL USERNAME DEBUG ===');
    
    // 1. Check HTML elements
    console.log('1. Username element:', document.getElementById('usernameText'));
    console.log('2. Logo container:', document.querySelector('.logo-container'));
    console.log('3. Logo text container:', document.querySelector('.logo-text-container'));
    
    // 2. Check Firebase status
    console.log('4. Firebase auth object:', window.auth);
    console.log('5. Current user:', window.auth?.currentUser);
    console.log('6. User email:', window.auth?.currentUser?.email);
    console.log('7. User uid:', window.auth?.currentUser?.uid);
    
    // 3. Check Firestore
    console.log('8. Firestore db:', window.db);
    
    // 4. Check navigation component
    console.log('9. Navigation component:', window.calybaseNavigation);
    console.log('10. Navigation current user:', window.calybaseNavigation?.currentUser);
    
    // 5. Test manual display
    console.log('11. Testing manual username display...');
    window.forceShowUsername('DEBUG TEST');
    
    console.log('========================');
    
    // Return status summary
    return {
        hasUsernameElement: !!document.getElementById('usernameText'),
        hasFirebaseAuth: !!window.auth,
        hasCurrentUser: !!window.auth?.currentUser,
        userEmail: window.auth?.currentUser?.email,
        hasNavigation: !!window.calybaseNavigation,
        hasFirestore: !!window.db
    };
};

// AUTO-DEBUG on page load (wait a bit for everything to initialize)
setTimeout(() => {
    console.log('🔍 AUTO-DEBUG: Checking username display status...');
    const status = window.fullUsernameDebug();
    
    if (!status.hasCurrentUser) {
        console.log('⚠️ No user logged in - username will not appear');
        console.log('💡 To test: window.forceShowUsername("Your Name")');
    } else {
        console.log('✅ User is logged in, username should appear');
        // Try to trigger username display
        if (window.calybaseNavigation && window.calybaseNavigation.updateUsernameDisplay) {
            console.log('🔄 Manually triggering username update...');
            window.calybaseNavigation.updateUsernameDisplay();
        }
    }
}, 3000); // Wait 3 seconds for everything to load 