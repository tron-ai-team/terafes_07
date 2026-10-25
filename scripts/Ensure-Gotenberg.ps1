# Ensure local Gotenberg v8 container (tron-gotenberg) is running on 127.0.0.1:3000.
# Non-blocking for the rest of TRON: returns exit 0 even when Docker is missing (warn only).
param(
    [switch]$Strict
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

function Test-GotenbergHttp {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300)
    } catch {
        return $false
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

# Prefer compose when available
if (Test-Path $ComposeFile) {
    Write-Host "[Gotenberg] Starting via docker compose..." -ForegroundColor Cyan
    & $docker compose -f $ComposeFile up -d gotenberg 2>&1 | Out-Host
} else {
    $existing = & $docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}" 2>$null
    if ($existing -eq $ContainerName) {
        Write-Host "[Gotenberg] Starting existing container $ContainerName..." -ForegroundColor Cyan
        & $docker start $ContainerName 2>&1 | Out-Host
    } else {
        Write-Host "[Gotenberg] Creating $ContainerName from $Image..." -ForegroundColor Cyan
        & $docker run -d --name $ContainerName --restart unless-stopped -p 127.0.0.1:3000:3000 $Image 2>&1 | Out-Host
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
