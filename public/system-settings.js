// System Settings UI Management for CalyBase
let systemSettingsData = {
    config: null,
    currentTab: 'security',
    hasUnsavedChanges: false
};

// Initialize system settings when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔧 System Settings: Initializing...');
        
        // Wait for Firebase and system config to be ready
        await waitForFirebaseReady();
        await waitForSystemConfig();
        
        // Check permissions
        await checkSystemConfigPermissions();
        
        // Load settings
        await loadSystemSettings();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log('✅ System Settings: Initialization complete');
        
    } catch (error) {
        console.error('❌ System Settings: Error during initialization:', error);
        showErrorMessage('Échec de l\'initialisation des paramètres système: ' + error.message);
    }
});

// Wait for system config to be ready
async function waitForSystemConfig() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('System config initialization timeout'));
        }, 3000); // FIXED: 3 seconds instead of 30 seconds
        
        const checkConfig = () => {
            if (window.systemConfig && window.systemConfig.initialized) {
                clearTimeout(timeout);
                resolve();
            } else {
                setTimeout(checkConfig, 100);
            }
        };
        
        checkConfig();
    });
}

// Check if user has permission to modify system configuration
async function checkSystemConfigPermissions() {
    try {
        const user = window.auth?.currentUser;
        if (!user) {
            throw new Error('Aucun utilisateur connecté');
        }

        // Get user role from Firestore
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            throw new Error('Document utilisateur non trouvé');
        }

        const userData = userDoc.data();
        const userRole = userData.role;
        
        // For now, allow admin and superAdmin roles
        const allowedRoles = ['admin', 'superAdmin'];
        
        if (!allowedRoles.includes(userRole)) {
            throw new Error('Permissions insuffisantes pour accéder à la configuration système');
        }
        
        console.log('✅ System config permissions verified for role:', userRole);
        
    } catch (error) {
        console.error('❌ Permission check failed:', error);
        alert('Accès refusé: Vous n\'avez pas l\'autorisation de modifier la configuration système.');
        window.location.href = '/user-management.html';
        throw error;
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        console.log('📄 Loading system settings...');
        
        systemSettingsData.config = window.systemConfig.getConfig();
        
        if (!systemSettingsData.config) {
            throw new Error('Aucune configuration disponible');
        }
        
        // Update UI with current settings
        populateSettings();
        updateConfigStatus();
        
        console.log('✅ System settings loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading system settings:', error);
        throw error;
    }
}

// Populate settings in UI
function populateSettings() {
    const config = systemSettingsData.config;
    
    if (!config) return;
    
    try {
        // Security Settings
        setInputValue('sessionTimeoutMinutes', config.security?.sessionTimeoutMinutes);
        setInputValue('warningTimeoutMinutes', config.security?.warningTimeoutMinutes);
        setInputValue('maxFailedLogins', config.security?.maxFailedLogins);
        setCheckboxValue('requireEmailVerification', config.security?.requireEmailVerification);
        setCheckboxValue('requireStrongPasswords', config.security?.requireStrongPasswords);
        
        // User Management Settings
        setSelectValue('defaultUserRole', config.userManagement?.defaultUserRole);
        setCheckboxValue('allowSelfRegistration', config.userManagement?.allowSelfRegistration);
        setCheckboxValue('requireAdminApproval', config.userManagement?.requireAdminApproval);
        
        // Member Management Settings
        setCheckboxValue('allowMemberDeletion', config.memberManagement?.allowMemberDeletion);
        setCheckboxValue('allowExcelImport', config.memberManagement?.allowExcelImport);
        setCheckboxValue('allowMemberModification', config.memberManagement?.allowMemberModification);
        setCheckboxValue('allowMemberCreation', config.memberManagement?.allowMemberCreation);
        setCheckboxValue('allowAvatarManagement', config.memberManagement?.allowAvatarManagement);
        setCheckboxValue('allowDetailedViewAccess', config.memberManagement?.allowDetailedViewAccess);
        setCheckboxValue('requireApprovalForDeletion', config.memberManagement?.requireApprovalForDeletion);
        setInputValue('maxMembersPerUser', config.memberManagement?.maxMembersPerUser);
        
        // Application Settings
        setCheckboxValue('enableDebugMode', config.application?.enableDebugMode);
        setCheckboxValue('allowAvatarUploads', config.application?.allowAvatarUploads);
        setInputValue('maxAvatarSizeMB', config.application?.maxAvatarSizeMB);
        
        // Business Settings
        setCheckboxValue('allowEventCreation', config.business?.allowEventCreation);
        setInputValue('maxEventsPerUser', config.business?.maxEventsPerUser);
        
        console.log('✅ Settings populated in UI');
        
    } catch (error) {
        console.error('❌ Error populating settings:', error);
    }
}

