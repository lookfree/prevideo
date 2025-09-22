# PreVideo Downloader - Claude Code Context

## Project Overview
YouTube video downloader with bilingual subtitle support and compression capabilities.
Built with Electron, TypeScript, React, and Material-UI for Windows and macOS desktop.

## Current Development Context

### Active Branch: `001-youtube-youtube`
Implementing core YouTube download, subtitle generation, and video compression features.

### Technology Stack
- **Runtime**: Electron 28.x with contextBridge security
- **Language**: TypeScript 5.x with strict mode
- **Frontend**: React 18.x + Material-UI 5.x
- **Video Download**: yt-dlp (latest) with resume support
- **Subtitle Generation**: whisper.cpp (base model default)
- **Video Processing**: ffmpeg 6.x for compression and subtitle embedding
- **Database**: better-sqlite3 for task persistence
- **Build**: electron-builder for Win/Mac installers

### Project Structure
```
src/
├── main/           # Electron main process
│   ├── services/   # yt-dlp, Whisper, ffmpeg wrappers
│   └── ipc/        # IPC handlers
├── renderer/       # React UI
│   ├── components/ # Reusable components
│   └── pages/      # Main views
├── shared/         # Shared types and constants
└── preload/        # Secure bridge

tests/              # Jest + Playwright tests
resources/          # Icons and binaries
```

### Key Features In Progress
1. **Video Download**: YouTube URL validation, quality selection, progress tracking
2. **Bilingual Subtitles**: Auto-generation with Whisper, dual language embedding
3. **Video Compression**: Configurable quality, format conversion, size estimation
4. **Resume Support**: Automatic断点续传 for interrupted downloads
5. **Cross-Platform**: Windows NSIS installer, macOS DMG with notarization

### Current Implementation Status
- [x] Project structure defined
- [x] Data models designed
- [x] IPC contracts established
- [ ] Core services implementation
- [ ] UI components
- [ ] Testing setup
- [ ] Build configuration

### Development Guidelines
1. **TDD Required**: Write tests first, especially for IPC channels
2. **TypeScript Strict**: No any types, proper error handling
3. **Security First**: Context isolation, input validation, safe paths
4. **Chinese UI**: Primary language is Simplified Chinese
5. **Performance**: <2s startup, <100ms UI response

### Testing Approach
```bash
npm test           # Unit tests
npm run test:e2e   # Playwright E2E tests
npm run test:ipc   # IPC contract tests
```

### Build Commands
```bash
npm run dev        # Start dev server
npm run build:win  # Build Windows installer
npm run build:mac  # Build macOS DMG
npm run build:all  # Build all platforms
```

### Common Tasks

#### Adding a new IPC channel:
1. Define in `contracts/ipc-channels.ts`
2. Write contract test first
3. Implement handler in `main/ipc/`
4. Add renderer hook in `renderer/hooks/`

#### Adding a new service:
1. Define interface in `contracts/service-interfaces.ts`
2. Write unit tests
3. Implement in `main/services/`
4. Wire up IPC handlers

#### UI Component workflow:
1. Create in `renderer/components/`
2. Use Material-UI components
3. Add Storybook story (if applicable)
4. Include Chinese translations

### Recent Changes
- Initial project setup with Electron + TypeScript
- Data model and contracts definition
- Research on yt-dlp, Whisper, ffmpeg integration

### Known Issues
- Whisper model downloads need automation
- ffmpeg binary bundling strategy needed
- Code signing certificates required for production

### Performance Targets
- Download speed: >5MB/s
- Subtitle generation: <30s per minute
- Memory usage: <500MB
- Startup time: <2 seconds

### Security Considerations
- YouTube URL validation with regex
- Path traversal protection
- Process isolation via contextBridge
- Regular dependency updates via Dependabot

### Platform-Specific Notes

**Windows**:
- Binary paths: `resources/binaries/win/*.exe`
- User data: `%APPDATA%/prevideo-downloader`
- Requires NSIS for installer

**macOS**:
- Binary paths: `resources/binaries/mac/*`
- User data: `~/Library/Application Support/prevideo-downloader`
- Requires notarization for distribution

### Useful Commands
```bash
# Update yt-dlp
npm run update-ytdlp

# Download Whisper models
npm run download-whisper-models

# Check bundle size
npm run analyze

# Run specific test file
npm test -- --testPathPattern=downloader

# Debug main process
npm run debug:main

# Debug renderer process
npm run debug:renderer
```

### Resources
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [yt-dlp Options](https://github.com/yt-dlp/yt-dlp#usage-and-options)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [FFmpeg Filters](https://ffmpeg.org/ffmpeg-filters.html)

---
*Last updated: 2025-09-22 | Constitution v1.0.1*
