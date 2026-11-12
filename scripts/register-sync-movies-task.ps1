# Registers (or updates) the "SyncMovies" scheduled task that runs sync-movies-daily.mjs at every Windows logon.
# sync-movies-daily.mjs itself ensures the sync runs at most once per day.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\register-sync-movies-task.ps1
# Remove: Unregister-ScheduledTask -TaskName SyncMovies -Confirm:$false
$ErrorActionPreference = 'Stop'
$taskName = 'SyncMovies'
$projectRoot = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'sync-movies-daily.mjs'
$node = (Get-Command node.exe).Source
$user = "$env:USERDOMAIN\$env:USERNAME"

# conhost --headless runs node without showing a console window.
$action = New-ScheduledTaskAction -Execute 'conhost.exe' `
  -Argument "--headless `"$node`" `"$script`"" -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$trigger.Delay = 'PT1M'

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Description "Daily sync of now-playing movies from TMDB to Supabase ($projectRoot)." -Force |
  Out-Null

Write-Host "Scheduled task '$taskName' registered for $user (runs at logon, once per day)."
