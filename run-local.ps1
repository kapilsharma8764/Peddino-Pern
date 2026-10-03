$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$storage = 'D:\david-task-main\.local-storage\elementor-builder'
New-Item -ItemType Directory -Force -Path "$storage\npm-cache", "$storage\npm-global", "$storage\temp", "$storage\playwright", "$PSScriptRoot\reports\local" | Out-Null
$env:npm_config_cache = "$storage\npm-cache"
$env:npm_config_prefix = "$storage\npm-global"
$env:TEMP = "$storage\temp"
$env:TMP = $env:TEMP
$env:PLAYWRIGHT_BROWSERS_PATH = "$storage\playwright"
$env:PORT = '8001'
$env:VITE_API_URL = 'http://localhost:8001'
$postgres = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($postgres -and $postgres.Status -ne 'Running') {
    try { Start-Service -Name $postgres.Name -ErrorAction Stop; Write-Host 'Started PostgreSQL service.' }
    catch { Write-Warning 'PostgreSQL service is stopped and could not be started. Start it from services.msc (needs admin).' }
}
$node = (Get-Command node.exe).Source
foreach ($service in @(
    @{ Port = 8001; Name = 'api'; Directory = "$PSScriptRoot\server"; Arguments = @('src/index.js') },
    @{ Port = 5200; Name = 'editor'; Directory = "$PSScriptRoot\client"; Arguments = @('node_modules/vite/bin/vite.js') }
)) {
    if (Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Port $($service.Port) already running; skipped $($service.Name)."
        continue
    }
    $process = Start-Process -FilePath $node -ArgumentList $service.Arguments -WorkingDirectory $service.Directory -WindowStyle Hidden -RedirectStandardOutput "$PSScriptRoot\reports\local\$($service.Name).log" -RedirectStandardError "$PSScriptRoot\reports\local\$($service.Name).error.log" -PassThru
    $process.Id | Set-Content -LiteralPath "$PSScriptRoot\reports\local\$($service.Name).pid"
    Write-Host "Started $($service.Name), PID $($process.Id)"
}
Write-Host 'Editor: http://localhost:5200'
Write-Host 'API: http://localhost:8001/api/health'
