$devPorts = 5173, 5174, 3000, 8000
$listenerProcessIds = & "$env:SystemRoot\System32\netstat.exe" -ano |
  Select-String 'LISTENING' |
  ForEach-Object {
    $fields = $_.Line.Trim() -split '\s+'
    $port = [int]($fields[1] -split ':')[-1]
    if ($port -in $devPorts) { [int]$fields[-1] }
  } |
  Select-Object -Unique

if (-not $listenerProcessIds) {
  Write-Output 'No stale development services found.'
  exit 0
}

foreach ($listenerProcessId in $listenerProcessIds) {
  Write-Output "Stopping stale AarogyamCareAI development service (PID $listenerProcessId)."
  Stop-Process -Id $listenerProcessId -Force -ErrorAction Stop
}
