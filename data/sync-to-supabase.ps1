# ============================================================
# Orbis Dei — Sync Excel CSVs to Supabase (diff-only)
# 
# Usage: 
#   .\sync-to-supabase.ps1 -Table sites
#   .\sync-to-supabase.ps1 -Table tags
#   .\sync-to-supabase.ps1 -Table sites -DryRun
#
# Only rows that differ from live data are pushed.
# New rows (not in Supabase) are inserted.
# Rows in Supabase but not in CSV are left alone (no deletes).
# Ignores updated_at and created_at columns entirely.
# Translates 0/1 to false/true for the featured column.
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("sites", "tags")]
    [string]$Table,

    [switch]$DryRun
)

# --- Configuration ---
$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
$CsvFolder = "$env:USERPROFILE\Documents\orbis-dei\data"

# Columns to ignore (never compare or upload)
$IgnoreColumns = @("updated_at", "created_at")

# Try reading from .env.local if env vars not set
if (-not $SupabaseUrl -or -not $SupabaseKey) {
    $envFile = "$env:USERPROFILE\Documents\orbis-dei\.env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^NEXT_PUBLIC_SUPABASE_URL=(.+)$') { $SupabaseUrl = $matches[1] }
            if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=(.+)$') { $SupabaseKey = $matches[1] }
        }
    }
    if (-not $SupabaseUrl -or -not $SupabaseKey) {
        Write-Error "Supabase URL and Key not found. Set them as env vars or ensure .env.local exists."
        exit 1
    }
}

$CsvPath = Join-Path $CsvFolder "$Table.csv"
if (-not (Test-Path $CsvPath)) {
    Write-Error "CSV file not found: $CsvPath"
    exit 1
}

$UpsertHeaders = @{
    "apikey"        = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "resolution=merge-duplicates"
}

$FetchHeaders = @{
    "apikey"        = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
}

$primaryKeys = @{
    "sites" = "id"
    "tags"  = "id"
}
$pk = $primaryKeys[$Table]

# --- Step 1: Fetch live data from Supabase ---
Write-Host "Fetching live $Table data from Supabase..." -ForegroundColor Cyan

$liveData = @{}
$offset = 0
$pageSize = 1000

do {
    $url = "$SupabaseUrl/rest/v1/$Table`?select=*&offset=$offset&limit=$pageSize"
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $FetchHeaders
    
    foreach ($row in $response) {
        $id = $row.$pk
        if ($id) {
            $liveData[$id.ToString()] = $row
        }
    }
    
    $offset += $pageSize
} while ($response.Count -eq $pageSize)

Write-Host "  Fetched $($liveData.Count) live rows" -ForegroundColor Gray

# --- Step 2: Read CSV ---
$csvRows = Import-Csv -Path $CsvPath
Write-Host "  Found $($csvRows.Count) rows in CSV" -ForegroundColor Gray

# --- Step 3: Compare and collect differences ---
$toUpsert = @()
$newCount = 0
$changedCount = 0
$unchangedCount = 0

function Normalize-Value($val) {
    if ($null -eq $val) { return "" }
    $s = $val.ToString().Trim()
    if ($s -eq "True" -or $s -eq "TRUE" -or $s -eq "true") { return "true" }
    if ($s -eq "False" -or $s -eq "FALSE" -or $s -eq "false") { return "false" }
    if ($s -match '^\-?[\d]+\.[\d]+$') {
        return [double]::Parse($s).ToString()
    }
    return $s
}

foreach ($csvRow in $csvRows) {
    $body = @{}
    $csvRow.PSObject.Properties | ForEach-Object {
        # Skip ignored columns
        if ($_.Name -in $IgnoreColumns) { return }

        $val = $_.Value
        if ($val -ne "" -and $null -ne $val) {
            # Translate 0/1 to boolean for featured column
            if ($_.Name -eq "featured") {
                if ($val -eq "0") { $val = $false }
                elseif ($val -eq "1") { $val = $true }
                elseif ($val -eq "TRUE" -or $val -eq "true") { $val = $true }
                elseif ($val -eq "FALSE" -or $val -eq "false") { $val = $false }
            }
            elseif ($val -eq "TRUE" -or $val -eq "true") { $val = $true }
            elseif ($val -eq "FALSE" -or $val -eq "false") { $val = $false }
            elseif ($_.Name -in @("latitude", "longitude") -and $val -match '^\-?[\d\.]+$') {
                $val = [double]$val
            }
            $body[$_.Name] = $val
        }
    }

    $id = $body[$pk]
    if (-not $id) { continue }
    $idStr = $id.ToString()

    # Check if row exists in live data
    if (-not $liveData.ContainsKey($idStr)) {
        $toUpsert += $body
        $newCount++
        Write-Host "  NEW: $idStr" -ForegroundColor Green
        continue
    }

    # Compare each field (excluding ignored columns)
    $liveRow = $liveData[$idStr]
    $isDifferent = $false
    $changedFields = @()

    foreach ($key in $body.Keys) {
        if ($key -in $IgnoreColumns) { continue }

        $csvVal = Normalize-Value $body[$key]
        $liveVal = Normalize-Value $liveRow.$key
        
        if ($csvVal -ne $liveVal) {
            $isDifferent = $true
            $changedFields += "$key : '$liveVal' -> '$csvVal'"
        }
    }

    if ($isDifferent) {
        $toUpsert += $body
        $changedCount++
        Write-Host "  CHANGED: $idStr" -ForegroundColor Yellow
        foreach ($field in $changedFields) {
            Write-Host "    $field" -ForegroundColor DarkYellow
        }
    }
    else {
        $unchangedCount++
    }
}

# --- Step 4: Summary ---
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  New rows:       $newCount" -ForegroundColor Green
Write-Host "  Changed rows:   $changedCount" -ForegroundColor Yellow
Write-Host "  Unchanged rows: $unchangedCount" -ForegroundColor Gray
Write-Host "  Total to sync:  $($toUpsert.Count)" -ForegroundColor Cyan
Write-Host ""

if ($toUpsert.Count -eq 0) {
    Write-Host "Nothing to sync - everything is up to date!" -ForegroundColor Green
    exit 0
}

if ($DryRun) {
    Write-Host "[DRY RUN] No changes were pushed. Remove -DryRun to sync." -ForegroundColor Yellow
    exit 0
}

# --- Step 5: Push differences ---
Write-Host "Pushing $($toUpsert.Count) rows to Supabase..." -ForegroundColor Cyan

$successCount = 0
$errorCount = 0

foreach ($body in $toUpsert) {
    $id = $body[$pk]

    try {
        $url = "$SupabaseUrl/rest/v1/$Table"
        $jsonArray = ConvertTo-Json -InputObject @($body) -Depth 5 -Compress

        $response = Invoke-RestMethod `
            -Uri $url `
            -Method POST `
            -Headers $UpsertHeaders `
            -Body $jsonArray `
            -ContentType "application/json; charset=utf-8" `
            -ErrorAction Stop

        Write-Host "  Synced: $id" -ForegroundColor Green
        $successCount++
    }
    catch {
        $errBody = $_.ErrorDetails.Message
        Write-Host "  ERROR on $id : $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  DETAIL: $errBody" -ForegroundColor DarkRed
        $errorCount++
    }
}

Write-Host ""
Write-Host "Done! $successCount synced, $errorCount failed." -ForegroundColor Cyan