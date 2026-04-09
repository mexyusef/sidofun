@echo off
setlocal

cd /d "%~dp0\.."
if errorlevel 1 exit /b 1

echo [sidofun] building release...
call bun run build:release
if errorlevel 1 exit /b %errorlevel%

echo [sidofun] refreshing bun link...
call bun link
if errorlevel 1 exit /b %errorlevel%

echo [sidofun] done.
endlocal
