# TRON V4-C — real hybrid failover probes (no FORCE_ONLINE readiness bypass)
# Requires: Spring on :8080, admin credentials via env TRON_V4C_EMAIL / TRON_V4C_PASSWORD
$ErrorActionPreference = "Stop"
$ev = Join-Path (Split-Path -Parent $PSScriptRoot) "_v4c_evidence"
New-Item -ItemType Directory -Force -Path $ev | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]

$email = $env:TRON_V4C_EMAIL
$pass = $env:TRON_V4C_PASSWORD
if (-not $email -or -not $pass) {
  throw "Set TRON_V4C_EMAIL and TRON_V4C_PASSWORD for an ADMIN user"
}

function Login {
  $body = @{ email = $email; password = $pass } | ConvertTo-Json
  return Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body))
}

function Set-Control($hdr, $patch) {
  $body = $patch | ConvertTo-Json
  return Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/admin/control" -Method PUT `
    -Headers $hdr -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body))
}

function Get-Control($hdr) {
  return Invoke-RestMethod "http://127.0.0.1:8080/api/v1/admin/control" -Headers $hdr
}

$admin = Login
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
$log.Add("LOGIN role=$($admin.user.role)")

# 1) Local Ollama ONLINE -> supervisor LOCAL_OLLAMA + real plan
Set-Control $hdr @{ rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true; pauseNewAiTasks = $false; mode = "NORMAL" } | Out-Null
$c = Get-Control $hdr
$log.Add("LOCAL_ONLINE route=$($c.supervisorRoute) ollama=$($c.localOllamaReachable)")
$plan = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans" -Method POST -Headers $hdr `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ goal = "V4C hybrid online probe"; engine = "OPENCODE" } | ConvertTo-Json))) -TimeoutSec 120
$log.Add("LOCAL_PLAN id=$($plan.id) route=$($plan.modelRoute) milestones=$($plan.milestones.Count)")

# 2) Local forced offline -> cloud route (no FORCE_ONLINE)
Set-Control $hdr @{ rtxOverride = "FORCE_OFFLINE"; localRoutingEnabled = $true; cloudRoutingEnabled = $true } | Out-Null
$c = Get-Control $hdr
$log.Add("LOCAL_OFFLINE route=$($c.supervisorRoute) ollama=$($c.localOllamaReachable)")

# Real cloud chat if cloud configured; otherwise record controlled unavailability
try {
  $chatBody = @{
    messages = @(@{ role = "user"; content = "Say CLOUD_OK in one word." })
    aiProfile = "ULTRA"
    language = "en"
  } | ConvertTo-Json -Depth 5
  $chat = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/chat" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($chatBody)) -UseBasicParsing -TimeoutSec 90
  $log.Add("CLOUD_CHAT status=$($chat.StatusCode) len=$($chat.Content.Length)")
  [IO.File]::WriteAllText("$ev\cloud-chat-snippet.txt", $chat.Content.Substring(0, [Math]::Min(500, $chat.Content.Length)), $utf8)
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  $body = ""
  try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $body = $sr.ReadToEnd() } catch {}
  $log.Add("CLOUD_CHAT status=$code body=$body")
}

# 3) Credits — usage surface
$usage = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/ai/usage" -Headers $hdr
$log.Add("USAGE limit=$($usage.dailyLimit) used=$($usage.usedCredits) remaining=$($usage.remaining)")

# 4) Provider unavailable
Set-Control $hdr @{ rtxOverride = "FORCE_OFFLINE"; localRoutingEnabled = $false; cloudRoutingEnabled = $false } | Out-Null
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/supervisor/plans" -Method POST -Headers $hdr `
    -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes((@{ goal = "should fail"; engine = "OPENCODE" } | ConvertTo-Json))) | Out-Null
  $log.Add("PROVIDER_DOWN unexpected success")
} catch {
  $log.Add("PROVIDER_DOWN status=$($_.Exception.Response.StatusCode.value__)")
}

# Restore
Set-Control $hdr @{ rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true; mode = "NORMAL" } | Out-Null
$log | ForEach-Object { $_ }
[IO.File]::WriteAllText("$ev\hybrid-failover-live.txt", ($log -join "`n"), $utf8)
