/**
 * ConverterService - Handles video conversion and compression using ffmpeg
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
  CompressionConfig,
  CompressionTask,
  CompressionResult,
  VideoResolution,
  CompressionPreset
} from '../../shared/types/compression';
import { VideoMetadata } from '../../shared/types/video';
import { ProcessingTask } from '../../shared/types/tasks';
import { IConverterService } from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

export class ConverterService extends EventEmitter implements IConverterService {
  private ffmpegPath: string;
  private ffprobePath: string;
  private tasks: Map<string, CompressionTask> = new Map();
  private processes: Map<string, ChildProcess> = new Map();

  constructor(ffmpegPath?: string, ffprobePath?: string) {
    super();
    this.ffmpegPath = ffmpegPath || this.getFfmpegPath();
    this.ffprobePath = ffprobePath || this.getFfprobePath();
  }

  private getFfmpegPath(): string {
    const possiblePaths = [
      path.join(__dirname, '../../../binaries/ffmpeg'),
      path.join(process.resourcesPath, 'binaries/ffmpeg'),
      'ffmpeg'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return 'ffmpeg';
  }

  private getFfprobePath(): string {
    const possiblePaths = [
      path.join(__dirname, '../../../binaries/ffprobe'),
      path.join(process.resourcesPath, 'binaries/ffprobe'),
      'ffprobe'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return 'ffprobe';
  }

  async compressVideo(inputPath: string, config: CompressionConfig): Promise<CompressionTask> {
    const taskId = this.generateTaskId();
    const outputPath = this.generateOutputPath(inputPath, config);

    const task: CompressionTask = {
      id: taskId,
      type: 'VIDEO_COMPRESSION',
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing',
      totalSteps: config.twoPass ? 2 : 1,
      estimatedTime: await this.estimateCompressionTime(inputPath, config),
      inputFile: inputPath,
      outputFile: outputPath,
      config,
      startedAt: new Date()
    };

    this.tasks.set(taskId, task);

    if (config.twoPass) {
      await this.performTwoPassEncoding(inputPath, outputPath, config, taskId);
    } else {
      await this.performSinglePassEncoding(inputPath, outputPath, config, taskId);
    }

    return task;
  }

  private async performSinglePassEncoding(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    taskId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.buildFfmpegArgs(inputPath, outputPath, config);
      const process = spawn(this.ffmpegPath, args);
      this.processes.set(taskId, process);

      let duration = 0;
      let errorOutput = '';

      process.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;

        // Parse duration if not already set
        if (duration === 0) {
          const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3]);
          }
        }

        // Parse progress
        this.parseFFmpegProgress(output, taskId, duration);
      });

      process.on('close', (code) => {
        this.processes.delete(taskId);
        const task = this.tasks.get(taskId);

        if (task) {
          if (code === 0) {
            task.status = 'completed';
            task.progress = 100;
            task.completedAt = new Date();
            this.emit('compression-complete', taskId, task);
            resolve();
          } else {
            task.status = 'failed';
            task.error = `FFmpeg exited with code ${code}: ${errorOutput}`;
            this.emit('compression-failed', taskId, task);
            reject(new Error(task.error));
          }
        }
      });

      process.on('error', (error) => {
        this.processes.delete(taskId);
        const task = this.tasks.get(taskId);
        if (task) {
          task.status = 'failed';
          task.error = error.message;
          this.emit('compression-error', taskId, error);
        }
        reject(error);
      });
    });
  }

  private async performTwoPassEncoding(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    taskId: string
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // First pass
    task.currentStep = 'First pass: Analyzing';
    await this.runFFmpegPass(inputPath, outputPath, config, taskId, 1);

    // Second pass
    task.currentStep = 'Second pass: Encoding';
    await this.runFFmpegPass(inputPath, outputPath, config, taskId, 2);

    // Clean up pass log files
    const passLogPrefix = outputPath.replace(path.extname(outputPath), '');
    if (fs.existsSync(`${passLogPrefix}-0.log`)) {
      fs.unlinkSync(`${passLogPrefix}-0.log`);
    }
    if (fs.existsSync(`${passLogPrefix}-0.log.mbtree`)) {
      fs.unlinkSync(`${passLogPrefix}-0.log.mbtree`);
    }
  }

  private runFFmpegPass(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    taskId: string,
    passNumber: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.buildFfmpegArgs(inputPath, outputPath, config, passNumber);
      const process = spawn(this.ffmpegPath, args);
      this.processes.set(`${taskId}-pass${passNumber}`, process);

      let duration = 0;
      let errorOutput = '';

      process.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;

        if (duration === 0) {
          const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3]);
          }
        }

        this.parseFFmpegProgress(output, taskId, duration, passNumber);
      });

      process.on('close', (code) => {
        this.processes.delete(`${taskId}-pass${passNumber}`);

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Pass ${passNumber} failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        this.processes.delete(`${taskId}-pass${passNumber}`);
        reject(error);
      });
    });
  }

  private buildFfmpegArgs(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    passNumber?: number
  ): string[] {
    const args = ['-i', inputPath];

    // Hardware acceleration
    if (config.hardwareAcceleration) {
      if (process.platform === 'darwin') {
        args.unshift('-hwaccel', 'videotoolbox');
      } else if (process.platform === 'win32') {
        args.unshift('-hwaccel', 'dxva2');
      } else {
        args.unshift('-hwaccel', 'vaapi');
      }
    }

    // Video codec
    if (config.videoCodec) {
      args.push('-c:v', config.videoCodec);
    } else {
      args.push('-c:v', 'libx264');
    }

    // Resolution
    if (config.resolution && config.resolution !== 'original') {
      const scale = this.getScaleForResolution(config.resolution);
      args.push('-vf', `scale=${scale}`);
    }

    // Bitrate or CRF
    if (config.crf !== undefined) {
      args.push('-crf', config.crf.toString());
    } else if (config.videoBitrate) {
      args.push('-b:v', `${config.videoBitrate}k`);
    }

    // Preset
    if (config.preset) {
      args.push('-preset', config.preset);
    }

    // FPS
    if (config.fps) {
      args.push('-r', config.fps.toString());
    }

    // Audio
    if (config.removeAudio) {
      args.push('-an');
    } else {
      if (config.audioCodec) {
        args.push('-c:a', config.audioCodec);
      } else {
        args.push('-c:a', 'aac');
      }

      if (config.audioBitrate) {
        args.push('-b:a', `${config.audioBitrate}k`);
      }

      if (config.normalizeAudio) {
        args.push('-af', 'loudnorm');
      }
    }

    // Two-pass encoding
    if (config.twoPass && passNumber) {
      const passLogPrefix = outputPath.replace(path.extname(outputPath), '');
      args.push('-pass', passNumber.toString());
      args.push('-passlogfile', passLogPrefix);

      if (passNumber === 1) {
        args.push('-f', 'null');
        args.push(process.platform === 'win32' ? 'NUL' : '/dev/null');
      } else {
        args.push('-y', outputPath);
      }
    } else {
      args.push('-y', outputPath);
    }

    // Time range
    if (config.startTime !== undefined) {
      args.push('-ss', config.startTime.toString());
    }
    if (config.endTime !== undefined) {
      args.push('-to', config.endTime.toString());
    }

    // Progress reporting
    args.push('-progress', '-', '-nostats');

    return args;
  }

  private getScaleForResolution(resolution: VideoResolution): string {
    const scales: { [key: string]: string } = {
      '4K': '3840:2160',
      '2K': '2560:1440',
      '1080p': '1920:1080',
      '720p': '1280:720',
      '480p': '854:480',
      '360p': '640:360',
      '240p': '426:240'
    };

    return scales[resolution] || '1920:1080';
  }

  private parseFFmpegProgress(output: string, taskId: string, duration: number, passNumber?: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const timeMatch = output.match(/out_time_ms=(\d+)/);
    if (timeMatch && duration > 0) {
      const currentTimeMs = parseInt(timeMatch[1]);
      const currentTimeSec = currentTimeMs / 1000000;
      let progress = (currentTimeSec / duration) * 100;

      // Adjust progress for two-pass encoding
      if (task.config?.twoPass) {
        if (passNumber === 1) {
          progress = progress / 2;
        } else {
          progress = 50 + (progress / 2);
        }
      }

      task.progress = Math.min(progress, 100);
      task.elapsedTime = (Date.now() - task.startedAt!.getTime()) / 1000;

      // Parse speed
      const speedMatch = output.match(/speed=([\d.]+)x/);
      if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        const remainingTime = (duration - currentTimeSec) / speed;
        task.estimatedTime = task.elapsedTime + remainingTime;
      }

      this.emit('compression-progress', taskId, task);
    }
  }

  async convertFormat(inputPath: string, outputFormat: string): Promise<ProcessingTask> {
    const taskId = this.generateTaskId();
    const outputPath = inputPath.replace(path.extname(inputPath), `.${outputFormat}`);

    const task: ProcessingTask = {
      id: taskId,
      type: 'FORMAT_CONVERSION',
      status: 'downloading',
      progress: 0,
      inputFile: inputPath,
      outputFile: outputPath,
      startTime: new Date()
    };

    this.tasks.set(taskId, task as CompressionTask);

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-y', outputPath
      ];

      const process = spawn(this.ffmpegPath, args);
      this.processes.set(taskId, process);

      process.stderr.on('data', (data) => {
        const output = data.toString();
        this.parseFFmpegProgress(output, taskId, 0);
      });

      process.on('close', (code) => {
        this.processes.delete(taskId);

        if (code === 0) {
          task.status = 'completed';
          task.endTime = new Date();
          resolve(task);
        } else {
          task.status = 'failed';
          task.error = `Format conversion failed with code ${code}`;
          reject(new Error(task.error));
        }
      });

      process.on('error', (error) => {
        this.processes.delete(taskId);
        task.status = 'failed';
        task.error = error.message;
        reject(error);
      });
    });
  }

  async extractAudio(inputPath: string, format: 'mp3' | 'aac' | 'wav'): Promise<ProcessingTask> {
    const taskId = this.generateTaskId();
    const outputPath = inputPath.replace(path.extname(inputPath), `.${format}`);

    const task: ProcessingTask = {
      id: taskId,
      type: 'FORMAT_CONVERSION',
      status: 'downloading',
      progress: 0,
      inputFile: inputPath,
      outputFile: outputPath,
      startTime: new Date()
    };

    this.tasks.set(taskId, task as CompressionTask);

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-vn', // No video
        '-c:a', format === 'mp3' ? 'libmp3lame' : format === 'wav' ? 'pcm_s16le' : 'aac',
        '-b:a', '192k',
        '-y', outputPath
      ];

      const process = spawn(this.ffmpegPath, args);
      this.processes.set(taskId, process);

      process.stderr.on('data', (data) => {
        const output = data.toString();
        this.parseFFmpegProgress(output, taskId, 0);
      });

      process.on('close', (code) => {
        this.processes.delete(taskId);

        if (code === 0) {
          task.status = 'completed';
          task.endTime = new Date();
          resolve(task);
        } else {
          task.status = 'failed';
          task.error = `Audio extraction failed with code ${code}`;
          reject(new Error(task.error));
        }
      });

      process.on('error', (error) => {
        this.processes.delete(taskId);
        task.status = 'failed';
        task.error = error.message;
        reject(error);
      });
    });
  }

  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ];

      const process = spawn(this.ffprobePath, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed: ${errorOutput}`));
          return;
        }

        try {
          const metadata = JSON.parse(output);
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

          const videoMetadata: VideoMetadata = {
            duration: parseFloat(metadata.format.duration) || 0,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: eval(videoStream?.r_frame_rate) || 0,
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            codec: videoStream?.codec_name || '',
            audioCodec: audioStream?.codec_name || '',
            fileSize: parseInt(metadata.format.size) || 0,
            hasAudio: !!audioStream,
            hasVideo: !!videoStream,
            creationTime: metadata.format.tags?.creation_time ? new Date(metadata.format.tags.creation_time) : undefined
          };

          resolve(videoMetadata);
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffprobe: ${error}`));
      });
    });
  }

  async estimateFileSize(videoPath: string, config: CompressionConfig): Promise<number> {
    const metadata = await this.getVideoMetadata(videoPath);
    let estimatedSize = 0;

    if (config.crf !== undefined) {
      // CRF-based estimation (rough approximation)
      const crfFactors: { [key: number]: number } = {
        18: 0.8,  // High quality
        23: 0.4,  // Medium quality
        28: 0.2,  // Low quality
        33: 0.1   // Very low quality
      };

      const factor = crfFactors[config.crf] || 0.4;
      estimatedSize = metadata.fileSize * factor;
    } else if (config.videoBitrate && config.audioBitrate) {
      // Bitrate-based estimation
      const totalBitrate = (config.videoBitrate + config.audioBitrate) * 1000; // Convert to bits
      estimatedSize = (totalBitrate * metadata.duration) / 8; // Convert to bytes
    } else {
      // Default estimation based on resolution change
      const resolutionFactors: { [key: string]: number } = {
        '4K': 1.2,
        '2K': 0.8,
        '1080p': 0.5,
        '720p': 0.3,
        '480p': 0.2,
        '360p': 0.15,
        '240p': 0.1,
        'original': 1.0
      };

      const factor = resolutionFactors[config.resolution] || 0.5;
      estimatedSize = metadata.fileSize * factor;
    }

    // Apply preset factor
    if (config.preset) {
      const presetFactors: { [key: string]: number } = {
        'ultrafast': 1.3,
        'superfast': 1.2,
        'veryfast': 1.1,
        'faster': 1.05,
        'fast': 1.0,
        'medium': 0.95,
        'slow': 0.9,
        'slower': 0.85,
        'veryslow': 0.8
      };

      estimatedSize *= presetFactors[config.preset] || 1.0;
    }

    return Math.round(estimatedSize);
  }

  async cancelProcessing(taskId: string): Promise<void> {
    const process = this.processes.get(taskId);
    const task = this.tasks.get(taskId);

    if (process) {
      process.kill('SIGKILL');
      this.processes.delete(taskId);
    }

    if (task) {
      task.status = 'cancelled';
      task.completedAt = new Date();

      // Clean up output file if exists
      if (task.outputFile && fs.existsSync(task.outputFile)) {
        fs.unlinkSync(task.outputFile);
      }

      this.emit('compression-cancelled', taskId);
    } else {
      throw new Error('Task not found');
    }
  }

  private generateOutputPath(inputPath: string, config: CompressionConfig): string {
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, path.extname(inputPath));
    const extension = `.${config.outputFormat}`;
    const resolution = config.resolution !== 'original' ? `-${config.resolution}` : '';
    const quality = config.crf ? `-crf${config.crf}` : '';

    return path.join(dir, `${basename}${resolution}${quality}${extension}`);
  }

  private async estimateCompressionTime(inputPath: string, config: CompressionConfig): Promise<number> {
    const metadata = await this.getVideoMetadata(inputPath);
    let estimatedTime = metadata.duration;

    // Adjust based on preset
    const presetMultipliers: { [key: string]: number } = {
      'ultrafast': 0.3,
      'superfast': 0.5,
      'veryfast': 0.7,
      'faster': 0.9,
      'fast': 1.0,
      'medium': 1.5,
      'slow': 2.5,
      'slower': 4.0,
      'veryslow': 8.0
    };

    if (config.preset) {
      estimatedTime *= presetMultipliers[config.preset] || 1.5;
    }

    // Adjust for two-pass encoding
    if (config.twoPass) {
      estimatedTime *= 1.8;
    }

    // Adjust for hardware acceleration
    if (config.hardwareAcceleration) {
      estimatedTime *= 0.4;
    }

    return Math.round(estimatedTime);
  }

  private generateTaskId(): string {
    return `compress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}