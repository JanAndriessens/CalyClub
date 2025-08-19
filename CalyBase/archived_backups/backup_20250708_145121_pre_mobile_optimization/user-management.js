// User Management JavaScript for CalyBase - BULLETPROOF SINGLE INITIALIZATION
console.log('🔧 User Management: Loading module...');

// Global singleton to prevent multiple initialization
window.USER_MANAGEMENT_SINGLETON = window.USER_MANAGEMENT_SINGLETON || {
    isInitialized: false,
    isInitializing: false,
    hasTriedInit: false
};

// Prevent ANY possibility of multiple initialization
if (window.USER_MANAGEMENT_SINGLETON.hasTriedInit) {
    console.log('🛑 User Management: Module already loaded, skipping re-initialization');
    throw new Error('User management already initialized'); // Stop execution completely
}

console.log('✅ User Management: First load, proceeding with initialization');
window.USER_MANAGEMENT_SINGLETON.hasTriedInit = true;

// User management data store
let userManagementData = {
    allUsers: [],
    pendingUsers: [],
    filteredUsers: [],
    currentUser: null,
    statistics: { total: 0, pending: 0, active: 0, suspended: 0 }
};

// SECURITY: Check if current user has admin permissions
async function checkAdminPermissions() {
    try {
        console.log('🔍 User Management: Starting admin permissions check...');
        
        const user = window.auth?.currentUser;
        if (!user) {
            console.log('❌ User Management: No user logged in');
            throw new Error('Aucun utilisateur connecté');
        }

        console.log('🔍 User Management: Checking admin permissions for:', user.email);
        let isAdmin = false;
        
        // Method 1: Check Firestore user document FIRST (most reliable)
        try {
            if (window.db) {
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                console.log('🔍 User Management: Firestore query completed');
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log('🔍 User Management: Firestore user data:', userData);
                    if (userData.role === 'admin' && userData.status === 'active') {
                        console.log('👑 User Management: Admin role found in Firestore');
                        isAdmin = true;
                    }
                }
            }
        } catch (firestoreError) {
            console.log('⚠️ User Management: Firestore check failed:', firestoreError.message);
        }
        
        // Method 2: Hardcoded admin emails (backup)
        if (!isAdmin) {
            const adminEmails = ['jan@andriessens.be', 'jan.andriessens@gmail.com'];
            const trimmedEmail = user.email?.trim().toLowerCase();
            const normalizedAdminEmails = adminEmails.map(e => e.trim().toLowerCase());
            
            if (normalizedAdminEmails.includes(trimmedEmail)) {
                console.log('👑 User Management: Admin email recognized (hardcoded list)');
                isAdmin = true;
            }
        }
        
        console.log('🔍 User Management: Final admin status:', isAdmin);
        
        if (!isAdmin) {
            console.log('❌ User Management: Access denied - not an admin');
            throw new Error('Accès refusé : permissions administrateur requises');
        }

        console.log('✅ User Management: Admin permissions confirmed');
        return true;
        
    } catch (error) {
        console.error('❌ User Management: Admin check failed:', error);
        alert('Accès refusé. Vous devez être administrateur pour accéder à cette page.');
        window.location.href = '/index.html';
        throw error;
    }
}

// Wait for Firebase to be ready
async function waitForFirebaseReady() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // REDUCED: 3 seconds instead of 5
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0 && 
                window.db && 
                window.auth) {
                console.log('✅ User Management: Firebase services ready');
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.warn('⚠️ User Management: Firebase timeout (3s)');
                resolve(false); // Return false for timeout
                return;
            }
            
            setTimeout(checkFirebase, 100);
        };
        
        checkFirebase();
    });
}

