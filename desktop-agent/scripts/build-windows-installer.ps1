# TRON Desktop Agent — Windows installer pipeline (jpackage)
# Requires: JDK 21+ with jpackage, Maven wrapper.
# WiX (candle.exe) enables MSI and EXE installer types.
# Without WiX: produces app-image + copies Install-TronDesktopAgent.ps1 (NOT a full MSI).
# Does NOT silently install OpenCode/OpenClaw.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "== TRON Desktop Agent packaging =="
Write-Host "Root: $Root"

& .\mvnw.cmd -q -DskipTests package
if ($LASTEXITCODE -ne 0) { throw "Maven package failed" }

$Jar = Get-ChildItem -Path "target" -Filter "tron-desktop-agent-*.jar" | Where-Object { $_.Name -notmatch "sources|javadoc" } | Select-Object -First 1
if (-not $Jar) { throw "Main jar not found in target/" }

$Out = Join-Path $Root "target\jpackage-out"
$Stage = Join-Path $Root "target\jpackage-input"
Remove-Item -Recurse -Force $Out, $Stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $Stage | Out-Null
Copy-Item $Jar.FullName (Join-Path $Stage "tron-desktop-agent.jar")

$jpackage = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\jpackage.exe" } else { "jpackage" }
if ($env:JAVA_HOME -and -not (Test-Path $jpackage)) { $jpackage = "jpackage" }

$hasWix = [bool](Get-Command candle.exe -ErrorAction SilentlyContinue)
$types = @("app-image")
if ($hasWix) {
  $types = @("exe", "msi", "app-image")
  Write-Host "WiX detected — attempting EXE + MSI + app-image"
} else {
  Write-Host "WiX not found — building app-image only (MSI/EXE installer DEFERRED)"
}

$built = @()
foreach ($type in $types) {
  $dest = Join-Path $Out $type
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Write-Host "jpackage --type $type ..."
  & $jpackage `
    --type $type `
    --name "TRON-Desktop-Agent" `
    --app-version "0.1.0" `
    --input $Stage `
    --main-jar "tron-desktop-agent.jar" `
    --main-class "com.tronai.desktop.app.DesktopAgentApp" `
    --dest $dest `
    --java-options "-Dfile.encoding=UTF-8" `
    --vendor "TRON AI" `
    --description "TRON Desktop Agent (outbound WSS only; OpenCode/OpenClaw optional with consent)"
  if ($LASTEXITCODE -eq 0) {
    $built += $type
    Write-Host "OK: $type -> $dest"
  } else {
    Write-Host "FAILED: $type (exit $LASTEXITCODE)"
  }
}

Copy-Item (Join-Path $Root "scripts\Install-TronDesktopAgent.ps1") (Join-Path $Out "Install-TronDesktopAgent.ps1") -Force

$manifest = @{
  builtTypes = $built
  wixPresent = $hasWix
  fullInstaller = ($built -contains "msi" -or $built -contains "exe")
  appImageOnly = ($built -contains "app-image" -and -not ($built -contains "msi") -and -not ($built -contains "exe"))
  note = if ($built -contains "msi" -or $built -contains "exe") {
    "Produced a real Windows installer artifact."
  } else {
    "PROTOTYPE app-image only — not a full Windows Installer. Use Install-TronDesktopAgent.ps1 to stage locally."
  }
  output = $Out
} | ConvertTo-Json -Depth 4

Set-Content -Path (Join-Path $Out "PACKAGING_MANIFEST.json") -Value $manifest -Encoding UTF8
Write-Host $manifest
Get-ChildItem $Out -Recurse -File | Select-Object FullName, Length | Format-Table -AutoSize
