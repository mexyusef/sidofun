Add-Type -AssemblyName System.Drawing
$outputPath = Join-Path $PSScriptRoot 'test-output.png'
$bmp = [System.Drawing.Image]::FromFile($outputPath)
Write-Output "Actual image size: $($bmp.Width) x $($bmp.Height)"
$bmp.Dispose()
