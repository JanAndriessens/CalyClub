// Client-side Account Lockout Utility
// Works with Firebase Firestore from the browser

class AccountLockoutClient {
    constructor() {
        this.MAX_FAILED_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
    }

    async checkLockout(email) {
        try {
            if (!window.db) {
                console.warn('Firestore not available, skipping lockout check');
                return; // Don't block if Firestore isn't available
            }

            const lockoutRef = window.db.collection('accountLockouts').doc(email);
            const lockoutDoc = await lockoutRef.get();

            if (lockoutDoc.exists) {
                const lockoutData = lockoutDoc.data();
                const now = Date.now();

                if (lockoutData.lockedUntil && lockoutData.lockedUntil > now) {
                    const remainingTime = Math.ceil((lockoutData.lockedUntil - now) / 60000);
                    throw new Error(`Compte temporairement bloqué. Réessayez dans ${remainingTime} minutes.`);
                }

                // Reset if lockout period has expired
                if (lockoutData.lockedUntil && lockoutData.lockedUntil <= now) {
                    await lockoutRef.delete();
                    console.log('🔓 Account lockout expired and removed for:', email);
                }
            }
        } catch (error) {
            if (error.message.includes('Compte temporairement bloqué')) {
                throw error; // Re-throw lockout errors
            }
            console.warn('Error checking account lockout:', error);
            // Don't block login if there's a technical error checking lockout
        }
    }

    async recordFailedAttempt(email) {
        try {
            if (!window.db) {
                console.warn('Firestore not available, cannot record failed attempt');
                return;
            }

            const lockoutRef = window.db.collection('accountLockouts').doc(email);
            const lockoutDoc = await lockoutRef.get();

            if (lockoutDoc.exists) {
                const lockoutData = lockoutDoc.data();
                const failedAttempts = (lockoutData.failedAttempts || 0) + 1;

                if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                    // Lock the account
                    await lockoutRef.set({
                        failedAttempts,
                        lockedUntil: Date.now() + this.LOCKOUT_DURATION,
                        lastAttempt: Date.now(),
                        email: email
                    });
                    
                    console.log(`🔒 Account locked for ${email} after ${failedAttempts} failed attempts`);
                    throw new Error(`Trop de tentatives échouées. Compte bloqué pendant 15 minutes.`);
                } else {
                    // Update failed attempts
                    await lockoutRef.update({
                        failedAttempts,
                        lastAttempt: Date.now()
                    });
                    
                    const remainingAttempts = this.MAX_FAILED_ATTEMPTS - failedAttempts;
                    console.log(`⚠️ Failed attempt recorded for ${email}. ${remainingAttempts} attempts remaining.`);
                }
            } else {
                // First failed attempt
                await lockoutRef.set({
                    failedAttempts: 1,
                    lastAttempt: Date.now(),
                    email: email
                });
                
                const remainingAttempts = this.MAX_FAILED_ATTEMPTS - 1;
                console.log(`⚠️ First failed attempt recorded for ${email}. ${remainingAttempts} attempts remaining.`);
            }
        } catch (error) {
            if (error.message.includes('Trop de tentatives échouées')) {
                throw error; // Re-throw lockout errors
            }
            console.warn('Error recording failed attempt:', error);
            // Don't block the error handling if there's a technical issue
        }
    }

    async resetFailedAttempts(email) {
        try {
            if (!window.db) {
                console.warn('Firestore not available, cannot reset failed attempts');
                return;
            }

            const lockoutRef = window.db.collection('accountLockouts').doc(email);
            await lockoutRef.delete();
            console.log('✅ Failed attempts reset for:', email);
        } catch (error) {
            console.warn('Error resetting failed attempts:', error);
            // Don't block successful login if there's an issue resetting
        }
    }

    async getFailedAttempts(email) {
        try {
            if (!window.db) return 0;

            const lockoutRef = window.db.collection('accountLockouts').doc(email);
            const lockoutDoc = await lockoutRef.get();

            if (lockoutDoc.exists) {
                const lockoutData = lockoutDoc.data();
                return lockoutData.failedAttempts || 0;
            }
            return 0;
        } catch (error) {
            console.warn('Error getting failed attempts:', error);
            return 0;
        }
    }

    // Debug function to check lockout status
    async debugLockoutStatus(email) {
        try {
            if (!window.db) {
                console.log('❌ Firestore not available');
                return;
            }

            const lockoutRef = window.db.collection('accountLockouts').doc(email);
            const lockoutDoc = await lockoutRef.get();

            if (lockoutDoc.exists) {
                const lockoutData = lockoutDoc.data();
                const now = Date.now();
                const isLocked = lockoutData.lockedUntil && lockoutData.lockedUntil > now;
                const remainingTime = isLocked ? Math.ceil((lockoutData.lockedUntil - now) / 60000) : 0;

                console.log(`🔍 Lockout status for ${email}:`);
                console.log(`   Failed attempts: ${lockoutData.failedAttempts || 0}`);
                console.log(`   Is locked: ${isLocked}`);
                console.log(`   Remaining lockout time: ${remainingTime} minutes`);
                console.log(`   Last attempt: ${lockoutData.lastAttempt ? new Date(lockoutData.lastAttempt).toLocaleString() : 'Never'}`);
            } else {
                console.log(`✅ No lockout record for ${email} - account is clean`);
            }
        } catch (error) {
            console.error('Error checking lockout status:', error);
        }
    }
}

// Create global instance
window.accountLockout = new AccountLockoutClient();

// Debug function available globally
window.checkLockoutStatus = function(email) {
    if (!email) {
        console.log('Usage: checkLockoutStatus("user@example.com")');
        return;
    }
    return window.accountLockout.debugLockoutStatus(email);
}; 