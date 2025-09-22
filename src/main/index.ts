/**
 * Main process entry point
 */

import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// Services
import { DownloaderService } from './services/downloader';
import { SubtitleService } from './services/subtitles';
import { ConverterService } from './services/converter';
import { StorageService } from './services/storage';
import { UpdateService } from './services/updater';

// IPC Handlers
import { VideoHandlers } from './ipc/video-handlers';
import { SubtitleHandlers } from './ipc/subtitle-handlers';
import { CompressionHandlers } from './ipc/compression-handlers';
import { SettingsHandlers } from './ipc/settings-handlers';
import { SystemHandlers } from './ipc/system-handlers';

// Window Manager
import { MainWindow } from './windows/main-window';
import { AppMenu } from './menu/app-menu';
import { TrayManager } from './tray/tray-manager';

class Application {
  private mainWindow: MainWindow | null = null;
  private trayManager: TrayManager | null = null;
  private services: {
    downloader: DownloaderService;
    subtitle: SubtitleService;
    converter: ConverterService;
    storage: StorageService;
    updater: UpdateService;
  } | null = null;
  private handlers: {
    video: VideoHandlers;
    subtitle: SubtitleHandlers;
    compression: CompressionHandlers;
    settings: SettingsHandlers;
    system: SystemHandlers;
  } | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Handle creating/removing shortcuts on Windows when installing/uninstalling
    if (require('electron-squirrel-startup')) {
      app.quit();
      return;
    }

    // Set application name
    app.setName('PreVideo');

    // Protocol registration
    protocol.registerSchemesAsPrivileged([
      { scheme: 'prevideo', privileges: { secure: true, standard: true } }
    ]);

