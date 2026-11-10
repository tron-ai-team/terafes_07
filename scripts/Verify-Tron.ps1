# TRON AI — local functional verification (safe, evidence-based).
# Requires an already-running stack (START_TRON.cmd). Does not start/stop services.
# Writes evidence under .runtime/evidence/ — never prints secret values.

param(
    [string]$BaseUrl = "http://127.0.0.1:8080",
    [string]$FrontendUrl = "http://localhost:5174",
    [switch]$SkipAiChat,
    [switch]$SkipBrowser
)

$ErrorActionPreference = "Continue"
$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EvidenceDir = Join-Path $WorkspaceRoot ".runtime\evidence"
$Stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$RunDir = Join-Path $EvidenceDir "verify-$Stamp"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

$Results = New-Object System.Collections.Generic.List[object]

function Add-Result(
    [string]$Feature,
    [string]$Status,
    [string]$Level,
    [string]$Evidence,
    [string]$Severity = ""
) {
    $Results.Add([pscustomobject]@{
        Feature  = $Feature
        Status   = $Status
        Level    = $Level
        Evidence = $Evidence
        Severity = $Severity
    }) | Out-Null
    $color = switch ($Status) {
        "PASS" { "Green" }
        "PARTIAL" { "Yellow" }
        "FAIL" { "Red" }
        "BLOCKED" { "DarkYellow" }
        default { "Gray" }
    }
    Write-Host ("[{0,-10}] {1,-40} {2}" -f $Status, $Feature, $Evidence) -ForegroundColor $color
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$TimeoutSec = 60,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null
    )
    $params = @{
        Method      = $Method
        Uri         = $Url
        Headers     = $Headers
        TimeoutSec  = $TimeoutSec
        UseBasicParsing = $true
    }
    if ($Session) { $params.WebSession = $Session }
    if ($null -ne $Body) {
        $params.ContentType = "application/json; charset=utf-8"
        $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    try {
        $resp = Invoke-WebRequest @params
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch {}
        return @{ Ok = $true; StatusCode = [int]$resp.StatusCode; Content = $resp.Content; Json = $json; Headers = $resp.Headers; Cookies = $resp.Headers["Set-Cookie"] }
    } catch {
        $code = 0
        $content = ""
        if ($_.Exception.Response) {
            try {
                $code = [int]$_.Exception.Response.StatusCode
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
        }
        $json = $null
        try { $json = $content | ConvertFrom-Json } catch {}
        return @{ Ok = $false; StatusCode = $code; Content = $content; Json = $json; Error = $_.Exception.Message }
    }
}

function Test-HttpOk([string]$Url, [int]$TimeoutSec = 5) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     TRON AI LOCAL VERIFICATION         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Evidence: $RunDir"
Write-Host ""

# --- Infrastructure ---
$feOk = Test-HttpOk $FrontendUrl
if ($feOk) {
    Add-Result "Frontend HTTP" "PASS" "API_VERIFIED" "$FrontendUrl responded"
} else {
    Add-Result "Frontend HTTP" "FAIL" "API_VERIFIED" "$FrontendUrl not responding" "CRITICAL"
}

$health = Invoke-Json GET "$BaseUrl/actuator/health"
$health | ConvertTo-Json -Depth 8 | Out-File (Join-Path $RunDir "actuator-health.json") -Encoding utf8
if ($health.Ok -or ($health.Content -match '"status"\s*:\s*"UP"') -or ($health.Content -match '"db"')) {
    $dbUp = $health.Content -match '"db"[^}]*"status"\s*:\s*"UP"' -or $health.Content -match '"status"\s*:\s*"UP"'
    if ($dbUp -or $health.Ok) {
        Add-Result "Backend health" "PASS" "API_VERIFIED" "actuator/health reachable"
    } else {
        Add-Result "Backend health" "PARTIAL" "API_VERIFIED" "health returned but DB unclear"
    }
} else {
    Add-Result "Backend health" "FAIL" "API_VERIFIED" "actuator/health failed ($($health.StatusCode))" "CRITICAL"
}

$providersAuth = Invoke-Json GET "$BaseUrl/api/v1/auth/providers"
$providersAuth | ConvertTo-Json -Depth 6 | Out-File (Join-Path $RunDir "auth-providers.json") -Encoding utf8
if ($providersAuth.Ok -and $providersAuth.Content -match "password") {
    Add-Result "Auth providers bootstrap" "PASS" "API_VERIFIED" "password provider present"
} else {
    Add-Result "Auth providers bootstrap" "FAIL" "API_VERIFIED" "providers endpoint failed" "HIGH"
}

$gotenberg = Test-HttpOk "http://127.0.0.1:3000/health"
if ($gotenberg) {
    Add-Result "Gotenberg" "PASS" "API_VERIFIED" "http://127.0.0.1:3000/health"
} else {
    Add-Result "Gotenberg" "FAIL" "API_VERIFIED" "not reachable (CV PDF limited)" "MEDIUM"
}

$ollama = $false
$ollamaModels = @()
try {
    $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3
    $ollama = $true
    if ($tags.models) { $ollamaModels = @($tags.models | ForEach-Object { $_.name }) }
} catch {}
$ollamaModels | Out-File (Join-Path $RunDir "ollama-models.txt") -Encoding utf8
$hasQwen = $ollamaModels | Where-Object { $_ -eq "qwen3:8b" -or $_ -like "qwen3:8b*" }
$hasGemma = $ollamaModels | Where-Object { $_ -eq "gemma3:12b" -or $_ -like "gemma3:12b*" }
if ($ollama -and $hasQwen -and $hasGemma) {
    Add-Result "Ollama models" "PASS" "API_VERIFIED" "qwen3:8b + gemma3:12b listed"
} elseif ($ollama -and ($hasQwen -or $hasGemma)) {
    Add-Result "Ollama models" "PARTIAL" "API_VERIFIED" "API up; models=$($ollamaModels -join ',')"
} elseif ($ollama) {
    Add-Result "Ollama models" "PARTIAL" "API_VERIFIED" "API up; expected models missing"
} else {
    Add-Result "Ollama" "FAIL" "API_VERIFIED" "not reachable" "MEDIUM"
}

$vv = Test-HttpOk "http://127.0.0.1:50021/version"
if ($vv) { Add-Result "VOICEVOX" "PASS" "API_VERIFIED" "port 50021" }
else { Add-Result "VOICEVOX" "FAIL" "API_VERIFIED" "unavailable" "LOW" }

$stt = $false
try {
    $sttResp = Invoke-WebRequest -Uri "http://127.0.0.1:8091/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($sttResp.StatusCode -ge 200) { $stt = $true }
} catch {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $iar = $c.BeginConnect("127.0.0.1", 8091, $null, $null)
        $stt = $iar.AsyncWaitHandle.WaitOne(800, $false) -and $c.Connected
        $c.Close()
    } catch { $stt = $false }
}
if ($stt) { Add-Result "Whisper STT worker" "PASS" "API_VERIFIED" "port 8091 listening/healthy" }
else { Add-Result "Whisper STT worker" "FAIL" "API_VERIFIED" "unavailable" "LOW" }

