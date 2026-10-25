# Failure sims (non-destructive) + ~10 concurrent chat load
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v4_golden_evidence"
$utf8 = New-Object System.Text.UTF8Encoding $false
$log = New-Object System.Collections.Generic.List[string]
function Note([string]$m) { $log.Add($m); Write-Output $m }

$b = @{ email = "v4b.live.07fe0a94@example.com"; password = "V4bLive!Pass99" } | ConvertTo-Json
$admin = Invoke-RestMethod http://127.0.0.1:8080/api/v1/auth/login -Method POST -ContentType application/json -Body ([Text.Encoding]::UTF8.GetBytes($b))
$ah = @{ Authorization = "Bearer $($admin.accessToken)" }

function ChatFast([string]$msg) {
  $body = @{ messages = @(@{ role = "user"; content = $msg }); aiProfile = "FAST"; language = "en" } | ConvertTo-Json -Depth 5
  try {
    $r = Invoke-WebRequest http://127.0.0.1:8080/api/v1/chat -Method POST -Headers $ah -ContentType application/json `
      -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -TimeoutSec 90
    return @{ ok = $true; status = [int]$r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $code = 0; $raw = $_.Exception.Message
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
      try { $raw = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    return @{ ok = $false; status = $code; body = $raw }
  }
}

# Ensure AUTO normal
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ mode = "NORMAL"; rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true } | ConvertTo-Json))) | Out-Null

# TEST 1: Make Ollama unreachable (stop serve process) without stopping Spring
Note "T1_STOP_OLLAMA"
$ollamaProcs = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
$ollamaProcs | ForEach-Object { Note "T1_KILL pid=$($_.Id) name=$($_.ProcessName)"; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 3
# Force cloud preference while local down
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ rtxOverride = "FORCE_OFFLINE"; cloudRoutingEnabled = $true } | ConvertTo-Json))) | Out-Null
$t1 = ChatFast "Reply with exactly: CLOUD_WHILE_LOCAL_DOWN"
if ($t1.ok -and $t1.body.providerType -eq "CLOUD" -and $t1.body.reply) {
  Note "T1_VERDICT=PASS provider=$($t1.body.providerType) actual=$($t1.body.actualModelId) reply=$($t1.body.reply)"
} else {
  Note "T1_VERDICT=FAIL status=$($t1.status) body=$($t1.body)"
}
[IO.File]::WriteAllText("$ev\fail-t1-cloud.json", ($t1 | ConvertTo-Json -Depth 6), $utf8)

# TEST 2: Restore Ollama
Note "T2_START_OLLAMA"
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
$deadline = (Get-Date).AddSeconds(60)
$up = $false
while ((Get-Date) -lt $deadline) {
  try {
    $h = Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 2
    if ($h) { $up = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
Note "T2_OLLAMA_UP=$up"
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ rtxOverride = "AUTO"; localRoutingEnabled = $true; cloudRoutingEnabled = $true } | ConvertTo-Json))) | Out-Null
Start-Sleep -Seconds 2
$t2 = ChatFast "Reply with exactly: LOCAL_RECOVERED"
if ($t2.ok -and $t2.body.providerType -eq "LOCAL") {
  Note "T2_VERDICT=PASS provider=LOCAL actual=$($t2.body.actualModelId)"
} elseif ($t2.ok) {
  Note "T2_VERDICT=FAIL_UNEXPECTED provider=$($t2.body.providerType) actual=$($t2.body.actualModelId)"
} else {
  Note "T2_VERDICT=FAIL status=$($t2.status)"
}
[IO.File]::WriteAllText("$ev\fail-t2-recover.json", ($t2 | ConvertTo-Json -Depth 6), $utf8)

