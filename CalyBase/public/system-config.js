// System Configuration Management for CalyBase
class SystemConfig {
    constructor() {
        this.configCache = null;
        this.configListeners = [];
        this.initialized = false;
    }

    // Default system configuration
    getDefaultConfig() {
        return {
            // Session & Security Settings
            security: {
                sessionTimeoutMinutes: 30,
                warningTimeoutMinutes: 5,
                maxFailedLogins: 5,
                requireEmailVerification: true,
                requireStrongPasswords: true,
                enableTwoFactor: false,
                autoLockoutDuration: 15 // minutes
            },

            // User Management Settings
            userManagement: {
                defaultUserRole: 'user',
                autoApproveUsers: false,
                allowSelfRegistration: true,
                requireAdminApproval: true,
                maxUsersPerAdmin: 100
            },

            // Member Management Settings
            memberManagement: {
                allowMemberDeletion: false,
                allowExcelImport: false,
                allowMemberModification: true,
                allowMemberCreation: true,
                allowAvatarManagement: true,
                allowDetailedViewAccess: true,
                requireApprovalForDeletion: true,
                maxMembersPerUser: 1000
            },

            // Role Permissions
            permissions: {
                superAdmin: {
                    canModifySystemConfig: true,
                    canDeleteUsers: true,
                    canViewAllData: true,
                    canManageRoles: true,
                    canAccessDebugMode: true,
                    canManageBackups: true,
                    // Member Management Permissions
                    canDeleteMembers: true,
                    canImportMembers: true,
                    canModifyMembers: true,
                    canCreateMembers: true,
                    canManageMemberAvatars: true,
                    canViewMemberDetails: true,
                    canBulkDeleteMembers: true
                },
                admin: {
                    canModifySystemConfig: false,
                    canDeleteUsers: false,
                    canViewAllData: true,
                    canManageRoles: false,
                    canAccessDebugMode: false,
                    canManageBackups: false,
                    canApproveUsers: true,
                    canEditUsers: true,
                    canViewReports: true,
                    // Member Management Permissions
                    canDeleteMembers: false,
                    canImportMembers: true,
                    canModifyMembers: true,
                    canCreateMembers: true,
                    canManageMemberAvatars: true,
                    canViewMemberDetails: true,
                    canBulkDeleteMembers: false
                },
                moderator: {
                    canApproveUsers: true,
                    canEditUsers: false,
                    canViewReports: false,
                    canDeleteUsers: false,
                    // Member Management Permissions
                    canDeleteMembers: false,
                    canImportMembers: false,
                    canModifyMembers: true,
                    canCreateMembers: true,
                    canManageMemberAvatars: false,
                    canViewMemberDetails: true,
                    canBulkDeleteMembers: false
                },
                user: {
                    canViewOwnData: true,
                    canEditOwnProfile: true,
                    // Member Management Permissions
                    canDeleteMembers: false,
                    canImportMembers: false,
                    canModifyMembers: false,
                    canCreateMembers: false,
                    canManageMemberAvatars: false,
                    canViewMemberDetails: true,
                    canBulkDeleteMembers: false
                }
            },

            // Application Settings
            application: {
                enableDebugMode: false,
                maintenanceMode: false,
                allowAvatarUploads: true,
                maxAvatarSizeMB: 2,
                autoBackupEnabled: true,
                backupFrequencyHours: 24,
                retentionDays: 90
            },

            // Business Rules
            business: {
                allowEventCreation: true,
                requireEventApproval: false,
                maxEventsPerUser: 10,
                eventAdvanceBookingDays: 30
            },

            // System Metadata
            metadata: {
                version: '1.0.0',
                lastUpdated: new Date(),
                updatedBy: null,
                configId: 'system-config-v1'
            }
        };
    }

