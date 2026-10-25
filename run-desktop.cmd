@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%~dp0"
if not defined JAVA_HOME if exist "C:\Java\jdk-21.0.7.6-hotspot\bin\java.exe" (
  set "JAVA_HOME=C:\Java\jdk-21.0.7.6-hotspot"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

title TRON Desktop Agent Console
echo.
echo ========================================
echo   TRON Desktop Agent
echo ========================================
echo.

call "%ROOT%desktop-agent\run-tron-agent.cmd" %*
exit /b %ERRORLEVEL%