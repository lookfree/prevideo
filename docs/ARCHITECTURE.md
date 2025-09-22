# 架构设计文档

## 系统概览

PreVideo 采用 Electron 架构，实现跨平台桌面应用。系统分为三层：主进程、渲染进程和预加载脚本，通过 IPC 通信。

```
┌─────────────────────────────────────────────────────────┐
│                     用户界面 (React)                     │
├─────────────────────────────────────────────────────────┤
│                   渲染进程 (Renderer)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Components│  │  Hooks   │  │  Store   │            │
│  └──────────┘  └──────────┘  └──────────┘            │
├─────────────────────────────────────────────────────────┤
│                   预加载脚本 (Preload)                   │
│              Context Bridge API Exposure               │
├─────────────────────────────────────────────────────────┤
│                    主进程 (Main)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Services │  │   IPC    │  │ Database │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│  ┌──────────────────────────────────────┐            │
│  │         Binary Wrappers              │            │
│  │  yt-dlp │ FFmpeg │ Whisper.cpp     │            │
│  └──────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 主进程 (Main Process)

主进程负责系统级操作和资源管理。

#### 1.1 Application 类
```typescript
class Application {
  private mainWindow: MainWindow;
  private trayManager: TrayManager;
  private services: Map<string, BaseService>;

  async initialize(): Promise<void> {
    await this.setupServices();
    await this.setupIPC();
    await this.createWindow();
  }
}
```

#### 1.2 服务层 (Services)

**DownloaderService**
- 管理视频下载任务
- 封装 yt-dlp 操作
- 处理下载队列

**SubtitleService**
- 字幕生成（Whisper）
- 字幕翻译
- 字幕嵌入

**ConverterService**
- 视频压缩
- 格式转换
- 封装 FFmpeg 操作

**StorageService**
- 数据持久化
- 配置管理
- 缓存控制

#### 1.3 IPC 处理器

```typescript
// IPC 通道注册
ipcMain.handle('video:info:fetch', async (event, { url }) => {
  return downloaderService.fetchVideoInfo(url);
});

ipcMain.handle('video:download:start', async (event, args) => {
  return downloaderService.startDownload(args);
});
```

### 2. 渲染进程 (Renderer Process)

渲染进程运行 React 应用，负责用户界面。

#### 2.1 组件架构

```
src/renderer/
├── components/          # 可复用组件
│   ├── VideoInputForm   # 视频输入表单
│   ├── DownloadProgress # 下载进度
│   ├── SubtitleSettings # 字幕设置
│   └── TaskList        # 任务列表
├── pages/              # 页面组件
│   ├── HomePage        # 主页
│   ├── HistoryPage     # 历史
│   └── SettingsPage    # 设置
├── hooks/              # 自定义 Hooks
│   ├── useDownloadManager
│   ├── useSubtitleGenerator
│   └── useVideoCompressor
└── store/              # Redux 状态管理
    ├── slices/
    │   ├── downloadSlice
    │   ├── taskSlice
    │   └── uiSlice
    └── selectors.ts
```

#### 2.2 状态管理

使用 Redux Toolkit 进行状态管理：

```typescript
interface RootState {
  download: DownloadState;    // 下载相关状态
  task: TaskState;            // 任务管理状态
  ui: UIState;                // UI 状态
  preferences: PreferencesState; // 用户偏好
}
```

#### 2.3 自定义 Hooks

封装业务逻辑，提供清晰的 API：

```typescript
const {
  tasks,
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload
} = useDownloadManager();
```

### 3. 预加载脚本 (Preload Script)

安全地暴露 API 给渲染进程：

```typescript
contextBridge.exposeInMainWorld('prevideo', {
  video: {
    fetchInfo: (url: string) => ipcRenderer.invoke('video:info:fetch', { url }),
    startDownload: (url: string, options: DownloadOptions) =>
      ipcRenderer.invoke('video:download:start', { url, options }),
    onProgress: (callback: ProgressCallback) => {
      ipcRenderer.on('download:progress', (event, data) => callback(data));
      return () => ipcRenderer.removeListener('download:progress', callback);
    }
  }
});
```

## 数据流

### 下载流程

```
用户输入 URL
    ↓
