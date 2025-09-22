/**
 * Task repository for managing download and processing tasks
 */

import { getDatabase } from '../database';
import { DownloadTask, ProcessingTask, TaskStatus } from '../../../shared/types/tasks';
import { VideoInfo } from '../../../shared/types/video';
import { v4 as uuidv4 } from 'uuid';

export class TaskRepository {
  private db = getDatabase();

  // Create
  async createDownloadTask(
    url: string,
    videoInfo: VideoInfo,
    options: {
      outputPath: string;
      quality?: string;
      subtitles?: Array<{ languageCode: string; languageName: string; format: string }>;
      metadata?: any;
    }
  ): Promise<DownloadTask> {
    const task: DownloadTask = {
      id: uuidv4(),
      type: 'download',
      url,
      videoInfo,
      outputPath: options.outputPath,
      status: 'queued',
      progress: 0,
      startTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumable: true,
      priority: 0,
      retryCount: 0,
      maxRetries: 3,
      subtitles: options.subtitles,
      metadata: {
        ...options.metadata,
        videoQuality: options.quality
      }
    };

    await this.db.addDownloadTask(task);
    return task;
  }

  async createProcessingTask(
    inputPath: string,
    outputPath: string,
    type: 'compression' | 'subtitle_generation' | 'format_conversion',
    config: any
  ): Promise<ProcessingTask> {
    const task: ProcessingTask = {
      id: uuidv4(),
      type: 'processing',
      processingType: type,
      inputPath,
      outputPath,
      status: 'queued',
      progress: 0,
      startTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config,
      priority: 0
    };

    await this.db.addProcessingTask(task);
    return task;
  }

  // Read
  async getAllTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    return this.db.getAllTasks();
  }

  async getActiveTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(t =>
      t.status === 'downloading' ||
      t.status === 'processing' ||
      t.status === 'paused' ||
      t.status === 'queued'
    );
  }

  async getQueuedTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = await this.getAllTasks();
    return tasks
      .filter(t => t.status === 'queued')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async getCompletedTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.status === 'completed');
  }

  async getFailedTasks(): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.status === 'failed');
  }

  async getTaskById(taskId: string): Promise<DownloadTask | ProcessingTask | null> {
    return this.db.getTask(taskId);
  }

  async getTasksByStatus(status: TaskStatus): Promise<(DownloadTask | ProcessingTask)[]> {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.status === status);
  }

  // Update
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const updates: any = {
      status,
      updatedAt: Date.now()
    };

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.endTime = Date.now();
    }

    await this.db.updateTask(taskId, updates);

    // Add to history if download task is finished
    if (status === 'completed' || status === 'failed') {
      const task = await this.getTaskById(taskId);
      if (task && task.type === 'download') {
        await this.db.addToHistory(task as DownloadTask);
      }
    }
  }

  async updateTaskProgress(
    taskId: string,
    progress: number,
    additionalData?: {
      speed?: number;
      eta?: number;
      downloadedBytes?: number;
      totalBytes?: number;
    }
  ): Promise<void> {
    const updates: any = {
      progress,
      updatedAt: Date.now(),
      ...additionalData
    };

    await this.db.updateTask(taskId, updates);
  }

  async pauseTask(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'paused');
  }

  async resumeTask(taskId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (task) {
      const status = task.type === 'download' ? 'downloading' : 'processing';
      await this.updateTaskStatus(taskId, status);
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'cancelled');
  }

  async markTaskFailed(taskId: string, error: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (task) {
      const failureHistory = (task as DownloadTask).failureHistory || [];
      failureHistory.push({
        timestamp: Date.now(),
        reason: error,
        progress: task.progress || 0
      });

      await this.db.updateTask(taskId, {
        status: 'failed',
        lastError: error,
        failureHistory,
        updatedAt: Date.now(),
        endTime: Date.now()
      });

      // Add to history
      if (task.type === 'download') {
        await this.db.addToHistory(task as DownloadTask);
      }
    }
  }

  async retryTask(taskId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (task) {
      const retryCount = (task as DownloadTask).retryCount || 0;
      const status = task.type === 'download' ? 'downloading' : 'processing';

      await this.db.updateTask(taskId, {
        status,
        retryCount: retryCount + 1,
        lastError: undefined,
        updatedAt: Date.now(),
        startTime: Date.now()
      });
    }
  }

  // Delete
  async removeTask(taskId: string): Promise<void> {
    await this.db.removeTask(taskId);
  }

  async clearCompletedTasks(): Promise<void> {
    await this.db.clearCompletedTasks();
  }

  async clearAllTasks(): Promise<void> {
    const tasks = await this.getAllTasks();
    for (const task of tasks) {
      await this.removeTask(task.id);
    }
  }

  // Batch operations
  async getNextQueuedTask(): Promise<DownloadTask | ProcessingTask | null> {
    const queuedTasks = await this.getQueuedTasks();
    return queuedTasks[0] || null;
  }

  async startNextTask(): Promise<DownloadTask | ProcessingTask | null> {
    const task = await this.getNextQueuedTask();
    if (task) {
      const status = task.type === 'download' ? 'downloading' : 'processing';
      await this.updateTaskStatus(task.id, status);
      return task;
    }
    return null;
  }

  async getRunningTasksCount(): Promise<number> {
    const tasks = await this.getAllTasks();
    return tasks.filter(t =>
      t.status === 'downloading' || t.status === 'processing'
    ).length;
  }

  async canStartNewTask(maxConcurrent: number = 3): Promise<boolean> {
    const runningCount = await this.getRunningTasksCount();
    return runningCount < maxConcurrent;
  }

  // Statistics
  async getTaskStatistics(): Promise<{
    total: number;
    queued: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
  }> {
    const tasks = await this.getAllTasks();
    return {
      total: tasks.length,
      queued: tasks.filter(t => t.status === 'queued').length,
      active: tasks.filter(t => t.status === 'downloading' || t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      paused: tasks.filter(t => t.status === 'paused').length
    };
  }
}