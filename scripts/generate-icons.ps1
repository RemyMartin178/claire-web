Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\somen\Desktop\glass-main\public\full ronded claire logo Fond blanc logo noir.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Make-Bitmap($sz) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()
    return $bmp
}

function Write-Ico($outputPath, $sizes) {
    $bitmaps = $sizes | ForEach-Object { Make-Bitmap $_ }

    # Encoder chaque bitmap en PNG dans un MemoryStream
    $pngStreams = $bitmaps | ForEach-Object {
        $ms = New-Object System.IO.MemoryStream
        $_.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $ms
    }

    $fs = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $w = New-Object System.IO.BinaryWriter($fs)

    # ICO Header
    $w.Write([UInt16]0)              # Reserved
    $w.Write([UInt16]1)              # Type = ICO
    $w.Write([UInt16]$sizes.Count)  # Number of images

    $dataOffset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]
        $d = if ($s -ge 256) { 0 } else { $s }
        $byteCount = [UInt32]$pngStreams[$i].Length
        $w.Write([byte]$d)            # Width (0 = 256)
        $w.Write([byte]$d)            # Height
        $w.Write([byte]0)             # Color palette count
        $w.Write([byte]0)             # Reserved
        $w.Write([UInt16]1)           # Color planes
        $w.Write([UInt16]32)          # Bits per pixel
        $w.Write($byteCount)          # Size of image data
        $w.Write([UInt32]$dataOffset) # Offset to image data
        $dataOffset += $byteCount
    }

    foreach ($ms in $pngStreams) {
        $w.Write($ms.ToArray())
        $ms.Dispose()
    }

    $w.Close()
    $fs.Close()
    foreach ($b in $bitmaps) { $b.Dispose() }
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)

# 1. build/icon.ico  (pour electron-builder)
Write-Ico "c:\Users\somen\Desktop\glass-main\build\icon.ico" $sizes
Write-Host "build/icon.ico genere!"

# 2. src/ui/assets/logo.ico  (pour l'app runtime)
Write-Ico "c:\Users\somen\Desktop\glass-main\src\ui\assets\logo.ico" $sizes
Write-Host "src/ui/assets/logo.ico genere!"

# 3. build/icon.png a 1024x1024 haute qualite
$bmp1024 = Make-Bitmap 1024
$bmp1024.Save("c:\Users\somen\Desktop\glass-main\build\icon.png")
$bmp1024.Dispose()
Write-Host "build/icon.png 1024x1024 genere!"

# 4. src/ui/assets/logo.png a 256x256
$bmp256 = Make-Bitmap 256
$bmp256.Save("c:\Users\somen\Desktop\glass-main\src\ui\assets\logo.png")
$bmp256.Dispose()
Write-Host "src/ui/assets/logo.png 256x256 genere!"

$src.Dispose()
Write-Host ""
Write-Host "Tous les fichiers icones ont ete regeneres avec succes!"
