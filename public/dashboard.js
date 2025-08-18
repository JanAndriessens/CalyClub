// Simple Dashboard JavaScript - COPIED APPROACH FROM WORKING MEMBRES.JS
console.log('📊 Dashboard: Starting initialization...');

let dashboardInitialized = false;

// Wait for Firebase to be available - SAME PATTERN AS MEMBRES
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard: DOM loaded, waiting for Firebase...');
    
    try {
        // Wait for Firebase services to be available - SAME AS MEMBRES
        await waitForFirebaseServices();
        
        console.log('📊 Dashboard: Firebase services ready, loading data...');
        
        // Load dashboard statistics
        await loadDashboardStats();
        
        console.log('📊 Dashboard: Initialization complete!');
        dashboardInitialized = true;
        
    } catch (error) {
        console.error('📊 Dashboard: Initialization failed:', error);
        showDashboardError('Erreur lors du chargement du tableau de bord: ' + error.message);
    }
});

// Wait for Firebase services - COPIED PATTERN FROM MEMBRES
async function waitForFirebaseServices() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkServices = () => {
            attempts++;
            console.log(`📊 Dashboard: Checking Firebase services (attempt ${attempts}/${maxAttempts})`);
            
            if (window.db && window.auth && typeof firebase !== 'undefined') {
                console.log('📊 Dashboard: All Firebase services available!');
                resolve();
                return;
            }
            
            if (attempts >= maxAttempts) {
                reject(new Error('Firebase services not available after ' + maxAttempts + ' attempts'));
                return;
            }
            
            setTimeout(checkServices, 200);
        };
        
        checkServices();
    });
}

// Load dashboard statistics - SIMPLE APPROACH LIKE MEMBRES
async function loadDashboardStats() {
    console.log('📊 Dashboard: Loading statistics...');
    
    try {
        // Get members count
        console.log('📊 Dashboard: Fetching members...');
        const membersSnapshot = await window.db.collection('membres').get();
        const membersCount = membersSnapshot.size;
        updateStatElement('totalMembers', membersCount);
        console.log('📊 Dashboard: Members count:', membersCount);
        
        // Get events count
        console.log('📊 Dashboard: Fetching events...');
        const eventsSnapshot = await window.db.collection('events').get();
        const eventsCount = eventsSnapshot.size;
        updateStatElement('totalEvents', eventsCount);
        console.log('📊 Dashboard: Events count:', eventsCount);
        
        // Get avatars count
        console.log('📊 Dashboard: Fetching avatars...');
        const avatarsSnapshot = await window.db.collection('avatars').get();
        const avatarsCount = avatarsSnapshot.size;
        updateStatElement('totalAvatars', avatarsCount);
        console.log('📊 Dashboard: Avatars count:', avatarsCount);
        
        // Update recent activity placeholder
        updateStatElement('recentActivity', 0);
        
        // Update recent activity list
        const recentActivityList = document.getElementById('recentActivityList');
        if (recentActivityList) {
            recentActivityList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-check-circle"></i>
                    <p>Données chargées avec succès!</p>
                    <small>Membres: ${membersCount} | Événements: ${eventsCount} | Avatars: ${avatarsCount}</small>
                </div>
            `;
        }
        
        console.log('📊 Dashboard: All statistics loaded successfully!');
        
    } catch (error) {
        console.error('📊 Dashboard: Error loading statistics:', error);
        throw error;
    }
}

// Update a statistic element
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        console.log(`📊 Dashboard: Updated ${elementId} to ${value}`);
        
        // Add a simple animation
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    } else {
        console.warn(`📊 Dashboard: Element ${elementId} not found`);
    }
}

// Show dashboard error
function showDashboardError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `;
    
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    }
}

console.log('📊 Dashboard: Module loaded and ready');