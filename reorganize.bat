@echo off
echo ========================================
echo Reorganizing CalyClub Folder Structure
echo ========================================
echo.

cd "C:\Users\janan\Documents\GitHub\CalyClub"

echo Current structure:
echo CalyClub\
echo   └── CalyBase\ (all files here)
echo.

echo Target structure:
echo CalyClub\ (all files moved here)
echo.

echo Moving all files from CalyBase to CalyClub root...
echo.

REM Move all files and folders from CalyBase to current directory
for /d %%D in (CalyBase\*) do (
    echo Moving folder: %%~nxD
    move "%%D" . >nul 2>&1
)

for %%F in (CalyBase\*) do (
    echo Moving file: %%~nxF
    move "%%F" . >nul 2>&1
)

echo.
echo Removing empty CalyBase folder...
rmdir "CalyBase" >nul 2>&1

echo.
echo ========================================
echo Reorganization Complete!
echo ========================================
echo.

echo New structure:
echo CalyClub\ (all files are now here)
echo.

echo Checking for any remaining files in CalyBase...
if exist "CalyBase" (
    echo WARNING: CalyBase folder still exists
    dir CalyBase /b
) else (
    echo ✓ CalyBase folder successfully removed
)

echo.
echo Next steps:
echo 1. Verify all files moved correctly
echo 2. Update any path references if needed
echo 3. Test the application
echo.

pause