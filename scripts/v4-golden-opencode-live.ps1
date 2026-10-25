# TRON V4 Golden — OpenCode DESKTOP_WSS live tests (A–O subset with disk proof)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
$ws = Join-Path $ev "opencode-workspace"
New-Item -ItemType Directory -Force -Path $ws | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]

$email = "v4b.live.07fe0a94@example.com"
$pass = "V4bLive!Pass99"
function Login {
  $body = @{ email = $email; password = $pass } | ConvertTo-Json
  return Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body))
}
function Note([string]$m) { $log.Add($m); Write-Output $m }

$admin = Login
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
$devices = @(Invoke-RestMethod "http://127.0.0.1:8080/api/v1/desktop-agents/devices" -Headers $hdr)
$online = $devices | Where-Object { $_.status -eq "ONLINE" } | Select-Object -First 1
if (-not $online) { throw "No ONLINE device for admin — pair headless agent first" }
Note "DEVICE id=$($online.id) status=$($online.status) ws=$($online.allowedWorkspace)"
$deviceId = [string]$online.id

# N) Reject without device — create session as different user without devices
$regEmail = "golden.nodvice." + [guid]::NewGuid().ToString("N").Substring(0,8) + "@example.com"
$regBody = @{ email=$regEmail; password="GoldenNoDev!99"; displayName="NoDevice" } | ConvertTo-Json
try {
  $nod = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/register" -Method POST -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($regBody))
  $nh = @{ Authorization = "Bearer $($nod.accessToken)" }
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions" -Method POST -Headers $nh `
      -ContentType "application/json" -Body (@{ goal="should fail"; workspacePath=$ws } | ConvertTo-Json) | Out-Null
    Note "N_VERDICT=FAIL_UNEXPECTED_SUCCESS"
  } catch {
    $code = [int]$_.Exception.Response.StatusCode
    Note "N_NO_DEVICE status=$code"
    Note "N_VERDICT=PASS"
  }
} catch {
  Note "N_VERDICT=BLOCKED_REGISTER $($_.Exception.Message)"
}

# Create OpenCode session on paired device
$createBody = @{
  goal = "Golden OpenCode workspace bind"
  workspacePath = $ws
  deviceId = $deviceId
} | ConvertTo-Json
Note "CREATE_SESSION starting..."
$session = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($createBody)) -TimeoutSec 120
[IO.File]::WriteAllText("$ev\opencode-session.json", ($session | ConvertTo-Json -Depth 8), $utf8)
Note "SESSION id=$($session.id) status=$($session.status) workspace=$($session.workspacePath) external=$($session.externalSessionId) err=$($session.lastError)"
if ($session.status -ne "READY") {
  Note "CREATE_VERDICT=FAIL status=$($session.status)"
  [IO.File]::WriteAllText("$ev\opencode-live.txt", ($log -join "`n"), $utf8)
  exit 1
}
Note "CREATE_VERDICT=PASS"
$sid = $session.id

# J) Reject workspace traversal
try {
  $bad = @{ goal="traverse"; workspacePath="C:\Windows\System32"; deviceId=$deviceId } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($bad)) | Out-Null
  Note "J_VERDICT=FAIL_TRAVERSAL_ALLOWED"
} catch {
  Note "J_TRAVERSAL status=$([int]$_.Exception.Response.StatusCode)"
  Note "J_VERDICT=PASS"
}

# A) Create three real files
$promptA = @"
Create exactly these three files in the current workspace (no subfolders unless needed):
1) golden-a1.txt with content LINE_A1
2) golden-a2.txt with content LINE_A2
3) golden-a3.txt with content LINE_A3
Do not ask questions. Write the files now.
"@
$startA = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/start" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ prompt = $promptA } | ConvertTo-Json))) -TimeoutSec 300
[IO.File]::WriteAllText("$ev\opencode-start-a.json", ($startA | ConvertTo-Json -Depth 8), $utf8)
Note "A_START status=$($startA.status) desktopSuccess=$($startA.desktopSuccess)"

