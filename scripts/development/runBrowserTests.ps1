param(
  [switch]$Headless
)

$ErrorActionPreference = 'Stop'
$services = @(
  @{ Name = 'user UI'; Port = 5175 },
  @{ Name = 'admin UI'; Port = 5176 },
  @{ Name = 'test API'; Port = 3001 },
  @{ Name = 'ML API'; Port = 8001 }
)

function Test-LocalPort([int]$Port) {
  try {
    return @(
      Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    ).Count -gt 0
  } catch {
    return $false
  }
}

foreach ($service in $services) {
  if (-not (Test-LocalPort -Port ([int]$service['Port']))) {
    throw "The $($service.Name) is unavailable on port $($service.Port). Start the isolated test stack in another terminal with 'npm run dev:test', wait for all four services to say ready, then run this command again."
  }
}

if (-not (Test-Path 'tests\.venv\Scripts\python.exe')) {
  throw "Browser-test Python environment is missing. Create it with: py -m venv tests\\.venv; tests\\.venv\\Scripts\\python.exe -m pip install -r tests\\requirements-test.txt"
}

New-Item -ItemType Directory -Force -Path 'output\testing\reports' | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$report = "output\testing\reports\selenium-report-$timestamp.html"
if ($Headless) {
  $env:SELENIUM_HEADLESS = '1'
} else {
  Remove-Item Env:SELENIUM_HEADLESS -ErrorAction SilentlyContinue
}

& 'tests\.venv\Scripts\python.exe' -m pytest tests\e2e\selenium -v --html=$report --self-contained-html
$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
  Write-Host "Browser-test report: $report"
}
exit $exitCode
