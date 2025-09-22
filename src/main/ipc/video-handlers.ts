/**
 * Video-related IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { DownloaderService } from '../services/downloader';
import { StorageService } from '../services/storage';
import { VideoInfo } from '../../shared/types/video';
import { DownloadTask, DownloadOptions, DownloadProgress } from '../../shared/types/tasks';

export class VideoHandlers {
  private downloaderService: DownloaderService;
  private storageService: StorageService;

  constructor(downloaderService: DownloaderService, storageService: StorageService) {
    this.downloaderService = downloaderService;
    this.storageService = storageService;
    this.registerHandlers();
    this.setupEventForwarding();
  }

  private registerHandlers(): void {
    // Fetch video information
    ipcMain.handle('video:info:fetch', async (event: IpcMainInvokeEvent, url: string) => {
      try {
        // Check cache first
        const videoId = this.extractVideoId(url);
        const cached = await this.storageService.getCachedVideoInfo(videoId);

        if (cached) {
          return { success: true, data: cached, fromCache: true };
        }

        // Fetch fresh info
        const videoInfo = await this.downloaderService.fetchVideoInfo(url);

        // Cache the result
        await this.storageService.cacheVideoInfo(videoInfo);

        return { success: true, data: videoInfo, fromCache: false };
      } catch (error: any) {
        console.error('Failed to fetch video info:', error);
        return { success: false, error: error.message };
      }
    });

    // Start download
    ipcMain.handle('video:download:start', async (
      event: IpcMainInvokeEvent,
      url: string,
      options: DownloadOptions
    ) => {
      try {
        // Use user preferences if not specified
        const preferences = await this.storageService.getPreferences();
        const mergedOptions: DownloadOptions = {
          quality: options.quality || preferences.defaultQuality,
          outputPath: options.outputPath || preferences.defaultOutputPath,
          filename: options.filename,
          subtitleLanguages: options.subtitleLanguages || preferences.defaultSubtitleLanguages,
          preferredFormat: options.preferredFormat || preferences.defaultFormat,
          enableResume: options.enableResume !== false,
          maxRetries: options.maxRetries || preferences.retryAttempts,
          retryDelay: options.retryDelay || 5000,
          chunkSize: options.chunkSize,
          parallelChunks: options.parallelChunks
        };

        const task = await this.downloaderService.startDownload(url, mergedOptions);

        // Save task to storage
        await this.storageService.saveDownloadTask(task);

        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to start download:', error);
        return { success: false, error: error.message };
      }
    });

    // Pause download
    ipcMain.handle('video:download:pause', async (event: IpcMainInvokeEvent, taskId: string) => {
      try {
        await this.downloaderService.pauseDownload(taskId);

        // Update task in storage
        const task = await this.storageService.getDownloadTask(taskId);
        if (task) {
          task.status = 'paused';
          await this.storageService.saveDownloadTask(task);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to pause download:', error);
        return { success: false, error: error.message };
      }
    });

    // Resume download
    ipcMain.handle('video:download:resume', async (event: IpcMainInvokeEvent, taskId: string) => {
      try {
        await this.downloaderService.resumeDownload(taskId);

        // Update task in storage
        const task = await this.storageService.getDownloadTask(taskId);
        if (task) {
          task.status = 'downloading';
          await this.storageService.saveDownloadTask(task);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to resume download:', error);
        return { success: false, error: error.message };
      }
    });

    // Cancel download
    ipcMain.handle('video:download:cancel', async (event: IpcMainInvokeEvent, taskId: string) => {
      try {
        await this.downloaderService.cancelDownload(taskId);

        // Update task in storage
        const task = await this.storageService.getDownloadTask(taskId);
        if (task) {
          task.status = 'cancelled';
          await this.storageService.saveDownloadTask(task);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to cancel download:', error);
        return { success: false, error: error.message };
      }
    });

    // Get download progress
    ipcMain.handle('video:download:progress', async (event: IpcMainInvokeEvent, taskId: string) => {
      try {
        const progress = this.downloaderService.getProgress(taskId);
        return { success: true, data: progress };
      } catch (error: any) {
        console.error('Failed to get progress:', error);
        return { success: false, error: error.message };
      }
    });

    // List all tasks
    ipcMain.handle('video:tasks:list', async (event: IpcMainInvokeEvent) => {
      try {
        const tasks = this.downloaderService.listTasks();
        return { success: true, data: tasks };
      } catch (error: any) {
        console.error('Failed to list tasks:', error);
        return { success: false, error: error.message };
      }
    });

    // Get download history
    ipcMain.handle('video:history:get', async (
      event: IpcMainInvokeEvent,
      limit?: number,
      offset?: number
    ) => {
      try {
        const history = await this.storageService.getDownloadHistory(limit, offset);
        return { success: true, data: history };
      } catch (error: any) {
        console.error('Failed to get history:', error);
        return { success: false, error: error.message };
      }
    });

    // Clear download history
    ipcMain.handle('video:history:clear', async (event: IpcMainInvokeEvent) => {
      try {
        // Clear history in storage
        await this.storageService.clearAllData();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to clear history:', error);
        return { success: false, error: error.message };
      }
    });

    // Batch download
    ipcMain.handle('video:download:batch', async (
      event: IpcMainInvokeEvent,
      urls: string[],
      options: DownloadOptions
    ) => {
      try {
        const tasks: DownloadTask[] = [];

        for (const url of urls) {
          try {
            const task = await this.downloaderService.startDownload(url, options);
            await this.storageService.saveDownloadTask(task);
            tasks.push(task);
          } catch (error) {
            console.error(`Failed to start download for ${url}:`, error);
          }
        }

        return { success: true, data: tasks };
      } catch (error: any) {
        console.error('Failed to start batch download:', error);
        return { success: false, error: error.message };
      }
    });

    // Validate URL
    ipcMain.handle('video:url:validate', async (event: IpcMainInvokeEvent, url: string) => {
      try {
        // Basic URL validation
        const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/;
        const isValid = urlPattern.test(url);

        if (!isValid) {
          return { success: false, error: 'Invalid video URL' };
        }

        // Try to fetch info to verify it's accessible
        const videoInfo = await this.downloaderService.fetchVideoInfo(url);

        return { success: true, data: { isValid: true, videoInfo } };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Get supported sites
    ipcMain.handle('video:sites:supported', async (event: IpcMainInvokeEvent) => {
      return {
        success: true,
        data: [
          'youtube.com',
          'youtu.be',
          'vimeo.com',
          'dailymotion.com',
          'twitch.tv',
          'facebook.com',
          'instagram.com',
          'twitter.com',
          'tiktok.com',
          'bilibili.com'
        ]
      };
    });
  }

  private setupEventForwarding(): void {
    // Forward download progress events
    this.downloaderService.on('download-progress', (taskId: string, task: DownloadTask) => {
      this.sendToAllWindows('video:download:progress:update', { taskId, task });
    });

    // Forward download complete events
    this.downloaderService.on('download-complete', (taskId: string, task: DownloadTask) => {
      this.sendToAllWindows('video:download:complete', { taskId, task });

      // Save completed task
      this.storageService.saveDownloadTask(task);
    });

    // Forward download error events
    this.downloaderService.on('download-error', (taskId: string, error: Error) => {
      this.sendToAllWindows('video:download:error', { taskId, error: error.message });
    });

    // Forward download failed events
    this.downloaderService.on('download-failed', (taskId: string, task: DownloadTask) => {
      this.sendToAllWindows('video:download:failed', { taskId, task });

      // Save failed task
      this.storageService.saveDownloadTask(task);
    });

    // Forward download paused events
    this.downloaderService.on('download-paused', (taskId: string, task: DownloadTask) => {
      this.sendToAllWindows('video:download:paused', { taskId, task });
    });

    // Forward download resumed events
    this.downloaderService.on('download-resumed', (taskId: string, task: DownloadTask) => {
      this.sendToAllWindows('video:download:resumed', { taskId, task });
    });

    // Forward download cancelled events
    this.downloaderService.on('download-cancelled', (taskId: string) => {
      this.sendToAllWindows('video:download:cancelled', { taskId });
    });
  }

  private sendToAllWindows(channel: string, data: any): void {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  private extractVideoId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /vimeo\.com\/(\d+)/,
      /dailymotion\.com\/video\/([^_]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback to URL hash
    const crypto = require('crypto');
    return crypto.createHash('md5').update(url).digest('hex');
  }

  // Cleanup method
  destroy(): void {
    // Remove all listeners
    this.downloaderService.removeAllListeners();
  }
}