# TRON AI V2 — Final API E2E (local). Writes JSON results; never prints secrets.
$ErrorActionPreference = 'Continue'
$Base = 'http://127.0.0.1:8080'
$OutDir = Join-Path $PSScriptRoot '..\evidence\v2-final'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Results = [ordered]@{}
$cookieJar = Join-Path $env:TEMP "tron-v2-e2e-cookies.txt"
Remove-Item $cookieJar -ErrorAction SilentlyContinue

function Invoke-Json {
  param([string]$Method,[string]$Path,[hashtable]$Headers=@{},[object]$Body=$null,[switch]$SaveCookies,[switch]$UseCookies)
  $uri = "$Base$Path"
  $args = @('-s','-m','180','-w','<<<TRONHTTP:%{http_code}>>>','-X',$Method,$uri)
  if ($SaveCookies) { $args += @('-c',$cookieJar) }
  if ($UseCookies) { $args += @('-b',$cookieJar) }
  foreach ($k in $Headers.Keys) { $args += @('-H', ("{0}: {1}" -f $k, $Headers[$k])) }
  $tmpBody = $null
  if ($null -ne $Body) {
    $tmpBody = Join-Path $env:TEMP ("tron-e2e-body-" + [guid]::NewGuid().ToString() + ".json")
    ($Body | ConvertTo-Json -Depth 20 -Compress) | Set-Content -Path $tmpBody -Encoding UTF8
    $args += @('-H','Content-Type: application/json','--data-binary',"@$tmpBody")
  }
  $raw = & curl.exe @args 2>$null
  if ($tmpBody) { Remove-Item $tmpBody -ErrorAction SilentlyContinue }
  $code = 0
  $bodyText = "$raw"
  if ($bodyText -match '(?s)(.*)<<<TRONHTTP:(\d+)>>>\s*$') {
    $bodyText = $Matches[1]
    $code = [int]$Matches[2]
  }
  return @{ code = $code; body = $bodyText }
}

function Invoke-Binary {
  param([string]$Method,[string]$Path,[hashtable]$Headers=@{},[object]$Body=$null,[string]$OutFile,[switch]$UseCookies)
  $uri = "$Base$Path"
  $args = @('-s','-m','180','-w',"%{http_code}",'-o',$OutFile,'-X',$Method,$uri)
  if ($UseCookies) { $args += @('-b',$cookieJar) }
  foreach ($k in $Headers.Keys) { $args += @('-H', ("{0}: {1}" -f $k, $Headers[$k])) }
  $tmpBody = $null
  if ($null -ne $Body) {
    $tmpBody = Join-Path $env:TEMP ("tron-e2e-body-" + [guid]::NewGuid().ToString() + ".json")
    ($Body | ConvertTo-Json -Depth 20 -Compress) | Set-Content -Path $tmpBody -Encoding UTF8
    $args += @('-H','Content-Type: application/json','--data-binary',"@$tmpBody")
  }
  $code = (& curl.exe @args 2>$null).Trim()
  if ($tmpBody) { Remove-Item $tmpBody -ErrorAction SilentlyContinue }
  return [int]$code
}

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$email = "v2final+$stamp@tron.ai"
$pass = "V2Final!Test_$stamp"

# --- AUTH ---
$reg = Invoke-Json -Method POST -Path '/api/v1/auth/register' -SaveCookies -Body @{
  email=$email; password=$pass; displayName='V2 Final Tester'
}
$regOk = ($reg.code -eq 200 -or $reg.code -eq 201)
$access = $null; $expiresIn = $null
try {
  $rj = $reg.body | ConvertFrom-Json
  $access = $rj.accessToken
  $expiresIn = $rj.expiresIn
} catch {}
$Results.auth_register = @{ pass = $regOk; http = $reg.code; hasToken = [bool]$access; expiresIn = $expiresIn }

$me = Invoke-Json -Method GET -Path '/api/v1/auth/me' -Headers @{ Authorization = "Bearer $access" } -UseCookies
$Results.auth_me = @{ pass = ($me.code -eq 200); http = $me.code }

$logout = Invoke-Json -Method POST -Path '/api/v1/auth/logout' -UseCookies -Headers @{ Authorization = "Bearer $access" }
$Results.auth_logout = @{ pass = ($logout.code -eq 200); http = $logout.code }

