import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import admin from 'firebase-admin';
import { config } from '../config/env.js';

// Initialize client-side Firebase
const app = initializeApp(config.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize admin-side Firebase with Application Default Credentials
// This works around organization policies that prevent service account key creation
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: config.firebase.projectId,
            storageBucket: config.firebase.storageBucket
        });
        console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
    }
} catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
    console.warn('Running without Admin SDK - some features may be limited');
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminStorage = admin.apps.length > 0 ? admin.storage() : null;

// Export client-side services
export { auth, db, storage }; 