# ============================================================================
# Geocoding Accuracy Comparison Script
# Compares forward geocoding results from Google, OpenCage, and Nominatim
# Baseline: Google's forward geocode result
# Output: HTML report with color-coded distance bands
# ============================================================================

Add-Type -AssemblyName System.Web

# -- CONFIG -------------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
    Write-Host "Loaded .env.local"
}
else {
    Write-Host "WARNING: No .env.local found at $envFile - using existing env vars" -ForegroundColor Yellow
}

$SUPABASE_URL    = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_KEY    = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
$GOOGLE_API_KEY  = $env:GOOGLE_PLACES_API_KEY
$OPENCAGE_API_KEY = $env:OPENCAGE_API_KEY

$missing = @()
if (-not $SUPABASE_URL)     { $missing += "NEXT_PUBLIC_SUPABASE_URL" }
if (-not $SUPABASE_KEY)     { $missing += "NEXT_PUBLIC_SUPABASE_ANON_KEY" }
if (-not $GOOGLE_API_KEY)   { $missing += "GOOGLE_PLACES_API_KEY" }
if (-not $OPENCAGE_API_KEY) { $missing += "OPENCAGE_API_KEY" }

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing environment variables: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Add them to .env.local and re-run." -ForegroundColor Red
    exit 1
}

$OUTPUT_FILE = Join-Path $PSScriptRoot "geocode-comparison-report.html"

# -- HELPERS ------------------------------------------------------------------

function Haversine($lat1, $lon1, $lat2, $lon2) {
    $R = 6371000
    $dLat = ($lat2 - $lat1) * [Math]::PI / 180
    $dLon = ($lon2 - $lon1) * [Math]::PI / 180
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
         [Math]::Cos($lat1 * [Math]::PI / 180) * [Math]::Cos($lat2 * [Math]::PI / 180) *
         [Math]::Sin($dLon / 2) * [Math]::Sin($dLon / 2)
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    return $R * $c
}

function Format-Distance($meters) {
    if ($null -eq $meters) { return "N/A" }
    if ($meters -lt 1000) { return "{0:N0}m" -f $meters }
    return "{0:N1}km" -f ($meters / 1000)
}

function Get-DistanceClass($meters) {
    if ($null -eq $meters) { return "na" }
    if ($meters -lt 50)    { return "green" }
    if ($meters -lt 500)   { return "yellow" }
    if ($meters -lt 2000)  { return "orange" }
    return "red"
}

function Geocode-Google($query) {
    $encoded = [System.Uri]::EscapeDataString($query)
    $url = "https://maps.googleapis.com/maps/api/geocode/json?address=$encoded&key=$GOOGLE_API_KEY"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        if ($resp.status -eq "OK" -and $resp.results.Count -gt 0) {
            $loc = $resp.results[0].geometry.location
            return @{ lat = [double]$loc.lat; lng = [double]$loc.lng; status = "OK" }
        }
        return @{ lat = $null; lng = $null; status = $resp.status }
    }
    catch {
        return @{ lat = $null; lng = $null; status = "ERROR: $_" }
    }
}

function Geocode-OpenCage($query) {
    $encoded = [System.Uri]::EscapeDataString($query)
    $url = "https://api.opencagedata.com/geocode/v1/json?q=$encoded&key=$OPENCAGE_API_KEY&limit=1&no_annotations=1"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        if ($resp.results.Count -gt 0) {
            $geo = $resp.results[0].geometry
            return @{ lat = [double]$geo.lat; lng = [double]$geo.lng; status = "OK"; confidence = $resp.results[0].confidence }
        }
        return @{ lat = $null; lng = $null; status = "NO_RESULTS"; confidence = $null }
    }
    catch {
        return @{ lat = $null; lng = $null; status = "ERROR: $_"; confidence = $null }
    }
}

# function Geocode-Nominatim($query) {
    # $encoded = [System.Uri]::EscapeDataString($query)
    # $url = "https://nominatim.openstreetmap.org/search?q=$encoded&format=json&limit=1"
    # try {
        # $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10 -Headers @{
            # 'User-Agent' = 'OrbisDeI/1.0 (orbisdei.org)'
        # }
        # if ($resp.Count -gt 0) {
            # return @{ lat = [double]$resp[0].lat; lng = [double]$resp[0].lon; status = "OK" }
        # }
        # return @{ lat = $null; lng = $null; status = "NO_RESULTS" }
    # }
    # catch {
        # return @{ lat = $null; lng = $null; status = "ERROR: $_" }
    # }
# }

# -- FETCH SITES --------------------------------------------------------------

