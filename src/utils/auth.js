import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const auth = getAuth();
const db = getFirestore();

export const authUtils = {
    async isAdmin(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            return userDoc.exists && userDoc.data().role === 'admin';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    },

    async checkAdminAccess(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Non autorisé' });
            }

            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await auth.verifyIdToken(token);
            const isAdmin = await this.isAdmin(decodedToken.uid);

            if (!isAdmin) {
                return res.status(403).json({ error: 'Accès refusé' });
            }

            req.user = decodedToken;
            next();
        } catch (error) {
            console.error('Error in admin access check:', error);
            res.status(401).json({ error: 'Non autorisé' });
        }
    }
}; 