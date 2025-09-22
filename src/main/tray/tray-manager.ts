/**
 * System tray manager
 */

import { Tray, Menu, MenuItemConstructorOptions, nativeImage, app } from 'electron';
import * as path from 'path';
import application from '../index';

export class TrayManager {
  private tray: Tray | null = null;
  private contextMenu: Menu | null = null;
  private app: any;

  constructor(app: any) {
    this.app = app;
    this.createTray();
  }

  private createTray(): void {
    // Create tray icon
    const iconPath = this.getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    // Resize icon for tray (16x16 on Windows, 22x22 on macOS)
    const trayIcon = icon.resize({
      width: process.platform === 'darwin' ? 22 : 16,
      height: process.platform === 'darwin' ? 22 : 16
    });

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('PreVideo - YouTube视频下载器');

    // Create context menu
    this.updateContextMenu();

    // Set event handlers
    this.setupEventHandlers();
  }

  private getTrayIconPath(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const iconName = process.platform === 'win32' ? 'tray.ico' : 'tray.png';

    return path.join(
      isDevelopment ? __dirname : process.resourcesPath,
      'assets',
      iconName
    );
  }

  private updateContextMenu(downloadStatus?: string): void {
    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: 'PreVideo',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: '显示主窗口',
        click: () => this.showMainWindow()
      },
      {
        type: 'separator'
      },
      {
        label: '新建下载',
        click: () => this.newDownload()
      },
      {
        label: '打开下载目录',
        click: () => this.openDownloadFolder()
      },
      {
        type: 'separator'
      }
    ];

    // Add download status if provided
    if (downloadStatus) {
      menuTemplate.push(
        {
          label: downloadStatus,
          enabled: false
        },
        {
          type: 'separator'
        }
      );
    }

    // Add download controls
    menuTemplate.push(
      {
        label: '下载控制',
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
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        label: '设置',
        click: () => this.openPreferences()
      },
      {
        type: 'separator'
      },
      {
        label: '退出',
        click: () => this.quitApp()
      }
    );

    this.contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray?.setContextMenu(this.contextMenu);
  }

  private setupEventHandlers(): void {
    if (!this.tray) return;

    // Click event
    this.tray.on('click', () => {
      if (process.platform !== 'darwin') {
        this.toggleMainWindow();
      }
    });

    // Double click event (Windows)
    if (process.platform === 'win32') {
      this.tray.on('double-click', () => {
        this.showMainWindow();
      });
    }

    // Right click event (handled by context menu)
    this.tray.on('right-click', () => {
      // Context menu is automatically shown
    });

    // Balloon click event (Windows)
    if (process.platform === 'win32') {
      this.tray.on('balloon-click', () => {
        this.showMainWindow();
      });
    }
  }

  // Public methods
  public updateProgress(progress: number): void {
    if (!this.tray) return;

    // Update tooltip
    this.tray.setToolTip(`PreVideo - 下载进度: ${progress}%`);

    // Update context menu with progress
    this.updateContextMenu(`下载进度: ${progress}%`);

    // On macOS, we can show progress in the dock icon
    if (process.platform === 'darwin') {
      app.dock.setBadge(progress < 100 ? `${progress}%` : '');
    }
  }

  public updateDownloadCount(count: number): void {
    if (!this.tray) return;

    if (count > 0) {
      this.tray.setToolTip(`PreVideo - ${count} 个任务进行中`);
      this.updateContextMenu(`${count} 个任务进行中`);

      // Update badge
      if (process.platform === 'darwin') {
        app.dock.setBadge(count.toString());
      } else if (process.platform === 'win32') {
        // Windows overlay icon
        const window = application.getMainWindow();
        if (window) {
          const badgeIcon = this.createBadgeIcon(count);
          window.setOverlayIcon(badgeIcon, `${count} 个下载任务`);
        }
      }
    } else {
      this.resetStatus();
    }
  }

  public showNotification(title: string, message: string): void {
    if (!this.tray) return;

    if (process.platform === 'win32') {
      // Windows balloon notification
      this.tray.displayBalloon({
        title,
        content: message,
        icon: nativeImage.createFromPath(this.getTrayIconPath())
      });
    } else {
      // Use Electron notification API for other platforms
      const { Notification } = require('electron');
      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body: message,
          icon: this.getTrayIconPath()
        });
        notification.show();
      }
    }
  }

  public setImage(imagePath: string): void {
    if (!this.tray) return;

    const icon = nativeImage.createFromPath(imagePath);
    this.tray.setImage(icon);
  }

  public resetStatus(): void {
    if (!this.tray) return;

    this.tray.setToolTip('PreVideo - YouTube视频下载器');
    this.updateContextMenu();

    // Clear badges
    if (process.platform === 'darwin') {
      app.dock.setBadge('');
    } else if (process.platform === 'win32') {
      const window = application.getMainWindow();
      if (window) {
        window.setOverlayIcon(null, '');
      }
    }
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  // Private action methods
  private showMainWindow(): void {
    application.showMainWindow();
  }

  private toggleMainWindow(): void {
    const window = application.getMainWindow();
    if (window) {
      if (window.isVisible()) {
        window.hide();
      } else {
        this.showMainWindow();
      }
    } else {
      this.showMainWindow();
    }
  }

  private newDownload(): void {
    this.showMainWindow();
    const window = application.getMainWindow();
    window?.webContents.send('tray:new-download');
  }

  private openDownloadFolder(): void {
    const window = application.getMainWindow();
    window?.webContents.send('tray:open-download-folder');
  }

  private startAllDownloads(): void {
    const window = application.getMainWindow();
    window?.webContents.send('tray:start-all-downloads');
  }

  private pauseAllDownloads(): void {
    const window = application.getMainWindow();
    window?.webContents.send('tray:pause-all-downloads');
  }

  private cancelAllDownloads(): void {
    const window = application.getMainWindow();
    window?.webContents.send('tray:cancel-all-downloads');
  }

  private openPreferences(): void {
    this.showMainWindow();
    application.openPreferences();
  }

  private quitApp(): void {
    application.quitApp();
  }

  private createBadgeIcon(count: number): nativeImage {
    // Create a simple badge icon with the count
    // In a real implementation, this would generate an actual image
    const size = 16;
    const canvas = require('canvas');
    const ctx = canvas.createCanvas(size, size).getContext('2d');

    // Draw circle
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count.toString(), size / 2, size / 2);

    const buffer = canvas.toBuffer('image/png');
    return nativeImage.createFromBuffer(buffer);
  }
}