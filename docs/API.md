# API 文档

## IPC 通道

PreVideo 使用 Electron 的 IPC (Inter-Process Communication) 机制进行主进程和渲染进程之间的通信。

### 视频操作

#### `video:info:fetch`
获取视频信息

**请求参数：**
```typescript
{
  url: string;  // 视频 URL
}
```

**响应：**
```typescript
{
  success: boolean;
  data?: VideoInfo;
  error?: string;
}
```

#### `video:download:start`
开始下载视频

**请求参数：**
```typescript
{
  url: string;
  options: DownloadOptions;
}

interface DownloadOptions {
  quality?: string;           // 视频质量
  outputPath: string;         // 输出路径
  filename?: string;          // 文件名
  subtitleLanguages?: string[]; // 字幕语言
  preferredFormat?: string;   // 首选格式
}
```

**响应：**
```typescript
{
  success: boolean;
  data?: DownloadTask;
  error?: string;
}
```

#### `video:download:pause`
暂停下载

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `video:download:resume`
恢复下载

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `video:download:cancel`
取消下载

**请求参数：**
```typescript
{
  taskId: string;
}
```

### 字幕操作

#### `subtitle:generate`
生成字幕

**请求参数：**
```typescript
{
  videoPath: string;
  config: SubtitleConfig;
}

interface SubtitleConfig {
  autoGenerate: boolean;
  language: string;
  targetLanguage?: string;
  whisperModel: WhisperModel;
  format: 'srt' | 'vtt' | 'ass';
}
```

**响应：**
```typescript
{
  success: boolean;
  data?: GeneratedSubtitle[];
  error?: string;
}
```

#### `subtitle:embed`
嵌入字幕

**请求参数：**
```typescript
{
  videoPath: string;
  subtitlePaths: string[];
  outputPath: string;
}
```

### 压缩操作

#### `compress:start`
开始压缩

**请求参数：**
```typescript
{
  inputPath: string;
  outputPath: string;
  config: CompressionConfig;
}

interface CompressionConfig {
  preset: CompressionPreset;
  videoBitrate?: number;
  audioBitrate?: number;
  resolution?: string;
  fps?: number;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
}
```

#### `compress:cancel`
取消压缩

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `compress:estimate`
估算压缩后大小

**请求参数：**
```typescript
{
  inputPath: string;
  config: CompressionConfig;
}
```

### 任务管理

#### `tasks:getAll`
获取所有任务

**响应：**
```typescript
{
  success: boolean;
  data?: (DownloadTask | ProcessingTask)[];
  error?: string;
}
```

#### `tasks:pause`
暂停任务

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `tasks:resume`
恢复任务

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `tasks:cancel`
取消任务

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `tasks:retry`
重试任务

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `tasks:remove`
移除任务

**请求参数：**
```typescript
{
  taskId: string;
}
```

#### `tasks:clearCompleted`
清除已完成任务

### 设置管理

#### `settings:get`
获取设置

**响应：**
```typescript
{
  success: boolean;
  data?: UserPreferences;
  error?: string;
}
```

#### `settings:update`
更新设置

**请求参数：**
```typescript
{
  preferences: Partial<UserPreferences>;
}
```

#### `settings:reset`
重置设置

#### `settings:export`
导出设置

**响应：**
```typescript
{
  success: boolean;
  data?: string;  // 导出文件路径
  error?: string;
}
```

#### `settings:import`
导入设置

**响应：**
```typescript
{
  success: boolean;
  data?: UserPreferences;
  error?: string;
}
```

### 系统操作

#### `system:openPath`
打开文件或文件夹

**请求参数：**
```typescript
{
  path: string;
}
```

#### `system:selectDirectory`
选择目录

**响应：**
```typescript
{
  success: boolean;
  data?: string;  // 选择的目录路径
  error?: string;
}
```

#### `system:selectFile`
选择文件

