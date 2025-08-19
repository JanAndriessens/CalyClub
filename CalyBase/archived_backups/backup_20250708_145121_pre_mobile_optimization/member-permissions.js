// Member Management Permissions Utility for CalyBase
// This utility checks user permissions for member management operations

class MemberPermissions {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.systemConfig = null;
        this.initialized = false;
    }

    // Initialize the permissions checker
    async initialize() {
        try {
            // Wait for authentication
            await this.waitForAuth();
            
            // Get current user
            this.currentUser = window.auth?.currentUser;
            if (!this.currentUser) {
                throw new Error('Aucun utilisateur authentifié');
            }

            // Get user role from Firestore
            const userDoc = await window.db.collection('users').doc(this.currentUser.uid).get();
            if (!userDoc.exists) {
                throw new Error('Document utilisateur non trouvé');
            }

            const userData = userDoc.data();
            this.userRole = userData.role;

            // Get system configuration
            if (window.systemConfig) {
                this.systemConfig = window.systemConfig.getConfig();
            }

            this.initialized = true;
            console.log('✅ Member permissions initialized for role:', this.userRole);
            
        } catch (error) {
            console.error('❌ Failed to initialize member permissions:', error);
            throw error;
        }
    }

    // Wait for authentication to be ready
    async waitForAuth() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Délai d\'authentification dépassé'));
            }, 30000);
            
            const checkAuth = () => {
                if (window.auth && window.db) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            
            checkAuth();
        });
    }

    // Check if user has a specific permission
    hasPermission(permission) {
        if (!this.initialized) {
            console.warn('⚠️ Member permissions not initialized');
            return false;
        }

        // Check role-based permissions from system config
        const rolePermissions = this.systemConfig?.permissions?.[this.userRole];
        if (rolePermissions && rolePermissions[permission] === true) {
            return true;
        }

        // Check global settings
        const memberManagement = this.systemConfig?.memberManagement;
        if (memberManagement) {
            switch (permission) {
                case 'canDeleteMembers':
                    return memberManagement.allowMemberDeletion === true;
                case 'canImportMembers':
                    return memberManagement.allowExcelImport === true;
                case 'canModifyMembers':
                    return memberManagement.allowMemberModification === true;
                case 'canCreateMembers':
                    return memberManagement.allowMemberCreation === true;
                case 'canManageMemberAvatars':
                    return memberManagement.allowAvatarManagement === true;
                case 'canViewMemberDetails':
                    return memberManagement.allowDetailedViewAccess === true;
            }
        }

        return false;
    }

    // Check if user can delete members
    canDeleteMembers() {
        return this.hasPermission('canDeleteMembers');
    }

    // Check if user can import members from Excel
    canImportMembers() {
        return this.hasPermission('canImportMembers');
    }

    // Check if user can modify member information
    canModifyMembers() {
        return this.hasPermission('canModifyMembers');
    }

    // Check if user can create new members
    canCreateMembers() {
        return this.hasPermission('canCreateMembers');
    }

    // Check if user can manage member avatars
    canManageMemberAvatars() {
        return this.hasPermission('canManageMemberAvatars');
    }

    // Check if user can view member details
    canViewMemberDetails() {
        return this.hasPermission('canViewMemberDetails');
    }

    // Check if user can bulk delete members
    canBulkDeleteMembers() {
        return this.hasPermission('canBulkDeleteMembers');
    }

    // Check if user requires approval for deletion
    requiresApprovalForDeletion() {
        if (!this.initialized) return true;
        
        const memberManagement = this.systemConfig?.memberManagement;
        return memberManagement?.requireApprovalForDeletion === true;
    }

    // Get the user's role
    getUserRole() {
        return this.userRole;
    }

    // Check if user is admin or higher
    isAdmin() {
        return ['admin', 'superAdmin'].includes(this.userRole);
    }

    // Check if user is super admin
    isSuperAdmin() {
        return this.userRole === 'superAdmin';
    }

    // Get maximum members per user
    getMaxMembersPerUser() {
        const memberManagement = this.systemConfig?.memberManagement;
        return memberManagement?.maxMembersPerUser || 1000;
    }
}

// Create global instance
window.memberPermissions = new MemberPermissions();

// Utility functions for easy access
window.checkMemberPermission = async function(permission) {
    if (!window.memberPermissions.initialized) {
        try {
            await window.memberPermissions.initialize();
        } catch (error) {
                            console.error('Échec de l\'initialisation des permissions de membre:', error);
            return false;
        }
    }
    return window.memberPermissions.hasPermission(permission);
};

window.canDeleteMembers = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canDeleteMembers();
};

window.canImportMembers = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canImportMembers();
};

window.canModifyMembers = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canModifyMembers();
};

window.canCreateMembers = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canCreateMembers();
};

window.canManageMemberAvatars = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canManageMemberAvatars();
};

window.canViewMemberDetails = async function() {
    if (!window.memberPermissions.initialized) {
        await window.memberPermissions.initialize();
    }
    return window.memberPermissions.canViewMemberDetails();
};

console.log('📋 Member permissions utility loaded'); 