# --- Auth flow ---
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$testEmail = "tron.verify.$Stamp@example.local"
$testPass = "TronVerify!${Stamp}Aa"
$reg = Invoke-Json POST "$BaseUrl/api/v1/auth/register" -Session $session -Body @{
    email       = $testEmail
    password    = $testPass
    displayName = "TRON Verify $Stamp"
}
$reg.Content | Out-File (Join-Path $RunDir "auth-register.json") -Encoding utf8
$accessToken = $null
if ($reg.Ok -and $reg.Json -and $reg.Json.accessToken) {
    $accessToken = [string]$reg.Json.accessToken
    Add-Result "Auth register" "PASS" "API_VERIFIED" "created test user"
} elseif ($reg.StatusCode -eq 409) {
    $login = Invoke-Json POST "$BaseUrl/api/v1/auth/login" -Session $session -Body @{
        email = $testEmail; password = $testPass
    }
    if ($login.Ok -and $login.Json.accessToken) {
        $accessToken = [string]$login.Json.accessToken
        Add-Result "Auth register" "PARTIAL" "API_VERIFIED" "user existed; login reused"
    } else {
        Add-Result "Auth register" "FAIL" "API_VERIFIED" "register failed ($($reg.StatusCode))" "CRITICAL"
    }
} else {
    Add-Result "Auth register" "FAIL" "API_VERIFIED" "register failed ($($reg.StatusCode)) $($reg.Error)" "CRITICAL"
}

