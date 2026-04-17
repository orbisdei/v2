# Import-CoordinateCandidates.ps1
# One-time script to ingest Google and OpenCage coordinates from geocode-comparison-report2.html
# into the coordinate_candidates table in Supabase.
#
# Prerequisites:
#   - NEXT_PUBLIC_SUPABASE_URL in .env.local
#   - SUPABASE_SERVICE_ROLE_KEY in .env.local
#   - geocode-comparison-report2.html in the same directory as this script
#
# Usage:
#   cd <script directory>
#   .\Import-CoordinateCandidates.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Load environment variables
# ---------------------------------------------------------------------------
$envPath = Join-Path $env:USERPROFILE "Documents\orbis-dei\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Error "Could not find .env.local at $envPath"
    exit 1
}

$supabaseUrl    = $null
$serviceRoleKey = $null

foreach ($line in Get-Content $envPath) {
    if ($line -match '^\s*#' -or $line.Trim() -eq '') { continue }
    $parts = $line -split '=', 2
    if ($parts.Count -ne 2) { continue }
    $k = $parts[0].Trim()
    $v = $parts[1].Trim().Trim('"').Trim("'")
    if ($k -eq 'NEXT_PUBLIC_SUPABASE_URL')  { $supabaseUrl    = $v }
    if ($k -eq 'SUPABASE_SERVICE_ROLE_KEY') { $serviceRoleKey = $v }
}

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Error "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    exit 1
}

