// Dashboard JavaScript for CalyBase
let dashboardData = {
    totalMembers: 0,
    totalEvents: 0,
    totalAvatars: 0,
    recentActivity: 0,
    recentItems: [],
    // User management data
    totalUsers: 0,
    pendingUsers: 0,
    activeUsers: 0,
    isAdmin: false
};

// Initialize dashboard when Firebase is ready
function initializeDashboard() {
    if (!window.db || !window.auth || typeof firebase === 'undefined') {
        console.log('⏳ Dashboard: Waiting for Firebase services...');
        setTimeout(initializeDashboard, 500);
        return;
    }
    
    console.log('🎯 Dashboard: Firebase services found, initializing...');
    (async () => {
    try {
        console.log('🎯 Dashboard: Firebase is ready, initializing dashboard...');
        
        // Check Firebase services  
        console.log('✅ Dashboard: Firebase services available:', {
            db: !!window.db,
            auth: !!window.auth,
            firebase: typeof firebase !== 'undefined'
        });
        
        // Load admin status and basic data in parallel for better performance
        console.log('📊 Dashboard: Loading dashboard data...');
        const [adminStatus] = await Promise.all([
            checkAdminStatus(),
            loadBasicDashboardData() // Start loading basic data immediately
        ]);
        
        console.log('✅ Dashboard: Initialization complete');
        
        // Setup logout functionality
        setupLogoutHandler();
        
    } catch (error) {
        console.error('❌ Dashboard: Error during initialization:', error);
        showErrorMessage('Erreur lors du chargement du tableau de bord: ' + error.message);
    }
    })();
}

// Start dashboard initialization
initializeDashboard();

// Firebase initialization is now handled by FirebaseManager
// This function is no longer needed

// OPTIMIZED: Simplified admin status check
async function checkAdminStatus() {
    try {
        const user = window.auth.currentUser;
        if (!user) {
            console.log('👤 Dashboard: No user logged in');
            document.getElementById('adminSection').style.display = 'none';
            return false;
        }

        console.log('🔍 Dashboard: Checking admin status for:', user.email);

        let isAdmin = false;
        
        // Method 1: Quick check for hardcoded admin emails (fastest)
        const adminEmails = ['jan@andriessens.be', 'jan.andriessens@gmail.com'];
        if (adminEmails.includes(user.email)) {
            console.log('👑 Dashboard: Admin email recognized (hardcoded list)');
            isAdmin = true;
        }
        
        // Method 2: Only check Firestore if not already confirmed admin
        if (!isAdmin) {
            try {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.role === 'admin' && userData.status === 'active') {
                        console.log('👑 Dashboard: Admin role found in Firestore');
                        isAdmin = true;
                    }
                }
            } catch (firestoreError) {
                console.log('⚠️ Dashboard: Could not check Firestore user:', firestoreError.message);
            }
        }
        
        // Set admin status and show/hide admin section
        dashboardData.isAdmin = isAdmin;
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            if (isAdmin) {
                console.log('✅ Dashboard: Admin access granted');
                adminSection.style.display = 'block';
                // Load admin data asynchronously
                loadUserStatistics();
            } else {
                console.log('❌ Dashboard: Admin access denied');
                adminSection.style.display = 'none';
            }
        }
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ Dashboard: Error checking admin status:', error);
        dashboardData.isAdmin = false;
        document.getElementById('adminSection').style.display = 'none';
        return false;
    }
}

// OPTIMIZED: Load basic dashboard data with better parallel execution
async function loadBasicDashboardData() {
    try {
        // Load basic counts in parallel (fastest queries)
        const [membersCount, eventsCount, avatarsCount] = await Promise.all([
            getMembersCount(),
            getEventsCount(),
            getAvatarsCount()
        ]);

        // Update basic data immediately
        dashboardData.totalMembers = membersCount;
        dashboardData.totalEvents = eventsCount;
        dashboardData.totalAvatars = avatarsCount;

        // Update UI immediately with basic stats
        updateStatistics();

        // Load recent activity asynchronously (slower query)
        getRecentActivityOptimized().then(recentItems => {
            dashboardData.recentActivity = recentItems.length;
            dashboardData.recentItems = recentItems;
            updateRecentActivity();
        });

    } catch (error) {
        console.error('❌ Dashboard: Error loading basic data:', error);
        showErrorMessage('Erreur lors du chargement des données');
    }
}

