import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut
} from 'firebase/auth';
import { config } from '../config/env.js';

// Initialize Firebase
const app = initializeApp(config.firebase);
const auth = getAuth(app);

// Authentication functions
export const login = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await signOut(auth);
            throw new Error("Veuillez vérifier votre email avant de vous connecter.");
        }
        
        return user;
    } catch (error) {
        // Traduire les messages d'erreur Firebase en français
        switch (error.code) {
            case 'auth/invalid-email':
                throw new Error("L'adresse email n'est pas valide.");
            case 'auth/user-disabled':
                throw new Error("Ce compte a été désactivé.");
            case 'auth/user-not-found':
                throw new Error("Aucun compte trouvé avec cette adresse email.");
            case 'auth/wrong-password':
                throw new Error("Mot de passe incorrect.");
            case 'auth/too-many-requests':
                throw new Error("Trop de tentatives de connexion. Veuillez réessayer plus tard.");
            default:
                throw new Error("Une erreur s'est produite lors de la connexion.");
        }
    }
};

export const register = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        return userCredential.user;
    } catch (error) {
        // Traduire les messages d'erreur Firebase en français
        switch (error.code) {
            case 'auth/email-already-in-use':
                throw new Error("Cette adresse email est déjà utilisée.");
            case 'auth/invalid-email':
                throw new Error("L'adresse email n'est pas valide.");
            case 'auth/operation-not-allowed':
                throw new Error("L'inscription par email n'est pas activée.");
            case 'auth/weak-password':
                throw new Error("Le mot de passe est trop faible.");
            default:
                throw new Error("Une erreur s'est produite lors de l'inscription.");
        }
    }
};

export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        // Traduire les messages d'erreur Firebase en français
        switch (error.code) {
            case 'auth/invalid-email':
                throw new Error("L'adresse email n'est pas valide.");
            case 'auth/user-not-found':
                throw new Error("Aucun compte trouvé avec cette adresse email.");
            default:
                throw new Error("Une erreur s'est produite lors de la réinitialisation du mot de passe.");
        }
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw new Error("Une erreur s'est produite lors de la déconnexion.");
    }
};

export { auth }; 