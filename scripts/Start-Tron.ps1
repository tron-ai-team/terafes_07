# TRON Local Full Stack Launcher
# Ordered startup: MySQL -> RabbitMQ/MinIO -> AI services -> Spring Core -> Vite Frontend -> Desktop Agent
# Safe process management using PID files and targeted ports. No global taskkill.

param (
    [switch]$NoBrowser,
    [switch]$Restart,
    [switch]$ForceRebuild,
    [switch]$NoPause
)

$ErrorActionPreference = "Continue"
$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $WorkspaceRoot

$RuntimeDir = Join-Path $WorkspaceRoot ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$StartupLog = Join-Path $LogDir "startup.log"
function Log([string]$msg) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    "[$timestamp] $msg" | Out-File -FilePath $StartupLog -Append -Encoding utf8
}

Log "=== TRON AI STARTUP INITIATED ==="

# Load environment configuration
$EnvFile = Join-Path $PSScriptRoot "tron-local.env.ps1"
if (Test-Path $EnvFile) {
    . $EnvFile
} else {
    $script:JavaHome = if (Test-Path "C:\Java\jdk-21.0.7.6-hotspot") { "C:\Java\jdk-21.0.7.6-hotspot" } else { $env:JAVA_HOME }
    $script:PythonExe = if (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") { "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" } else { "python" }
    $script:MysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4"
    $script:MysqlData = "$env:USERPROFILE\mysql84-data"
    $script:VitePort = 5174
    $script:SpringPort = 8080
    $script:SttPort = 8091
}

if ($script:JavaHome -and (Test-Path $script:JavaHome)) {
    $env:JAVA_HOME = $script:JavaHome
    $env:PATH = "$script:JavaHome\bin;$env:PATH"
}

function Import-TronGoogleUserEnvironment {
    $userClientId = [Environment]::GetEnvironmentVariable("GOOGLE_CLIENT_ID", "User")
    $userClientSecret = [Environment]::GetEnvironmentVariable("GOOGLE_CLIENT_SECRET", "User")
    $idConfigured = -not [string]::IsNullOrWhiteSpace($userClientId)
    $secretConfigured = -not [string]::IsNullOrWhiteSpace($userClientSecret)
    if ($idConfigured) {
        $env:GOOGLE_CLIENT_ID = $userClientId
    }
    if ($secretConfigured) {
        $env:GOOGLE_CLIENT_SECRET = $userClientSecret
    }
    if ($idConfigured -and $secretConfigured) {
        Write-Host "Google OAuth Client ID: CONFIGURED" -ForegroundColor Green
        Write-Host "Google OAuth Client Secret: CONFIGURED" -ForegroundColor Green
        Log "Google OAuth Client ID: CONFIGURED"
        Log "Google OAuth Client Secret: CONFIGURED"
    } else {
        Write-Host "Google OAuth: NOT CONFIGURED" -ForegroundColor Yellow
        Log "Google OAuth: NOT CONFIGURED"
    }
}

Import-TronGoogleUserEnvironment

function Get-ListeningPids([int]$Port) {
    $owners = New-Object System.Collections.Generic.List[int]
    $netstat = & netstat.exe -ano -p tcp 2>$null
    foreach ($line in $netstat) {
        if ($line -match ":$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
            $procId = [int]$Matches[1]
            if (-not $owners.Contains($procId)) {
                $owners.Add($procId)
            }
        }
    }
    return $owners
}

function Test-TronSpringCommandLine([string]$CommandLine, [string]$ExecutablePath) {
    $cmd = if ($CommandLine) { $CommandLine.ToLowerInvariant() } else { "" }
    $path = if ($ExecutablePath) { $ExecutablePath.ToLowerInvariant() } else { "" }
    if ($cmd -like "*group7*backend*backend-spring*" -or $path -like "*group7*backend*backend-spring*") {
        return $true
    }
    if ($cmd -like "*com.tronai.tronaiapplication*" -or $cmd -like "*tron-ai-spring*") {
        return $true
    }
    if ($cmd -like "*spring-boot:run*" -and $cmd -like "*backend-spring*") {
        return $true
    }
    return $false
}

function Test-TronSpringMainClass([int]$ProcessId) {
    $jps = $null
    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME "bin\jps.exe"
        if (Test-Path $candidate) { $jps = $candidate }
    }
    if (-not $jps -and (Test-Path "C:\Java\jdk-21.0.7.6-hotspot\bin\jps.exe")) {
        $jps = "C:\Java\jdk-21.0.7.6-hotspot\bin\jps.exe"
    }
    if (-not $jps) { return $false }
    $listing = & $jps -l 2>$null
    foreach ($line in $listing) {
        if ($line -match ("^" + $ProcessId + "\s+com\.tronai\.TronAiApplication\b")) {
            return $true
        }
    }
    return $false
}