// Get total members count (optimized)
async function getMembersCount() {
    try {
        console.log('🔍 Dashboard: Getting members count...');
        console.log('🔍 Dashboard: window.db available:', !!window.db);
        
        if (!window.db) {
            console.error('❌ Dashboard: window.db is not available');
            return 0;
        }
        
        // Use aggregation query for better performance if available
        const snapshot = await window.db.collection('membres').get();
        console.log('✅ Dashboard: Members count retrieved:', snapshot.size);
        return snapshot.size;
    } catch (error) {
        console.error('❌ Error getting members count:', error);
        console.error('❌ Error details:', error.message, error.code);
        return 0;
    }
}

// Get total events count (optimized)
async function getEventsCount() {
    try {
        console.log('🔍 Dashboard: Getting events count...');
        if (!window.db) {
            console.error('❌ Dashboard: window.db is not available for events');
            return 0;
        }
        
        const snapshot = await window.db.collection('events').get();
        console.log('✅ Dashboard: Events count retrieved:', snapshot.size);
        return snapshot.size;
    } catch (error) {
        console.error('❌ Error getting events count:', error);
        console.error('❌ Error details:', error.message, error.code);
        return 0;
    }
}

// Get total avatars count (optimized)
async function getAvatarsCount() {
    try {
        console.log('🔍 Dashboard: Getting avatars count...');
        if (!window.db) {
            console.error('❌ Dashboard: window.db is not available for avatars');
            return 0;
        }
        
        const snapshot = await window.db.collection('avatars').get();
        console.log('✅ Dashboard: Avatars count retrieved:', snapshot.size);
        return snapshot.size;
    } catch (error) {
        console.error('❌ Error getting avatars count:', error);
        console.error('❌ Error details:', error.message, error.code);
        return 0;
    }
}

// OPTIMIZED: Simplified recent activity (much faster)
async function getRecentActivityOptimized() {
    try {
        const recentItems = [];

        // Simplified approach: Get only most recent items without complex date filtering
        try {
            // Get recent members (limit to last 3 for performance)
            const membersSnapshot = await window.db.collection('membres')
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            membersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                    recentItems.push({
                        type: 'member',
                        title: `Nouveau membre: ${data.prenom} ${data.nom}`,
                        time: data.createdAt.toDate(),
                        icon: 'fas fa-user-plus'
                    });
                }
            });
        } catch (error) {
            console.log('Note: Could not load recent members');
        }

        // Get recent events (limit to last 3 for performance)
        try {
            const eventsSnapshot = await window.db.collection('events')
                .orderBy('date', 'desc')
                .limit(3)
                .get();

            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.date) {
                    recentItems.push({
                        type: 'event',
                        title: `Événement: ${data.description}`,
                        time: data.date.toDate(),
                        icon: 'fas fa-calendar-plus'
                    });
                }
            });
        } catch (error) {
            console.log('Note: Could not load recent events');
        }

        // Sort by time and return latest 6
        return recentItems
            .sort((a, b) => b.time - a.time)
            .slice(0, 6);

    } catch (error) {
        console.error('❌ Error getting recent activity:', error);
        return [];
    }
}

// Update statistics display
function updateStatistics() {
    console.log('📊 Dashboard: Updating statistics display with data:', dashboardData);
    
    const elements = {
        totalMembers: document.getElementById('totalMembers'),
        totalEvents: document.getElementById('totalEvents'),
        totalAvatars: document.getElementById('totalAvatars'),
        recentActivity: document.getElementById('recentActivity')
    };
    
    // Check if elements exist
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            console.error(`❌ Dashboard: Element ${key} not found in DOM`);
        } else {
            console.log(`✅ Dashboard: Updating ${key} to ${dashboardData[key]}`);
        }
    });
    
    if (elements.totalMembers) elements.totalMembers.textContent = dashboardData.totalMembers;
    if (elements.totalEvents) elements.totalEvents.textContent = dashboardData.totalEvents;
    if (elements.totalAvatars) elements.totalAvatars.textContent = dashboardData.totalAvatars;
    if (elements.recentActivity) elements.recentActivity.textContent = dashboardData.recentActivity;

    // Add animation effect
    animateNumbers();
}

