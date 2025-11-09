# Building Windows Installer

## Option 1: Standalone Executable (Simplest)

Build a standalone `.exe` that doesn't require Node.js:

```powershell
npm run build:exe
```

This creates `dist-exe/cda.exe` (~42MB) that can be distributed directly.

**Distribution:**
- Upload `dist-exe/cda.exe` to GitHub releases
- Users download and add to their PATH manually

## Option 2: Inno Setup Installer (Recommended)

Creates a professional Windows installer (.exe) with automatic PATH configuration.

### Prerequisites
1. Install Inno Setup: https://jrsoftware.org/isdl.php

### Build Steps
1. Build the standalone executable:
   ```powershell
   npm run build:exe
   ```

2. Compile the installer with Inno Setup:
   ```powershell
   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
   ```

3. Find the installer in `installer-output/cdacli-0.2.15-setup.exe`

**Distribution:**
- Upload `cdacli-0.2.15-setup.exe` to GitHub releases
- Users run the installer, which automatically adds `cda` to PATH
- Professional uninstaller included

## Option 3: Chocolatey Package (Advanced)

For enterprise distribution via Chocolatey package manager.

### Prerequisites
1. Create Chocolatey account: https://community.chocolatey.org/
2. Install Chocolatey locally: https://chocolatey.org/install

### Build Steps
1. Create `cdacli.nuspec` (Chocolatey package definition)
2. Package: `choco pack`
3. Publish: `choco push cdacli.0.2.15.nupkg --source https://push.chocolatey.org/`

**Distribution:**
- Users install via: `choco install cdacli`
- Automatic updates via Chocolatey

## Option 4: NPM Global Install (Current - Works Well!)

Users with Node.js installed can use:

```powershell
npm install -g https://github.com/JohanBellander/CdaCLI/releases/download/v0.2.15/cdacli-0.2.15.tgz
```

**Pros:**
- Simple, already working
- Automatic updates via `npm update -g cdacli`
- Small download size (~35KB)

**Cons:**
- Requires Node.js 18+ installed

## Recommendation

For maximum reach:
1. **Keep NPM install** for developers (they likely have Node.js)
2. **Add Inno Setup installer** to GitHub releases for non-developers
3. **Optionally add to Chocolatey** if you want enterprise distribution

This gives users three options:
- `npm install -g` (developers)
- Download and run installer (Windows users)
- `choco install cdacli` (enterprise/automated deployments)