// Wait for Firebase Auth state to be ready
async function waitForAuthState() {
    return new Promise((resolve, reject) => {
        console.log('🔄 User Management: Waiting for authentication state...');
        
        let resolved = false; // Prevent multiple resolve/reject calls
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds
        
        const safeResolve = () => {
            if (!resolved) {
                resolved = true;
                resolve(true);
            }
        };
        
        const safeReject = (error) => {
            if (!resolved) {
                resolved = true;
                reject(error);
            }
        };
        
        const checkAuth = () => {
            if (resolved) return; // Stop if already resolved
            
            attempts++;
            
            if (window.auth && window.auth.currentUser !== undefined) {
                const user = window.auth.currentUser;
                if (user) {
                    console.log('✅ User Management: User authenticated via polling:', user.email);
                    safeResolve();
                } else {
                    console.log('❌ User Management: No user authenticated via polling');
                    safeReject(new Error('Aucun utilisateur connecté'));
                }
                return;
            }
            
            if (attempts >= maxAttempts) {
                const user = window.auth?.currentUser;
                if (user) {
                    console.log('✅ User Management: User found after timeout:', user.email);
                    safeResolve();
                } else {
                    console.log('❌ User Management: No user found after timeout');
                    safeReject(new Error('Timeout waiting for authentication state'));
                }
                return;
            }
            
            setTimeout(checkAuth, 100);
        };
        
        // Use Firebase Auth state listener if available
        if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
            console.log('🔄 User Management: Using Firebase Auth state listener...');
            let unsubscribe;
            
            unsubscribe = window.auth.onAuthStateChanged((user) => {
                console.log('🔄 User Management: Auth state changed:', user ? user.email : 'no user');
                
                if (unsubscribe) {
                    unsubscribe(); // Only listen once
                    unsubscribe = null;
                }
                
                if (user) {
                    console.log('✅ User Management: User authenticated via listener:', user.email);
                    safeResolve();
                } else {
                    console.log('❌ User Management: No user authenticated via listener');
                    safeReject(new Error('Aucun utilisateur connecté'));
                }
            });
            
            // Fallback polling only if listener doesn't respond quickly
            setTimeout(() => {
                if (!resolved) {
                    console.log('⏰ User Management: Auth listener timeout, trying polling...');
                    checkAuth();
                }
            }, 2000);
        } else {
            console.log('🔄 User Management: Firebase Auth not available, using polling method...');
            checkAuth();
        }
    });
}

// Load all Firebase Auth users via API
async function loadAllUsers() {
    try {
        console.log('🔍 User Management: Loading all Firebase Auth users via API...');
        
        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user for API call');
        }
        
        const token = await currentUser.getIdToken();
        
        // Try local Express server first, then fallback to Firebase Functions
        let apiUrl = '/api/auth/firebase-users';  // Local Express server
        
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Local API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ User Management: Local Express API successful');
            console.log('📊 User Management: Got', data.users.length, 'users from Firebase Auth');
            
            // Transform Firebase Auth data to match expected format
            const users = data.users.map(authUser => ({
                uid: authUser.uid,
                email: authUser.email,
                username: authUser.firestore?.username || null,
                role: authUser.displayRole || 'user',
                status: authUser.displayStatus || 'unknown',
                approved: authUser.firestore?.approved || false,
                emailVerified: authUser.emailVerified,
                disabled: authUser.disabled,
                createdAt: authUser.metadata?.creationTime ? new Date(authUser.metadata.creationTime) : null,
                lastLogin: authUser.metadata?.lastSignInTime ? new Date(authUser.metadata.lastSignInTime) : null,
                source: 'firebase-auth',
                hasFirestoreDoc: authUser.hasFirestoreDoc
            }));
            
            return users;
            
        } catch (localError) {
            console.log('⚠️ User Management: Local Express API failed, trying Firebase Functions...', localError.message);
            
            // Fallback to Firebase Functions
            const functionsUrl = 'https://api-eyszfnocva-uc.a.run.app/auth/firebase-users';
            const response = await fetch(functionsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ User Management: Firebase Functions API successful');
                console.log('📊 User Management: Got', data.users.length, 'users from Firebase Auth');
                
                // Transform Firebase Auth data to match expected format
                const users = data.users.map(authUser => ({
                    uid: authUser.uid,
                    email: authUser.email,
                    username: authUser.firestore?.username || null,
                    role: authUser.displayRole || 'user',
                    status: authUser.displayStatus || 'unknown',
                    approved: authUser.firestore?.approved || false,
                    emailVerified: authUser.emailVerified,
                    disabled: authUser.disabled,
                    createdAt: authUser.metadata?.creationTime ? new Date(authUser.metadata.creationTime) : null,
                    lastLogin: authUser.metadata?.lastSignInTime ? new Date(authUser.metadata.lastSignInTime) : null,
                    source: 'firebase-auth',
                    hasFirestoreDoc: authUser.hasFirestoreDoc
                }));
                
                return users;
            } else {
                throw new Error(`Firebase Functions API responded with status: ${response.status}`);
            }
        }
        
    } catch (error) {
        console.error('❌ User Management: All APIs failed:', error);
        console.log('🔄 User Management: Falling back to Firestore-only mode...');
        
        // Fallback to Firestore only
        try {
            const usersSnapshot = await window.db.collection('users').get();
            const users = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    email: data.email,
                    username: data.username || null,
                    role: data.role || 'user',
                    status: data.status || 'unknown',
                    approved: data.approved || false,
                    emailVerified: data.emailVerified || false,
                    disabled: false,
                    createdAt: data.createdAt?.toDate() || null,
                    lastLogin: data.lastLogin?.toDate() || null,
                    source: 'firestore-only'
                });
            });
            
            console.log('✅ User Management: Firestore fallback successful, got', users.length, 'users');
            return users;
            
        } catch (firestoreError) {
            console.error('❌ User Management: Firestore fallback also failed:', firestoreError);
            throw new Error('Failed to load users from all sources');
        }
    }
}

