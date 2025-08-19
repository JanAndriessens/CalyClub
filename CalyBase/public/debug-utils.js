// Debug utilities for CalyBase
// DEBUGGING MODE ACTIVE - Full console logging enabled for Firebase troubleshooting

(function() {
    'use strict';

    console.log('🔧 DEBUG-UTILS: Full console logging mode active for Firebase debugging');

    // Check if we're in development mode
    const isDevelopment = () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    };

    // Debug logger that only logs in development
    window.DebugLogger = {
        log: (...args) => {
            console.log('[DebugLogger]', ...args);
        },
        warn: (...args) => {
            console.warn('[DebugLogger]', ...args);
        },
        error: (...args) => {
            console.error('[DebugLogger]', ...args);
        },
        info: (...args) => {
            console.info('[DebugLogger]', ...args);
        },
        group: (...args) => {
            console.group('[DebugLogger]', ...args);
        },
        groupEnd: () => {
            console.groupEnd();
        }
    };

    // CONSOLE OVERRIDE COMPLETELY DISABLED FOR DEBUGGING
    console.log('✅ DEBUG-UTILS: Console override disabled - all errors will be visible');

})();