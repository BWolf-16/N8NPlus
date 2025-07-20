# Changelog

All notable changes to N8NPlus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-07-20

### Added
- **Automatic Startup System**: Complete one-click launch experience
- **Smart Port Detection**: Intelligent port scanning and conflict resolution
- **Enhanced Loading Screens**: Beautiful progress indicators with real-time status
- **Advanced Error Handling**: User-friendly error messages with suggested solutions
- **Auto-Recovery Mechanisms**: Automatic refresh and retry functionality
- **Manual Control Options**: Easy access to manual startup when needed
- **IPC Communication**: Enhanced Electron main/renderer process communication
- **Comprehensive Documentation**: AUTOMATIC_STARTUP.md with detailed guide

### Changed
- **Default Port Ranges**: Optimized to avoid common conflicts
  - Backend: 8001-8005 (primary), 9999-9000 (fallback)
  - Frontend: 3001-3005 (primary), 8880+ (fallback)
- **Auto-start Enabled**: Now enabled by default for seamless experience
- **Startup Logic**: Complete rewrite of server initialization process
- **Error Messages**: More informative and user-friendly feedback

### Fixed
- Port conflict errors during startup
- Docker connection issues on some systems
- Cross-platform compatibility issues
- Memory leaks in server management
- Terminal window management

### Deprecated
- Manual batch file startup (still available but not recommended)

## [1.0.3] - Previous Release

### Added
- Multi-Docker host support
- Enhanced container management
- Network discovery features
- Port conflict detection

### Changed
- Improved UI/UX
- Better error handling
- Enhanced Docker integration

### Fixed
- Various bug fixes and stability improvements

## [1.0.2] - Previous Release

### Added
- Container lifecycle management
- Port management system
- Docker status monitoring

## [1.0.1] - Previous Release

### Added
- Basic container operations
- Simple UI interface
- Docker integration

## [1.0.0] - Initial Release

### Added
- Initial N8NPlus release
- Basic Docker container management
- Electron-based desktop application