function Test-TronHttpBody([string]$Url) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Timeout = 2500
        $req.Method = "GET"
        $res = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        $res.Close()
        return $body
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                return $reader.ReadToEnd()
            } catch {}
        }
        return ""
    } catch {
        return ""
    }
}

function Test-TronProvidersFingerprint {
    $providers = Test-TronHttpBody "http://127.0.0.1:8080/api/v1/auth/providers"
    if ($providers -match '"google"' -and $providers -match '"password"' -and $providers -match '"enabled"') {
        return $true
    }
    $docs = Test-TronHttpBody "http://127.0.0.1:8080/v3/api-docs"
    return ($docs -match "desktop-agents" -and $docs -match "tron")
}

function Test-TronSpringProcess([int]$ProcessId, [string]$CommandLine, [string]$ExecutablePath) {
    if (Test-TronSpringCommandLine $CommandLine $ExecutablePath) {
        return $true
    }
    if (Test-TronSpringMainClass $ProcessId) {
        return $true
    }
    # Spring Boot's classpath is often too long for WMI to return a command line.
    # The public providers payload identifies this application without reading secrets.
    return (Test-TronProvidersFingerprint)
}

function Assert-TronSpringPortFree {
    $owners = @(Get-ListeningPids $script:SpringPort)
    if ($owners.Count -eq 0) {
        return
    }
    foreach ($procId in $owners) {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        $cmd = $cim.CommandLine
        $exe = $cim.ExecutablePath
        if (-not (Test-TronSpringProcess $procId $cmd $exe)) {
            Write-Host "Port 8080 is occupied by a non-TRON process." -ForegroundColor Red
            Log "Port 8080 is occupied by a non-TRON process. PID $procId"
            exit 1
        }
        Write-Host "Stopping existing TRON Spring process (PID $procId)..." -ForegroundColor Yellow
        Log "Stopping existing TRON Spring process PID $procId"
        $killOutput = & taskkill.exe /PID $procId /T /F 2>&1 | Out-String
        Start-Sleep -Milliseconds 500
        $stillAlive = $null -ne (Get-Process -Id $procId -ErrorAction SilentlyContinue)
        if ($killOutput -match "Access is denied|アクセスが拒否されました" -or $stillAlive) {
            Write-Host "TRON Spring PID $procId could not be stopped because Windows denied access. Close the elevated terminal that started it, then run START_TRON again." -ForegroundColor Red
            Log "TRON Spring PID $procId could not be stopped because Windows denied access."
            exit 1
        }
    }
    for ($i = 0; $i -lt 30; $i++) {
        $remaining = @(Get-ListeningPids $script:SpringPort)
        if ($remaining.Count -eq 0) {
            return
        }
        Start-Sleep -Seconds 1
    }
    $still = @(Get-ListeningPids $script:SpringPort)
    foreach ($procId in $still) {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        if (-not (Test-TronSpringProcess $procId $cim.CommandLine $cim.ExecutablePath)) {
            Write-Host "Port 8080 is occupied by a non-TRON process." -ForegroundColor Red
            Log "Port 8080 is occupied by a non-TRON process. PID $procId"
            exit 1
        }
    }
    Write-Host "TRON Spring did not release port 8080." -ForegroundColor Red
    Log "TRON Spring did not release port 8080."
    exit 1
}

