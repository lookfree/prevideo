# Research Findings: YouTube视频下载器与字幕处理器

## 1. Electron Security and Architecture

### Decision: Electron with Context Isolation and contextBridge
**Rationale**:
- Context isolation prevents renderer process from accessing Node.js APIs directly
- contextBridge provides secure, controlled API exposure
- Follows Electron security best practices

**Alternatives considered**:
- nodeIntegration: true (rejected - security risk)
- Remote module (deprecated in Electron 14+)

### Implementation approach:
```typescript
// preload script
contextBridge.exposeInMainWorld('api', {
  downloadVideo: (url: string) => ipcRenderer.invoke('download-video', url),
  generateSubtitle: (videoPath: string) => ipcRenderer.invoke('generate-subtitle', videoPath)
})
```

## 2. yt-dlp Integration

### Decision: Use child_process spawn with yt-dlp binary
**Rationale**:
- Most reliable and feature-complete approach
- Direct access to all yt-dlp features including断点续传
- Easy to update yt-dlp independently

**Alternatives considered**:
- youtube-dl-exec npm package (wrapper, adds complexity)
- ytdl-core (limited features, no断点续传)

### 断点续传实现:
```typescript
// Use yt-dlp's built-in resume capability
const args = [
  '--continue',  // Resume partial downloads
  '--no-part',   // Do not use .part files
  '--write-info-json',  // Save metadata for resume
  url
];
```

## 3. Whisper Integration

### Decision: Use whisper.cpp with Node.js bindings
**Rationale**:
- Better performance than Python version
- Easier to bundle with Electron
- Lower memory footprint
- Cross-platform compatibility (Windows/macOS/Linux)

**Alternatives considered**:
- OpenAI Whisper Python (requires Python runtime)
- Whisper API (requires internet, costs money)
- whisper-node package (uses whisper.cpp internally)

### Performance optimization:
```typescript
// Use smaller models for faster processing
const model = 'base'; // or 'tiny' for fastest
// Use VAD (Voice Activity Detection) to skip silent parts
// Process in chunks for progress reporting
```

## 4. FFmpeg Bilingual Subtitle Embedding

### Decision: Use fluent-ffmpeg with custom filter complex
**Rationale**:
- Well-maintained Node.js wrapper
- Supports complex filter chains for双语字幕
- Good documentation and community support

**Alternatives considered**:
- Direct ffmpeg command line (harder to manage)
- ffmpeg-static (only provides binary)

### 双语字幕参数:
```typescript
// Embed two subtitles with different positions
ffmpeg()
  .input(videoPath)
  .videoFilter([
    `subtitles=${subtitle1}:force_style='Fontsize=20,MarginV=50'`,
    `subtitles=${subtitle2}:force_style='Fontsize=18,MarginV=20'`
  ])
  .outputOptions([
    '-c:v libx264',
    '-crf 23',  // Quality parameter
    '-preset medium'
  ])
```

## 5. SQLite for Task Persistence

### Decision: Use better-sqlite3 for synchronous API
**Rationale**:
- Synchronous API simpler for Electron main process
- Better performance for local database
- Excellent TypeScript support
- Works identically on Windows and macOS

**Alternatives considered**:
- sqlite3 (async only, more complex)
- IndexedDB (renderer only)
- JSON file storage (no query capability)

### Schema design:
```sql
CREATE TABLE downloads (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL DEFAULT 0,
  output_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 6. UI Framework

### Decision: React with Material-UI (MUI)
**Rationale**:
- React integrates well with Electron
- MUI provides comprehensive component library
- Built-in accessibility support
- Consistent design language across Windows/macOS

**Alternatives considered**:
- Vue.js (smaller community for Electron)
- Vanilla JS (more development time)
- Ant Design (less Material Design aligned)

## 7. Cross-Platform Build and Distribution

### Decision: electron-builder with platform-specific installers
**Rationale**:
- Mature solution for Windows and macOS packaging
- Supports code signing for both platforms
- Built-in auto-update support
- Can build all platforms from single machine with proper setup

**Alternatives considered**:
- electron-forge (newer, less stable)
- electron-packager (basic features only)

### Windows Build Configuration:
```json
{
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      }
    ],
    "icon": "build/icon.ico",
    "certificateSubjectName": "PreVideo Inc.",
    "publisherName": "PreVideo Inc."
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "installerIcon": "build/icon.ico",
    "uninstallerIcon": "build/icon.ico",
    "installerHeaderIcon": "build/icon.ico",
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "language": "2052"  // 简体中文
  }
}
```

### macOS Build Configuration:
```json
{
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]  // Support Intel and Apple Silicon
      }
    ],
    "icon": "build/icon.icns",
    "category": "public.app-category.video",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  }
}
```

## 8. Platform-Specific Considerations

### Windows特定:
- **二进制文件路径**: 使用 `process.platform === 'win32'` 检测
- **FFmpeg路径**: `resources/binaries/win/ffmpeg.exe`
- **yt-dlp路径**: `resources/binaries/win/yt-dlp.exe`
- **权限**: 通常不需要管理员权限
- **安装位置**: 默认 `C:\Program Files\PreVideo Downloader`
- **用户数据**: `%APPDATA%\prevideo-downloader`

### macOS特定:
- **二进制文件路径**: 使用 `process.platform === 'darwin'` 检测
- **FFmpeg路径**: `resources/binaries/mac/ffmpeg`
- **yt-dlp路径**: `resources/binaries/mac/yt-dlp`
- **权限**: 可能需要在系统偏好设置中授权
- **安装位置**: `/Applications/PreVideo Downloader.app`
- **用户数据**: `~/Library/Application Support/prevideo-downloader`
- **Code Signing**: 需要Apple Developer ID证书
- **Notarization**: macOS 10.15+需要公证

### 跨平台路径处理:
```typescript
import { app } from 'electron';
import path from 'path';

