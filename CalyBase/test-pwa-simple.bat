@echo off
echo ========================================
echo CalyClub PWA Testing - Simple Approach
echo ========================================
echo.

echo Checking for Python...
python --version >nul 2>&1
if not errorlevel 1 (
    echo Python found! Starting HTTP server...
    echo.
    echo Open your browser to: http://localhost:8000
    echo Test the PWA at: http://localhost:8000/pwa-test.html
    echo.
    cd public
    echo Starting Python HTTP server on port 8000...
    python -m http.server 8000
    goto :eof
)

echo Checking for Python 3...
python3 --version >nul 2>&1
if not errorlevel 1 (
    echo Python 3 found! Starting HTTP server...
    echo.
    echo Open your browser to: http://localhost:8000
    echo Test the PWA at: http://localhost:8000/pwa-test.html
    echo.
    cd public
    echo Starting Python 3 HTTP server on port 8000...
    python3 -m http.server 8000
    goto :eof
)

echo No Python found. Trying alternative approaches...
echo.
echo Option 1: If you have PHP installed:
echo    cd public
echo    php -S localhost:8000
echo.
echo Option 2: Use Firebase CLI (if installed):
echo    firebase serve --only hosting
echo.
echo Option 3: Use VS Code Live Server extension:
echo    - Open VS Code in the CalyClub folder
echo    - Install Live Server extension
echo    - Right-click on public/index.html
echo    - Select "Open with Live Server"
echo.
echo Option 4: Deploy to Firebase/Vercel to test PWA:
echo    - PWA features require HTTPS for full functionality
echo    - Local testing is limited without HTTPS
echo.
pause