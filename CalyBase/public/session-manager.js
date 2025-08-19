// Session Timeout Manager for CalyBase
// Implements automatic session timeout with configurable warning system

class SessionManager {
    constructor() {
        this.sessionTimer = null;
        this.warningTimer = null;
        this.activityTimer = null;
        this.warningDialog = null;
        this.isWarningShown = false;
        this.config = {
            sessionTimeoutMinutes: 60,    // Default 1 hour
            warningTimeMinutes: 5,        // Default 5 minutes warning
            activityCheckInterval: 30000  // Check activity every 30 seconds
        };
        this.lastActivity = Date.now();
        this.isInitialized = false;
        
        // Bind methods to preserve 'this' context
        this.handleUserActivity = this.handleUserActivity.bind(this);
        this.checkSession = this.checkSession.bind(this);
        this.showWarning = this.showWarning.bind(this);
        this.performLogout = this.performLogout.bind(this);
    }

    // Initialize session manager with system configuration
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🕐 Initializing session timeout manager...');
        
        try {
            // Load configuration from system settings
            await this.loadConfiguration();
            
            // Set up activity monitoring
            this.setupActivityMonitoring();
            
            // Start session monitoring
            this.startSessionTimer();
            
            this.isInitialized = true;
            console.log('✅ Session manager initialized:', this.config);
            
        } catch (error) {
            console.error('❌ Failed to initialize session manager:', error);
            // Use default configuration if loading fails
            this.setupActivityMonitoring();
            this.startSessionTimer();
            this.isInitialized = true;
        }
    }

    // Load timeout configuration from system settings
    async loadConfiguration() {
        try {
            // Try to get configuration from SystemConfig if available
            if (window.SystemConfig && window.SystemConfig.getConfig) {
                const systemConfig = await window.SystemConfig.getConfig();
                
                if (systemConfig && systemConfig.security) {
                    const security = systemConfig.security;
                    
                    // Update configuration with values from system settings
                    if (security.sessionTimeoutMinutes && security.sessionTimeoutMinutes > 0) {
                        this.config.sessionTimeoutMinutes = security.sessionTimeoutMinutes;
                    }
                    
                    if (security.warningTimeoutMinutes && security.warningTimeoutMinutes > 0) {
                        this.config.warningTimeMinutes = security.warningTimeoutMinutes;
                    }
                    
                    console.log('📋 Loaded session config from system settings:', this.config);
                }
            } else {
                console.log('⚠️ SystemConfig not available, using defaults');
            }
        } catch (error) {
            console.error('⚠️ Could not load session configuration:', error);
        }
    }

    // Set up activity monitoring on the page
    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, this.handleUserActivity, true);
        });
        
        // Set up periodic activity check
        this.activityTimer = setInterval(this.checkSession, this.config.activityCheckInterval);
        
        console.log('👆 Activity monitoring started for events:', events);
    }

    // Handle user activity - reset session timer
    handleUserActivity() {
        this.lastActivity = Date.now();
        
        // If warning is shown and user is active, extend session
        if (this.isWarningShown) {
            this.extendSession();
        }
    }

    // Start the main session timer
    startSessionTimer() {
        this.clearTimers();
        
        const sessionTimeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
        const warningTimeMs = this.config.warningTimeMinutes * 60 * 1000;
        const warningStartTime = sessionTimeoutMs - warningTimeMs;
        
        console.log(`⏰ Session timer started: ${this.config.sessionTimeoutMinutes} minutes total, ${this.config.warningTimeMinutes} minutes warning`);
        
        // Set timer to show warning
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, warningStartTime);
        
        // Set timer for automatic logout
        this.sessionTimer = setTimeout(() => {
            this.performLogout('Session expirée - délai d\'inactivité dépassé');
        }, sessionTimeoutMs);
    }

    // Check if user has been inactive
    checkSession() {
        const now = Date.now();
        const inactiveTime = now - this.lastActivity;
        const maxInactiveTime = this.config.sessionTimeoutMinutes * 60 * 1000;
        
        // If user has been inactive for too long, show warning or logout
        if (inactiveTime >= maxInactiveTime - (this.config.warningTimeMinutes * 60 * 1000)) {
            if (!this.isWarningShown) {
                this.showWarning();
            }
        }
    }

    // Show session expiration warning dialog
    showWarning() {
        if (this.isWarningShown) return;
        
        this.isWarningShown = true;
        console.log('⚠️ Showing session expiration warning');
        
        const warningTimeMs = this.config.warningTimeMinutes * 60 * 1000;
        let remainingSeconds = Math.floor(warningTimeMs / 1000);
        
        // Create warning dialog HTML
        const dialogHTML = `
            <div id="session-warning-overlay" style="
                position: fixed; 
                top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.7); 
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white; 
                    padding: 2rem; 
                    border-radius: 8px; 
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
                    <div style="font-size: 3rem; color: #ff9800; margin-bottom: 1rem;">⏰</div>
                    <h2 style="color: #333; margin-bottom: 1rem;">Session bientôt expirée</h2>
                    <p style="color: #666; margin-bottom: 1.5rem;">
                        Votre session va expirer dans <strong id="countdown-timer">${remainingSeconds}</strong> secondes
                        en raison d'inactivité.
                    </p>
                    <div>
                        <button id="extend-session-btn" style="
                            background: #4CAF50; 
                            color: white; 
                            padding: 0.75rem 1.5rem; 
                            border: none; 
                            border-radius: 4px; 
                            margin-right: 1rem;
                            cursor: pointer;
                            font-size: 1rem;
                        ">Prolonger la session</button>
                        <button id="logout-now-btn" style="
                            background: #f44336; 
                            color: white; 
                            padding: 0.75rem 1.5rem; 
                            border: none; 
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 1rem;
                        ">Se déconnecter maintenant</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add dialog to page
        const dialogDiv = document.createElement('div');
        dialogDiv.innerHTML = dialogHTML;
        document.body.appendChild(dialogDiv);
        
        // Set up countdown timer
        const countdownTimer = document.getElementById('countdown-timer');
        const countdownInterval = setInterval(() => {
            remainingSeconds--;
            if (countdownTimer) {
                countdownTimer.textContent = remainingSeconds;
            }
            
            if (remainingSeconds <= 0) {
                clearInterval(countdownInterval);
                this.performLogout('Session expirée - délai dépassé');
            }
        }, 1000);
        
        // Set up button handlers
        document.getElementById('extend-session-btn').onclick = () => {
            clearInterval(countdownInterval);
            this.extendSession();
        };
        
        document.getElementById('logout-now-btn').onclick = () => {
            clearInterval(countdownInterval);
            this.performLogout('Déconnexion demandée par l\'utilisateur');
        };
        
        // Store references for cleanup
        this.warningDialog = {
            element: document.getElementById('session-warning-overlay'),
            countdownInterval: countdownInterval
        };
    }

    // Extend the current session
    extendSession() {
        console.log('⏰ Session extended by user activity');
        
        // Hide warning dialog
        this.hideWarning();
        
        // Restart session timer
        this.startSessionTimer();
        
        // Update last activity time
        this.lastActivity = Date.now();
    }

    // Hide the warning dialog
    hideWarning() {
        if (this.warningDialog) {
            if (this.warningDialog.countdownInterval) {
                clearInterval(this.warningDialog.countdownInterval);
            }
            if (this.warningDialog.element && this.warningDialog.element.parentNode) {
                this.warningDialog.element.parentNode.removeChild(this.warningDialog.element);
            }
            this.warningDialog = null;
        }
        this.isWarningShown = false;
    }

    // Perform automatic logout
    async performLogout(reason) {
        console.log('🚪 Performing automatic logout:', reason);
        
        // Clear all timers
        this.clearTimers();
        
        // Hide warning dialog
        this.hideWarning();
        
        try {
            // Use existing logout functionality if available
            if (window.firebase && window.firebase.auth) {
                await window.firebase.auth().signOut();
            }
            
            // Clear any cached user data
            if (window.localStorage) {
                window.localStorage.removeItem('calypso_user');
                window.localStorage.removeItem('user_permissions');
            }
            
            // Show logout message
            alert(`Session terminée: ${reason}`);
            
            // Redirect to login page
            window.location.href = '/login.html';
            
        } catch (error) {
            console.error('❌ Error during automatic logout:', error);
            // Force redirect even if logout fails
            window.location.href = '/login.html';
        }
    }

    // Clear all active timers
    clearTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    // Stop session monitoring (called on manual logout)
    stop() {
        console.log('🛑 Stopping session manager');
        
        this.clearTimers();
        this.hideWarning();
        
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
        
        // Remove activity listeners
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.removeEventListener(event, this.handleUserActivity, true);
        });
        
        this.isInitialized = false;
    }

    // Get current session status
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            lastActivity: new Date(this.lastActivity),
            isWarningShown: this.isWarningShown,
            hasActiveTimer: !!this.sessionTimer
        };
    }
}

// Create global instance
window.sessionManager = new SessionManager();

// Initialize on page load if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated before starting session management
    if (window.firebase && window.firebase.auth) {
        window.firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('👤 User authenticated, starting session manager...');
                window.sessionManager.initialize();
            } else {
                console.log('👤 User not authenticated, stopping session manager...');
                window.sessionManager.stop();
            }
        });
    }
});

// Debug function
window.debugSessionManager = function() {
    console.log('🔍 Session Manager Status:', window.sessionManager.getStatus());
};

console.log('📋 Session manager module loaded');