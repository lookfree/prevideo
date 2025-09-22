/**
 * Settings-related IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent, app, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService } from '../services/storage';
import { UpdateService } from '../services/updater';
import {
  UserPreferences,
  AppSettings,
  StorageStats,
  DEFAULT_PREFERENCES
} from '../../shared/types/preferences';

export class SettingsHandlers {
  private storageService: StorageService;
  private updateService: UpdateService;

  constructor(storageService: StorageService, updateService: UpdateService) {
    this.storageService = storageService;
    this.updateService = updateService;
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Get user preferences
    ipcMain.handle('settings:preferences:get', async (event: IpcMainInvokeEvent) => {
      try {
        const preferences = await this.storageService.getPreferences();
        return { success: true, data: preferences };
      } catch (error: any) {
        console.error('Failed to get preferences:', error);
        return { success: false, error: error.message };
      }
    });

    // Save user preferences
    ipcMain.handle('settings:preferences:save', async (
      event: IpcMainInvokeEvent,
      preferences: Partial<UserPreferences>
    ) => {
      try {
        // Validate paths
        if (preferences.defaultOutputPath) {
          if (!fs.existsSync(preferences.defaultOutputPath)) {
            fs.mkdirSync(preferences.defaultOutputPath, { recursive: true });
          }
        }

        await this.storageService.savePreferences(preferences);

        // Apply theme if changed
        if (preferences.theme) {
          this.applyTheme(preferences.theme);
        }

        // Apply language if changed
        if (preferences.language) {
          this.applyLanguage(preferences.language);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to save preferences:', error);
        return { success: false, error: error.message };
      }
    });

    // Reset preferences to defaults
    ipcMain.handle('settings:preferences:reset', async (event: IpcMainInvokeEvent) => {
      try {
        await this.storageService.savePreferences(DEFAULT_PREFERENCES);
        return { success: true, data: DEFAULT_PREFERENCES };
      } catch (error: any) {
        console.error('Failed to reset preferences:', error);
        return { success: false, error: error.message };
      }
    });

    // Select output directory
    ipcMain.handle('settings:select-directory', async (event: IpcMainInvokeEvent) => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: '选择下载目录',
          buttonLabel: '选择'
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, data: result.filePaths[0] };
        }

        return { success: false, error: 'No directory selected' };
      } catch (error: any) {
        console.error('Failed to select directory:', error);
        return { success: false, error: error.message };
      }
    });

    // Get app settings
    ipcMain.handle('settings:app:get', async (event: IpcMainInvokeEvent) => {
      try {
        const settings = await this.storageService.getAppSettings();
        return { success: true, data: settings };
      } catch (error: any) {
        console.error('Failed to get app settings:', error);
        return { success: false, error: error.message };
      }
    });

    // Update app settings
    ipcMain.handle('settings:app:update', async (
      event: IpcMainInvokeEvent,
      settings: Partial<AppSettings>
    ) => {
      try {
        await this.storageService.updateAppSettings(settings);

        // Apply auto-update settings if changed
        if (settings.autoUpdate !== undefined || settings.updateChannel !== undefined) {
          await this.updateService.setUpdateSettings({
            autoDownload: settings.autoUpdate,
            updateChannel: settings.updateChannel
          });

          if (settings.autoUpdate) {
            this.updateService.startAutoUpdateCheck();
          } else {
            this.updateService.stopAutoUpdateCheck();
          }
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to update app settings:', error);
        return { success: false, error: error.message };
      }
    });

    // Get storage statistics
    ipcMain.handle('settings:storage:stats', async (event: IpcMainInvokeEvent) => {
      try {
        const stats = await this.storageService.getStorageStats();
        return { success: true, data: stats };
      } catch (error: any) {
        console.error('Failed to get storage stats:', error);
        return { success: false, error: error.message };
      }
    });

    // Clear cache
    ipcMain.handle('settings:storage:clear-cache', async (event: IpcMainInvokeEvent) => {
      try {
        await this.storageService.clearCache();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to clear cache:', error);
        return { success: false, error: error.message };
      }
    });

    // Clear all data
    ipcMain.handle('settings:storage:clear-all', async (event: IpcMainInvokeEvent) => {
      try {
        const result = await dialog.showMessageBox({
          type: 'warning',
          title: '清除所有数据',
          message: '确定要清除所有数据吗？这将删除所有下载历史、设置和缓存。',
          buttons: ['取消', '清除'],
          defaultId: 0,
          cancelId: 0
        });

        if (result.response === 1) {
          await this.storageService.clearAllData();
          return { success: true };
        }

        return { success: false, error: 'User cancelled' };
      } catch (error: any) {
        console.error('Failed to clear all data:', error);
        return { success: false, error: error.message };
      }
    });

    // Export data
    ipcMain.handle('settings:data:export', async (event: IpcMainInvokeEvent) => {
      try {
        const result = await dialog.showSaveDialog({
          title: '导出数据',
          defaultPath: `prevideo-data-${Date.now()}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const data = await this.storageService.exportData();
          fs.writeFileSync(result.filePath, data, 'utf-8');
          return { success: true, data: result.filePath };
        }

        return { success: false, error: 'Export cancelled' };
      } catch (error: any) {
        console.error('Failed to export data:', error);
        return { success: false, error: error.message };
      }
    });

    // Import data
    ipcMain.handle('settings:data:import', async (event: IpcMainInvokeEvent) => {
      try {
        const result = await dialog.showOpenDialog({
          title: '导入数据',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const data = fs.readFileSync(result.filePaths[0], 'utf-8');
          await this.storageService.importData(data);
          return { success: true };
        }

        return { success: false, error: 'Import cancelled' };
      } catch (error: any) {
        console.error('Failed to import data:', error);
        return { success: false, error: error.message };
      }
    });

    // Set proxy
    ipcMain.handle('settings:proxy:set', async (
      event: IpcMainInvokeEvent,
      proxyUrl: string | null
    ) => {
      try {
        const preferences = await this.storageService.getPreferences();

        if (proxyUrl) {
          app.commandLine.appendSwitch('proxy-server', proxyUrl);
          preferences.proxyEnabled = true;
          preferences.proxyUrl = proxyUrl;
        } else {
          app.commandLine.removeSwitch('proxy-server');
          preferences.proxyEnabled = false;
          preferences.proxyUrl = undefined;
        }

        await this.storageService.savePreferences(preferences);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to set proxy:', error);
        return { success: false, error: error.message };
      }
    });

    // Get system info
    ipcMain.handle('settings:system:info', async (event: IpcMainInvokeEvent) => {
      try {
        const systemInfo = {
          appVersion: app.getVersion(),
          electronVersion: process.versions.electron,
          nodeVersion: process.versions.node,
          chromiumVersion: process.versions.chrome,
          platform: process.platform,
          arch: process.arch,
          cpus: require('os').cpus().length,
          totalMemory: require('os').totalmem(),
          freeMemory: require('os').freemem(),
          homeDir: app.getPath('home'),
          tempDir: app.getPath('temp'),
          userDataDir: app.getPath('userData'),
          locale: app.getLocale()
        };

        return { success: true, data: systemInfo };
      } catch (error: any) {
        console.error('Failed to get system info:', error);
        return { success: false, error: error.message };
      }
    });

    // Open logs folder
    ipcMain.handle('settings:logs:open', async (event: IpcMainInvokeEvent) => {
      try {
        const logsPath = path.join(app.getPath('userData'), 'logs');

        if (!fs.existsSync(logsPath)) {
          fs.mkdirSync(logsPath, { recursive: true });
        }

        await shell.openPath(logsPath);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to open logs folder:', error);
        return { success: false, error: error.message };
      }
    });

    // Check for updates
    ipcMain.handle('settings:update:check', async (event: IpcMainInvokeEvent) => {
      try {
        const updateInfo = await this.updateService.checkForUpdates();

        if (updateInfo) {
          return { success: true, data: updateInfo };
        } else {
          return { success: true, data: null, message: '已是最新版本' };
        }
      } catch (error: any) {
        console.error('Failed to check for updates:', error);
        return { success: false, error: error.message };
      }
    });

    // Install update
    ipcMain.handle('settings:update:install', async (
      event: IpcMainInvokeEvent,
      updateInfo: any
    ) => {
      try {
        await this.updateService.installUpdate(updateInfo);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to install update:', error);
        return { success: false, error: error.message };
      }
    });

    // Get update history
    ipcMain.handle('settings:update:history', async (event: IpcMainInvokeEvent) => {
      try {
        const history = await this.updateService.getUpdateHistory();
        return { success: true, data: history };
      } catch (error: any) {
        console.error('Failed to get update history:', error);
        return { success: false, error: error.message };
      }
    });

    // Set ffmpeg path
    ipcMain.handle('settings:ffmpeg:path', async (
      event: IpcMainInvokeEvent,
      ffmpegPath?: string
    ) => {
      try {
        if (!ffmpegPath) {
          // Select ffmpeg executable
          const result = await dialog.showOpenDialog({
            title: '选择 FFmpeg 可执行文件',
            filters: [
              { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
            ],
            properties: ['openFile']
          });

          if (!result.canceled && result.filePaths.length > 0) {
            ffmpegPath = result.filePaths[0];
          } else {
            return { success: false, error: 'No file selected' };
          }
        }

        // Verify ffmpeg is valid
        const { spawn } = require('child_process');
        const ffmpeg = spawn(ffmpegPath, ['-version']);

        return new Promise((resolve) => {
          ffmpeg.on('close', async (code: number) => {
            if (code === 0) {
              const preferences = await this.storageService.getPreferences();
              preferences.ffmpegPath = ffmpegPath;
              await this.storageService.savePreferences(preferences);
              resolve({ success: true, data: ffmpegPath });
            } else {
              resolve({ success: false, error: 'Invalid FFmpeg executable' });
            }
          });

          ffmpeg.on('error', () => {
            resolve({ success: false, error: 'Invalid FFmpeg executable' });
          });
        });
      } catch (error: any) {
        console.error('Failed to set ffmpeg path:', error);
        return { success: false, error: error.message };
      }
    });

    // Set whisper model path
    ipcMain.handle('settings:whisper:model-path', async (
      event: IpcMainInvokeEvent,
      modelPath?: string
    ) => {
      try {
        if (!modelPath) {
          const result = await dialog.showOpenDialog({
            title: '选择 Whisper 模型文件',
            filters: [
              { name: 'Model Files', extensions: ['bin', 'ggml'] },
              { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
          });

          if (!result.canceled && result.filePaths.length > 0) {
            modelPath = result.filePaths[0];
          } else {
            return { success: false, error: 'No file selected' };
          }
        }

        const preferences = await this.storageService.getPreferences();
        preferences.whisperModelPath = modelPath;
        await this.storageService.savePreferences(preferences);

        return { success: true, data: modelPath };
      } catch (error: any) {
        console.error('Failed to set whisper model path:', error);
        return { success: false, error: error.message };
      }
    });

    // Reset window state
    ipcMain.handle('settings:window:reset', async (event: IpcMainInvokeEvent) => {
      try {
        await this.storageService.saveWindowState({
          width: 1200,
          height: 800,
          x: undefined as any,
          y: undefined as any,
          isMaximized: false
        });

        // Apply to current window
        const { BrowserWindow } = require('electron');
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          window.setSize(1200, 800);
          window.center();
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to reset window state:', error);
        return { success: false, error: error.message };
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const { nativeTheme, BrowserWindow } = require('electron');

    if (theme === 'system') {
      nativeTheme.themeSource = 'system';
    } else {
      nativeTheme.themeSource = theme;
    }

    // Notify all windows
    BrowserWindow.getAllWindows().forEach((window: any) => {
      window.webContents.send('theme-changed', theme);
    });
  }

  private applyLanguage(language: string): void {
    // Store language preference
    app.setLocale(language);

    // Notify all windows
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach((window: any) => {
      window.webContents.send('language-changed', language);
    });
  }

  destroy(): void {
    // Clean up if needed
  }
}