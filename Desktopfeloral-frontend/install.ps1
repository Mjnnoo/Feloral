$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\MJN\Desktop\feloral\Desktopfeloral-frontend"
$Target = Join-Path $ProjectRoot "src\components\layout\site-header.tsx"
$PatchFile = Join-Path $PSScriptRoot "src\components\layout\site-header.tsx"
$BackupDir = Join-Path $ProjectRoot "_backup_before_header_restore"

if (!(Test-Path $ProjectRoot)) {
  Write-Host "Project root not found: $ProjectRoot" -ForegroundColor Red
  exit 1
}

if (!(Test-Path $PatchFile)) {
  Write-Host "Patch file not found: $PatchFile" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

if (Test-Path $Target) {
  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item $Target (Join-Path $BackupDir "site-header.$Stamp.tsx") -Force
}

Copy-Item $PatchFile $Target -Force

Write-Host "site-header.tsx restored successfully." -ForegroundColor Green
Write-Host "Backup saved in: $BackupDir" -ForegroundColor Yellow
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "cd $ProjectRoot" -ForegroundColor Cyan
Write-Host "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue" -ForegroundColor Cyan
Write-Host "npx next dev --webpack -p 3005" -ForegroundColor Cyan
