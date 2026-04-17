# schedule-prompts.ps1
# Schedules three Claude Code prompts to run back-to-back starting at 2:00 AM tonight.
#
# HOW IT WORKS:
# Claude Code's CLI accepts a prompt via --print or by piping stdin.
# We use a wrapper script that runs all three sequentially, stopping if any fails.
# Then we schedule that wrapper with Windows Task Scheduler.
#
# USAGE:
#   1. Save the three prompt .md files to your project root (or adjust paths below)
#   2. Run this script from your project root in PowerShell:
#      .\schedule-prompts.ps1
#   3. Go to sleep. Check results in the morning.
#   4. After reviewing, deploy: deploy("feat: image attribution + reorder")

# ─── Config ───────────────────────────────────────────────────
$ProjectDir    = Get-Location
$Prompt1       = Join-Path $ProjectDir "prompt-1-data-layer.md"
$Prompt2       = Join-Path $ProjectDir "prompt-2-siteform-ui.md"
$Prompt3       = Join-Path $ProjectDir "prompt-3-display-and-scrape.md"
$RunnerScript  = Join-Path $ProjectDir "run-prompts.ps1"
$LogFile       = Join-Path $ProjectDir "prompt-run.log"
$TaskName      = "OrbisDeiBatchPrompts"

# ─── Generate the runner script ───────────────────────────────
$runnerContent = @"
# Auto-generated runner — executes three Claude Code prompts sequentially.
# Each prompt runs with --yes (auto-accept) and logs output.
# Stops on first failure.

Set-Location "$ProjectDir"
`$ErrorActionPreference = "Stop"
`$logFile = "$LogFile"

function Run-Prompt {
    param([string]`$Name, [string]`$File)
    
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content `$logFile "`n`n=== `$Name started at `$timestamp ==="
    
    Write-Host "Running `$Name ..." -ForegroundColor Cyan
    
    try {
        # Read the prompt file and pipe to claude
        `$promptContent = Get-Content `$File -Raw
        `$result = `$promptContent | claude --yes 2>&1
        `$result | Out-String | Add-Content `$logFile
        
        if (`$LASTEXITCODE -ne 0) {
            Add-Content `$logFile "!!! `$Name FAILED with exit code `$LASTEXITCODE"
            Write-Host "`$Name FAILED" -ForegroundColor Red
            return `$false
        }
        
        `$timestamp2 = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content `$logFile "=== `$Name completed at `$timestamp2 ==="
        Write-Host "`$Name completed" -ForegroundColor Green
        return `$true
    }
    catch {
        Add-Content `$logFile "!!! `$Name EXCEPTION: `$_"
        Write-Host "`$Name EXCEPTION: `$_" -ForegroundColor Red
        return `$false
    }
}

# Clear log
Set-Content `$logFile "Batch prompt run started at `$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Run in sequence — stop on failure
if (-not (Run-Prompt "Prompt 1 (Data Layer)" "$Prompt1")) { exit 1 }
if (-not (Run-Prompt "Prompt 2 (SiteForm UI)" "$Prompt2")) { exit 1 }
if (-not (Run-Prompt "Prompt 3 (Display + Scrape)" "$Prompt3")) { exit 1 }

Add-Content `$logFile "`n`nAll three prompts completed successfully at `$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "`nAll prompts completed! Check prompt-run.log for details." -ForegroundColor Green
"@

Set-Content $RunnerScript $runnerContent -Encoding UTF8
Write-Host "Created runner script: $RunnerScript" -ForegroundColor Green

# ─── Schedule with Task Scheduler ─────────────────────────────
# Calculate next 2:00 AM
$now = Get-Date
$runAt = $now.Date.AddHours(2)
if ($runAt -le $now) {
    $runAt = $runAt.AddDays(1)  # If it's already past 2 AM, schedule for tomorrow
}

$formatted = $runAt.ToString("yyyy-MM-ddTHH:mm:ss")

# Remove existing task if present
schtasks /Delete /TN $TaskName /F 2>$null

# Create the scheduled task
schtasks /Create `
    /TN $TaskName `
    /TR "powershell.exe -ExecutionPolicy Bypass -File `"$RunnerScript`"" `
    /SC ONCE `
    /ST $runAt.ToString("HH:mm") `
    /SD $runAt.ToString("MM/dd/yyyy") `
    /F

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nScheduled '$TaskName' to run at $formatted" -ForegroundColor Cyan
    Write-Host "The three prompts will run back-to-back starting at 2:00 AM." -ForegroundColor Gray
    Write-Host "`nIn the morning:" -ForegroundColor Yellow
    Write-Host "  1. Check prompt-run.log for results" -ForegroundColor Gray
    Write-Host "  2. Run 'npm run dev' and test in browser" -ForegroundColor Gray
    Write-Host "  3. Deploy: deploy('feat: image attribution and reorder')" -ForegroundColor Gray
    Write-Host "`nTo cancel: schtasks /Delete /TN $TaskName /F" -ForegroundColor DarkGray
} else {
    Write-Host "Failed to create scheduled task. You can run manually instead:" -ForegroundColor Red
    Write-Host "  powershell -File `"$RunnerScript`"" -ForegroundColor Gray
}
