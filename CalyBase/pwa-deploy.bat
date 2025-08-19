@echo off
echo ========================================
echo CalyBase PWA Deployment Script
echo ========================================
echo.

echo 1. Starting local server for PWA testing...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Please install Node.js to run the server.
    echo Alternatively, you can use Python's built-in server:
    echo.
    echo Python 3: python -m http.server 8080
    echo Python 2: python -m SimpleHTTPServer 8080
    echo.
    pause
    exit /b 1
)

echo Node.js found. Starting server...
echo.

REM Check if we're in the right directory
if not exist "public\manifest.json" (
    echo Error: manifest.json not found in public folder
    echo Please run this script from the CalyBase root directory
    pause
    exit /b 1
)

echo PWA Files Status:
echo - manifest.json: %~f0\public\manifest.json
if exist "public\manifest.json" (echo   ✓ Found) else (echo   ✗ Missing)

echo - Service Worker: public\sw.js
if exist "public\sw.js" (echo   ✓ Found) else (echo   ✗ Missing)

echo - PWA Handler: public\pwa-handler.js
if exist "public\pwa-handler.js" (echo   ✓ Found) else (echo   ✗ Missing)

echo - Icons: public\icons\
if exist "public\icons\icon-192x192.png" (echo   ✓ Icons Found) else (echo   ✗ Icons Missing)

echo.
echo Starting server on port 8080...
echo Open your browser to: http://localhost:8080
echo.
echo Test URLs:
echo - PWA Test Page: http://localhost:8080/pwa-test.html
echo - Main App: http://localhost:8080/
echo - Login: http://localhost:8080/login.html
echo.

cd public
echo Starting HTTP server...
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.svg': 'application/image/svg+xml'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile('./404.html', (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content || '404 - File not found', 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT + '/');
  console.log('Press Ctrl+C to stop the server');
});
"