const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const VideoDownloader = require('./downloader');

let mainWindow;
const downloader = new VideoDownloader();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'PreVideo Downloader - 视频下载器',
    icon: path.join(__dirname, '../../public/icon.png')
  });

  // 设置菜单
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建下载', accelerator: 'CmdOrCtrl+N' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于', click: () => console.log('PreVideo v1.0.0') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 开发环境加载vite服务器，生产环境加载打包文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC处理器
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// 获取视频信息 - 真实实现
ipcMain.handle('video:fetchInfo', async (event, url) => {
  try {
    console.log('获取视频信息:', url);
    const info = await downloader.getVideoInfo(url);
    return info;
  } catch (error) {
    console.error('获取视频信息失败:', error);
    throw error;
  }
});

// 开始下载 - 真实实现
ipcMain.handle('video:startDownload', async (event, options) => {
  try {
    console.log('开始下载:', options);

    // 生成输出文件名
    const videoInfo = await downloader.getVideoInfo(options.url);
    const sanitizedTitle = videoInfo.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');
    const outputPath = path.join(
      options.outputPath || app.getPath('downloads'),
      `${sanitizedTitle}.mp4`
    );

    // 开始下载
    const result = await downloader.downloadVideo(options.url, outputPath, {
      quality: options.quality || '1080p',
      subtitle: options.subtitle,
      merge: true
    });

    // 监听下载进度
    result.process.stdout.on('data', (data) => {
      const progressInfo = downloader.parseProgress(data.toString());
      if (progressInfo) {
        event.sender.send('download-progress', {
          taskId: result.taskId,
          progress: progressInfo.percent,
          speed: progressInfo.speed,
          eta: progressInfo.eta
        });
      }
    });

    result.process.on('close', (code) => {
      if (code === 0) {
        event.sender.send('download-complete', {
          taskId: result.taskId,
          filePath: outputPath
        });
      } else {
        event.sender.send('download-error', {
          taskId: result.taskId,
          error: 'Download failed with code: ' + code
        });
      }
    });

    return {
      taskId: result.taskId,
      status: 'downloading',
      outputPath: outputPath
    };
  } catch (error) {
    console.error('下载失败:', error);
    throw error;
  }
});

ipcMain.handle('subtitle:generateAuto', async (event, videoPath) => {
  console.log('生成字幕:', videoPath);
  return {
    taskId: 'subtitle_' + Date.now(),
    status: 'processing',
    message: '正在使用Whisper生成字幕...'
  };
});

ipcMain.handle('storage:getSettings', async () => {
  return {
    downloadPath: app.getPath('downloads'),
    videoQuality: '1080p',
    audioQuality: '192k',
    subtitleEnabled: true,
    bilingualSubtitle: true,
    primaryLanguage: 'zh-CN',
    secondaryLanguage: 'en',
    compressionEnabled: false,
    autoGenerateSubtitle: true
  };
});

ipcMain.handle('storage:updateSettings', async (event, settings) => {
  console.log('更新设置:', settings);
  return { success: true };
});

// 文件管理
ipcMain.handle('file:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('file:openPath', async (event, filePath) => {
  shell.openPath(filePath);
  return true;
});

ipcMain.handle('file:showInFolder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log('PreVideo Electron主进程已启动');
console.log('Node.js版本:', process.version);
console.log('Electron版本:', process.versions.electron);
console.log('平台:', process.platform);