$login = Invoke-Json -Method POST -Path '/api/v1/auth/login' -SaveCookies -Body @{ email=$email; password=$pass }
try { $lj = $login.body | ConvertFrom-Json; $access = $lj.accessToken; $expiresIn = $lj.expiresIn } catch {}
$Results.auth_login = @{ pass = ($login.code -eq 200 -and $access); http = $login.code; expiresIn = $expiresIn }

$refresh = Invoke-Json -Method POST -Path '/api/v1/auth/refresh' -UseCookies -SaveCookies
$refreshOk = $false
try {
  $rfj = $refresh.body | ConvertFrom-Json
  if ($rfj.accessToken) { $access = $rfj.accessToken; $refreshOk = $true }
} catch {}
$Results.auth_refresh = @{ pass = ($refresh.code -eq 200 -and $refreshOk); http = $refresh.code }

# login/logout cycle x3
$cyclesOk = $true
for ($i=1; $i -le 3; $i++) {
  $lo = Invoke-Json -Method POST -Path '/api/v1/auth/logout' -UseCookies -Headers @{ Authorization = "Bearer $access" }
  $li = Invoke-Json -Method POST -Path '/api/v1/auth/login' -SaveCookies -Body @{ email=$email; password=$pass }
  try { $access = ($li.body | ConvertFrom-Json).accessToken } catch { $access = $null }
  if ($lo.code -ne 200 -or $li.code -ne 200 -or -not $access) { $cyclesOk = $false; break }
}
$Results.auth_login_logout_cycles = @{ pass = $cyclesOk }

# expired refresh redirect simulation: logout then refresh should fail
Invoke-Json -Method POST -Path '/api/v1/auth/logout' -UseCookies -Headers @{ Authorization = "Bearer $access" } | Out-Null
$badRefresh = Invoke-Json -Method POST -Path '/api/v1/auth/refresh' -UseCookies
$Results.auth_expired_refresh_rejected = @{ pass = ($badRefresh.code -eq 401 -or $badRefresh.code -eq 403); http = $badRefresh.code }

# re-login for remaining tests
$login2 = Invoke-Json -Method POST -Path '/api/v1/auth/login' -SaveCookies -Body @{ email=$email; password=$pass }
try { $access = ($login2.body | ConvertFrom-Json).accessToken } catch { $access = $null }
$AuthH = @{ Authorization = "Bearer $access" }

