/**
 * Main window manager
 */

import { BrowserWindow, screen, nativeImage, shell } from 'electron';
import * as path from 'path';

export interface WindowState {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

export class MainWindow {
  public window: BrowserWindow;
  private windowState: WindowState;

  constructor(savedState?: WindowState) {
    this.windowState = this.getWindowState(savedState);
    this.window = this.createWindow();
    this.setupEventHandlers();
  }

  private getWindowState(savedState?: WindowState): WindowState {
    const defaultState: WindowState = {
      width: 1200,
      height: 800,
      isMaximized: false
    };

    if (!savedState) {
      return defaultState;
    }

    // Validate saved state
    const workArea = screen.getPrimaryDisplay().workAreaSize;

    // Ensure window is not larger than screen
    const width = Math.min(savedState.width || defaultState.width!, workArea.width);
    const height = Math.min(savedState.height || defaultState.height!, workArea.height);

    // Ensure window is visible
    let x = savedState.x;
    let y = savedState.y;

    if (x !== undefined && y !== undefined) {
      const displays = screen.getAllDisplays();
      const visible = displays.some(display => {
        const bounds = display.bounds;
        return x! >= bounds.x &&
               x! < bounds.x + bounds.width &&
               y! >= bounds.y &&
               y! < bounds.y + bounds.height;
      });

      if (!visible) {
        x = undefined;
        y = undefined;
      }
    }

    return {
      width,
      height,
      x,
      y,
      isMaximized: savedState.isMaximized || false
    };
  }

  private createWindow(): BrowserWindow {
    // Create icon
    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    // Create window
    const window = new BrowserWindow({
      width: this.windowState.width,
      height: this.windowState.height,
      x: this.windowState.x,
      y: this.windowState.y,
      minWidth: 800,
      minHeight: 600,
      title: 'PreVideo',
      icon,
      frame: process.platform !== 'darwin',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      backgroundColor: '#1e1e1e',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: path.join(__dirname, '../preload/index.js')
      }
    });

    // Restore maximized state
    if (this.windowState.isMaximized) {
      window.maximize();
    }

    // Show window when ready
    window.once('ready-to-show', () => {
      window.show();
    });

    return window;
  }

  private getIconPath(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (process.platform === 'win32') {
      return path.join(
        isDevelopment ? __dirname : process.resourcesPath,
        'assets/icon.ico'
      );
    } else if (process.platform === 'darwin') {
      return path.join(
        isDevelopment ? __dirname : process.resourcesPath,
        'assets/icon.icns'
      );
    } else {
      return path.join(
        isDevelopment ? __dirname : process.resourcesPath,
        'assets/icon.png'
      );
    }
  }

  private setupEventHandlers(): void {
    // Handle window state changes
    this.window.on('resize', () => {
      if (!this.window.isMaximized()) {
        const bounds = this.window.getBounds();
        this.windowState.width = bounds.width;
        this.windowState.height = bounds.height;
      }
    });

    this.window.on('move', () => {
      if (!this.window.isMaximized()) {
        const bounds = this.window.getBounds();
        this.windowState.x = bounds.x;
        this.windowState.y = bounds.y;
      }
    });

    this.window.on('maximize', () => {
      this.windowState.isMaximized = true;
    });

    this.window.on('unmaximize', () => {
      this.windowState.isMaximized = false;
    });

    // Prevent navigation away from app
    this.window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('http://localhost:3000') && !url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Handle new window requests
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Handle permission requests
    this.window.webContents.session.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        const allowedPermissions = ['notifications', 'media'];

        if (allowedPermissions.includes(permission)) {
          callback(true);
        } else {
          callback(false);
        }
      }
    );

    // Dev tools security
    if (process.env.NODE_ENV !== 'development') {
      this.window.webContents.on('devtools-opened', () => {
        this.window.webContents.closeDevTools();
      });
    }
  }

  public getState(): WindowState {
    return this.windowState;
  }

  public showDevTools(): void {
    this.window.webContents.openDevTools();
  }

  public hideDevTools(): void {
    this.window.webContents.closeDevTools();
  }

  public toggleDevTools(): void {
    if (this.window.webContents.isDevToolsOpened()) {
      this.hideDevTools();
    } else {
      this.showDevTools();
    }
  }

  public reload(): void {
    this.window.webContents.reload();
  }

  public forceReload(): void {
    this.window.webContents.reloadIgnoringCache();
  }

  public toggleFullScreen(): void {
    this.window.setFullScreen(!this.window.isFullScreen());
  }

  public minimize(): void {
    this.window.minimize();
  }

  public maximize(): void {
    if (this.window.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window.maximize();
    }
  }

  public close(): void {
    this.window.close();
  }

  public focus(): void {
    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.focus();
  }

  public blur(): void {
    this.window.blur();
  }

  public center(): void {
    this.window.center();
  }

  public setProgressBar(progress: number): void {
    this.window.setProgressBar(progress);
  }

  public flashFrame(flag: boolean): void {
    this.window.flashFrame(flag);
  }

  public setOverlayIcon(overlay: nativeImage | null, description: string): void {
    if (process.platform === 'win32') {
      this.window.setOverlayIcon(overlay, description);
    }
  }

  public setThumbarButtons(buttons: Electron.ThumbarButton[]): void {
    if (process.platform === 'win32') {
      this.window.setThumbarButtons(buttons);
    }
  }

  public setRepresentedFilename(filename: string): void {
    if (process.platform === 'darwin') {
      this.window.setRepresentedFilename(filename);
    }
  }

  public setDocumentEdited(edited: boolean): void {
    if (process.platform === 'darwin') {
      this.window.setDocumentEdited(edited);
    }
  }
}