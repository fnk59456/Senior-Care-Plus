# 查找并关闭占用 3002 端口的进程

Write-Host "🔍 正在查找占用端口 3002 的进程..." -ForegroundColor Yellow

# 查找占用端口的进程
$process = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "✅ 找到占用端口的进程: PID $process" -ForegroundColor Green

    # 获取进程信息
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "   进程名称: $($processInfo.ProcessName)" -ForegroundColor Cyan
        Write-Host "   进程路径: $($processInfo.Path)" -ForegroundColor Cyan
    }

    # 询问是否关闭
    $confirm = Read-Host "是否关闭此进程? (Y/N)"
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        Stop-Process -Id $process -Force
        Write-Host "✅ 进程已关闭" -ForegroundColor Green
    } else {
        Write-Host "❌ 操作已取消" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 未找到占用端口 3002 的进程" -ForegroundColor Red
    Write-Host "💡 可能端口已经被释放，或者需要管理员权限" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