    // Single instance lock
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
      return;
    }

    // Second instance handler
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (this.mainWindow?.window) {
        if (this.mainWindow.window.isMinimized()) {
          this.mainWindow.window.restore();
        }
        this.mainWindow.window.focus();
      }
    });

    // App event handlers
    this.setupAppEvents();
  }

  private setupAppEvents(): void {
    // App ready
    app.whenReady().then(() => {
      this.onAppReady();
    });

    // Window all closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Activate (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Before quit
    app.on('before-quit', async (event) => {
      // Save window state
      if (this.mainWindow?.window) {
        const bounds = this.mainWindow.window.getBounds();
        const isMaximized = this.mainWindow.window.isMaximized();

        await this.services?.storage.saveWindowState({
          ...bounds,
          isMaximized
        });
      }

      // Cleanup
      this.cleanup();
    });

    // Certificate error handler
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      // In development, ignore certificate errors
      if (this.isDevelopment()) {
        event.preventDefault();
        callback(true);
      } else {
        // In production, use default behavior
        callback(false);
      }
    });
  }

  private async onAppReady(): Promise<void> {
    // Initialize services
    this.initializeServices();

    // Initialize IPC handlers
    this.initializeHandlers();

    // Setup security
    this.setupSecurity();

    // Create app menu
    this.createAppMenu();

    // Create tray
    await this.createTray();

    // Create main window
    await this.createMainWindow();

    // Check for updates
    if (!this.isDevelopment()) {
      this.services?.updater.startAutoUpdateCheck();
    }

    // Handle protocol
    this.handleProtocol();
  }

  private initializeServices(): void {
    const storage = new StorageService();
    const downloader = new DownloaderService();
    const subtitle = new SubtitleService();
    const converter = new ConverterService();
    const updater = new UpdateService(storage);

    this.services = {
      downloader,
      subtitle,
      converter,
      storage,
      updater
    };
  }

  private initializeHandlers(): void {
    if (!this.services) return;

    this.handlers = {
      video: new VideoHandlers(this.services.downloader, this.services.storage),
      subtitle: new SubtitleHandlers(this.services.subtitle, this.services.storage),
      compression: new CompressionHandlers(this.services.converter, this.services.storage),
      settings: new SettingsHandlers(this.services.storage, this.services.updater),
      system: new SystemHandlers()
    };
  }

  private setupSecurity(): void {
    // Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.github.com"
          ].join('; ')
        }
      });
    });

    // Disable remote module
    app.commandLine.appendSwitch('disable-remote-module', 'true');

    // Disable node integration in renderer
    app.commandLine.appendSwitch('disable-node-integration-in-worker', 'true');
  }

  private createAppMenu(): void {
    new AppMenu(this);
  }

  private async createTray(): Promise<void> {
    const preferences = await this.services?.storage.getPreferences();
    if (preferences?.minimizeToTray) {
      this.trayManager = new TrayManager(this);
    }
  }

  private async createMainWindow(): Promise<void> {
    // Get saved window state
    const windowState = await this.services?.storage.getWindowState();

    this.mainWindow = new MainWindow(windowState);

    // Load the app
    if (this.isDevelopment()) {
      // In development, load from webpack dev server
      await this.mainWindow.window.loadURL('http://localhost:3000');
      this.mainWindow.window.webContents.openDevTools();
    } else {
      // In production, load from file
      const indexPath = path.join(__dirname, '../renderer/index.html');
      await this.mainWindow.window.loadURL(pathToFileURL(indexPath).toString());
    }

    // Handle window closed
    this.mainWindow.window.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle minimize to tray
    this.mainWindow.window.on('minimize', async (event: any) => {
      const preferences = await this.services?.storage.getPreferences();
      if (preferences?.minimizeToTray && this.trayManager) {
        event.preventDefault();
        this.mainWindow?.window.hide();
      }
    });

    // Handle close to tray
    this.mainWindow.window.on('close', async (event: any) => {
      if (process.platform !== 'darwin') {
        const preferences = await this.services?.storage.getPreferences();
        if (preferences?.minimizeToTray && this.trayManager && !app.isQuitting) {
          event.preventDefault();
          this.mainWindow?.window.hide();
        }
      }
    });

    // Update handler
    this.services?.updater.on('update-downloaded', (updateInfo: any) => {
      this.mainWindow?.window.webContents.send('update-downloaded', updateInfo);
    });
  }

  private handleProtocol(): void {
    // Handle prevideo:// protocol
    protocol.registerFileProtocol('prevideo', (request, callback) => {
      const url = request.url.substr(10); // Remove 'prevideo://'
      const filePath = path.normalize(path.join(__dirname, '../renderer', url));

      if (filePath.startsWith(path.join(__dirname, '../renderer'))) {
        callback({ path: filePath });
      } else {
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    });
  }

  private cleanup(): void {
    // Cleanup handlers
    if (this.handlers) {
      this.handlers.video.destroy();
      this.handlers.subtitle.destroy();
      this.handlers.compression.destroy();
      this.handlers.settings.destroy();
      this.handlers.system.destroy();
    }

    // Cleanup services
    if (this.services) {
      this.services.updater.stopAutoUpdateCheck();
    }

    // Cleanup tray
    this.trayManager?.destroy();
  }

  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  // Public methods for menu/tray access
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow?.window || null;
  }

  public showMainWindow(): void {
    if (this.mainWindow?.window) {
      if (this.mainWindow.window.isMinimized()) {
        this.mainWindow.window.restore();
      }
      this.mainWindow.window.show();
      this.mainWindow.window.focus();
    } else {
      this.createMainWindow();
    }
  }

  public quitApp(): void {
    app.isQuitting = true;
    app.quit();
  }

  public async checkForUpdates(): Promise<void> {
    await this.services?.updater.checkForUpdates();
  }

  public openPreferences(): void {
    this.mainWindow?.window.webContents.send('open-preferences');
  }

  public openAbout(): void {
    this.mainWindow?.window.webContents.send('open-about');
  }
}

// Extend app with custom property
declare module 'electron' {
  interface App {
    isQuitting: boolean;
  }
}

app.isQuitting = false;

// Create application instance
const application = new Application();

// Export for menu/tray access
export default application;