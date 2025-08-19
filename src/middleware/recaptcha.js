import { verifyRecaptcha } from '../utils/recaptcha.js';

export const recaptchaMiddleware = (action) => {
    return async (req, res, next) => {
        try {
            const token = req.headers['x-recaptcha-token'];
            
            if (!token) {
                return res.status(400).json({
                    error: "Token reCAPTCHA manquant"
                });
            }

            await verifyRecaptcha(token, action);
            next();
        } catch (error) {
            console.error('reCAPTCHA middleware error:', error);
            res.status(400).json({
                error: error.message
            });
        }
    };
}; 