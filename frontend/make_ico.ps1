Add-Type -AssemblyName System.Drawing

$pngPath = "c:\Users\PC\Desktop\newCityFlow\CityFlow\frontend\public\logo.png"
$icoPath = "c:\Users\PC\Desktop\newCityFlow\CityFlow\frontend\public\logo.ico"

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# Header
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]1)

# Directory
# Assuming width/height are <= 256. If 256, write 0.
$img = [System.Drawing.Image]::FromFile($pngPath)
$w = $img.Width; if ($w -ge 256) { $w = 0 }
$h = $img.Height; if ($h -ge 256) { $h = 0 }
$img.Dispose()

$bw.Write([byte]$w)
$bw.Write([byte]$h)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([uint16]1)
$bw.Write([uint16]32)
$bw.Write([uint32]$pngBytes.Length)
$bw.Write([uint32]22)

# Data
$bw.Write($pngBytes)

$bw.Close()
$fs.Close()
Write-Host "Done"
