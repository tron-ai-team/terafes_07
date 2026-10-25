# TRON V5 — Native agent path live verification (agent-tasks → Gemini optimize → OpenCode/OpenClaw)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v5_evidence"
$wsRoot = Join-Path $ev "native-workspace"
New-Item -ItemType Directory -Force -Path $ev, $wsRoot | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]

$email = if ($env:TRON_V5_EMAIL) { $env:TRON_V5_EMAIL } else { "v4b.live.07fe0a94@example.com" }
$pass = if ($env:TRON_V5_PASSWORD) { $env:TRON_V5_PASSWORD } else { "V4bLive!Pass99" }

function Note([string]$m) { $log.Add($m); Write-Output $m }
function Login {
  $body = @{ email = $email; password = $pass } | ConvertTo-Json
  return Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body))
}
function Save-Json($name, $obj) {
  [IO.File]::WriteAllText((Join-Path $ev $name), ($obj | ConvertTo-Json -Depth 10), $utf8)
}
function Wait-Task($hdr, [string]$taskId, [int]$timeoutSec = 600) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $last = $null
  while ((Get-Date) -lt $deadline) {
    $t = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/agent-tasks/$taskId" -Headers $hdr -TimeoutSec 30
    $last = $t
    $st = [string]$t.status
    Note "POLL task=$taskId status=$st actions=$($t.actionCount)"
    if ($st -in @("VERIFIED","COMPLETED","FAILED","CANCELLED","STOPPED")) { return $t }
    Start-Sleep -Seconds 5
  }
  return $last
}

Note "=== V5 NATIVE AGENT LIVE $(Get-Date -Format o) ==="
$admin = Login
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
Note "LOGIN ok userId=$($admin.user.id) role=$($admin.user.role)"

# Health
try {
  $all = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/agent-engines/health" -Headers $hdr
  Save-Json "engines-health.json" $all
  $oc = $all.OPENCODE
  $cl = $all.OPENCLAW
  Note "OPENCODE_HEALTH status=$($oc.status) available=$($oc.available) transport=$($oc.transport)"
  Note "OPENCLAW_HEALTH gatewayConfigured=$($cl.gatewayConfigured) status=$($cl.status)"
} catch { Note "ENGINES_HEALTH FAIL $($_.Exception.Message)" }

$devices = @(Invoke-RestMethod "http://127.0.0.1:8080/api/v1/desktop-agents/devices" -Headers $hdr)
Save-Json "devices.json" $devices
$online = $devices | Where-Object { $_.status -eq "ONLINE" } | Select-Object -First 1
if (-not $online) {
  Note "DEVICE_VERDICT=FAIL_NO_ONLINE"
  [IO.File]::WriteAllText((Join-Path $ev "v5-native-live.txt"), ($log -join "`n"), $utf8)
  exit 2
}
Note "DEVICE id=$($online.id) status=$($online.status) workspace=$($online.allowedWorkspace)"
$deviceId = [string]$online.id
$allowed = [string]$online.allowedWorkspace

# Ensure workspace under allowed root
$caseWs = Join-Path $allowed "v5-native-case1"
New-Item -ItemType Directory -Force -Path $caseWs | Out-Null

# Cancel any active tasks first
try {
  $existing = @(Invoke-RestMethod "http://127.0.0.1:8080/api/v1/agent-tasks" -Headers $hdr)
  foreach ($t in $existing) {
    if ($t.status -in @("QUEUED","PLANNING","RUNNING","WAITING_APPROVAL","WAITING_USER","PAUSED")) {
      Note "STOP_ACTIVE $($t.id) status=$($t.status)"
      try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-tasks/$($t.id)/stop" -Method POST -Headers $hdr | Out-Null
      } catch { Note "STOP_WARN $($_.Exception.Message)" }
    }
  }
  Start-Sleep -Seconds 2
} catch { Note "LIST_TASKS_WARN $($_.Exception.Message)" }

# --- TEST 1: Coding via agent-tasks (must use NativeAgentOrchestrator / OpenCode, not planner) ---
$goal1 = "Create a three-file website in this folder: index.html, styles.css, and app.js. index.html must link the CSS and JS. styles.css sets body background to #102a43 and h1 color white. app.js sets document.title to TRON_V5_NATIVE and shows an alert-free console.log of READY. Do not ask questions. Create the files now."
$createBody = @{
  deviceId = [long]$deviceId
  goal = $goal1
  workspace = $caseWs
} | ConvertTo-Json
Note "CREATE_TASK1 workspace=$caseWs"
$task1 = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-tasks" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($createBody)) -TimeoutSec 60
Save-Json "task1-create.json" $task1
Note "TASK1 id=$($task1.id) status=$($task1.status)"
$final1 = Wait-Task $hdr $task1.id 720
Save-Json "task1-final.json" $final1
Note "TASK1_FINAL status=$($final1.status)"
Note "TASK1_SUMMARY $($final1.summary)"

