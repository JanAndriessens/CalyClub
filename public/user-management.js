// User Management JavaScript for CalyBase
console.log('🔧 User Management: Loading module...');

// Simple initialization guard  
if (!window.userManagementInitialized) {
    window.userManagementInitialized = true;
    console.log('🔧 User Management: Initializing for the first time...');

// User management data store
let userManagementData = {
    allUsers: [],
    pendingUsers: [],
    filteredUsers: [],
    currentUser: null,
    currentUserRole: null,
    statistics: { total: 0, pending: 0, active: 0, suspended: 0 }
};

// Translate status values to French
function translateStatus(status) {
    const translations = {
        'pending': 'en attente',
        'active': 'actif',
        'suspended': 'suspendu',
        'rejected': 'refusé',
        'unknown': 'inconnu'
    };
    return translations[status] || status;
}

// Get current user's role from Firestore
async function getCurrentUserRole() {
    try {
        const user = window.auth?.currentUser;
        if (!user) return null;
        
        if (userManagementData.currentUserRole) {
            return userManagementData.currentUserRole;
        }

        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userManagementData.currentUserRole = userData.role || 'user';
            console.log('👤 Current user role:', userManagementData.currentUserRole);
            return userManagementData.currentUserRole;
        }
        
        return 'user'; // Default role
    } catch (error) {
        console.error('❌ Error getting current user role:', error);
        return 'user'; // Fallback to user role
    }
}

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
                    if ((userData.role === 'admin' || userData.role === 'superAdmin') && userData.status === 'active') {
                        console.log('👑 User Management: Admin/SuperAdmin role found in Firestore:', userData.role);
                        isAdmin = true;
                    }
                }
            }
        } catch (firestoreError) {
            console.log('⚠️ User Management: Firestore check failed:', firestoreError.message);
        }
        
        // Method 2: Hardcoded admin emails (backup)
        if (!isAdmin) {
            const adminEmails = window.CONSTANTS?.SECURITY?.ADMIN_EMAILS || ['jan@andriessens.be', 'jan.andriessens@gmail.com', 'james.hughes@skynet.be'];
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
        const maxAttempts = window.CONSTANTS?.TIMEOUTS?.MAX_ATTEMPTS_DESKTOP || 30;
        
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
            
            setTimeout(checkFirebase, window.CONSTANTS?.TIMEOUTS?.CHECK_INTERVAL_DESKTOP || 100);
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
            const functionsUrl = 'https://us-central1-calybase.cloudfunctions.net/api/auth/firebase-users';
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

// Load pending users
async function loadPendingUsers() {
    try {
        console.log('🔍 User Management: Loading pending users...');
        
        // Filter from already loaded users for efficiency
        // Only show users with explicit pending status to avoid showing active users
        const pendingUsers = userManagementData.allUsers.filter(user => {
            const isPending = user.status === 'pending';
            console.log(`🔍 User ${user.email}: status=${user.status}, approved=${user.approved}, isPending=${isPending}`);
            return isPending;
        });
        
        console.log('📊 User Management: Found', pendingUsers.length, 'pending users');
        return pendingUsers;
        
    } catch (error) {
        console.error('❌ Error loading pending users:', error);
        return [];
    }
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
async function updateAllUsersList() {
    await updateFilteredUsersList();
}

// Update pending users display
function updatePendingUsersList() {
    const pendingList = document.getElementById('pendingUsersList');
    if (!pendingList) return;
    
    if (userManagementData.pendingUsers.length === 0) {
        pendingList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>Aucune demande en attente</h3>
                <p>Toutes les demandes d'accès ont été traitées.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    userManagementData.pendingUsers.forEach(user => {
        const createdDate = user.createdAt ? user.createdAt.toLocaleDateString('fr-FR') : 'Date inconnue';
        html += `
            <div class="pending-card">
                <div class="pending-header">
                    <div class="pending-email">${user.email}</div>
                    <div class="pending-date">Demande du ${createdDate}</div>
                </div>
                ${user.username ? `<p><strong>Nom d'utilisateur:</strong> ${user.username}</p>` : ''}
                <p><strong>Statut:</strong> <span class="status-badge ${user.status}">${translateStatus(user.status)}</span></p>
                <p><strong>Email vérifié:</strong> ${user.emailVerified ? 'Oui' : 'Non'}</p>
                ${user.source ? `<p><strong>Source:</strong> ${user.source}</p>` : ''}
                <div class="pending-actions">
                    <button class="btn btn-approve" onclick="approveUser('${user.uid}', '${user.email}')">
                        <i class="fas fa-check"></i>
                        <span class="btn-label">Approuver</span>
                    </button>
                    <button class="btn btn-reject" onclick="rejectUser('${user.uid}', '${user.email}')">
                        <i class="fas fa-times"></i>
                        <span class="btn-label">Refuser</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    pendingList.innerHTML = html;
}

// Setup basic event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', async (e) => {
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
                
                // Special handling for pending users tab
                if (tabId === 'pending') {
                    console.log('🔄 Refreshing pending users data...');
                    // Reload pending users from the already loaded data
                    userManagementData.pendingUsers = await loadPendingUsers();
                    updatePendingUsersList();
                }
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
        searchInput.addEventListener('input', () => filterUsers());
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', () => filterUsers());
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', () => filterUsers());
    }
}

// Filter users based on search and filters
async function filterUsers() {
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
    await updateFilteredUsersList();
}

// Update filtered users list
async function updateFilteredUsersList() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (userManagementData.filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun utilisateur trouvé</td></tr>';
        return;
    }
    
    // Get current user's role for delete button logic
    const currentUserRole = await getCurrentUserRole();
    const currentUserId = window.auth?.currentUser?.uid;
    
    userManagementData.filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Super admin hierarchy logic for delete button
        let showDeleteButton = false;
        
        if (currentUserRole === 'superAdmin') {
            // Super admins can delete anyone except themselves
            showDeleteButton = user.uid !== currentUserId;
        } else if (currentUserRole === 'admin') {
            // Regular admins can only delete regular users (not other admins or super admins)
            showDeleteButton = user.role === 'user' && user.uid !== currentUserId;
        } else {
            // Regular users cannot delete anyone
            showDeleteButton = false;
        }
        
        row.innerHTML = `
            <td>${user.username || '-'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge ${user.status}">${translateStatus(user.status)}</span></td>
            <td>${user.createdAt ? user.createdAt.toLocaleDateString('fr-FR') : '-'}</td>
            <td>${user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit btn-icon" data-action="edit" data-uid="${user.uid}" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${showDeleteButton ? `<button class="btn btn-reject btn-icon" data-action="delete" data-uid="${user.uid}" data-email="${user.email}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
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
        
        // Load all users first (required for pending users filter)
        console.log('🔍 User Management: Loading all users...');
        const allUsers = await loadAllUsers();
        userManagementData.allUsers = allUsers;
        userManagementData.filteredUsers = allUsers;
        
        // Then filter pending users from the loaded data
        console.log('🔍 User Management: Filtering pending users...');
        const pendingUsers = await loadPendingUsers();
        userManagementData.pendingUsers = pendingUsers;

        calculateStatistics();
        updateStatistics();
        await updateAllUsersList();
        updatePendingUsersList();
        
        console.log('✅ User Management: Data loading complete');

    } catch (error) {
        console.error('❌ Error loading user data:', error);
        alert('Erreur lors du chargement des données utilisateurs: ' + error.message);
    }
}

