// Script to check and create user documents in Firestore
const admin = require('firebase-admin');
require('dotenv').config();

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

const auth = admin.auth();
const db = admin.firestore();

async function checkAndCreateUsers() {
    try {
        console.log('🔍 Checking Firebase Auth users and Firestore documents...\n');

        // Get all Firebase Auth users
        const listUsersResult = await auth.listUsers();
        console.log(`📊 Found ${listUsersResult.users.length} Firebase Auth users:`);
        
        for (const userRecord of listUsersResult.users) {
            console.log(`   - ${userRecord.email} (UID: ${userRecord.uid})`);
            
            // Check if user document exists in Firestore
            const userDocRef = db.collection('users').doc(userRecord.uid);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log(`     ✅ Firestore document exists - Status: ${userData.status}, Role: ${userData.role}`);
            } else {
                console.log(`     ❌ No Firestore document found - Creating one...`);
                
                // Create user document
                const newUserData = {
                    email: userRecord.email,
                    role: userRecord.email === 'jan@andriessens.be' || userRecord.email === 'jan.andriessens@gmail.com' ? 'admin' : 'user',
                    status: 'active',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    emailVerified: userRecord.emailVerified,
                    permissions: userRecord.email === 'jan@andriessens.be' || userRecord.email === 'jan.andriessens@gmail.com' 
                        ? ['read', 'write', 'delete', 'admin'] 
                        : ['read', 'write'],
                    lastLogin: null,
                    approved: true,
                    approvalDate: admin.firestore.FieldValue.serverTimestamp()
                };
                
                await userDocRef.set(newUserData);
                console.log(`     ✅ Created Firestore document with role: ${newUserData.role}`);
            }
        }
        
        // List all documents in users collection
        console.log('\n📋 All documents in users collection:');
        const usersSnapshot = await db.collection('users').get();
        console.log(`   Total documents: ${usersSnapshot.size}`);
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.email} (${data.role}) - Status: ${data.status}`);
        });
        
        console.log('\n🎉 User check and creation complete!');
        console.log('🔄 Refresh your user management page to see the users.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('Could not load the default credentials')) {
            console.log('\n🔧 To fix authentication:');
            console.log('1. Install Google Cloud CLI');
            console.log('2. Run: gcloud auth application-default login');
            console.log('3. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
        }
    }
}

checkAndCreateUsers(); 