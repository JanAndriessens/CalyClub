import { auth, db } from './firebase.config.js';
import userService from './user.service.js';
import { adminAuth, adminDb } from './firebase.config.js';

const authService = {
    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if user is approved
            const userProfile = await userService.getUserProfile(user.uid);
            if (!userProfile.approved) {
                await auth.signOut();
                throw new Error('Votre compte est en attente d\'approbation');
            }

            // Update last login
            await userService.updateLastLogin(user.uid);

            return user;
        } catch (error) {
            throw new Error('Erreur lors de la connexion: ' + error.message);
        }
    },

    async register(email, password, username = null) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if username is already taken (if provided)
            if (username) {
                const existingUsername = await db.collection('users')
                    .where('username', '==', username)
                    .get();
                
                if (!existingUsername.empty) {
                    // Delete the Firebase Auth user since username is taken
                    await user.delete();
                    throw new Error('Ce nom d\'utilisateur est déjà pris');
                }
            }

            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                email,
                username: username || null,
                role: 'user',
                createdAt: new Date(),
                lastLogin: null,
                approved: false,
                status: 'pending',
                approvalDate: null,
                approvedBy: null,
                emailVerified: false
            });

            // Send email verification
            await user.sendEmailVerification();

            return user;
        } catch (error) {
            throw new Error("Erreur lors de l'inscription: " + error.message);
        }
    },

    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            throw new Error('Erreur lors de la déconnexion: ' + error.message);
        }
    },

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            throw new Error('Erreur lors de la réinitialisation du mot de passe: ' + error.message);
        }
    },

    async updatePassword(newPassword) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Aucun utilisateur connecté');
            }
            await user.updatePassword(newPassword);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du mot de passe: ' + error.message);
        }
    },

    async updateEmail(newEmail) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Aucun utilisateur connecté');
            }
            await user.updateEmail(newEmail);
            // Update email in Firestore
            await userService.updateUserProfile(user.uid, { email: newEmail });
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour de l\'email: ' + error.message);
        }
    },

    async deleteAccount() {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Aucun utilisateur connecté');
            }
            await userService.deleteUser(user.uid);
        } catch (error) {
            throw new Error('Erreur lors de la suppression du compte: ' + error.message);
        }
    },

    async deleteUser(userId, userEmail, adminToken) {
        try {
            console.log(`🗑️ Auth Service: Starting Firebase Auth deletion for ${userEmail} (${userId})`);
            
            // Check if Admin SDK is available
            if (!adminAuth || !adminDb) {
                console.error('❌ Firebase Admin SDK not available - organization policies may be preventing proper initialization');
                throw new Error('Service administrateur Firebase non disponible. Contactez votre administrateur système.');
            }
            
            // Verify admin token and permissions
            const decodedToken = await adminAuth.verifyIdToken(adminToken);
            console.log('🔐 Admin token verified for:', decodedToken.email);
            
            // Get admin user data to check permissions
            const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
            
            if (!adminUserDoc.exists) {
                throw new Error('Données administrateur non trouvées');
            }
            
            const adminData = adminUserDoc.data();
            
            // Check if user has admin privileges
            if (!adminData.role || !['admin', 'superAdmin'].includes(adminData.role)) {
                throw new Error('Permissions administrateur requises pour supprimer un utilisateur');
            }
            
            console.log(`✅ Admin ${decodedToken.email} (${adminData.role}) authorized to delete user`);
            
            // Delete user from Firebase Auth using Admin SDK
            await adminAuth.deleteUser(userId);
            console.log(`🔥 Firebase Auth user ${userEmail} deleted successfully`);
            
            // Log the deletion action
            await adminDb.collection('admin_logs').add({
                action: 'FIREBASE_AUTH_USER_DELETED',
                targetUserId: userId,
                targetUserEmail: userEmail,
                performedBy: decodedToken.uid,
                performedByEmail: decodedToken.email,
                adminRole: adminData.role,
                timestamp: new Date(),
                method: 'ADMIN_DELETE_API'
            });
            
            console.log('📝 Firebase Auth deletion logged');
            
            return {
                success: true,
                message: `Utilisateur ${userEmail} supprimé de Firebase Auth`,
                deletedBy: decodedToken.email
            };
            
        } catch (error) {
            console.error('❌ Firebase Auth deletion error:', error);
            
            // Log the failed attempt (only if Admin SDK is available)
            if (adminToken && adminAuth && adminDb) {
                try {
                    const decodedToken = await adminAuth.verifyIdToken(adminToken);
                    await adminDb.collection('admin_logs').add({
                        action: 'FIREBASE_AUTH_DELETE_FAILED',
                        targetUserId: userId,
                        targetUserEmail: userEmail,
                        performedBy: decodedToken.uid,
                        performedByEmail: decodedToken.email,
                        error: error.message,
                        timestamp: new Date()
                    });
                } catch (logError) {
                    console.error('❌ Could not log failed deletion attempt:', logError);
                }
            }
            
            throw new Error(`Impossible de supprimer l'utilisateur de Firebase Auth: ${error.message}`);
        }
    }
};

export default authService; 