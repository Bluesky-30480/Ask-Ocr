# Code Signing Configuration Guide

This document provides comprehensive instructions for configuring code signing for Ask OCR on Windows and macOS platforms.

## Table of Contents
- [Overview](#overview)
- [Windows Code Signing](#windows-code-signing)
- [macOS Code Signing](#macos-code-signing)
- [Tauri Configuration](#tauri-configuration)
- [CI/CD Integration](#cicd-integration)

---

## Overview

Code signing is essential for:
- **User Trust**: Verified publisher identity
- **Security**: Prevents tampering
- **Distribution**: Required for app stores and automatic updates
- **Operating System**: Avoids "unknown developer" warnings

### Requirements Summary

| Platform | Certificate Type | Cost | Validation Time |
|----------|-----------------|------|-----------------|
| Windows  | Code Signing Certificate (EV recommended) | $300-500/year | 3-7 days |
| macOS    | Apple Developer Program | $99/year | 24-48 hours |

---

## Windows Code Signing

### 1. Obtain a Code Signing Certificate

#### Option A: Extended Validation (EV) Certificate (Recommended)
**Providers**:
- DigiCert
- Sectigo (formerly Comodo)
- GlobalSign

**Advantages**:
- Immediate SmartScreen reputation
- USB token security
- No warning dialogs

**Cost**: $300-500/year

**Process**:
1. Register your company (if not already)
2. Apply for EV certificate from provider
3. Complete identity verification (phone, documents, D&B number)
4. Receive USB token with certificate

#### Option B: Standard Code Signing Certificate
**Providers**:
- SSL.com
- Certum
- K Software

**Advantages**:
- Lower cost
- Easier validation

**Disadvantages**:
- Initial SmartScreen warnings until reputation builds
- Less secure storage

**Cost**: $80-200/year

### 2. Install Certificate

#### EV Certificate (USB Token)
```powershell
# No installation needed - certificate is on USB token
# Ensure USB token is plugged in before signing
```

#### Standard Certificate (PFX File)
```powershell
# Import PFX certificate to Windows Certificate Store
certutil -importpfx -user "path\to\certificate.pfx"

# Or use Certificate Manager (certmgr.msc)
# 1. Open Start → Run → certmgr.msc
# 2. Right-click Personal → All Tasks → Import
# 3. Select your .pfx file
# 4. Enter password
# 5. Mark as exportable (optional)
```

### 3. Configure Tauri for Windows Signing

Edit `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.digicert.com"
      }
    }
  }
}
```

#### Get Certificate Thumbprint

```powershell
# Method 1: PowerShell
Get-ChildItem -Path Cert:\CurrentUser\My | Format-List Subject, Thumbprint

# Method 2: certutil
certutil -store -user My

# Method 3: Certificate Manager
# Open certmgr.msc → Personal → Certificates
# Double-click certificate → Details → Thumbprint
```

#### Alternative: Use SignTool Directly

Create `sign-windows.ps1`:

```powershell
# Sign Windows executable after build
$exe = "src-tauri\target\release\Ask OCR.exe"
$timestamp = "http://timestamp.digicert.com"

# For USB token (EV certificate)
signtool sign /tr $timestamp /td sha256 /fd sha256 /a $exe

# For PFX file
$pfx = "path\to\certificate.pfx"
$password = Read-Host -AsSecureString "Enter certificate password"
signtool sign /f $pfx /p $password /tr $timestamp /td sha256 /fd sha256 $exe
```

### 4. Timestamp Servers

Timestamping ensures signatures remain valid after certificate expiration.

**Recommended timestamp servers**:
```
http://timestamp.digicert.com
http://timestamp.sectigo.com
http://timestamp.globalsign.com
http://timestamp.comodoca.com
```

---

## macOS Code Signing

### 1. Join Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Enroll as Individual ($99/year) or Organization ($99/year)
3. Complete verification (24-48 hours)
4. Accept agreements in Apple Developer portal

### 2. Generate Certificates

#### Create Certificate Signing Request (CSR)

1. Open **Keychain Access** (Applications → Utilities)
2. Menu: **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Enter your email and name
4. Select **Saved to disk**
5. Click **Continue**, save CSR file

#### Request Certificates from Apple

1. Log in to https://developer.apple.com/account/resources/certificates
2. Click **+** to create new certificate
3. Select certificate types:
   - **Developer ID Application** (for distribution outside App Store)
   - **Developer ID Installer** (for pkg installers)
   - **Mac App Distribution** (for Mac App Store, optional)
4. Upload CSR file
5. Download certificate (.cer file)
6. Double-click to install in Keychain Access

### 3. Configure Tauri for macOS Signing

Edit `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
        "entitlements": "entitlements.plist",
        "providerShortName": "YOUR_TEAM_ID",
        "hardenedRuntime": true
      }
    }
  }
}
```

#### Create Entitlements File

Create `src-tauri/entitlements.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Allow JIT compilation -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    
    <!-- Allow unsigned executable memory -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    
    <!-- Disable library validation for dynamic libraries -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    
    <!-- Network access -->
    <key>com.apple.security.network.client</key>
    <true/>
    
    <key>com.apple.security.network.server</key>
    <true/>
    
    <!-- File access -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    
    <!-- Camera/Screen recording (for screenshots) -->
    <key>com.apple.security.device.camera</key>
    <true/>
</dict>
</plist>
```

### 4. Find Signing Identity

```bash
# List all code signing identities
security find-identity -v -p codesigning

# Example output:
# 1) ABCD1234... "Developer ID Application: John Doe (TEAM123456)"
# 2) EFGH5678... "Apple Development: john@example.com (TEAM123456)"
```

Use the full identity string in Tauri config.

### 5. Notarization

macOS requires notarization for apps distributed outside the Mac App Store.

#### Setup App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Generate app-specific password
3. Save password securely

#### Notarize Command

```bash
# After building, notarize the app
xcrun notarytool submit "src-tauri/target/release/bundle/dmg/Ask OCR_0.1.0_x64.dmg" \
  --apple-id "your-email@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM123456" \
  --wait

# Check notarization status
xcrun notarytool info SUBMISSION_ID \
  --apple-id "your-email@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM123456"

# Staple notarization ticket to app
xcrun stapler staple "src-tauri/target/release/bundle/dmg/Ask OCR_0.1.0_x64.dmg"
```

#### Alternative: Use Keychain for Password

```bash
# Store credentials in keychain
xcrun notarytool store-credentials "ASK_OCR_NOTARIZE" \
  --apple-id "your-email@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "TEAM123456"

# Use stored credentials
xcrun notarytool submit "app.dmg" --keychain-profile "ASK_OCR_NOTARIZE" --wait
```

---

## Tauri Configuration

Complete `src-tauri/tauri.conf.json` example:

```json
{
  "package": {
    "productName": "Ask OCR",
    "version": "0.1.0"
  },
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "path": {
        "all": true
      },
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$DOCUMENT/*", "$DOWNLOAD/*"]
      },
      "dialog": {
        "all": true
      },
      "clipboard": {
        "all": true
      },
      "globalShortcut": {
        "all": true
      },
      "notification": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "Copyright © 2025 Ask OCR",
      "identifier": "com.askocr.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "longDescription": "Lightweight OCR desktop application with AI integration",
      "macOS": {
        "entitlements": "entitlements.plist",
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
        "providerShortName": "TEAM_ID",
        "hardenedRuntime": true,
        "minimumSystemVersion": "10.13"
      },
      "resources": [],
      "shortDescription": "OCR with AI",
      "targets": "all",
      "windows": {
        "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.digicert.com",
        "wix": {
          "language": "en-US"
        }
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 700,
        "resizable": true,
        "title": "Ask OCR",
        "width": 1000
      }
    ]
  }
}
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        include:
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Build Tauri app
        run: |
          cd frontend
          npm run tauri build -- --target ${{ matrix.target }}
        env:
          # Windows signing
          WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
          WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          # macOS signing
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Notarize macOS app
        if: matrix.os == 'macos-latest'
        run: |
          xcrun notarytool submit "src-tauri/target/release/bundle/dmg/*.dmg" \
            --apple-id "${{ secrets.APPLE_ID }}" \
            --password "${{ secrets.APPLE_PASSWORD }}" \
            --team-id "${{ secrets.APPLE_TEAM_ID }}" \
            --wait
          xcrun stapler staple "src-tauri/target/release/bundle/dmg/*.dmg"

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-${{ matrix.target }}
          path: |
            src-tauri/target/release/bundle/**/*.exe
            src-tauri/target/release/bundle/**/*.msi
            src-tauri/target/release/bundle/**/*.dmg
            src-tauri/target/release/bundle/**/*.app
```

### Secrets to Configure

Add these secrets in GitHub repository settings:

**Windows**:
- `WINDOWS_CERTIFICATE`: Base64-encoded PFX file
- `WINDOWS_CERTIFICATE_PASSWORD`: PFX password

**macOS**:
- `APPLE_CERTIFICATE`: Base64-encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_SIGNING_IDENTITY`: Full identity string
- `APPLE_ID`: Apple ID email
- `APPLE_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: 10-character team ID

---

## Testing Code Signing

### Windows

```powershell
# Verify signature
signtool verify /pa "path\to\Ask OCR.exe"

# Check signature details
Get-AuthenticodeSignature "path\to\Ask OCR.exe" | Format-List *
```

### macOS

```bash
# Verify code signature
codesign --verify --deep --strict "Ask OCR.app"
codesign --display --verbose=4 "Ask OCR.app"

# Verify notarization
spctl --assess --verbose=4 "Ask OCR.app"

# Check if stapled
stapler validate "Ask OCR.dmg"
```

---

## Troubleshooting

### Windows

**Problem**: "SignTool Error: No certificates were found that met all the given criteria"
**Solution**: Certificate not properly installed. Re-import PFX file to correct store.

**Problem**: SmartScreen warning appears
**Solution**: Normal for standard certificates. Builds reputation over time or use EV certificate.

### macOS

**Problem**: "code object is not signed at all"
**Solution**: Signing identity not correctly specified in tauri.conf.json

**Problem**: "The application cannot be opened because the developer cannot be verified"
**Solution**: App not notarized. Complete notarization process.

**Problem**: "Notarization failed - invalid entitlements"
**Solution**: Review entitlements.plist and remove unnecessary permissions.

---

## Security Best Practices

1. **Never commit certificates or passwords to version control**
2. **Use environment variables or CI/CD secrets**
3. **Rotate certificates before expiration**
4. **Use EV certificates for Windows when possible**
5. **Enable hardened runtime on macOS**
6. **Keep signing keys in secure hardware (USB token) when possible**
7. **Use timestamp servers to maintain validity after cert expiration**
8. **Test signed builds on clean machines before release**

---

## Resources

### Windows
- [Microsoft SignTool Documentation](https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-best-practices)

### macOS
- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

### Tauri
- [Tauri Code Signing Documentation](https://tauri.app/v1/guides/distribution/sign-macos)
- [Tauri Bundle Configuration](https://tauri.app/v1/api/config/#bundleconfig)

---

**Last Updated**: 2025-10-25  
**Status**: Ready for implementation
