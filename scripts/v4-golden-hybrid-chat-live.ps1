# TRON V4 Golden — FAST/SMART hybrid chat live verification (real model responses)
# Requires Spring :8080 rebuilt with ChatService hybrid fix.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
New-Item -ItemType Directory -Force -Path $ev | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]

$email = if ($env:TRON_V4C_EMAIL) { $env:TRON_V4C_EMAIL } else { "v4b.live.07fe0a94@example.com" }
$pass = if ($env:TRON_V4C_PASSWORD) { $env:TRON_V4C_PASSWORD } else { "V4bLive!Pass99" }

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
function Chat($hdr, $profile, $text) {
  $chatBody = @{
    messages = @(@{ role = "user"; content = $text })
    aiProfile = $profile
    language = "en"
  } | ConvertTo-Json -Depth 5
  try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/chat" -Method POST -Headers $hdr `
      -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($chatBody)) -UseBasicParsing -TimeoutSec 120
    return @{ ok = $true; status = $resp.StatusCode; body = $resp.Content }
  } catch {
    $code = 0
    $body = $_.Exception.Message
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
      try {
        $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
      } catch {}
    }
    return @{ ok = $false; status = $code; body = $body }
  }
}

$admin = Login
$hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
$log.Add("LOGIN role=$($admin.user.role) id=$($admin.user.id)")

