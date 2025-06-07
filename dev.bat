@echo off
echo Killing any running Node.js processes...
taskkill /f /im node.exe 2>nul
echo Cleaning directories...
rmdir /s /q .next 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo Setting environment variables...
set NODE_OPTIONS=--max-old-space-size=4096
set NEXT_TELEMETRY_DISABLED=1

echo Starting Next.js development server...
npx next dev --port 3333 --no-symlinks

pause 