const getBinaryPath = (binary: string): string => {
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  const folder = platform === 'win32' ? 'win' : 'mac';

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'binaries', folder, `${binary}${ext}`);
  } else {
    return path.join(__dirname, '../../resources/binaries', folder, `${binary}${ext}`);
  }
};
```

## 9. Testing Strategy

### Decision: Jest + Playwright + Platform-specific CI
**Rationale**:
- Jest for unit and integration tests
- Playwright for E2E testing
- GitHub Actions with Windows and macOS runners
- Good TypeScript support

**Alternatives considered**:
- Mocha/Chai (less integrated)
- Cypress (not optimized for Electron)
- TestCafe (limited Electron support)

### CI Configuration:
```yaml
strategy:
  matrix:
    os: [windows-latest, macos-latest]
    node-version: [18.x, 20.x]
```

## 10. Auto-Update Strategy

### Decision: electron-updater with GitHub Releases
**Rationale**:
- Free hosting on GitHub
- Automatic delta updates
- Works on both Windows and macOS
- Supports staged rollouts

### Update Configuration:
```typescript
const autoUpdater = require('electron-updater').autoUpdater;

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'prevideo',
  repo: 'downloader'
});

// Windows: Downloads NSIS differential updates
// macOS: Downloads DMG or ZIP updates
autoUpdater.checkForUpdatesAndNotify();
```

## Summary of Technology Stack

| Component | Technology | Windows版本 | macOS版本 |
|-----------|------------|------------|-----------|
| Runtime | Electron | 28.x | 28.x |
| Language | TypeScript | 5.x | 5.x |
| UI Framework | React | 18.x | 18.x |
| UI Library | Material-UI | 5.x | 5.x |
| Video Download | yt-dlp | Latest.exe | Latest |
| Subtitle Generation | whisper.cpp | Latest.exe | Latest |
| Video Processing | ffmpeg | 6.x.exe | 6.x |
| Database | better-sqlite3 | 9.x | 9.x |
| Installer | NSIS | 3.x | - |
| Installer | DMG | - | Latest |
| Build Tool | electron-builder | 24.x | 24.x |
| Test Framework | Jest | 29.x | 29.x |
| E2E Testing | Playwright | 1.40.x | 1.40.x |

## Performance Targets (Both Platforms)

1. **安装包大小**:
   - Windows: <150MB (NSIS installer)
   - macOS: <150MB (DMG)
2. **启动时间**:
   - 冷启动: <2秒
   - 热启动: <500ms
3. **内存占用**:
   - Windows: <500MB
   - macOS: <500MB
4. **CPU使用**:
   - 空闲时: <5%
   - 处理时: <80%

## Security Considerations (Platform-Specific)

### Windows:
1. **Code Signing**: 使用EV代码签名证书
2. **SmartScreen**: 提交给Microsoft进行信誉建立
3. **Windows Defender**: 确保不触发误报
4. **UAC**: 不需要管理员权限运行

### macOS:
1. **Code Signing**: Apple Developer ID证书
2. **Notarization**: 提交给Apple公证
3. **Gatekeeper**: 确保通过Gatekeeper检查
4. **Hardened Runtime**: 启用加固运行时
5. **Entitlements**: 最小权限原则

## Deployment Strategy

1. **开发环境**:
   - Windows: `npm run dev:win`
   - macOS: `npm run dev:mac`
2. **构建命令**:
   - Windows: `npm run build:win`
   - macOS: `npm run build:mac`
   - 全平台: `npm run build:all`
3. **发布流程**:
   - Tag release in Git
   - GitHub Actions自动构建
   - 上传到GitHub Releases
   - 用户通过auto-updater更新

---
*Research completed: 2025-09-21*