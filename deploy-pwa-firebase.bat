@echo off
echo ========================================
echo CalyClub PWA - Firebase Deployment
echo ========================================
echo.

echo Checking Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo Firebase CLI not found!
    echo.
    echo Please install Firebase CLI:
    echo npm install -g firebase-tools
    echo.
    echo Or test locally with:
    echo - Python: python -m http.server 8000 (in public folder)
    echo - VS Code Live Server extension
    echo.
    pause
    exit /b 1
)

echo Firebase CLI found!
echo.

echo PWA Files Check:
if exist "public\manifest.json" (echo ✓ PWA Manifest) else (echo ✗ Missing manifest.json)
if exist "public\sw.js" (echo ✓ Service Worker) else (echo ✗ Missing sw.js)
if exist "public\pwa-handler.js" (echo ✓ PWA Handler) else (echo ✗ Missing pwa-handler.js)
if exist "public\icons\icon-192x192.png" (echo ✓ App Icons) else (echo ✗ Missing icons)

echo.
echo Deploying PWA to Firebase Hosting...
echo This will make your PWA available with HTTPS for full testing.
echo.

firebase deploy --only hosting

if errorlevel 1 (
    echo.
    echo Deployment failed! 
    echo.
    echo Common fixes:
    echo 1. Run: firebase login
    echo 2. Run: firebase use --add (select your project)
    echo 3. Check internet connection
    echo.
) else (
    echo.
    echo ========================================
    echo 🎉 PWA DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo Your CalyClub PWA is now live with HTTPS!
    echo.
    echo Test your PWA at:
    echo - Main app: https://your-project.web.app
    echo - PWA test page: https://your-project.web.app/pwa-test.html
    echo.
    echo PWA Features Available:
    echo ✓ Install on mobile/desktop
    echo ✓ Offline functionality  
    echo ✓ Push notifications
    echo ✓ Mobile optimizations
    echo.
    echo Installation Instructions:
    echo Android: Tap "Add to Home Screen" banner
    echo iOS: Share button → "Add to Home Screen"
    echo Desktop: Install icon in address bar
    echo.
)

pause