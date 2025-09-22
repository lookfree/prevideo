/**
 * StorageService - Handles data persistence using electron-store
 */

import Store from 'electron-store';
import * as path from 'path';
import { app } from 'electron';
import {
  DownloadTask,
  ProcessingTask,
  TaskQueue
} from '../../shared/types/tasks';
import { VideoInfo } from '../../shared/types/video';
import {
  UserPreferences,
  AppSettings,
  StorageStats,
  DEFAULT_PREFERENCES
} from '../../shared/types/preferences';
import { IStorageService } from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

interface StorageSchema {
  downloadTasks: DownloadTask[];
  downloadHistory: DownloadTask[];
  videoCache: { [key: string]: VideoInfo & { cachedAt: Date } };
  userPreferences: UserPreferences;
  appSettings: AppSettings;
  taskQueues: TaskQueue[];
}

export class StorageService implements IStorageService {
  private store: Store<StorageSchema>;
  private maxHistorySize = 1000;
  private maxCacheSize = 500;
  private cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor() {
    this.store = new Store<StorageSchema>({
      name: 'prevideo-data',
      defaults: {
        downloadTasks: [],
        downloadHistory: [],
        videoCache: {},
        userPreferences: DEFAULT_PREFERENCES,
        appSettings: this.getDefaultAppSettings(),
        taskQueues: []
      },
      schema: this.getStorageSchema()
    });

    // Set default output path if not set
    if (!this.store.get('userPreferences.defaultOutputPath')) {
      const downloadsPath = path.join(app.getPath('downloads'), 'PreVideo');
      this.store.set('userPreferences.defaultOutputPath', downloadsPath);
    }

    // Clean up old data on startup
    this.cleanupOldData();
  }

