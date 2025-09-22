/**
 * Application menu
 */

import { Menu, MenuItemConstructorOptions, shell, app, dialog, BrowserWindow } from 'electron';
import application from '../index';

export class AppMenu {
  private menu: Menu;

  constructor(app: any) {
    this.menu = this.createMenu();
    Menu.setApplicationMenu(this.menu);
  }

  private createMenu(): Menu {
    const isMac = process.platform === 'darwin';
    const isDev = process.env.NODE_ENV === 'development';

    const template: MenuItemConstructorOptions[] = [
      // macOS app menu
      ...(isMac ? [{
        label: app.getName(),
        submenu: [
          { label: `关于 ${app.getName()}`, role: 'about' as const },
          { type: 'separator' as const },
          { label: '偏好设置', accelerator: 'Cmd+,', click: () => this.openPreferences() },
          { type: 'separator' as const },
          { label: '服务', role: 'services' as const, submenu: [] },
          { type: 'separator' as const },
          { label: `隐藏 ${app.getName()}`, accelerator: 'Cmd+H', role: 'hide' as const },
          { label: '隐藏其他', accelerator: 'Cmd+Shift+H', role: 'hideOthers' as const },
          { label: '显示全部', role: 'unhide' as const },
          { type: 'separator' as const },
          { label: '退出', accelerator: 'Cmd+Q', role: 'quit' as const }
        ]
      }] : []),

      // File menu
      {
        label: '文件',
        submenu: [
          {
            label: '新建下载',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.newDownload()
          },
          {
            label: '打开视频',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openVideo()
          },
          { type: 'separator' },
          {
            label: '导入链接列表',
            click: () => this.importLinks()
          },
          {
            label: '导出下载历史',
            click: () => this.exportHistory()
          },
          { type: 'separator' },
          ...(isMac ? [] : [
            { label: '设置', accelerator: 'Ctrl+,', click: () => this.openPreferences() },
            { type: 'separator' as const },
            { label: '退出', accelerator: 'Ctrl+Q', role: 'quit' as const }
          ])
        ]
      },

      // Edit menu
      {
        label: '编辑',
        submenu: [
          { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
          ...(isMac ? [
            { label: '粘贴并匹配样式', accelerator: 'Shift+Cmd+V', role: 'pasteAndMatchStyle' as const },
            { label: '删除', role: 'delete' as const },
            { label: '全选', accelerator: 'Cmd+A', role: 'selectAll' as const }
          ] : [
            { label: '删除', role: 'delete' as const },
            { type: 'separator' as const },
            { label: '全选', accelerator: 'Ctrl+A', role: 'selectAll' as const }
          ])
        ]
      },

      // View menu
      {
        label: '查看',
        submenu: [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools', visible: isDev },
          { type: 'separator' },
          { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
          { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { type: 'separator' },
          { label: '切换全屏', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', role: 'togglefullscreen' }
        ]
      },

      // Downloads menu
      {
        label: '下载',
        submenu: [
          {
            label: '开始所有',
            click: () => this.startAllDownloads()
          },
          {
            label: '暂停所有',
            click: () => this.pauseAllDownloads()
          },
          {
            label: '取消所有',
            click: () => this.cancelAllDownloads()
          },
          { type: 'separator' },
          {
            label: '清除已完成',
            click: () => this.clearCompleted()
          },
          {
            label: '打开下载目录',
            click: () => this.openDownloadFolder()
          }
        ]
      },

      // Tools menu
      {
        label: '工具',
        submenu: [
          {
            label: '视频压缩',
            click: () => this.openCompressionTool()
          },
          {
            label: '字幕生成',
            click: () => this.openSubtitleGenerator()
          },
          {
            label: '格式转换',
            click: () => this.openFormatConverter()
          },
          { type: 'separator' },
          {
            label: '批量下载',
            click: () => this.openBatchDownload()
          },
          {
            label: '播放列表下载',
            click: () => this.openPlaylistDownload()
          }
        ]
      },

      // Window menu
      {
        label: '窗口',
        submenu: [
          { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
          ...(isMac ? [
            { label: '关闭', accelerator: 'Cmd+W', role: 'close' as const },
            { label: '缩放', role: 'zoom' as const },
            { type: 'separator' as const },
            { label: '置于前面', role: 'front' as const }
          ] : [
            { label: '关闭', accelerator: 'Ctrl+W', role: 'close' as const }
          ])
        ]
      },

      // Help menu
      {
        label: '帮助',
        submenu: [
          {
            label: '用户手册',
            click: () => this.openUserManual()
          },
          {
            label: '快捷键',
            click: () => this.showShortcuts()
          },
          { type: 'separator' },
          {
            label: '报告问题',
            click: () => shell.openExternal('https://github.com/yourusername/prevideo/issues')
          },
          {
            label: '查看日志',
            click: () => this.openLogs()
          },
          { type: 'separator' },
          {
            label: '检查更新',
            click: () => this.checkForUpdates()
          },
          ...(isMac ? [] : [
            { type: 'separator' as const },
            { label: `关于 ${app.getName()}`, click: () => this.showAbout() }
          ])
        ]
      }
    ];

    return Menu.buildFromTemplate(template);
  }

  // Menu actions
  private openPreferences(): void {
    application.openPreferences();
  }

  private newDownload(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:new-download');
  }

  private openVideo(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-video');
  }

  private importLinks(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:import-links');
  }

  private exportHistory(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:export-history');
  }

  private startAllDownloads(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:start-all-downloads');
  }

  private pauseAllDownloads(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:pause-all-downloads');
  }

  private cancelAllDownloads(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:cancel-all-downloads');
  }

  private clearCompleted(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:clear-completed');
  }

  private openDownloadFolder(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-download-folder');
  }

  private openCompressionTool(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-compression-tool');
  }

  private openSubtitleGenerator(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-subtitle-generator');
  }

  private openFormatConverter(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-format-converter');
  }

  private openBatchDownload(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-batch-download');
  }

  private openPlaylistDownload(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-playlist-download');
  }

  private openUserManual(): void {
    shell.openExternal('https://github.com/yourusername/prevideo/wiki');
  }

  private showShortcuts(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:show-shortcuts');
  }

  private openLogs(): void {
    const window = BrowserWindow.getFocusedWindow();
    window?.webContents.send('menu:open-logs');
  }

  private checkForUpdates(): void {
    application.checkForUpdates();
  }

  private showAbout(): void {
    dialog.showMessageBox({
      type: 'info',
      title: `关于 ${app.getName()}`,
      message: app.getName(),
      detail: `版本: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}\n\n一个功能强大的YouTube视频下载器，支持双语字幕和视频压缩。`,
      buttons: ['确定'],
      icon: null
    });
  }
}