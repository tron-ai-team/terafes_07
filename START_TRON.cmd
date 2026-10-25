@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title TRON AI - One-Click Launcher

REM Optional flags (forwarded to Start-Tron.ps1):
REM   -Restart       force stop + start even if already healthy
REM   -NoBrowser     do not open the web UI
REM   -ForceRebuild  wipe Spring target/classes before start
REM   -NoPause       never wait for Enter (automation-friendly)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-Tron.ps1" %*
set "ERR=%ERRORLEVEL%"
if not "%ERR%"=="0" (
    echo.
    echo [ERROR] TRON AI startup encountered an issue. See details above.
    echo Logs: "%~dp0.runtime\logs\startup.log"
    echo Spring: "%~dp0.runtime\logs\spring.log"
    if /I not "%TRON_NO_PAUSE%"=="1" (
        echo.
        pause
    )
    exit /b %ERR%
)

echo.
echo TRON AI is running. Close this window anytime -- services keep running.
echo Run STOP_TRON.cmd to shut the stack down.
if /I not "%TRON_NO_PAUSE%"=="1" (
    echo %* | findstr /I "\-NoPause" >nul 2>&1
    if not errorlevel 1 goto :done
    if /I "%~1"=="-NoPause" goto :done
    echo.
    echo Press any key to close this launcher window...
    pause >nul
)
:done
exit /b 0