# Test DPI-aware screenshot
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$primary = $screens | Where-Object { $_.Primary } | Select-Object -First 1

Write-Output "Logical: $($primary.Bounds.Width) x $($primary.Bounds.Height)"

# Try to get physical size from WMI
try {
    $monitor = Get-WmiObject Win32_DesktopMonitor | Select-Object -First 1
    $dpiX = $monitor.ScreenWidth
    Write-Output "WMI Physical: $dpiX"
} catch {
    Write-Output "WMI Failed - using registry"
}

# Alternative: Get DPI from registry
try {
    $dpi = (Get-ItemProperty 'HKCU:\Control Panel\Desktop' -ErrorAction SilentlyContinue).LogPixels
    if ($dpi) {
        $scale = $dpi / 96
        Write-Output "Registry DPI: $dpi, Scale: $scale"
    }
} catch {
    Write-Output "Registry failed"
}

# Try simple screenshot at 1920x1080
$outputPath = Join-Path $PSScriptRoot 'test-output.png'
try {
    $bmp = New-Object System.Drawing.Bitmap(1920, 1080)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen(0, 0, 0, 0, $primary.Bounds.Size)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Screenshot saved to $outputPath"

    $fileInfo = Get-Item $outputPath
    Write-Output "File size: $($fileInfo.Length) bytes"
} catch {
    Write-Output "Screenshot failed: $_"
}
