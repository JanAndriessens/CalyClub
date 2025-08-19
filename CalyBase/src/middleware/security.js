import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { adminAuth } from '../auth/firebase.config.js';
import { config } from '../config/env.js';

// Rate limiting configuration
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Trop de requêtes. Veuillez réessayer plus tard."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Session configuration
const sessionConfig = {
    secret: config.session.secret || (() => {
        throw new Error('SESSION_SECRET environment variable is required');
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevent client-side access to the cookie
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // Additional CSRF protection
    }
};

// Token refresh middleware (disabled due to Admin SDK credential issues)
const tokenRefreshMiddleware = async (req, res, next) => {
    // TODO: Re-enable when Firebase Admin SDK credentials are properly configured
    // For now, skip token refresh to avoid error spam
    next();
};

// Security headers configuration
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://www.google.com/recaptcha/", 
                "https://www.gstatic.com/recaptcha/",
                "https://www.gstatic.com/firebasejs/",
                "https://www.gstatic.com/",
                "https://cdn.sheetjs.com/",
                "https://cdn.jsdelivr.net/"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'", 
                "https://*.firebaseio.com", 
                "https://*.googleapis.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com"
            ],
            frameSrc: ["'self'", "https://www.google.com/recaptcha/"],
            objectSrc: ["'none'"],
            // Only upgrade to HTTPS in production
            ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    // Only enable HSTS in production
    hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
};

// Export middleware configuration
export const securityMiddleware = {
    rateLimiter,
    session: session(sessionConfig),
    cookieParser: cookieParser(),
    helmet: helmet(helmetConfig),
    tokenRefresh: tokenRefreshMiddleware
}; 