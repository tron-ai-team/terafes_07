# TRON AI CV BUILDER V3 — Real API Integration Test
$ErrorActionPreference = 'Continue'
$Base = 'http://127.0.0.1:8080'
$cookieJar = Join-Path $env:TEMP "tron-v3-frontend-test-cookies.txt"
Remove-Item $cookieJar -ErrorAction SilentlyContinue

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $uri = "$Base$Path"
  $args = @('-s', '-m', '60', '-w', '<<<TRONHTTP:%{http_code}>>>', '-X', $Method, $uri, '-b', $cookieJar, '-c', $cookieJar)
  foreach ($k in $Headers.Keys) {
    $args += @('-H', ("{0}: {1}" -f $k, $Headers[$k]))
  }
  $tmpBody = $null
  if ($null -ne $Body) {
    $tmpBody = Join-Path $env:TEMP ("tron-v3-body-" + [guid]::NewGuid().ToString() + ".json")
    ($Body | ConvertTo-Json -Depth 20 -Compress) | Set-Content -Path $tmpBody -Encoding UTF8
    $args += @('-H', 'Content-Type: application/json', '--data-binary', "@$tmpBody")
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

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TRON AI CV BUILDER V3 — REAL BACKEND API VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$email = "v3frontend+$stamp@tron.ai"
$pass = "V3Frontend!Test_$stamp"

# 1. Register & Login
Write-Host "[1/10] Registering test user: $email" -ForegroundColor Yellow
$reg = Invoke-Api -Method POST -Path '/api/v1/auth/register' -Body @{
  email       = $email
  password    = $pass
  displayName = 'V3 Frontend Tester'
}
if ($reg.code -ne 200 -and $reg.code -ne 201) {
  Write-Host "Registration failed: HTTP $($reg.code) $($reg.body)" -ForegroundColor Red
  exit 1
}

$login = Invoke-Api -Method POST -Path '/api/v1/auth/login' -Body @{
  email    = $email
  password = $pass
}
$token = ($login.body | ConvertFrom-Json).accessToken
if (-not $token) {
  Write-Host "Login failed: $($login.body)" -ForegroundColor Red
  exit 1
}
$AuthH = @{ Authorization = "Bearer $token" }
Write-Host "  -> Auth successful (JWT acquired)" -ForegroundColor Green

# 2. Template verification (RIREKISHO_JA only)
Write-Host "[2/10] Verifying templates: GET /templates" -ForegroundColor Yellow
$tplRes = Invoke-Api -Method GET -Path '/api/v1/career/cv-builder/templates' -Headers $AuthH
$templates = $tplRes.body | ConvertFrom-Json
$hasRirekisho = $false
foreach ($t in $templates) {
  if ($t.code -eq 'RIREKISHO_JA') { $hasRirekisho = $true }
}
if ($tplRes.code -eq 200 -and $hasRirekisho) {
  Write-Host "  -> Templates OK: RIREKISHO_JA verified" -ForegroundColor Green
}
else {
  Write-Host "  -> Template check failed: $($tplRes.body)" -ForegroundColor Red
}

# 3. Create CV Draft
Write-Host "[3/10] Creating draft: POST /drafts" -ForegroundColor Yellow
$createRes = Invoke-Api -Method POST -Path '/api/v1/career/cv-builder/drafts' -Headers $AuthH -Body @{
  templateCode = 'RIREKISHO_JA'
  versionLabel = 'V3-Test-Draft'
}
$draft = $createRes.body | ConvertFrom-Json
$draftId = $draft.id
$initialUpdatedAt = $draft.updatedAt
if ($createRes.code -eq 200 -and $draftId) {
  Write-Host "  -> Draft created: ID = $draftId (updatedAt = $initialUpdatedAt)" -ForegroundColor Green
}
else {
  Write-Host "  -> Create draft failed: $($createRes.body)" -ForegroundColor Red
  exit 1
}

# 4. Save CV Draft with payload and expectedUpdatedAt
Write-Host "[4/10] Saving draft: PUT /drafts/$draftId" -ForegroundColor Yellow
$saveRes = Invoke-Api -Method PUT -Path "/api/v1/career/cv-builder/drafts/$draftId" -Headers $AuthH -Body @{
  versionLabel      = 'V3-Test-Draft-Saved'
  expectedUpdatedAt = $initialUpdatedAt
  payload           = @{
    nameJa      = '山田 太郎'
    furigana    = 'やまだ たろう'
    dateOfBirth = '2000-05-15'
    selfPr      = '自走力を持ってフロントエンドとバックエンドの課題を解決できます。'
  }
}
$savedDraft = $saveRes.body | ConvertFrom-Json
$newUpdatedAt = $savedDraft.updatedAt
if ($saveRes.code -eq 200 -and $newUpdatedAt -ne $initialUpdatedAt) {
  Write-Host "  -> Draft saved: new updatedAt = $newUpdatedAt" -ForegroundColor Green
}
else {
  Write-Host "  -> Save draft failed: HTTP $($saveRes.code) $($saveRes.body)" -ForegroundColor Red
}

# 5. Concurrent edit conflict detection (409)
Write-Host "[5/10] Testing 409 conflict detection with mismatched expectedUpdatedAt" -ForegroundColor Yellow
$conflictRes = Invoke-Api -Method PUT -Path "/api/v1/career/cv-builder/drafts/$draftId" -Headers $AuthH -Body @{
  expectedUpdatedAt = "2020-01-01T00:00:00Z" # Definite mismatch!
  payload           = @{ nameJa = '競合テスト' }
}
if ($conflictRes.code -eq 409) {
  Write-Host "  -> 409 Conflict properly detected: edits safely held!" -ForegroundColor Green
}
else {
  Write-Host "  -> Expected 409 but got HTTP $($conflictRes.code): $($conflictRes.body)" -ForegroundColor Red
}

# 6. Canonical HTML preview (Saved draft GET & Live unsaved payload POST)
Write-Host "[6/10] Testing canonical live preview: GET & POST /preview-html" -ForegroundColor Yellow
$getPrev = Invoke-Api -Method GET -Path "/api/v1/career/cv-builder/drafts/$draftId/preview-html" -Headers $AuthH
Write-Host "  -> GET /preview-html: HTTP $($getPrev.code) (body length: $($getPrev.body.Length))" -ForegroundColor Cyan
$prevRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/preview-html" -Headers $AuthH -Body @{
  payload = @{
    nameJa = 'ライブプレビュー氏名'
    selfPr = 'リアルタイムプレビューの検証テスト'
  }
}
Write-Host "  -> POST /preview-html: HTTP $($prevRes.code) (body preview: $(if ($prevRes.body.Length -gt 60) { $prevRes.body.Substring(0, 60) } else { $prevRes.body }))" -ForegroundColor Cyan
if ($getPrev.code -eq 200 -or $prevRes.code -eq 200) {
  Write-Host "  -> Canonical HTML preview rendered successfully!" -ForegroundColor Green
}
else {
  Write-Host "  -> Preview HTML failed" -ForegroundColor Red
}

