# TRON Desktop Agent Launcher (PowerShell)
[CmdletBinding()]
param(
    [switch]$Smoke,
    [string]$CoreUrl,
    [string]$Workspace
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "          TRON Desktop Agent Launcher (PS1)            " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Locate Java 21
$JavaExe = $null

if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $JavaExe = "$env:JAVA_HOME\bin\java.exe"
} elseif (Test-Path "C:\Java\jdk-21.0.7.6-hotspot\bin\java.exe") {
    $env:JAVA_HOME = "C:\Java\jdk-21.0.7.6-hotspot"
    $JavaExe = "$env:JAVA_HOME\bin\java.exe"
} else {
    $CommonPaths = @(
        "C:\Program Files\Eclipse Adoptium\jdk-21*",
        "C:\Program Files\Java\jdk-21*",
        "C:\Program Files\Microsoft\jdk-21*"
    )
    foreach ($pattern in $CommonPaths) {
        $resolved = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($resolved -and (Test-Path "$($resolved.FullName)\bin\java.exe")) {
            $env:JAVA_HOME = $resolved.FullName
            $JavaExe = "$($resolved.FullName)\bin\java.exe"
            break
        }
    }
}

if (-not $JavaExe) {
    $cmd = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        $JavaExe = $cmd.Source
    }
}

if (-not $JavaExe) {
    Write-Host "[ERROR] Java 21 was not found on this system." -ForegroundColor Red
    Write-Host "Please install Java 21 or set JAVA_HOME." -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Write-Host "[OK] Using Java runtime: $JavaExe" -ForegroundColor Green

# Optional parameters
if ($Smoke) {
    $env:TRON_UI_SMOKE = "true"
}
if ($CoreUrl) {
    $env:TRON_CORE_URL = $CoreUrl
}
if ($Workspace) {
    $env:TRON_WORKSPACE = $Workspace
}

Write-Host "[INFO] Starting TRON Desktop Agent..." -ForegroundColor Cyan
Write-Host "(If an instance is already running, its window will be brought to the front.)" -ForegroundColor Gray
Write-Host ""

$Mvnw = Join-Path $ScriptDir "mvnw.cmd"
if (-not (Test-Path $Mvnw)) {
    $Mvnw = Join-Path $ScriptDir "..\backend\backend-spring\mvnw.cmd"
}

if (-not (Test-Path $Mvnw)) {
    Write-Host "[ERROR] Maven wrapper (mvnw.cmd) was not found." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

try {
    & $Mvnw javafx:run
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Process exited with code $code" -ForegroundColor Red
        Read-Host "Press Enter to close window..."
        exit $code
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to start TRON Desktop Agent: $_" -ForegroundColor Red
    Read-Host "Press Enter to close window..."
    exit 1
}
