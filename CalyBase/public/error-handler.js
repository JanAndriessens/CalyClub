// Centralized Error Handling for CalyBase
// Standardizes error handling patterns across the application

(function() {
    'use strict';

    // Error categories for better organization
    const ERROR_TYPES = {
        FIREBASE: 'firebase',
        AUTH: 'auth',
        NETWORK: 'network',
        VALIDATION: 'validation',
        PERMISSION: 'permission',
        UNKNOWN: 'unknown'
    };

    // Error handling utility class
    class ErrorHandler {
        
        /**
         * Standardized error logging with context
         * @param {Error|string} error - The error object or message
         * @param {string} context - Where the error occurred
         * @param {Object} metadata - Additional error context
         */
        static log(error, context = 'Unknown', metadata = {}) {
            const timestamp = new Date().toISOString();
            const errorInfo = {
                timestamp,
                context,
                message: error?.message || error,
                stack: error?.stack,
                code: error?.code,
                metadata,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            console.error(`❌ [${context}] Error:`, errorInfo);
            
            // Store in session for debugging
            try {
                const errorLog = JSON.parse(sessionStorage.getItem('calybase_errors') || '[]');
                errorLog.push(errorInfo);
                
                // Keep only last 50 errors
                if (errorLog.length > 50) {
                    errorLog.splice(0, errorLog.length - 50);
                }
                
                sessionStorage.setItem('calybase_errors', JSON.stringify(errorLog));
            } catch (storageError) {
                console.warn('Could not store error in sessionStorage:', storageError);
            }
            
            return errorInfo;
        }

        /**
         * Categorize error type for better handling
         * @param {Error} error - The error object
         * @returns {string} - Error category
         */
        static categorizeError(error) {
            if (!error) return ERROR_TYPES.UNKNOWN;
            
            const message = error.message?.toLowerCase() || '';
            const code = error.code?.toLowerCase() || '';
            
            // Firebase errors
            if (code.includes('firebase') || code.includes('firestore') || 
                message.includes('firebase') || message.includes('firestore')) {
                return ERROR_TYPES.FIREBASE;
            }
            
            // Auth errors
            if (code.includes('auth') || message.includes('auth') || 
                code.includes('permission') || message.includes('permission')) {
                return ERROR_TYPES.AUTH;
            }
            
            // Network errors
            if (message.includes('network') || message.includes('fetch') || 
                message.includes('connection') || code.includes('network')) {
                return ERROR_TYPES.NETWORK;
            }
            
            // Validation errors
            if (message.includes('invalid') || message.includes('required') || 
                message.includes('validation')) {
                return ERROR_TYPES.VALIDATION;
            }
            
            return ERROR_TYPES.UNKNOWN;
        }

        /**
         * Get user-friendly error message
         * @param {Error} error - The error object
         * @param {string} fallbackMessage - Default message if no mapping found
         * @returns {string} - User-friendly error message
         */
        static getUserMessage(error, fallbackMessage = null) {
            if (!error) return fallbackMessage || window.CONSTANTS?.MESSAGES?.ERRORS?.UNKNOWN_ERROR;
            
            const constants = window.CONSTANTS?.MESSAGES?.ERRORS;
            const code = error.code?.toLowerCase() || '';
            const message = error.message?.toLowerCase() || '';
            
            // Firebase specific error codes
            const firebaseMessages = {
                'auth/user-not-found': 'Utilisateur non trouvé',
                'auth/wrong-password': 'Mot de passe incorrect',
                'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
                'auth/weak-password': 'Le mot de passe est trop faible',
                'auth/invalid-email': 'Adresse email invalide',
                'auth/network-request-failed': constants?.NETWORK_ERROR || 'Erreur de réseau',
                'permission-denied': constants?.ADMIN_REQUIRED || 'Permissions insuffisantes'
            };
            
            // Check specific Firebase codes first
            if (firebaseMessages[code]) {
                return firebaseMessages[code];
            }
            
            // Check message content
            if (message.includes('network') || message.includes('connection')) {
                return constants?.NETWORK_ERROR || 'Erreur de réseau - vérifiez votre connexion';
            }
            
            if (message.includes('permission') || message.includes('admin')) {
                return constants?.ADMIN_REQUIRED || 'Permissions insuffisantes';
            }
            
            if (message.includes('firebase') && message.includes('not available')) {
                return constants?.FIREBASE_INIT || 'Firebase non disponible - rafraîchissez la page';
            }
            
            // Return the original message if it's user-friendly, otherwise use fallback
            const originalMessage = error.message || error.toString();
            if (originalMessage.length < 100 && !originalMessage.includes('Error:')) {
                return originalMessage;
            }
            
            return fallbackMessage || constants?.UNKNOWN_ERROR || 'Une erreur inattendue s\'est produite';
        }

        /**
         * Handle error with consistent user notification
         * @param {Error} error - The error object
         * @param {string} context - Where the error occurred
         * @param {Object} options - Handling options
         * @returns {Object} - Error handling result
         */
        static handle(error, context = 'Unknown', options = {}) {
            const {
                showUser = true,
                redirectOnAuth = true,
                fallbackMessage = null,
                metadata = {}
            } = options;
            
            // Log the error
            const errorInfo = this.log(error, context, metadata);
            
            // Categorize error
            const category = this.categorizeError(error);
            
            // Get user-friendly message
            const userMessage = this.getUserMessage(error, fallbackMessage);
            
            // Handle auth errors with redirect
            if (category === ERROR_TYPES.AUTH && redirectOnAuth) {
                if (showUser) {
                    alert(userMessage);
                }
                
                setTimeout(() => {
                    window.location.href = window.CONSTANTS?.PATHS?.LOGIN || '/login.html';
                }, 1000);
                
                return { category, userMessage, redirected: true, errorInfo };
            }
            
            // Show user notification
            if (showUser) {
                // Try to use a toast notification if available, otherwise use alert
                if (window.showToast && typeof window.showToast === 'function') {
                    window.showToast(userMessage, 'error');
                } else {
                    alert(userMessage);
                }
            }
            
            return { category, userMessage, redirected: false, errorInfo };
        }

        /**
         * Wrap async functions with standardized error handling
         * @param {Function} asyncFn - The async function to wrap
         * @param {string} context - Context name for errors
         * @param {Object} options - Error handling options
         * @returns {Function} - Wrapped function
         */
        static wrapAsync(asyncFn, context, options = {}) {
            return async function(...args) {
                try {
                    return await asyncFn.apply(this, args);
                } catch (error) {
                    ErrorHandler.handle(error, context, options);
                    throw error; // Re-throw for caller to handle if needed
                }
            };
        }

        /**
         * Wrap promises with standardized error handling
         * @param {Promise} promise - The promise to wrap
         * @param {string} context - Context name for errors
         * @param {Object} options - Error handling options
         * @returns {Promise} - Wrapped promise
         */
        static wrapPromise(promise, context, options = {}) {
            return promise.catch(error => {
                ErrorHandler.handle(error, context, options);
                throw error; // Re-throw for caller to handle if needed
            });
        }

        /**
         * Get error logs for debugging
         * @param {number} limit - Number of recent errors to get
         * @returns {Array} - Array of error logs
         */
        static getErrorLogs(limit = 10) {
            try {
                const errorLog = JSON.parse(sessionStorage.getItem('calybase_errors') || '[]');
                return errorLog.slice(-limit);
            } catch (error) {
                console.warn('Could not retrieve error logs:', error);
                return [];
            }
        }

        /**
         * Clear error logs
         */
        static clearErrorLogs() {
            try {
                sessionStorage.removeItem('calybase_errors');
                console.log('Error logs cleared');
            } catch (error) {
                console.warn('Could not clear error logs:', error);
            }
        }
    }

    // Make ErrorHandler globally available
    window.ErrorHandler = ErrorHandler;
    window.ERROR_TYPES = ERROR_TYPES;

    console.log('🛡️ Error Handler loaded successfully');

})(); 