Write-Host "`nFetching sites from Supabase..." -ForegroundColor Cyan
$headers = @{
    'apikey'        = $SUPABASE_KEY
    'Authorization' = "Bearer $SUPABASE_KEY"
}
$sitesUrl = "$SUPABASE_URL/rest/v1/sites?select=id,name,municipality,country,latitude,longitude&order=name.asc"
$sitesResp = Invoke-RestMethod -Uri $sitesUrl -Headers $headers -Method Get
$sites = @($sitesResp)
Write-Host "Found $($sites.Count) sites" -ForegroundColor Green

if ($sites.Count -eq 0) {
    Write-Host "No sites found. Exiting." -ForegroundColor Red
    exit 1
}

# -- GEOCODE LOOP -------------------------------------------------------------

$results = @()
$i = 0

foreach ($site in $sites) {
    $i++
    $name = $site.name
    $municipality = $site.municipality
    $country = $site.country

    $queryParts = @($name)
    if ($municipality) { $queryParts += $municipality }
    if ($country) { $queryParts += $country }
    $query = $queryParts -join ", "

    Write-Host "[$i/$($sites.Count)] $query" -ForegroundColor White

    $google = Geocode-Google $query
    Start-Sleep -Milliseconds 100

    $opencage = Geocode-OpenCage $query
    Start-Sleep -Milliseconds 500

    # $nominatim = Geocode-Nominatim $query
    # Start-Sleep -Milliseconds 1100

    $ocDist = $null
    # $nomDist = $null

    if ($google.lat -and $opencage.lat) {
        $ocDist = Haversine $google.lat $google.lng $opencage.lat $opencage.lng
    }
    # if ($google.lat -and $nominatim.lat) {
        # $nomDist = Haversine $google.lat $google.lng $nominatim.lat $nominatim.lng
    # }

    $results += [PSCustomObject]@{
        SiteId          = $site.id
        Name            = $name
        Query           = $query
        GoogleLat       = $google.lat
        GoogleLng       = $google.lng
        GoogleStatus    = $google.status
        OpenCageLat     = $opencage.lat
        OpenCageLng     = $opencage.lng
        OpenCageStatus  = $opencage.status
        OpenCageConf    = $opencage.confidence
        # NominatimLat    = $nominatim.lat
        # NominatimLng    = $nominatim.lng
        # NominatimStatus = $nominatim.status
        OC_Distance     = $ocDist
        # Nom_Distance    = $nomDist
    }

    $ocLabel = if ($null -ne $ocDist) { Format-Distance $ocDist } else { "N/A" }
    # $nomLabel = if ($null -ne $nomDist) { Format-Distance $nomDist } else { "N/A" }
    Write-Host "  Google: $($google.status) | OpenCage: $ocLabel " -ForegroundColor Gray
}

# -- STATS --------------------------------------------------------------------

$ocDistances = @($results | Where-Object { $null -ne $_.OC_Distance } | ForEach-Object { $_.OC_Distance })
# $nomDistances = @($results | Where-Object { $null -ne $_.Nom_Distance } | ForEach-Object { $_.Nom_Distance })

function Get-Stats($distances, $total) {
    if ($distances.Count -eq 0) {
        return @{ Count=0; Avg="N/A"; Median="N/A"; Green=0; Yellow=0; Orange=0; Red=0; Failed=$total }
    }
    $sorted = $distances | Sort-Object
    $avg = ($sorted | Measure-Object -Average).Average
    $mid = [Math]::Floor($sorted.Count / 2)
    $median = if ($sorted.Count % 2 -eq 0) { ($sorted[$mid - 1] + $sorted[$mid]) / 2 } else { $sorted[$mid] }
    $green  = @($sorted | Where-Object { $_ -lt 50 }).Count
    $yellow = @($sorted | Where-Object { $_ -ge 50 -and $_ -lt 500 }).Count
    $orange = @($sorted | Where-Object { $_ -ge 500 -and $_ -lt 2000 }).Count
    $red    = @($sorted | Where-Object { $_ -ge 2000 }).Count
    return @{
        Count  = $sorted.Count
        Avg    = Format-Distance $avg
        Median = Format-Distance $median
        Green  = $green
        Yellow = $yellow
        Orange = $orange
        Red    = $red
        Failed = $total - $sorted.Count
    }
}

$ocStats  = Get-Stats $ocDistances $results.Count
# $nomStats = Get-Stats $nomDistances $results.Count

# -- BUILD HTML ---------------------------------------------------------------

