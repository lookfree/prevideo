# 🎬 PreVideo - YouTube视频下载器

<div align="center">

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey.svg)]()
  [![Electron](https://img.shields.io/badge/electron-38.1.2-47848F.svg)]()
  [![React](https://img.shields.io/badge/react-18.2.0-61DAFB.svg)]()
  [![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue.svg)]()
  [![Status](https://img.shields.io/badge/status-可用-success.svg)]()
</div>

## 📖 简介

PreVideo 是一款功能完整的YouTube视频下载桌面应用，基于Electron + React开发，支持双语字幕、视频压缩、断点续传等专业功能。项目已完成100个开发任务（T001-T100），所有功能均可正常使用。

## ✨ 主要功能

### 🎬 核心功能
- **YouTube视频下载** - 基于yt-dlp，支持高质量视频下载
- **多种质量选择** - 1080p/720p/480p/最高画质
- **实时进度显示** - 下载速度、剩余时间、百分比
- **断点续传** - 支持暂停和恢复下载
- **文件管理** - 自定义下载路径，一键打开文件夹

### 🗣️ 双语字幕
- **自动生成字幕** - 基于OpenAI Whisper AI
- **智能翻译** - 使用DeepSeek API进行高质量中文翻译
- **双语同步显示** - 中英文字幕叠加或并排
- **字幕格式** - SRT/VTT格式导出
- **语言选择** - 主语言/副语言自由配置
- **批量翻译** - 50条字幕同时翻译，提高效率

### 🗜️ 视频处理
- **视频压缩** - FFmpeg引擎，多种预设
- **格式转换** - MP4/WebM/MKV
- **压缩预设** - 高质量(CRF 18)/平衡(CRF 23)/小文件(CRF 28)
- **批量处理** - 队列任务管理

### 💡 特色功能
- **任务管理** - 下载历史、进度追踪
- **界面友好** - Material-UI深色主题
- **跨平台** - Windows/macOS桌面应用
- **中文优化** - 完整中文界面和文档

## 🚀 快速开始

### 系统要求
- Node.js >= 20.0.0
- macOS 12+ / Windows 10+
- 4GB RAM

### 安装运行

```bash
# 克隆项目
git clone https://github.com/yourusername/prevideo.git
cd prevideo

# 安装依赖
npm install

# 安装yt-dlp和ffmpeg（必需）
# macOS
brew install yt-dlp ffmpeg
# Windows
winget install yt-dlp
winget install ffmpeg

# 配置DeepSeek API（可选，用于字幕翻译）
# 在代码中设置API密钥或通过环境变量
export DEEPSEEK_API_KEY="your-api-key"

# 启动应用
npm run dev
```

### 📱 使用指南

1. **设置下载路径**
   - 点击"选择文件夹"按钮
   - 默认保存到 ~/Downloads

2. **下载视频**
   - 输入YouTube URL
   - 选择视频质量（1080p/720p/480p）
   - 点击"开始下载"
   - 实时查看进度

3. **配置字幕**
   - ✅ 双语字幕：中英文同时显示
   - ✅ 自动生成：Whisper AI生成
   - ✅ 智能翻译：DeepSeek API翻译
   - 选择主语言和副语言
   - 实时显示翻译进度

4. **查看文件**
   - 下载完成后显示文件路径
   - 点击"打开文件夹"直接访问
   - 文件名：视频标题.mp4

## 📦 构建发布

```bash
# Windows安装包
npm run build:win

# macOS应用
npm run build:mac

# 所有平台
npm run build:all
```

构建输出位于 `dist-electron/` 目录。

## 🛠️ 开发命令

```bash
# 开发模式
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化
npm run format

# 更新yt-dlp
npm run update-ytdlp
```

## 📁 项目结构

```
prevideo/
├── src/
│   ├── main/              # 主进程代码
│   │   ├── services/       # 核心服务
│   │   ├── ipc/           # IPC 处理器
│   │   ├── binaries/      # 二进制文件封装
│   │   └── database/      # 数据存储
│   ├── renderer/          # 渲染进程代码
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   └── store/         # Redux 状态管理
│   ├── preload/           # 预加载脚本
│   └── shared/            # 共享类型定义
├── tests/                 # 测试文件
├── bin/                   # 二进制依赖
│   ├── ffmpeg/           # FFmpeg
│   ├── yt-dlp/           # yt-dlp
│   └── whisper/          # Whisper.cpp
├── docs/                  # 文档
└── build/                 # 构建配置
```

## 🔧 配置

### 默认下载路径
默认保存到用户的下载文件夹，可在设置中修改。

### DeepSeek API配置
字幕翻译功能使用DeepSeek API，需要配置API密钥：

1. **获取API密钥**
   - 访问 [DeepSeek Platform](https://platform.deepseek.com/)
   - 注册并获取API密钥

2. **配置方式**
   - 方式1：直接在 `src/main/subtitle-translator.js` 中设置
   - 方式2：使用环境变量 `DEEPSEEK_API_KEY`
   - 方式3：在应用设置界面中配置（开发中）

3. **翻译特性**
   - 批量翻译：每批50条字幕同时处理
   - 实时进度：显示翻译进度 (X/Y条)
   - 高质量翻译：专业级中文翻译质量
   - 自动重试：失败自动重试机制

### 代理设置
支持 HTTP/HTTPS/SOCKS5 代理，在设置→网络中配置。

### Cookie 使用
某些视频需要登录才能下载，可以导出浏览器 Cookie 并在设置中导入。

## ⚙️ 技术栈

- **桌面框架**: Electron 38.1.2
- **前端框架**: React 18.2.0 + TypeScript 5.3.3
- **UI组件库**: Material-UI 5.18.0
- **状态管理**: Redux Toolkit 2.9.0
- **下载引擎**: yt-dlp 2025.9.5
- **视频处理**: FFmpeg
- **字幕AI**: OpenAI Whisper
- **字幕翻译**: DeepSeek API
- **数据存储**: electron-store 8.1.0
- **构建工具**: Vite 5.4.20
- **测试框架**: Jest + Playwright

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🏆 项目成果

- ✅ 完成100个开发任务（T001-T100）
- ✅ 所有核心功能正常运行
- ✅ 支持真实YouTube视频下载
- ✅ 完整的用户界面和交互
- ✅ 详细的中文文档

## ⚠️ 免责声明

本软件仅供学习和个人使用。请遵守YouTube服务条款和版权规定。下载受版权保护的内容需要获得适当授权。

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [FFmpeg](https://ffmpeg.org/) - 完整的视频处理解决方案
- [Whisper](https://github.com/openai/whisper) - OpenAI 的语音识别模型
- [DeepSeek](https://www.deepseek.com/) - 高质量中文翻译API
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- 所有贡献者和支持者

## 📮 问题反馈

- Issues: [GitHub Issues](https://github.com/yourusername/prevideo/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/prevideo/discussions)

---

<div align="center">
  🎬 <strong>PreVideo</strong> - 让YouTube视频下载更简单
  <br/>
  Made with ❤️ using Electron + React + TypeScript
</div>