    // Initialize system configuration with Firebase wait
    async initialize() {
        try {
            console.log('🔧 Initializing system configuration...');
            
            // ⚡ OPTIMIZATION: Wait for Firebase to be ready
            await this.waitForFirebase();
            
            if (!window.db) {
                throw new Error('Firestore not available after waiting');
            }

            // Load configuration from Firestore
            await this.loadConfig();
            this.initialized = true;
            
            console.log('✅ System configuration initialized');
            return this.configCache;
            
        } catch (error) {
            console.error('❌ Error initializing system config:', error);
            
            // Fall back to default configuration
            this.configCache = this.getDefaultConfig();
            console.warn('⚠️ Using default configuration');
            
            return this.configCache;
        }
    }

    // ⚡ OPTIMIZATION: Wait for Firebase to be ready
    async waitForFirebase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max
            
            const checkFirebase = () => {
                attempts++;
                
                if (window.db && window.firebase && firebase.apps.length > 0) {
                    console.log('✅ System Config: Firebase ready');
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ System Config: Firebase timeout (5s), proceeding with defaults');
                    resolve(); // Don't reject, just proceed
                    return;
                }
                
                setTimeout(checkFirebase, 100);
            };
            
            checkFirebase();
        });
    }

    // Load configuration from Firestore
    async loadConfig() {
        try {
            const configDoc = await window.db.collection('systemConfig').doc('main').get();
            
            if (configDoc.exists) {
                console.log('📄 Loading system configuration from Firestore');
                this.configCache = configDoc.data();
                
                // Merge with defaults for any missing properties
                this.configCache = this.mergeWithDefaults(this.configCache);
            } else {
                console.log('📄 No system configuration found, creating default');
                this.configCache = this.getDefaultConfig();
                await this.saveConfig();
            }
            
            // Notify listeners
            this.notifyListeners();
            
        } catch (error) {
            console.error('❌ Error loading system config:', error);
            throw error;
        }
    }

    // Merge configuration with defaults (for backward compatibility)
    mergeWithDefaults(config) {
        const defaults = this.getDefaultConfig();
        
        // Deep merge function
        function deepMerge(target, source) {
            const result = { ...target };
            
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = deepMerge(target[key] || {}, source[key]);
                } else if (result[key] === undefined) {
                    result[key] = source[key];
                }
            }
            
            return result;
        }
        
        return deepMerge(config, defaults);
    }

    // Save configuration to Firestore
    async saveConfig(updatedBy = null) {
        try {
            if (!this.configCache) {
                throw new Error('No configuration to save');
            }

            // Update metadata
            this.configCache.metadata.lastUpdated = new Date();
            this.configCache.metadata.updatedBy = updatedBy || window.auth?.currentUser?.email || 'system';

            await window.db.collection('systemConfig').doc('main').set(this.configCache);
            
            console.log('💾 System configuration saved successfully');
            
            // Log audit trail
            await this.logConfigChange(updatedBy);
            
            // Notify listeners
            this.notifyListeners();
            
        } catch (error) {
            console.error('❌ Error saving system config:', error);
            throw error;
        }
    }

    // Log configuration changes for audit trail
    async logConfigChange(updatedBy) {
        try {
            const auditEntry = {
                timestamp: new Date(),
                action: 'config_update',
                updatedBy: updatedBy || window.auth?.currentUser?.email || 'system',
                userAgent: navigator.userAgent,
                configVersion: this.configCache.metadata.version
            };

            await window.db.collection('auditLog').add(auditEntry);
            
        } catch (error) {
            console.warn('⚠️ Could not log config change:', error);
        }
    }

    // Get specific configuration value
    get(path) {
        if (!this.configCache) {
            console.warn('⚠️ System configuration not loaded, using defaults');
            return this.getValueFromPath(this.getDefaultConfig(), path);
        }
        
        return this.getValueFromPath(this.configCache, path);
    }

    // Set specific configuration value
    async set(path, value, updatedBy = null) {
        try {
            if (!this.configCache) {
                await this.initialize();
            }

            this.setValueAtPath(this.configCache, path, value);
            await this.saveConfig(updatedBy);
            
            console.log(`✅ Configuration updated: ${path} = ${value}`);
            
        } catch (error) {
            console.error(`❌ Error updating configuration ${path}:`, error);
            throw error;
        }
    }

    // Helper function to get value from nested path (e.g., 'security.sessionTimeoutMinutes')
    getValueFromPath(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Helper function to set value at nested path
    setValueAtPath(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    // Check if user has permission for specific action
    hasPermission(userRole, permission) {
        if (!this.configCache) {
            console.warn('⚠️ Configuration not loaded, denying permission');
            return false;
        }

        const rolePermissions = this.configCache.permissions[userRole];
        if (!rolePermissions) {
            console.warn(`⚠️ Unknown role: ${userRole}`);
            return false;
        }

        return rolePermissions[permission] === true;
    }

    // Get all permissions for a role
    getRolePermissions(userRole) {
        return this.get(`permissions.${userRole}`) || {};
    }

    // Add configuration change listener
    addListener(callback) {
        this.configListeners.push(callback);
    }

    // Remove configuration change listener
    removeListener(callback) {
        const index = this.configListeners.indexOf(callback);
        if (index > -1) {
            this.configListeners.splice(index, 1);
        }
    }

    // Notify all listeners of configuration changes
    notifyListeners() {
        this.configListeners.forEach(callback => {
            try {
                callback(this.configCache);
            } catch (error) {
                console.error('❌ Error in config listener:', error);
            }
        });
    }

    // Get current configuration (for debugging)
    getConfig() {
        return this.configCache;
    }

    // Reset to default configuration
    async resetToDefaults(updatedBy = null) {
        try {
            console.log('🔄 Resetting system configuration to defaults...');
            
            this.configCache = this.getDefaultConfig();
            await this.saveConfig(updatedBy);
            
            console.log('✅ System configuration reset to defaults');
            
        } catch (error) {
            console.error('❌ Error resetting configuration:', error);
            throw error;
        }
    }
}

// Global system configuration instance
window.systemConfig = new SystemConfig();

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Firebase to be ready
        if (typeof window.waitForFirebaseReady === 'function') {
            await window.waitForFirebaseReady();
        }
        
        // Initialize system configuration
        await window.systemConfig.initialize();
        
        console.log('🔧 System configuration ready');
        
            // Debug functions
    window.getConfig = (path) => window.systemConfig.get(path);
    window.setConfig = (path, value) => window.systemConfig.set(path, value);
    window.hasPermission = (role, permission) => window.systemConfig.hasPermission(role, permission);
    
    // Initialize system config if needed
    window.initSystemConfig = async () => {
        try {
            console.log('🔧 Initializing system configuration...');
            
            if (!window.auth?.currentUser) {
                throw new Error('You must be logged in to initialize system configuration');
            }
            
            // Check if user is admin
            const userDoc = await window.db.collection('users').doc(window.auth.currentUser.uid).get();
            if (!userDoc.exists) {
                throw new Error('User document not found');
            }
            
            const userData = userDoc.data();
            if (userData.role !== 'admin' && userData.role !== 'superAdmin') {
                throw new Error('Only administrators can initialize system configuration');
            }
            
            // Create the default configuration
            const defaultConfig = window.systemConfig.getDefaultConfig();
            defaultConfig.metadata.lastUpdated = new Date();
            defaultConfig.metadata.updatedBy = window.auth.currentUser.email;
            
            await window.db.collection('systemConfig').doc('main').set(defaultConfig);
            
            console.log('✅ System configuration initialized successfully!');
            console.log('🔄 Reloading configuration...');
            
            await window.systemConfig.loadConfig();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error initializing system configuration:', error);
            throw error;
        }
    };
        
    } catch (error) {
        console.error('❌ Failed to initialize system configuration:', error);
    }
}); 