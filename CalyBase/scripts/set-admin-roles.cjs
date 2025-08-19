const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        // Uses Application Default Credentials or service account key
        projectId: 'calybase' // Replace with your actual project ID
    });
}

const auth = admin.auth();
const db = admin.firestore();

// List of emails to grant admin access
const ADMIN_EMAILS = [
    'jan@andriessens.be',
    'jan.andriessens@gmail.com'
];

async function setAdminRoles() {
    console.log('🔧 Setting up admin roles...');
    
    try {
        // Get all users from Firebase Auth
        const listUsersResult = await auth.listUsers();
        
        for (const userRecord of listUsersResult.users) {
            const userEmail = userRecord.email;
            
            if (ADMIN_EMAILS.includes(userEmail)) {
                console.log(`👑 Setting admin role for: ${userEmail}`);
                
                // Set custom claims
                await auth.setCustomUserClaims(userRecord.uid, {
                    role: 'admin',
                    permissions: ['read', 'write', 'delete', 'admin']
                });
                
                // Update or create user document in Firestore
                const userDocRef = db.collection('users').doc(userRecord.uid);
                const userDoc = await userDocRef.get();
                
                if (userDoc.exists) {
                    // Update existing document
                    await userDocRef.update({
                        role: 'admin',
                        status: 'active',
                        permissions: ['read', 'write', 'delete', 'admin'],
                        adminSetDate: admin.firestore.FieldValue.serverTimestamp(),
                        derniereModif: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`✅ Updated existing user document for ${userEmail}`);
                } else {
                    // Create new user document
                    await userDocRef.set({
                        email: userEmail,
                        role: 'admin',
                        status: 'active',
                        permissions: ['read', 'write', 'delete', 'admin'],
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        adminSetDate: admin.firestore.FieldValue.serverTimestamp(),
                        emailVerified: userRecord.emailVerified
                    });
                    console.log(`✅ Created new user document for ${userEmail}`);
                }
                
                console.log(`🎉 Successfully set admin role for ${userEmail}`);
            } else {
                // Set regular user role for non-admin users
                await auth.setCustomUserClaims(userRecord.uid, {
                    role: 'user',
                    permissions: ['read', 'write']
                });
                
                // Update user document
                const userDocRef = db.collection('users').doc(userRecord.uid);
                const userDoc = await userDocRef.get();
                
                if (!userDoc.exists) {
                    await userDocRef.set({
                        email: userEmail,
                        role: 'user',
                        status: 'active',
                        permissions: ['read', 'write'],
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        emailVerified: userRecord.emailVerified
                    });
                }
                
                console.log(`👤 Set regular user role for ${userEmail}`);
            }
        }
        
        console.log('\n🎯 Admin setup complete!');
        console.log('📝 Summary:');
        console.log(`   - Total users processed: ${listUsersResult.users.length}`);
        console.log(`   - Admin users: ${ADMIN_EMAILS.length}`);
        console.log('');
        console.log('🔄 Please refresh your browser and check the dashboard.');
        console.log('🚨 Remember to remove the temporary bypass from index.js when done testing!');
        
    } catch (error) {
        console.error('❌ Error setting admin roles:', error);
        
        if (error.code === 'app/no-app') {
            console.log('');
            console.log('🔧 Setup required:');
            console.log('1. Make sure you have Firebase Admin SDK configured');
            console.log('2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
            console.log('3. Or place service account key file in the project');
        }
    }
}

// Run the script
if (require.main === module) {
    setAdminRoles()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { setAdminRoles }; 