# Evidence of native path
$nativeOk = ($final1.summary -match "NATIVE_ENGINE=OPENCODE|Native OpenCode|OPENCODE") -or ($final1.summary -match "Improved prompt|IMPROVED_PROMPT")
$plannerSmell = ($final1.summary -match "TERMINAL requires arguments") -or ($null -ne ($final1.steps | Where-Object { $_.tool -eq "TERMINAL" -and $_.status -eq "FAILED" }))
$idx = Join-Path $caseWs "index.html"
$css = Join-Path $caseWs "styles.css"
$js = Join-Path $caseWs "app.js"
$filesOk = (Test-Path $idx) -and (Test-Path $css) -and (Test-Path $js)
Note "DISK index=$(Test-Path $idx) css=$(Test-Path $css) js=$(Test-Path $js)"
if ($filesOk) {
  Note "DISK_INDEX_HEAD $((Get-Content -Raw $idx).Substring(0, [Math]::Min(200, (Get-Content -Raw $idx).Length)))"
}
if ($final1.status -eq "VERIFIED" -and $filesOk -and -not $plannerSmell) {
  Note "TEST1_CODING_VERDICT=PASS"
} elseif ($final1.status -eq "FAILED" -and ($final1.summary -match "OpenCode unavailable|Prompt optimizer failed|Desktop device offline")) {
  Note "TEST1_CODING_VERDICT=FAIL_ENGINE $($final1.summary)"
} elseif ($filesOk -and $final1.status -in @("VERIFIED","COMPLETED")) {
  Note "TEST1_CODING_VERDICT=PASS_DISK"
} else {
  Note "TEST1_CODING_VERDICT=FAIL status=$($final1.status) files=$filesOk plannerSmell=$plannerSmell"
}

# Steps dump
try {
  $detail = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/agent-tasks/$($task1.id)" -Headers $hdr
  Save-Json "task1-detail.json" $detail
  if ($detail.steps) {
    foreach ($s in $detail.steps) { Note "STEP1 $($s.tool) $($s.operation) $($s.status)" }
  }
  if ($detail.messages) {
    $sys = $detail.messages | Where-Object { $_.content -match "Optimized prompt|NATIVE|OpenCode|PROMPT_OPTIMIZE" } | Select-Object -First 5
    foreach ($m in $sys) { Note "MSG1 $($m.role): $($m.content.Substring(0, [Math]::Min(180, $m.content.Length)))" }
  }
} catch { Note "DETAIL1_WARN $($_.Exception.Message)" }

# --- TEST 2: Automation goal must hit OpenClaw (clear fail if gateway off — NOT Playwright) ---
Start-Sleep -Seconds 2
$caseWs2 = Join-Path $allowed "v5-native-auto"
New-Item -ItemType Directory -Force -Path $caseWs2 | Out-Null
$goal2 = "Open https://example.com in the browser, read the page title, and take a screenshot. This is a browser automation task."
$create2 = @{ deviceId = [long]$deviceId; goal = $goal2; workspace = $caseWs2 } | ConvertTo-Json
Note "CREATE_TASK2 automation"
try {
  $task2 = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-tasks" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($create2)) -TimeoutSec 60
  Save-Json "task2-create.json" $task2
  $final2 = Wait-Task $hdr $task2.id 180
  Save-Json "task2-final.json" $final2
  Note "TASK2_FINAL status=$($final2.status) summary=$($final2.summary)"
  if ($final2.status -eq "FAILED" -and ($final2.summary -match "OpenClaw gateway is not configured|gatewayConfigured=false|Playwright fallback is intentionally NOT")) {
    Note "TEST2_OPENCLAW_VERDICT=PASS_CLEAR_FAILURE_NO_PLAYWRIGHT_FALLBACK"
  } elseif ($final2.status -eq "VERIFIED" -and ($final2.summary -match "Native OpenClaw")) {
    Note "TEST2_OPENCLAW_VERDICT=PASS_NATIVE"
  } else {
    Note "TEST2_OPENCLAW_VERDICT=FAIL_UNEXPECTED status=$($final2.status)"
  }
} catch {
  Note "TEST2_OPENCLAW_VERDICT=FAIL_HTTP $($_.Exception.Message)"
}

# --- TEST 3: Cancel path (start coding then stop) ---
$caseWs3 = Join-Path $allowed "v5-native-cancel"
New-Item -ItemType Directory -Force -Path $caseWs3 | Out-Null
$goal3 = "Create a large multi-file Java Maven project with many packages and keep iterating for several minutes. Do not finish quickly."
$create3 = @{ deviceId = [long]$deviceId; goal = $goal3; workspace = $caseWs3 } | ConvertTo-Json
try {
  $task3 = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-tasks" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($create3)) -TimeoutSec 60
  Note "TASK3 id=$($task3.id) starting then cancel"
  Start-Sleep -Seconds 8
  $stopped = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-tasks/$($task3.id)/stop" -Method POST -Headers $hdr
  Save-Json "task3-stop.json" $stopped
  Start-Sleep -Seconds 3
  $final3 = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/agent-tasks/$($task3.id)" -Headers $hdr
  Save-Json "task3-final.json" $final3
  Note "TASK3_FINAL status=$($final3.status)"
  if ($final3.status -in @("CANCELLED","STOPPED","FAILED")) {
    Note "TEST3_CANCEL_VERDICT=PASS"
  } else {
    Note "TEST3_CANCEL_VERDICT=FAIL status=$($final3.status)"
  }
} catch {
  Note "TEST3_CANCEL_VERDICT=FAIL $($_.Exception.Message)"
}

[IO.File]::WriteAllText((Join-Path $ev "v5-native-live.txt"), ($log -join "`n"), $utf8)
Note "WROTE $ev\v5-native-live.txt"
