import { db } from './firebase.config.js';

const activityService = {
    // Log user activity
    async logActivity(userId, action, details = {}) {
        try {
            await db.collection('activity_logs').add({
                userId,
                action,
                details,
                timestamp: new Date(),
                ip: details.ip || null,
                userAgent: details.userAgent || null
            });
        } catch (error) {
            console.error('Erreur lors de la journalisation de l\'activité:', error);
        }
    },

    // Log login attempt
    async logLoginAttempt(userId, success, details = {}) {
        try {
            await this.logActivity(userId, 'login_attempt', {
                ...details,
                success
            });
        } catch (error) {
            console.error('Erreur lors de la journalisation de la tentative de connexion:', error);
        }
    },

    // Log profile update
    async logProfileUpdate(userId, updatedFields) {
        try {
            await this.logActivity(userId, 'profile_update', {
                updatedFields
            });
        } catch (error) {
            console.error('Erreur lors de la journalisation de la mise à jour du profil:', error);
        }
    },

    // Log status change
    async logStatusChange(userId, newStatus, changedBy, reason = null) {
        try {
            await this.logActivity(userId, 'status_change', {
                newStatus,
                changedBy,
                reason
            });
        } catch (error) {
            console.error('Erreur lors de la journalisation du changement de statut:', error);
        }
    },

    // Log role change
    async logRoleChange(userId, newRole, changedBy) {
        try {
            await this.logActivity(userId, 'role_change', {
                newRole,
                changedBy
            });
        } catch (error) {
            console.error('Erreur lors de la journalisation du changement de rôle:', error);
        }
    },

    // Get user activity log
    async getUserActivityLog(userId, limit = 50) {
        try {
            const logSnapshot = await db.collection('activity_logs')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return logSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new Error('Erreur lors de la récupération des logs d\'activité: ' + error.message);
        }
    },

    // Get recent activity for all users
    async getRecentActivity(limit = 100) {
        try {
            const logSnapshot = await db.collection('activity_logs')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return logSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            throw new Error('Erreur lors de la récupération des activités récentes: ' + error.message);
        }
    }
};

export default activityService; 