const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "calybase"
    });
}

const db = admin.firestore();

// Default system configuration
const defaultConfig = {
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
            canViewMemberDetails: false,
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
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system-init',
        configId: 'system-config-v1'
    }
};

async function initializeSystemConfig() {
    try {
        console.log('🔧 Initializing system configuration...');
        
        // Check if config already exists
        const configRef = db.collection('systemConfig').doc('main');
        const configDoc = await configRef.get();
        
        if (configDoc.exists) {
            console.log('⚠️ System configuration already exists');
            console.log('Current config version:', configDoc.data().metadata?.version);
            
            const response = await promptUser('Do you want to update the existing configuration? (y/N): ');
            if (response.toLowerCase() !== 'y' && response.toLowerCase() !== 'yes') {
                console.log('❌ Initialization cancelled');
                return;
            }
        }
        
        // Set the configuration
        await configRef.set(defaultConfig);
        
        console.log('✅ System configuration initialized successfully!');
        console.log('📄 Configuration stored in Firestore: systemConfig/main');
        console.log('🔗 Access via: https://calybase.web.app/system-settings.html');
        
    } catch (error) {
        console.error('❌ Error initializing system configuration:', error);
        process.exit(1);
    }
}

// Simple prompt function for Node.js
function promptUser(question) {
    return new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Run the initialization
initializeSystemConfig()
    .then(() => {
        console.log('🎉 System configuration setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Failed to initialize system configuration:', error);
        process.exit(1);
    }); 