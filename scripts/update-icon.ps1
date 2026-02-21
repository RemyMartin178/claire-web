Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\somen\Desktop\glass-main\public\full ronded claire logo Fond blanc logo noir.png"
$dstPath = "c:\Users\somen\Desktop\glass-main\build\icon.png"

$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source size: $($src.Width)x$($src.Height)"

$size = 1024
$dst = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Remplir le fond blanc
$g.Clear([System.Drawing.Color]::White)

# Dessiner l'image
$g.DrawImage($src, 0, 0, $size, $size)
$g.Dispose()

$dst.Save($dstPath)
$dst.Dispose()
$src.Dispose()

Write-Host "Logo saved to build/icon.png (1024x1024) - done!"