if ($accessToken) {
    $authHeaders = @{ Authorization = "Bearer $accessToken" }
    $me = Invoke-Json GET "$BaseUrl/api/v1/auth/me" -Headers $authHeaders -Session $session
    $me.Content | Out-File (Join-Path $RunDir "auth-me.json") -Encoding utf8
    if ($me.Ok -and $me.Json.email) {
        Add-Result "Auth JWT /me" "PASS" "API_VERIFIED" "identity returned"
    } else {
        Add-Result "Auth JWT /me" "FAIL" "API_VERIFIED" "me failed ($($me.StatusCode))" "CRITICAL"
    }

    $refresh = Invoke-Json POST "$BaseUrl/api/v1/auth/refresh" -Session $session -Body @{}
    $refresh.Content | Out-File (Join-Path $RunDir "auth-refresh.json") -Encoding utf8
    if ($refresh.Ok -and $refresh.Json.accessToken) {
        $accessToken = [string]$refresh.Json.accessToken
        $authHeaders = @{ Authorization = "Bearer $accessToken" }
        Add-Result "Auth refresh" "PASS" "API_VERIFIED" "new access token issued"
    } else {
        Add-Result "Auth refresh" "FAIL" "API_VERIFIED" "refresh failed ($($refresh.StatusCode))" "HIGH"
    }

    $login2 = Invoke-Json POST "$BaseUrl/api/v1/auth/login" -Session $session -Body @{
        email = $testEmail; password = $testPass
    }
    if ($login2.Ok -and $login2.Json.accessToken) {
        $accessToken = [string]$login2.Json.accessToken
        $authHeaders = @{ Authorization = "Bearer $accessToken" }
        Add-Result "Auth login" "PASS" "API_VERIFIED" "password login OK"
    } else {
        Add-Result "Auth login" "FAIL" "API_VERIFIED" "login failed ($($login2.StatusCode))" "CRITICAL"
    }

    # AI providers (configured/status only — no secrets)
    $aiProv = Invoke-Json GET "$BaseUrl/api/v1/ai/providers" -Headers $authHeaders -Session $session
    $aiProv.Content | Out-File (Join-Path $RunDir "ai-providers.json") -Encoding utf8
    if ($aiProv.Ok) {
        Add-Result "AI Gateway providers" "PASS" "API_VERIFIED" "provider snapshots returned (no secrets)"
    } else {
        Add-Result "AI Gateway providers" "FAIL" "API_VERIFIED" "providers endpoint $($aiProv.StatusCode)" "HIGH"
    }

    # Career profile
    $profileGet = Invoke-Json GET "$BaseUrl/api/v1/career/profile" -Headers $authHeaders -Session $session
    $profileGet.Content | Out-File (Join-Path $RunDir "career-profile-get.json") -Encoding utf8
    $profilePut = Invoke-Json PUT "$BaseUrl/api/v1/career/profile" -Headers $authHeaders -Session $session -Body @{
        fullName     = "Verify Candidate"
        preferredName = "Verify"
        nationality  = "JP"
        targetRole   = "Software Engineer"
        summary      = "Automated verification profile $Stamp"
    }
    $profilePut.Content | Out-File (Join-Path $RunDir "career-profile-put.json") -Encoding utf8
    if ($profilePut.Ok -or $profilePut.StatusCode -eq 200) {
        Add-Result "Candidate Profile upsert" "PASS" "API_VERIFIED" "PUT profile accepted"
    } elseif ($profileGet.Ok) {
        Add-Result "Candidate Profile upsert" "PARTIAL" "API_VERIFIED" "GET ok; PUT status $($profilePut.StatusCode)"
    } else {
        Add-Result "Candidate Profile" "FAIL" "API_VERIFIED" "GET=$($profileGet.StatusCode) PUT=$($profilePut.StatusCode)" "HIGH"
    }

    # CV Builder draft
    $draft = Invoke-Json POST "$BaseUrl/api/v1/career/cv-builder/drafts" -Headers $authHeaders -Session $session -Body @{
        templateCode = "rirekisho_jp"
        title        = "Verify Draft $Stamp"
        language     = "ja"
    }
    $draft.Content | Out-File (Join-Path $RunDir "cv-draft-create.json") -Encoding utf8
    $draftId = $null
    if ($draft.Ok -and $draft.Json.id) {
        $draftId = $draft.Json.id
        Add-Result "CV Builder create draft" "PASS" "API_VERIFIED" "draft id=$draftId"
    } else {
        # try listing templates for diagnosis
        $tpl = Invoke-Json GET "$BaseUrl/api/v1/career/cv-builder/templates" -Headers $authHeaders -Session $session
        $tpl.Content | Out-File (Join-Path $RunDir "cv-templates.json") -Encoding utf8
        Add-Result "CV Builder create draft" "FAIL" "API_VERIFIED" "create failed ($($draft.StatusCode))" "HIGH"
    }

    if ($draftId) {
        # IMPORTANT: format is a query param (see CvBuilderController), not JSON body.
        $exportXlsx = Invoke-Json POST "$BaseUrl/api/v1/career/cv-builder/drafts/$draftId/export?format=xlsx" -Headers $authHeaders -Session $session -Body @{} -TimeoutSec 120
        $exportXlsx.Content | Out-File (Join-Path $RunDir "cv-export-xlsx.json") -Encoding utf8
        if ($exportXlsx.Ok -and $exportXlsx.Json.format -eq "XLSX" -and $exportXlsx.Json.documentId) {
            Add-Result "CV XLSX export" "PASS" "API_VERIFIED" "format=XLSX documentId present"
            $docId = [string]$exportXlsx.Json.documentId
            try {
                $dlPath = Join-Path $RunDir "cv-export.xlsx"
                Invoke-WebRequest -Uri "$BaseUrl/api/v1/career/cv-builder/documents/$docId/download" `
                    -Headers $authHeaders -OutFile $dlPath -TimeoutSec 60 -UseBasicParsing
                $bytes = (Get-Item $dlPath).Length
                if ($bytes -gt 1000) {
                    Add-Result "CV XLSX download" "PASS" "API_VERIFIED" "downloaded $bytes bytes"
                } else {
                    Add-Result "CV XLSX download" "FAIL" "API_VERIFIED" "file too small ($bytes bytes)" "HIGH"
                }
            } catch {
                Add-Result "CV XLSX download" "FAIL" "API_VERIFIED" $_.Exception.Message "HIGH"
            }
        } else {
            Add-Result "CV XLSX export" "FAIL" "API_VERIFIED" "export status $($exportXlsx.StatusCode) format=$($exportXlsx.Json.format)" "HIGH"
        }

        if ($gotenberg) {
            $exportPdf = Invoke-Json POST "$BaseUrl/api/v1/career/cv-builder/drafts/$draftId/export?format=pdf" -Headers $authHeaders -Session $session -Body @{} -TimeoutSec 180
            $exportPdf.Content | Out-File (Join-Path $RunDir "cv-export-pdf.json") -Encoding utf8
            if ($exportPdf.Ok -and $exportPdf.Json.format -eq "PDF" -and $exportPdf.Json.documentId) {
                try {
                    $pdfPath = Join-Path $RunDir "cv-export.pdf"
                    Invoke-WebRequest -Uri "$BaseUrl/api/v1/career/cv-builder/documents/$($exportPdf.Json.documentId)/download" `
                        -Headers $authHeaders -OutFile $pdfPath -TimeoutSec 60 -UseBasicParsing
                    $pdfBytes = [IO.File]::ReadAllBytes((Resolve-Path $pdfPath))
                    $magic = [Text.Encoding]::ASCII.GetString($pdfBytes[0..3])
                    if ($magic -eq "%PDF" -and $pdfBytes.Length -gt 1000) {
                        Add-Result "CV PDF export" "PASS" "API_VERIFIED" "valid PDF $(($pdfBytes.Length)) bytes via Gotenberg"
                    } else {
                        Add-Result "CV PDF export" "FAIL" "API_VERIFIED" "download not a PDF (magic=$magic len=$($pdfBytes.Length))" "HIGH"
                    }
                } catch {
                    Add-Result "CV PDF export" "FAIL" "API_VERIFIED" "PDF download failed: $($_.Exception.Message)" "HIGH"
                }
            } else {
                Add-Result "CV PDF export" "FAIL" "API_VERIFIED" "PDF export $($exportPdf.StatusCode) format=$($exportPdf.Json.format)" "MEDIUM"
            }
        } else {
            Add-Result "CV PDF export" "BLOCKED" "API_VERIFIED" "Gotenberg unavailable"
        }
    }

    # Job Finder — honest empty is OK; demo fixtures must not be claimed as live
    $jobs = Invoke-Json POST "$BaseUrl/api/v1/career/jobs/search" -Headers $authHeaders -Session $session -Body @{
        query    = "ソフトウェアエンジニア"
        location = "東京"
        sources  = @("mynavi", "careermap")
        limit    = 5
    } -TimeoutSec 90
    $jobs.Content | Out-File (Join-Path $RunDir "jobs-search.json") -Encoding utf8
    if ($jobs.Ok) {
        $count = 0
        if ($jobs.Json -is [System.Array]) { $count = $jobs.Json.Count }
        elseif ($jobs.Json.jobs) { $count = @($jobs.Json.jobs).Count }
        elseif ($jobs.Json.results) { $count = @($jobs.Json.results).Count }
        if ($count -gt 0) {
            Add-Result "Job Finder search" "PASS" "API_VERIFIED" "$count listing(s) returned (inspect sources)"
        } else {
            Add-Result "Job Finder search" "PARTIAL" "API_VERIFIED" "honest empty result [] — not live discovery PASS"
        }
    } else {
        Add-Result "Job Finder search" "FAIL" "API_VERIFIED" "search status $($jobs.StatusCode)" "MEDIUM"
    }

    # Company Advisor
    $company = Invoke-Json POST "$BaseUrl/api/v1/career/company-analyses" -Headers $authHeaders -Session $session -Body @{
        companyName = "SoftBank"
        websiteUrl  = "https://www.softbank.jp/"
        language    = "ja"
    } -TimeoutSec 180
    $company.Content | Out-File (Join-Path $RunDir "company-analysis.json") -Encoding utf8
    if ($company.Ok -and ($company.Content.Length -gt 80)) {
        Add-Result "Company Advisor" "PASS" "API_VERIFIED" "analysis response received"
    } elseif ($company.StatusCode -ge 400) {
        Add-Result "Company Advisor" "PARTIAL" "API_VERIFIED" "HTTP $($company.StatusCode) — research tools may be unconfigured"
    } else {
        Add-Result "Company Advisor" "FAIL" "API_VERIFIED" "unexpected response" "MEDIUM"
    }

    # Interview start
    $interview = Invoke-Json POST "$BaseUrl/api/v1/interviews/start" -Headers $authHeaders -Session $session -Body @{
        language      = "ja"
        interviewType = "general"
        difficulty    = "medium"
    } -TimeoutSec 120
    $interview.Content | Out-File (Join-Path $RunDir "interview-start.json") -Encoding utf8
    if ($interview.Ok -and ($interview.Content -match "question|interviewId|id")) {
        Add-Result "Interview start" "PASS" "API_VERIFIED" "session started"
    } else {
        Add-Result "Interview start" "FAIL" "API_VERIFIED" "start status $($interview.StatusCode)" "MEDIUM"
    }

    # Chat
    if (-not $SkipAiChat) {
        $chat = Invoke-Json POST "$BaseUrl/api/v1/chat" -Headers $authHeaders -Session $session -Body @{
            sessionId  = ""
            language   = "en"
            searchMode = "off"
            messages   = @(@{ role = "user"; content = "Reply with exactly: TRON_VERIFY_OK" })
        } -TimeoutSec 180
        # Redact potentially long reply but keep length + preview
        $preview = ""
        if ($chat.Json.reply) { $preview = ([string]$chat.Json.reply).Substring(0, [Math]::Min(200, ([string]$chat.Json.reply).Length)) }
        elseif ($chat.Json.message) { $preview = ([string]$chat.Json.message).Substring(0, [Math]::Min(200, ([string]$chat.Json.message).Length)) }
        elseif ($chat.Json.content) { $preview = ([string]$chat.Json.content).Substring(0, [Math]::Min(200, ([string]$chat.Json.content).Length)) }
        @{ status = $chat.StatusCode; ok = $chat.Ok; preview = $preview; rawLen = $chat.Content.Length } |
            ConvertTo-Json | Out-File (Join-Path $RunDir "chat-result.json") -Encoding utf8
        if ($chat.Ok -and $preview.Length -gt 0) {
            Add-Result "AI Chat reply" "PASS" "API_VERIFIED" "non-empty reply ($($preview.Length) chars preview)"
        } elseif ($chat.Ok) {
            Add-Result "AI Chat reply" "PARTIAL" "API_VERIFIED" "HTTP OK but empty reply body"
        } else {
            Add-Result "AI Chat reply" "FAIL" "API_VERIFIED" "chat status $($chat.StatusCode)" "HIGH"
        }

        $sessions = Invoke-Json GET "$BaseUrl/api/v1/chat/sessions" -Headers $authHeaders -Session $session
        $sessions.Content | Out-File (Join-Path $RunDir "chat-sessions.json") -Encoding utf8
        if ($sessions.Ok) {
            Add-Result "Chat session history" "PASS" "API_VERIFIED" "sessions list OK"
        } else {
            Add-Result "Chat session history" "FAIL" "API_VERIFIED" "sessions $($sessions.StatusCode)" "MEDIUM"
        }
    } else {
        Add-Result "AI Chat reply" "NOT_TESTED" "NOT_TESTED" "-SkipAiChat"
    }

    # Protected route without token
    $denied = Invoke-Json GET "$BaseUrl/api/v1/auth/me"
    if ($denied.StatusCode -eq 401 -or $denied.StatusCode -eq 403) {
        Add-Result "Protected route denial" "PASS" "API_VERIFIED" "unauthenticated /me -> $($denied.StatusCode)"
    } else {
        Add-Result "Protected route denial" "FAIL" "API_VERIFIED" "expected 401/403 got $($denied.StatusCode)" "HIGH"
    }

    # Logout
    $logout = Invoke-Json POST "$BaseUrl/api/v1/auth/logout" -Headers $authHeaders -Session $session
    $logout.Content | Out-File (Join-Path $RunDir "auth-logout.json") -Encoding utf8
    if ($logout.Ok) {
        Add-Result "Auth logout" "PASS" "API_VERIFIED" "logout OK"
    } else {
        Add-Result "Auth logout" "FAIL" "API_VERIFIED" "logout $($logout.StatusCode)" "MEDIUM"
    }
} else {
    Add-Result "Auth-dependent features" "BLOCKED" "API_VERIFIED" "no access token — skipped career/AI/chat" "CRITICAL"
}

