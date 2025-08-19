@echo off
echo ========================================
echo CalyClub Local Test Server
echo ========================================
echo.

echo Starting Python HTTP server...
echo Open: http://localhost:8000/login.html
echo Press Ctrl+C to stop
echo.

cd public
python -m http.server 8000