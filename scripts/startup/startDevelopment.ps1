$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $projectRoot

& (Join-Path $PSScriptRoot 'stopDevServers.ps1')

# Ensure Windows helpers required by npm/vite are reachable even when PowerShell
# was started from an environment with a restricted PATH.
$env:Path = "$env:SystemRoot\System32;$env:Path"
$concurrently = Join-Path $projectRoot 'node_modules\.bin\concurrently.cmd'
if (-not (Test-Path -LiteralPath $concurrently)) {
  throw 'Local dependencies are missing. Run npm install before npm run dev.'
}

& $concurrently --kill-others-on-fail --names 'USER,ADMIN,NODE,ML' `
  'npm.cmd run dev:frontend -- --port 5173 --strictPort' `
  'npm.cmd run dev:frontend -- --port 5174 --strictPort --mode admin' `
  'npm.cmd run server' `
  'npm.cmd run ml:server'

exit $LASTEXITCODE
