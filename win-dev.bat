@echo off
setlocal

echo Stopping any running Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Cleaning build cache...
if exist .next rmdir /S /Q .next >nul 2>&1
if exist node_modules\.cache rmdir /S /Q node_modules\.cache >nul 2>&1

echo Setting environment variables for Windows development...
set NODE_ENV=development
set NODE_OPTIONS=--max-old-space-size=4096
set NEXT_TELEMETRY_DISABLED=1

echo Starting Next.js development server...
call npm run dev:fixed

endlocal
pause 