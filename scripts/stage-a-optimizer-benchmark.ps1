# Stage A — Prompt optimizer provider benchmark (one-shot HTTP, no agent execution)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$ev = Join-Path $root "_v5_stage_a_evidence"
New-Item -ItemType Directory -Force -Path $ev | Out-Null
$email = if ($env:TRON_V5_EMAIL) { $env:TRON_V5_EMAIL } else { "v4b.live.07fe0a94@example.com" }
$pass = if ($env:TRON_V5_PASSWORD) { $env:TRON_V5_PASSWORD } else { "V4bLive!Pass99" }
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
  -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($loginBody))
$hdr = @{ Authorization = "Bearer $($login.accessToken)" }

$prompts = @(
  @{ id="P01"; route="CODING"; text="make tomcat project in my folder" },
  @{ id="P02"; route="CODING"; text="react website please" },
  @{ id="P03"; route="CODING"; text="spring boot api for todos" },
  @{ id="P04"; route="CODING"; text="fix the build it broke" },
  @{ id="P05"; route="CODING"; text="add dark mode to existing site" },
  @{ id="P06"; route="CODING"; text="java 21 maven war jakarta servlets" },
  @{ id="P07"; route="CODING"; text="vite react app with router" },
  @{ id="P08"; route="AUTOMATION"; text="open example.com and screenshot" },
  @{ id="P09"; route="AUTOMATION"; text="go to wikipedia japan page get title" },
  @{ id="P10"; route="CODING"; text="create three file html css js landing" }
)

$lanes = @(
  @{ name="DEFAULT_SMART"; provider=$null },
  @{ name="GROQ"; provider="GROQ" },
  @{ name="GEMINI"; provider="GEMINI" },
  @{ name="OPENROUTER"; provider="OPENROUTER" }
)

$rows = New-Object System.Collections.Generic.List[object]
foreach ($lane in $lanes) {
  foreach ($p in $prompts) {
    $bodyObj = @{ goal = $p.text; route = $p.route }
    if ($lane.provider) { $bodyObj.providerOverride = $lane.provider }
    $body = $bodyObj | ConvertTo-Json
    $status = "FAIL"; $err = ""; $providerUsed = ""; $modelUsed = ""; $ms = 0; $chars = 0; $sample = ""
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
      $r = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/agent-engines/prompt-optimize" -Method POST `
        -Headers $hdr -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120
      $sw.Stop()
      $ms = [int]$r.latencyMs
      if (-not $ms) { $ms = $sw.ElapsedMilliseconds }
      $providerUsed = [string]$r.providerId
      $modelUsed = [string]$r.modelId
      $improved = [string]$r.improvedPrompt
      $chars = $improved.Length
      $sample = if ($improved.Length -gt 200) { $improved.Substring(0,200) } else { $improved }
      $intentTokens = @($p.text.ToLowerInvariant() -split '\s+' | Where-Object { $_.Length -gt 3 } | Select-Object -First 3)
      $hit = 0; foreach ($t in $intentTokens) { if ($improved.ToLowerInvariant().Contains($t)) { $hit++ } }
      $intentOk = if ($hit -ge 1) { "Y" } else { "N" }
      $status = if ($chars -gt 40 -and $intentOk -eq "Y") { "PASS" } else { "FAIL" }
    } catch {
      $sw.Stop(); $ms = $sw.ElapsedMilliseconds; $err = $_.Exception.Message
      if ($_.ErrorDetails.Message) { $err = $_.ErrorDetails.Message }
      $intentOk = "N"
    }
    $rows.Add([pscustomobject]@{
      lane=$lane.name; promptId=$p.id; route=$p.route; status=$status; ms=$ms;
      providerUsed=$providerUsed; modelUsed=$modelUsed; charsOut=$chars; intentOk=$intentOk; error=$err; sample=$sample
    })
    Write-Output ("BENCH {0} {1} {2} {3}ms {4}/{5}" -f $lane.name,$p.id,$status,$ms,$providerUsed,$modelUsed)
  }
}
$rows | Export-Csv (Join-Path $ev "optimizer-benchmark.csv") -NoTypeInformation -Encoding UTF8
$rows | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $ev "optimizer-benchmark.json") -Encoding UTF8
$summary = $rows | Group-Object lane | ForEach-Object {
  $pass = @($_.Group | Where-Object status -eq "PASS")
  [pscustomobject]@{
    lane=$_.Name; pass=$pass.Count; total=$_.Count;
    avgMs= if ($pass.Count) { [int](($pass | Measure-Object ms -Average).Average) } else { 0 }
  }
}
$summary | ConvertTo-Json | Set-Content (Join-Path $ev "optimizer-benchmark-summary.json") -Encoding UTF8
$summary | Format-Table -AutoSize
$best = $summary | Sort-Object @{e="pass";d=$true}, @{e="avgMs";d=$false} | Select-Object -First 1
"SELECTED_DEFAULT_LANE=$($best.lane) pass=$($best.pass)/$($best.total) avgMs=$($best.avgMs)"
