@echo off
setlocal EnableExtensions EnableDelayedExpansion

title TRON Desktop Agent (Headless)
cd /d "%~dp0"

:: Do NOT delete instance.lock / mutex state — SingleInstanceManager owns that.
set "TRON_IDENTITY_PROTECT=1"
if not defined TRON_HEADLESS_APPROVAL set "TRON_HEADLESS_APPROVAL=approve"

if not exist "target\classes\com\tronai\desktop\app\HeadlessMain.class" (
    echo [INFO] Compiling desktop-agent...
    call mvnw.cmd -q -DskipTests compile dependency:copy-dependencies
    if errorlevel 1 exit /b 1
)

if not exist "target\dependency" (
    call mvnw.cmd -q -DskipTests dependency:copy-dependencies
)

echo [INFO] Starting HeadlessMain (single-instance protected)...
java -cp "target\classes;target\dependency\*" com.tronai.desktop.app.HeadlessMain
exit /b %ERRORLEVEL%