// Load pending users (simplified for now)
async function loadPendingUsers() {
    return []; // Simplified - no pending users for now
}

// Calculate statistics
function calculateStatistics() {
    const stats = {
        total: userManagementData.allUsers.length,
        pending: userManagementData.allUsers.filter(u => u.status === 'pending').length,
        active: userManagementData.allUsers.filter(u => u.status === 'active').length,
        suspended: userManagementData.allUsers.filter(u => u.status === 'suspended').length
    };
    userManagementData.statistics = stats;
    return stats;
}

// Update statistics display
function updateStatistics() {
    const stats = userManagementData.statistics;
    
    const elements = {
        total: document.getElementById('totalUsersCount'),
        pending: document.getElementById('pendingUsersCount'),
        active: document.getElementById('activeUsersCount'),
        suspended: document.getElementById('suspendedUsersCount')
    };
    
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            elements[key].textContent = stats[key] || 0;
        }
    });
}

// Update all users list
function updateAllUsersList() {
    updateFilteredUsersList();
}

// Setup basic event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active from all tabs
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab
            e.target.classList.add('active');
            const tabId = e.target.getAttribute('data-tab');
            const content = document.getElementById(tabId + '-tab');
            if (content) {
                content.classList.add('active');
                console.log('✅ Tab switched to:', tabId);
            } else {
                console.log('❌ Tab content not found for:', tabId + '-tab');
            }
        });
    });
    
    // Search and filter functionality
    const searchInput = document.getElementById('usersSearchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterUsers);
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', filterUsers);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterUsers);
    }
}

// Filter users based on search and filters
function filterUsers() {
    const searchTerm = document.getElementById('usersSearchInput')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const filteredUsers = userManagementData.allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.email.toLowerCase().includes(searchTerm) ||
            (user.username && user.username.toLowerCase().includes(searchTerm));
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    userManagementData.filteredUsers = filteredUsers;
    updateFilteredUsersList();
}

