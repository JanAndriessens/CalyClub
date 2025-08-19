// Mobile Navigation System for CalyClub
// Provides native app-like navigation experience with bottom tabs, gestures, and mobile-first UX

class MobileNavigation {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
        this.navigationHistory = [];
        this.swipeThreshold = 50;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Detect if we're on mobile
        if (this.isMobileDevice()) {
            this.createBottomNavigation();
            this.initializeSwipeGestures();
            this.initializePullToRefresh();
            this.addMobileEnhancements();
            this.handleBackButton();
        }
        
        this.isInitialized = true;
    }

    // Detect mobile device
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Create bottom navigation bar
    createBottomNavigation() {
        // Remove existing navigation if present
        const existingBottomNav = document.querySelector('.bottom-nav');
        if (existingBottomNav) {
            existingBottomNav.remove();
        }

        // Hide or minimize top navigation on mobile
        const topNav = document.querySelector('nav, .navbar, #navigation');
        if (topNav) {
            topNav.classList.add('mobile-hidden');
        }

        // Create bottom navigation
        const bottomNav = document.createElement('div');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = `
            <div class="bottom-nav-container">
                <a href="/index.html" class="nav-item" data-page="home">
                    <div class="nav-icon">🏠</div>
                    <span class="nav-label">Accueil</span>
                </a>
                <a href="/membres.html" class="nav-item" data-page="members">
                    <div class="nav-icon">👥</div>
                    <span class="nav-label">Membres</span>
                </a>
                <a href="/events.html" class="nav-item" data-page="events">
                    <div class="nav-icon">📅</div>
                    <span class="nav-label">Événements</span>
                </a>
                <a href="/payments.html" class="nav-item" data-page="payments">
                    <div class="nav-icon">💳</div>
                    <span class="nav-label">Paiements</span>
                </a>
                <div class="nav-item menu-item" data-page="menu">
                    <div class="nav-icon">☰</div>
                    <span class="nav-label">Menu</span>
                </div>
            </div>
        `;

        // Add styles
        const styles = `
            <style>
                /* Hide top navigation on mobile */
                .mobile-hidden {
                    display: none !important;
                }

                /* Bottom Navigation Styles */
                .bottom-nav {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    padding: env(safe-area-inset-bottom) 0 0 0;
                    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
                }

                .bottom-nav-container {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    padding: 8px 0 12px 0;
                    max-width: 500px;
                    margin: 0 auto;
                }

                .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-decoration: none;
                    color: #666;
                    padding: 4px;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    min-width: 50px;
                    position: relative;
                }

                .nav-item:hover,
                .nav-item:active {
                    color: #0066cc;
                    background: rgba(0, 102, 204, 0.1);
                    text-decoration: none;
                }

                .nav-item.active {
                    color: #0066cc;
                    transform: scale(1.05);
                }

                .nav-item.active::after {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background: #0066cc;
                    border-radius: 50%;
                }

                .nav-icon {
                    font-size: 20px;
                    margin-bottom: 2px;
                    line-height: 1;
                }

                .nav-label {
                    font-size: 10px;
                    font-weight: 500;
                    text-align: center;
                    line-height: 1.2;
                }

                /* Menu overlay */
                .menu-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1001;
                    display: none;
                    align-items: flex-end;
                    padding-bottom: 80px;
                }

                .menu-overlay.active {
                    display: flex;
                    animation: fadeIn 0.3s ease;
                }

                .menu-content {
                    background: white;
                    border-radius: 16px 16px 0 0;
                    padding: 20px;
                    width: 100%;
                    max-height: 70vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                }

                .menu-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .menu-item-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 16px;
                    background: #f9f9f9;
                    border-radius: 12px;
                    text-decoration: none;
                    color: #333;
                    transition: all 0.3s ease;
                    min-height: 80px;
                    justify-content: center;
                }

                .menu-item-card:hover {
                    background: #0066cc;
                    color: white;
                    transform: translateY(-2px);
                    text-decoration: none;
                }

                .menu-item-icon {
                    font-size: 24px;
                    margin-bottom: 4px;
                }

                .menu-item-title {
                    font-size: 12px;
                    font-weight: 500;
                    text-align: center;
                }

                /* Adjust body padding for bottom nav */
                body {
                    padding-bottom: 70px !important;
                }

                /* Animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .bottom-nav {
                        background: rgba(30, 30, 30, 0.95);
                        border-top-color: rgba(255, 255, 255, 0.1);
                    }
                    
                    .nav-item {
                        color: #ccc;
                    }
                    
                    .menu-content {
                        background: #1e1e1e;
                        color: white;
                    }
                    
                    .menu-item-card {
                        background: #333;
                        color: #ccc;
                    }
                }

                /* iPad optimizations */
                @media (min-width: 768px) and (max-width: 1024px) {
                    .bottom-nav-container {
                        max-width: 600px;
                    }
                    
                    .nav-item {
                        min-width: 60px;
                        padding: 8px;
                    }
                    
                    .nav-icon {
                        font-size: 24px;
                    }
                    
                    .nav-label {
                        font-size: 12px;
                    }
                }

                /* Hide on desktop */
                @media (min-width: 1025px) {
                    .bottom-nav {
                        display: none;
                    }
                    
                    .mobile-hidden {
                        display: block !important;
                    }
                    
                    body {
                        padding-bottom: 0 !important;
                    }
                }
            </style>
        `;

        // Add styles to head
        document.head.insertAdjacentHTML('beforeend', styles);

        // Add bottom nav to body
        document.body.appendChild(bottomNav);

        // Set active state
        this.updateActiveNavItem();

        // Add event listeners
        this.addNavigationEventListeners();
    }

    // Add navigation event listeners
    addNavigationEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.classList.contains('menu-item')) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleMenu();
                });
            } else {
                item.addEventListener('click', (e) => {
                    // Add loading state
                    item.style.opacity = '0.5';
                    setTimeout(() => {
                        item.style.opacity = '1';
                    }, 200);
                });
            }
        });
    }

    // Update active navigation item
    updateActiveNavItem() {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            
            if (href && (currentPath === href || 
                (currentPath === '/' && href === '/index.html') ||
                (currentPath.includes('index') && href === '/index.html'))) {
                item.classList.add('active');
                this.currentPage = item.dataset.page;
            }
        });
    }

    // Toggle menu overlay
    toggleMenu() {
        let overlay = document.querySelector('.menu-overlay');
        
        if (!overlay) {
            overlay = this.createMenuOverlay();
        }
        
        overlay.classList.toggle('active');
    }

    // Create menu overlay
    createMenuOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        
        overlay.innerHTML = `
            <div class="menu-content">
                <h3 style="margin: 0 0 20px 0; text-align: center; color: #0066cc;">Menu CalyClub</h3>
                
                <div class="menu-grid">
                    <a href="/user-management.html" class="menu-item-card">
                        <div class="menu-item-icon">👤</div>
                        <div class="menu-item-title">Gestion Utilisateurs</div>
                    </a>
                    <a href="/avatars.html" class="menu-item-card">
                        <div class="menu-item-icon">🖼️</div>
                        <div class="menu-item-title">Avatars</div>
                    </a>
                    <a href="/system-settings.html" class="menu-item-card">
                        <div class="menu-item-icon">⚙️</div>
                        <div class="menu-item-title">Paramètres</div>
                    </a>
                    <a href="/pwa-test.html" class="menu-item-card">
                        <div class="menu-item-icon">📱</div>
                        <div class="menu-item-title">Test PWA</div>
                    </a>
                    <a href="#" class="menu-item-card" onclick="window.mobileNav.showProfile()">
                        <div class="menu-item-icon">👥</div>
                        <div class="menu-item-title">Profil</div>
                    </a>
                    <a href="#" class="menu-item-card" onclick="window.mobileNav.logout()">
                        <div class="menu-item-icon">🚪</div>
                        <div class="menu-item-title">Déconnexion</div>
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="window.mobileNav.toggleMenu()" 
                            style="background: #f0f0f0; border: none; padding: 12px 24px; border-radius: 8px; color: #666;">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.toggleMenu();
            }
        });
        
        document.body.appendChild(overlay);
        return overlay;
    }

    // Initialize swipe gestures
    initializeSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const endTime = Date.now();
                
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                const deltaTime = endTime - startTime;
                
                // Only process quick swipes
                if (deltaTime < 300 && Math.abs(deltaX) > this.swipeThreshold) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        if (deltaX > 0) {
                            this.handleSwipeRight();
                        } else {
                            this.handleSwipeLeft();
                        }
                    }
                }
            }
        }, { passive: true });
    }

    // Handle swipe gestures
    handleSwipeRight() {
        // Navigate back or to previous page
        if (window.history.length > 1) {
            window.history.back();
        }
    }

    handleSwipeLeft() {
        // Could implement forward navigation or page-specific actions
        console.log('Swipe left detected');
    }

    // Initialize pull-to-refresh
    initializePullToRefresh() {
        let startY = 0;
        let pullDistance = 0;
        const pullThreshold = 100;
        let isPulling = false;
        
        let pullToRefreshElement = document.querySelector('.pull-to-refresh');
        if (!pullToRefreshElement) {
            pullToRefreshElement = document.createElement('div');
            pullToRefreshElement.className = 'pull-to-refresh';
            pullToRefreshElement.innerHTML = `
                <div class="pull-to-refresh-content">
                    <div class="pull-arrow">↓</div>
                    <span class="pull-text">Tirer pour actualiser</span>
                </div>
            `;
            
            // Add styles
            const pullStyles = `
                <style>
                    .pull-to-refresh {
                        position: fixed;
                        top: -60px;
                        left: 0;
                        right: 0;
                        height: 60px;
                        background: #f9f9f9;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: transform 0.3s ease;
                        z-index: 999;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    
                    .pull-to-refresh.pulling {
                        transform: translateY(60px);
                    }
                    
                    .pull-to-refresh.refreshing {
                        transform: translateY(60px);
                    }
                    
                    .pull-to-refresh.refreshing .pull-arrow {
                        animation: spin 1s linear infinite;
                    }
                    
                    .pull-to-refresh-content {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        color: #666;
                    }
                    
                    .pull-arrow {
                        font-size: 18px;
                        transition: transform 0.3s ease;
                    }
                    
                    .pull-text {
                        font-size: 14px;
                    }
                    
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            document.head.insertAdjacentHTML('beforeend', pullStyles);
            document.body.appendChild(pullToRefreshElement);
        }
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isPulling || window.scrollY > 0) return;
            
            pullDistance = e.touches[0].clientY - startY;
            
            if (pullDistance > 0) {
                e.preventDefault();
                pullToRefreshElement.classList.add('pulling');
                
                if (pullDistance > pullThreshold) {
                    pullToRefreshElement.querySelector('.pull-text').textContent = 'Relâcher pour actualiser';
                    pullToRefreshElement.querySelector('.pull-arrow').style.transform = 'rotate(180deg)';
                } else {
                    pullToRefreshElement.querySelector('.pull-text').textContent = 'Tirer pour actualiser';
                    pullToRefreshElement.querySelector('.pull-arrow').style.transform = 'rotate(0deg)';
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > pullThreshold) {
                this.performRefresh();
            } else {
                pullToRefreshElement.classList.remove('pulling');
            }
            
            isPulling = false;
            pullDistance = 0;
        });
    }

    // Perform page refresh
    performRefresh() {
        const pullElement = document.querySelector('.pull-to-refresh');
        pullElement.classList.add('refreshing');
        pullElement.querySelector('.pull-text').textContent = 'Actualisation...';
        pullElement.querySelector('.pull-arrow').textContent = '↻';
        
        // Simulate refresh delay
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // Add mobile-specific enhancements
    addMobileEnhancements() {
        // Add haptic feedback if available
        if ('vibrate' in navigator) {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.nav-item, button, .btn')) {
                    navigator.vibrate(10); // Short haptic feedback
                }
            });
        }
        
        // Improve scrolling momentum
        document.body.style.webkitOverflowScrolling = 'touch';
        
        // Prevent zoom on input focus
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.style.fontSize !== '16px') {
                input.style.fontSize = '16px';
            }
        });
    }

    // Handle back button
    handleBackButton() {
        window.addEventListener('popstate', () => {
            this.updateActiveNavItem();
        });
    }

    // Show profile (placeholder)
    showProfile() {
        alert('Profile functionality coming soon!');
        this.toggleMenu();
    }

    // Logout
    async logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            try {
                if (window.auth) {
                    await window.auth.signOut();
                }
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login.html';
            }
        }
        this.toggleMenu();
    }

    // Utility method to show mobile toast notifications
    showToast(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44bb44' : '#0066cc'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideDown 0.3s ease;
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize mobile navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileNav = new MobileNavigation();
    });
} else {
    window.mobileNav = new MobileNavigation();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}