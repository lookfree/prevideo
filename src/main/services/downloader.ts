/**
 * DownloaderService - Handles video downloading using yt-dlp
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
  VideoInfo,
  VideoFormat,
  VideoQuality
} from '../../shared/types/video';
import {
  DownloadTask,
  DownloadOptions,
  DownloadProgress,
  TaskStatus
} from '../../shared/types/tasks';
import { IDownloaderService } from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

export class DownloaderService extends EventEmitter implements IDownloaderService {
  private tasks: Map<string, DownloadTask> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private ytdlpPath: string;

  constructor(ytdlpPath?: string) {
    super();
    this.ytdlpPath = ytdlpPath || this.getYtdlpPath();
  }

  private getYtdlpPath(): string {
    // Try to find yt-dlp in common locations
    const possiblePaths = [
      path.join(__dirname, '../../../binaries/yt-dlp'),
      path.join(process.resourcesPath, 'binaries/yt-dlp'),
      'yt-dlp' // System PATH
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return 'yt-dlp'; // Fallback to system PATH
  }

  async fetchVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        url,
        '--dump-json',
        '--no-warnings',
        '--no-playlist'
      ];

      const process = spawn(this.ytdlpPath, args);
      let jsonData = '';
      let errorData = '';

      process.stdout.on('data', (data) => {
        jsonData += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to fetch video info: ${errorData}`));
          return;
        }

        try {
          const info = JSON.parse(jsonData);
          const videoInfo: VideoInfo = {
            id: info.id,
            url: info.webpage_url || url,
            title: info.title,
            duration: info.duration || 0,
            thumbnail: info.thumbnail || '',
            author: info.uploader || info.channel || '',
            description: info.description,
            uploadDate: info.upload_date ? new Date(info.upload_date) : undefined,
            viewCount: info.view_count,
            likeCount: info.like_count,
            availableFormats: this.parseFormats(info.formats || []),
            availableSubtitles: Object.keys(info.subtitles || {}),
            isLive: info.is_live || false,
            isPrivate: false,
            ageRestricted: info.age_limit > 0
          };

          resolve(videoInfo);
        } catch (error) {
          reject(new Error(`Failed to parse video info: ${error}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error}`));
      });
    });
  }

  private parseFormats(formats: any[]): VideoFormat[] {
    return formats
      .filter(f => f.vcodec !== 'none' || f.acodec !== 'none')
      .map(f => ({
        formatId: f.format_id,
        quality: this.extractQuality(f),
        ext: f.ext,
        fps: f.fps || 0,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize,
        width: f.width,
        height: f.height,
        tbr: f.tbr
      }))
      .sort((a, b) => {
        const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
        const aIndex = qualityOrder.indexOf(a.quality);
        const bIndex = qualityOrder.indexOf(b.quality);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }

  private extractQuality(format: any): string {
    if (format.height) {
      return `${format.height}p`;
    }
    if (format.format_note) {
      return format.format_note;
    }
    return 'unknown';
  }

  async startDownload(url: string, options: DownloadOptions): Promise<DownloadTask> {
    const taskId = this.generateTaskId();
    const videoInfo = await this.fetchVideoInfo(url);

    const outputTemplate = path.join(
      options.outputPath,
      options.filename || '%(title)s.%(ext)s'
    );

    const args = this.buildDownloadArgs(url, outputTemplate, options);

    const task: DownloadTask = {
      id: taskId,
      videoInfo,
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      eta: 0,
      outputPath: outputTemplate.replace('%(title)s', videoInfo.title).replace('%(ext)s', options.preferredFormat || 'mp4'),
      startTime: new Date(),
      resumable: options.enableResume || true,
      metadata: {
        videoTitle: videoInfo.title,
        videoAuthor: videoInfo.author,
        videoDuration: videoInfo.duration,
        videoQuality: options.quality || 'best',
        selectedFormat: options.preferredFormat || 'mp4',
        subtitleLanguages: options.subtitleLanguages,
        downloadStartTime: new Date(),
        userPreferences: {
          outputPath: options.outputPath,
          autoGenerateSubtitles: false,
          embedSubtitles: false
        }
      }
    };

    this.tasks.set(taskId, task);

    const process = spawn(this.ytdlpPath, args);
    this.processes.set(taskId, process);

    this.attachProcessListeners(process, taskId);

    return task;
  }

  private buildDownloadArgs(url: string, outputPath: string, options: DownloadOptions): string[] {
    const args = [
      url,
      '-o', outputPath,
      '--no-warnings'
    ];

    if (options.quality) {
      if (options.quality === 'best') {
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      } else if (options.quality === 'worst') {
        args.push('-f', 'worst');
      } else {
        args.push('-f', `bestvideo[height<=${options.quality.replace('p', '')}]+bestaudio/best[height<=${options.quality.replace('p', '')}]`);
      }
    }

    if (options.preferredFormat) {
      args.push('--merge-output-format', options.preferredFormat);
    }

    if (options.subtitleLanguages && options.subtitleLanguages.length > 0) {
      args.push('--write-sub');
      args.push('--sub-langs', options.subtitleLanguages.join(','));
    }

    if (options.enableResume) {
      args.push('--continue');
    }

    args.push('--progress');
    args.push('--newline');

    return args;
  }

  private attachProcessListeners(process: ChildProcess, taskId: string): void {
    process.stdout?.on('data', (data) => {
      const output = data.toString();
      this.parseProgress(output, taskId);
    });

    process.stderr?.on('data', (data) => {
      console.error(`yt-dlp error for task ${taskId}:`, data.toString());
    });

    process.on('close', (code) => {
      const task = this.tasks.get(taskId);
      if (task) {
        if (code === 0) {
          task.status = 'completed';
          task.progress = 100;
          task.endTime = new Date();
          this.emit('download-complete', taskId, task);
        } else {
          task.status = 'failed';
          task.lastError = `Process exited with code ${code}`;
          this.emit('download-failed', taskId, task);
        }
      }
      this.processes.delete(taskId);
    });

    process.on('error', (error) => {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.lastError = error.message;
        this.emit('download-error', taskId, error);
      }
      this.processes.delete(taskId);
    });
  }

  private parseProgress(output: string, taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Parse yt-dlp progress output
    const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
    const speedMatch = output.match(/at\s+([\d.]+)([KMG]?)iB\/s/);
    const etaMatch = output.match(/ETA\s+([\d:]+)/);
    const sizeMatch = output.match(/of\s+~?([\d.]+)([KMG]?)iB/);

    if (progressMatch) {
      task.progress = parseFloat(progressMatch[1]);
    }

    if (speedMatch) {
      const speed = parseFloat(speedMatch[1]);
      const unit = speedMatch[2];
      task.speed = this.convertToBytes(speed, unit);
    }

    if (etaMatch) {
      task.eta = this.parseETA(etaMatch[1]);
    }

    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      task.totalBytes = this.convertToBytes(size, unit);
      task.downloadedBytes = (task.totalBytes * task.progress) / 100;
    }

    this.emit('download-progress', taskId, task);
  }

  private convertToBytes(value: number, unit: string): number {
    switch (unit) {
      case 'K': return value * 1024;
      case 'M': return value * 1024 * 1024;
      case 'G': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  private parseETA(etaString: string): number {
    const parts = etaString.split(':').map(p => parseInt(p));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else {
      return parts[0] || 0;
    }
  }

  async pauseDownload(taskId: string): Promise<void> {
    const process = this.processes.get(taskId);
    const task = this.tasks.get(taskId);

    if (process && task) {
      process.kill('SIGTERM');
      task.status = 'paused';
      task.pauseReason = 'User requested';
      task.lastCheckpoint = new Date();
      this.processes.delete(taskId);
      this.emit('download-paused', taskId, task);
    } else {
      throw new Error('Task not found');
    }
  }

  async resumeDownload(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'paused') {
      throw new Error('Task is not paused');
    }

    task.status = 'downloading';
    task.resumeTime = new Date();

    // Restart download with resume flag
    const options: DownloadOptions = {
      quality: task.metadata?.videoQuality,
      outputPath: path.dirname(task.outputPath),
      filename: path.basename(task.outputPath),
      subtitleLanguages: task.metadata?.subtitleLanguages,
      preferredFormat: task.metadata?.selectedFormat,
      enableResume: true
    };

    const args = this.buildDownloadArgs(task.videoInfo.url, task.outputPath, options);
    const process = spawn(this.ytdlpPath, args);
    this.processes.set(taskId, process);
    this.attachProcessListeners(process, taskId);

    this.emit('download-resumed', taskId, task);
  }

  async cancelDownload(taskId: string): Promise<void> {
    const process = this.processes.get(taskId);
    const task = this.tasks.get(taskId);

    if (process) {
      process.kill('SIGKILL');
      this.processes.delete(taskId);
    }

    if (task) {
      task.status = 'cancelled';
      task.endTime = new Date();

      // Clean up partial files
      if (task.partialFilePath && fs.existsSync(task.partialFilePath)) {
        fs.unlinkSync(task.partialFilePath);
      }

      this.tasks.delete(taskId);
      this.emit('download-cancelled', taskId);
    } else {
      throw new Error('Task not found');
    }
  }

  getProgress(taskId: string): DownloadProgress {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    return {
      taskId: task.id,
      progress: task.progress,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
      speed: task.speed,
      eta: task.eta,
      status: task.status
    };
  }

  listTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  private generateTaskId(): string {
    return `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}