/**
 * Database management using electron-store
 */

import Store from 'electron-store';
import { DownloadTask, ProcessingTask } from '../../shared/types/tasks';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../shared/types/preferences';

interface DatabaseSchema {
  tasks: {
    downloads: DownloadTask[];
    processing: ProcessingTask[];
  };
  history: DownloadTask[];
  preferences: UserPreferences;
  cache: {
    videoInfo: { [url: string]: { data: any; timestamp: number } };
    thumbnails: { [url: string]: string };
  };
  statistics: {
    totalDownloads: number;
    totalBytes: number;
    totalDuration: number;
    successCount: number;
    failureCount: number;
  };
}

export class Database {
  private store: Store<DatabaseSchema>;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.store = new Store<DatabaseSchema>({
      name: 'prevideo-db',
      defaults: {
        tasks: {
          downloads: [],
          processing: []
        },
        history: [],
        preferences: DEFAULT_PREFERENCES,
        cache: {
          videoInfo: {},
          thumbnails: {}
        },
        statistics: {
          totalDownloads: 0,
          totalBytes: 0,
          totalDuration: 0,
          successCount: 0,
          failureCount: 0
        }
      },
      schema: {
        tasks: {
          type: 'object',
          properties: {
            downloads: { type: 'array' },
            processing: { type: 'array' }
          }
        },
        history: { type: 'array' },
        preferences: { type: 'object' },
        cache: { type: 'object' },
        statistics: { type: 'object' }
      }
    });

