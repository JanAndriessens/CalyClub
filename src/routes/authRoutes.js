import express from 'express';
import authService from '../auth/auth.service.js';
import userService from '../auth/user.service.js';
import { adminAuth, adminDb } from '../auth/firebase.config.js';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await authService.login(email, password);
        res.json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Register route
router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;

    try {
        const user = await authService.register(email, password, username);
        res.json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Password reset request route
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    try {
        await authService.resetPassword(email);
        res.json({ message: "Instructions de réinitialisation envoyées par email" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete user route (admin only)
router.delete('/delete-user', async (req, res) => {
    const { userId, userEmail } = req.body;
    const authHeader = req.headers.authorization;

    try {
        // Verify admin authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token d\'autorisation requis' });
        }

        const token = authHeader.split(' ')[1];
        
        // Call auth service to delete user
        await authService.deleteUser(userId, userEmail, token);
        
        res.json({ 
            success: true, 
            message: `Utilisateur ${userEmail} supprimé avec succès de Firebase Auth` 
        });
        
    } catch (error) {
        console.error('❌ Delete user API error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get all users from Firebase Auth (source of truth) with Firestore data
router.get('/firebase-users', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token d\'autorisation requis' });
        }

        const token = authHeader.split(' ')[1];
        
        // Check if Admin SDK is available
        if (!adminAuth || !adminDb) {
            return res.status(503).json({ 
                error: 'Service administrateur Firebase non disponible',
                fallback: 'firestore-only' 
            });
        }
        
        // Verify admin token and permissions
        const decodedToken = await adminAuth.verifyIdToken(token);
        const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        
        if (!adminUserDoc.exists) {
            return res.status(401).json({ error: 'Utilisateur administrateur non trouvé' });
        }
        
        const adminData = adminUserDoc.data();
        if (!adminData.role || !['admin', 'superAdmin'].includes(adminData.role)) {
            return res.status(403).json({ error: 'Permissions administrateur requises' });
        }

        console.log('🔍 Fetching all Firebase Auth users...');

        // Get all Firebase Auth users
        const allUsers = [];
        let nextPageToken;
        
        do {
            const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
            allUsers.push(...listUsersResult.users);
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`📊 Found ${allUsers.length} Firebase Auth users`);

        // For each Auth user, get their Firestore data
        const usersWithData = await Promise.all(
            allUsers.map(async (authUser) => {
                try {
                    // Try to get Firestore document
                    const userDocRef = adminDb.collection('users').doc(authUser.uid);
                    const userDoc = await userDocRef.get();
                    
                    const firestoreData = userDoc.exists ? userDoc.data() : null;
                    
                    return {
                        // Firebase Auth data (source of truth)
                        uid: authUser.uid,
                        email: authUser.email,
                        emailVerified: authUser.emailVerified,
                        disabled: authUser.disabled,
                        metadata: {
                            creationTime: authUser.metadata.creationTime,
                            lastSignInTime: authUser.metadata.lastSignInTime,
                            lastRefreshTime: authUser.metadata.lastRefreshTime
                        },
                        
                        // Firestore data (supplementary)
                        firestore: firestoreData ? {
                            role: firestoreData.role || 'user',
                            username: firestoreData.username || null,
                            approved: firestoreData.approved || false,
                            status: firestoreData.status || 'unknown',
                            createdAt: firestoreData.createdAt,
                            lastLogin: firestoreData.lastLogin,
                            approvalDate: firestoreData.approvalDate,
                            approvedBy: firestoreData.approvedBy
                        } : null,
                        
                        // Combined status
                        hasFirestoreDoc: userDoc.exists,
                        displayStatus: firestoreData?.status || (authUser.disabled ? 'disabled' : 'missing-profile'),
                        displayRole: firestoreData?.role || 'user',
                        needsFirestoreDoc: !userDoc.exists
                    };
                } catch (error) {
                    console.warn(`⚠️ Error processing user ${authUser.uid}:`, error.message);
                    return {
                        uid: authUser.uid,
                        email: authUser.email,
                        emailVerified: authUser.emailVerified,
                        disabled: authUser.disabled,
                        firestore: null,
                        hasFirestoreDoc: false,
                        displayStatus: 'error',
                        displayRole: 'user',
                        needsFirestoreDoc: true,
                        error: error.message
                    };
                }
            })
        );

        // Sort by creation time (newest first)
        usersWithData.sort((a, b) => {
            const timeA = new Date(a.metadata?.creationTime || 0);
            const timeB = new Date(b.metadata?.creationTime || 0);
            return timeB - timeA;
        });

        console.log(`✅ Processed ${usersWithData.length} users with combined Auth + Firestore data`);
        
        // Log summary
        const summary = {
            total: usersWithData.length,
            withFirestore: usersWithData.filter(u => u.hasFirestoreDoc).length,
            needingFirestore: usersWithData.filter(u => u.needsFirestoreDoc).length,
            disabled: usersWithData.filter(u => u.disabled).length
        };
        
        console.log('📈 User summary:', summary);

        res.json({
            users: usersWithData,
            summary,
            timestamp: new Date().toISOString(),
            source: 'firebase-auth'
        });

    } catch (error) {
        console.error('❌ Error fetching Firebase Auth users:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des utilisateurs',
            details: error.message 
        });
    }
});

export default router; 