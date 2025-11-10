#!/usr/bin/env pwsh
# CDA CLI Installation Script for Windows (PowerShell)
# Optional branch selection:
#   $env:CDACLI_BRANCH = 'develop'; irm https://raw.githubusercontent.com/JohanBellander/CdaCLI/master/scripts/install.ps1 | iex
# Or pass -Branch when invoking the saved script locally.

param(
    [string]$Branch = $env:CDACLI_BRANCH
)

if (-not $Branch -or $Branch.Trim() -eq '') { $Branch = 'master' }

$ErrorActionPreference = "Stop"

Write-Host "Installing CDA CLI..." -ForegroundColor Cyan

function Test-Command {
    param([string]$Name)
    try {
        $null = Get-Command $Name -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

if (-not (Test-Command 'git')) {
    Write-Host "Error: git is required but not installed." -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/downloads" -ForegroundColor Yellow
    exit 1
}

# Check for Node.js >= 18
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')

    if ($majorVersion -lt 18) {
        Write-Host "Error: Node.js 18.0.0 or higher is required." -ForegroundColor Red
        Write-Host "Current version: $nodeVersion" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Found Node.js $nodeVersion ✓" -ForegroundColor Green
}
catch {
    Write-Host "Error: Node.js is required but not installed." -ForegroundColor Red
    Write-Host "Install Node.js >= 18.0.0 from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check for npm
try {
    $npmVersion = npm --version
    Write-Host "Found npm $npmVersion ✓" -ForegroundColor Green
}
catch {
    Write-Host "Error: npm is required but not found." -ForegroundColor Red
    exit 1
}

# Check existing global installation (even if broken)
$packageName = 'cdacli'
$existingInstall = $false
try {
    $npmList = npm list -g --depth=0 $packageName 2>$null | Out-String
    if ($npmList -match "$packageName@") {
        $existingInstall = $true
    }
}
catch {
    # ignore and continue
}

if ($existingInstall) {
    Write-Host "Existing CDA CLI installation detected." -ForegroundColor Yellow
    Write-Host "Uninstalling previous version..." -ForegroundColor Cyan
    npm uninstall -g $packageName 2>$null | Out-Null
}

# Create temporary directory
$tempDir = Join-Path $env:TEMP "cdacli-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Set-Location $tempDir

    Write-Host "Cloning CdaCLI repository (branch: $Branch)..." -ForegroundColor Cyan
    git clone --branch $Branch --single-branch https://github.com/JohanBellander/CdaCLI.git | Out-Null
    Set-Location CdaCLI

    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install --silent

    Write-Host "Building CDA CLI..." -ForegroundColor Cyan
    npm run build | Out-Null

    Write-Host "Packaging CDA CLI..." -ForegroundColor Cyan
    $tarball = npm pack --silent

    Write-Host "Installing CDA CLI globally..." -ForegroundColor Cyan
    npm install -g $tarball | Out-Null

    Write-Host ""
    Write-Host "✅ CDA CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Try: cda --help" -ForegroundColor Cyan
    Write-Host "Plan instructions: cda run --plan" -ForegroundColor Cyan
}
finally {
    Set-Location $env:USERPROFILE
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
}
