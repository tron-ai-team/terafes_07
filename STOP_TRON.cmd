@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title TRON AI - Stop Services

echo Stopping TRON AI local services...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Stop-Tron.ps1"
echo.
echo All TRON AI services have been stopped.
ping -n 4 127.0.0.1 >nul 2>&1
exit /b 0