VideoInputForm 组件
    ↓
调用 window.prevideo.video.fetchInfo()
    ↓
IPC: 'video:info:fetch'
    ↓
DownloaderService.fetchVideoInfo()
    ↓
YtDlpWrapper.fetchVideoInfo()
    ↓
返回 VideoInfo
    ↓
显示视频信息
    ↓
用户选择选项
    ↓
调用 window.prevideo.video.startDownload()
    ↓
IPC: 'video:download:start'
    ↓
DownloaderService.startDownload()
    ↓
创建 DownloadTask
    ↓
TaskRepository.createDownloadTask()
    ↓
YtDlpWrapper.download()
    ↓
进度更新 (IPC: 'download:progress')
    ↓
更新 UI 进度条
```

### 状态同步

```
主进程任务状态变化
    ↓
通过 IPC 发送事件
    ↓
渲染进程接收事件
    ↓
更新 Redux Store
    ↓
React 组件重新渲染
```

## 数据模型

### 核心实体

```typescript
// 视频信息
interface VideoInfo {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail?: string;
  availableFormats: VideoFormat[];
  availableSubtitles: string[];
}

// 下载任务
interface DownloadTask {
  id: string;
  type: 'download';
  url: string;
  videoInfo: VideoInfo;
  outputPath: string;
  status: TaskStatus;
  progress?: number;
  subtitles?: Subtitle[];
  metadata?: any;
}

// 处理任务
interface ProcessingTask {
  id: string;
  type: 'processing';
  processingType: 'compression' | 'subtitle_generation';
  inputPath: string;
  outputPath: string;
  status: TaskStatus;
  config: any;
}
```

### 数据持久化

使用 electron-store 进行 JSON 数据持久化：

```typescript
class Database {
  private store: Store<DatabaseSchema>;

  async getAllTasks(): Promise<Task[]> {
    return this.store.get('tasks');
  }

  async updateTask(id: string, updates: Partial<Task>) {
    const tasks = await this.getAllTasks();
    const index = tasks.findIndex(t => t.id === id);
    tasks[index] = { ...tasks[index], ...updates };
    this.store.set('tasks', tasks);
  }
}
```

## 二进制集成

### yt-dlp 封装

```typescript
class YtDlpWrapper {
  async fetchVideoInfo(url: string): Promise<VideoInfo> {
    const args = ['--dump-json', url];
    const result = await this.execute(args);
    return this.parseVideoInfo(result);
  }

  async download(url: string, options: DownloadOptions) {
    const args = this.buildArgs(url, options);
    const process = spawn(this.binaryPath, args);
    return this.handleDownloadProcess(process);
  }
}
```

### FFmpeg 封装

```typescript
class FfmpegWrapper {
  async compress(input: string, output: string, config: CompressionConfig) {
    const args = this.buildCompressionArgs(input, output, config);
    return this.execute(args);
  }

  async embedSubtitles(video: string, subtitles: string[], output: string) {
    const args = this.buildSubtitleArgs(video, subtitles, output);
    return this.execute(args);
  }
}
```

### Whisper 封装

```typescript
class WhisperWrapper {
  async generateSubtitles(audio: string, config: SubtitleConfig) {
    await this.ensureModelDownloaded(config.model);
    const args = this.buildWhisperArgs(audio, config);
    return this.execute(args);
  }
}
```

## 性能优化

### 1. 虚拟列表

大列表使用虚拟滚动：

```typescript
const { virtualItems, totalHeight, handleScroll } = useVirtualList(
  allItems,
  containerHeight,
  { itemHeight: 80, overscan: 3 }
);
```

### 2. 懒加载

图片和组件按需加载：

```typescript
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

### 3. 缓存策略

LRU 缓存频繁访问的数据：

