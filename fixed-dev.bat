@echo off
echo Killing any running Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Cleaning .next directory...
if exist .next (
  rmdir /S /Q .next
)

echo Setting environment variables...
set NODE_ENV=development
set NODE_OPTIONS=--max-old-space-size=4096
set NEXT_DISABLE_SYMLINKS=true

echo Starting Next.js development server...
call npx next dev

pause 