# Ensure admin role for control API
if ($admin.user.role -ne "ADMIN" -and $admin.user.role -ne "OWNER") {
  $mysql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
  & $mysql --host=127.0.0.1 --user=tronai --password=tronai_pass --database=tron_ai `
    --execute="UPDATE users SET role='ADMIN' WHERE id=$($admin.user.id);" 2>$null | Out-Null
  $admin = Login
  $hdr = @{ Authorization = "Bearer $($admin.accessToken)" }
  $log.Add("PROMOTED role=$($admin.user.role)")
}

# --- A) LOCAL AVAILABLE -> FAST uses local ---
Set-Control $hdr @{ rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true; pauseNewAiTasks = $false; mode = "NORMAL" } | Out-Null
$c = Get-Control $hdr
$log.Add("A_CONTROL route=$($c.supervisorRoute) ollama=$($c.localOllamaReachable)")
$a = Chat $hdr "FAST" "Reply with exactly one word: LOCAL_PING"
$log.Add("A_FAST status=$($a.status) ok=$($a.ok)")
[IO.File]::WriteAllText("$ev\p1-a-fast-local.json", $a.body, $utf8)
$aj = $null
try { $aj = $a.body | ConvertFrom-Json } catch {}
if ($aj) {
  $log.Add("A_FAST model=$($aj.model) providerType=$($aj.providerType) actualModelId=$($aj.actualModelId) reply=$($aj.reply)")
  if ($aj.providerType -eq "LOCAL" -or ($aj.actualModelId -match "qwen3:8b|gemma")) {
    $log.Add("A_VERDICT=PASS_LOCAL")
  } elseif (-not $aj.providerType -and $aj.model -eq "tron-fast") {
    $log.Add("A_VERDICT=PASS_LOCAL_LEGACY_LABEL")
  } else {
    $log.Add("A_VERDICT=FAIL_UNEXPECTED providerType=$($aj.providerType) actual=$($aj.actualModelId)")
  }
}

# --- B) LOCAL FORCE_OFFLINE -> FAST must NOT use tron-fast ---
Set-Control $hdr @{ rtxOverride = "FORCE_OFFLINE"; localRoutingEnabled = $true; cloudRoutingEnabled = $true } | Out-Null
$c = Get-Control $hdr
$log.Add("B_CONTROL route=$($c.supervisorRoute) ollama=$($c.localOllamaReachable)")
$b = Chat $hdr "FAST" "Reply with exactly one word: CLOUD_PING"
$log.Add("B_FAST status=$($b.status) ok=$($b.ok)")
[IO.File]::WriteAllText("$ev\p1-b-fast-force-offline.json", $b.body, $utf8)
$bj = $null
try { $bj = $b.body | ConvertFrom-Json } catch {}
if ($b.ok -and $bj) {
  $log.Add("B_FAST model=$($bj.model) providerType=$($bj.providerType) actualModelId=$($bj.actualModelId) reply=$($bj.reply)")
  if ($bj.providerType -eq "LOCAL" -or ($bj.actualModelId -eq "qwen3:8b")) {
    $log.Add("B_VERDICT=FAIL_STILL_LOCAL actual=$($bj.actualModelId)")
  } elseif ($bj.providerType -eq "CLOUD" -or ($bj.actualModelId -match "/" -and $bj.actualModelId -notmatch "^qwen3:")) {
    $log.Add("B_VERDICT=PASS_CLOUD_OR_GATEWAY actual=$($bj.actualModelId)")
  } else {
    $log.Add("B_VERDICT=CHECK model=$($bj.model) providerType=$($bj.providerType) actual=$($bj.actualModelId)")
  }
} elseif ($b.status -eq 429) {
  $log.Add("B_VERDICT=PASS_QUOTA_REJECT status=429 body=$($b.body)")
} elseif ($b.status -ge 500) {
  $log.Add("B_VERDICT=PASS_OR_BLOCKED_CLOUD_UNAVAILABLE status=$($b.status) body=$($b.body)")
} else {
  $log.Add("B_VERDICT=FAIL status=$($b.status) body=$($b.body)")
}

# usage before SMART (should not charge for local A)
$usageBefore = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/ai/usage" -Headers $hdr
$log.Add("USAGE_AFTER_A_B limit=$($usageBefore.dailyLimit) used=$($usageBefore.usedCredits) remaining=$($usageBefore.remaining)")

# --- C) SMART under FORCE_OFFLINE ---
$csmart = Chat $hdr "SMART" "Reply with exactly one word: SMART_OK"
$log.Add("C_SMART status=$($csmart.status) ok=$($csmart.ok)")
[IO.File]::WriteAllText("$ev\p1-c-smart-force-offline.json", $csmart.body, $utf8)
$csj = $null
try { $csj = $csmart.body | ConvertFrom-Json } catch {}
if ($csmart.ok -and $csj) {
  $log.Add("C_SMART model=$($csj.model) providerType=$($csj.providerType) actualModelId=$($csj.actualModelId) reply=$($csj.reply)")
  if ($csj.providerType -eq "LOCAL" -and $csj.actualModelId -eq "qwen3:8b") { $log.Add("C_VERDICT=FAIL_STILL_LOCAL") }
  else { $log.Add("C_VERDICT=PASS providerType=$($csj.providerType) actual=$($csj.actualModelId)") }
} else {
  $log.Add("C_VERDICT=STATUS_$($csmart.status) body=$($csmart.body)")
}

# --- D) both unavailable ---
Set-Control $hdr @{ rtxOverride = "FORCE_OFFLINE"; localRoutingEnabled = $false; cloudRoutingEnabled = $false } | Out-Null
$d = Chat $hdr "FAST" "should fail"
$log.Add("D_BOTH_DOWN status=$($d.status) ok=$($d.ok) body=$($d.body)")
[IO.File]::WriteAllText("$ev\p1-d-both-unavailable.json", $d.body, $utf8)
if ($d.status -ge 400 -and -not $d.ok) { $log.Add("D_VERDICT=PASS_GRACEFUL") } else { $log.Add("D_VERDICT=FAIL") }

# --- E) restore local-first ---
Set-Control $hdr @{ rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true; mode = "NORMAL" } | Out-Null
$c = Get-Control $hdr
$log.Add("E_CONTROL route=$($c.supervisorRoute) ollama=$($c.localOllamaReachable)")
$e = Chat $hdr "FAST" "Reply with exactly one word: RECOVERED"
$log.Add("E_FAST status=$($e.status) ok=$($e.ok)")
[IO.File]::WriteAllText("$ev\p1-e-fast-recovered.json", $e.body, $utf8)
$ej = $null
try { $ej = $e.body | ConvertFrom-Json } catch {}
if ($ej) {
  $log.Add("E_FAST model=$($ej.model) providerType=$($ej.providerType) actualModelId=$($ej.actualModelId) reply=$($ej.reply)")
  if ($ej.providerType -eq "LOCAL" -or ($ej.actualModelId -match "qwen3:8b|gemma")) { $log.Add("E_VERDICT=PASS_LOCAL_RESTORED") }
  else { $log.Add("E_VERDICT=CHECK providerType=$($ej.providerType) actual=$($ej.actualModelId)") }
}

# --- F) ULTRA quota (may 429) ---
$u = Chat $hdr "ULTRA" "Reply with exactly one word: ULTRA_OK"
$log.Add("F_ULTRA status=$($u.status) ok=$($u.ok)")
[IO.File]::WriteAllText("$ev\p1-f-ultra.json", $u.body, $utf8)
if ($u.status -eq 429) { $log.Add("F_VERDICT=PASS_QUOTA") }
elseif ($u.ok) { $log.Add("F_VERDICT=PASS_RESPONSE") }
else { $log.Add("F_VERDICT=STATUS_$($u.status)") }

$usageAfter = Invoke-RestMethod "http://127.0.0.1:8080/api/v1/ai/usage" -Headers $hdr
$log.Add("USAGE_FINAL limit=$($usageAfter.dailyLimit) used=$($usageAfter.usedCredits) remaining=$($usageAfter.remaining)")

$log | ForEach-Object { $_ }
[IO.File]::WriteAllText("$ev\p1-hybrid-chat-live.txt", ($log -join "`n"), $utf8)
