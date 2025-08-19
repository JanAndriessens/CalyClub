import { auth } from '../auth/firebase.config.js';
import { authUtils } from '../utils/auth.js';

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
            this.setupAuthListener();
        } else {
            // Retry after a short delay if Firebase isn't loaded yet
            setTimeout(() => this.init(), 100);
        }
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateNavigation();
        });
    }

    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Remove existing logout button if it exists
        const existingLogout = navLinks.querySelector('.logout-btn');
        if (existingLogout) {
            existingLogout.remove();
        }

        // Remove existing login link if user is authenticated
        const loginLink = navLinks.querySelector('a[href*="login"]');
        if (this.currentUser && loginLink) {
            loginLink.style.display = 'none';
        } else if (!this.currentUser && loginLink) {
            loginLink.style.display = 'inline-block';
        }

        // Add logout button if user is authenticated
        if (this.currentUser) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'logout-btn nav-button';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Déconnexion';
            logoutBtn.addEventListener('click', () => this.logout());
            navLinks.appendChild(logoutBtn);

            // Optionally show user email
            const userInfo = document.createElement('span');
            userInfo.className = 'user-info';
            userInfo.textContent = this.currentUser.email;
            navLinks.insertBefore(userInfo, logoutBtn);
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

// Global navigation instance
window.navigation = new NavigationComponent();

// CSS styles for the logout button
const navigationStyles = `
    .logout-btn {
        background: #ff4444;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-left: 10px;
        transition: background-color 0.3s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    
    .logout-btn:hover {
        background: #ff6666;
    }
    
    .user-info {
        color: #666;
        font-size: 12px;
        margin-left: 10px;
        margin-right: 5px;
    }
    
    .nav-button {
        font-family: inherit;
    }
    
    @media (max-width: 768px) {
        .user-info {
            display: none;
        }
        
        .logout-btn {
            padding: 6px 10px;
            font-size: 12px;
        }
    }
`;

// Inject CSS styles
const styleSheet = document.createElement('style');
styleSheet.textContent = navigationStyles;
document.head.appendChild(styleSheet);

export class Navigation {
    constructor() {
        this.navElement = document.createElement('nav');
        this.navElement.className = 'main-nav';
        this.isAdmin = false;
    }

    async init() {
        // Check if user is admin
        const user = auth.currentUser;
        if (user) {
            this.isAdmin = await authUtils.isAdmin(user.uid);
        }

        this.render();
        this.attachEventListeners();
    }

    render() {
        this.navElement.innerHTML = `
            <div class="nav-container">
                <a href="/" class="nav-logo">CalyBase</a>
                <div class="nav-links">
                    <a href="/" class="nav-link">Accueil</a>
                    <a href="/members.html" class="nav-link">Membres</a>
                    ${this.isAdmin ? `
                        <a href="/admin/users.html" class="nav-link admin-link">
                            <span class="admin-icon">👑</span>
                            Administration
                        </a>
                    ` : ''}
                </div>
                <div class="nav-auth">
                    ${auth.currentUser ? `
                        <button class="nav-button logout-button">Déconnexion</button>
                    ` : `
                        <a href="/auth/login.html" class="nav-button login-button">Connexion</a>
                        <a href="/auth/register.html" class="nav-button register-button">Inscription</a>
                    `}
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const logoutButton = this.navElement.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.href = '/';
                } catch (error) {
                    console.error('Error signing out:', error);
                }
            });
        }
    }
} 