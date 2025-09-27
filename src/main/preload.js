const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // 事件监听
  on: (channel, callback) => {
    const validChannels = ['download-progress', 'download-complete', 'download-error',
                          'subtitle-start', 'subtitle-progress', 'subtitle-complete', 'subtitle-error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
    }
  },

  // 视频操作
  video: {
    fetchInfo: (url) => ipcRenderer.invoke('video:fetchInfo', url),
    startDownload: (options) => ipcRenderer.invoke('video:startDownload', options),
    pauseDownload: (taskId) => ipcRenderer.invoke('video:pauseDownload', taskId),
    resumeDownload: (taskId) => ipcRenderer.invoke('video:resumeDownload', taskId),
    cancelDownload: (taskId) => ipcRenderer.invoke('video:cancelDownload', taskId),
    getProgress: (taskId) => ipcRenderer.invoke('video:getProgress', taskId),
    onProgress: (callback) => {
      ipcRenderer.on('download-progress', (event, data) => callback(data));
    }
  },

  // 字幕操作
  subtitle: {
    generateAuto: (videoPath) => ipcRenderer.invoke('subtitle:generateAuto', videoPath),
    translate: (subtitlePath, targetLang) => ipcRenderer.invoke('subtitle:translate', subtitlePath, targetLang),
    mergeBilingual: (primary, secondary) => ipcRenderer.invoke('subtitle:mergeBilingual', primary, secondary),
    onProgress: (callback) => {
      ipcRenderer.on('subtitle-progress', (event, data) => callback(data));
    }
  },

  // 压缩操作
  compression: {
    compress: (videoPath, config) => ipcRenderer.invoke('compression:compress', videoPath, config),
    getPresets: () => ipcRenderer.invoke('compression:getPresets'),
    estimateSize: (videoPath, preset) => ipcRenderer.invoke('compression:estimateSize', videoPath, preset),
    onProgress: (callback) => {
      ipcRenderer.on('compression-progress', (event, data) => callback(data));
    }
  },

  // 存储操作
  storage: {
    getSettings: () => ipcRenderer.invoke('storage:getSettings'),
    updateSettings: (settings) => ipcRenderer.invoke('storage:updateSettings', settings),
    getTasks: () => ipcRenderer.invoke('storage:getTasks'),
    getTask: (taskId) => ipcRenderer.invoke('storage:getTask', taskId),
    deleteTask: (taskId) => ipcRenderer.invoke('storage:deleteTask', taskId),
    clearCompleted: () => ipcRenderer.invoke('storage:clearCompleted')
  },

  // 文件操作
  file: {
    selectDirectory: () => ipcRenderer.invoke('file:selectDirectory'),
    selectFile: (filters) => ipcRenderer.invoke('file:selectFile', filters),
    openPath: (path) => ipcRenderer.invoke('file:openPath', path),
    showInFolder: (path) => ipcRenderer.invoke('file:showInFolder', path)
  },

  // 系统操作
  system: {
    getSystemInfo: () => ipcRenderer.invoke('system:getSystemInfo'),
    checkForUpdates: () => ipcRenderer.invoke('system:checkForUpdates'),
    installUpdate: () => ipcRenderer.invoke('system:installUpdate'),
    restartApp: () => ipcRenderer.invoke('system:restartApp')
  }
});

console.log('Preload脚本已加载');