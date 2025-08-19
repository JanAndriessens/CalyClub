const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'calybase'
    });
}

async function deleteUserFromAuth(email) {
    try {
        console.log(`🗑️ Searching for user with email: ${email}`);
        
        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`📧 Found user: ${userRecord.uid} - ${userRecord.email}`);
        
        // Delete user from Firebase Auth
        await admin.auth().deleteUser(userRecord.uid);
        console.log(`🔥 Successfully deleted ${email} from Firebase Auth`);
        
        // Also delete from Firestore (in case it still exists)
        try {
            await admin.firestore().collection('users').doc(userRecord.uid).delete();
            console.log(`🗃️ Also deleted Firestore document`);
        } catch (firestoreError) {
            console.log(`ℹ️ Firestore document already deleted or didn't exist`);
        }
        
        return { success: true, uid: userRecord.uid };
        
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`✅ User ${email} not found in Firebase Auth (already deleted)`);
            return { success: true, message: 'User already deleted' };
        } else {
            console.error(`❌ Error deleting user:`, error);
            return { success: false, error: error.message };
        }
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node scripts/delete-user-auth.cjs florence@example.com');
    process.exit(1);
}

// Execute deletion
deleteUserFromAuth(email)
    .then(result => {
        if (result.success) {
            console.log('🎉 Deletion completed successfully');
        } else {
            console.log('❌ Deletion failed:', result.error);
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    }); 