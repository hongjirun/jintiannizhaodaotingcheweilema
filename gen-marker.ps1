Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(80, 96)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$blue = [System.Drawing.Color]::FromArgb(255, 22, 119, 255)
$white = [System.Drawing.Color]::White
$lightBlue = [System.Drawing.Color]::FromArgb(180, 144, 200, 255)

$brushBlue = New-Object System.Drawing.SolidBrush($blue)
$brushWhite = New-Object System.Drawing.SolidBrush($white)
$brushLight = New-Object System.Drawing.SolidBrush($lightBlue)

# 圆形气泡
$g.FillEllipse($brushBlue, 4, 2, 72, 72)

# 底部尖角
$pts = New-Object 'System.Drawing.PointF[]' 3
$pts[0] = New-Object System.Drawing.PointF(27, 66)
$pts[1] = New-Object System.Drawing.PointF(53, 66)
$pts[2] = New-Object System.Drawing.PointF(40, 90)
$g.FillPolygon($brushBlue, $pts)

# 车身
$g.FillRectangle($brushWhite, 14, 34, 52, 20)

# 车顶
$g.FillRectangle($brushWhite, 21, 21, 38, 16)

# 挡风玻璃
$g.FillRectangle($brushLight, 23, 23, 34, 12)

# 左轮
$g.FillEllipse($brushBlue, 16, 50, 14, 14)
$g.FillEllipse($brushWhite, 20, 54, 6, 6)

# 右轮
$g.FillEllipse($brushBlue, 50, 50, 14, 14)
$g.FillEllipse($brushWhite, 54, 54, 6, 6)

$g.Dispose()

$outPath = "d:\开发软件AI\今天你找到停车位了吗\miniapp\static\marker.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Saved: $outPath"