function Test-TcpPort([string]$hostAddress, [int]$port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $connect = $client.BeginConnect($hostAddress, $port, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(1500, $false)
        if ($success -and $client.Connected) {
            $client.EndConnect($connect)
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

function Start-TronProcess(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [string]$BaseName,
    [switch]$NoStdRedirect
) {
    # Desktop Agent (esp. HeadlessMain) must NOT redirect stdout/stderr:
    # - filled anonymous pipes block STATUS logging and can kill the agent
    # - OpenCode inheritIO requires a non-redirected parent console
    if ($NoStdRedirect) {
        return Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory `
            -WindowStyle Hidden -PassThru
    }
    $outPath = Join-Path $LogDir "$BaseName.log"
    $errPath = Join-Path $LogDir "$BaseName.err.log"
    return Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $outPath -RedirectStandardError $errPath -WindowStyle Hidden -PassThru
}

function Test-SpringHealth {
    # Accept overall UP, or local-optional-infra DOWN as long as DB/liveness are UP,
    # or the public auth providers fingerprint (app is serving traffic).
    if (Test-TronProvidersFingerprint) {
        return $true
    }
    $urls = @(
        "http://127.0.0.1:8080/actuator/health/liveness",
        "http://127.0.0.1:8080/actuator/health"
    )
    foreach ($url in $urls) {
        try {
            $req = [System.Net.HttpWebRequest]::Create($url)
            $req.Timeout = 2500
            $req.Method = "GET"
            $res = $req.GetResponse()
            $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
            $body = $reader.ReadToEnd()
            $reader.Close()
            $statusCode = [int]$res.StatusCode
            $res.Close()
            if ($statusCode -ge 200 -and $statusCode -lt 300) {
                return $true
            }
            if (($body -match '"livenessState"\s*:\s*\{\s*"status"\s*:\s*"UP"') -or
                (($body -match '"db"') -and ($body -match '"status"\s*:\s*"UP"'))) {
                return $true
            }
        } catch [System.Net.WebException] {
            if ($_.Exception.Response) {
                try {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                    if ($body -match '"livenessState"\s*:\s*\{\s*"status"\s*:\s*"UP"' -or
                        ($body -match '"db"' -and $body -match '"status"\s*:\s*"UP"') -or
                        ($body -match '"status"\s*:\s*"UP"' -and $url -like "*liveness*")) {
                        return $true
                    }
                } catch {}
            }
        } catch {}
    }
    return $false
}

function Wait-Interactive([string]$Prompt) {
    if ($NoPause) { return }
    if (-not [Environment]::UserInteractive) { return }
    try {
        Read-Host $Prompt | Out-Null
    } catch {}
}

# Single-instance lock — concurrent START_TRON runs corrupt Spring/Vite PIDs.
$LockPath = Join-Path $RuntimeDir "start-tron.lock"
if (Test-Path $LockPath) {
    $lockAge = (Get-Date) - (Get-Item $LockPath).LastWriteTime
    $lockPid = 0
    try { $lockPid = [int]((Get-Content $LockPath -Raw).Trim()) } catch {}
    $lockAlive = $lockPid -gt 0 -and $null -ne (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)
    if ($lockAlive -and $lockAge.TotalMinutes -lt 15) {
        Write-Host "Another START_TRON is already running (PID $lockPid). Wait for it to finish, or delete:" -ForegroundColor Yellow
        Write-Host "  $LockPath" -ForegroundColor DarkYellow
        Log "Aborted: start lock held by PID $lockPid"
        Wait-Interactive "Press Enter to exit"
        exit 1
    }
    Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
}
$PID | Out-File -FilePath $LockPath -Encoding ascii -Force

try {

# If stack is already healthy and -Restart was not requested, skip full teardown.
if (-not $Restart -and (Test-SpringHealth) -and (Test-TcpPort "127.0.0.1" $script:VitePort)) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "        TRON AI ALREADY RUNNING         " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[7/9] Spring Core ........ OK (reuse)" -ForegroundColor Green
    Write-Host "[8/9] React Frontend ..... OK (reuse)" -ForegroundColor Green
    Write-Host ""
    Write-Host "TRON Core:  http://localhost:8080"
    Write-Host "TRON Web:   http://localhost:5174/"
    Write-Host ""
    Write-Host "Use: START_TRON.cmd -Restart   to force a clean restart." -ForegroundColor Gray
    Log "Startup skipped — Spring + Vite already healthy."
    if (-not $NoBrowser) {
        $browserFlag = Join-Path $RuntimeDir "browser_opened.flag"
        if (-not (Test-Path $browserFlag)) {
            Start-Process "http://localhost:5174/"
            "1" | Out-File -FilePath $browserFlag -Encoding ascii -Force
        } else {
            Write-Host "Browser already opened for this stack (skipping duplicate tab)." -ForegroundColor Gray
        }
    }
    exit 0
}

# Clean restart of TRON processes
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        TRON AI LOCAL STARTUP           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$StopScript = Join-Path $PSScriptRoot "Stop-Tron.ps1"
if (Test-Path $StopScript) {
    try {
        & $StopScript -Quiet
    } catch {
        Log "Stop-Tron reported: $($_.Exception.Message)"
        Write-Host "Warning: Stop-Tron hit an error; continuing startup." -ForegroundColor Yellow
    }
}

# -----------------------------------------------------------------
# PHASE 1 — INFRASTRUCTURE
# -----------------------------------------------------------------

# 1. MySQL (Required)
$mysqlReady = $false
if (Test-TcpPort "127.0.0.1" 3306) {
    $mysqlReady = $true
} else {
    # Check MySQL Windows service
    $svc = Get-Service | Where-Object { $_.Name -like "*mysql*" } | Select-Object -First 1
    if ($null -ne $svc) {
        Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
    } else {
        $mysqld = Join-Path $script:MysqlHome "bin\mysqld.exe"
        if (Test-Path $mysqld) {
            Start-Process -FilePath $mysqld -ArgumentList "--console", "--datadir=`"$script:MysqlData`"", "--port=3306", "--bind-address=127.0.0.1", "--mysqlx=0" -WindowStyle Hidden
        }
    }
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort "127.0.0.1" 3306) {
            $mysqlReady = $true
            break
        }
    }
}

