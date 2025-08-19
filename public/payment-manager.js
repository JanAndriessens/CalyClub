// Payment Manager for CalyClub
// Handles payment QR code generation, payment tracking, and Payconiq integration preparation

class PaymentManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Wait for Firebase to be initialized
        if (typeof window.firebaseConfigPromise !== 'undefined') {
            await window.firebaseConfigPromise;
        }

        this.db = window.db;
        this.auth = window.auth;

        // Listen for auth state changes
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
        });
    }

    // Generate QR code for payment
    async generatePaymentQR(paymentData) {
        const {
            amount,
            reference,
            memberName,
            description,
            type = 'membership' // membership, event, other
        } = paymentData;

        // Format for Payconiq/SEPA QR code standard
        const qrData = {
            // BCD format for SEPA Credit Transfer
            serviceTag: 'BCD',
            version: '002',
            characterSet: '1', // UTF-8
            identification: 'SCT',
            bic: '', // Will be filled with club's bank BIC
            beneficiaryName: 'CalyClub',
            iban: '', // Will be filled with club's IBAN
            amount: `EUR${amount.toFixed(2)}`,
            purpose: '', // Purpose code
            reference: reference || this.generateReference(type),
            remittanceInfo: description || `${type} - ${memberName}`,
            information: ''
        };

        // Create structured payment string for QR
        const qrString = this.formatSEPAString(qrData);
        
        // Generate QR code using qrcode.js library
        const qrCodeDataUrl = await this.createQRCode(qrString);
        
        // Save payment request to database
        const paymentRequest = await this.savePaymentRequest({
            ...paymentData,
            qrData,
            qrCodeDataUrl,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return {
            qrCodeDataUrl,
            paymentRequest,
            reference: qrData.reference
        };
    }

    // Format SEPA QR string according to EPC standard
    formatSEPAString(data) {
        const lines = [
            data.serviceTag,
            data.version,
            data.characterSet,
            data.identification,
            data.bic,
            data.beneficiaryName,
            data.iban,
            data.amount,
            data.purpose,
            data.reference,
            data.remittanceInfo,
            data.information
        ];
        return lines.join('\n');
    }

    // Create QR code image
    async createQRCode(text) {
        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            // Load QRCode library dynamically if not present
            await this.loadQRCodeLibrary();
        }

        return new Promise((resolve, reject) => {
            try {
                const qr = new QRCode(document.createElement('div'), {
                    text: text,
                    width: 256,
                    height: 256,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Get the canvas element and convert to data URL
                setTimeout(() => {
                    const canvas = qr._el.querySelector('canvas');
                    if (canvas) {
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        reject(new Error('Failed to generate QR code'));
                    }
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Load QRCode library dynamically
    loadQRCodeLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof QRCode !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load QRCode library'));
            document.head.appendChild(script);
        });
    }

    // Generate unique payment reference
    generateReference(type) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const typePrefix = type.substring(0, 3).toUpperCase();
        return `${typePrefix}-${timestamp}-${random}`;
    }

    // Save payment request to Firestore
    async savePaymentRequest(paymentData) {
        try {
            const docRef = await this.db.collection('payments').add({
                ...paymentData,
                userId: this.currentUser?.uid,
                userEmail: this.currentUser?.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                id: docRef.id,
                ...paymentData
            };
        } catch (error) {
            console.error('Error saving payment request:', error);
            throw error;
        }
    }

    // Get payment history for a member
    async getMemberPayments(memberId) {
        try {
            const snapshot = await this.db.collection('payments')
                .where('memberId', '==', memberId)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching member payments:', error);
            return [];
        }
    }

    // Update payment status
    async updatePaymentStatus(paymentId, status, transactionDetails = {}) {
        try {
            await this.db.collection('payments').doc(paymentId).update({
                status,
                ...transactionDetails,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // If payment is confirmed, update member's payment status
            if (status === 'confirmed' && transactionDetails.memberId) {
                await this.updateMemberPaymentStatus(transactionDetails.memberId, transactionDetails);
            }

            return true;
        } catch (error) {
            console.error('Error updating payment status:', error);
            return false;
        }
    }

    // Update member's payment status
    async updateMemberPaymentStatus(memberId, paymentDetails) {
        try {
            const memberRef = this.db.collection('membres').doc(memberId);
            const memberDoc = await memberRef.get();
            
            if (memberDoc.exists) {
                const currentPayments = memberDoc.data().payments || [];
                currentPayments.push({
                    date: new Date().toISOString(),
                    amount: paymentDetails.amount,
                    reference: paymentDetails.reference,
                    type: paymentDetails.type
                });

                await memberRef.update({
                    payments: currentPayments,
                    lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp(),
                    membershipStatus: 'active'
                });
            }
        } catch (error) {
            console.error('Error updating member payment status:', error);
        }
    }

    // Get all pending payments
    async getPendingPayments() {
        try {
            const snapshot = await this.db.collection('payments')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching pending payments:', error);
            return [];
        }
    }

    // Generate payment statistics
    async getPaymentStatistics(startDate, endDate) {
        try {
            const snapshot = await this.db.collection('payments')
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate)
                .where('status', '==', 'confirmed')
                .get();

            const payments = snapshot.docs.map(doc => doc.data());
            
            const stats = {
                totalAmount: 0,
                totalCount: payments.length,
                byType: {},
                byMonth: {}
            };

            payments.forEach(payment => {
                stats.totalAmount += payment.amount || 0;
                
                // Group by type
                const type = payment.type || 'other';
                if (!stats.byType[type]) {
                    stats.byType[type] = { count: 0, amount: 0 };
                }
                stats.byType[type].count++;
                stats.byType[type].amount += payment.amount || 0;

                // Group by month
                const date = payment.createdAt?.toDate?.() || new Date();
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!stats.byMonth[monthKey]) {
                    stats.byMonth[monthKey] = { count: 0, amount: 0 };
                }
                stats.byMonth[monthKey].count++;
                stats.byMonth[monthKey].amount += payment.amount || 0;
            });

            return stats;
        } catch (error) {
            console.error('Error generating payment statistics:', error);
            return null;
        }
    }

    // Export payments to CSV
    exportPaymentsToCSV(payments) {
        const headers = ['Date', 'Reference', 'Member', 'Type', 'Amount', 'Status', 'Description'];
        const rows = payments.map(p => [
            p.createdAt?.toDate?.()?.toLocaleDateString() || '',
            p.reference || '',
            p.memberName || '',
            p.type || '',
            p.amount?.toFixed(2) || '0.00',
            p.status || '',
            p.description || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // Prepare Payconiq integration (ready for when merchant account is available)
    preparePayconiqIntegration(merchantConfig) {
        // This will be activated when merchant account is ready
        this.payconiqConfig = {
            merchantId: merchantConfig.merchantId || '',
            apiKey: merchantConfig.apiKey || '',
            callbackUrl: merchantConfig.callbackUrl || `${window.location.origin}/api/payment-callback`,
            environment: merchantConfig.environment || 'production'
        };

        console.log('Payconiq integration prepared. Awaiting merchant account activation.');
        return this.payconiqConfig;
    }

    // Create Payconiq payment request (for future use)
    async createPayconiqPayment(amount, reference, description) {
        if (!this.payconiqConfig?.merchantId) {
            throw new Error('Payconiq merchant account not configured');
        }

        // This will make actual API call when merchant account is ready
        const paymentRequest = {
            amount: Math.round(amount * 100), // Amount in cents
            currency: 'EUR',
            reference: reference,
            description: description,
            callbackUrl: this.payconiqConfig.callbackUrl
        };

        console.log('Payconiq payment request prepared:', paymentRequest);
        return paymentRequest;
    }
}

// Initialize payment manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.paymentManager = new PaymentManager();
    });
} else {
    window.paymentManager = new PaymentManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}