# TEST 3: Cloud unavailable — FORCE_OFFLINE + cloudRoutingEnabled false with local ok → should use local OR error
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ cloudRoutingEnabled = $false; localRoutingEnabled = $true; rtxOverride = "AUTO" } | ConvertTo-Json))) | Out-Null
$t3 = ChatFast "Reply with exactly: LOCAL_ONLY_OK"
if ($t3.ok -and $t3.body.providerType -eq "LOCAL") {
  Note "T3_VERDICT=PASS local-only while cloud disabled"
} else {
  Note "T3_VERDICT=FAIL status=$($t3.status) body=$($t3.body)"
}
# Also both off
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ cloudRoutingEnabled = $false; localRoutingEnabled = $false } | ConvertTo-Json))) | Out-Null
$t3b = ChatFast "should fail"
Note "T3B_BOTH_OFF status=$($t3b.status) ok=$($t3b.ok)"
if (-not $t3b.ok -and ($t3b.status -eq 503 -or $t3b.status -eq 429)) { Note "T3B_VERDICT=PASS" } else { Note "T3B_VERDICT=FAIL" }
Invoke-RestMethod http://127.0.0.1:8080/api/v1/admin/control -Method PUT -Headers $ah -ContentType application/json `
  -Body ([Text.Encoding]::UTF8.GetBytes((@{ cloudRoutingEnabled = $true; localRoutingEnabled = $true; rtxOverride = "AUTO"; mode = "NORMAL" } | ConvertTo-Json))) | Out-Null

# TEST 4: Ultra quota (already exhausted expected)
$ultraBody = @{ messages = @(@{ role = "user"; content = "hi" }); aiProfile = "ULTRA"; language = "en" } | ConvertTo-Json -Depth 5
try {
  Invoke-WebRequest http://127.0.0.1:8080/api/v1/chat -Method POST -Headers $ah -ContentType application/json `
    -Body ([Text.Encoding]::UTF8.GetBytes($ultraBody)) -UseBasicParsing -TimeoutSec 60 | Out-Null
  Note "T4_VERDICT=FAIL_UNEXPECTED_SUCCESS"
} catch {
  $code = [int]$_.Exception.Response.StatusCode
  Note "T4_ULTRA status=$code"
  if ($code -eq 429) { Note "T4_VERDICT=PASS" } else { Note "T4_VERDICT=FAIL" }
}

# TEST 5/6: Desktop agent disconnect/reconnect — soft check via device status
$devs = @(Invoke-RestMethod http://127.0.0.1:8080/api/v1/desktop-agents/devices -Headers $ah)
$online = @($devs | Where-Object { $_.status -eq "ONLINE" })
Note "T5_ONLINE_BEFORE=$($online.Count)"
# Do NOT kill headless if we can avoid — mark BLOCKED if only one agent and needed later
# Instead create OpenCode session requirement check after brief note
Note "T5_VERDICT=NOT_TESTED_PRESERVE_AGENT"
Note "T6_VERDICT=NOT_TESTED_PRESERVE_AGENT"

# TEST 8: Spring restart deferred to cold-start phase
Note "T8_VERDICT=DEFERRED_COLD_START"
Note "T9_VERDICT=NOT_TESTED_FRONTEND"
Note "T10_VERDICT=NOT_TESTED_NO_DB_OUTAGE_WITHOUT_BACKUP"

# LOAD: 10 concurrent FAST chats (local)
Note "LOAD_START"
$jobs = 1..10 | ForEach-Object {
  $i = $_
  Start-Job -ScriptBlock {
    param($token, $i)
    $ah = @{ Authorization = "Bearer $token" }
    $body = @{ messages = @(@{ role = "user"; content = "Reply with LOAD_$i" }); aiProfile = "FAST"; language = "en" } | ConvertTo-Json -Depth 5
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
      $r = Invoke-WebRequest http://127.0.0.1:8080/api/v1/chat -Method POST -Headers $ah -ContentType application/json `
        -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -TimeoutSec 120
      $sw.Stop()
      return "OK_$i status=$($r.StatusCode) ms=$($sw.ElapsedMilliseconds)"
    } catch {
      $sw.Stop()
      $code = 0
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      return "ERR_$i status=$code ms=$($sw.ElapsedMilliseconds)"
    }
  } -ArgumentList $admin.accessToken, $i
}
$results = $jobs | Wait-Job -Timeout 180 | Receive-Job
$jobs | Remove-Job -Force -ErrorAction SilentlyContinue
$results | ForEach-Object { Note "LOAD $_" }
$okCount = @($results | Where-Object { $_ -like "OK_*" }).Count
Note "LOAD_OK=$okCount/10"
Note "LOAD_VERDICT=$(if($okCount -ge 8){'PASS'}else{'FAIL'})"

[IO.File]::WriteAllText("$ev\failure-load.txt", ($log -join "`n"), $utf8)
Note "FAILURE_LOAD_DONE"