if ($mysqlReady) {
    # Ensure tron_ai database and user exist
    $mysqlClient = Join-Path $script:MysqlHome "bin\mysql.exe"
    if (Test-Path $mysqlClient) {
        $initSql = "CREATE DATABASE IF NOT EXISTS tron_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'tronai'@'127.0.0.1' IDENTIFIED BY 'tronai_pass'; CREATE USER IF NOT EXISTS 'tronai'@'localhost' IDENTIFIED BY 'tronai_pass'; GRANT ALL PRIVILEGES ON tron_ai.* TO 'tronai'@'127.0.0.1'; GRANT ALL PRIVILEGES ON tron_ai.* TO 'tronai'@'localhost'; FLUSH PRIVILEGES;"
        & $mysqlClient -u root --protocol=TCP -h 127.0.0.1 -P 3306 -e $initSql 2>&1 | Out-Null
    }
    Write-Host "[1/9] MySQL .............. OK" -ForegroundColor Green
    Log "MySQL is UP on port 3306"
} else {
    Write-Host "[1/9] MySQL .............. FAILED" -ForegroundColor Red
    Log "FAILED: MySQL is not listening on port 3306."
    Write-Host "`nFAILED: MySQL is required for Spring Core but could not be started.`n" -ForegroundColor Red
    Wait-Interactive "Press Enter to exit"
    exit 1
}