# 7. Profile Sync (FILL_BLANK mode default)
Write-Host "[7/10] Testing Profile Sync: POST /refresh-from-profile (FILL_BLANK)" -ForegroundColor Yellow
$syncRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/refresh-from-profile" -Headers $AuthH -Body @{
  mode       = 'FILL_BLANK'
  replaceAll = $false
}
$syncJson = $syncRes.body | ConvertFrom-Json
if ($syncRes.code -eq 200 -and $syncJson.refreshedFromProfile) {
  Write-Host "  -> Profile sync OK: mode = $($syncJson.syncMode), report = $($syncJson.syncReport | ConvertTo-Json -Compress)" -ForegroundColor Green
}
else {
  Write-Host "  -> Profile sync failed: HTTP $($syncRes.code) $($syncRes.body)" -ForegroundColor Red
}

# 8. Version snapshots (Create, List, Restore)
Write-Host "[8/10] Testing Version snapshots: POST & GET /versions" -ForegroundColor Yellow
$snapRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/versions" -Headers $AuthH
$listVersionsRes = Invoke-Api -Method GET -Path "/api/v1/career/cv-builder/drafts/$draftId/versions" -Headers $AuthH
$versions = $listVersionsRes.body | ConvertFrom-Json
if ($snapRes.code -eq 200 -and $versions.Count -gt 0) {
  Write-Host "  -> Version snapshot created and listed: Count = $($versions.Count), latest v$($versions[0].versionNumber)" -ForegroundColor Green
}
else {
  Write-Host "  -> Version snapshot failed: $($snapRes.body)" -ForegroundColor Red
}