```typescript
const cache = new LRUCache<string, VideoInfo>({
  max: 100,
  ttl: 1000 * 60 * 5 // 5 minutes
});
```

### 4. 批处理

批量处理 DOM 更新和 API 请求：

```typescript
const batcher = new DOMBatcher();
batcher.read(() => {
  // 读取 DOM
});
batcher.write(() => {
  // 写入 DOM
});
```

## 安全考虑

### 1. Context Isolation

渲染进程与主进程完全隔离：

```typescript
// 渲染进程不能直接访问 Node.js API
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  preload: path.join(__dirname, 'preload.js')
}
```

### 2. 输入验证

所有用户输入都经过验证：

```typescript
function validateUrl(url: string): boolean {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/;
  return pattern.test(url);
}
```

### 3. 沙箱运行

外部二进制文件在受限环境中运行：

```typescript
const process = spawn(binaryPath, args, {
  env: { ...process.env, PATH: '' }, // 限制环境变量
  cwd: tempDir,                      // 限制工作目录
  timeout: 30000                     // 设置超时
});
```

## 错误处理

### 错误边界

React 组件错误捕获：

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Component error:', error, errorInfo);
    this.setState({ hasError: true });
  }
}
```

### 全局错误处理

主进程未捕获异常：

```typescript
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // 优雅退出
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
```

### 用户友好的错误提示

```typescript
try {
  await downloadVideo(url);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    showNotification('网络连接失败，请检查网络设置');
  } else if (error.code === 'INVALID_URL') {
    showNotification('无效的视频链接');
  } else {
    showNotification('下载失败，请重试');
  }
}
```

## 测试策略

### 单元测试

```typescript
describe('DownloaderService', () => {
  it('should fetch video info', async () => {
    const info = await service.fetchVideoInfo(url);
    expect(info.title).toBeDefined();
  });
});
```

### 集成测试

```typescript
describe('Download Flow', () => {
  it('should download video with subtitles', async () => {
    const task = await startDownload(url, options);
    await waitForCompletion(task.id);
    expect(fs.existsSync(task.outputPath)).toBe(true);
  });
});
```

### E2E 测试

```typescript
test('Complete download workflow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('[data-testid=url-input]', videoUrl);
  await page.click('[data-testid=fetch-info]');
  await page.click('[data-testid=start-download]');
  await expect(page.locator('[data-testid=progress]')).toHaveText('100%');
});
```

## 部署架构

### 构建流程

```yaml
- 安装依赖: npm install
- 运行测试: npm test
- 构建应用: npm run build
- 打包安装程序:
  - Windows: NSIS 安装程序
  - macOS: DMG 磁盘映像
- 代码签名:
  - Windows: Authenticode
  - macOS: Developer ID
- 发布:
  - GitHub Releases
  - 自动更新服务器
```

### 自动更新

```typescript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'yourusername',
  repo: 'prevideo'
});

autoUpdater.checkForUpdatesAndNotify();
```

## 监控和日志

### 日志系统

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 性能监控

```typescript
class PerformanceMonitor {
  trackDownloadSpeed(taskId: string, bytesPerSecond: number) {
    this.metrics.set(taskId, { speed: bytesPerSecond, timestamp: Date.now() });
  }

  getAverageSpeed(): number {
    // 计算平均下载速度
  }
}
```

## 扩展性设计

### 插件系统预留

```typescript
interface Plugin {
  name: string;
  version: string;
  activate(context: PluginContext): void;
  deactivate(): void;
}

class PluginManager {
  loadPlugin(pluginPath: string): Plugin {
    // 动态加载插件
  }
}
```

### 多语言支持

```typescript
import i18n from 'i18next';

i18n.init({
  lng: 'zh-CN',
  resources: {
    'zh-CN': { translation: zhCN },
    'en': { translation: en }
  }
});
```

## 未来规划

1. **云同步**: 设置和历史记录云端同步
2. **移动端**: React Native 移动应用
3. **浏览器扩展**: 一键下载扩展
4. **AI 增强**: 智能推荐和内容识别
5. **社区功能**: 分享和协作