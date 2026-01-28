@echo off
echo Starting Backend Server...
cd server
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo.
echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop
echo.
call npm start
