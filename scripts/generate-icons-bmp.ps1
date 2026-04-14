Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\somen\Desktop\glass-main\public\full ronded claire logo Fond blanc logo noir.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function New-BitmapAtSize($sz) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
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

function Get-BmpBytes($bmp) {
    # Encode en BMP 32bpp sans en-tete de fichier (BITMAPINFOHEADER + pixels)
    $w = $bmp.Width
    $h = $bmp.Height
    # BITMAPINFOHEADER (40 bytes)
    $header = New-Object byte[] 40
    [BitConverter]::GetBytes([Int32]40).CopyTo($header, 0)    # biSize
    [BitConverter]::GetBytes([Int32]$w).CopyTo($header, 4)    # biWidth
    [BitConverter]::GetBytes([Int32]($h * 2)).CopyTo($header, 8) # biHeight (double car ICO inclut mask)
    [BitConverter]::GetBytes([Int16]1).CopyTo($header, 12)    # biPlanes
    [BitConverter]::GetBytes([Int16]32).CopyTo($header, 14)   # biBitCount
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 16)    # biCompression = BI_RGB
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 20)    # biSizeImage
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 24)    # biXPelsPerMeter
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 28)    # biYPelsPerMeter
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 32)    # biClrUsed
    [BitConverter]::GetBytes([Int32]0).CopyTo($header, 36)    # biClrImportant

    # Pixels (bottom-up, BGRA)
    $pixelBytes = New-Object byte[] ($w * $h * 4)
    for ($y = $h - 1; $y -ge 0; $y--) {
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            $idx = (($h - 1 - $y) * $w + $x) * 4
            $pixelBytes[$idx] = $pixel.B
            $pixelBytes[$idx + 1] = $pixel.G
            $pixelBytes[$idx + 2] = $pixel.R
            $pixelBytes[$idx + 3] = $pixel.A
        }
    }

    # AND mask (tout zeros = opaque) - 1 bit par pixel, aligne sur 4 bytes
    $rowBytes = [Math]::Ceiling($w / 32.0) * 4
    $maskBytes = New-Object byte[] ($rowBytes * $h)

    $result = New-Object byte[] ($header.Length + $pixelBytes.Length + $maskBytes.Length)
    $header.CopyTo($result, 0)
    $pixelBytes.CopyTo($result, $header.Length)
    $maskBytes.CopyTo($result, $header.Length + $pixelBytes.Length)
    return $result
}

function Write-IcoBmp($outputPath, $sizes) {
    $bitmaps = $sizes | ForEach-Object { New-BitmapAtSize $_ }
    $bmpDataList = $bitmaps | ForEach-Object { Get-BmpBytes $_ }

    $fs = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
    $w = New-Object System.IO.BinaryWriter($fs)

    # ICO Header
    $w.Write([UInt16]0)             # Reserved
    $w.Write([UInt16]1)             # Type = ICO
    $w.Write([UInt16]$sizes.Count) # Count

    $dataOffset = [UInt32](6 + 16 * $sizes.Count)
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i]
        $d = if ($s -ge 256) { 0 } else { $s }
        $byteCount = [UInt32]$bmpDataList[$i].Length
        $w.Write([byte]$d)
        $w.Write([byte]$d)
        $w.Write([byte]0)           # Color count
        $w.Write([byte]0)           # Reserved
        $w.Write([UInt16]1)         # Planes
        $w.Write([UInt16]32)        # Bits per pixel
        $w.Write($byteCount)
        $w.Write($dataOffset)
        $dataOffset += $byteCount
    }

    foreach ($data in $bmpDataList) {
        $w.Write($data)
    }

    $w.Close()
    $fs.Close()
    foreach ($b in $bitmaps) { $b.Dispose() }
    Write-Host "ICO BMP natif ecrit: $outputPath"
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)

Write-IcoBmp "c:\Users\somen\Desktop\glass-main\build\icon.ico" $sizes
Write-IcoBmp "c:\Users\somen\Desktop\glass-main\src\ui\assets\logo.ico" $sizes

$src.Dispose()
Write-Host "Termine!"