# 2. RabbitMQ (Optional)
if (Test-TcpPort "127.0.0.1" 5672) {
    Write-Host "[2/9] RabbitMQ ........... OK" -ForegroundColor Green
    Log "RabbitMQ is UP on port 5672"
} else {
    Write-Host "[2/9] RabbitMQ ........... SKIP (Optional)" -ForegroundColor Yellow
    Log "RabbitMQ not running (optional)"
}

# 3. MinIO — REQUIRED for durable CV binary uploads in beta; local chat/auth works without it.
if (Test-TcpPort "127.0.0.1" 9000) {
    Write-Host "[3/9] MinIO .............. OK" -ForegroundColor Green
    Log "MinIO is UP on port 9000"
} else {
    Write-Host "[3/9] MinIO .............. SKIP (Optional)" -ForegroundColor Yellow
    Log "MinIO not running (optional)"
}

# -----------------------------------------------------------------
# PHASE 2 — AI SERVICES
# -----------------------------------------------------------------

# 4. Ollama (Optional / Local LLM)
$ollamaReady = $false
try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:11434" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.StatusCode -eq 200) { $ollamaReady = $true }
} catch {}

if (-not $ollamaReady) {
    $ollamaExe = if (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
        "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    } elseif (Test-Path "$env:ProgramFiles\Ollama\ollama.exe") {
        "$env:ProgramFiles\Ollama\ollama.exe"
    } else {
        (Get-Command ollama -ErrorAction SilentlyContinue).Source
    }

    if ($ollamaExe) {
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort "127.0.0.1" 11434) {
                $ollamaReady = $true
                break
            }
        }
    }
}

if ($ollamaReady) {
    $defaultModel = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "qwen3:8b" }
    $modelOk = $false
    try {
        $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($tags.models) {
            foreach ($m in $tags.models) {
                if ($m.name -eq $defaultModel -or $m.name -like "$defaultModel*") {
                    $modelOk = $true
                    break
                }
            }
        }
    } catch {}
    if ($modelOk) {
        Write-Host "[4/9] Ollama ............. OK (model $defaultModel)" -ForegroundColor Green
        Log "Ollama is UP; model $defaultModel present"
    } else {
        Write-Host "[4/9] Ollama ............. WARN (API up; model '$defaultModel' not listed)" -ForegroundColor Yellow
        Log "Ollama up but model $defaultModel not found in /api/tags"
    }
} else {
    Write-Host "[4/9] Ollama ............. WARN (Optional)" -ForegroundColor Yellow
    Log "Ollama is not running (optional)"
}

# 5. VOICEVOX (Optional / Japanese TTS)
$voicevoxReady = $false
try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:50021/version" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.StatusCode -eq 200) { $voicevoxReady = $true }
} catch {}

if (-not $voicevoxReady) {
    $vvExe = if (Test-Path "$env:ProgramFiles\VOICEVOX\vv-engine\run.exe") {
        "$env:ProgramFiles\VOICEVOX\vv-engine\run.exe"
    } elseif (Test-Path "$env:LOCALAPPDATA\Programs\VOICEVOX\vv-engine\run.exe") {
        "$env:LOCALAPPDATA\Programs\VOICEVOX\vv-engine\run.exe"
    } else {
        $null
    }
    if ($vvExe) {
        $vvDir = Split-Path $vvExe
        Start-Process -FilePath $vvExe -ArgumentList "--host", "127.0.0.1", "--port", "50021" -WorkingDirectory $vvDir -WindowStyle Hidden
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort "127.0.0.1" 50021) {
                $voicevoxReady = $true
                break
            }
        }
    }
}

if ($voicevoxReady) {
    Write-Host "[5/9] VOICEVOX ........... OK" -ForegroundColor Green
    Log "VOICEVOX is UP on port 50021"
} else {
    Write-Host "[5/9] VOICEVOX ........... WARN (Optional)" -ForegroundColor Yellow
    Log "VOICEVOX is not running (optional)"
}

