@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%~dp0"
set "APP_URL=http://127.0.0.1:5174"
set "OLLAMA_MODEL=qwen3:8b"
set "MYSQL_HOME=%ProgramFiles%\MySQL\MySQL Server 8.4"
set "MYSQLD=%MYSQL_HOME%\bin\mysqld.exe"
set "MYSQL=%MYSQL_HOME%\bin\mysql.exe"
set "MYSQL_DATA=%USERPROFILE%\mysql84-data"

if not defined JAVA_HOME if exist "C:\Java\jdk-21.0.7.6-hotspot\bin\java.exe" (
  set "JAVA_HOME=C:\Java\jdk-21.0.7.6-hotspot"
)

call :FindOllama
call :FindPython
call :FindVoicevox

if /I "%~1"=="--print" (
  echo Ollama:   %OLLAMA_EXE%
  echo Python:   %PYTHON_EXE%
  echo VOICEVOX: %VOICEVOX_ENGINE%
  echo Java:     %JAVA_HOME%
  exit /b 0
)

echo.
echo ========================================
echo   TRON AI  -  one-click start
echo ========================================
echo   Frontend     %APP_URL%
echo   Backend      http://127.0.0.1:8080
echo   Ollama       http://127.0.0.1:11434
echo   Speech       http://127.0.0.1:8091
echo   VOICEVOX     http://127.0.0.1:50021
echo   Desktop      JavaFX agent window
echo ========================================
echo.

call :EnsureMysql
if errorlevel 1 (
  echo.
  echo MySQL did not start. Spring cannot run without it.
  echo.
  pause
  exit /b 1
)

call :EnsureOllama
call :EnsureVoicevox
call :EnsureStt
call :EnsureBackend
call :EnsureFrontend
call :EnsureDesktop

echo.
echo Waiting for the page, then opening Chrome...
set /a TRIES=0

:wait_front
set /a TRIES+=1
if %TRIES% GTR 90 (
  echo Frontend did not answer in time. Opening Chrome anyway.
  goto open_chrome
)
call :PortOpen 5174
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto wait_front
)

echo Frontend is ready.
echo Waiting for the backend port...
set /a TRIES=0

:wait_back
set /a TRIES+=1
if %TRIES% GTR 90 (
  echo Backend is still starting. Opening the page now.
  goto open_chrome
)
call :PortOpen 8080
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto wait_back
)
echo Backend is listening.

:open_chrome
call :OpenChrome "%APP_URL%"
call :PopupDesktop
echo.
echo Chrome: %APP_URL%
echo Desktop agent window: TRON Desktop Agent
echo Leave the TRON windows open. Close a window to stop that part.
echo Chat needs Ollama. Japanese voice needs VOICEVOX. Microphone needs the speech window.
echo.
pause
exit /b 0

:EnsureOllama
call :PortOpen 11434
if not errorlevel 1 (
  echo Ollama is already running.
  call :EnsureModel
  exit /b 0
)
if not defined OLLAMA_EXE (
  echo Ollama was not found. Install it from https://ollama.com and run this again.
  echo Chat stays unavailable until Ollama is running.
  exit /b 0
)
echo Starting Ollama...
start "TRON Ollama" "%OLLAMA_EXE%" serve
set /a TRIES=0
:wait_ollama
set /a TRIES+=1
if %TRIES% GTR 30 (
  echo Ollama did not open port 11434 yet. The Ollama window has the details.
  exit /b 0
)
call :PortOpen 11434
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_ollama
)
echo Ollama is ready.
call :EnsureModel
exit /b 0

:EnsureModel
if not defined OLLAMA_EXE exit /b 0
"%OLLAMA_EXE%" list 2>nul | findstr /I /C:"%OLLAMA_MODEL%" >nul
if not errorlevel 1 (
  echo Model %OLLAMA_MODEL% is already installed.
  exit /b 0
)
echo Pulling %OLLAMA_MODEL%. This can take a while the first time.
set "MODEL_CMD=%TEMP%\tron-ollama-model.cmd"
> "%MODEL_CMD%" echo @echo off
>> "%MODEL_CMD%" echo "%OLLAMA_EXE%" pull %OLLAMA_MODEL%
>> "%MODEL_CMD%" echo pause
start "TRON Ollama model" cmd /k call "%MODEL_CMD%"
exit /b 0

:EnsureVoicevox
call :PortOpen 50021
if not errorlevel 1 (
  echo VOICEVOX is already running.
  exit /b 0
)
if not defined VOICEVOX_ENGINE (
  echo VOICEVOX was not found. Japanese voice stays off until it is installed.
  exit /b 0
)
echo Starting VOICEVOX...
start "TRON VOICEVOX" /D "%VOICEVOX_DIR%" "%VOICEVOX_ENGINE%" --host 127.0.0.1 --port 50021
exit /b 0

:EnsureStt
call :PortOpen 8091
if not errorlevel 1 (
  echo Speech worker is already running.
  exit /b 0
)
if not defined PYTHON_EXE (
  echo Python was not found. The speech worker was not started.
  exit /b 0
)
echo Starting speech worker...
set "SPEECH_CMD=%TEMP%\tron-speech.cmd"
> "%SPEECH_CMD%" echo @echo off
>> "%SPEECH_CMD%" echo cd /d "%ROOT%backend\stt-worker"
>> "%SPEECH_CMD%" echo "%PYTHON_EXE%" -c "import uvicorn,fastapi" ^|^| "%PYTHON_EXE%" -m pip install -r requirements.txt
>> "%SPEECH_CMD%" echo "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8091
>> "%SPEECH_CMD%" echo pause
start "TRON Speech" cmd /k call "%SPEECH_CMD%"
exit /b 0

