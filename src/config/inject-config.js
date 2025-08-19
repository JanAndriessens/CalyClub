import { config } from './env.js';

/**
 * Generate Firebase configuration for client-side use
 * This function creates a script tag with the configuration
 * that can be injected into HTML pages
 */
export function generateClientConfig() {
    const clientConfig = {
        apiKey: config.firebase.apiKey,
        authDomain: config.firebase.authDomain,
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
        messagingSenderId: config.firebase.messagingSenderId,
        appId: config.firebase.appId,
        measurementId: config.firebase.measurementId
    };

    return `
        <script>
            // Firebase configuration injected server-side
            window.firebaseConfig = ${JSON.stringify(clientConfig, null, 2)};
            
            // reCAPTCHA site key (public, safe to expose)
            window.recaptchaSiteKey = "${config.recaptcha.siteKey}";
        </script>
    `;
}

/**
 * Middleware to inject configuration into HTML responses
 */
export function configInjectionMiddleware(req, res, next) {
    // Store original send function
    const originalSend = res.send;

    // Override send function to inject config if HTML
    res.send = function(body) {
        if (typeof body === 'string' && body.includes('</head>')) {
            // Inject config before closing head tag
            const configScript = generateClientConfig();
            body = body.replace('</head>', `${configScript}\n</head>`);
        }
        
        // Call original send with modified body
        originalSend.call(this, body);
    };

    next();
} 