import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
const admin = initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID
});

const auth = getAuth();
const db = getFirestore();

async function createAdminUser(email, password, firstName, lastName) {
    try {
        console.log(`🔧 Creating admin user: ${email}`);
        
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            emailVerified: true,
            disabled: false
        });
        
        console.log(`✅ Firebase Auth user created with UID: ${userRecord.uid}`);
        
        // 2. Set admin role in Firebase Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: 'admin',
            permissions: ['user_management', 'system_admin']
        });
        
        console.log('✅ Admin custom claims set');
        
        // 3. Create user document in Firestore
        const userData = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: 'admin',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            uid: userRecord.uid,
            emailVerified: true,
            permissions: ['user_management', 'system_admin']
        };
        
        await db.collection('users').doc(userRecord.uid).set(userData);
        
        console.log('✅ Firestore user document created');
        console.log(`🎉 Admin user ${email} created successfully!`);
        
        return {
            success: true,
            uid: userRecord.uid,
            email: email
        };
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function grantAdminToExistingUser(email) {
    try {
        console.log(`🔧 Granting admin privileges to existing user: ${email}`);
        
        // 1. Get user by email
        const userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Found user with UID: ${userRecord.uid}`);
        
        // 2. Set admin role in Firebase Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: 'admin',
            permissions: ['user_management', 'system_admin']
        });
        
        console.log('✅ Admin custom claims set');
        
        // 3. Update or create user document in Firestore
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();
        
        if (userDoc.exists) {
            // Update existing document
            await userDocRef.update({
                role: 'admin',
                status: 'active',
                updatedAt: new Date(),
                permissions: ['user_management', 'system_admin'],
                emailVerified: true
            });
            console.log('✅ Firestore user document updated');
        } else {
            // Create new document
            const userData = {
                email: email,
                firstName: userRecord.displayName?.split(' ')[0] || 'Admin',
                lastName: userRecord.displayName?.split(' ')[1] || 'User',
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                uid: userRecord.uid,
                emailVerified: userRecord.emailVerified,
                permissions: ['user_management', 'system_admin']
            };
            
            await userDocRef.set(userData);
            console.log('✅ Firestore user document created');
        }
        
        console.log(`🎉 Admin privileges granted to ${email}!`);
        
        return {
            success: true,
            uid: userRecord.uid,
            email: email
        };
        
    } catch (error) {
        console.error('❌ Error granting admin privileges:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔧 Admin User Management Script

Usage:
  node scripts/create-admin-user.js grant <email>
  node scripts/create-admin-user.js create <email> <password> <firstName> <lastName>

Examples:
  node scripts/create-admin-user.js grant jan@andriessens.be
  node scripts/create-admin-user.js create admin@calybase.com SecurePass123 Admin User
        `);
        process.exit(1);
    }
    
    const command = args[0];
    
    if (command === 'grant') {
        const email = args[1];
        if (!email) {
            console.error('❌ Email is required for grant command');
            process.exit(1);
        }
        
        const result = await grantAdminToExistingUser(email);
        process.exit(result.success ? 0 : 1);
        
    } else if (command === 'create') {
        const [email, password, firstName, lastName] = args.slice(1);
        if (!email || !password || !firstName || !lastName) {
            console.error('❌ All parameters (email, password, firstName, lastName) are required for create command');
            process.exit(1);
        }
        
        const result = await createAdminUser(email, password, firstName, lastName);
        process.exit(result.success ? 0 : 1);
        
    } else {
        console.error('❌ Unknown command. Use "grant" or "create"');
        process.exit(1);
    }
}

main().catch(console.error); 