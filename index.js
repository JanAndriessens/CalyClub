import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import cors from 'cors';
import membreRoutes from './routes/membreRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import { securityMiddleware } from './src/middleware/security.js';
// Configuration injection no longer needed - using API endpoint instead

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cookieParser);
app.use(securityMiddleware.session);
app.use(securityMiddleware.tokenRefresh);

// API Rate Limiting
app.use('/api/', securityMiddleware.rateLimiter);

// CORS and other middleware
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001', 
            'https://calyclub.firebaseapp.com',
            'https://calyclub.web.app'
        ];
        
        // Allow all Vercel deployments dynamically
        if (origin && origin.includes('.vercel.app')) {
            allowedOrigins.push(origin);
        }
        
        // Add production domain if specified in environment
        if (process.env.PRODUCTION_DOMAIN) {
            allowedOrigins.push(process.env.PRODUCTION_DOMAIN);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('🚫 CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow credentials (cookies, authorization headers)
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(process.cwd(), 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Configuration API endpoint
app.get('/api/config', (req, res) => {
    try {
        const clientConfig = {
            firebase: {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
                measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
            },
            recaptcha: {
                siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
            }
        };
        res.json(clientConfig);
    } catch (error) {
        console.error('Config API error:', error);
        res.status(500).json({ error: 'Configuration not available' });
    }
});

// Routes
app.use('/api/membres', membreRoutes);
app.use('/api/auth', authRoutes);

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API CalyClub' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
  console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
}); 