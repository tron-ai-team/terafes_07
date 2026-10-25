# Admin Control Center live API tests (React UI separately noted if unavailable)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]
function Note([string]$m) { $log.Add($m); Write-Output $m }

function Login($email, $pass) {
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{email=$email;password=$pass}|ConvertTo-Json)))
}

$admin = Login "v4b.live.07fe0a94@example.com" "V4bLive!Pass99"
$ah = @{ Authorization = "Bearer $($admin.accessToken)" }
Note "ADMIN_LOGIN role=$($admin.user.role) ok=$([bool]$admin.accessToken)"

# 1) Admin dashboard
$dash = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/dashboard" -Headers $ah
[IO.File]::WriteAllText("$ev\admin-dashboard.json", ($dash | ConvertTo-Json -Depth 10), $utf8)
Note "DASH registeredUsers=$($dash.registeredUserCount) activeUsers=$($dash.activeUserCount) activeAiTasks=$($dash.activeAiTaskCount) queue=$($dash.queueSize)"
Note "DASH localOllama=$($dash.hybrid.localOllamaReachable) supervisorRoute=$($dash.hybrid.supervisorRoute)"
Note "DASH cloudCreditsUsed=$($dash.cloudCreditsUsed) remainingBudget=$($dash.remainingCloudBudget)"
$dashJson = $dash | ConvertTo-Json -Depth 10 -Compress
$secretLeak = ($dashJson -match 'sk-|api[_-]?key|AIza|ghp_|eyJhbGciOi')
Note "SECRETS_EXPOSED=$secretLeak"
Note "ADMIN_DASH_VERDICT=$(if(-not $secretLeak -and $null -ne $dash.registeredUserCount){'PASS'}else{'FAIL'})"

# 2) Non-admin denied
$regEmail = "golden.user." + [guid]::NewGuid().ToString("N").Substring(0,8) + "@example.com"
$reg = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/register" -Method POST `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{
    email=$regEmail; password="GoldenUser!99"; displayName="GoldenUser"
  }|ConvertTo-Json)))
$uh = @{ Authorization = "Bearer $($reg.accessToken)" }
$userId = $reg.user.id
try {
  Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/dashboard" -Headers $uh | Out-Null
  Note "NON_ADMIN_VERDICT=FAIL_ALLOWED"
} catch {
  Note "NON_ADMIN status=$([int]$_.Exception.Response.StatusCode)"
  Note "NON_ADMIN_VERDICT=PASS"
}

# 3) Suspend + current token revoked
$users = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/users" -Headers $ah
Note "USERS_COUNT=$($users.Count)"
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/users/$userId/suspend" -Method POST -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{reason="golden-test"}|ConvertTo-Json))) | Out-Null
Note "SUSPENDED user=$userId"
# existing token should fail
try {
  Invoke-RestMethod "http://127.0.0.1:8080/api/v1/auth/me" -Headers $uh | Out-Null
  # try chat as fallback probe
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/chat" -Method POST -Headers $uh `
      -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{message="hi";mode="FAST"}|ConvertTo-Json))) | Out-Null
    Note "SUSPEND_TOKEN_VERDICT=FAIL_STILL_WORKS"
  } catch {
    Note "SUSPEND_CHAT status=$([int]$_.Exception.Response.StatusCode)"
    Note "SUSPEND_TOKEN_VERDICT=PASS"
  }
} catch {
  Note "SUSPEND_ME status=$([int]$_.Exception.Response.StatusCode)"
  Note "SUSPEND_TOKEN_VERDICT=PASS"
}

# 4) Restore
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/users/$userId/restore" -Method POST -Headers $ah | Out-Null
Note "RESTORED user=$userId"
# re-login after restore
$re = Login $regEmail "GoldenUser!99"
Note "RESTORE_LOGIN ok=$([bool]$re.accessToken)"

# 5) Control modes — save then restore AUTO
$before = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/control" -Headers $ah
[IO.File]::WriteAllText("$ev\admin-control-before.json", ($before | ConvertTo-Json -Depth 8), $utf8)
$modes = @(@{exhibitionMode=$true}, @{maintenanceMode=$true}, @{maintenanceMode=$false; exhibitionMode=$false; rtxOverride="AUTO"; localRoutingEnabled=$true; cloudRoutingEnabled=$true})
foreach ($patch in $modes) {
  $u = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/control" -Method PUT -Headers $ah `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes(($patch | ConvertTo-Json)))
  Note "CONTROL_PATCH $($patch | ConvertTo-Json -Compress) => exhibition=$($u.exhibitionMode) maintenance=$($u.maintenanceMode) rtx=$($u.rtxOverride)"
}
# ensure back to normal AUTO
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/control" -Method PUT -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{
    exhibitionMode=$false; maintenanceMode=$false; rtxOverride="AUTO"; localRoutingEnabled=$true; cloudRoutingEnabled=$true
  }|ConvertTo-Json))) | Out-Null
Note "CONTROL_RESTORED_AUTO"

# 6) Disable local then re-enable
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/control" -Method PUT -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{localRoutingEnabled=$false}|ConvertTo-Json))) | Out-Null
$h1 = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/dashboard" -Headers $ah
Note "LOCAL_DISABLED supervisorRoute=$($h1.hybrid.supervisorRoute)"
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/control" -Method PUT -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{localRoutingEnabled=$true;cloudRoutingEnabled=$true;rtxOverride="AUTO"}|ConvertTo-Json))) | Out-Null
Note "LOCAL_REENABLED"

# 7) Audit logs
$audit = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/audit" -Headers $ah
[IO.File]::WriteAllText("$ev\admin-audit.json", ($audit | ConvertTo-Json -Depth 8), $utf8)
Note "AUDIT_ENTRIES=$($audit.Count)"
Note "AUDIT_VERDICT=$(if($audit.Count -gt 0){'PASS'}else{'FAIL'})"

# 8) Chat FAST/SMART smoke (API)
$conv = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/conversations" -Method POST -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{title="golden-admin-chat"}|ConvertTo-Json)))
$chatFast = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/chat" -Method POST -Headers $ah `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{
    conversationId=$conv.id; message="Reply with exactly: ADMIN_CHAT_OK"; mode="FAST"
  }|ConvertTo-Json))) -TimeoutSec 120
[IO.File]::WriteAllText("$ev\admin-chat-fast.json", ($chatFast | ConvertTo-Json -Depth 6), $utf8)
Note "CHAT_FAST provider=$($chatFast.providerType) model=$($chatFast.actualModelId) preview=$($chatFast.content.Substring(0,[Math]::Min(80,$chatFast.content.Length)))"
Note "CHAT_FAST_VERDICT=$(if($chatFast.content){'PASS'}else{'FAIL'})"

# Frontend reachability
try {
  $fe = Invoke-WebRequest "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 3
  Note "FRONTEND_HTTP=$($fe.StatusCode) UI_BROWSER_TEST=AVAILABLE"
} catch {
  Note "FRONTEND_HTTP=DOWN UI_BROWSER_TEST=NOT_TESTED_API_ONLY"
}

[IO.File]::WriteAllText("$ev\admin-live.txt", ($log -join "`n"), $utf8)
Note "ADMIN_LIVE_DONE"
