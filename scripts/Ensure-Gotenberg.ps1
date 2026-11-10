# Ensure local Gotenberg v8 container (tron-gotenberg) is running on 127.0.0.1:3000.
# Non-blocking for the rest of TRON: returns exit 0 even when Docker is missing (warn only).
# Safely starts Docker Desktop when installed but the daemon is stopped.
param(
    [switch]$Strict,
    [int]$DockerWaitSeconds = 120
)

$ErrorActionPreference = "Continue"
$ContainerName = "tron-gotenberg"
$Image = "gotenberg/gotenberg:8"
$ComposeFile = Join-Path (Split-Path $PSScriptRoot -Parent) "docker-compose.yml"

function Find-DockerExe {
    $candidates = @(
        "docker",
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\resources\bin\docker.exe"
    )
    foreach ($c in $candidates) {
        try {
            if ($c -eq "docker") {
                $cmd = Get-Command docker -ErrorAction SilentlyContinue
                if ($cmd) { return $cmd.Source }
            } elseif (Test-Path $c) {
                return $c
            }
        } catch {}
    }
    return $null
}

function Find-DockerDesktopExe {
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

function Test-DockerDaemon([string]$DockerExe) {
    try {
        $out = & $DockerExe info 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $out -notmatch "error during connect|cannot find the file specified|Is the docker daemon running") {
            return $true
        }
    } catch {}
    return $false
}

function Test-GotenbergHttp {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300)
    } catch {
        return $false
    }
}

function Start-DockerDesktopSafe {
    # Prefer Windows service when present; otherwise launch Docker Desktop GUI app.
    $svc = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
        Write-Host "[Gotenberg] Starting Docker Desktop service..." -ForegroundColor Cyan
        try { Start-Service -Name "com.docker.service" -ErrorAction SilentlyContinue } catch {}
    }

    if (-not (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)) {
        $desktop = Find-DockerDesktopExe
        if ($desktop) {
            Write-Host "[Gotenberg] Launching Docker Desktop..." -ForegroundColor Cyan
            Start-Process -FilePath $desktop -WindowStyle Minimized -ErrorAction SilentlyContinue
        }
    }
}

$docker = Find-DockerExe
if (-not $docker) {
    Write-Host "[Gotenberg] Docker Desktop not found. CV PDF export requires Gotenberg." -ForegroundColor Yellow
    Write-Host "  Install Docker Desktop, then: docker compose up -d gotenberg" -ForegroundColor Yellow
    Write-Host "  XLSX CV export continues to work without Gotenberg." -ForegroundColor Yellow
    if ($Strict) { exit 1 }
    exit 0
}

if (Test-GotenbergHttp) {
    Write-Host "[Gotenberg] Already healthy on http://127.0.0.1:3000" -ForegroundColor Green
    exit 0
}

if (-not (Test-DockerDaemon $docker)) {
    Start-DockerDesktopSafe
    Write-Host "[Gotenberg] Waiting for Docker daemon (up to ${DockerWaitSeconds}s)..." -NoNewline
    $daemonOk = $false
    for ($i = 1; $i -le $DockerWaitSeconds; $i++) {
        Start-Sleep -Seconds 1
        if ($i % 5 -eq 0) { Write-Host "." -NoNewline }
        if (Test-DockerDaemon $docker) {
            $daemonOk = $true
            break
        }
    }
    Write-Host ""
    if (-not $daemonOk) {
        Write-Host "[Gotenberg] Docker daemon did not become ready. CV PDF unavailable until Docker Desktop is running." -ForegroundColor Yellow
        if ($Strict) { exit 1 }
        exit 0
    }
    Write-Host "[Gotenberg] Docker daemon ready." -ForegroundColor Green
}

# Prefer compose when available — only starts the gotenberg service, never unrelated stacks.
if (Test-Path $ComposeFile) {
    Write-Host "[Gotenberg] Starting via docker compose..." -ForegroundColor Cyan
    $composeOut = & $docker compose -f $ComposeFile up -d gotenberg 2>&1 | ForEach-Object { "$_" }
    $composeOut | ForEach-Object { Write-Host $_ }
} else {
    $existing = & $docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}" 2>$null
    if ($existing -eq $ContainerName) {
        Write-Host "[Gotenberg] Starting existing container $ContainerName..." -ForegroundColor Cyan
        & $docker start $ContainerName 2>$null | Out-Null
    } else {
        Write-Host "[Gotenberg] Creating $ContainerName from $Image..." -ForegroundColor Cyan
        & $docker run -d --name $ContainerName --restart unless-stopped -p 127.0.0.1:3000:3000 $Image 2>$null | Out-Null
    }
}

$ok = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    if (Test-GotenbergHttp) { $ok = $true; break }
    Write-Host "." -NoNewline
}
Write-Host ""
if ($ok) {
    Write-Host "[Gotenberg] Ready at http://127.0.0.1:3000" -ForegroundColor Green
    exit 0
}

Write-Host "[Gotenberg] Not reachable after start attempt. CV PDF will report service unavailable until fixed." -ForegroundColor Yellow
if ($Strict) { exit 1 }
exit 0
