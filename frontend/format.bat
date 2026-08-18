@echo off

set PATH=%PATH%;C:\Tools\node\node-v24.19.0-win-x64\node-v24.19.0-win-x64

echo ==========================
echo NODE VERSION
echo ==========================
node -v

echo.
echo ==========================
echo NPM VERSION
echo ==========================
npm -v

echo.
echo ==========================
echo INSTALL PRETTIER
echo ==========================
call npm install -D prettier

echo.
echo ==========================
echo FORMAT PROJECT
echo ==========================
call npx prettier --write .

echo.
echo ==========================
echo DONE
echo ==========================

pause