# 6. STT Worker (Optional / Speech-to-Text)
$sttReady = $false
if (Test-TcpPort "127.0.0.1" 8091) {
    $sttReady = $true
} else {
    $sttDir = Join-Path $WorkspaceRoot "backend\stt-worker"
    if (Test-Path $sttDir) {
        $sttProc = Start-TronProcess -FilePath $script:PythonExe -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8091") `
            -WorkingDirectory $sttDir -BaseName "stt"
        if ($sttProc) {
            $sttProc.Id | Out-File -FilePath (Join-Path $RuntimeDir "stt.pid") -Force
        }
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort "127.0.0.1" 8091) {
                $sttReady = $true
                break
            }
        }
    }
}

if ($sttReady) {
    Write-Host "[6/9] STT Worker ......... OK" -ForegroundColor Green
    Log "STT Worker is UP on port 8091"
} else {
    Write-Host "[6/9] STT Worker ......... WARN (Optional)" -ForegroundColor Yellow
    Log "STT Worker is not running (optional)"
}

# -----------------------------------------------------------------
# PHASE 2.5 — Gotenberg (optional CV PDF converter; localhost:3000)
# -----------------------------------------------------------------
$ensureGotenberg = Join-Path $PSScriptRoot "Ensure-Gotenberg.ps1"
if (Test-Path $ensureGotenberg) {
    Write-Host "Ensuring Gotenberg (CV PDF)..." -NoNewline
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ensureGotenberg 2>&1 | Out-Null
        try {
            $gh = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 2
            if ($gh.StatusCode -ge 200 -and $gh.StatusCode -lt 300) {
                Write-Host " OK" -ForegroundColor Green
                Log "Gotenberg healthy on 127.0.0.1:3000"
            } else {
                Write-Host " WARN (optional — XLSX export still works)" -ForegroundColor Yellow
                Log "Gotenberg health unexpected status"
            }
        } catch {
            Write-Host " WARN (optional — install Docker Desktop + docker compose up -d gotenberg)" -ForegroundColor Yellow
            Log "Gotenberg not reachable (CV PDF unavailable until started)"
        }
    } catch {
        Write-Host " WARN (optional)" -ForegroundColor Yellow
        Log "Ensure-Gotenberg.ps1 failed: $($_.Exception.Message)"
    }
}

# -----------------------------------------------------------------
# PHASE 3 — APPLICATION (Spring Boot Core)
# -----------------------------------------------------------------

$springLog = Join-Path $LogDir "spring.log"
$springDir = Join-Path $WorkspaceRoot "backend\backend-spring"

Assert-TronSpringPortFree

# Only wipe target/classes when forced or last run hit ClassFormatError.
# Clearing every start forces a full recompile and makes START_TRON feel broken.
$staleClasses = Join-Path $springDir "target\classes"
$needRebuild = $ForceRebuild.IsPresent
if (-not $needRebuild -and (Test-Path $springLog)) {
    $tail = Get-Content $springLog -Tail 80 -ErrorAction SilentlyContinue | Out-String
    if ($tail -match "ClassFormatError|Invalid class file|truncated Class") {
        $needRebuild = $true
    }
}
if ($needRebuild -and (Test-Path $staleClasses)) {
    Remove-Item $staleClasses -Recurse -Force -ErrorAction SilentlyContinue
    Log "Cleared Spring target/classes for forced/safe rebuild."
    Write-Host "Rebuilding Spring classes..." -ForegroundColor Yellow
}

