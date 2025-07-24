@echo off
echo Building React frontend...

cd frontend

echo Installing dependencies...
call npm install

echo Building production bundle...
call npm run build

echo Frontend build complete!
echo React app is now available at http://localhost:3002

cd ..
pause