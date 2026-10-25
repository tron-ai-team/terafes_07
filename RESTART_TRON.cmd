@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title TRON AI - Restart Stack

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-Tron.ps1" -Restart %*
if errorlevel 1 (
    echo.
    echo [ERROR] TRON AI restart encountered an issue.
    if /I not "%TRON_NO_PAUSE%"=="1" pause
    exit /b %ERRORLEVEL%
)

echo.
echo TRON AI stack has restarted.
ping -n 6 127.0.0.1 >nul 2>&1
exit /b 0