Write-Host "Starting Spring Core..." -NoNewline
$springProc = Start-TronProcess -FilePath "cmd.exe" -ArgumentList @("/c", "mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local") `
    -WorkingDirectory $springDir -BaseName "spring"
if ($springProc) {
    $springProc.Id | Out-File -FilePath (Join-Path $RuntimeDir "spring.pid") -Force
}

$springReady = $false
$maxSeconds = 180
for ($sec = 1; $sec -le $maxSeconds; $sec++) {
    Start-Sleep -Seconds 1
    if ($sec % 5 -eq 0) { Write-Host "." -NoNewline }
    if (Test-SpringHealth) {
        $springReady = $true
        break
    }
    if ($springProc -and $springProc.HasExited) {
        Log "Spring launcher exited with code $($springProc.ExitCode) before health was ready."
        break
    }
}
Write-Host ""

if ($springReady) {
    Write-Host "[7/9] Spring Core ........ OK" -ForegroundColor Green
    Log "Spring Core is UP and healthy on port 8080"
} else {
    Write-Host "[7/9] Spring Core ........ FAILED" -ForegroundColor Red
    Log "FAILED: Spring Core did not become healthy."
    Write-Host "`nFAILED: Spring Core did not become healthy.`nLog: $springLog`n" -ForegroundColor Red
    if (Test-Path $springLog) {
        Write-Host "Last 15 log lines:" -ForegroundColor DarkYellow
        Get-Content $springLog -Tail 15
    }
    Wait-Interactive "Press Enter to exit"
    exit 1
}

# -----------------------------------------------------------------
# PHASE 4 — FRONTEND (React / Vite)
# -----------------------------------------------------------------

$frontendLog = Join-Path $LogDir "frontend.log"
$frontendDir = Join-Path $WorkspaceRoot "frontend"
$frontendReady = $false

if (Test-TcpPort "127.0.0.1" 5174) {
    $frontendReady = $true
} else {
    $frontProc = Start-TronProcess -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") `
        -WorkingDirectory $frontendDir -BaseName "frontend"
    if ($frontProc) {
        $frontProc.Id | Out-File -FilePath (Join-Path $RuntimeDir "frontend.pid") -Force
    }

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort "127.0.0.1" 5174) {
            $frontendReady = $true
            break
        }
    }
}

if ($frontendReady) {
    Write-Host "[8/9] React Frontend ..... OK" -ForegroundColor Green
    Log "React Frontend is UP on port 5174"
} else {
    Write-Host "[8/9] React Frontend ..... FAILED" -ForegroundColor Red
    Log "FAILED: Frontend did not start."
    Write-Host "`nFAILED: Frontend did not start on port 5174.`nLog: $frontendLog`n" -ForegroundColor Red
    Wait-Interactive "Press Enter to exit"
    exit 1
}

# -----------------------------------------------------------------
# PHASE 5 — DESKTOP AGENT (exactly ONE of GUI | Headless | none)
# -----------------------------------------------------------------
# Root cause of "Device reconnected": START_TRON launched JavaFX GUI while
# HeadlessMain was already (or later) connected with the same identity.json.
# Mode: TRON_DESKTOP_MODE=gui|headless|none  (default: gui)

$desktopDir = Join-Path $WorkspaceRoot "desktop-agent"
$desktopMode = if ($env:TRON_DESKTOP_MODE) { $env:TRON_DESKTOP_MODE.Trim().ToLowerInvariant() } else { "gui" }
if ($desktopMode -notin @("gui", "headless", "none")) { $desktopMode = "gui" }

function Test-TronDesktopAgentRunning {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and (
            $_.CommandLine -like "*DesktopAgentApp*" -or
            $_.CommandLine -like "*HeadlessMain*" -or
            ($_.CommandLine -like "*javafx:run*" -and $_.CommandLine -like "*Group7*desktop-agent*")
        )
    }
    return [bool]$procs
}

