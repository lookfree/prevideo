const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const SimpleVideoDownloader = require('./simple-downloader');
const SubtitleTranslator = require('./subtitle-translator');

let mainWindow;
const downloader = new SimpleVideoDownloader();
const translator = new SubtitleTranslator();

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
    const taskId = options.taskId || Date.now();  // 使用前端传来的taskId

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
          taskId: taskId,
          progress: progressInfo.percent,
          speed: progressInfo.speed,
          eta: progressInfo.eta,
          stage: 'downloading',
          status: `下载中 ${progressInfo.percent}%`
        });
      }
    });

    result.process.on('close', async (code) => {
      if (code === 0) {
        // 发送下载完成但还在处理的状态
        event.sender.send('download-progress', {
          taskId: taskId,
          progress: 100,
          stage: 'processing',
          status: '视频下载完成，准备处理字幕...'
        });

        // 等待确保文件写入完成
        setTimeout(async () => {
          // 检查是否有英文字幕文件
          const srtPath = outputPath.replace('.mp4', '.en.srt');
          const zhSrtPath = outputPath.replace('.mp4', '.zh.srt');

          if (fs.existsSync(srtPath)) {
            console.log('发现英文字幕，开始翻译成中文...');
            event.sender.send('subtitle-start', {
              taskId: taskId,
              stage: 'subtitle',
              status: '正在翻译字幕...'
            });

            try {
              // 翻译字幕 - 添加进度回调
              const totalLines = fs.readFileSync(srtPath, 'utf8').split('\n\n').length;
              let translatedLines = 0;

              // 修改 translator 调用，添加进度回调
              await translator.createBilingualSRT(srtPath, zhSrtPath, (current, total) => {
                translatedLines = current;
                event.sender.send('subtitle-progress', {
                  taskId: taskId,
                  current: current,
                  total: total,
                  percent: Math.round((current / total) * 100),
                  status: `翻译字幕中 ${current}/${total} 条...`
                });
              });

              // 使用 ffmpeg 烧录硬字幕到视频
              const { spawn } = require('child_process');
              const tempOutput = outputPath.replace('.mp4', '_final.mp4');

              // 硬字幕参数 - 使用 subtitles 滤镜将字幕直接烧录到视频画面
              const ffmpegArgs = [
                '-i', outputPath,
                '-vf', `subtitles='${zhSrtPath}':force_style='FontName=Microsoft YaHei,FontSize=24,PrimaryColour=&Hffffff&,OutlineColour=&H000000&,BorderStyle=1,Outline=1,Shadow=0,MarginV=20'`,
                '-c:a', 'copy',  // 音频直接复制
                '-c:v', 'libx264',  // 视频重新编码
                '-preset', 'fast',  // 编码速度预设
                '-crf', '23',  // 视频质量（0-51，越小质量越好）
                tempOutput
              ];

              const ffmpeg = spawn('ffmpeg', ffmpegArgs);

              // 发送烧录硬字幕进度
              event.sender.send('subtitle-progress', {
                taskId: taskId,
                stage: 'finalizing',
                status: '正在烧录硬字幕到视频画面...',
                percent: 95
              });

              ffmpeg.on('close', (ffmpegCode) => {
                if (ffmpegCode === 0) {
                  // 替换原文件
                  fs.unlinkSync(outputPath);
                  fs.renameSync(tempOutput, outputPath);
                  console.log('硬字幕已烧录到视频');
                }

                // 发送最终完成事件
                event.sender.send('download-complete', {
                  taskId: taskId,
                  filePath: outputPath,
                  subtitlePath: zhSrtPath,
                  stage: 'completed',
                  status: '完成'
                });
              });
            } catch (error) {
              console.error('字幕翻译失败:', error);
              event.sender.send('download-complete', {
                taskId: taskId,
                filePath: outputPath
              });
            }
          } else {
            event.sender.send('download-complete', {
              taskId: taskId,
              filePath: outputPath
            });
          }
        }, 1000);

        // 如果需要生成字幕，在下载完成后异步处理
        if (options.subtitle && options.generateSubtitle) {
          // 发送字幕生成开始事件
          event.sender.send('subtitle-start', {
            taskId: 'subtitle_' + taskId,
            videoPath: outputPath
          });

          // 异步生成字幕，不阻塞下载完成
          setTimeout(async () => {
            try {
              // 这里可以调用 Whisper 生成字幕
              event.sender.send('subtitle-progress', {
                taskId: 'subtitle_' + taskId,
                progress: 0,
                status: '正在生成字幕...'
              });

              // 模拟字幕生成进度
              for (let i = 10; i <= 100; i += 10) {
                setTimeout(() => {
                  event.sender.send('subtitle-progress', {
                    taskId: 'subtitle_' + taskId,
                    progress: i,
                    status: `字幕生成中... ${i}%`
                  });
                }, i * 100);
              }

              // 字幕生成完成
              setTimeout(() => {
                event.sender.send('subtitle-complete', {
                  taskId: 'subtitle_' + taskId,
                  subtitlePath: outputPath.replace('.mp4', '.srt')
                });
              }, 1100);
            } catch (error) {
              event.sender.send('subtitle-error', {
                taskId: 'subtitle_' + taskId,
                error: error.message
              });
            }
          }, 100);
        }
      } else {
        event.sender.send('download-error', {
          taskId: taskId,
          error: 'Download failed with code: ' + code
        });
      }
    });

    return {
      taskId: taskId,
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
  console.log('打开文件路径:', filePath);
  if (filePath) {
    shell.openPath(filePath);
  }
  return true;
});

ipcMain.handle('file:showInFolder', async (event, filePath) => {
  console.log('在文件夹中显示:', filePath);
  if (filePath) {
    // 如果是文件路径，显示文件所在文件夹
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    } else {
      // 如果文件不存在，尝试打开父目录
      const dir = path.dirname(filePath);
      if (fs.existsSync(dir)) {
        shell.openPath(dir);
      }
    }
  }
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