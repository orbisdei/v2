# cleanup-orphaned-db-records.ps1
#
# Finds site_images rows (storage_type = 'local') whose R2 object no longer
# exists, then deletes those rows from Supabase.
#
# Also checks tags.image_url for broken R2 references and NULLs them.
#
# Prerequisites:
#   - .env.local in repo root with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# Run from repo root: .\scripts\cleanup-orphaned-db-records.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# -- Load env ----------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot '..\\.env.local'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key   = $matches[1].Trim().Trim('"').Trim("'")
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($key, $value)
        }
    }
}

$SUPABASE_URL     = $env:NEXT_PUBLIC_SUPABASE_URL
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

$rawImagesBase    = $env:NEXT_PUBLIC_IMAGES_BASE_URL
if (-not $rawImagesBase) { $rawImagesBase = 'https://images.orbisdei.org' }
$IMAGES_BASE_URL  = $rawImagesBase.TrimEnd('/')

if (-not $SUPABASE_URL -or -not $SERVICE_ROLE_KEY) {
    Write-Error "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    exit 1
}

$headers = @{
    'apikey'        = $SERVICE_ROLE_KEY
    'Authorization' = "Bearer $SERVICE_ROLE_KEY"
    'Content-Type'  = 'application/json'
}

# -- Helper: HEAD check against R2 ------------------------------------------

function Test-R2Url([string]$url) {
    try {
        $resp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction Stop
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

# -- 1. Fetch all site_images rows with storage_type = 'local' ---------------

Write-Host ""
Write-Host "[1/4] Fetching site_images (storage_type=local) from Supabase..." -ForegroundColor Cyan

$siUrl      = "$SUPABASE_URL/rest/v1/site_images?storage_type=eq.local&select=id,site_id,url"
$siteImages = Invoke-RestMethod -Uri $siUrl -Headers $headers -Method Get

Write-Host "      Found $($siteImages.Count) local site_images rows."

# -- 2. Check each URL against R2 --------------------------------------------

Write-Host ""
Write-Host "[2/4] Checking each URL against R2 (this may take a minute)..." -ForegroundColor Cyan

$orphaned = @()

foreach ($img in $siteImages) {
    $exists = Test-R2Url $img.url
    if (-not $exists) {
        Write-Host "  MISSING  [$($img.site_id)]  $($img.url)" -ForegroundColor Red
        $orphaned += $img
    } else {
        Write-Host "  ok       [$($img.site_id)]  $($img.url)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "      $($orphaned.Count) orphaned site_images row(s) found." -ForegroundColor Yellow

# -- 3. Fetch tags with R2 image_url -----------------------------------------

Write-Host ""
Write-Host "[3/4] Checking tags.image_url for broken R2 references..." -ForegroundColor Cyan

$tagsUrl    = "$SUPABASE_URL/rest/v1/tags?image_url=not.is.null&select=id,name,image_url"
$tags       = Invoke-RestMethod -Uri $tagsUrl -Headers $headers -Method Get
$r2Tags     = $tags | Where-Object { $_.image_url -like "$IMAGES_BASE_URL/*" }
$brokenTags = @()

foreach ($tag in $r2Tags) {
    $exists = Test-R2Url $tag.image_url
    if (-not $exists) {
        Write-Host "  MISSING  [tag: $($tag.id)]  $($tag.image_url)" -ForegroundColor Red
        $brokenTags += $tag
    } else {
        Write-Host "  ok       [tag: $($tag.id)]  $($tag.image_url)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "      $($brokenTags.Count) broken tag image_url(s) found." -ForegroundColor Yellow

# -- 4. Delete orphaned records ----------------------------------------------

if ($orphaned.Count -eq 0 -and $brokenTags.Count -eq 0) {
    Write-Host ""
    Write-Host "[4/4] Nothing to clean up. All DB records have corresponding R2 objects." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[4/4] Deleting orphaned records..." -ForegroundColor Cyan

$deletedImages = 0
foreach ($img in $orphaned) {
    $deleteUrl = "$SUPABASE_URL/rest/v1/site_images?id=eq.$($img.id)"
    Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete | Out-Null
    Write-Host "  DELETED site_images row $($img.id)  [$($img.site_id)]" -ForegroundColor Yellow
    $deletedImages++
}

$clearedTags = 0
foreach ($tag in $brokenTags) {
    $patchUrl  = "$SUPABASE_URL/rest/v1/tags?id=eq.$($tag.id)"
    $patchBody = '{"image_url":null}'
    Invoke-RestMethod -Uri $patchUrl -Headers $headers -Method Patch -Body $patchBody | Out-Null
    Write-Host "  CLEARED  tags.image_url for [$($tag.id)]" -ForegroundColor Yellow
    $clearedTags++
}

# -- Summary -----------------------------------------------------------------

Write-Host ""
Write-Host "-- Summary -------------------------------------------------" -ForegroundColor Cyan
Write-Host "  site_images rows deleted : $deletedImages"
Write-Host "  tag image_urls cleared   : $clearedTags"
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
