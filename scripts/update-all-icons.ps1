Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\somen\Desktop\glass-main\public\full ronded claire logo Fond blanc logo noir.png"

# 1. Copier en 256x256 pour src/ui/assets/logo.png (notifications)
$dstPng = "c:\Users\somen\Desktop\glass-main\src\ui\assets\logo.png"
$size = 256
$src = [System.Drawing.Image]::FromFile($srcPath)
$dst = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($src, 0, 0, $size, $size)
$g.Dispose()
$dst.Save($dstPng)
$dst.Dispose()
Write-Host "logo.png (256x256) saved!"

# 2. Creer logo.ico avec plusieurs tailles (16,32,48,64,128,256)
$dstIco = "c:\Users\somen\Desktop\glass-main\src\ui\assets\logo.ico"
$sizes = @(16, 32, 48, 64, 128, 256)
$stream = New-Object System.IO.MemoryStream
$bitmaps = @()
foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $gr = [System.Drawing.Graphics]::FromImage($bmp)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.Clear([System.Drawing.Color]::White)
    $gr.DrawImage($src, 0, 0, $s, $s)
    $gr.Dispose()
    $bitmaps += $bmp
}

# Ecrire l'ICO manuellement
$icoStream = New-Object System.IO.FileStream($dstIco, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($icoStream)

# ICO header
$writer.Write([UInt16]0)      # Reserved
$writer.Write([UInt16]1)      # Type: ICO
$writer.Write([UInt16]$sizes.Count)  # Count

# Calculer l'offset: header(6) + directory(16 * count)
$offset = 6 + 16 * $sizes.Count
$pngStreams = @()

foreach ($b in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += $ms
}

foreach ($i in 0..($sizes.Count - 1)) {
    $s = $sizes[$i]
    $byteCount = $pngStreams[$i].Length
    $d = if ($s -ge 256) { 0 } else { $s }
    $writer.Write([byte]$d)         # Width
    $writer.Write([byte]$d)         # Height
    $writer.Write([byte]0)          # Color count
    $writer.Write([byte]0)          # Reserved
    $writer.Write([UInt16]1)        # Planes
    $writer.Write([UInt16]32)       # Bit count
    $writer.Write([UInt32]$byteCount)
    $writer.Write([UInt32]$offset)
    $offset += $byteCount
}

foreach ($ms in $pngStreams) {
    $writer.Write($ms.ToArray())
    $ms.Dispose()
}

$writer.Close()
$icoStream.Close()
foreach ($b in $bitmaps) { $b.Dispose() }
$src.Dispose()

Write-Host "logo.ico saved with sizes: $($sizes -join ', ')px!"
Write-Host "All icons updated successfully!"