// Update configuration status display
function updateConfigStatus() {
    const statusElement = document.getElementById('configStatus');
    const config = systemSettingsData.config;
    
    if (!config || !statusElement) return;
    
    const metadata = config.metadata || {};
    const lastUpdated = metadata.lastUpdated;
    const updatedBy = metadata.updatedBy;
    const version = metadata.version;
    
    statusElement.innerHTML = `
        <div class="config-meta">
            <strong>Version:</strong> ${version || 'Inconnue'} <br>
            <strong>Dernière mise à jour:</strong> ${lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Inconnue'} <br>
            <strong>Mis à jour par:</strong> ${updatedBy || 'Système'} <br>
            <strong>Statut:</strong> <span style="color: #2ecc71;">Actif</span>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', switchTab);
    });
    
    // Input change tracking
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => {
            systemSettingsData.hasUnsavedChanges = true;
            updateSaveButtonState();
        });
    });
    
    // Save settings
    document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
    
    // Reload settings
    document.getElementById('reloadSettings')?.addEventListener('click', reloadSettings);
    
    // Reset settings
    document.getElementById('resetSettings')?.addEventListener('click', resetSettings);
    
    // Warning before page unload
    window.addEventListener('beforeunload', (e) => {
        if (systemSettingsData.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
}

// Switch tabs
function switchTab(e) {
    const tabName = e.target.closest('.tab-button').dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    e.target.closest('.tab-button').classList.add('active');
    
    // Update active section
    document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));
    document.getElementById(tabName)?.classList.add('active');
    
    systemSettingsData.currentTab = tabName;
}

// Save settings
async function saveSettings() {
    try {
        showLoadingMessage('Saving settings...');
        
        const config = collectSettingsFromUI();
        
        // Update system configuration
        window.systemConfig.configCache = config;
        await window.systemConfig.saveConfig(window.auth?.currentUser?.email);
        
        systemSettingsData.hasUnsavedChanges = false;
        updateSaveButtonState();
        
        showSuccessMessage('Paramètres enregistrés avec succès!');
        
        // Reload to show updated values
        await loadSystemSettings();
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showErrorMessage('Échec de l\'enregistrement des paramètres: ' + error.message);
    }
}

// Collect settings from UI
function collectSettingsFromUI() {
    const config = JSON.parse(JSON.stringify(systemSettingsData.config)); // Deep clone
    
    try {
        // Security Settings
        config.security.sessionTimeoutMinutes = parseInt(getInputValue('sessionTimeoutMinutes')) || 30;
        config.security.warningTimeoutMinutes = parseInt(getInputValue('warningTimeoutMinutes')) || 5;
        config.security.maxFailedLogins = parseInt(getInputValue('maxFailedLogins')) || 5;
        config.security.requireEmailVerification = getCheckboxValue('requireEmailVerification');
        config.security.requireStrongPasswords = getCheckboxValue('requireStrongPasswords');
        
        // User Management Settings
        config.userManagement.defaultUserRole = getSelectValue('defaultUserRole') || 'user';
        config.userManagement.allowSelfRegistration = getCheckboxValue('allowSelfRegistration');
        config.userManagement.requireAdminApproval = getCheckboxValue('requireAdminApproval');
        
        // Member Management Settings
        if (!config.memberManagement) config.memberManagement = {};
        config.memberManagement.allowMemberDeletion = getCheckboxValue('allowMemberDeletion');
        config.memberManagement.allowExcelImport = getCheckboxValue('allowExcelImport');
        config.memberManagement.allowMemberModification = getCheckboxValue('allowMemberModification');
        config.memberManagement.allowMemberCreation = getCheckboxValue('allowMemberCreation');
        config.memberManagement.allowAvatarManagement = getCheckboxValue('allowAvatarManagement');
        config.memberManagement.allowDetailedViewAccess = getCheckboxValue('allowDetailedViewAccess');
        config.memberManagement.requireApprovalForDeletion = getCheckboxValue('requireApprovalForDeletion');
        config.memberManagement.maxMembersPerUser = parseInt(getInputValue('maxMembersPerUser')) || 1000;
        
        // Application Settings
        config.application.enableDebugMode = getCheckboxValue('enableDebugMode');
        config.application.allowAvatarUploads = getCheckboxValue('allowAvatarUploads');
        config.application.maxAvatarSizeMB = parseFloat(getInputValue('maxAvatarSizeMB')) || 2;
        
        // Business Settings
        config.business.allowEventCreation = getCheckboxValue('allowEventCreation');
        config.business.maxEventsPerUser = parseInt(getInputValue('maxEventsPerUser')) || 10;
        
        return config;
        
    } catch (error) {
        console.error('❌ Error collecting settings from UI:', error);
        throw new Error('Invalid settings values');
    }
}

// Reload settings
async function reloadSettings() {
    try {
        if (systemSettingsData.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Reload anyway?')) {
                return;
            }
        }
        
        showLoadingMessage('Reloading settings...');
        
        await window.systemConfig.loadConfig();
        await loadSystemSettings();
        
        systemSettingsData.hasUnsavedChanges = false;
        updateSaveButtonState();
        
        showSuccessMessage('Paramètres rechargés avec succès!');
        
    } catch (error) {
        console.error('❌ Error reloading settings:', error);
        showErrorMessage('Échec du rechargement des paramètres: ' + error.message);
    }
}

// Reset settings to defaults
async function resetSettings() {
    try {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }
        
        showLoadingMessage('Resetting to defaults...');
        
        await window.systemConfig.resetToDefaults(window.auth?.currentUser?.email);
        await loadSystemSettings();
        
        systemSettingsData.hasUnsavedChanges = false;
        updateSaveButtonState();
        
        showSuccessMessage('Paramètres remis aux valeurs par défaut avec succès!');
        
    } catch (error) {
        console.error('❌ Error resetting settings:', error);
        showErrorMessage('Échec de la remise à zéro des paramètres: ' + error.message);
    }
}

// Utility functions for form controls
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.value = value;
    }
}

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.checked = value;
    }
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element && value !== undefined) {
        element.value = value;
    }
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : null;
}

function getCheckboxValue(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

function getSelectValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : null;
}

// Update save button state
function updateSaveButtonState() {
    const saveButton = document.getElementById('saveSettings');
    if (saveButton) {
        if (systemSettingsData.hasUnsavedChanges) {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes *';
            saveButton.style.background = '#e74c3c';
        } else {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save All Settings';
            saveButton.style.background = '';
        }
    }
}

// Status message functions
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showWarningMessage(message) {
    showMessage(message, 'warning');
}

function showLoadingMessage(message) {
    showMessage(message + ' <span class="loading-spinner"></span>', 'info');
}

function showMessage(message, type) {
    const messageElement = document.getElementById('statusMessage');
    if (messageElement) {
        messageElement.className = `status-message ${type}`;
        messageElement.innerHTML = message;
        messageElement.style.display = 'block';
        
        // Auto-hide after 5 seconds (except for loading messages)
        if (type !== 'info') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Wait for Firebase to be ready
async function waitForFirebaseReady() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Firebase initialization timeout'));
        }, 3000); // FIXED: 3 seconds instead of 30 seconds
        
        const checkFirebase = () => {
            if (window.auth && window.db && window.auth.currentUser) {
                clearTimeout(timeout);
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        checkFirebase();
    });
}