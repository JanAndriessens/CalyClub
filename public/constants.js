// Application Constants for CalyBase
// Centralized constants to avoid magic numbers and hardcoded values

(function() {
    'use strict';

    // Timing constants (in milliseconds)
    const TIMEOUTS = {
        // Firebase initialization
        FIREBASE_INIT_DESKTOP: 3000,
        FIREBASE_INIT_MOBILE: 5000,
        FIREBASE_AUTH_CHECK: 10000,
        
        // Polling intervals
        CHECK_INTERVAL_DESKTOP: 100,
        CHECK_INTERVAL_MOBILE: 250,
        
        // Max attempts
        MAX_ATTEMPTS_DESKTOP: 30,
        MAX_ATTEMPTS_MOBILE: 20,
        
        // User interactions
        DEBOUNCE_SEARCH: 300,
        ANIMATION_DURATION: 500,
        MESSAGE_DISPLAY: 1500,
        
        // Session and security
        SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
        INACTIVITY_TIMEOUT: 20 * 60 * 1000, // 20 minutes
        RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
        AUTO_LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
    };

    // Database constants
    const DATABASE = {
        // Firestore batch limits
        BATCH_SIZE: 10,
        MAX_BATCH_SIZE: 500,
        
        // Pagination
        DEFAULT_PAGE_SIZE: 25,
        MAX_PAGE_SIZE: 100,
        
        // Query limits
        MAX_QUERY_RESULTS: 1000,
        
        // Cache settings
        CACHE_SIZE_UNLIMITED: -1
    };

    // File and upload constants
    const FILES = {
        // Avatar settings
        MAX_AVATAR_SIZE_MB: 5,
        MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024,
        AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        
        // Document settings
        MAX_DOCUMENT_SIZE_MB: 10,
        MAX_DOCUMENT_SIZE_BYTES: 10 * 1024 * 1024
    };

    // UI constants
    const UI = {
        // Grid and layout
        CARD_MIN_WIDTH: 250,
        CARD_MAX_WIDTH: 400,
        
        // Animation settings
        FADE_DURATION: 300,
        SLIDE_DURATION: 400,
        
        // Loading states
        LOADING_SPINNER_DELAY: 200,
        SKELETON_LOADER_DELAY: 100
    };

    // Security constants
    const SECURITY = {
        // Rate limiting
        MAX_REQUESTS_PER_WINDOW: 100,
        MAX_FAILED_LOGINS: 5,
        
        // Password requirements
        MIN_PASSWORD_LENGTH: 8,
        MAX_PASSWORD_LENGTH: 128,
        
        // Session settings
        COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
        
        // Admin emails (to be moved to database eventually)
        ADMIN_EMAILS: ['jan@andriessens.be', 'jan.andriessens@gmail.com', 'james.hughes@skynet.be']
    };

    // Validation constants
    const VALIDATION = {
        // User input
        MIN_USERNAME_LENGTH: 3,
        MAX_USERNAME_LENGTH: 50,
        MIN_NAME_LENGTH: 2,
        MAX_NAME_LENGTH: 100,
        
        // Search
        MIN_SEARCH_LENGTH: 2,
        MAX_SEARCH_LENGTH: 100
    };

    // Error messages (French)
    const MESSAGES = {
        ERRORS: {
            FIREBASE_INIT: 'Firebase n\'est pas disponible - veuillez rafraîchir la page',
            AUTH_REQUIRED: 'Authentification requise - veuillez vous connecter',
            ADMIN_REQUIRED: 'Accès refusé : permissions administrateur requises',
            NETWORK_ERROR: 'Erreur de réseau - vérifiez votre connexion',
            UNKNOWN_ERROR: 'Erreur inconnue - contactez le support'
        },
        SUCCESS: {
            DATA_SAVED: 'Données sauvegardées avec succès',
            USER_UPDATED: 'Utilisateur mis à jour avec succès',
            LOGOUT_SUCCESS: 'Déconnexion réussie'
        },
        INFO: {
            LOADING: 'Chargement en cours...',
            PROCESSING: 'Traitement en cours...',
            INITIALIZING: 'Initialisation...'
        }
    };

    // API endpoints and paths
    const PATHS = {
        // Pages
        LOGIN: '/login.html',
        DASHBOARD: '/index.html',
        MEMBERS: '/membres.html',
        EVENTS: '/events.html',
        
        // Collections
        USERS: 'users',
        MEMBERS: 'membres',
        EVENTS: 'events',
        AVATARS: 'avatars',
        ACTIVITY_LOGS: 'activity_logs',
        AUDIT_LOG: 'auditLog',
        SYSTEM_CONFIG: 'systemConfig',
        HEALTH_CHECK: '_health'
    };

    // Make constants globally available
    window.CONSTANTS = {
        TIMEOUTS,
        DATABASE,
        FILES,
        UI,
        SECURITY,
        VALIDATION,
        MESSAGES,
        PATHS
    };

    console.log('📋 Constants loaded successfully');

})(); 