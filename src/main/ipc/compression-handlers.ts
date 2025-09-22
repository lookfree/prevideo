/**
 * Compression-related IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ConverterService } from '../services/converter';
import { StorageService } from '../services/storage';
import {
  CompressionConfig,
  CompressionTask,
  VideoResolution,
  CompressionPreset,
  StreamingOptimization
} from '../../shared/types/compression';
import { VideoMetadata } from '../../shared/types/video';

export class CompressionHandlers {
  private converterService: ConverterService;
  private storageService: StorageService;

  constructor(converterService: ConverterService, storageService: StorageService) {
    this.converterService = converterService;
    this.storageService = storageService;
    this.registerHandlers();
    this.setupEventForwarding();
  }

  private registerHandlers(): void {
    // Start video compression
    ipcMain.handle('compress:start', async (
      event: IpcMainInvokeEvent,
      inputPath: string,
      config: CompressionConfig
    ) => {
      try {
        // Use user preferences if not specified
        const preferences = await this.storageService.getPreferences();

        const mergedConfig: CompressionConfig = {
          ...config,
          preset: config.preset || preferences.compressionPreset,
          targetFileSize: config.targetFileSize || preferences.targetFileSize,
          hardwareAcceleration: config.hardwareAcceleration ?? preferences.hardwareAcceleration
        };

        const task = await this.converterService.compressVideo(inputPath, mergedConfig);
        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to compress video:', error);
        return { success: false, error: error.message };
      }
    });

    // Cancel compression
    ipcMain.handle('compress:cancel', async (
      event: IpcMainInvokeEvent,
      taskId: string
    ) => {
      try {
        await this.converterService.cancelProcessing(taskId);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to cancel compression:', error);
        return { success: false, error: error.message };
      }
    });

    // Convert video format
    ipcMain.handle('compress:convert', async (
      event: IpcMainInvokeEvent,
      inputPath: string,
      outputFormat: string
    ) => {
      try {
        const task = await this.converterService.convertFormat(inputPath, outputFormat);
        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to convert format:', error);
        return { success: false, error: error.message };
      }
    });

    // Extract audio from video
    ipcMain.handle('compress:extract-audio', async (
      event: IpcMainInvokeEvent,
      inputPath: string,
      format: 'mp3' | 'aac' | 'wav'
    ) => {
      try {
        const task = await this.converterService.extractAudio(inputPath, format);
        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to extract audio:', error);
        return { success: false, error: error.message };
      }
    });

    // Get video metadata
    ipcMain.handle('compress:metadata', async (
      event: IpcMainInvokeEvent,
      videoPath: string
    ) => {
      try {
        const metadata = await this.converterService.getVideoMetadata(videoPath);
        return { success: true, data: metadata };
      } catch (error: any) {
        console.error('Failed to get metadata:', error);
        return { success: false, error: error.message };
      }
    });

    // Estimate compressed file size
    ipcMain.handle('compress:estimate', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      config: CompressionConfig
    ) => {
      try {
        const estimatedSize = await this.converterService.estimateFileSize(videoPath, config);
        const metadata = await this.converterService.getVideoMetadata(videoPath);

        return {
          success: true,
          data: {
            originalSize: metadata.fileSize,
            estimatedSize,
            compressionRatio: ((metadata.fileSize - estimatedSize) / metadata.fileSize) * 100,
            savings: metadata.fileSize - estimatedSize
          }
        };
      } catch (error: any) {
        console.error('Failed to estimate size:', error);
        return { success: false, error: error.message };
      }
    });

    // Batch compress videos
    ipcMain.handle('compress:batch', async (
      event: IpcMainInvokeEvent,
      files: Array<{ inputPath: string; config: CompressionConfig }>
    ) => {
      try {
        const tasks: CompressionTask[] = [];

        for (const file of files) {
          try {
            const task = await this.converterService.compressVideo(file.inputPath, file.config);
            tasks.push(task);
          } catch (error) {
            console.error(`Failed to compress ${file.inputPath}:`, error);
          }
        }

        return { success: true, data: tasks };
      } catch (error: any) {
        console.error('Failed to batch compress:', error);
        return { success: false, error: error.message };
      }
    });

    // Get recommended settings for file size
    ipcMain.handle('compress:recommend', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      targetSize: number
    ) => {
      try {
        const metadata = await this.converterService.getVideoMetadata(videoPath);
        const currentSize = metadata.fileSize;
        const compressionRatio = targetSize / currentSize;

        let resolution: VideoResolution = '1080p';
        let crf = 23;
        let preset: CompressionPreset = 'medium';
        let videoBitrate: number | undefined;

        // Determine resolution based on compression ratio
        if (compressionRatio < 0.1) {
          resolution = '240p';
          crf = 33;
          preset = 'fast';
        } else if (compressionRatio < 0.2) {
          resolution = '360p';
          crf = 28;
          preset = 'fast';
        } else if (compressionRatio < 0.3) {
          resolution = '480p';
          crf = 26;
          preset = 'medium';
        } else if (compressionRatio < 0.5) {
          resolution = '720p';
          crf = 24;
          preset = 'medium';
        } else if (compressionRatio < 0.7) {
          resolution = '1080p';
          crf = 23;
          preset = 'medium';
        } else {
          // Original resolution with slight compression
          resolution = 'original';
          crf = 20;
          preset = 'slow';
        }

        // Calculate bitrate for target size
        const targetBitrate = (targetSize * 8) / metadata.duration / 1000; // kbps
        videoBitrate = Math.floor(targetBitrate * 0.9); // 90% for video, 10% for audio

        const config: CompressionConfig = {
          id: `recommend-${Date.now()}`,
          outputFormat: 'mp4',
          resolution,
          videoBitrate,
          audioBitrate: 128,
          videoCodec: 'libx264',
          audioCodec: 'aac',
          preset,
          crf,
          twoPass: compressionRatio < 0.3,
          targetFileSize: targetSize
        };

        return { success: true, data: config };
      } catch (error: any) {
        console.error('Failed to recommend settings:', error);
        return { success: false, error: error.message };
      }
    });

    // Get platform-optimized settings
    ipcMain.handle('compress:platform-optimize', async (
      event: IpcMainInvokeEvent,
      platform: string
    ) => {
      try {
        const optimizations: { [key: string]: StreamingOptimization } = {
          'YouTube': {
            platform: 'YouTube',
            recommendedSettings: {
              resolution: '1080p',
              videoBitrate: 8000,
              audioBitrate: 192,
              fps: 60,
              codec: 'libx264',
              format: 'mp4'
            }
          },
          'Twitch': {
            platform: 'Twitch',
            recommendedSettings: {
              resolution: '1080p',
              videoBitrate: 6000,
              audioBitrate: 160,
              fps: 60,
              codec: 'libx264',
              format: 'mp4'
            }
          },
          'TikTok': {
            platform: 'TikTok',
            recommendedSettings: {
              resolution: '720p',
              videoBitrate: 4000,
              audioBitrate: 128,
              fps: 30,
              codec: 'libx264',
              format: 'mp4'
            }
          },
          'Instagram': {
            platform: 'Instagram',
            recommendedSettings: {
              resolution: '1080p',
              videoBitrate: 3500,
              audioBitrate: 128,
              fps: 30,
              codec: 'libx264',
              format: 'mp4'
            }
          },
          'Twitter': {
            platform: 'Twitter',
            recommendedSettings: {
              resolution: '720p',
              videoBitrate: 2048,
              audioBitrate: 128,
              fps: 30,
              codec: 'libx264',
              format: 'mp4'
            }
          },
          'Facebook': {
            platform: 'Facebook',
            recommendedSettings: {
              resolution: '1080p',
              videoBitrate: 4000,
              audioBitrate: 128,
              fps: 30,
              codec: 'libx264',
              format: 'mp4'
            }
          }
        };

        const optimization = optimizations[platform];
        if (!optimization) {
          throw new Error(`Platform ${platform} not supported`);
        }

        return { success: true, data: optimization };
      } catch (error: any) {
        console.error('Failed to get platform optimization:', error);
        return { success: false, error: error.message };
      }
    });

    // Create GIF from video
    ipcMain.handle('compress:create-gif', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      options: {
        startTime?: number;
        duration?: number;
        width?: number;
        fps?: number;
      }
    ) => {
      try {
        const outputPath = videoPath.replace(path.extname(videoPath), '.gif');
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
          const args = ['-i', videoPath];

          if (options.startTime !== undefined) {
            args.push('-ss', options.startTime.toString());
          }

          if (options.duration !== undefined) {
            args.push('-t', options.duration.toString());
          }

          args.push('-vf');
          const filters = [];

          if (options.fps) {
            filters.push(`fps=${options.fps}`);
          }

          if (options.width) {
            filters.push(`scale=${options.width}:-1:flags=lanczos`);
          }

          filters.push('split[s0][s1]', '[s0]palettegen[p]', '[s1][p]paletteuse');
          args.push(filters.join(','));

          args.push('-loop', '0');
          args.push(outputPath);

          const ffmpeg = spawn('ffmpeg', args);

          ffmpeg.on('close', (code: number) => {
            if (code === 0) {
              resolve({ success: true, data: outputPath });
            } else {
              reject({ success: false, error: 'Failed to create GIF' });
            }
          });

          ffmpeg.on('error', (error: Error) => {
            reject({ success: false, error: error.message });
          });
        });
      } catch (error: any) {
        console.error('Failed to create GIF:', error);
        return { success: false, error: error.message };
      }
    });

    // Create thumbnail from video
    ipcMain.handle('compress:create-thumbnail', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      timestamp: number = 0
    ) => {
      try {
        const outputPath = videoPath.replace(path.extname(videoPath), '-thumb.jpg');
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-ss', timestamp.toString(),
            '-vframes', '1',
            '-q:v', '2',
            outputPath
          ]);

          ffmpeg.on('close', (code: number) => {
            if (code === 0) {
              resolve({ success: true, data: outputPath });
            } else {
              reject({ success: false, error: 'Failed to create thumbnail' });
            }
          });

          ffmpeg.on('error', (error: Error) => {
            reject({ success: false, error: error.message });
          });
        });
      } catch (error: any) {
        console.error('Failed to create thumbnail:', error);
        return { success: false, error: error.message };
      }
    });

    // Trim video
    ipcMain.handle('compress:trim', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      startTime: number,
      endTime: number
    ) => {
      try {
        const config: CompressionConfig = {
          id: `trim-${Date.now()}`,
          outputFormat: path.extname(videoPath).substring(1) as any,
          resolution: 'original',
          videoCodec: 'copy', // Copy codec for fast trimming
          audioCodec: 'copy',
          preset: 'ultrafast',
          startTime,
          endTime
        };

        const outputPath = videoPath.replace(
          path.extname(videoPath),
          `-trimmed-${startTime}-${endTime}${path.extname(videoPath)}`
        );

        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-ss', startTime.toString(),
            '-to', endTime.toString(),
            '-c', 'copy',
            outputPath
          ]);

          ffmpeg.on('close', (code: number) => {
            if (code === 0) {
              resolve({ success: true, data: outputPath });
            } else {
              reject({ success: false, error: 'Failed to trim video' });
            }
          });

          ffmpeg.on('error', (error: Error) => {
            reject({ success: false, error: error.message });
          });
        });
      } catch (error: any) {
        console.error('Failed to trim video:', error);
        return { success: false, error: error.message };
      }
    });

    // Get compression presets
    ipcMain.handle('compress:presets:list', async (event: IpcMainInvokeEvent) => {
      try {
        const presets = [
          {
            name: 'High Quality',
            config: {
              resolution: 'original',
              crf: 18,
              preset: 'slow',
              videoBitrate: 10000,
              audioBitrate: 320
            },
            description: '最高质量，文件较大'
          },
          {
            name: 'Balanced',
            config: {
              resolution: '1080p',
              crf: 23,
              preset: 'medium',
              videoBitrate: 5000,
              audioBitrate: 192
            },
            description: '平衡质量与大小'
          },
          {
            name: 'Small Size',
            config: {
              resolution: '720p',
              crf: 28,
              preset: 'fast',
              videoBitrate: 2000,
              audioBitrate: 128
            },
            description: '小文件，适合分享'
          },
          {
            name: 'Mobile',
            config: {
              resolution: '480p',
              crf: 30,
              preset: 'fast',
              videoBitrate: 1000,
              audioBitrate: 96
            },
            description: '移动设备优化'
          }
        ];

        return { success: true, data: presets };
      } catch (error: any) {
        console.error('Failed to list presets:', error);
        return { success: false, error: error.message };
      }
    });
  }

  private setupEventForwarding(): void {
    // Forward compression progress
    this.converterService.on('compression-progress', (taskId: string, task: CompressionTask) => {
      this.sendToAllWindows('compress:progress', { taskId, task });
    });

    // Forward compression complete
    this.converterService.on('compression-complete', (taskId: string, task: CompressionTask) => {
      this.sendToAllWindows('compress:complete', { taskId, task });
    });

    // Forward compression error
    this.converterService.on('compression-error', (taskId: string, error: Error) => {
      this.sendToAllWindows('compress:error', { taskId, error: error.message });
    });

    // Forward compression failed
    this.converterService.on('compression-failed', (taskId: string, task: CompressionTask) => {
      this.sendToAllWindows('compress:failed', { taskId, task });
    });

    // Forward compression cancelled
    this.converterService.on('compression-cancelled', (taskId: string) => {
      this.sendToAllWindows('compress:cancelled', { taskId });
    });
  }

  private sendToAllWindows(channel: string, data: any): void {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  destroy(): void {
    this.converterService.removeAllListeners();
  }
}