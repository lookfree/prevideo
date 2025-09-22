/**
 * yt-dlp binary wrapper
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import { VideoInfo, VideoFormat } from '../../shared/types/video';

export class YtDlpWrapper {
  private binaryPath: string;
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    // Determine binary path based on platform
    const platform = process.platform;
    const arch = process.arch;
    const isProd = app.isPackaged;

    if (isProd) {
      // In production, binaries are in resources folder
      const resourcePath = process.resourcesPath;
      this.binaryPath = path.join(resourcePath, 'bin', 'yt-dlp', this.getBinaryName());
    } else {
      // In development, binaries are in project root
      this.binaryPath = path.join(__dirname, '../../../../bin', 'yt-dlp', this.getBinaryName());
    }

    this.ensureBinaryExecutable();
  }

  private getBinaryName(): string {
    switch (process.platform) {
      case 'win32':
        return 'yt-dlp.exe';
      case 'darwin':
      case 'linux':
        return 'yt-dlp';
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  private ensureBinaryExecutable(): void {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(this.binaryPath, '755');
      } catch (error) {
        console.error('Failed to make yt-dlp executable:', error);
      }
    }
  }

  async fetchVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const process = spawn(this.binaryPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const json = JSON.parse(stdout);
            const videoInfo: VideoInfo = {
              id: json.id || json.display_id,
              title: json.title || 'Unknown Title',
              author: json.uploader || json.channel || 'Unknown',
              duration: json.duration || 0,
              thumbnail: json.thumbnail,
              description: json.description,
              viewCount: json.view_count,
              likeCount: json.like_count,
              uploadDate: json.upload_date,
              availableFormats: this.parseFormats(json.formats || []),
              availableSubtitles: Object.keys(json.subtitles || {})
            };
            resolve(videoInfo);
          } catch (error) {
            reject(new Error(`Failed to parse video info: ${error}`));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute yt-dlp: ${error.message}`));
      });
    });
  }

  private parseFormats(formats: any[]): VideoFormat[] {
    return formats
      .filter(f => f.vcodec !== 'none' || f.acodec !== 'none')
      .map(f => ({
        formatId: f.format_id,
        extension: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        fps: f.fps,
        filesize: f.filesize,
        vcodec: f.vcodec,
        acodec: f.acodec,
        quality: this.getQualityLabel(f),
        note: f.format_note
      }));
  }

  private getQualityLabel(format: any): string {
    if (format.height >= 2160) return '4K';
    if (format.height >= 1440) return '2K';
    if (format.height >= 1080) return '1080p';
    if (format.height >= 720) return '720p';
    if (format.height >= 480) return '480p';
    if (format.height >= 360) return '360p';
    return 'SD';
  }

  async download(
    url: string,
    outputPath: string,
    options: {
      quality?: string;
      format?: string;
      subtitles?: string[];
      cookies?: string;
      proxy?: string;
      rateLimit?: number;
      onProgress?: (progress: any) => void;
    } = {}
  ): Promise<{ taskId: string; process: ChildProcess }> {
    const taskId = `download-${Date.now()}`;
    const args: string[] = [];

    // Output path
    args.push('-o', outputPath);

    // Quality selection
    if (options.quality) {
      if (options.quality === 'best') {
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
      } else if (options.quality === 'worst') {
        args.push('-f', 'worst');
      } else {
        // Specific quality like 1080p
        const height = options.quality.replace('p', '');
        args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
      }
    }

    // Format
    if (options.format) {
      args.push('--merge-output-format', options.format);
    }

    // Subtitles
    if (options.subtitles && options.subtitles.length > 0) {
      args.push('--write-subs');
      args.push('--sub-langs', options.subtitles.join(','));
      args.push('--embed-subs');
    }

    // Cookies
    if (options.cookies) {
      args.push('--cookies', options.cookies);
    }

    // Proxy
    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    // Rate limit
    if (options.rateLimit) {
      args.push('--limit-rate', `${options.rateLimit}K`);
    }

    // Progress tracking
    args.push('--newline', '--progress');

    // Add URL
    args.push(url);

    const process = spawn(this.binaryPath, args);
    this.processes.set(taskId, process);

    // Handle progress
    if (options.onProgress) {
      process.stdout.on('data', (data) => {
        const output = data.toString();
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
        const etaMatch = output.match(/ETA\s+([\d:]+)/);

        if (progressMatch || speedMatch || etaMatch) {
          options.onProgress({
            taskId,
            progress: progressMatch ? parseFloat(progressMatch[1]) : undefined,
            speed: speedMatch ? speedMatch[1] : undefined,
            eta: etaMatch ? etaMatch[1] : undefined
          });
        }
      });
    }

    return { taskId, process };
  }

  async extractAudio(
    url: string,
    outputPath: string,
    format: 'mp3' | 'aac' | 'opus' = 'mp3',
    quality: number = 192
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-x', // Extract audio
        '--audio-format', format,
        '--audio-quality', quality.toString(),
        '-o', outputPath,
        url
      ];

      const process = spawn(this.binaryPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio extraction failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async downloadPlaylist(
    url: string,
    outputDir: string,
    options: {
      startIndex?: number;
      endIndex?: number;
      reverseOrder?: boolean;
      onProgress?: (progress: any) => void;
    } = {}
  ): Promise<void> {
    const args: string[] = [
      '--yes-playlist',
      '-o', path.join(outputDir, '%(playlist_index)s - %(title)s.%(ext)s')
    ];

    if (options.startIndex) {
      args.push('--playlist-start', options.startIndex.toString());
    }

    if (options.endIndex) {
      args.push('--playlist-end', options.endIndex.toString());
    }

    if (options.reverseOrder) {
      args.push('--playlist-reverse');
    }

    args.push(url);

    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);

      if (options.onProgress) {
        process.stdout.on('data', (data) => {
          options.onProgress(data.toString());
        });
      }

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Playlist download failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  cancelDownload(taskId: string): boolean {
    const process = this.processes.get(taskId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(taskId);
      return true;
    }
    return false;
  }

  async updateBinary(): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['--update'];
      const process = spawn(this.binaryPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Update failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  cleanup(): void {
    // Kill all running processes
    for (const [taskId, process] of this.processes) {
      process.kill('SIGTERM');
    }
    this.processes.clear();
  }
}