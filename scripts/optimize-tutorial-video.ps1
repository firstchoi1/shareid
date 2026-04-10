# 需要本机已安装 ffmpeg：https://ffmpeg.org/download.html
# 作用：压缩体积 + 将 moov 移到文件头（-movflags +faststart），浏览器可边下边播，首屏明显更快
# 用法：在仓库根目录执行：powershell -ExecutionPolicy Bypass -File scripts/optimize-tutorial-video.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\public\tutorial.mp4")) {
  Write-Error "未找到 public\tutorial.mp4"
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Error "未找到 ffmpeg，请先安装并加入 PATH（例如 winget install ffmpeg）"
}

$src = "$root\public\tutorial.mp4"
$tmp = "$root\public\tutorial.optimized.tmp.mp4"
$bak = "$root\public\tutorial.backup.mp4"

Copy-Item -LiteralPath $src -Destination $bak -Force
Write-Host "已备份 -> public\tutorial.backup.mp4"

# crf 越大体积越小（约 23~28）；限制高度 720 以减小体积
& ffmpeg -y -i $src `
  -c:v libx264 -crf 26 -preset medium `
  -vf "scale=-2:720" `
  -movflags +faststart `
  -c:a aac -b:a 96k `
  $tmp

if ($LASTEXITCODE -ne 0) { Write-Error "ffmpeg 失败" }

Move-Item -LiteralPath $tmp -Destination $src -Force
Write-Host "完成：已覆盖 public\tutorial.mp4（原文件备份为 tutorial.backup.mp4）"
