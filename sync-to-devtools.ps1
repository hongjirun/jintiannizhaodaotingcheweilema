$source = "d:\开发软件AI\今天你找到停车位了吗\miniapp\unpackage\dist\dev\mp-weixin"
$dest   = "d:\开发软件AI\今天你找到停车位了吗\unpackage\dist\dev\miniprogram"

Write-Host "Auto-sync started. Press Ctrl+C to stop."
Write-Host "Source: $source"
Write-Host "Dest:   $dest"

Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Initial sync done"

$lastCheck = Get-Date

while ($true) {
    Start-Sleep -Seconds 2
    $latest = Get-ChildItem -Path $source -Recurse -File |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1

    if ($latest -and $latest.LastWriteTime -gt $lastCheck) {
        $lastCheck = Get-Date
        Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Synced"
    }
}
