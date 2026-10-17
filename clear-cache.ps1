# 清除 Remix/Vite 缓存脚本
Write-Host "=== 清除 Remix 缓存 ===" -ForegroundColor Green

# 1. 清除 node_modules/.vite 缓存
Write-Host "`n清除 Vite 缓存..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force
    Write-Host "✅ Vite 缓存已清除" -ForegroundColor Green
} else {
    Write-Host "⚠️ Vite 缓存目录不存在" -ForegroundColor Gray
}

# 2. 清除 .cache 目录
Write-Host "`n清除 .cache 目录..." -ForegroundColor Yellow
if (Test-Path ".cache") {
    Remove-Item -Path ".cache" -Recurse -Force
    Write-Host "✅ .cache 目录已清除" -ForegroundColor Green
} else {
    Write-Host "⚠️ .cache 目录不存在" -ForegroundColor Gray
}

# 3. 清除 build 目录
Write-Host "`n清除 build 目录..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Path "build" -Recurse -Force
    Write-Host "✅ build 目录已清除" -ForegroundColor Green
} else {
    Write-Host "⚠️ build 目录不存在" -ForegroundColor Gray
}

Write-Host "`n=== 清除完成！ ===" -ForegroundColor Green
Write-Host "`n下一步：" -ForegroundColor Cyan
Write-Host "1. 重启开发服务器: npm run dev" -ForegroundColor White
Write-Host "2. 在浏览器中按 Ctrl+Shift+R 强制刷新" -ForegroundColor White
Write-Host "3. 或者使用无痕模式打开页面" -ForegroundColor White

