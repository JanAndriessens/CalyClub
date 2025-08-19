import fetch from 'node-fetch';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_MIN_SCORE = 0.5; // Minimum score to consider the request valid

export const verifyRecaptcha = async (token, action) => {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error("Échec de la vérification reCAPTCHA");
        }

        // Verify the action matches
        if (data.action !== action) {
            throw new Error("Action reCAPTCHA invalide");
        }

        // Check the score
        if (data.score < RECAPTCHA_MIN_SCORE) {
            throw new Error("Score reCAPTCHA trop bas");
        }

        return true;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        throw new Error("Erreur lors de la vérification reCAPTCHA");
    }
}; 