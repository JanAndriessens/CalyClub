// Treasury Manager for CalyClub
// Handles bank transaction import, reconciliation, and financial reporting

class TreasuryManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.transactions = [];
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

    // Parse Belgian bank CSV formats
    parseBelgianBankCSV(csvContent, bankType = 'auto') {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const transactions = [];

        // Auto-detect bank format
        if (bankType === 'auto') {
            bankType = this.detectBankFormat(lines[0]);
        }

        switch (bankType) {
            case 'belfius':
                return this.parseBelfiusCSV(lines);
            case 'kbc':
                return this.parseKBCCSV(lines);
            case 'ing':
                return this.parseINGCSV(lines);
            case 'bnp':
                return this.parseBNPCSV(lines);
            case 'fortis':
                return this.parseFortisCSV(lines);
            default:
                return this.parseGenericCSV(lines);
        }
    }

    // Detect bank format from header
    detectBankFormat(headerLine) {
        const header = headerLine.toLowerCase();
        
        if (header.includes('belfius')) return 'belfius';
        if (header.includes('kbc') || header.includes('cbc')) return 'kbc';
        if (header.includes('ing')) return 'ing';
        if (header.includes('bnp') || header.includes('paribas')) return 'bnp';
        if (header.includes('fortis')) return 'fortis';
        
        // Check for specific column patterns
        if (header.includes('compte') && header.includes('date valeur')) return 'belfius';
        if (header.includes('rekeningnummer') && header.includes('valutadatum')) return 'kbc';
        
        return 'generic';
    }

    // Parse Belfius CSV format
    parseBelfiusCSV(lines) {
        const transactions = [];
        const isHeader = (line) => line.includes('Date') || line.includes('Compte');
        
        for (let i = 0; i < lines.length; i++) {
            if (isHeader(lines[i])) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < 7) continue;
            
            transactions.push({
                date: this.parseDate(parts[0]),
                valueDate: this.parseDate(parts[1]),
                account: parts[2],
                counterparty: parts[3],
                description: parts[4],
                amount: this.parseAmount(parts[5]),
                balance: this.parseAmount(parts[6]),
                reference: this.extractReference(parts[4]),
                type: this.categorizeTransaction(parts[4], this.parseAmount(parts[5])),
                bank: 'belfius'
            });
        }
        
        return transactions;
    }

    // Parse KBC/CBC CSV format
    parseKBCCSV(lines) {
        const transactions = [];
        const isHeader = (line) => line.includes('Rekeningnummer') || line.includes('Compte');
        
        for (let i = 0; i < lines.length; i++) {
            if (isHeader(lines[i])) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < 14) continue;
            
            transactions.push({
                date: this.parseDate(parts[5]),
                valueDate: this.parseDate(parts[9]),
                account: parts[0],
                counterparty: parts[13],
                description: parts[7],
                amount: this.parseAmount(parts[10]),
                balance: this.parseAmount(parts[11]),
                reference: parts[6],
                type: this.categorizeTransaction(parts[7], this.parseAmount(parts[10])),
                bank: 'kbc'
            });
        }
        
        return transactions;
    }

    // Parse ING CSV format
    parseINGCSV(lines) {
        const transactions = [];
        const isHeader = (line) => line.includes('Date') || line.includes('Datum');
        
        for (let i = 0; i < lines.length; i++) {
            if (isHeader(lines[i])) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < 8) continue;
            
            transactions.push({
                date: this.parseDate(parts[0]),
                valueDate: this.parseDate(parts[0]),
                account: parts[1],
                counterparty: parts[2],
                description: parts[5],
                amount: this.parseAmount(parts[6], parts[7]), // debit/credit columns
                balance: 0, // ING doesn't always provide balance
                reference: this.extractReference(parts[5]),
                type: this.categorizeTransaction(parts[5], this.parseAmount(parts[6], parts[7])),
                bank: 'ing'
            });
        }
        
        return transactions;
    }

    // Parse BNP Paribas Fortis CSV format
    parseBNPCSV(lines) {
        const transactions = [];
        const isHeader = (line) => line.includes('Date') || line.includes('Compte');
        
        for (let i = 0; i < lines.length; i++) {
            if (isHeader(lines[i])) continue;
            
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < 8) continue;
            
            transactions.push({
                date: this.parseDate(parts[0]),
                valueDate: this.parseDate(parts[1]),
                account: parts[2],
                counterparty: parts[4],
                description: parts[5],
                amount: this.parseAmount(parts[6]),
                balance: this.parseAmount(parts[7]),
                reference: this.extractReference(parts[5]),
                type: this.categorizeTransaction(parts[5], this.parseAmount(parts[6])),
                bank: 'bnp'
            });
        }
        
        return transactions;
    }

    // Parse generic CSV format
    parseGenericCSV(lines) {
        const transactions = [];
        const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase());
        
        // Map common column names
        const columnMap = {
            date: ['date', 'datum', 'data'],
            amount: ['amount', 'montant', 'bedrag', 'credit', 'debit'],
            description: ['description', 'communication', 'mededeling', 'libelle'],
            counterparty: ['counterparty', 'beneficiaire', 'begunstigde', 'nom'],
            reference: ['reference', 'ref', 'referentie'],
            balance: ['balance', 'solde', 'saldo']
        };
        
        // Find column indices
        const indices = {};
        for (const [key, variations] of Object.entries(columnMap)) {
            for (const variant of variations) {
                const index = headers.findIndex(h => h.includes(variant));
                if (index !== -1) {
                    indices[key] = index;
                    break;
                }
            }
        }
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < headers.length) continue;
            
            const amount = indices.amount !== undefined ? this.parseAmount(parts[indices.amount]) : 0;
            const description = indices.description !== undefined ? parts[indices.description] : '';
            
            transactions.push({
                date: indices.date !== undefined ? this.parseDate(parts[indices.date]) : new Date(),
                valueDate: indices.date !== undefined ? this.parseDate(parts[indices.date]) : new Date(),
                account: '',
                counterparty: indices.counterparty !== undefined ? parts[indices.counterparty] : '',
                description: description,
                amount: amount,
                balance: indices.balance !== undefined ? this.parseAmount(parts[indices.balance]) : 0,
                reference: this.extractReference(description),
                type: this.categorizeTransaction(description, amount),
                bank: 'generic'
            });
        }
        
        return transactions;
    }

    // Parse CSV line handling quotes and commas
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' || char === ';') {
                if (!inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            } else {
                current += char;
            }
        }
        
        if (current) {
            result.push(current.trim());
        }
        
        return result;
    }

    // Parse date in various formats
    parseDate(dateStr) {
        if (!dateStr) return new Date();
        
        // Remove quotes
        dateStr = dateStr.replace(/['"]/g, '').trim();
        
        // Try different date formats
        const formats = [
            /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
            /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
            /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
            /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
            /^(\d{2})\.(\d{2})\.(\d{4})$/ // DD.MM.YYYY
        ];
        
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (match[1].length === 4) {
                    // YYYY-MM-DD format
                    return new Date(match[1], parseInt(match[2]) - 1, match[3]);
                } else {
                    // DD-MM-YYYY format
                    return new Date(match[3], parseInt(match[2]) - 1, match[1]);
                }
            }
        }
        
        // Fallback to Date.parse
        const parsed = Date.parse(dateStr);
        return isNaN(parsed) ? new Date() : new Date(parsed);
    }

    // Parse amount handling different formats
    parseAmount(amountStr, creditStr = null) {
        if (!amountStr) return 0;
        
        // Handle separate debit/credit columns
        if (creditStr !== null) {
            const debit = this.parseAmount(amountStr);
            const credit = this.parseAmount(creditStr);
            return credit - debit;
        }
        
        // Remove quotes and spaces
        amountStr = amountStr.replace(/['"]/g, '').replace(/\s/g, '').trim();
        
        // Handle negative amounts
        const isNegative = amountStr.includes('-') || amountStr.includes('(');
        
        // Remove currency symbols and letters
        amountStr = amountStr.replace(/[€$£¥]/g, '').replace(/[A-Za-z]/g, '');
        
        // Handle European format (1.234,56) vs US format (1,234.56)
        if (amountStr.includes(',') && amountStr.includes('.')) {
            // If comma comes after dot, it's European format
            if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
                amountStr = amountStr.replace(/\./g, '').replace(',', '.');
            } else {
                amountStr = amountStr.replace(/,/g, '');
            }
        } else if (amountStr.includes(',')) {
            // Check if comma is decimal separator (European) or thousand separator (US)
            const parts = amountStr.split(',');
            if (parts[parts.length - 1].length <= 2) {
                // Likely decimal separator
                amountStr = amountStr.replace(/\./g, '').replace(',', '.');
            } else {
                // Likely thousand separator
                amountStr = amountStr.replace(/,/g, '');
            }
        }
        
        const amount = parseFloat(amountStr) || 0;
        return isNegative && amount > 0 ? -amount : amount;
    }

    // Extract reference from description
    extractReference(description) {
        if (!description) return '';
        
        // Look for common reference patterns
        const patterns = [
            /REF[:\s]*([A-Z0-9\-]+)/i,
            /REFERENCE[:\s]*([A-Z0-9\-]+)/i,
            /COMMUNICATION[:\s]*([A-Z0-9\-]+)/i,
            /OGM[:\s]*([0-9\+\/]+)/i,
            /\+\+\+([0-9\/]+)\+\+\+/,
            /MEDEDELING[:\s]*([A-Z0-9\-]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        // If no pattern matches, try to extract any alphanumeric sequence
        const alphaNumMatch = description.match(/\b([A-Z]{2,}[\-]?[0-9]{4,}[\-]?[A-Z0-9]*)\b/i);
        return alphaNumMatch ? alphaNumMatch[1] : '';
    }

    // Categorize transaction based on description and amount
    categorizeTransaction(description, amount) {
        const desc = description.toLowerCase();
        
        // Income categories
        if (amount > 0) {
            if (desc.includes('cotisation') || desc.includes('membership')) return 'membership';
            if (desc.includes('sponsor')) return 'sponsorship';
            if (desc.includes('subsid') || desc.includes('grant')) return 'subsidy';
            if (desc.includes('event') || desc.includes('événement')) return 'event';
            if (desc.includes('training') || desc.includes('entrainement')) return 'training';
            if (desc.includes('donation') || desc.includes('don')) return 'donation';
            return 'other_income';
        }
        
        // Expense categories
        if (desc.includes('salaire') || desc.includes('salary')) return 'salary';
        if (desc.includes('loyer') || desc.includes('rent')) return 'rent';
        if (desc.includes('électric') || desc.includes('electric') || desc.includes('gaz') || desc.includes('eau')) return 'utilities';
        if (desc.includes('assurance') || desc.includes('insurance')) return 'insurance';
        if (desc.includes('équipement') || desc.includes('equipment')) return 'equipment';
        if (desc.includes('transport')) return 'transport';
        if (desc.includes('frais') || desc.includes('fee')) return 'fees';
        if (desc.includes('tax') || desc.includes('impôt')) return 'taxes';
        
        return amount > 0 ? 'other_income' : 'other_expense';
    }

    // Import transactions to database
    async importTransactions(transactions) {
        const batch = this.db.batch();
        const imported = [];
        const duplicates = [];
        
        for (const transaction of transactions) {
            // Check for duplicates
            const isDuplicate = await this.checkDuplicateTransaction(transaction);
            
            if (isDuplicate) {
                duplicates.push(transaction);
                continue;
            }
            
            // Add to batch
            const docRef = this.db.collection('treasury').doc();
            batch.set(docRef, {
                ...transaction,
                importedAt: firebase.firestore.FieldValue.serverTimestamp(),
                importedBy: this.currentUser?.uid,
                reconciled: false,
                matchedPaymentId: null
            });
            
            imported.push({
                ...transaction,
                id: docRef.id
            });
        }
        
        // Commit batch
        if (imported.length > 0) {
            await batch.commit();
        }
        
        return {
            imported: imported,
            duplicates: duplicates,
            total: transactions.length
        };
    }

    // Check for duplicate transactions
    async checkDuplicateTransaction(transaction) {
        const query = await this.db.collection('treasury')
            .where('date', '==', transaction.date)
            .where('amount', '==', transaction.amount)
            .where('description', '==', transaction.description)
            .limit(1)
            .get();
        
        return !query.empty;
    }

    // Reconcile transactions with payments
    async reconcileTransactions() {
        // Get unreconciled transactions
        const transactionsSnapshot = await this.db.collection('treasury')
            .where('reconciled', '==', false)
            .where('amount', '>', 0) // Income only
            .get();
        
        // Get pending payments
        const paymentsSnapshot = await this.db.collection('payments')
            .where('status', '==', 'pending')
            .get();
        
        const matches = [];
        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Try to match transactions with payments
        for (const transaction of transactions) {
            for (const payment of payments) {
                const match = this.matchTransactionToPayment(transaction, payment);
                
                if (match.confidence > 0.7) {
                    matches.push({
                        transaction: transaction,
                        payment: payment,
                        confidence: match.confidence,
                        matchType: match.type
                    });
                }
            }
        }
        
        return matches;
    }

    // Match transaction to payment
    matchTransactionToPayment(transaction, payment) {
        let confidence = 0;
        let matchType = [];
        
        // Match by reference
        if (transaction.reference && payment.reference) {
            if (transaction.reference === payment.reference) {
                confidence += 0.5;
                matchType.push('reference');
            } else if (transaction.description?.includes(payment.reference)) {
                confidence += 0.3;
                matchType.push('reference_partial');
            }
        }
        
        // Match by amount
        if (Math.abs(transaction.amount - payment.amount) < 0.01) {
            confidence += 0.3;
            matchType.push('amount');
        } else if (Math.abs(transaction.amount - payment.amount) < 1) {
            confidence += 0.1;
            matchType.push('amount_close');
        }
        
        // Match by date (within 7 days)
        const transDate = transaction.date instanceof Date ? transaction.date : transaction.date.toDate();
        const payDate = payment.createdAt?.toDate?.() || new Date();
        const daysDiff = Math.abs((transDate - payDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 7) {
            confidence += 0.2 * (1 - daysDiff / 7);
            matchType.push('date');
        }
        
        // Match by description/member name
        if (payment.memberName && transaction.description) {
            const memberName = payment.memberName.toLowerCase();
            const description = transaction.description.toLowerCase();
            
            if (description.includes(memberName) || transaction.counterparty?.toLowerCase().includes(memberName)) {
                confidence += 0.2;
                matchType.push('name');
            }
        }
        
        return {
            confidence: Math.min(confidence, 1),
            type: matchType
        };
    }

    // Confirm reconciliation match
    async confirmReconciliation(transactionId, paymentId) {
        const batch = this.db.batch();
        
        // Update transaction
        batch.update(this.db.collection('treasury').doc(transactionId), {
            reconciled: true,
            matchedPaymentId: paymentId,
            reconciledAt: firebase.firestore.FieldValue.serverTimestamp(),
            reconciledBy: this.currentUser?.uid
        });
        
        // Update payment status
        batch.update(this.db.collection('payments').doc(paymentId), {
            status: 'confirmed',
            transactionId: transactionId,
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        return true;
    }

    // Generate financial report
    async generateFinancialReport(startDate, endDate) {
        const transactionsSnapshot = await this.db.collection('treasury')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc')
            .get();
        
        const transactions = transactionsSnapshot.docs.map(doc => doc.data());
        
        const report = {
            period: {
                start: startDate,
                end: endDate
            },
            summary: {
                totalIncome: 0,
                totalExpenses: 0,
                netResult: 0,
                transactionCount: transactions.length
            },
            byCategory: {},
            byMonth: {},
            transactions: transactions
        };
        
        // Calculate totals and categorize
        transactions.forEach(transaction => {
            const amount = transaction.amount;
            const category = transaction.type;
            const date = transaction.date instanceof Date ? transaction.date : transaction.date.toDate();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // Update totals
            if (amount > 0) {
                report.summary.totalIncome += amount;
            } else {
                report.summary.totalExpenses += Math.abs(amount);
            }
            
            // By category
            if (!report.byCategory[category]) {
                report.byCategory[category] = {
                    income: 0,
                    expenses: 0,
                    count: 0
                };
            }
            
            if (amount > 0) {
                report.byCategory[category].income += amount;
            } else {
                report.byCategory[category].expenses += Math.abs(amount);
            }
            report.byCategory[category].count++;
            
            // By month
            if (!report.byMonth[monthKey]) {
                report.byMonth[monthKey] = {
                    income: 0,
                    expenses: 0,
                    count: 0
                };
            }
            
            if (amount > 0) {
                report.byMonth[monthKey].income += amount;
            } else {
                report.byMonth[monthKey].expenses += Math.abs(amount);
            }
            report.byMonth[monthKey].count++;
        });
        
        report.summary.netResult = report.summary.totalIncome - report.summary.totalExpenses;
        
        return report;
    }

    // Export transactions to CSV
    exportTransactionsToCSV(transactions, filename = 'treasury_export.csv') {
        const headers = [
            'Date',
            'Value Date',
            'Account',
            'Counterparty',
            'Description',
            'Reference',
            'Amount',
            'Balance',
            'Category',
            'Reconciled',
            'Bank'
        ];
        
        const rows = transactions.map(t => [
            t.date instanceof Date ? t.date.toLocaleDateString() : t.date?.toDate?.()?.toLocaleDateString() || '',
            t.valueDate instanceof Date ? t.valueDate.toLocaleDateString() : t.valueDate?.toDate?.()?.toLocaleDateString() || '',
            t.account || '',
            t.counterparty || '',
            t.description || '',
            t.reference || '',
            t.amount?.toFixed(2) || '0.00',
            t.balance?.toFixed(2) || '0.00',
            t.type || '',
            t.reconciled ? 'Yes' : 'No',
            t.bank || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    // Get account balance history
    async getBalanceHistory(startDate, endDate) {
        const snapshot = await this.db.collection('treasury')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'asc')
            .get();
        
        const balanceHistory = [];
        let runningBalance = 0;
        
        snapshot.docs.forEach(doc => {
            const transaction = doc.data();
            runningBalance += transaction.amount;
            
            balanceHistory.push({
                date: transaction.date,
                balance: runningBalance,
                transaction: transaction.description,
                amount: transaction.amount
            });
        });
        
        return balanceHistory;
    }
}

// Initialize treasury manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.treasuryManager = new TreasuryManager();
    });
} else {
    window.treasuryManager = new TreasuryManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TreasuryManager;
}