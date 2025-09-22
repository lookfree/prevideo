/**
 * History repository for managing download history
 */

import { getDatabase } from '../database';
import { DownloadTask } from '../../../shared/types/tasks';

export class HistoryRepository {
  private db = getDatabase();

  async getAll(): Promise<DownloadTask[]> {
    return this.db.getHistory();
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<DownloadTask[]> {
    const history = await this.getAll();
    const start = startDate.getTime();
    const end = endDate.getTime();

    return history.filter(task => {
      const taskDate = task.endTime || task.startTime;
      return taskDate >= start && taskDate <= end;
    });
  }

  async getByStatus(status: string): Promise<DownloadTask[]> {
    const history = await this.getAll();
    return history.filter(task => task.status === status);
  }

  async getByUrl(url: string): Promise<DownloadTask[]> {
    const history = await this.getAll();
    return history.filter(task => task.url.includes(url));
  }

  async getByTitle(title: string): Promise<DownloadTask[]> {
    const history = await this.getAll();
    const searchTerm = title.toLowerCase();
    return history.filter(task =>
      task.videoInfo.title.toLowerCase().includes(searchTerm)
    );
  }

  async getRecent(limit: number = 10): Promise<DownloadTask[]> {
    const history = await this.getAll();
    return history
      .sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime))
      .slice(0, limit);
  }

  async getStatistics(): Promise<{
    totalDownloads: number;
    successfulDownloads: number;
    failedDownloads: number;
    totalSize: number;
    totalDuration: number;
    averageSpeed: number;
    topSources: Array<{ domain: string; count: number }>;
  }> {
    const history = await this.getAll();
    const stats = await this.db.getStatistics();

    // Calculate top sources
    const sourceCounts: { [domain: string]: number } = {};
    history.forEach(task => {
      try {
        const url = new URL(task.url);
        const domain = url.hostname.replace('www.', '');
        sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
      } catch {}
    });

    const topSources = Object.entries(sourceCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate average speed
    const completedTasks = history.filter(t => t.status === 'completed');
    let totalSpeed = 0;
    let speedCount = 0;

    completedTasks.forEach(task => {
      if (task.totalBytes && task.endTime && task.startTime) {
        const duration = (task.endTime - task.startTime) / 1000; // seconds
        const speed = task.totalBytes / duration; // bytes per second
        totalSpeed += speed;
        speedCount++;
      }
    });

    const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;

    return {
      totalDownloads: stats.totalDownloads,
      successfulDownloads: stats.successCount,
      failedDownloads: stats.failureCount,
      totalSize: stats.totalBytes,
      totalDuration: stats.totalDuration,
      averageSpeed,
      topSources
    };
  }

  async add(task: DownloadTask): Promise<void> {
    await this.db.addToHistory(task);
  }

  async delete(taskId: string): Promise<void> {
    await this.db.deleteFromHistory(taskId);
  }

  async clear(): Promise<void> {
    await this.db.clearHistory();
  }

  async exportHistory(format: 'json' | 'csv' = 'json'): Promise<string> {
    const history = await this.getAll();

    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    } else {
      // CSV format
      const headers = [
        'ID',
        'Title',
        'URL',
        'Status',
        'Start Time',
        'End Time',
        'Duration',
        'File Size',
        'Output Path'
      ];

      const rows = history.map(task => [
        task.id,
        `"${task.videoInfo.title.replace(/"/g, '""')}"`,
        task.url,
        task.status,
        new Date(task.startTime).toISOString(),
        task.endTime ? new Date(task.endTime).toISOString() : '',
        task.videoInfo.duration || '',
        task.totalBytes || '',
        `"${task.outputPath.replace(/"/g, '""')}"`
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
    }
  }

  async importHistory(data: string, format: 'json' | 'csv' = 'json'): Promise<number> {
    if (format === 'json') {
      try {
        const tasks = JSON.parse(data) as DownloadTask[];
        for (const task of tasks) {
          await this.add(task);
        }
        return tasks.length;
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    } else {
      // CSV import would be implemented here
      throw new Error('CSV import not yet implemented');
    }
  }

  async findDuplicates(): Promise<DownloadTask[][]> {
    const history = await this.getAll();
    const duplicates: DownloadTask[][] = [];
    const urlMap: { [url: string]: DownloadTask[] } = {};

    history.forEach(task => {
      if (!urlMap[task.url]) {
        urlMap[task.url] = [];
      }
      urlMap[task.url].push(task);
    });

    Object.values(urlMap).forEach(tasks => {
      if (tasks.length > 1) {
        duplicates.push(tasks);
      }
    });

    return duplicates;
  }

  async removeDuplicates(): Promise<number> {
    const duplicates = await this.findDuplicates();
    let removed = 0;

    for (const group of duplicates) {
      // Keep the most recent completed task, or the most recent task
      const sorted = group.sort((a, b) => {
        // Prefer completed tasks
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (b.status === 'completed' && a.status !== 'completed') return 1;
        // Then sort by end time or start time
        return ((b.endTime || b.startTime) - (a.endTime || a.startTime));
      });

      // Keep the first one, remove the rest
      for (let i = 1; i < sorted.length; i++) {
        await this.delete(sorted[i].id);
        removed++;
      }
    }

    return removed;
  }
}