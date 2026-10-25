# OpenCode C React / D edit / E build / F fix-build — under allowed workspace
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
$ws = Join-Path $ev "opencode-workspace\react-mini"
New-Item -ItemType Directory -Force -Path $ws | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]
function Note([string]$m) { $log.Add($m); Write-Output $m }

$email = "v4b.live.07fe0a94@example.com"
$pass = "V4bLive!Pass99"
$admin = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{email=$email;password=$pass}|ConvertTo-Json)))
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
$devices = @(Invoke-RestMethod "http://127.0.0.1:8080/api/v1/desktop-agents/devices" -Headers $hdr)
$online = $devices | Where-Object { $_.status -eq "ONLINE" } | Select-Object -First 1
if (-not $online) { throw "No ONLINE device" }
$deviceId = [string]$online.id

$session = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{
    goal = "React mini project"; workspacePath = $ws; deviceId = $deviceId
  } | ConvertTo-Json))) -TimeoutSec 120
Note "SESSION status=$($session.status) id=$($session.id)"
if ($session.status -ne "READY") { throw "Session not READY: $($session.lastError)" }
$sid = $session.id

function Wait-File([string]$rel, [int]$sec = 300) {
  $deadline = (Get-Date).AddSeconds($sec)
  while ((Get-Date) -lt $deadline) {
    $hit = Get-ChildItem -Path $ws -Recurse -Filter (Split-Path $rel -Leaf) -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit -and $hit.Length -gt 0) { return $hit }
    if (Test-Path (Join-Path $ws $rel)) {
      $p = Get-Item (Join-Path $ws $rel)
      if ($p.Length -gt 0) { return $p }
    }
    Start-Sleep -Seconds 5
  }
  return $null
}

# C) Create small React project (Vite-style)
$promptC = @"
Create a minimal Vite React project in the current workspace with package.json, index.html, vite.config.js, src/main.jsx, src/App.jsx, and src/App.css.
App.jsx must render a heading 'Golden React'. Do not ask questions. Write files now.
"@
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/start" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{prompt=$promptC}|ConvertTo-Json))) -TimeoutSec 300 | Out-Null

$pkg = Wait-File "package.json" 300
$app = Wait-File "App.jsx" 300
if ($pkg -and $app) {
  Note "C_DISK package=$($pkg.FullName) app=$($app.FullName)"
  $appTxt = Get-Content -Raw $app.FullName
  Note "C_APP_HAS_HEADING=$($appTxt -match 'Golden React')"
  Note "C_VERDICT=PASS"
} else {
  Note "C_VERDICT=FAIL missing package=$([bool]$pkg) app=$([bool]$app)"
}

# D) Edit existing project
$promptD = @"
Edit src/App.jsx (or App.jsx) so the heading text becomes 'Golden React Edited'. Keep other files. Write the change now.
"@
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/start" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{prompt=$promptD}|ConvertTo-Json))) -TimeoutSec 300 | Out-Null
Start-Sleep -Seconds 20
$edited = $false
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
  $app2 = Wait-File "App.jsx" 5
  if ($app2) {
    $t = Get-Content -Raw $app2.FullName
    if ($t -match 'Golden React Edited') { $edited = $true; Note "D_DISK $($app2.FullName)"; break }
  }
  Start-Sleep -Seconds 5
}
Note "D_VERDICT=$(if($edited){'PASS'}else{'FAIL'})"

# E) Real build — npm install + build if package.json exists
$buildOk = $false
$buildLog = Join-Path $ev "opencode-react-build.txt"
Push-Location $ws
try {
  if (Test-Path "package.json") {
    Note "E_NPM_INSTALL starting"
    npm install --no-fund --no-audit 2>&1 | Out-File $buildLog -Encoding utf8
    if ($LASTEXITCODE -eq 0 -or (Test-Path "node_modules")) {
      Note "E_NPM_BUILD starting"
      npm run build 2>&1 | Tee-Object -FilePath $buildLog -Append
      if ($LASTEXITCODE -eq 0 -and ((Test-Path "dist") -or (Test-Path "build"))) {
        $buildOk = $true
        Note "E_DIST_OK"
      } else {
        Note "E_BUILD_EXIT=$LASTEXITCODE"
      }
    } else {
      Note "E_INSTALL_FAIL exit=$LASTEXITCODE"
    }
  } else {
    Note "E_NO_PACKAGE"
  }
} catch {
  Note "E_ERROR $($_.Exception.Message)"
} finally {
  Pop-Location
}
Note "E_VERDICT=$(if($buildOk){'PASS'}else{'FAIL'})"

# F) Introduce build error then fix via OpenCode
$fPass = $false
if ($app) {
  $brokenPath = $app.FullName
  $orig = Get-Content -Raw $brokenPath
  Set-Content -Path $brokenPath -Value ($orig + "`nthis is not valid jsx {{{") -Encoding utf8
  Note "F_BROKE_FILE $brokenPath"
  $promptF = @"
There is a deliberate syntax error in App.jsx. Fix it so the project builds again. Remove invalid trailing junk. Keep heading 'Golden React Edited'.
"@
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/start" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{prompt=$promptF}|ConvertTo-Json))) -TimeoutSec 300 | Out-Null
  $fixed = $false
  $deadline = (Get-Date).AddSeconds(240)
  while ((Get-Date) -lt $deadline) {
    $t = Get-Content -Raw $brokenPath -ErrorAction SilentlyContinue
    if ($t -and ($t -notmatch 'this is not valid jsx') -and ($t -match 'Golden React Edited')) {
      $fixed = $true; break
    }
    Start-Sleep -Seconds 5
  }
  Note "F_FILE_FIXED=$fixed"
  if ($fixed) {
    Push-Location $ws
    try {
      npm run build 2>&1 | Tee-Object -FilePath (Join-Path $ev "opencode-react-rebuild.txt")
      if ($LASTEXITCODE -eq 0) { $fPass = $true; Note "F_REBUILD_OK" } else { Note "F_REBUILD_FAIL exit=$LASTEXITCODE" }
    } finally { Pop-Location }
  }
}
Note "F_VERDICT=$(if($fPass){'PASS'}else{'FAIL'})"

[IO.File]::WriteAllText("$ev\opencode-cdf.txt", ($log -join "`n"), $utf8)
Note "DONE"