  private getStorageSchema(): any {
    return {
      downloadTasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            progress: { type: 'number' },
            downloadedBytes: { type: 'number' },
            totalBytes: { type: 'number' }
          }
        }
      },
      downloadHistory: {
        type: 'array',
        items: {
          type: 'object'
        }
      },
      videoCache: {
        type: 'object'
      },
      userPreferences: {
        type: 'object',
        properties: {
          defaultOutputPath: { type: 'string' },
          defaultQuality: { type: 'string' },
          defaultFormat: { type: 'string' },
          theme: { type: 'string' },
          language: { type: 'string' }
        }
      },
      appSettings: {
        type: 'object'
      },
      taskQueues: {
        type: 'array'
      }
    };
  }

  private getDefaultAppSettings(): AppSettings {
    return {
      version: '1.0.0',
      firstRun: true,
      lastUpdateCheck: new Date(),
      autoUpdate: true,
      updateChannel: 'stable',
      telemetryEnabled: false,
      crashReporting: true
    };
  }

  // Download task management
  async saveDownloadTask(task: DownloadTask): Promise<void> {
    const tasks = this.store.get('downloadTasks', []);
    const existingIndex = tasks.findIndex(t => t.id === task.id);

    if (existingIndex >= 0) {
      tasks[existingIndex] = this.serializeTask(task);
    } else {
      tasks.push(this.serializeTask(task));
    }

    this.store.set('downloadTasks', tasks);

    // If task is completed, move to history
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      await this.moveTaskToHistory(task);
    }
  }

  async getDownloadTask(taskId: string): Promise<DownloadTask | null> {
    const tasks = this.store.get('downloadTasks', []);
    const task = tasks.find(t => t.id === taskId);
    return task ? this.deserializeTask(task) : null;
  }

  async getDownloadHistory(limit?: number, offset?: number): Promise<DownloadTask[]> {
    let history = this.store.get('downloadHistory', []);

    // Apply pagination
    if (offset !== undefined) {
      history = history.slice(offset);
    }
    if (limit !== undefined) {
      history = history.slice(0, limit);
    }

    return history.map(t => this.deserializeTask(t));
  }

  private async moveTaskToHistory(task: DownloadTask): Promise<void> {
    const history = this.store.get('downloadHistory', []);
    history.unshift(this.serializeTask(task));

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(this.maxHistorySize);
    }

    this.store.set('downloadHistory', history);

    // Remove from active tasks
    const tasks = this.store.get('downloadTasks', []);
    const filteredTasks = tasks.filter(t => t.id !== task.id);
    this.store.set('downloadTasks', filteredTasks);
  }

  // Video cache management
  async cacheVideoInfo(videoInfo: VideoInfo): Promise<void> {
    const cache = this.store.get('videoCache', {});
    cache[videoInfo.id] = {
      ...videoInfo,
      cachedAt: new Date()
    };

    // Limit cache size
    const cacheKeys = Object.keys(cache);
    if (cacheKeys.length > this.maxCacheSize) {
      // Remove oldest entries
      const sortedKeys = cacheKeys.sort((a, b) => {
        const dateA = new Date(cache[a].cachedAt).getTime();
        const dateB = new Date(cache[b].cachedAt).getTime();
        return dateA - dateB;
      });

      const keysToRemove = sortedKeys.slice(0, cacheKeys.length - this.maxCacheSize);
      keysToRemove.forEach(key => delete cache[key]);
    }

    this.store.set('videoCache', cache);
  }

  async getCachedVideoInfo(videoId: string): Promise<VideoInfo | null> {
    const cache = this.store.get('videoCache', {});
    const cached = cache[videoId];

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const cachedTime = new Date(cached.cachedAt).getTime();
    const now = Date.now();

    if (now - cachedTime > this.cacheExpiry) {
      // Remove expired cache
      delete cache[videoId];
      this.store.set('videoCache', cache);
      return null;
    }

    return cached;
  }

  // Preferences management
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = this.store.get('userPreferences', DEFAULT_PREFERENCES);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    this.store.set('userPreferences', updatedPrefs);
  }

  async getPreferences(): Promise<UserPreferences> {
    return this.store.get('userPreferences', DEFAULT_PREFERENCES);
  }

  // Storage management
  async clearCache(): Promise<void> {
    this.store.set('videoCache', {});
  }

  async getStorageStats(): Promise<StorageStats> {
    const tasks = this.store.get('downloadTasks', []);
    const history = this.store.get('downloadHistory', []);
    const cache = this.store.get('videoCache', {});

    // Calculate cache size (approximate)
    const cacheSize = JSON.stringify(cache).length;

    // Find oldest and newest entries
    const allTasks = [...tasks, ...history];
    const dates = allTasks
      .map(t => new Date(t.startTime))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalVideos: Object.keys(cache).length,
      totalDownloads: history.filter(t => t.status === 'completed').length,
      cacheSize,
      oldestEntry: dates[0] || new Date(),
      newestEntry: dates[dates.length - 1] || new Date()
    };
  }

  // Task queue management
  async createTaskQueue(name: string, maxConcurrent: number = 2): Promise<TaskQueue> {
    const queue: TaskQueue = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      tasks: [],
      maxConcurrent,
      currentlyProcessing: 0,
      autoStart: true,
      priority: 'normal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const queues = this.store.get('taskQueues', []);
    queues.push(queue);
    this.store.set('taskQueues', queues);

    return queue;
  }

  async getTaskQueue(queueId: string): Promise<TaskQueue | null> {
    const queues = this.store.get('taskQueues', []);
    return queues.find(q => q.id === queueId) || null;
  }

  async updateTaskQueue(queue: TaskQueue): Promise<void> {
    const queues = this.store.get('taskQueues', []);
    const index = queues.findIndex(q => q.id === queue.id);

    if (index >= 0) {
      queues[index] = {
        ...queue,
        updatedAt: new Date()
      };
      this.store.set('taskQueues', queues);
    }
  }

  async deleteTaskQueue(queueId: string): Promise<void> {
    const queues = this.store.get('taskQueues', []);
    const filtered = queues.filter(q => q.id !== queueId);
    this.store.set('taskQueues', filtered);
  }

  // App settings management
  async getAppSettings(): Promise<AppSettings> {
    return this.store.get('appSettings', this.getDefaultAppSettings());
  }

  async updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = this.store.get('appSettings', this.getDefaultAppSettings());
    this.store.set('appSettings', { ...current, ...settings });
  }

  // Window state management
  async saveWindowState(state: {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
  }): Promise<void> {
    const settings = await this.getAppSettings();
    settings.windowState = state;
    await this.updateAppSettings(settings);
  }

  async getWindowState(): Promise<any> {
    const settings = await this.getAppSettings();
    return settings.windowState || {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined,
      isMaximized: false
    };
  }

  // Data cleanup
  private cleanupOldData(): void {
    // Clean expired cache
    const cache = this.store.get('videoCache', {});
    const now = Date.now();
    let hasChanges = false;

    Object.keys(cache).forEach(key => {
      const cachedTime = new Date(cache[key].cachedAt).getTime();
      if (now - cachedTime > this.cacheExpiry) {
        delete cache[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.store.set('videoCache', cache);
    }

    // Clean old history based on user preferences
    const preferences = this.store.get('userPreferences', DEFAULT_PREFERENCES);
    if (preferences.keepHistory && preferences.historyDuration) {
      const history = this.store.get('downloadHistory', []);
      const cutoffDate = Date.now() - (preferences.historyDuration * 24 * 60 * 60 * 1000);

      const filteredHistory = history.filter(task => {
        const taskDate = new Date(task.endTime || task.startTime).getTime();
        return taskDate > cutoffDate;
      });

      if (filteredHistory.length < history.length) {
        this.store.set('downloadHistory', filteredHistory);
      }
    }
  }

  // Utility methods
  private serializeTask(task: DownloadTask): any {
    return {
      ...task,
      startTime: task.startTime.toISOString(),
      endTime: task.endTime?.toISOString(),
      lastCheckpoint: task.lastCheckpoint?.toISOString(),
      resumeTime: task.resumeTime?.toISOString()
    };
  }

  private deserializeTask(task: any): DownloadTask {
    return {
      ...task,
      startTime: new Date(task.startTime),
      endTime: task.endTime ? new Date(task.endTime) : undefined,
      lastCheckpoint: task.lastCheckpoint ? new Date(task.lastCheckpoint) : undefined,
      resumeTime: task.resumeTime ? new Date(task.resumeTime) : undefined
    };
  }

  // Export and import data
  async exportData(): Promise<string> {
    const data = {
      downloadHistory: this.store.get('downloadHistory', []),
      userPreferences: this.store.get('userPreferences', DEFAULT_PREFERENCES),
      appSettings: this.store.get('appSettings', this.getDefaultAppSettings()),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      if (data.downloadHistory) {
        this.store.set('downloadHistory', data.downloadHistory);
      }

      if (data.userPreferences) {
        this.store.set('userPreferences', data.userPreferences);
      }

      if (data.appSettings) {
        this.store.set('appSettings', data.appSettings);
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    this.store.clear();
  }
}