# Single-quoted here-string for CSS (no variable expansion, no brace issues)
$css = @'
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
h1 { font-size: 22px; margin-bottom: 4px; color: #1e1e5f; }
.subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
.legend { display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px; }
.legend span { display: inline-flex; align-items: center; gap: 4px; }
.legend .swatch { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }
.swatch.green  { background: #dcfce7; border: 1px solid #22c55e; }
.swatch.yellow { background: #fef9c3; border: 1px solid #eab308; }
.swatch.orange { background: #ffedd5; border: 1px solid #f97316; }
.swatch.red    { background: #fecaca; border: 1px solid #ef4444; }
.summary { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.summary-card { background: white; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-width: 280px; }
.summary-card h3 { font-size: 15px; margin-bottom: 8px; color: #1e1e5f; }
.stat-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
.stat-label { color: #666; }
.stat-value { font-weight: 600; }
.band-bar { display: flex; height: 20px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
.band-bar div { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #333; }
.band-green  { background: #dcfce7; }
.band-yellow { background: #fef9c3; }
.band-orange { background: #ffedd5; }
.band-red    { background: #fecaca; }
.band-gray   { background: #e5e7eb; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 12px; }
th { background: #1e1e5f; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; position: sticky; top: 0; }
td { padding: 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
tr:hover { background: #f8f9ff; }
.name { font-weight: 600; max-width: 200px; }
.query { color: #888; max-width: 220px; font-size: 11px; }
.coords { font-family: 'SF Mono', 'Consolas', monospace; font-size: 11px; color: #555; white-space: nowrap; }
.conf { text-align: center; color: #888; }
.dist { font-weight: 700; text-align: center; border-radius: 4px; }
.dist.green  { background: #dcfce7; color: #166534; }
.dist.yellow { background: #fef9c3; color: #854d0e; }
.dist.orange { background: #ffedd5; color: #9a3412; }
.dist.red    { background: #fecaca; color: #991b1b; }
.dist.na     { background: #f3f4f6; color: #9ca3af; }
.footer { margin-top: 16px; font-size: 11px; color: #999; }
'@

# Build table rows
$sb = New-Object System.Text.StringBuilder

$sortedResults = $results | Sort-Object {
    if ($null -ne $_.OC_Distance) { $_.OC_Distance } else { 999999 }
} -Descending

foreach ($r in $sortedResults) {
    $ocClass      = Get-DistanceClass $r.OC_Distance
    # $nomClass     = Get-DistanceClass $r.Nom_Distance
    $ocDistLabel  = Format-Distance $r.OC_Distance
    # $nomDistLabel = Format-Distance $r.Nom_Distance
    $ocConfLabel  = if ($r.OpenCageConf) { "$($r.OpenCageConf)/10" } else { "-" }
    $googleLabel  = if ($r.GoogleLat) { "$($r.GoogleLat), $($r.GoogleLng)" } else { "$($r.GoogleStatus)" }
    $ocCoord      = if ($r.OpenCageLat) { "$($r.OpenCageLat), $($r.OpenCageLng)" } else { "$($r.OpenCageStatus)" }
    # $nomCoord     = if ($r.NominatimLat) { "$($r.NominatimLat), $($r.NominatimLng)" } else { "$($r.NominatimStatus)" }
    $safeName     = [System.Web.HttpUtility]::HtmlEncode($r.Name)
    $safeQuery    = [System.Web.HttpUtility]::HtmlEncode($r.Query)

    [void]$sb.AppendLine("    <tr>")
    [void]$sb.AppendLine("      <td class=`"name`">$safeName</td>")
    [void]$sb.AppendLine("      <td class=`"query`">$safeQuery</td>")
    [void]$sb.AppendLine("      <td class=`"coords`">$googleLabel</td>")
    [void]$sb.AppendLine("      <td class=`"coords`">$ocCoord</td>")
    [void]$sb.AppendLine("      <td class=`"dist $ocClass`">$ocDistLabel</td>")
    [void]$sb.AppendLine("      <td class=`"conf`">$ocConfLabel</td>")
    # [void]$sb.AppendLine("      <td class=`"coords`">$nomCoord</td>")
    # [void]$sb.AppendLine("      <td class=`"dist $nomClass`">$nomDistLabel</td>")
    [void]$sb.AppendLine("    </tr>")
}

$tableRows = $sb.ToString()

# Build summary cards
function Build-SummaryCard($label, $stats, $total) {
    $failedCell = ""
    if ($stats.Failed -gt 0) { $failedCell = "$($stats.Failed)" }
    $card  = "  <div class=`"summary-card`">`n"
    $card += "    <h3>$label</h3>`n"
    $card += "    <div class=`"stat-row`"><span class=`"stat-label`">Successful</span><span class=`"stat-value`">$($stats.Count) / $total</span></div>`n"
    $card += "    <div class=`"stat-row`"><span class=`"stat-label`">Average distance</span><span class=`"stat-value`">$($stats.Avg)</span></div>`n"
    $card += "    <div class=`"stat-row`"><span class=`"stat-label`">Median distance</span><span class=`"stat-value`">$($stats.Median)</span></div>`n"
    $card += "    <div class=`"band-bar`">`n"
    $card += "      <div class=`"band-green`" style=`"flex:$($stats.Green)`">$($stats.Green)</div>`n"
    $card += "      <div class=`"band-yellow`" style=`"flex:$($stats.Yellow)`">$($stats.Yellow)</div>`n"
    $card += "      <div class=`"band-orange`" style=`"flex:$($stats.Orange)`">$($stats.Orange)</div>`n"
    $card += "      <div class=`"band-red`" style=`"flex:$($stats.Red)`">$($stats.Red)</div>`n"
    $card += "      <div class=`"band-gray`" style=`"flex:$($stats.Failed)`">$failedCell</div>`n"
    $card += "    </div>`n"
    $card += "  </div>"
    return $card
}

$ocCard  = Build-SummaryCard "OpenCage" $ocStats $results.Count
# $nomCard = Build-SummaryCard "Nominatim" $nomStats $results.Count
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$siteCount = $results.Count

# Assemble final HTML via concatenation (no expandable here-strings with braces)
$html  = "<!DOCTYPE html>`n<html lang=`"en`">`n<head>`n"
$html += "<meta charset=`"UTF-8`">`n"
$html += "<meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">`n"
$html += "<title>Geocoding Accuracy Comparison - Orbis Dei</title>`n"
$html += "<style>`n$css`n</style>`n"
$html += "</head>`n<body>`n`n"
$html += "<h1>Geocoding Accuracy Comparison</h1>`n"
$html += "<p class=`"subtitle`">Forward geocoding: Google (baseline) vs OpenCage &bull; $siteCount sites &bull; $timestamp</p>`n`n"
$html += "<div class=`"legend`">`n"
$html += "  <span><span class=`"swatch green`"></span> &lt; 50m</span>`n"
$html += "  <span><span class=`"swatch yellow`"></span> 50-500m</span>`n"
$html += "  <span><span class=`"swatch orange`"></span> 500m-2km</span>`n"
$html += "  <span><span class=`"swatch red`"></span> &gt; 2km</span>`n"
$html += "</div>`n`n"
# $html += "<div class=`"summary`">`n$ocCard`n$nomCard`n</div>`n`n"
$html += "<table>`n  <thead>`n    <tr>`n"
$html += "      <th>Site</th>`n"
$html += "      <th>Query</th>`n"
$html += "      <th>Google (Baseline)</th>`n"
$html += "      <th>OpenCage Coords</th>`n"
$html += "      <th>OC Distance</th>`n"
$html += "      <th>OC Conf</th>`n"
# $html += "      <th>Nominatim Coords</th>`n"
# $html += "      <th>Nom Distance</th>`n"
$html += "    </tr>`n  </thead>`n  <tbody>`n"
$html += $tableRows
$html += "  </tbody>`n</table>`n`n"
$html += "<p class=`"footer`">`n"
$html += "  Distance = Haversine distance from Google's result (baseline). Sorted worst OpenCage distance first.<br>`n"
$html += "  Color bands: green &lt; 50m, yellow 50-500m, orange 500m-2km, red &gt; 2km, gray = failed/no result.`n"
$html += "</p>`n`n</body>`n</html>"

$html | Out-File -FilePath $OUTPUT_FILE -Encoding UTF8
Write-Host "`nReport saved to: $OUTPUT_FILE" -ForegroundColor Green
Write-Host "Open it in your browser to review results." -ForegroundColor Cyan

# Console summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Yellow
Write-Host "OpenCage:  avg=$($ocStats.Avg), median=$($ocStats.Median) | <50m: $($ocStats.Green) | 50-500m: $($ocStats.Yellow) | 500m-2km: $($ocStats.Orange) | >2km: $($ocStats.Red) | failed: $($ocStats.Failed)"
# Write-Host "Nominatim: avg=$($nomStats.Avg), median=$($nomStats.Median) | <50m: $($nomStats.Green) | 50-500m: $($nomStats.Yellow) | 500m-2km: $($nomStats.Orange) | >2km: $($nomStats.Red) | failed: $($nomStats.Failed)"