@echo off
cd "C:\Users\janan\Documents\GitHub\CalyClub"
echo Moving folders...
move "CalyBase\public" .
move "CalyBase\functions" .
move "CalyBase\scripts" .
move "CalyBase\src" .
move "CalyBase\controllers" .
move "CalyBase\routes" .
move "CalyBase\models" .
move "CalyBase\dataconnect" .
move "CalyBase\dataconnect-generated" .
move "CalyBase\archived_backups" .
move "CalyBase\calybasecode" .
move "CalyBase\node_modules" .
move "CalyBase\y" .

echo Moving individual files...
move "CalyBase\*.json" .
move "CalyBase\*.js" .
move "CalyBase\*.md" .
move "CalyBase\*.html" .
move "CalyBase\*.txt" .
move "CalyBase\*.bat" .
move "CalyBase\*.rules" .

echo Files moved successfully!
echo Removing empty CalyBase folder...
rmdir "CalyBase"

echo Done!