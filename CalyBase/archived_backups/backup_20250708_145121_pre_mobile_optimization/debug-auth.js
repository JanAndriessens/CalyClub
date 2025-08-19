// Debug script for authentication issues
console.log('🔍 DEBUG: Auth debug script loaded');

// Wait for everything to be ready
setTimeout(() => {
    console.log('🔍 DEBUG: Starting authentication debug...');
    
    // Check if all required elements exist
    const navLinks = document.querySelector('.nav-links');
    const authLink = document.getElementById('authLink');
    
    console.log('🔍 DEBUG: Elements found:', {
        navLinks: !!navLinks,
        authLink: !!authLink,
        authLinkText: authLink ? authLink.textContent : 'N/A',
        authLinkHref: authLink ? authLink.href : 'N/A'
    });
    
    // Check Firebase status
    console.log('🔍 DEBUG: Firebase status:', {
        firebase: typeof firebase !== 'undefined',
        firebaseConfig: !!window.firebaseConfig,
        auth: !!window.auth,
        db: !!window.db,
        storage: !!window.storage
    });
    
    // Check AuthGuard status
    console.log('🔍 DEBUG: AuthGuard status:', {
        authGuard: !!window.authGuard,
        isInitialized: window.authGuard ? window.authGuard.isInitialized : false,
        currentUser: window.authGuard ? !!window.authGuard.currentUser : false,
        userEmail: window.authGuard && window.authGuard.currentUser ? window.authGuard.currentUser.email : 'None'
    });
    
    // Try to manually trigger auth state check
    if (window.auth) {
        console.log('🔍 DEBUG: Checking current auth state...');
        window.auth.onAuthStateChanged((user) => {
            console.log('🔍 DEBUG: Auth state changed detected:', {
                user: !!user,
                email: user ? user.email : 'None',
                uid: user ? user.uid : 'None'
            });
            
            // Try manual navigation update
            if (authLink) {
                if (user) {
                    console.log('🔍 DEBUG: User detected - manually updating button to Déconnexion');
                    authLink.textContent = 'Déconnexion';
                    authLink.href = '#';
                    authLink.style.color = '#ff4444';
                    authLink.style.fontWeight = 'bold';
                    
                    // Add click handler
                    authLink.onclick = (e) => {
                        e.preventDefault();
                        console.log('🔍 DEBUG: Manual logout clicked');
                        if (window.authGuard) {
                            window.authGuard.logout();
                        } else if (window.auth) {
                            window.auth.signOut().then(() => {
                                window.location.href = '/login.html';
                            });
                        }
                    };
                } else {
                    console.log('🔍 DEBUG: No user - manually updating button to Connexion');
                    authLink.textContent = 'Connexion';
                    authLink.href = '/login.html';
                    authLink.style.color = '';
                    authLink.style.fontWeight = '';
                    authLink.onclick = null;
                }
            }
        });
    }
    
}, 2000); // Wait 2 seconds for everything to load

// Also check every 5 seconds
setInterval(() => {
    const authLink = document.getElementById('authLink');
    if (authLink && window.auth && window.auth.currentUser) {
        if (authLink.textContent === 'Connexion') {
            console.log('🔍 DEBUG: Button still shows Connexion despite user being logged in - forcing update');
            authLink.textContent = 'Déconnexion';
            authLink.href = '#';
            authLink.style.color = '#ff4444';
            authLink.style.fontWeight = 'bold';
        }
    }
}, 5000); 