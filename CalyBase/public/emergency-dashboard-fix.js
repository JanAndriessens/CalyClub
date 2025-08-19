// Emergency Dashboard Fix - Bypasses loading issues
// This will work regardless of deployment state

console.log('🚨 EMERGENCY DASHBOARD FIX: Starting...');

// Wait for DOM and then try to initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚨 Emergency Fix: DOM loaded, checking Firebase availability...');
    
    // Simple retry mechanism
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds
    
    function checkAndInitialize() {
        attempts++;
        console.log(`🚨 Emergency Fix: Attempt ${attempts}/${maxAttempts}`);
        
        // Check what's available
        const available = {
            firebase: typeof firebase !== 'undefined',
            firebaseManager: typeof window.FirebaseManager !== 'undefined',
            db: typeof window.db !== 'undefined',
            auth: typeof window.auth !== 'undefined'
        };
        
        console.log('🚨 Emergency Fix: Availability check:', available);
        
        // If we have the old system (direct Firebase), use it
        if (available.firebase && available.db) {
            console.log('🚨 Emergency Fix: Using direct Firebase access');
            initializeDashboardEmergency();
            return;
        }
        
        // If we have the new FirebaseManager system, use it
        if (available.firebaseManager && window.FirebaseManager.isInitialized) {
            console.log('🚨 Emergency Fix: Using FirebaseManager');
            const services = window.FirebaseManager.services;
            initializeDashboardEmergency(services);
            return;
        }
        
        // If Firebase is available but not initialized, wait for it
        if (available.firebase && !available.db) {
            console.log('🚨 Emergency Fix: Firebase available but not initialized, waiting...');
        }
        
        // Retry if we haven't exceeded max attempts
        if (attempts < maxAttempts) {
            setTimeout(checkAndInitialize, 500);
        } else {
            console.error('🚨 Emergency Fix: Timeout - showing error to user');
            showEmergencyError();
        }
    }
    
    // Start checking
    setTimeout(checkAndInitialize, 1000); // Give page a second to load
});

async function initializeDashboardEmergency(services = null) {
    try {
        console.log('🚨 Emergency Fix: Initializing dashboard...');
        
        // Use provided services or fallback to global
        const db = services?.db || window.db;
        const auth = services?.auth || window.auth;
        
        if (!db) {
            throw new Error('No database connection available');
        }
        
        // Simple stats loading
        console.log('🚨 Emergency Fix: Loading member count...');
        const membersSnapshot = await db.collection('membres').get();
        const memberCount = membersSnapshot.size;
        
        console.log('🚨 Emergency Fix: Loading events count...');
        const eventsSnapshot = await db.collection('events').get();
        const eventCount = eventsSnapshot.size;
        
        console.log('🚨 Emergency Fix: Loading avatars count...');
        const avatarsSnapshot = await db.collection('avatars').get();
        const avatarCount = avatarsSnapshot.size;
        
        // Update UI
        console.log('🚨 Emergency Fix: Updating dashboard display...');
        updateDashboardStats(memberCount, eventCount, avatarCount);
        
        console.log('🚨 Emergency Fix: Dashboard initialized successfully!');
        
    } catch (error) {
        console.error('🚨 Emergency Fix: Dashboard initialization failed:', error);
        showEmergencyError(error.message);
    }
}

function updateDashboardStats(members, events, avatars) {
    const elementsToUpdate = {
        'totalMembers': members,
        'totalEvents': events, 
        'totalAvatars': avatars,
        'recentActivity': 0 // Will be updated separately
    };
    
    Object.entries(elementsToUpdate).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`🚨 Emergency Fix: Updated ${id} to ${value}`);
        } else {
            console.warn(`🚨 Emergency Fix: Element ${id} not found`);
        }
    });
    
    // Remove loading spinners
    const recentActivityList = document.getElementById('recentActivityList');
    if (recentActivityList) {
        recentActivityList.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Activité récente chargée</div>';
    }
}

function showEmergencyError(message = 'Impossible de charger les données') {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; 
        background: #ff4444; color: white; padding: 15px; 
        text-align: center; z-index: 10000; font-weight: bold;
    `;
    errorDiv.innerHTML = `
        ⚠️ Erreur de chargement du tableau de bord<br>
        <small>${message}</small>
    `;
    document.body.appendChild(errorDiv);
}

console.log('🚨 EMERGENCY DASHBOARD FIX: Module loaded');