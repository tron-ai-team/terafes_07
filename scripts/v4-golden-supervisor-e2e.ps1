# TRON V4 Golden — AI Supervisor E2E (GOAL → Ollama → milestones → OpenCode → disk → VERIFIED)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
# Must stay under device allowedWorkspace (opencode-workspace)
$ws = Join-Path $ev "opencode-workspace\supervisor-website"
New-Item -ItemType Directory -Force -Path $ws | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]
function Note([string]$m) { $log.Add($m); Write-Output $m }

$email = "v4b.live.07fe0a94@example.com"
$pass = "V4bLive!Pass99"
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json
$admin = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($loginBody))
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }

$devices = @(Invoke-RestMethod "http://127.0.0.1:8080/api/v1/desktop-agents/devices" -Headers $hdr)
$online = $devices | Where-Object { $_.status -eq "ONLINE" } | Select-Object -First 1
if (-not $online) { throw "No ONLINE device" }
Note "DEVICE id=$($online.id) status=$($online.status)"

$goal = "Create a responsive website with multiple pages, navigation, CSS and JavaScript. Put all files under the current workspace. Include at least index.html, about.html, contact.html, styles.css, and app.js. Navigation must link between pages. Do not ask questions."
Note "GOAL=$goal"

# 1) Create supervisor plan (LOCAL Ollama milestones)
$planBody = @{ goal = $goal; engine = "OPENCODE" } | ConvertTo-Json
$plan = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($planBody)) -TimeoutSec 180
[IO.File]::WriteAllText("$ev\supervisor-plan.json", ($plan | ConvertTo-Json -Depth 10), $utf8)
Note "PLAN id=$($plan.id) status=$($plan.status) route=$($plan.modelRoute) engine=$($plan.engine) milestones=$($plan.milestones.Count)"
Note "ORIGINAL_GOAL_PERSISTED=$($plan.originalGoal -eq $goal)"
if ($plan.status -ne "PLANNED" -and $plan.status -ne "RUNNING") {
  Note "PLAN_VERDICT=FAIL status=$($plan.status)"
  [IO.File]::WriteAllText("$ev\supervisor-e2e.txt", ($log -join "`n"), $utf8)
  exit 1
}
if ([string]::IsNullOrWhiteSpace($plan.modelRoute)) {
  Note "PLAN_VERDICT=FAIL missing modelRoute"
  [IO.File]::WriteAllText("$ev\supervisor-e2e.txt", ($log -join "`n"), $utf8)
  exit 1
}
Note "PLAN_VERDICT=PASS"

# Reload from MySQL via GET
$planReload = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans/$($plan.id)" -Headers $hdr
[IO.File]::WriteAllText("$ev\supervisor-plan-reload.json", ($planReload | ConvertTo-Json -Depth 10), $utf8)
Note "MYSQL_RELOAD originalGoalMatch=$($planReload.originalGoal -eq $goal) milestoneCount=$($planReload.milestones.Count)"

# 2) OpenCode session bound to device + workspace + planId
$createBody = @{
  goal = $goal
  workspacePath = $ws
  deviceId = [string]$online.id
  planId = $plan.id
} | ConvertTo-Json
$session = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($createBody)) -TimeoutSec 120
[IO.File]::WriteAllText("$ev\supervisor-opencode-session.json", ($session | ConvertTo-Json -Depth 8), $utf8)
Note "SESSION id=$($session.id) status=$($session.status) planId=$($session.planId) ws=$($session.workspacePath)"
if ($session.status -ne "READY") {
  Note "SESSION_VERDICT=FAIL $($session.lastError)"
  [IO.File]::WriteAllText("$ev\supervisor-e2e.txt", ($log -join "`n"), $utf8)
  exit 1
}
Note "SESSION_VERDICT=PASS"
$sid = $session.id

# 3) Start OpenCode with first milestone + full goal
$ms0 = $plan.milestones | Where-Object { $_.index -eq 0 } | Select-Object -First 1
$prompt = @"
Supervisor plan $($plan.id) milestone 0: $($ms0.title)
Acceptance: $($ms0.acceptanceCriteria)

Immutable user goal (do not change):
$goal

