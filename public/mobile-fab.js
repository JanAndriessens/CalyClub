// Floating Action Button (FAB) System for CalyClub Mobile
// Provides quick access to key actions based on current page context

class MobileFloatingActionButton {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
        this.fabContainer = null;
        this.isExpanded = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Only initialize on mobile devices
        if (this.isMobileDevice()) {
            this.detectCurrentPage();
            this.createFAB();
            this.addEventListeners();
        }
        
        this.isInitialized = true;
    }

    // Detect mobile device
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Detect current page to show relevant actions
    detectCurrentPage() {
        const path = window.location.pathname;
        
        if (path.includes('membres') || path.includes('member')) {
            this.currentPage = 'members';
        } else if (path.includes('events')) {
            this.currentPage = 'events';
        } else if (path.includes('payments')) {
            this.currentPage = 'payments';
        } else if (path.includes('index') || path === '/') {
            this.currentPage = 'home';
        } else {
            this.currentPage = 'other';
        }
    }

    // Create FAB based on current page
    createFAB() {
        // Remove existing FAB
        const existingFab = document.querySelector('.mobile-fab');
        if (existingFab) {
            existingFab.remove();
        }

        // Create FAB container
        this.fabContainer = document.createElement('div');
        this.fabContainer.className = 'mobile-fab';
        
        const actions = this.getActionsForPage();
        
        this.fabContainer.innerHTML = `
            ${this.createFABStyles()}
            <div class="fab-backdrop" style="display: none;"></div>
            <div class="fab-actions">
                ${actions.map(action => this.createActionButton(action)).join('')}
            </div>
            <div class="fab-main">
                <div class="fab-icon">${this.getMainIcon()}</div>
            </div>
        `;

        document.body.appendChild(this.fabContainer);
    }

    // Create FAB styles
    createFABStyles() {
        return `
            <style>
                .mobile-fab {
                    position: fixed;
                    bottom: 90px; /* Above bottom navigation */
                    right: 20px;
                    z-index: 1001;
                }

                .fab-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.3);
                    z-index: -1;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .fab-backdrop.active {
                    opacity: 1;
                }

                .fab-main {
                    width: 56px;
                    height: 56px;
                    background: #0066cc;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: white;
                    font-size: 24px;
                    user-select: none;
                    position: relative;
                    z-index: 2;
                }

                .fab-main:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 25px rgba(0, 102, 204, 0.4);
                }

                .fab-main:active {
                    transform: scale(0.95);
                }

                .fab-main.expanded {
                    transform: rotate(45deg);
                    background: #ff4444;
                }

                .fab-actions {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                }

                .fab-actions.expanded {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .fab-action {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: fabSlideIn 0.3s ease forwards;
                }

                .fab-action:nth-child(1) { animation-delay: 0.1s; }
                .fab-action:nth-child(2) { animation-delay: 0.15s; }
                .fab-action:nth-child(3) { animation-delay: 0.2s; }
                .fab-action:nth-child(4) { animation-delay: 0.25s; }

                .fab-action-button {
                    width: 48px;
                    height: 48px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.2);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #666;
                    font-size: 20px;
                    border: none;
                    user-select: none;
                }

                .fab-action-button:hover {
                    transform: scale(1.1);
                    background: #0066cc;
                    color: white;
                }

                .fab-action-button:active {
                    transform: scale(0.9);
                }

                .fab-action-label {
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 14px;
                    white-space: nowrap;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }

                .fab-action:hover .fab-action-label {
                    opacity: 1;
                    transform: translateX(0);
                }

                @keyframes fabSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .fab-action-button {
                        background: #333;
                        color: #ccc;
                    }
                    
                    .fab-action-label {
                        background: rgba(255, 255, 255, 0.9);
                        color: #333;
                    }
                }

                /* iPad optimization */
                @media (min-width: 768px) and (max-width: 1024px) {
                    .mobile-fab {
                        bottom: 100px;
                        right: 30px;
                    }
                    
                    .fab-main {
                        width: 64px;
                        height: 64px;
                        font-size: 28px;
                    }
                    
                    .fab-action-button {
                        width: 52px;
                        height: 52px;
                        font-size: 22px;
                    }
                }

                /* Hide on desktop */
                @media (min-width: 1025px) {
                    .mobile-fab {
                        display: none;
                    }
                }

                /* Animation for page transitions */
                .mobile-fab.page-transition {
                    transform: scale(0.8);
                    opacity: 0.5;
                    transition: all 0.3s ease;
                }
            </style>
        `;
    }

    // Get actions based on current page
    getActionsForPage() {
        const actions = {
            home: [
                { icon: '👥', label: 'Nouveau Membre', action: 'addMember' },
                { icon: '📅', label: 'Nouvel Événement', action: 'addEvent' },
                { icon: '💳', label: 'Nouveau Paiement', action: 'addPayment' },
                { icon: '📱', label: 'Scanner QR', action: 'scanQR' }
            ],
            members: [
                { icon: '➕', label: 'Nouveau Membre', action: 'addMember' },
                { icon: '📤', label: 'Exporter Liste', action: 'exportMembers' },
                { icon: '🔍', label: 'Rechercher', action: 'searchMembers' },
                { icon: '📱', label: 'Scanner Carte', action: 'scanCard' }
            ],
            events: [
                { icon: '➕', label: 'Nouvel Événement', action: 'addEvent' },
                { icon: '📅', label: 'Calendrier', action: 'viewCalendar' },
                { icon: '📤', label: 'Exporter', action: 'exportEvents' },
                { icon: '🔔', label: 'Notifications', action: 'sendNotification' }
            ],
            payments: [
                { icon: '🏷️', label: 'QR Paiement', action: 'createPaymentQR' },
                { icon: '📊', label: 'Statistiques', action: 'viewStats' },
                { icon: '📤', label: 'Exporter', action: 'exportPayments' },
                { icon: '📱', label: 'Scanner QR', action: 'scanPaymentQR' }
            ],
            other: [
                { icon: '🏠', label: 'Accueil', action: 'goHome' },
                { icon: '👥', label: 'Membres', action: 'goToMembers' },
                { icon: '📅', label: 'Événements', action: 'goToEvents' }
            ]
        };

        return actions[this.currentPage] || actions.other;
    }

    // Get main FAB icon based on current page
    getMainIcon() {
        const icons = {
            home: '⭐',
            members: '👥',
            events: '📅',
            payments: '💳',
            other: '➕'
        };
        
        return icons[this.currentPage] || '➕';
    }

    // Create action button HTML
    createActionButton(action) {
        return `
            <div class="fab-action">
                <div class="fab-action-label">${action.label}</div>
                <button class="fab-action-button" data-action="${action.action}">
                    ${action.icon}
                </button>
            </div>
        `;
    }

    // Add event listeners
    addEventListeners() {
        const fabMain = this.fabContainer.querySelector('.fab-main');
        const backdrop = this.fabContainer.querySelector('.fab-backdrop');
        
        // Main FAB click
        fabMain.addEventListener('click', () => {
            this.toggleFAB();
        });

        // Backdrop click to close
        backdrop.addEventListener('click', () => {
            this.closeFAB();
        });

        // Action button clicks
        const actionButtons = this.fabContainer.querySelectorAll('.fab-action-button');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.handleAction(action);
                this.closeFAB();
            });
        });

        // Close FAB on scroll
        let scrollTimer;
        window.addEventListener('scroll', () => {
            if (this.isExpanded) {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    this.closeFAB();
                }, 150);
            }
        });

        // Close FAB on page navigation
        window.addEventListener('beforeunload', () => {
            this.closeFAB();
        });
    }

    // Toggle FAB expanded state
    toggleFAB() {
        if (this.isExpanded) {
            this.closeFAB();
        } else {
            this.openFAB();
        }
    }

    // Open FAB
    openFAB() {
        this.isExpanded = true;
        const fabMain = this.fabContainer.querySelector('.fab-main');
        const fabActions = this.fabContainer.querySelector('.fab-actions');
        const backdrop = this.fabContainer.querySelector('.fab-backdrop');
        
        fabMain.classList.add('expanded');
        fabActions.classList.add('expanded');
        backdrop.style.display = 'block';
        setTimeout(() => backdrop.classList.add('active'), 10);
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(20);
        }
    }

    // Close FAB
    closeFAB() {
        if (!this.isExpanded) return;
        
        this.isExpanded = false;
        const fabMain = this.fabContainer.querySelector('.fab-main');
        const fabActions = this.fabContainer.querySelector('.fab-actions');
        const backdrop = this.fabContainer.querySelector('.fab-backdrop');
        
        fabMain.classList.remove('expanded');
        fabActions.classList.remove('expanded');
        backdrop.classList.remove('active');
        
        setTimeout(() => {
            backdrop.style.display = 'none';
        }, 300);
    }

    // Handle action clicks
    handleAction(action) {
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(30);
        }

        switch (action) {
            case 'addMember':
                this.addMember();
                break;
            case 'addEvent':
                this.addEvent();
                break;
            case 'addPayment':
                this.addPayment();
                break;
            case 'createPaymentQR':
                this.createPaymentQR();
                break;
            case 'scanQR':
            case 'scanCard':
            case 'scanPaymentQR':
                this.scanQRCode();
                break;
            case 'exportMembers':
            case 'exportEvents':
            case 'exportPayments':
                this.exportData(action);
                break;
            case 'searchMembers':
                this.searchMembers();
                break;
            case 'viewCalendar':
                this.viewCalendar();
                break;
            case 'viewStats':
                this.viewStats();
                break;
            case 'sendNotification':
                this.sendNotification();
                break;
            case 'goHome':
                window.location.href = '/index.html';
                break;
            case 'goToMembers':
                window.location.href = '/membres.html';
                break;
            case 'goToEvents':
                window.location.href = '/events.html';
                break;
            default:
                console.log('Action not implemented:', action);
                this.showToast('Fonctionnalité en développement', 'info');
        }
    }

    // Action implementations
    addMember() {
        // Navigate to add member form or show modal
        if (this.currentPage === 'members') {
            // Scroll to top and focus on add button
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const addButton = document.querySelector('.btn-primary, [data-action="add"]');
            if (addButton) {
                addButton.click();
            }
        } else {
            window.location.href = '/membres.html#add';
        }
    }

    addEvent() {
        if (this.currentPage === 'events') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const addButton = document.querySelector('.btn-primary, [data-action="add"]');
            if (addButton) {
                addButton.click();
            }
        } else {
            window.location.href = '/events.html#add';
        }
    }

    addPayment() {
        if (this.currentPage === 'payments') {
            // Switch to create payment tab if available
            const createTab = document.querySelector('[onclick="switchTab(\'create\')"]');
            if (createTab) {
                createTab.click();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.href = '/payments.html';
        }
    }

    createPaymentQR() {
        if (this.currentPage === 'payments') {
            const generateButton = document.querySelector('.btn-generate');
            if (generateButton) {
                generateButton.click();
            }
        } else {
            window.location.href = '/payments.html#create';
        }
    }

    scanQRCode() {
        // Implement QR code scanner
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
            this.showToast('Ouverture de la caméra...', 'info');
            // Implementation would use a QR code scanning library
            setTimeout(() => {
                this.showToast('Scanner QR non encore implémenté', 'info');
            }, 1000);
        } else {
            this.showToast('Caméra non disponible', 'error');
        }
    }

    exportData(type) {
        this.showToast('Export en cours...', 'info');
        
        // Find and click export button
        const exportButton = document.querySelector('[onclick*="export"], .btn[onclick*="Export"]');
        if (exportButton) {
            setTimeout(() => exportButton.click(), 500);
        } else {
            setTimeout(() => {
                this.showToast('Fonction d\'export non disponible', 'error');
            }, 1000);
        }
    }

    searchMembers() {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="recherch"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            this.showToast('Recherche non disponible sur cette page', 'info');
        }
    }

    viewCalendar() {
        this.showToast('Vue calendrier en développement', 'info');
    }

    viewStats() {
        const statsTab = document.querySelector('[onclick="switchTab(\'statistics\')"]');
        if (statsTab) {
            statsTab.click();
        } else {
            this.showToast('Statistiques non disponibles', 'info');
        }
    }

    sendNotification() {
        this.showToast('Système de notifications en développement', 'info');
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Use mobile navigation's toast if available
        if (window.mobileNav && window.mobileNav.showToast) {
            window.mobileNav.showToast(message, type);
        } else {
            // Fallback toast implementation
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44bb44' : '#0066cc'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 3000);
        }
    }

    // Update FAB for page changes
    updateForPage() {
        this.detectCurrentPage();
        this.createFAB();
    }

    // Show/hide FAB
    show() {
        if (this.fabContainer) {
            this.fabContainer.style.display = 'block';
        }
    }

    hide() {
        if (this.fabContainer) {
            this.fabContainer.style.display = 'none';
        }
    }
}

// Initialize FAB when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileFAB = new MobileFloatingActionButton();
    });
} else {
    window.mobileFAB = new MobileFloatingActionButton();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileFloatingActionButton;
}