    // Clean up old cache on startup
    this.cleanupCache();
  }

  // Task Management
  async getAllTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = this.store.get('tasks');
    return [...tasks.downloads, ...tasks.processing];
  }

  async getDownloadTasks(): Promise<DownloadTask[]> {
    return this.store.get('tasks.downloads', []);
  }

  async getProcessingTasks(): Promise<ProcessingTask[]> {
    return this.store.get('tasks.processing', []);
  }

  async getTask(taskId: string): Promise<DownloadTask | ProcessingTask | null> {
    const allTasks = await this.getAllTasks();
    return allTasks.find(t => t.id === taskId) || null;
  }

  async addDownloadTask(task: DownloadTask): Promise<void> {
    const tasks = this.store.get('tasks.downloads', []);
    tasks.push(task);
    this.store.set('tasks.downloads', tasks);
  }

  async addProcessingTask(task: ProcessingTask): Promise<void> {
    const tasks = this.store.get('tasks.processing', []);
    tasks.push(task);
    this.store.set('tasks.processing', tasks);
  }

  async updateTask(taskId: string, updates: Partial<DownloadTask | ProcessingTask>): Promise<void> {
    // Update download tasks
    const downloads = this.store.get('tasks.downloads', []);
    const downloadIndex = downloads.findIndex(t => t.id === taskId);
    if (downloadIndex !== -1) {
      downloads[downloadIndex] = { ...downloads[downloadIndex], ...updates };
      this.store.set('tasks.downloads', downloads);
      return;
    }

    // Update processing tasks
    const processing = this.store.get('tasks.processing', []);
    const processingIndex = processing.findIndex(t => t.id === taskId);
    if (processingIndex !== -1) {
      processing[processingIndex] = { ...processing[processingIndex], ...updates };
      this.store.set('tasks.processing', processing);
    }
  }

  async removeTask(taskId: string): Promise<void> {
    // Remove from downloads
    const downloads = this.store.get('tasks.downloads', []);
    const filteredDownloads = downloads.filter(t => t.id !== taskId);
    if (filteredDownloads.length !== downloads.length) {
      this.store.set('tasks.downloads', filteredDownloads);
      return;
    }

    // Remove from processing
    const processing = this.store.get('tasks.processing', []);
    const filteredProcessing = processing.filter(t => t.id !== taskId);
    if (filteredProcessing.length !== processing.length) {
      this.store.set('tasks.processing', filteredProcessing);
    }
  }

  async clearCompletedTasks(): Promise<void> {
    const downloads = this.store.get('tasks.downloads', []);
    const processing = this.store.get('tasks.processing', []);

    const activeDownloads = downloads.filter(t =>
      t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled'
    );
    const activeProcessing = processing.filter(t =>
      t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled'
    );

    this.store.set('tasks.downloads', activeDownloads);
    this.store.set('tasks.processing', activeProcessing);
  }

  // History Management
  async getHistory(): Promise<DownloadTask[]> {
    return this.store.get('history', []);
  }

  async addToHistory(task: DownloadTask): Promise<void> {
    const history = this.store.get('history', []);

    // Remove if already exists (update)
    const filtered = history.filter(t => t.id !== task.id);
    filtered.push(task);

    // Keep only last 1000 entries
    if (filtered.length > 1000) {
      filtered.splice(0, filtered.length - 1000);
    }

    this.store.set('history', filtered);

    // Update statistics
    if (task.status === 'completed') {
      this.updateStatistics({
        totalDownloads: 1,
        totalBytes: task.totalBytes || 0,
        totalDuration: task.videoInfo.duration || 0,
        successCount: 1
      });
    } else if (task.status === 'failed') {
      this.updateStatistics({ failureCount: 1 });
    }
  }

  async deleteFromHistory(taskId: string): Promise<void> {
    const history = this.store.get('history', []);
    const filtered = history.filter(t => t.id !== taskId);
    this.store.set('history', filtered);
  }

  async clearHistory(): Promise<void> {
    this.store.set('history', []);
  }

  // Preferences Management
  async getPreferences(): Promise<UserPreferences> {
    return this.store.get('preferences', DEFAULT_PREFERENCES);
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...preferences };
    this.store.set('preferences', updated);
  }

  async resetPreferences(): Promise<void> {
    this.store.set('preferences', DEFAULT_PREFERENCES);
  }

  // Cache Management
  async getCachedVideoInfo(url: string): Promise<any | null> {
    const cache = this.store.get('cache.videoInfo', {});
    const cached = cache[url];

    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.CACHE_TTL) {
        return cached.data;
      } else {
        // Remove expired cache
        delete cache[url];
        this.store.set('cache.videoInfo', cache);
      }
    }

    return null;
  }

  async setCachedVideoInfo(url: string, data: any): Promise<void> {
    const cache = this.store.get('cache.videoInfo', {});
    cache[url] = {
      data,
      timestamp: Date.now()
    };
    this.store.set('cache.videoInfo', cache);
  }

  async getCachedThumbnail(url: string): Promise<string | null> {
    const thumbnails = this.store.get('cache.thumbnails', {});
    return thumbnails[url] || null;
  }

  async setCachedThumbnail(url: string, base64: string): Promise<void> {
    const thumbnails = this.store.get('cache.thumbnails', {});
    thumbnails[url] = base64;

    // Keep only last 100 thumbnails
    const keys = Object.keys(thumbnails);
    if (keys.length > 100) {
      const toRemove = keys.slice(0, keys.length - 100);
      toRemove.forEach(key => delete thumbnails[key]);
    }

    this.store.set('cache.thumbnails', thumbnails);
  }

  private cleanupCache(): void {
    const cache = this.store.get('cache.videoInfo', {});
    const now = Date.now();
    let hasChanges = false;

    Object.keys(cache).forEach(url => {
      const age = now - cache[url].timestamp;
      if (age > this.CACHE_TTL) {
        delete cache[url];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.store.set('cache.videoInfo', cache);
    }
  }

  // Statistics
  async getStatistics(): Promise<DatabaseSchema['statistics']> {
    return this.store.get('statistics');
  }

  private updateStatistics(updates: Partial<DatabaseSchema['statistics']>): void {
    const current = this.store.get('statistics');
    const updated = {
      totalDownloads: current.totalDownloads + (updates.totalDownloads || 0),
      totalBytes: current.totalBytes + (updates.totalBytes || 0),
      totalDuration: current.totalDuration + (updates.totalDuration || 0),
      successCount: current.successCount + (updates.successCount || 0),
      failureCount: current.failureCount + (updates.failureCount || 0)
    };
    this.store.set('statistics', updated);
  }

  // Export/Import
  async exportData(): Promise<DatabaseSchema> {
    return this.store.store as DatabaseSchema;
  }

  async importData(data: Partial<DatabaseSchema>): Promise<void> {
    if (data.tasks) this.store.set('tasks', data.tasks);
    if (data.history) this.store.set('history', data.history);
    if (data.preferences) this.store.set('preferences', data.preferences);
    if (data.cache) this.store.set('cache', data.cache);
    if (data.statistics) this.store.set('statistics', data.statistics);
  }

  // Utilities
  async clear(): Promise<void> {
    this.store.clear();
  }

  async getStorePath(): Promise<string> {
    return this.store.path;
  }

  async getStoreSize(): Promise<number> {
    const fs = require('fs-extra');
    const stats = await fs.stat(this.store.path);
    return stats.size;
  }
}

// Singleton instance
let database: Database | null = null;

export function getDatabase(): Database {
  if (!database) {
    database = new Database();
  }
  return database;
}