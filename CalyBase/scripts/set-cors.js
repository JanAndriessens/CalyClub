const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'calybase.firebasestorage.app'
});

const bucket = admin.storage().bucket();

const corsConfiguration = [
  {
    origin: ['http://localhost:3000', 'https://calybase.firebaseapp.com', 'https://calybase.web.app'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable']
  }
];

async function setCors() {
  try {
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('CORS configuration set successfully!');
  } catch (error) {
    console.error('Error setting CORS configuration:', error);
  } finally {
    process.exit();
  }
}

setCors(); 