// Update filtered users list
function updateFilteredUsersList() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (userManagementData.filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun utilisateur trouvé</td></tr>';
        return;
    }
    
    userManagementData.filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username || '-'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge ${user.status}">${user.status}</span></td>
            <td>${user.createdAt ? user.createdAt.toLocaleDateString('fr-FR') : '-'}</td>
            <td>${user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : '-'}</td>
            <td>
                <button class="btn btn-edit" data-action="edit" data-uid="${user.uid}">
                    <i class="fas fa-edit"></i> <span class="btn-label">Modifier</span>
                </button>
                ${user.role !== 'admin' ? `<button class="btn btn-reject" data-action="delete" data-uid="${user.uid}" data-email="${user.email}">
                    <i class="fas fa-trash"></i> <span class="btn-label">Supprimer</span>
                </button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event delegation for edit and delete buttons
    tbody.onclick = function(event) {
        const target = event.target.closest('button');
        if (!target) return;
        const action = target.getAttribute('data-action');
        const uid = target.getAttribute('data-uid');
        if (action === 'edit') {
            window.editUser(uid);
        } else if (action === 'delete') {
            const email = target.getAttribute('data-email');
            window.deleteUser(uid, email);
        }
    };
}

// Load all data
async function loadAllData() {
    try {
        console.log('🔍 User Management: Starting data load...');
        
        const [allUsers, pendingUsers] = await Promise.all([
            loadAllUsers(),
            loadPendingUsers()
        ]);

        userManagementData.allUsers = allUsers;
        userManagementData.pendingUsers = pendingUsers;
        userManagementData.filteredUsers = allUsers;

        calculateStatistics();
        updateStatistics();
        updateAllUsersList();
        
        console.log('✅ User Management: Data loading complete');

    } catch (error) {
        console.error('❌ Error loading user data:', error);
        alert('Erreur lors du chargement des données utilisateurs: ' + error.message);
    }
}

// MAIN INITIALIZATION FUNCTION - BULLETPROOF SINGLE EXECUTION
async function initUserManagement() {
    // Triple-check to prevent any possibility of multiple execution
    if (window.USER_MANAGEMENT_SINGLETON.isInitialized || window.USER_MANAGEMENT_SINGLETON.isInitializing) {
        console.log('🛑 User Management: Already initialized or initializing, aborting');
        return;
    }
    
    window.USER_MANAGEMENT_SINGLETON.isInitializing = true;
    console.log('🚀 User Management: STARTING SINGLE INITIALIZATION...');
    
    try {
        // ⚡ OPTIMIZATION: Parallel initialization with reduced timeouts
        console.log('🚀 User Management: Starting optimized parallel initialization...');
        
        // ⚡ Start all checks in parallel with enhanced error handling
        const [firebaseReady, authReady] = await Promise.all([
            waitForFirebaseReady().catch(error => {
                console.warn('⚠️ Firebase check failed:', error);
                return false;
            }),
            waitForAuthState().catch(error => {
                console.warn('⚠️ Auth check failed:', error);
                return false;
            })
        ]);
        
        console.log('🔍 User Management: Readiness check results:', { firebaseReady, authReady });
        
        if (!firebaseReady) {
            throw new Error('Firebase n\'est pas disponible - veuillez rafraîchir la page');
        }
        
        if (!authReady) {
            throw new Error('Authentification requise - veuillez vous connecter');
        }
        
        // ⚡ Setup UI immediately
        console.log('🔧 User Management: Setting up event listeners...');
        setupEventListeners();
        console.log('✅ User Management: Event listeners setup complete');
        
        // ⚡ Check permissions first (critical for security)
        console.log('🔒 User Management: Checking admin permissions...');
        try {
            await checkAdminPermissions();
            console.log('✅ User Management: Admin permissions verified');
        } catch (permError) {
            console.error('❌ User Management: Admin permissions failed:', permError);
            throw new Error(`Permissions insuffisantes: ${permError.message || permError}`);
        }
        
        // ⚡ Load data (non-critical, can retry later)
        console.log('📊 User Management: Loading user data...');
        try {
            await loadAllData();
            console.log('✅ User Management: User data loaded successfully');
        } catch (dataError) {
            console.warn('⚠️ User Management: Data loading failed, will retry later:', dataError);
            // Don't fail initialization for data loading issues
        }
        
        console.log('✅ User Management: Parallel initialization complete');
        
        // Mark as completely initialized
        window.USER_MANAGEMENT_SINGLETON.isInitialized = true;
        console.log('🎉 User Management: INITIALIZATION COMPLETE - SUCCESS!');
        
    } catch (error) {
        console.error('❌ User Management: Initialization failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cause: error.cause
        });
        
        const errorMessage = error.message || error.toString() || 'Erreur inconnue';
        console.error('❌ Final error message:', errorMessage);
        
        alert(`Erreur lors de l'initialisation: ${errorMessage}\n\nVérifiez la console pour plus de détails.`);
    } finally {
        window.USER_MANAGEMENT_SINGLETON.isInitializing = false;
    }
}

// Debug functions
window.debugCreateUsers = async function() {
    try {
        console.log('🔧 DEBUG: Creating user documents for existing Firebase Auth users...');
        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            console.log('❌ No user logged in');
            return;
        }
        
        const userDocRef = window.db.collection('users').doc(currentUser.uid);
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists) {
            const userData = {
                email: currentUser.email,
                role: ['jan@andriessens.be', 'jan.andriessens@gmail.com'].includes(currentUser.email) ? 'admin' : 'user',
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: currentUser.emailVerified,
                approved: true
            };
            
            await userDocRef.set(userData);
            console.log('✅ User document created successfully!');
            await loadAllData(); // Reload data
        } else {
            console.log('✅ User document already exists:', userDoc.data());
        }
    } catch (error) {
        console.error('❌ Error creating user documents:', error);
    }
};