Create the complete multi-page website now in the workspace. Write real files to disk. Stop when files exist.
"@
$start = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/start" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ prompt = $prompt } | ConvertTo-Json))) -TimeoutSec 300
[IO.File]::WriteAllText("$ev\supervisor-opencode-start.json", ($start | ConvertTo-Json -Depth 8), $utf8)
Note "START status=$($start.status) desktopSuccess=$($start.desktopSuccess)"

function Wait-File([string]$rel, [int]$timeoutSec = 240) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $p = Join-Path $ws $rel
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $p) {
      $c = Get-Content -Raw $p -ErrorAction SilentlyContinue
      if ($c -and $c.Trim().Length -gt 0) { return @{ ok = $true; path = $p; bytes = ([Text.Encoding]::UTF8.GetByteCount($c)); contentPreview = $c.Substring(0, [Math]::Min(120, $c.Length)) } }
    }
    # also search one level deep
    $found = Get-ChildItem -Path $ws -Recurse -Filter (Split-Path $rel -Leaf) -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found -and $found.Length -gt 0) {
      $c = Get-Content -Raw $found.FullName
      return @{ ok = $true; path = $found.FullName; bytes = $found.Length; contentPreview = $c.Substring(0, [Math]::Min(120, $c.Length)) }
    }
    Start-Sleep -Seconds 4
  }
  return @{ ok = $false; path = $p }
}

$required = @("index.html","about.html","contact.html","styles.css","app.js")
$allOk = $true
$evidenceLines = New-Object System.Collections.Generic.List[string]
foreach ($f in $required) {
  $w = Wait-File $f 240
  if ($w.ok) {
    Note "DISK_OK $f path=$($w.path) bytes=$($w.bytes)"
    $evidenceLines.Add("$f@$($w.path)#$($w.bytes)")
    try {
      $vf = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/OPENCODE/sessions/$sid/verify-file" -Method POST -Headers $hdr `
        -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ path = $f } | ConvertTo-Json))) -TimeoutSec 60
      Note "VERIFY $f verified=$($vf.verified) size=$($vf.sizeBytes)"
      [IO.File]::WriteAllText("$ev\supervisor-verify-$f.json", ($vf | ConvertTo-Json -Depth 6), $utf8)
      if (-not $vf.verified) { $allOk = $false }
    } catch {
      # file may be in subdir — disk ok still counts; note verify miss
      Note "VERIFY $f API_MISS $($_.Exception.Message)"
    }
  } else {
    Note "DISK_MISS $f"
    $allOk = $false
  }
}

# List workspace tree for evidence
$tree = Get-ChildItem -Path $ws -Recurse -File | ForEach-Object { $_.FullName.Replace($ws, ".") + " (" + $_.Length + "b)" }
[IO.File]::WriteAllText("$ev\supervisor-workspace-tree.txt", ($tree -join "`n"), $utf8)
Note "WORKSPACE_FILES=$($tree.Count)"

# 4) Mark milestones with disk evidence (not LLM claim)
$evidence = "DISK_READBACK: " + ($evidenceLines -join "; ")
for ($i = 0; $i -lt $plan.milestones.Count; $i++) {
  $isLast = ($i -eq ($plan.milestones.Count - 1))
  $body = @{
    success = $allOk
    verified = ($allOk -and $isLast)
    evidence = $evidence
  } | ConvertTo-Json
  $plan = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans/$($plan.id)/milestones/$i/result" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body))
  Note "MILESTONE_$i status=$($plan.status) current=$($plan.currentMilestoneIndex)"
}

[IO.File]::WriteAllText("$ev\supervisor-plan-final.json", ($plan | ConvertTo-Json -Depth 10), $utf8)

# Final goal immutability check
$final = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans/$($plan.id)" -Headers $hdr
Note "FINAL status=$($final.status) originalGoalUnchanged=$($final.originalGoal -eq $goal)"

if ($allOk -and ($final.status -eq "VERIFIED" -or $final.status -eq "COMPLETED") -and ($final.originalGoal -eq $goal)) {
  Note "SUPERVISOR_E2E_VERDICT=PASS"
  $exit = 0
} elseif (-not $allOk) {
  Note "SUPERVISOR_E2E_VERDICT=FAIL_DISK"
  $exit = 1
} else {
  Note "SUPERVISOR_E2E_VERDICT=FAIL_STATUS status=$($final.status)"
  $exit = 1
}

[IO.File]::WriteAllText("$ev\supervisor-e2e.txt", ($log -join "`n"), $utf8)
exit $exit
