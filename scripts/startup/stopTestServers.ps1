$testPorts = 5175, 5176, 3001, 8001
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $testPorts } |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $listeners) {
  Write-Output 'No stale test services found.'
  exit 0
}

foreach ($processId in $listeners) {
  Write-Output "Stopping stale test service (PID $processId)."
  Stop-Process -Id $processId -Force -ErrorAction Stop
}
