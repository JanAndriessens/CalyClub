// Security middleware
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
        "https://www.gstatic.com " +
        "https://*.firebaseio.com " +
        "https://www.googleapis.com " +
        "https://apis.google.com " +
        "https://cdn.sheetjs.com " +
        "https://cdn.jsdelivr.net " +
        "https://*.firebaseapp.com " +
        "https://*.firebase.googleapis.com " +
        "https://*.firebasestorage.googleapis.com " +
        "https://*.firebase.com " +
        "https://*.firebase.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' " +
        "https://*.firebaseio.com " +
        "https://*.googleapis.com " +
        "wss://*.firebaseio.com " +
        "https://*.firebaseapp.com " +
        "https://*.firebase.googleapis.com " +
        "https://*.firebasestorage.googleapis.com " +
        "https://*.firebase.com; " +
        "frame-src 'self' " +
        "https://*.firebaseio.com " +
        "https://*.firebaseapp.com " +
        "https://*.firebase.com; " +
        "font-src 'self' data: https:;"
    );
    next();
}); 