function Run-Interview {
  param([string]$Lang,[string[]]$Answers,[string]$Label)
  $start = Invoke-Json -Method POST -Path '/api/v1/interviews/start' -Headers $AuthH -UseCookies -Body @{
    language = $Lang
    questionCount = 3
    type = 'technical'
    difficulty = 'medium'
    companyName = 'TRON AI'
    jobPosition = if ($Lang -eq 'japanese') { 'ソフトウェアエンジニア' } else { 'Software Engineer' }
  }
  $id = $null; $q0 = $null
  try {
    $sj = $start.body | ConvertFrom-Json
    $id = $sj.interviewId
    if ($sj.transcript -and $sj.transcript.Count -gt 0) {
      $q0 = $sj.transcript[0].text
    }
    if (-not $q0 -and $sj.questions -and $sj.questions.Count -gt 0) {
      $q0 = if ($Lang -eq 'japanese') { $sj.questions[0].textJa } else { $sj.questions[0].textEn }
      if (-not $q0) { $q0 = $sj.questions[0].textJa; if (-not $q0) { $q0 = $sj.questions[0].textEn } }
    }
  } catch {}
  $turns = @()
  if ($q0) { $turns += @{ role='interviewer'; text="$q0" } }
  $idx = 0
  $finished = $false
  $questions = @()
  $actions = @()
  $qualities = @()
  if ($q0) { $questions += "$q0" }
  foreach ($ans in $Answers) {
    if (-not $id) { break }
    $turns += @{ role='candidate'; text=$ans }
    $ar = Invoke-Json -Method POST -Path "/api/v1/interviews/$id/answers" -Headers $AuthH -UseCookies -Body @{
      questionIndex = $idx
      answerText = $ans
    }
    $nq = $null; $done = $false; $quality = $null; $action = $null
    try {
      $aj = $ar.body | ConvertFrom-Json
      if ($aj.aiFollowUpMessage -and $aj.aiFollowUpMessage.text) { $nq = $aj.aiFollowUpMessage.text }
      $done = [bool]$aj.isFinished
      if ($aj.answerQuality) { $quality = "$($aj.answerQuality)"; $qualities += $quality }
      if ($aj.nextAction) { $action = "$($aj.nextAction)"; $actions += $action }
    } catch {}
    if ($nq) {
      $turns += @{ role='interviewer'; text="$nq"; nextAction=$action; answerQuality=$quality }
      $questions += "$nq"
    }
    $idx++
    if ($done -or $ar.code -ne 200) { $finished = $done; break }
    $finished = $done
  }
  # force finish if needed
  if ($id -and -not $finished) {
    $fin = Invoke-Json -Method POST -Path "/api/v1/interviews/$id/finish" -Headers $AuthH -UseCookies
    $finished = ($fin.code -eq 200)
  }
  $analysis = $null
  if ($id) {
    $an = Invoke-Json -Method GET -Path "/api/v1/interviews/$id/analysis" -Headers $AuthH -UseCookies
    try { $analysis = $an.body | ConvertFrom-Json } catch {}
    $detail = Invoke-Json -Method GET -Path "/api/v1/interviews/$id" -Headers $AuthH -UseCookies
    $restoreOk = ($detail.code -eq 200)
  } else { $restoreOk = $false }

  $pdfPath = Join-Path $OutDir ("report-$Label.pdf")
  $pdfCode = 0
  if ($id -and $finished) {
    $pdfCode = Invoke-Binary -Method GET -Path "/api/v1/interviews/$id/report.pdf" -Headers $AuthH -UseCookies -OutFile $pdfPath
  }
  $pdfOk = $false
  if ((Test-Path $pdfPath) -and ((Get-Item $pdfPath).Length -gt 200)) {
    $bytes = [IO.File]::ReadAllBytes($pdfPath)
    $pdfOk = ($bytes[0]-eq 0x25 -and $bytes[1]-eq 0x50 -and $bytes[2]-eq 0x44 -and $bytes[3]-eq 0x46)
  }

  # unauthorized PDF
  $unauthCode = Invoke-Binary -Method GET -Path "/api/v1/interviews/$id/report.pdf" -OutFile (Join-Path $OutDir "report-$Label-unauth.bin")
  $otherEmail = "other+$stamp@tron.ai"
  $otherPass = "Other!Test_$stamp"
  Invoke-Json -Method POST -Path '/api/v1/auth/register' -Body @{ email=$otherEmail; password=$otherPass; displayName='Other' } | Out-Null
  $otherLogin = Invoke-Json -Method POST -Path '/api/v1/auth/login' -Body @{ email=$otherEmail; password=$otherPass }
  $otherToken = $null
  try { $otherToken = ($otherLogin.body | ConvertFrom-Json).accessToken } catch {}
  $otherPdf = Invoke-Binary -Method GET -Path "/api/v1/interviews/$id/report.pdf" -Headers @{ Authorization = "Bearer $otherToken" } -OutFile (Join-Path $OutDir "report-$Label-other.bin")

  $uniqueQs = ($questions | Select-Object -Unique).Count
  $transcriptPath = Join-Path $OutDir ("transcript-$Label.json")
  @{ interviewId=$id; language=$Lang; turns=$turns; questions=$questions; actions=$actions; qualities=$qualities; analysis=$analysis; startBody=$start.body } |
    ConvertTo-Json -Depth 12 | Set-Content $transcriptPath -Encoding UTF8

  return [ordered]@{
    pass_start = ($start.code -eq 200 -and $id)
    start_http = $start.code
    interviewId = $id
    question_count = $questions.Count
    unique_questions = $uniqueQs
    no_generic_repeat = ($uniqueQs -ge [Math]::Min(2, $questions.Count))
    has_followups_or_actions = (($actions | Where-Object { $_ -and $_ -ne 'NEXT_TOPIC' }).Count -ge 0 -and $questions.Count -ge 2)
    actions = $actions
    qualities = $qualities
    finished = $finished
    analysis_present = ($null -ne $analysis)
    session_restore = $restoreOk
    pdf_http = $pdfCode
    pdf_valid = $pdfOk
    pdf_unauth_http = $unauthCode
    pdf_other_http = $otherPdf
    pdf_authz_ok = ($unauthCode -eq 401 -or $unauthCode -eq 403) -and ($otherPdf -eq 404 -or $otherPdf -eq 403)
    transcript = $transcriptPath
  }
}

