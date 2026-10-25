# TRON Local Process Stop Script
# Safely stops ONLY TRON-owned processes. Never uses global taskkill on java, node, or python.

param (
    [switch]$Quiet
)

$ErrorActionPreference = "SilentlyContinue"
$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RuntimeDir = Join-Path $WorkspaceRoot ".runtime"
$PidFiles = @("desktop.pid", "frontend.pid", "spring.pid", "stt.pid")

function Log-Stop([string]$message) {
    if (-not $Quiet) {
        Write-Host "[TRON STOP] $message"
    }
}

function Stop-TronProcessById([int]$ProcessId, [string]$ServiceName) {
    if ($ProcessId -le 0) { return }
    if ($ProcessId -eq $PID) { return }
    $myParentId = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID" -ErrorAction SilentlyContinue).ParentProcessId
    if ($ProcessId -eq $myParentId) { return }

    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            Log-Stop "Stopping $ServiceName (PID $ProcessId)..."
            & taskkill.exe /PID $ProcessId /T /F 2>&1 | Out-Null
            Start-Sleep -Milliseconds 200
            if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
                Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# 1. Stop by saved PID files
if (Test-Path $RuntimeDir) {
    foreach ($file in $PidFiles) {
        $pidPath = Join-Path $RuntimeDir $file
        if (Test-Path $pidPath) {
            $content = (Get-Content $pidPath -Raw -ErrorAction SilentlyContinue)
            if ($content -and $content.Trim() -match '^\d+$') {
                # Do not use $pid / $pId — PowerShell aliases those to read-only $PID.
                $ownerPid = [int]$content.Trim()
                $service = $file.Replace(".pid", "")
                Stop-TronProcessById $ownerPid $service
            }
            Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
        }
    }
}

# 2. Stop any remaining TRON processes listening on known TRON ports
$myParentId = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID" -ErrorAction SilentlyContinue).ParentProcessId
$TronPorts = @(5174, 8080, 8091)

function Get-TronListeningPids([int]$Port) {
    $owners = New-Object System.Collections.Generic.List[int]
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            if ($conn.OwningProcess -gt 0 -and -not $owners.Contains([int]$conn.OwningProcess)) {
                $owners.Add([int]$conn.OwningProcess)
            }
        }
    } catch {}
    if ($owners.Count -eq 0) {
        $netstat = & netstat.exe -ano -p tcp 2>$null
        foreach ($line in $netstat) {
            if ($line -match ":$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
                $procId = [int]$Matches[1]
                if ($procId -gt 0 -and -not $owners.Contains($procId)) {
                    $owners.Add($procId)
                }
            }
        }
    }
    return $owners
}

foreach ($port in $TronPorts) {
    $owners = @(Get-TronListeningPids $port)
    foreach ($ownerPid in $owners) {
        if ($ownerPid -gt 0 -and $ownerPid -ne $PID -and $ownerPid -ne $myParentId) {
            $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
            $cmd = $cim.CommandLine
            $path = $cim.ExecutablePath
            $cmdLower = if ($cmd) { $cmd.ToLowerInvariant() } else { "" }
            $pathLower = if ($path) { $path.ToLowerInvariant() } else { "" }
            $isTron = ($cmdLower -like "*group7*") -or ($cmdLower -like "*backend-spring*") -or ($cmdLower -like "*stt-worker*") `
                      -or ($cmdLower -like "*vite*") -or ($cmdLower -like "*desktopagentapp*") -or ($cmdLower -like "*com.tronai.tronaiapplication*") `
                      -or ($cmdLower -like "*tron-ai-spring*") -or ($pathLower -like "*group7*")
            if (-not $isTron -and $port -eq 8080) {
                $jps = "C:\Java\jdk-21.0.7.6-hotspot\bin\jps.exe"
                if (Test-Path $jps) {
                    $listing = & $jps -l 2>$null
                    foreach ($line in $listing) {
                        if ($line -match ("^" + $ownerPid + "\s+com\.tronai\.TronAiApplication\b")) {
                            $isTron = $true
                        }
                    }
                }
                if (-not $isTron) {
                    try {
                        $req = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:8080/v3/api-docs")
                        $req.Timeout = 2500
                        $res = $req.GetResponse()
                        $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
                        $body = $reader.ReadToEnd()
                        $reader.Close()
                        $res.Close()
                        if ($body -match "desktop-agents" -and $body -match "tron") {
                            $isTron = $true
                        }
                    } catch {}
                }
            }
            if ($isTron) {
                Log-Stop "Releasing port $port (stopping TRON PID $ownerPid)..."
                Stop-TronProcessById $ownerPid "Port $port owner"
            }
        }
    }
}

# 3. Stop ALL Desktop Agent variants (GUI + Headless) — never leave HeadlessMain alive
#    after STOP while START launches the GUI (same identity → WSS "Device reconnected").
$desktopProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and (
        $_.CommandLine -like "*DesktopAgentApp*" -or
        $_.CommandLine -like "*HeadlessMain*" -or
        $_.CommandLine -like "*run-tron-agent*" -or
        ($_.CommandLine -like "*javafx:run*" -and $_.CommandLine -like "*Group7*")
    )
}
foreach ($p in $desktopProcs) {
    if ($p.ProcessId -ne $PID -and $p.ProcessId -ne $myParentId) {
        Log-Stop "Stopping TRON Desktop Agent (PID $($p.ProcessId))..."
        Stop-TronProcessById $p.ProcessId "TRON Desktop Agent"
    }
}

# 4. Clean up stale signal files only AFTER processes are gone.
#    Never delete instance.lock while an agent may still hold the OS file lock —
#    on Windows that recreate race allowed a second agent to connect.
Start-Sleep -Milliseconds 500
$agentDir = Join-Path $env:LOCALAPPDATA "TRON\desktop-agent"
if (Test-Path $agentDir) {
    Remove-Item (Join-Path $agentDir "instance.port") -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $agentDir "show.request") -Force -ErrorAction SilentlyContinue
    # Safe to clear lock file name only when no DesktopAgentApp/HeadlessMain remains.
    $stillAlive = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -and ($_.CommandLine -like "*DesktopAgentApp*" -or $_.CommandLine -like "*HeadlessMain*")
    }
    if (-not $stillAlive) {
        Remove-Item (Join-Path $agentDir "instance.lock") -Force -ErrorAction SilentlyContinue
    }
}

# 5. Clear owned startup flags (never touch MySQL/Ollama services)
Remove-Item (Join-Path $RuntimeDir "browser_opened.flag") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $RuntimeDir "start-tron.lock") -Force -ErrorAction SilentlyContinue

Log-Stop "TRON processes stopped."