# --- Browser smoke (optional, Playwright helper if present) ---
if (-not $SkipBrowser) {
    $playwrightHelper = Join-Path $WorkspaceRoot "desktop-agent\playwright-helper"
    if (Test-Path (Join-Path $playwrightHelper "package.json")) {
        Add-Result "Browser E2E framework" "PARTIAL" "SOURCE_INSPECTED" "playwright-helper present; full E2E not auto-run here"
    } else {
        # Lightweight page fetch via HTTP (not full browser)
        $pages = @("/", "/auth", "/chat", "/career", "/career/profile", "/career/jobs", "/voice", "/workspace")
        $broken = @()
        foreach ($p in $pages) {
            try {
                $r = Invoke-WebRequest -Uri ($FrontendUrl.TrimEnd('/') + $p) -UseBasicParsing -TimeoutSec 10
                if ($r.StatusCode -ge 400) { $broken += "$p=>$($r.StatusCode)" }
            } catch {
                $broken += "$p=ERR"
            }
        }
        if ($broken.Count -eq 0) {
            Add-Result "Frontend route HTTP smoke" "PASS" "API_VERIFIED" "SPA routes returned HTTP OK (not JS-rendered)"
        } else {
            Add-Result "Frontend route HTTP smoke" "PARTIAL" "API_VERIFIED" "issues: $($broken -join ', ')"
        }
    }
}