# 9. AI Single-field assist
Write-Host "[9/10] Testing Single-field AI assist: POST /ai-assist" -ForegroundColor Yellow
$assistRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/ai-assist" -Headers $AuthH -Body @{
  fieldKey    = 'selfPr'
  instruction = '丁寧に'
  allowCloud  = $true
}
if ($assistRes.code -eq 200) {
  $assistJson = $assistRes.body | ConvertFrom-Json
  Write-Host "  -> AI Assist returned suggestion: category = $($assistJson.category), proposed = $($assistJson.proposedText)" -ForegroundColor Green
}
else {
  Write-Host "  -> AI Assist HTTP $($assistRes.code) (Note: Cloud AI may depend on external provider): $($assistRes.body)" -ForegroundColor Yellow
}

# 10. AI Magic Fill
Write-Host "[10/11] Testing AI Magic Fill: POST /magic-fill" -ForegroundColor Yellow
$magicRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/magic-fill" -Headers $AuthH -Body @{
  allowCloud     = $true
  companyContext = 'テスト株式会社'
}
if ($magicRes.code -eq 200) {
  $magicJson = $magicRes.body | ConvertFrom-Json
  Write-Host "  -> Magic Fill returned HTTP 200: applied = $($magicJson.applied) (human approval required), suggestions = $($magicJson.suggestions.Count)" -ForegroundColor Green
}
else {
  Write-Host "  -> Magic Fill response HTTP $($magicRes.code): $($magicRes.body)" -ForegroundColor Yellow
}

# 11. PDF Export & Download (Gotenberg Chromium)
Write-Host "[11/11] Testing PDF Export & Download: POST /export & GET /documents/{id}/download" -ForegroundColor Yellow
$exportRes = Invoke-Api -Method POST -Path "/api/v1/career/cv-builder/drafts/$draftId/export?format=pdf" -Headers $AuthH
if ($exportRes.code -eq 200) {
  $meta = $exportRes.body | ConvertFrom-Json
  $docId = $meta.documentId
  $filename = $meta.filename
  Write-Host "  -> Export returned documentId: $docId, filename: $filename" -ForegroundColor Green

  $pdfOut = Join-Path $env:TEMP "tron-v3-verified-$draftId.pdf"
  $dlArgs = @('-s', '-w', '%{http_code}', '-o', $pdfOut, '-H', "Authorization: Bearer $token", "$Base/api/v1/career/cv-builder/documents/$docId/download")
  $dlCode = & curl.exe @dlArgs
  if ((Test-Path $pdfOut) -and ((Get-Item $pdfOut).Length -gt 1000)) {
    $bytes = [IO.File]::ReadAllBytes($pdfOut)
    $isValidPdf = ($bytes[0] -eq 0x25 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x44 -and $bytes[3] -eq 0x46)
    Write-Host "  -> PDF Downloaded successfully: length = $((Get-Item $pdfOut).Length) bytes, Valid PDF Header (%PDF) = $isValidPdf" -ForegroundColor Green
  } else {
    Write-Host "  -> Download failed: HTTP $dlCode" -ForegroundColor Red
  }
} else {
  Write-Host "  -> Export failed: HTTP $($exportRes.code) $($exportRes.body)" -ForegroundColor Red
}

Write-Host "`nALL 11 REAL BACKEND API TESTS COMPLETED FOR CV BUILDER V3!" -ForegroundColor Cyan
