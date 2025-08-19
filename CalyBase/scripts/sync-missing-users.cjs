const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
    projectId: "calybase"
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "calybase"
    });
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

async function syncMissingUsers() {
    try {
        console.log('🔄 Syncing Firebase Auth users to Firestore...\n');

        // Get all Firebase Auth users
        const listUsersResult = await adminAuth.listUsers();
        console.log(`📊 Found ${listUsersResult.users.length} Firebase Auth users:`);
        
        let syncedCount = 0;
        let existingCount = 0;
        
        for (const userRecord of listUsersResult.users) {
            console.log(`\n👤 Checking user: ${userRecord.email} (UID: ${userRecord.uid})`);
            
            // Check if user document exists in Firestore
            const userDocRef = adminDb.collection('users').doc(userRecord.uid);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                console.log(`   ✅ Firestore document exists`);
                const userData = userDoc.data();
                console.log(`   📋 Status: ${userData.status}, Role: ${userData.role}`);
                existingCount++;
            } else {
                console.log(`   ❌ Missing Firestore document - creating now...`);
                
                // Check if this is an admin email
                const adminEmails = ['jan@andriessens.be', 'jan.andriessens@gmail.com', 'james.hughes@skynet.be'];
                const isAdmin = adminEmails.includes(userRecord.email);
                
                const userData = {
                    email: userRecord.email,
                    username: userRecord.displayName || null,
                    role: isAdmin ? 'admin' : 'user',
                    status: isAdmin ? 'active' : 'pending',
                    createdAt: userRecord.metadata.creationTime ? admin.firestore.Timestamp.fromDate(new Date(userRecord.metadata.creationTime)) : admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                    uid: userRecord.uid,
                    emailVerified: userRecord.emailVerified,
                    approved: isAdmin,
                    lastLogin: userRecord.metadata.lastSignInTime ? admin.firestore.Timestamp.fromDate(new Date(userRecord.metadata.lastSignInTime)) : null,
                    approvalDate: isAdmin ? admin.firestore.Timestamp.now() : null,
                    approvedBy: isAdmin ? 'system' : null
                };
                
                await userDocRef.set(userData);
                console.log(`   ✅ Created Firestore document:`);
                console.log(`      📧 Email: ${userData.email}`);
                console.log(`      👤 Role: ${userData.role}`);
                console.log(`      📊 Status: ${userData.status}`);
                console.log(`      ✉️ Email Verified: ${userData.emailVerified}`);
                syncedCount++;
            }
        }
        
        console.log(`\n🎉 Sync complete!`);
        console.log(`   ✅ ${existingCount} users already had Firestore documents`);
        console.log(`   🔄 ${syncedCount} users synced to Firestore`);
        console.log(`   📊 Total users: ${listUsersResult.users.length}`);
        
        // List all users in Firestore now
        console.log(`\n📋 Current Firestore users:`);
        const allUsers = await adminDb.collection('users').get();
        allUsers.forEach(doc => {
            const data = doc.data();
            console.log(`   ${data.email} - Role: ${data.role}, Status: ${data.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error syncing users:', error);
        console.error('   Error message:', error.message);
    }
}

// Run the sync
syncMissingUsers().then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
}); 