:EnsureBackend
call :PortOpen 8080
if not errorlevel 1 (
  echo Backend is already running.
  exit /b 0
)
echo Starting Spring backend...
start "TRON Backend" /D "%ROOT%backend\backend-spring" cmd /k "mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local"
exit /b 0

:EnsureFrontend
call :PortOpen 5174
if not errorlevel 1 (
  echo Frontend is already running.
  exit /b 0
)
echo Starting frontend...
if exist "%ROOT%frontend\node_modules\" (
  start "TRON Frontend" /D "%ROOT%frontend" cmd /k "npm run dev"
) else (
  echo Installing frontend packages first...
  start "TRON Frontend" /D "%ROOT%frontend" cmd /k "npm install && npm run dev"
)
exit /b 0

:EnsureDesktop
call :DesktopRunning
if not errorlevel 1 (
  echo Desktop agent is already running.
  exit /b 0
)
echo Starting desktop agent...
start "TRON Desktop Agent" cmd /k call "%ROOT%run-desktop.cmd"
exit /b 0

:EnsureMysql
call :PortOpen 3306
if not errorlevel 1 (
  echo MySQL is already running on port 3306.
  call :EnsureDatabase
  exit /b 0
)
if not exist "%MYSQLD%" (
  echo MySQL Server 8.4 was not found at:
  echo   %MYSQLD%
  exit /b 1
)
if not exist "%MYSQL_DATA%\mysql" (
  echo Initializing MySQL data folder...
  "%MYSQLD%" --initialize-insecure --datadir="%MYSQL_DATA%"
  if errorlevel 1 exit /b 1
)
echo Starting MySQL...
start "TRON MySQL" "%MYSQLD%" --console --datadir="%MYSQL_DATA%" --port=3306 --bind-address=127.0.0.1 --mysqlx=0
set /a TRIES=0
:wait_mysql
set /a TRIES+=1
if %TRIES% GTR 40 (
  echo MySQL did not open port 3306.
  exit /b 1
)
call :PortOpen 3306
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_mysql
)
echo MySQL is ready.
call :EnsureDatabase
exit /b 0

:EnsureDatabase
if not exist "%MYSQL%" exit /b 0
"%MYSQL%" -u root --protocol=TCP -h 127.0.0.1 -P 3306 -e "CREATE DATABASE IF NOT EXISTS tron_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'tronai'@'127.0.0.1' IDENTIFIED BY 'tronai_pass'; CREATE USER IF NOT EXISTS 'tronai'@'localhost' IDENTIFIED BY 'tronai_pass'; GRANT ALL PRIVILEGES ON tron_ai.* TO 'tronai'@'127.0.0.1'; GRANT ALL PRIVILEGES ON tron_ai.* TO 'tronai'@'localhost'; FLUSH PRIVILEGES;"
exit /b 0

:FindOllama
set "OLLAMA_EXE="
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
if not defined OLLAMA_EXE if exist "%ProgramFiles%\Ollama\ollama.exe" set "OLLAMA_EXE=%ProgramFiles%\Ollama\ollama.exe"
if not defined OLLAMA_EXE (
  for /f "delims=" %%I in ('where ollama 2^>nul') do (
    if not defined OLLAMA_EXE set "OLLAMA_EXE=%%I"
  )
)
exit /b 0

:FindPython
set "PYTHON_EXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYTHON_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON_EXE (
  for /f "delims=" %%I in ('where python 2^>nul') do (
    echo %%I | findstr /I "WindowsApps" >nul
    if errorlevel 1 if not defined PYTHON_EXE set "PYTHON_EXE=%%I"
  )
)
exit /b 0

:FindVoicevox
set "VOICEVOX_ENGINE="
set "VOICEVOX_DIR="
if exist "%ProgramFiles%\VOICEVOX\vv-engine\run.exe" (
  set "VOICEVOX_ENGINE=%ProgramFiles%\VOICEVOX\vv-engine\run.exe"
  set "VOICEVOX_DIR=%ProgramFiles%\VOICEVOX\vv-engine"
)
if not defined VOICEVOX_ENGINE if exist "%ProgramFiles%\VOICEVOX\VOICEVOX.exe" (
  set "VOICEVOX_ENGINE=%ProgramFiles%\VOICEVOX\VOICEVOX.exe"
  set "VOICEVOX_DIR=%ProgramFiles%\VOICEVOX"
)
if not defined VOICEVOX_ENGINE if exist "%LOCALAPPDATA%\Programs\VOICEVOX\vv-engine\run.exe" (
  set "VOICEVOX_ENGINE=%LOCALAPPDATA%\Programs\VOICEVOX\vv-engine\run.exe"
  set "VOICEVOX_DIR=%LOCALAPPDATA%\Programs\VOICEVOX\vv-engine"
)
exit /b 0

:DesktopRunning
powershell -NoProfile -Command "if (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*DesktopAgentApp*' -or $_.CommandLine -like '*javafx:run*') }) { exit 0 } else { exit 1 }"
exit /b %ERRORLEVEL%

:PortOpen
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %~1); $c.Close(); exit 0 } catch { exit 1 }"
exit /b %ERRORLEVEL%

:PopupDesktop
echo Waiting for the desktop agent window...
set /a TRIES=0
:wait_desktop
set /a TRIES+=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%popup-desktop.ps1" >nul 2>&1
if not errorlevel 1 (
  echo Desktop agent window is open.
  exit /b 0
)
if %TRIES% GTR 45 (
  echo Desktop agent is still starting. Its window will open when JavaFX is ready.
  exit /b 0
)
timeout /t 2 /nobreak >nul
goto wait_desktop

:OpenChrome
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined CHROME (
  start "" "%CHROME%" "%~1"
) else (
  echo Chrome was not found. Opening the default browser instead.
  start "" "%~1"
)
exit /b 0
