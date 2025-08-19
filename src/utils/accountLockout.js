import { getFirestore } from 'firebase-admin/firestore';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

const db = getFirestore();

export const accountLockout = {
    async checkLockout(email) {
        const lockoutRef = db.collection('accountLockouts').doc(email);
        const lockoutDoc = await lockoutRef.get();

        if (lockoutDoc.exists) {
            const lockoutData = lockoutDoc.data();
            const now = Date.now();

            if (lockoutData.lockedUntil > now) {
                const remainingTime = Math.ceil((lockoutData.lockedUntil - now) / 60000);
                throw new Error(`Compte temporairement bloqué. Réessayez dans ${remainingTime} minutes.`);
            }

            // Reset if lockout period has expired
            await lockoutRef.delete();
        }
    },

    async recordFailedAttempt(email) {
        const lockoutRef = db.collection('accountLockouts').doc(email);
        const lockoutDoc = await lockoutRef.get();

        if (lockoutDoc.exists) {
            const lockoutData = lockoutDoc.data();
            const failedAttempts = lockoutData.failedAttempts + 1;

            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                // Lock the account
                await lockoutRef.set({
                    failedAttempts,
                    lockedUntil: Date.now() + LOCKOUT_DURATION,
                    lastAttempt: Date.now()
                });
                throw new Error(`Trop de tentatives échouées. Compte bloqué pendant 15 minutes.`);
            } else {
                // Update failed attempts
                await lockoutRef.update({
                    failedAttempts,
                    lastAttempt: Date.now()
                });
            }
        } else {
            // First failed attempt
            await lockoutRef.set({
                failedAttempts: 1,
                lastAttempt: Date.now()
            });
        }
    },

    async resetFailedAttempts(email) {
        const lockoutRef = db.collection('accountLockouts').doc(email);
        await lockoutRef.delete();
    }
}; 