// Update recent activity display
function updateRecentActivity() {
    const container = document.getElementById('recentActivityList');
    
    if (dashboardData.recentItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-info-circle"></i>
                <p>Aucune activité récente trouvée</p>
            </div>
        `;
        return;
    }

    container.innerHTML = dashboardData.recentItems.map(item => `
        <div class="activity-item">
            <div class="activity-icon ${item.type}">
                <i class="${item.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${item.title}</div>
                <div class="activity-time">${formatRelativeTime(item.time)}</div>
            </div>
        </div>
    `).join('');
}

// Animate numbers counting up - MOBILE OPTIMIZED
function animateNumbers() {
    // MOBILE OPTIMIZATION: Use centralized device detection
    const isMobileDevice = window.DeviceUtils?.isMobileDevice || false;
    
    const counters = [
        { element: document.getElementById('totalMembers'), target: dashboardData.totalMembers },
        { element: document.getElementById('totalEvents'), target: dashboardData.totalEvents },
        { element: document.getElementById('totalAvatars'), target: dashboardData.totalAvatars },
        { element: document.getElementById('recentActivity'), target: dashboardData.recentActivity }
    ];

    if (isMobileDevice) {
        // Mobile: Just set the values directly without animation for better performance
        console.log('📱 Dashboard: Mobile device - skipping number animations');
        counters.forEach(counter => {
            if (counter.element) {
                counter.element.textContent = counter.target;
            }
        });
    } else {
        // Desktop: Use animations
        counters.forEach(counter => {
            if (counter.target === 0) return;
            
            let current = 0;
            const increment = Math.ceil(counter.target / 20);
            const timer = setInterval(() => {
                current += increment;
                if (current >= counter.target) {
                    current = counter.target;
                    clearInterval(timer);
                }
                if (counter.element) {
                    counter.element.textContent = current;
                }
            }, 50);
        });
    }
}

// Format relative time (e.g., "il y a 2 heures")
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
        return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
        return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString('fr-FR');
    }
}

// OPTIMIZED: Load user statistics for admin dashboard (async, non-blocking)
async function loadUserStatistics() {
    try {
        console.log('📊 Loading user statistics...');
        const usersSnapshot = await window.db.collection('users').get();
        dashboardData.totalUsers = usersSnapshot.size;
        
        let pendingCount = 0;
        let activeCount = 0;
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.status === 'pending') {
                pendingCount++;
            } else if (userData.status === 'approved' || userData.status === 'active') {
                activeCount++;
            }
        });
        
        dashboardData.pendingUsers = pendingCount;
        dashboardData.activeUsers = activeCount;
        
        // Update UI immediately when data is loaded
        updateUserStatistics();
        console.log('✅ User statistics loaded');
        
    } catch (error) {
        console.error('❌ Error loading user statistics:', error);
        dashboardData.totalUsers = 0;
        dashboardData.pendingUsers = 0;
        dashboardData.activeUsers = 0;
        // Still update UI even with zeros
        updateUserStatistics();
    }
}

// Update user statistics display
function updateUserStatistics() {
    document.getElementById('totalUsers').textContent = dashboardData.totalUsers;
    document.getElementById('pendingUsers').textContent = dashboardData.pendingUsers;
    document.getElementById('activeUsers').textContent = dashboardData.activeUsers;
}

// Show error message
function showErrorMessage(message) {
    const container = document.querySelector('.dashboard-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    container.insertBefore(errorDiv, container.firstChild);
}

// Setup logout functionality for the dashboard
function setupLogoutHandler() {
    const authLink = document.getElementById('authLink');
    if (authLink) {
        console.log('✅ Dashboard: Setting up logout handler');
        
        // Add logout click handler
        authLink.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('🔓 Dashboard: Logout clicked');
            
            try {
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
                    await window.auth.signOut();
                }
                
                console.log('✅ Dashboard: Complete logout successful');
                
                // Redirect to login page
                window.location.href = '/login.html';
            } catch (error) {
                console.error('❌ Dashboard: Logout error:', error);
                alert('Erreur lors de la déconnexion: ' + error.message);
            }
        });
        
        console.log('✅ Dashboard: Logout handler setup complete');
    } else {
        console.log('⚠️ Dashboard: Auth link not found');
    }
} 