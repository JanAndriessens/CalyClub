import { auth, db } from './firebase.config.js';
import userService from './user.service.js';

const adminService = {
    // Approve a user
    async approveUser(userId, adminId) {
        try {
            return await userService.updateUserStatus(userId, 'approved', adminId);
        } catch (error) {
            throw new Error('Erreur lors de l\'approbation de l\'utilisateur: ' + error.message);
        }
    },

    // Reject a user
    async rejectUser(userId, adminId, reason) {
        try {
            // Update user document with rejection info
            await db.collection('users').doc(userId).update({
                status: 'rejected',
                rejectionDate: new Date(),
                rejectedBy: adminId,
                rejectionReason: reason
            });

            // Delete the user
            await userService.deleteUser(userId);
            return true;
        } catch (error) {
            throw new Error('Erreur lors du rejet de l\'utilisateur: ' + error.message);
        }
    },

    // Suspend a user
    async suspendUser(userId, adminId, reason) {
        try {
            await db.collection('users').doc(userId).update({
                status: 'suspended',
                suspensionDate: new Date(),
                suspendedBy: adminId,
                suspensionReason: reason
            });
            return await userService.updateUserStatus(userId, 'suspended', adminId);
        } catch (error) {
            throw new Error('Erreur lors de la suspension de l\'utilisateur: ' + error.message);
        }
    },

    // Ban a user
    async banUser(userId, adminId, reason) {
        try {
            await db.collection('users').doc(userId).update({
                status: 'banned',
                banDate: new Date(),
                bannedBy: adminId,
                banReason: reason
            });
            return await userService.updateUserStatus(userId, 'banned', adminId);
        } catch (error) {
            throw new Error('Erreur lors du bannissement de l\'utilisateur: ' + error.message);
        }
    },

    // Update user role
    async updateUserRole(userId, role) {
        try {
            // Update custom claims
            await auth.setCustomUserClaims(userId, { role });

            // Update Firestore document
            await db.collection('users').doc(userId).update({
                role,
                derniereModif: new Date()
            });

            return await userService.getUserProfile(userId);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du rôle: ' + error.message);
        }
    },

    // Get all users
    async getAllUsers() {
        try {
            return await userService.getAllUsers();
        } catch (error) {
            throw new Error('Erreur lors de la récupération des utilisateurs: ' + error.message);
        }
    },

    // Get pending users
    async getPendingUsers() {
        try {
            return await userService.getPendingUsers();
        } catch (error) {
            throw new Error('Erreur lors de la récupération des utilisateurs en attente: ' + error.message);
        }
    },

    // Get user activity log
    async getUserActivityLog(userId) {
        try {
            const logSnapshot = await db.collection('activity_logs')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            return logSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new Error('Erreur lors de la récupération des logs d\'activité: ' + error.message);
        }
    }
};

export default adminService; 