if ($desktopMode -eq "none") {
    Write-Host "[9/9] Desktop Agent ...... SKIPPED (TRON_DESKTOP_MODE=none)" -ForegroundColor Yellow
    Log "Desktop Agent skipped (TRON_DESKTOP_MODE=none)."
} elseif (Test-TronDesktopAgentRunning) {
    Write-Host "[9/9] Desktop Agent ...... ALREADY RUNNING (single-instance; not starting a second)" -ForegroundColor Green
    Log "Desktop Agent already running — skipped duplicate launch."
} else {
    if ($desktopMode -eq "headless") {
        $desktopLauncher = Join-Path $desktopDir "run-tron-agent-headless.cmd"
        Log "Starting Desktop Agent HeadlessMain (TRON_DESKTOP_MODE=headless)."
    } else {
        $desktopLauncher = Join-Path $desktopDir "run-tron-agent.cmd"
        Log "Starting Desktop Agent GUI (TRON_DESKTOP_MODE=gui)."
    }
    $desktopProc = Start-TronProcess -FilePath "cmd.exe" -ArgumentList @("/c", "`"$desktopLauncher`"") `
        -WorkingDirectory $desktopDir -BaseName "desktop-agent" -NoStdRedirect
    if ($desktopProc) {
        $desktopProc.Id | Out-File -FilePath (Join-Path $RuntimeDir "desktop.pid") -Force
    }
    Start-Sleep -Seconds 3
    Write-Host "[9/9] Desktop Agent ...... OK ($desktopMode)" -ForegroundColor Green
    Log "Desktop Agent started mode=$desktopMode."
}

# -----------------------------------------------------------------
# SUMMARY & AUTO OPEN UIs
# -----------------------------------------------------------------

# Ensure OpenCode background service when available (no --standalone; optional)
$opencodeExe = (Get-Command opencode -ErrorAction SilentlyContinue).Source
if ($opencodeExe) {
    try {
        Start-Process -FilePath $opencodeExe -ArgumentList @("service", "start") -WindowStyle Hidden
        Write-Host "[+] OpenCode service .... attempted (background)" -ForegroundColor Green
        Log "OpenCode service start attempted"
    } catch {
        Write-Host "[+] OpenCode service .... WARN (optional)" -ForegroundColor Yellow
        Log "OpenCode service start failed (optional): $($_.Exception.Message)"
    }
} else {
    Write-Host "[+] OpenCode service .... SKIP (opencode not on PATH)" -ForegroundColor Yellow
    Log "OpenCode CLI not found on PATH"
}

Write-Host ""
Write-Host "TRON Core:" -ForegroundColor Cyan
Write-Host "http://localhost:8080"
Write-Host ""
Write-Host "TRON Web:" -ForegroundColor Cyan
Write-Host "http://localhost:5174/"
Write-Host ""
Write-Host "Desktop Agent:" -ForegroundColor Cyan
Write-Host "RUNNING ($desktopMode)"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TRON AI READY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Log "TRON stack startup complete. Opening UIs..."

# 1. Open TRON Web in browser (landing page) — avoid duplicate tabs on repeated starts
if (-not $NoBrowser) {
    $browserFlag = Join-Path $RuntimeDir "browser_opened.flag"
    Start-Process "http://localhost:5174/"
    "1" | Out-File -FilePath $browserFlag -Encoding ascii -Force
}

# 2. Popup Desktop Agent window (skip in -NoBrowser automation runs)
if (-not $NoBrowser) {
    $popupScript = Join-Path $WorkspaceRoot "popup-desktop.ps1"
    if (Test-Path $popupScript) {
        for ($i = 0; $i -lt 8; $i++) {
            Start-Sleep -Seconds 1
            $popupJob = Start-Job -ScriptBlock {
                param($path)
                & powershell -NoProfile -ExecutionPolicy Bypass -File $path
            } -ArgumentList $popupScript
            $done = Wait-Job $popupJob -Timeout 3
            if ($done) {
                $code = Receive-Job $popupJob -ErrorAction SilentlyContinue
                Remove-Job $popupJob -Force -ErrorAction SilentlyContinue
                if ($LASTEXITCODE -eq 0 -or $code -eq 0) { break }
            } else {
                Stop-Job $popupJob -ErrorAction SilentlyContinue
                Remove-Job $popupJob -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host "Stack running in background. Run STOP_TRON.cmd to stop." -ForegroundColor Gray

} finally {
    Remove-Item $LockPath -Force -ErrorAction SilentlyContinue
}
