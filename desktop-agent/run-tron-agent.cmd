@echo off
setlocal EnableExtensions EnableDelayedExpansion

title TRON Desktop Agent Launcher
cd /d "%~dp0"

echo =======================================================
echo          TRON Desktop Agent Launcher
echo =======================================================
echo.

:: 1. Locate Java 21
if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
        goto :JavaFound
    )
)

:: Search common installation paths
if exist "C:\Java\jdk-21.0.7.6-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Java\jdk-21.0.7.6-hotspot"
    set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
    goto :JavaFound
)

for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-21*" "C:\Program Files\Java\jdk-21*" "C:\Program Files\Microsoft\jdk-21*") do (
    if exist "%%D\bin\java.exe" (
        set "JAVA_HOME=%%D"
        set "JAVA_EXE=%%D\bin\java.exe"
        goto :JavaFound
    )
)

for /f "tokens=*" %%I in ('where java.exe 2^>nul') do (
    set "JAVA_EXE=%%I"
    goto :JavaFound
)

:JavaNotFound
echo [ERROR] Java 21 was not found on this system.
echo Please install JDK 21 or set JAVA_HOME to your JDK 21 directory.
echo.
pause
exit /b 1

:JavaFound
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo [OK] Using Java runtime: %JAVA_EXE%

:: 2. Launch TRON Desktop Agent
echo [INFO] Starting TRON Desktop Agent...
echo (If an instance is already open, it will be brought to the front.)
echo.

if exist "mvnw.cmd" (
    call mvnw.cmd javafx:run %*
) else if exist "..\backend\backend-spring\mvnw.cmd" (
    call "..\backend\backend-spring\mvnw.cmd" javafx:run %*
) else (
    echo [ERROR] Maven wrapper mvnw.cmd was not found.
    pause
    exit /b 1
)

set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% NEQ 0 (
    echo.
    echo =======================================================
    echo [ERROR] TRON Desktop Agent exited with error code: %EXIT_CODE%
    echo =======================================================
    echo Common troubleshooting:
    echo 1. Verify Java 21 is installed: java -version
    echo 2. Verify port/lock permissions in %LOCALAPPDATA%\TRON\desktop-agent
    echo 3. If Maven dependencies failed to download, verify internet connection.
    echo.
    pause
    exit /b %EXIT_CODE%
)

exit /b 0