console.log('🔧 DEBUG: debugCreateUsers() function available in console');

// SINGLE INITIALIZATION TRIGGER - BULLETPROOF
// Use a longer delay to ensure ALL other scripts have loaded
setTimeout(() => {
    console.log('⏰ User Management: Initialization timer triggered');
    initUserManagement();
}, 1000); // Increased delay to avoid conflicts 

window.editUser = function(uid) {
    // Find the user data
    const user = userManagementData.allUsers.find(u => u.uid === uid);
    if (!user) {
        alert('Utilisateur non trouvé');
        return;
    }

    console.log('✏️ Editing user:', user);

    // Populate the edit modal
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserUsername').value = user.username || '';
    document.getElementById('editUserRole').value = user.role || 'user';
    document.getElementById('editUserStatus').value = user.status || 'active';

    // Store the UID in the modal for later use
    const modal = document.getElementById('editUserModal');
    modal.dataset.userId = uid;

    // Show the modal
    modal.style.display = 'block';
};

// Handle edit user form submission
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editUserForm');
    const editModal = document.getElementById('editUserModal');
    
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uid = editModal.dataset.userId;
            if (!uid) {
                alert('Erreur: ID utilisateur manquant');
                return;
            }

            try {
                const username = document.getElementById('editUserUsername').value.trim();
                const role = document.getElementById('editUserRole').value;
                const status = document.getElementById('editUserStatus').value;

                console.log('💾 Saving user changes:', { uid, username, role, status });

                // Update user in Firestore
                const userRef = window.db.collection('users').doc(uid);
                const updateData = {
                    role: role,
                    status: status,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                    modifiedBy: window.auth.currentUser.uid
                };

                // Only update username if it's provided and valid
                if (username && username.length >= 3) {
                    updateData.username = username;
                }

                await userRef.update(updateData);
                
                console.log('✅ User updated successfully');
                alert('✅ Utilisateur mis à jour avec succès!');

                // Close modal
                editModal.style.display = 'none';

                // Reload user list
                await loadAllData();

            } catch (error) {
                console.error('❌ Error updating user:', error);
                alert(`❌ Erreur lors de la mise à jour: ${error.message}`);
            }
        });
    }

    // Handle modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Handle modal background click to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});

window.deleteUser = async function(uid, email) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur: ${email}?\n\nCette action est irréversible et supprimera:\n- Le compte Firebase Auth\n- Le document Firestore (si existant)`)) {
        return;
    }

    try {
        console.log(`🗑️ Deleting user: ${email} (${uid})`);
        
        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            throw new Error('Aucun utilisateur connecté pour effectuer cette action');
        }

        const token = await currentUser.getIdToken();
        
        // Determine the correct API URL based on the current domain
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiUrl = isLocalhost 
            ? 'http://localhost:3001/api/auth/delete-user'
            : 'https://api-eyszfnocva-uc.a.run.app/auth/delete-user';
        
        console.log(`🌐 Current hostname: ${window.location.hostname}`);
        console.log(`🌐 Is localhost: ${isLocalhost}`);
        console.log(`🌐 Using API URL: ${apiUrl}`);
        console.log(`🔄 Cache-buster: v20250704_170000`);
        
        // Call the delete user API (using POST due to Cloud Run DELETE restrictions)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: uid,
                userEmail: email
            })
        });

        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response headers:`, response.headers);

        if (!response.ok) {
            // Try to get the response text to see what we're actually getting
            const responseText = await response.text();
            console.error('❌ Response text:', responseText);
            
            // Try to parse as JSON if possible
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Could not parse response as JSON:', parseError);
                throw new Error(`Erreur API: ${response.status} - Réponse non-JSON reçue`);
            }
            
            throw new Error(errorData.error || `Erreur API: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ User deleted successfully:', result);
        
        // Show success message
        alert(`✅ Utilisateur ${email} supprimé avec succès!`);
        
        // Reload the user list to reflect changes
        await loadAllData();
        
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        alert(`❌ Erreur lors de la suppression: ${error.message}`);
    }
};
