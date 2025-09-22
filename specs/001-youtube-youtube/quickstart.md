# 快速开始指南: YouTube视频下载器

## 环境准备

### 系统要求
- **操作系统**: Windows 10+ (64-bit) 或 macOS 10.14+
- **内存**: 最少4GB RAM (推荐8GB)
- **磁盘空间**: 至少500MB安装空间 + 视频存储空间
- **网络**: 稳定的互联网连接

### 开发环境要求
- Node.js 18.0+ 和 npm 9.0+
- Git
- Visual Studio Code (推荐)

## 安装步骤

### 1. 用户安装 (使用预构建版本)

#### Windows:
```bash
# 下载安装程序
# 从 GitHub Releases 下载 PreVideo-Setup-{version}.exe

# 运行安装程序
# 双击运行，按照向导完成安装

# 启动应用
# 从开始菜单或桌面快捷方式启动
```

#### macOS:
```bash
# 下载DMG文件
# 从 GitHub Releases 下载 PreVideo-{version}.dmg

# 安装应用
# 打开DMG文件，拖动应用到Applications文件夹

# 首次运行
# 可能需要在系统偏好设置中允许运行
```

### 2. 开发者安装

```bash
# 克隆仓库
git clone https://github.com/prevideo/downloader.git
cd downloader

# 安装依赖
npm install

# 下载外部二进制文件
npm run download-binaries

# 启动开发服务器
npm run dev

# 构建应用
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:all   # 所有平台
```

## 基本使用

### 场景1: 下载视频并添加双语字幕

1. **启动应用**
   - 打开PreVideo Downloader应用
   - 应用启动时间应少于2秒

2. **输入YouTube链接**
   ```
   示例: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
   - 在主界面输入框粘贴YouTube视频链接
   - 点击"获取信息"按钮

3. **选择下载选项**
   - 视频质量: 选择720p (推荐) 或其他可用质量
   - 输出格式: MP4 (默认)
   - 保存位置: 选择或使用默认下载文件夹

4. **配置字幕选项**
   - 主要语言: 中文简体
   - 次要语言: 英语
   - 布局: 上下排列
   - 如果没有可用字幕，勾选"自动生成字幕"

5. **开始下载**
   - 点击"开始下载"按钮
   - 观察进度条和下载速度
   - 预期下载速度 >5MB/s

6. **处理字幕**
   - 下载完成后自动处理字幕
   - 如需生成字幕，等待Whisper处理
   - 处理时间: 约30秒/分钟视频

7. **验证结果**
   - 点击"打开文件夹"查看下载的视频
   - 使用任意播放器播放，确认双语字幕已嵌入

### 场景2: 压缩视频文件

1. **选择已下载的视频**
   - 在历史记录中选择视频
   - 或点击"选择本地文件"

2. **配置压缩参数**
   ```
   分辨率: 480p (降低分辨率)
   比特率: 自动
   预设: medium (平衡速度和质量)
   ```

3. **预览压缩效果**
   - 查看预估文件大小
   - 原始: 500MB → 压缩后: ~150MB

4. **执行压缩**
   - 点击"开始压缩"
   - 监控进度和剩余时间

5. **验证压缩结果**
   - 对比文件大小
   - 播放确认质量可接受

### 场景3: 断点续传

1. **模拟下载中断**
   - 开始下载大文件
   - 在50%时断开网络或关闭应用

2. **恢复下载**
   - 重新打开应用
   - 在"下载管理"中找到未完成任务
   - 点击"继续下载"

3. **验证续传**
   - 确认从断点处继续
   - 不重新下载已完成部分

## 常用快捷键

| 功能 | Windows | macOS |
|------|---------|-------|
| 新建下载 | Ctrl+N | Cmd+N |
| 暂停/继续 | Space | Space |
| 打开设置 | Ctrl+, | Cmd+, |
| 退出应用 | Ctrl+Q | Cmd+Q |

## 故障排除

### 问题1: 无法获取视频信息
```bash
# 检查网络连接
ping youtube.com

# 更新yt-dlp
npm run update-ytdlp

# 查看日志
tail -f ~/Library/Application\ Support/prevideo-downloader/logs/main.log  # macOS
type %APPDATA%\prevideo-downloader\logs\main.log  # Windows
```

### 问题2: 字幕生成失败
```bash
# 检查Whisper模型文件
ls resources/binaries/whisper/models/

# 重新下载模型
npm run download-whisper-models

# 使用更小的模型
# 在设置中选择 'tiny' 或 'base' 模型
```

### 问题3: 压缩速度慢
```bash
# 检查CPU使用率
# 任务管理器 (Windows) 或 活动监视器 (macOS)

# 使用更快的预设
# 设置中选择 'ultrafast' 或 'superfast'

# 降低输出质量
# 增加CRF值 (如28-30)
```

## 性能测试

### 测试用例1: 下载速度
```bash
# 测试视频: 10分钟1080p视频
# 预期: 下载时间 <2分钟
# 实际: _____
```

### 测试用例2: 字幕生成
```bash
# 测试视频: 5分钟英语视频
# 模型: base
# 预期: 处理时间 <150秒
# 实际: _____
```

### 测试用例3: 视频压缩
```bash
# 输入: 1GB 1080p MP4
# 目标: 720p, CRF=23
# 预期: 输出 <400MB, 时间 <5分钟
# 实际: _____
```

## 命令行使用 (高级)

```bash
# 使用CLI模式
prevideo-cli download "https://youtube.com/watch?v=xxx" \
  --quality 720p \
  --subtitle en,zh-CN \
  --output ~/Downloads/

# 批量下载 (future feature)
prevideo-cli batch playlist.txt \
  --format mp4 \
  --compress

# 仅生成字幕
prevideo-cli subtitle video.mp4 \
  --language en \
  --model base \
  --output subtitle.srt
```

## API使用示例

```typescript
// 程序化使用
import { PreVideoAPI } from 'prevideo-downloader';

const api = new PreVideoAPI();

// 下载视频
const task = await api.download({
  url: 'https://youtube.com/watch?v=xxx',
  quality: '720p',
  subtitles: ['en', 'zh-CN']
});

// 监听进度
task.on('progress', (progress) => {
  console.log(`Downloaded: ${progress.percent}%`);
});

// 等待完成
await task.waitForCompletion();
```

## 更新应用

### 自动更新
- 应用会自动检查更新
- 有新版本时会提示下载
- 下载完成后重启应用即可更新

### 手动更新
```bash
# 开发版本
git pull
npm install
npm run rebuild

# 用户版本
# 从GitHub Releases下载最新版本安装包
```

## 获取帮助

- 📖 文档: https://prevideo.github.io/docs
- 🐛 报告问题: https://github.com/prevideo/downloader/issues
- 💬 讨论: https://github.com/prevideo/downloader/discussions
- 📧 邮件: support@prevideo.app

---
*快速开始指南 v1.0.0 - 2025-09-21*