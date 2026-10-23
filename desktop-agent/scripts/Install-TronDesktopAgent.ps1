# TRON Desktop Agent — consent-based local installer for the jpackage app-image / EXE output.
# Does NOT silently install OpenCode or OpenClaw.
# Usage (elevated recommended for Program Files):
#   .\Install-TronDesktopAgent.ps1 -SourceDir ..\target\jpackage-out\TRON-Desktop-Agent
#   .\Install-TronDesktopAgent.ps1 -SourceDir ..\target\jpackage-out -InstallOptionalEngines

param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDir,
    [string]$InstallRoot = "$env:LOCALAPPDATA\Programs\TRON-Desktop-Agent",
    [switch]$InstallOptionalEngines,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourceDir)) {
    throw "SourceDir not found: $SourceDir"
}

$exe = Get-ChildItem -Path $SourceDir -Recurse -Filter "TRON*.exe" | Select-Object -First 1
if (-not $exe) {
    throw "No TRON*.exe found under $SourceDir (build app-image/EXE first)"
}

Write-Host "Installing from: $($exe.DirectoryName)"
Write-Host "Install root:    $InstallRoot"

if ((Test-Path $InstallRoot) -and -not $Force) {
    $answer = Read-Host "Install root exists. Overwrite? (yes/no)"
    if ($answer -ne "yes") { throw "Aborted" }
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $exe.DirectoryName "*") $InstallRoot

$installedExe = Get-ChildItem -Path $InstallRoot -Filter "TRON*.exe" | Select-Object -First 1
Write-Host "Installed: $($installedExe.FullName)"

if ($InstallOptionalEngines) {
    Write-Host ""
    Write-Host "Optional engines require EXPLICIT consent (version-pinned)."
    $oc = Read-Host "Install OpenCode (@opencode/cli@2.1.1) globally via npm? (yes/no)"
    if ($oc -eq "yes") {
        npm install -g "@opencode/cli@2.1.1"
    } else {
        Write-Host "Skipped OpenCode"
    }
    $claw = Read-Host "Install OpenClaw (openclaw@2026.6.35) globally via npm? (yes/no)"
    if ($claw -eq "yes") {
        npm install -g "openclaw@2026.6.35"
        Write-Host "NOTE: OpenClaw gateway still needs ~/.openclaw configuration before live browser via gateway."
    } else {
        Write-Host "Skipped OpenClaw (Playwright remains available in the agent)"
    }
} else {
    Write-Host "Optional engines not requested. Pair the agent, then use in-app consent to install engines."
}

Write-Host ""
Write-Host "Next: launch the agent, pair with TRON Core, set allowed workspace, keep WSS connected."
Write-Host "OpenCode coding tasks must use the paired device — Spring Core will not call localhost OpenCode."
