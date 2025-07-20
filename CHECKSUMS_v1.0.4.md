# N8NPlus v1.0.4 Checksums

## File Information

**File**: N8NPlus Setup 1.0.4.exe
**Size**: 95.77 MB (100,413,440 bytes)
**Build Date**: Generated from automated build process
**Platform**: Windows 64-bit

## Checksums

### SHA256
```
69477F4E6C75853EE35A9C178D5043B9586EBB1B712094A0905D3C4B175D4515
```

### MD5
```
9B6D5A3E44C010CF12D1E23066C93774
```

## Verification Instructions

### Windows PowerShell
```powershell
# Verify SHA256
Get-FileHash "N8NPlus Setup 1.0.4.exe" -Algorithm SHA256

# Verify MD5
Get-FileHash "N8NPlus Setup 1.0.4.exe" -Algorithm MD5
```

### Command Prompt (with certutil)
```cmd
# Verify SHA256
certutil -hashfile "N8NPlus Setup 1.0.4.exe" SHA256

# Verify MD5
certutil -hashfile "N8NPlus Setup 1.0.4.exe" MD5
```

## Package Contents

This installer includes:

- **N8NPlus Electron Application** (v1.0.4)
- **Node.js Runtime** (v20.11.0) - Bundled for self-contained operation
- **Frontend React Application** - Pre-built production build
- **Backend Express Server** - All dependencies included
- **Docker Integration Layer** - For container management
- **Automatic Startup System** - No batch files required
- **Smart Port Management** - Automatic conflict resolution
- **Enhanced Error Handling** - Progressive execution strategies

## Build Information

- **Electron Version**: 27.3.11
- **electron-builder Version**: 26.0.12
- **Node.js Version**: 20.11.0 (bundled)
- **Build Platform**: Windows 10/11 64-bit
- **Signing**: Code signed with digital certificate
- **Compression**: NSIS 7-Zip compression

## Security Notes

- The installer is digitally signed
- All bundled components are from official sources
- Node.js v20.11.0 is downloaded from official Node.js distribution
- No external executables or scripts are downloaded during installation
- All dependencies are verified and included in the package

## Installation Verification

After installation, you can verify the installation by:

1. **File Integrity**: Check that N8NPlus.exe is properly installed
2. **Digital Signature**: Verify the executable signature
3. **Functionality**: Launch the application and verify all services start
4. **Dependencies**: Confirm bundled Node.js is accessible

Expected installation size: ~200MB (after extraction and installation)
