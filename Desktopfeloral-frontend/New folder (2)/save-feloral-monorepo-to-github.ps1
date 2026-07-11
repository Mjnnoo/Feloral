$ErrorActionPreference = "Stop"

$RootPath = "C:\Users\MJN\Desktop\feloral"
$RemoteUrl = "https://github.com/Mjnnoo/Feloral.git"
$CommitMessage = "save latest Feloral frontend and backend changes"

function Get-GitOutput {
  param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
  )

  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & git @Args 2>$null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $oldPreference

  if ($code -ne 0) {
    return ""
  }

  return ($output | Out-String).Trim()
}

function Ensure-GitIgnore {
  param([string]$RepoPath)

  $gitignore = Join-Path $RepoPath ".gitignore"

  $required = @(
    "# Feloral local/dev files",
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    ".turbo/",
    ".cache/",
    "coverage/",
    "*.log",
    ".env",
    ".env.*",
    "!.env.example",
    "!.env.sample",
    "tmp/",
    "temp/",
    ".DS_Store",
    "Thumbs.db"
  )

  if (!(Test-Path $gitignore)) {
    New-Item -ItemType File -Path $gitignore -Force | Out-Null
  }

  $current = Get-Content $gitignore -Raw -ErrorAction SilentlyContinue

  foreach ($line in $required) {
    if ($current -notmatch [regex]::Escape($line)) {
      Add-Content -Path $gitignore -Value $line
    }
  }
}

function Ensure-GitIdentity {
  $name = Get-GitOutput config user.name
  $email = Get-GitOutput config user.email

  if (!$name) {
    $name = Read-Host "Git user.name is empty. Enter your name"
    if ($name) {
      git config user.name "$name"
    }
  }

  if (!$email) {
    $email = Read-Host "Git user.email is empty. Enter your GitHub email"
    if ($email) {
      git config user.email "$email"
    }
  }
}

function Move-NestedGit {
  param([string]$ProjectPath)

  $nestedGit = Join-Path $ProjectPath ".git"

  if (Test-Path $nestedGit) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = Join-Path $ProjectPath ".git.backup-$stamp"

    Write-Host "Nested .git found in: $ProjectPath" -ForegroundColor Yellow
    Write-Host "Moving it to: $backup" -ForegroundColor Yellow

    Move-Item $nestedGit $backup -Force
  }
}

Write-Host ""
Write-Host "Feloral Monorepo GitHub Save Script" -ForegroundColor Green
Write-Host "Target GitHub repo: $RemoteUrl" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $RootPath)) {
  Write-Host "Root folder not found: $RootPath" -ForegroundColor Red
  exit 1
}

$FrontendPath = Join-Path $RootPath "Desktopfeloral-frontend"
$BackendPath = Join-Path $RootPath "Desktopfeloral-backend"

if (!(Test-Path $FrontendPath)) {
  Write-Host "Frontend folder not found: $FrontendPath" -ForegroundColor Red
  exit 1
}

if (!(Test-Path $BackendPath)) {
  Write-Host "Backend folder not found: $BackendPath" -ForegroundColor Red
  exit 1
}

# This makes one GitHub repo contain both frontend and backend.
# Nested .git folders must not remain inside the two app folders.
Move-NestedGit -ProjectPath $FrontendPath
Move-NestedGit -ProjectPath $BackendPath

Set-Location $RootPath

if (!(Test-Path ".git")) {
  git init
}

Ensure-GitIgnore -RepoPath $RootPath
Ensure-GitIdentity

$branch = Get-GitOutput branch --show-current
if (!$branch) {
  git checkout -B main
  $branch = "main"
}

$origin = Get-GitOutput remote get-url origin

if (!$origin) {
  git remote add origin $RemoteUrl
} elseif ($origin -ne $RemoteUrl) {
  Write-Host "Existing origin is: $origin" -ForegroundColor Yellow
  Write-Host "Changing origin to: $RemoteUrl" -ForegroundColor Yellow
  git remote set-url origin $RemoteUrl
}

# Keep generated/sensitive stuff out of the repository index.
git rm --cached --ignore-unmatch .env .env.local .env.development .env.production .env.test 2>$null | Out-Null
git rm --cached -r --ignore-unmatch node_modules .next dist build 2>$null | Out-Null
git rm --cached -r --ignore-unmatch Desktopfeloral-frontend/node_modules Desktopfeloral-frontend/.next Desktopfeloral-frontend/dist Desktopfeloral-frontend/build 2>$null | Out-Null
git rm --cached -r --ignore-unmatch Desktopfeloral-backend/node_modules Desktopfeloral-backend/dist Desktopfeloral-backend/build 2>$null | Out-Null

Write-Host ""
Write-Host "Status before commit:" -ForegroundColor Yellow
git status --short

git add -A

$hasChanges = Get-GitOutput status --porcelain

if ($hasChanges) {
  Write-Host ""
  Write-Host "Committing changes..." -ForegroundColor Cyan
  git commit -m "$CommitMessage"
} else {
  Write-Host "No changes to commit." -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan

# First try normal push.
git push -u origin $branch

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Normal push failed. Trying pull --rebase then push..." -ForegroundColor Yellow
  git pull origin $branch --rebase --allow-unrelated-histories
  git push -u origin $branch
}

Write-Host ""
Write-Host "Done. Frontend and backend are now saved in:" -ForegroundColor Green
Write-Host $RemoteUrl -ForegroundColor Cyan