$headers = @{
    "apikey"        = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

Write-Host "Connected to: $supabaseUrl" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 2. Parse the HTML report
# ---------------------------------------------------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath  = Join-Path $scriptDir "geocode-comparison-report2.html"
if (-not (Test-Path $htmlPath)) {
    Write-Error "Could not find geocode-comparison-report2.html at $htmlPath"
    exit 1
}

$html = Get-Content $htmlPath -Raw

$rows = [regex]::Matches($html, '(?s)<tr>\s*<td class="name">(.*?)</td>\s*<td class="query">(.*?)</td>\s*<td class="coords">(.*?)</td>\s*<td class="coords">(.*?)</td>.*?</tr>')

Write-Host "Found $($rows.Count) rows in HTML report." -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 3. Helper: decode HTML entities
# ---------------------------------------------------------------------------
function Decode-Html {
    param([string]$Text)
    $result = $Text
    $result = $result -replace '&#39;', "'"
    $result = $result -replace '&amp;',  ([char]38)
    $result = $result -replace '&lt;',   ([char]60)
    $result = $result -replace '&gt;',   ([char]62)
    return $result
}

# ---------------------------------------------------------------------------
# 4. Lookup site_id by name + municipality
# ---------------------------------------------------------------------------
function Get-SiteId {
    param(
        [string]$Name,
        [string]$Municipality
    )
    $encodedName         = [Uri]::EscapeDataString($Name)
    $encodedMunicipality = [Uri]::EscapeDataString($Municipality)
    $url = "$supabaseUrl/rest/v1/sites?select=id,name,municipality&name=eq.$encodedName&municipality=eq.$encodedMunicipality"
    try {
        $response = Invoke-WebRequest -Uri $url -Headers $headers -Method GET -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        if ($data.Count -eq 1) {
            return $data[0].id
        } elseif ($data.Count -gt 1) {
            Write-Warning "  Multiple matches for '$Name' / '$Municipality' - using first: $($data[0].id)"
            return $data[0].id
        } else {
            return $null
        }
    } catch {
        Write-Warning "  Lookup failed for '$Name': $_"
        return $null
    }
}

# ---------------------------------------------------------------------------
# 5. Helper: insert a coordinate_candidates row
# ---------------------------------------------------------------------------
function Insert-Candidate {
    param(
        [string]$SiteId,
        [string]$Source,
        [double]$Latitude,
        [double]$Longitude,
        [string]$Query
    )
    $inv  = [System.Globalization.CultureInfo]::InvariantCulture
    $latS = $Latitude.ToString('R', $inv)
    $lngS = $Longitude.ToString('R', $inv)
    $escapedQuery = $Query -replace '"', '\"'
    $rawObj = '{"source":"' + $Source + '","lat":' + $latS + ',"lng":' + $lngS + ',"query":"' + $escapedQuery + '"}'
    $body   = '{"site_id":"' + $SiteId + '","source":"' + $Source + '","latitude":' + $latS + ',"longitude":' + $lngS + ',"raw_response":' + $rawObj + ',"fetched_at":"' + (Get-Date -Format "o") + '"}'
    $url = "$supabaseUrl/rest/v1/coordinate_candidates"
    try {
        $response = Invoke-WebRequest -Uri $url -Headers $headers -Method POST -Body $body -UseBasicParsing
        return ($response.StatusCode -in 200, 201)
    } catch {
        Write-Warning "  Insert failed for $Source / $SiteId`: $_"
        return $false
    }
}


# ---------------------------------------------------------------------------
# 6. Process each row
# ---------------------------------------------------------------------------
$stats = @{ inserted = 0; skipped = 0; notFound = 0; googleSkipped = 0 }

foreach ($row in $rows) {
    $rawName     = $row.Groups[1].Value.Trim()
    $rawQuery    = $row.Groups[2].Value.Trim()
    $googleCoord = $row.Groups[3].Value.Trim()
    $ocCoord     = $row.Groups[4].Value.Trim()

    $siteName   = Decode-Html $rawName
    $queryParts = $rawQuery -split ', '
    $municipality = if ($queryParts.Count -ge 2) { $queryParts[-2].Trim() } else { "" }

    Write-Host ""
    Write-Host "Processing: $siteName ($municipality)" -ForegroundColor White

    $siteId = Get-SiteId -Name $siteName -Municipality $municipality

    if (-not $siteId) {
        Write-Warning "  NOT FOUND in Supabase: '$siteName' / '$municipality'"
        $stats.notFound++
        continue
    }

    Write-Host "  site_id: $siteId" -ForegroundColor DarkGray

    # Google
    if ($googleCoord -eq "ZERO_RESULTS") {
        Write-Host "  Google: ZERO_RESULTS - skipping" -ForegroundColor Yellow
        $stats.googleSkipped++
    } else {
        $gParts = $googleCoord -split ', '
        if ($gParts.Count -eq 2) {
            $gLat = [double]$gParts[0].Trim()
            $gLng = [double]$gParts[1].Trim()
            $ok = Insert-Candidate -SiteId $siteId -Source "google_places" -Latitude $gLat -Longitude $gLng -Query $rawQuery
            if ($ok) {
                Write-Host "  Google: inserted ($gLat, $gLng)" -ForegroundColor Green
                $stats.inserted++
            } else {
                $stats.skipped++
            }
        } else {
            Write-Warning "  Google: could not parse coords '$googleCoord'"
            $stats.skipped++
        }
    }

    # OpenCage
    $ocParts = $ocCoord -split ', '
    if ($ocParts.Count -eq 2) {
        $ocLat = [double]$ocParts[0].Trim()
        $ocLng = [double]$ocParts[1].Trim()
        $ok = Insert-Candidate -SiteId $siteId -Source "opencage" -Latitude $ocLat -Longitude $ocLng -Query $rawQuery
        if ($ok) {
            Write-Host "  OpenCage: inserted ($ocLat, $ocLng)" -ForegroundColor Green
            $stats.inserted++
        } else {
            $stats.skipped++
        }
    } else {
        Write-Warning "  OpenCage: could not parse coords '$ocCoord'"
        $stats.skipped++
    }
}

# ---------------------------------------------------------------------------
# 7. Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Inserted:        $($stats.inserted)"      -ForegroundColor Green
Write-Host "  Not found:       $($stats.notFound)"      -ForegroundColor Red
Write-Host "  Google skipped:  $($stats.googleSkipped)" -ForegroundColor Yellow
Write-Host "  Other skipped:   $($stats.skipped)"       -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
