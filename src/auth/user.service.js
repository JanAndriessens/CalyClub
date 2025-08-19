import { db, auth } from './firebase.config.js';

const userService = {
    // Get user profile
    async getUserProfile(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                throw new Error('Utilisateur non trouvé');
            }
            return userDoc.data();
        } catch (error) {
            throw new Error('Erreur lors de la récupération du profil: ' + error.message);
        }
    },

    // Update user profile
    async updateUserProfile(uid, data) {
        try {
            const userRef = db.collection('users').doc(uid);
            await userRef.update({
                ...data,
                derniereModif: new Date()
            });
            return await this.getUserProfile(uid);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du profil: ' + error.message);
        }
    },

    // Update user status
    async updateUserStatus(uid, status, adminUid) {
        try {
            const userRef = db.collection('users').doc(uid);
            const updateData = {
                status,
                derniereModif: new Date()
            };

            if (status === 'approved') {
                updateData.approved = true;
                updateData.approvalDate = new Date();
                updateData.approvedBy = adminUid;
                // Enable the user in Firebase Auth
                await auth.updateUser(uid, { disabled: false });
            } else if (status === 'suspended' || status === 'banned') {
                // Disable the user in Firebase Auth
                await auth.updateUser(uid, { disabled: true });
            }

            await userRef.update(updateData);
            return await this.getUserProfile(uid);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du statut: ' + error.message);
        }
    },

    // Get all users (admin only)
    async getAllUsers() {
        try {
            const usersSnapshot = await db.collection('users').get();
            return usersSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new Error('Erreur lors de la récupération des utilisateurs: ' + error.message);
        }
    },

    // Get pending users (admin only)
    async getPendingUsers() {
        try {
            const pendingSnapshot = await db.collection('users')
                .where('status', '==', 'pending')
                .get();
            return pendingSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new Error('Erreur lors de la récupération des utilisateurs en attente: ' + error.message);
        }
    },

    // Update last login
    async updateLastLogin(uid) {
        try {
            await db.collection('users').doc(uid).update({
                lastLogin: new Date()
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la dernière connexion:', error);
        }
    },

    // Delete user (admin only)
    async deleteUser(uid) {
        try {
            // Delete from Firestore
            await db.collection('users').doc(uid).delete();
            // Delete from Firebase Auth
            await auth.deleteUser(uid);
        } catch (error) {
            throw new Error('Erreur lors de la suppression de l\'utilisateur: ' + error.message);
        }
    }
};

export default userService; 