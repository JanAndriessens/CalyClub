// Import Firebase configuration
import './firebase-config.js';

// Function to display error messages
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

// Function to hide error messages
function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Check if we're on the login page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Connexion réussie:', userCredential.user);
            window.location.href = '/'; // Redirect to home page after successful login
        } catch (error) {
            console.error('Erreur de connexion:', error);
            alert(error.message);
        }
    });
}

// Check if we're on the registration page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('Inscription réussie:', userCredential.user);
            window.location.href = '/'; // Redirect to home page after successful registration
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            alert(error.message);
        }
    });
}

// Navigation rendering can remain static if desired. 