# Mic / Desktop Agent — cannot fully automate safely
Add-Result "Voice mic capture E2E" "NOT_TESTED" "MANUAL_VERIFIED" "requires owner microphone interaction"
Add-Result "Desktop Agent destructive ops" "NOT_TESTED" "MANUAL_VERIFIED" "skipped by policy (safe local only)"

$summaryPath = Join-Path $RunDir "results.json"
$Results | ConvertTo-Json -Depth 4 | Out-File $summaryPath -Encoding utf8

$pass = @($Results | Where-Object Status -eq "PASS").Count
$partial = @($Results | Where-Object Status -eq "PARTIAL").Count
$fail = @($Results | Where-Object Status -eq "FAIL").Count
$blocked = @($Results | Where-Object Status -eq "BLOCKED").Count
$notTested = @($Results | Where-Object Status -eq "NOT_TESTED").Count

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PASS=$pass  PARTIAL=$partial  FAIL=$fail  BLOCKED=$blocked  NOT_TESTED=$notTested"
Write-Host "Evidence: $RunDir"
Write-Host "========================================" -ForegroundColor Cyan

# Also write a stable pointer for the report generator
@{
    stamp   = $Stamp
    runDir  = $RunDir
    pass    = $pass
    partial = $partial
    fail    = $fail
    blocked = $blocked
    notTested = $notTested
} | ConvertTo-Json | Out-File (Join-Path $EvidenceDir "latest.json") -Encoding utf8

if ($fail -gt 0) { exit 2 }
exit 0
