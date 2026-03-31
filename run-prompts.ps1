# Auto-generated runner â€” executes three Claude Code prompts sequentially.
# Each prompt runs with --yes (auto-accept) and logs output.
# Stops on first failure.

Set-Location "C:\Users\User\Documents\orbis-dei"
$ErrorActionPreference = "Stop"
$logFile = "C:\Users\User\Documents\orbis-dei\prompt-run.log"

function Run-Prompt {
    param([string]$Name, [string]$File)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content $logFile "

=== $Name started at $timestamp ==="
    
    Write-Host "Running $Name ..." -ForegroundColor Cyan
    
    try {
        # Read the prompt file and pipe to claude
        $promptContent = Get-Content $File -Raw
        $result = $promptContent | claude --yes 2>&1
        $result | Out-String | Add-Content $logFile
        
        if ($LASTEXITCODE -ne 0) {
            Add-Content $logFile "!!! $Name FAILED with exit code $LASTEXITCODE"
            Write-Host "$Name FAILED" -ForegroundColor Red
            return $false
        }
        
        $timestamp2 = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content $logFile "=== $Name completed at $timestamp2 ==="
        Write-Host "$Name completed" -ForegroundColor Green
        return $true
    }
    catch {
        Add-Content $logFile "!!! $Name EXCEPTION: $_"
        Write-Host "$Name EXCEPTION: $_" -ForegroundColor Red
        return $false
    }
}

# Clear log
Set-Content $logFile "Batch prompt run started at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Run in sequence â€” stop on failure
if (-not (Run-Prompt "Prompt 1 (Data Layer)" "C:\Users\User\Documents\orbis-dei\prompt-1-data-layer.md")) { exit 1 }
if (-not (Run-Prompt "Prompt 2 (SiteForm UI)" "C:\Users\User\Documents\orbis-dei\prompt-2-siteform-ui.md")) { exit 1 }
if (-not (Run-Prompt "Prompt 3 (Display + Scrape)" "C:\Users\User\Documents\orbis-dei\prompt-3-display-and-scrape.md")) { exit 1 }

Add-Content $logFile "

All three prompts completed successfully at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "
All prompts completed! Check prompt-run.log for details." -ForegroundColor Green
