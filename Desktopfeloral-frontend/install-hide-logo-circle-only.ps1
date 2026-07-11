$ErrorActionPreference = 'Stop'

$target = 'C:\Users\MJN\Desktop\feloral\Desktopfeloral-frontend'
$cssPath = Join-Path $target 'src\app\globals.css'

Write-Host 'Feloral hide logo circle only installer started...' -ForegroundColor Cyan

if (!(Test-Path $target)) {
  throw ('Target frontend folder not found: ' + $target)
}

if (!(Test-Path $cssPath)) {
  throw ('globals.css not found: ' + $cssPath)
}

foreach ($port in 3001,3005) {
  try {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host ('Stopped process on port ' + $port) -ForegroundColor Yellow
    }
  } catch {}
}

$css = Get-Content $cssPath -Raw -Encoding UTF8

$start = '/* FELORAL_HIDE_LOGO_CIRCLE_ONLY_START */'
$end = '/* FELORAL_HIDE_LOGO_CIRCLE_ONLY_END */'
$pattern = [regex]::Escape($start) + '[\s\S]*?' + [regex]::Escape($end)
$css = [regex]::Replace($css, $pattern, '')

$fix = @'
/* FELORAL_HIDE_LOGO_CIRCLE_ONLY_START */

/* فقط دایره/نشان کنار لوگوی وسط را حذف می‌کند؛ متن FELORAL دست‌نخورده می‌ماند. */
header a[href="/"] [class*="rounded-full"]:not([data-feloral-topbar-shipping-icon="true"]),
header a[href="/"] [class*="logo-circle"],
header a[href="/"] [class*="logo-badge"],
header a[href="/"] [class*="badge"],
header a[href="/"] [class*="emblem"],
[data-feloral-header-logo="center"] [class*="rounded-full"]:not([data-feloral-topbar-shipping-icon="true"]),
[data-feloral-header-logo="center"] [class*="logo-circle"],
[data-feloral-header-logo="center"] [class*="logo-badge"],
[data-feloral-header-logo="center"] [class*="badge"],
[data-feloral-header-logo="center"] [class*="emblem"] {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  visibility: hidden !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* اگر دایره با pseudo-element ساخته شده باشد، این هم حذفش می‌کند. */
header a[href="/"]::before,
header a[href="/"]::after,
[data-feloral-header-logo="center"]::before,
[data-feloral-header-logo="center"]::after {
  content: none !important;
  display: none !important;
}

/* رنگ لوگو را تغییر نمی‌دهیم؛ هر رنگی از قبل داشته همان را نگه می‌دارد. */
[data-feloral-logo-text="true"],
[data-feloral-header-logo="center"] [data-feloral-logo-text="true"] {
  color: inherit !important;
}

[data-feloral-logo-subtitle="true"],
[data-feloral-header-logo="center"] [data-feloral-logo-subtitle="true"] {
  color: inherit !important;
  opacity: .62 !important;
}

/* چینش متن لوگو وسط، بدون نشان دایره‌ای کنار آن */
[data-feloral-header-logo="center"] {
  display: inline-flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  gap: 4px !important;
}

/* FELORAL_HIDE_LOGO_CIRCLE_ONLY_END */
'@

$css = $css.TrimEnd() + "`r`n`r`n" + $fix.Trim() + "`r`n"
Set-Content $cssPath $css -Encoding UTF8

Write-Host 'OK: logo circle hide CSS installed' -ForegroundColor Green

Select-String -Path $cssPath -Pattern 'FELORAL_HIDE_LOGO_CIRCLE_ONLY_START|logo-circle|color: inherit' | ForEach-Object {
  Write-Host ($_.LineNumber.ToString() + ': ' + $_.Line.Trim()) -ForegroundColor Green
}

$nextDir = Join-Path $target '.next'
if (Test-Path $nextDir) {
  Remove-Item $nextDir -Recurse -Force
  Write-Host 'OK: .next cache removed' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Done. Now run:' -ForegroundColor Cyan
Write-Host ('cd ' + $target) -ForegroundColor White
Write-Host 'npx next dev --webpack -p 3005' -ForegroundColor White
