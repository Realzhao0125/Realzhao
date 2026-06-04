$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

try {
  Invoke-WebRequest "http://127.0.0.1:4174" -UseBasicParsing -TimeoutSec 2 | Out-Null
} catch {
  $node = (Get-Command node.exe).Source
  Start-Process -FilePath $node -ArgumentList "server/index.js" -WorkingDirectory $root -WindowStyle Hidden
  Start-Sleep -Seconds 2
}

Start-Process "http://127.0.0.1:4174"