# OpenCode prompt is async (steer) — poll disk + VERIFY_FILE until present or timeout
function Wait-WorkspaceFile([string]$rel, [int]$timeoutSec = 180) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $p = Join-Path $ws $rel
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $p) {
      $c = (Get-Content -Raw $p).Trim()
      if ($c.Length -gt 0) { return @{ ok = $true; path = $p; content = $c } }
    }
    Start-Sleep -Seconds 3
  }
  return @{ ok = $false; path = $p; content = $null }
}

$diskOk = $true
foreach ($f in @("golden-a1.txt","golden-a2.txt","golden-a3.txt")) {
  $wait = Wait-WorkspaceFile $f 180
  if ($wait.ok) {
    Note "A_DISK $($wait.path) => $($wait.content)"
    try {
      $vf = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/verify-file" -Method POST -Headers $hdr `
        -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ path = $f } | ConvertTo-Json))) -TimeoutSec 60
      Note "A_VERIFY $f verified=$($vf.verified) size=$($vf.sizeBytes) content=$($vf.content)"
      [IO.File]::WriteAllText("$ev\opencode-verify-$f.json", ($vf | ConvertTo-Json -Depth 6), $utf8)
    } catch {
      Note "A_VERIFY $f FAIL $($_.Exception.Message)"
    }
  } else {
    Note "A_DISK MISSING $($wait.path)"
    $diskOk = $false
  }
}
if ($diskOk) { Note "A_VERDICT=PASS" } else { Note "A_VERDICT=FAIL" }

# G) Continue session — append file
$promptG = "Create file golden-continued.txt with content CONTINUED_OK. Do not ask questions."
$cont = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/continue" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ prompt = $promptG } | ConvertTo-Json))) -TimeoutSec 300
Note "G_CONTINUE status=$($cont.status) desktopSuccess=$($cont.desktopSuccess)"
$waitG = Wait-WorkspaceFile "golden-continued.txt" 180
if ($waitG.ok) { Note "G_DISK=$($waitG.content)"; Note "G_VERDICT=PASS" } else { Note "G_VERDICT=FAIL_MISSING" }

# K) Unauthorized user access to session (before cancel)
try {
  $nh = @{ Authorization = "Bearer $($nod.accessToken)" }
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid" -Headers $nh | Out-Null
  Note "K_VERDICT=FAIL_LEAK"
} catch {
  Note "K_FOREIGN status=$([int]$_.Exception.Response.StatusCode)"
  Note "K_VERDICT=PASS"
}

# B) Multi-file website on same READY session (continue) before cancel
$promptB = @"
Create a small multi-page static website in folder site/ with:
- index.html (nav links to about.html and contact.html)
- about.html
- contact.html
- styles.css
- app.js
Keep it simple. Write the files now.
"@
$sb = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/continue" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ prompt = $promptB } | ConvertTo-Json))) -TimeoutSec 360
Note "B_START status=$($sb.status) desktopSuccess=$($sb.desktopSuccess)"
$need = @("site/index.html","site/about.html","site/contact.html","site/styles.css","site/app.js")
$okB = $true
foreach ($f in $need) {
  $wait = Wait-WorkspaceFile $f 240
  if ($wait.ok) { Note "B_DISK $($wait.path) size=$((Get-Item $wait.path).Length)" }
  else { Note "B_DISK MISSING $($wait.path)"; $okB = $false }
}
if ($okB) { Note "B_VERDICT=PASS" } else { Note "B_VERDICT=FAIL_OR_PARTIAL" }

# H) Cancel after B
$cancel = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/cancel" -Method POST -Headers $hdr
Note "H_CANCEL status=$($cancel.status)"
if ($cancel.status -eq "CANCELLED") { Note "H_VERDICT=PASS" } else { Note "H_VERDICT=FAIL" }

# O already covered via VERIFY + disk; record paths
Note "O_WORKSPACE=$ws"
Get-ChildItem $ws -Recurse -File | ForEach-Object { Note "O_FILE=$($_.FullName)" }

[IO.File]::WriteAllText("$ev\opencode-live.txt", ($log -join "`n"), $utf8)
Note "DONE"