$jpAnswers = @(
  '私は3年間JavaとSpring BootでREST APIを開発してきました。特に認証とバッチ処理に強みがあります。',
  'チームでは設計レビューを主導し、障害時は原因分析と再発防止まで担当しました。',
  '御社のプロダクトが実社会の課題を解決している点に共感し、技術で貢献したいです。'
)
$enAnswers = @(
  'I have three years of experience building Java and Spring Boot REST APIs, focusing on auth and batch jobs.',
  'I led design reviews and owned root-cause analysis plus prevention after production incidents.',
  'I want to contribute because your product solves real operational problems with practical AI.'
)

$Results.interview_ja = Run-Interview -Lang 'japanese' -Answers $jpAnswers -Label 'ja'
$Results.interview_en = Run-Interview -Lang 'english' -Answers $enAnswers -Label 'en'

# Voice TTS Algenib
$wavJa = Join-Path $OutDir 'algenib-ja.wav'
$wavEn = Join-Path $OutDir 'algenib-en.wav'
$ttsJa = Invoke-Binary -Method POST -Path '/demo/voice/speak' -Headers $AuthH -UseCookies -Body @{
  text = 'こんにちは。TRON AIの面接モードです。'
  language = 'ja'
} -OutFile $wavJa
$ttsEn = Invoke-Binary -Method POST -Path '/demo/voice/speak' -Headers $AuthH -UseCookies -Body @{
  text = 'Hello. This is TRON AI interview mode.'
  language = 'en'
} -OutFile $wavEn
$Results.voice_tts_ja = @{
  pass = ($ttsJa -eq 200 -and (Test-Path $wavJa) -and (Get-Item $wavJa).Length -gt 1000)
  http = $ttsJa
  bytes = if (Test-Path $wavJa) { (Get-Item $wavJa).Length } else { 0 }
}
$Results.voice_tts_en = @{
  pass = ($ttsEn -eq 200 -and (Test-Path $wavEn) -and (Get-Item $wavEn).Length -gt 1000)
  http = $ttsEn
  bytes = if (Test-Path $wavEn) { (Get-Item $wavEn).Length } else { 0 }
}

# Flyway V22 on local DB (read-only)
try {
  $mysql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
  if (-not (Test-Path $mysql)) { $mysql = 'mysql' }
  $q = "SELECT version, success FROM flyway_schema_history WHERE version='22'; SHOW COLUMNS FROM interview_sessions LIKE 'engine_state_json';"
  $out = & $mysql -h 127.0.0.1 -P 3306 -u tronai -ptronai_pass tron_ai -e $q 2>&1 | Out-String
  $Results.flyway_v22 = @{
    pass = ($out -match 'engine_state_json' -and $out -match '22')
    detail = ($out.Substring(0, [Math]::Min(400, $out.Length)))
  }
} catch {
  $Results.flyway_v22 = @{ pass = $false; detail = $_.Exception.Message }
}

# Isolated H2 migration verification is covered by Maven tests; note local MySQL result above.
$outFile = Join-Path $OutDir 'api-e2e-results.json'
($Results | ConvertTo-Json -Depth 12) | Set-Content $outFile -Encoding UTF8
Write-Host "WROTE $outFile"
$Results.GetEnumerator() | ForEach-Object {
  $v = $_.Value
  $p = if ($v -is [hashtable] -or $v -is [System.Collections.Specialized.OrderedDictionary]) {
    if ($v.Contains('pass')) { $v.pass } elseif ($v.Contains('pass_start')) { $v.pass_start -and $v.finished -and $v.pdf_valid } else { 'n/a' }
  } else { 'n/a' }
  Write-Host ("RESULT {0} => {1}" -f $_.Key, $p)
}