// MAIN INITIALIZATION FUNCTION
async function initUserManagement() {
    // Simple initialization check
    if (window.userManagementReady) {
        console.log('🛑 User Management: Already initialized, aborting');
        return;
    }
    
    console.log('🚀 User Management: Starting initialization...');
    
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
        window.userManagementReady = true;
        console.log('🎉 User Management: Initialization complete!');
        
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
                role: ['jan@andriessens.be', 'jan.andriessens@gmail.com', 'james.hughes@skynet.be'].includes(currentUser.email) ? 'admin' : 'user',
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

// Function to specifically fix James Hughes account
window.fixJamesHughesAccount = async function() {
    try {
        console.log('🔧 FIXING: James Hughes account (mURyItwdB4VPe8gDOjd5dfIrYV33)...');
        
        const jamesUID = 'mURyItwdB4VPe8gDOjd5dfIrYV33';
        const jamesEmail = 'james.hughes@skynet.be';
        
        const userDocRef = window.db.collection('users').doc(jamesUID);
        const userDoc = await userDocRef.get();
        
        if (userDoc.exists) {
            console.log('📋 Existing document found, updating role to admin...');
            await userDocRef.update({
                role: 'admin',
                status: 'active',
                approved: true,
                approvalDate: firebase.firestore.FieldValue.serverTimestamp(),
                approvedBy: 'manual-fix',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ James Hughes updated to admin successfully!');
        } else {
            console.log('❌ Creating missing Firestore document for James Hughes...');
            const userData = {
                email: jamesEmail,
                username: null,
                role: 'admin',
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                uid: jamesUID,
                emailVerified: false,
                approved: true,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                approvalDate: firebase.firestore.FieldValue.serverTimestamp(),
                approvedBy: 'manual-fix'
            };
            
            await userDocRef.set(userData);
            console.log('✅ James Hughes Firestore document created as admin successfully!');
        }
        
        // Reload the user management data
        await loadAllData();
        console.log('✅ User management data reloaded');
        
    } catch (error) {
        console.error('❌ Error fixing James Hughes account:', error);
        alert('Error fixing James Hughes account: ' + error.message);
    }
};

console.log('🔧 DEBUG: debugCreateUsers() function available in console');

// SINGLE INITIALIZATION TRIGGER - BULLETPROOF
// Use a longer delay to ensure ALL other scripts have loaded
setTimeout(() => {
    console.log('⏰ User Management: Initialization timer triggered');
    initUserManagement();
}, 1000); // Increased delay to avoid conflicts 

window.editUser = async function(uid) {
    // Find the user data
    const user = userManagementData.allUsers.find(u => u.uid === uid);
    if (!user) {
        alert('Utilisateur non trouvé');
        return;
    }

    console.log('✏️ Editing user:', user);

    // Get current user's role to determine available options
    const currentUserRole = await getCurrentUserRole();
    
    // Populate the edit modal
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserUsername').value = user.username || '';
    document.getElementById('editUserStatus').value = user.status || 'active';

    // Dynamically populate role dropdown based on current user's permissions
    const roleSelect = document.getElementById('editUserRole');
    roleSelect.innerHTML = ''; // Clear existing options
    
    // Always allow user role
    roleSelect.innerHTML += '<option value="user">Utilisateur</option>';
    
    // Only admins and superAdmins can assign admin role
    if (currentUserRole === 'admin' || currentUserRole === 'superAdmin') {
        roleSelect.innerHTML += '<option value="admin">Administrateur</option>';
    }
    
    // Only superAdmins can assign superAdmin role
    if (currentUserRole === 'superAdmin') {
        roleSelect.innerHTML += '<option value="superAdmin">Super Administrateur</option>';
    }
    
    // Set the current user's role
    roleSelect.value = user.role || 'user';

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

                // Validate role assignment permissions
                const currentUserRole = await getCurrentUserRole();
                
                // Prevent unauthorized role assignments
                if (role === 'superAdmin' && currentUserRole !== 'superAdmin') {
                    alert('❌ Erreur: Seuls les Super Administrateurs peuvent assigner le rôle Super Administrateur');
                    return;
                }
                
                if (role === 'admin' && currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
                    alert('❌ Erreur: Seuls les Administrateurs et Super Administrateurs peuvent assigner le rôle Administrateur');
                    return;
                }

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

// Approve a pending user
window.approveUser = async function(uid, email) {
    try {
        console.log(`✅ Approving user: ${email} (${uid})`);
        
        const userRef = window.db.collection('users').doc(uid);
        const updateData = {
            status: 'active',
            approved: true,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: window.auth.currentUser.uid
        };
        
        await userRef.update(updateData);
        
        console.log('✅ User approved successfully');
        alert(`✅ Utilisateur ${email} approuvé avec succès!`);
        
        // Reload data to refresh all displays
        await loadAllData();
        
    } catch (error) {
        console.error('❌ Error approving user:', error);
        alert(`❌ Erreur lors de l'approbation: ${error.message}`);
    }
};

// Reject a pending user
window.rejectUser = async function(uid, email) {
    // Show rejection reason modal
    const rejectionModal = document.getElementById('rejectionModal');
    const confirmButton = document.getElementById('confirmRejection');
    const reasonTextarea = document.getElementById('rejectionReason');
    
    if (!rejectionModal) {
        // Fallback if modal doesn't exist
        if (!confirm(`Êtes-vous sûr de vouloir refuser l'accès à ${email}?`)) {
            return;
        }
        await performRejection(uid, email, 'Accès refusé par l\'administrateur');
        return;
    }
    
    // Clear previous reason
    reasonTextarea.value = '';
    
    // Show modal
    rejectionModal.style.display = 'block';
    
    // Handle confirmation
    const handleConfirmation = async () => {
        const reason = reasonTextarea.value.trim() || 'Accès refusé par l\'administrateur';
        await performRejection(uid, email, reason);
        rejectionModal.style.display = 'none';
        confirmButton.removeEventListener('click', handleConfirmation);
    };
    
    confirmButton.addEventListener('click', handleConfirmation);
};

// Perform the actual rejection
async function performRejection(uid, email, reason) {
    try {
        console.log(`❌ Rejecting user: ${email} (${uid}) - Reason: ${reason}`);
        
        const userRef = window.db.collection('users').doc(uid);
        const updateData = {
            status: 'rejected',
            approved: false,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: window.auth.currentUser.uid,
            rejectionReason: reason
        };
        
        await userRef.update(updateData);
        
        console.log('❌ User rejected successfully');
        alert(`❌ Accès refusé pour ${email}`);
        
        // Reload data to refresh all displays
        await loadAllData();
        
    } catch (error) {
        console.error('❌ Error rejecting user:', error);
        alert(`❌ Erreur lors du refus: ${error.message}`);
    }
}

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
        
        // Use Firebase Functions API endpoint
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiUrl = isLocalhost 
            ? 'http://localhost:3001/api/auth/delete-user'
            : 'https://us-central1-calybase.cloudfunctions.net/api/auth/delete-user';
        
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

} else {
    console.log('🛑 User Management: Already initialized, skipping');
}