**请求参数：**
```typescript
{
  filters?: {
    name: string;
    extensions: string[];
  }[];
}
```

#### `system:readClipboard`
读取剪贴板

**响应：**
```typescript
{
  success: boolean;
  data?: {
    text?: string;
    image?: string;  // Base64
  };
  error?: string;
}
```

#### `system:writeClipboard`
写入剪贴板

**请求参数：**
```typescript
{
  text?: string;
  image?: string;  // Base64
}
```

## 事件监听

### 进度更新
```typescript
window.prevideo.video.onProgress((data: {
  taskId: string;
  progress: number;
  speed?: number;
  eta?: number;
}) => {
  // 处理进度更新
});
```

### 任务状态更新
```typescript
window.prevideo.tasks.onStatusChange((data: {
  taskId: string;
  status: TaskStatus;
}) => {
  // 处理状态变化
});
```

## 类型定义

### VideoInfo
```typescript
interface VideoInfo {
  id: string;
  title: string;
  author: string;
  duration: number;
  thumbnail?: string;
  description?: string;
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
  availableFormats: VideoFormat[];
  availableSubtitles: string[];
}
```

### DownloadTask
```typescript
interface DownloadTask {
  id: string;
  type: 'download';
  url: string;
  videoInfo: VideoInfo;
  outputPath: string;
  status: TaskStatus;
  progress?: number;
  speed?: number;
  eta?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  startTime: number;
  endTime?: number;
  lastError?: string;
  resumable: boolean;
}
```

### TaskStatus
```typescript
type TaskStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### UserPreferences
```typescript
interface UserPreferences {
  defaultOutputPath: string;
  defaultQuality: string;
  defaultFormat: string;
  autoStartDownload: boolean;
  maxConcurrentDownloads: number;
  enableResume: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  showNotifications: boolean;
  subtitleConfig?: SubtitleConfig;
  compressionConfig?: CompressionConfig;
  proxy?: ProxyConfig;
}
```

## 错误处理

所有 API 调用都返回统一的响应格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

错误代码：

- `INVALID_URL` - 无效的 URL
- `NETWORK_ERROR` - 网络错误
- `FILE_NOT_FOUND` - 文件不存在
- `PERMISSION_DENIED` - 权限不足
- `TASK_NOT_FOUND` - 任务不存在
- `OPERATION_CANCELLED` - 操作已取消
- `INSUFFICIENT_SPACE` - 磁盘空间不足
- `UNSUPPORTED_FORMAT` - 不支持的格式

## 使用示例

### 下载视频
```typescript
// 获取视频信息
const infoResult = await window.prevideo.video.fetchInfo('https://youtube.com/watch?v=xxx');

if (infoResult.success) {
  // 开始下载
  const downloadResult = await window.prevideo.video.startDownload(
    'https://youtube.com/watch?v=xxx',
    {
      quality: '1080p',
      outputPath: '/downloads',
      subtitleLanguages: ['en', 'zh-CN']
    }
  );

  if (downloadResult.success) {
    // 监听进度
    const unsubscribe = window.prevideo.video.onProgress((data) => {
      console.log(`Progress: ${data.progress}%`);
    });
  }
}
```

### 生成字幕
```typescript
const result = await window.prevideo.subtitle.generate('/path/to/video.mp4', {
  autoGenerate: true,
  language: 'auto',
  targetLanguage: 'zh-CN',
  whisperModel: WhisperModel.BASE,
  format: 'srt'
});

if (result.success) {
  console.log('Generated subtitles:', result.data);
}
```

### 压缩视频
```typescript
const result = await window.prevideo.compression.compress(
  '/path/to/input.mp4',
  '/path/to/output.mp4',
  {
    preset: CompressionPreset.BALANCED,
    videoCodec: VideoCodec.H264,
    audioCodec: AudioCodec.AAC
  }
);

if (result.success) {
  console.log('Compression completed:', result.data);
}
```