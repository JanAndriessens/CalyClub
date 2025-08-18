// Backup of working Firebase configuration
// Created on: 2024-03-19

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxsHCt4LAfPBJ2TAP-2IaOAQXXMOK2R7Q",
    authDomain: "calybase.firebaseapp.com",
    projectId: "calybase",
    storageBucket: "calybase.firebasestorage.app",
    messagingSenderId: "108529148364",
    appId: "1:108529148364:web:08289524026f6a91f6bd69",
    measurementId: "G-PBZ476227C"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
window.db = firebase.firestore();

// Initialize Storage
window.storage = firebase.storage();

// Enable offline persistence
window.db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

console.log('Firebase initialized successfully'); 