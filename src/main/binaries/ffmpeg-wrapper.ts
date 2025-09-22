/**
 * FFmpeg binary wrapper
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import { CompressionConfig, VideoCodec, AudioCodec } from '../../shared/types/compression';

export class FfmpegWrapper {
  private ffmpegPath: string;
  private ffprobePath: string;
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    const platform = process.platform;
    const isProd = app.isPackaged;

    if (isProd) {
      const resourcePath = process.resourcesPath;
      this.ffmpegPath = path.join(resourcePath, 'bin', 'ffmpeg', this.getFfmpegBinaryName());
      this.ffprobePath = path.join(resourcePath, 'bin', 'ffmpeg', this.getFfprobeBinaryName());
    } else {
      this.ffmpegPath = path.join(__dirname, '../../../../bin', 'ffmpeg', this.getFfmpegBinaryName());
      this.ffprobePath = path.join(__dirname, '../../../../bin', 'ffmpeg', this.getFfprobeBinaryName());
    }

    this.ensureBinaryExecutable();
  }

  private getFfmpegBinaryName(): string {
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  private getFfprobeBinaryName(): string {
    return process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  }

  private ensureBinaryExecutable(): void {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(this.ffmpegPath, '755');
        fs.chmodSync(this.ffprobePath, '755');
      } catch (error) {
        console.error('Failed to make ffmpeg/ffprobe executable:', error);
      }
    }
  }

  async getVideoInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ];

      const process = spawn(this.ffprobePath, args);
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
            const info = JSON.parse(stdout);
            resolve(info);
          } catch (error) {
            reject(new Error(`Failed to parse video info: ${error}`));
          }
        } else {
          reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async compress(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    onProgress?: (progress: any) => void
  ): Promise<{ taskId: string; process: ChildProcess }> {
    const taskId = `compress-${Date.now()}`;

    // Get video duration for progress calculation
    const videoInfo = await this.getVideoInfo(inputPath);
    const duration = parseFloat(videoInfo.format.duration);

    const args: string[] = [
      '-i', inputPath,
      '-y' // Overwrite output file
    ];

    // Video codec
    args.push('-c:v', this.getVideoCodecString(config.videoCodec));

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

    // Video bitrate or CRF
    if (config.crf !== undefined) {
      args.push('-crf', config.crf.toString());
    } else if (config.videoBitrate) {
      args.push('-b:v', `${config.videoBitrate}k`);
    }

    // Resolution
    if (config.resolution && config.resolution !== 'original') {
      const resolutionMap: { [key: string]: string } = {
        '2160p': '3840:2160',
        '1440p': '2560:1440',
        '1080p': '1920:1080',
        '720p': '1280:720',
        '480p': '854:480',
        '360p': '640:360'
      };
      const scale = resolutionMap[config.resolution];
      if (scale) {
        args.push('-vf', `scale=${scale}:force_original_aspect_ratio=decrease`);
      }
    }

    // Frame rate
    if (config.fps && config.fps > 0) {
      args.push('-r', config.fps.toString());
    }

    // Audio codec
    if (config.audioCodec === AudioCodec.COPY) {
      args.push('-c:a', 'copy');
    } else {
      args.push('-c:a', this.getAudioCodecString(config.audioCodec));
      if (config.audioBitrate) {
        args.push('-b:a', `${config.audioBitrate}k`);
      }
    }

    // Two-pass encoding
    if (config.twoPass) {
      // First pass
      const passLogFile = path.join(path.dirname(outputPath), `ffmpeg2pass-${taskId}`);
      const firstPassArgs = [
        ...args,
        '-pass', '1',
        '-passlogfile', passLogFile,
        '-f', 'null',
        process.platform === 'win32' ? 'NUL' : '/dev/null'
      ];

      await this.runCommand(firstPassArgs);

      // Second pass
      args.push('-pass', '2', '-passlogfile', passLogFile);
    }

    // Metadata
    if (!config.keepMetadata) {
      args.push('-map_metadata', '-1');
    }

    // Progress tracking
    args.push('-progress', 'pipe:1', '-stats_period', '1');

    // Output file
    args.push(outputPath);

    const process = spawn(this.ffmpegPath, args);
    this.processes.set(taskId, process);

    // Handle progress
    if (onProgress) {
      let lastProgress = 0;
      process.stdout.on('data', (data) => {
        const output = data.toString();
        const timeMatch = output.match(/out_time_ms=(\d+)/);

        if (timeMatch) {
          const currentTime = parseInt(timeMatch[1]) / 1000000; // Convert to seconds
          const progress = (currentTime / duration) * 100;

          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress({
              taskId,
              progress: Math.min(progress, 100),
              currentTime,
              totalTime: duration
            });
          }
        }
      });
    }

    return { taskId, process };
  }

  private getVideoCodecString(codec: VideoCodec): string {
    switch (codec) {
      case VideoCodec.H264:
        return 'libx264';
      case VideoCodec.H265:
        return 'libx265';
      case VideoCodec.VP9:
        return 'libvpx-vp9';
      case VideoCodec.AV1:
        return 'libaom-av1';
      default:
        return 'libx264';
    }
  }

  private getAudioCodecString(codec: AudioCodec): string {
    switch (codec) {
      case AudioCodec.AAC:
        return 'aac';
      case AudioCodec.MP3:
        return 'libmp3lame';
      case AudioCodec.OPUS:
        return 'libopus';
      default:
        return 'aac';
    }
  }

  async embedSubtitles(
    videoPath: string,
    subtitlePaths: string[],
    outputPath: string,
    options: {
      burnIn?: boolean;
      defaultSubtitle?: number;
    } = {}
  ): Promise<void> {
    const args: string[] = [
      '-i', videoPath
    ];

    // Add subtitle files
    for (const subtitlePath of subtitlePaths) {
      args.push('-i', subtitlePath);
    }

    if (options.burnIn) {
      // Burn subtitles into video
      const filterComplex = subtitlePaths
        .map((_, index) => `[0:v][${index + 1}:s]overlay`)
        .join(',');
      args.push('-filter_complex', filterComplex);
    } else {
      // Soft subtitles
      args.push('-c:v', 'copy');
      args.push('-c:a', 'copy');

      // Map all streams
      args.push('-map', '0');
      subtitlePaths.forEach((_, index) => {
        args.push('-map', `${index + 1}`);
      });

      // Set default subtitle
      if (options.defaultSubtitle !== undefined) {
        args.push('-disposition:s:0', 'default');
      }
    }

    args.push('-y', outputPath);

    await this.runCommand(args);
  }

  async mergeVideos(
    videoPaths: string[],
    outputPath: string,
    options: {
      transition?: 'none' | 'fade' | 'dissolve';
      transitionDuration?: number;
    } = {}
  ): Promise<void> {
    // Create concat file
    const concatFile = path.join(path.dirname(outputPath), `concat-${Date.now()}.txt`);
    const concatContent = videoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(concatFile, concatContent);

    const args: string[] = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c', 'copy',
      '-y', outputPath
    ];

    try {
      await this.runCommand(args);
    } finally {
      // Clean up concat file
      await fs.remove(concatFile);
    }
  }

  async extractFrames(
    videoPath: string,
    outputDir: string,
    options: {
      fps?: number;
      startTime?: number;
      duration?: number;
      format?: 'jpg' | 'png';
    } = {}
  ): Promise<void> {
    await fs.ensureDir(outputDir);

    const args: string[] = ['-i', videoPath];

    if (options.startTime) {
      args.push('-ss', options.startTime.toString());
    }

    if (options.duration) {
      args.push('-t', options.duration.toString());
    }

    const fps = options.fps || 1;
    args.push('-vf', `fps=${fps}`);

    const format = options.format || 'jpg';
    const outputPattern = path.join(outputDir, `frame-%04d.${format}`);
    args.push(outputPattern);

    await this.runCommand(args);
  }

  async createThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp: number = 0,
    size: string = '320x240'
  ): Promise<void> {
    const args = [
      '-i', videoPath,
      '-ss', timestamp.toString(),
      '-vframes', '1',
      '-vf', `scale=${size}`,
      '-y', outputPath
    ];

    await this.runCommand(args);
  }

  private runCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  cancelTask(taskId: string): boolean {
    const process = this.processes.get(taskId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(taskId);
      return true;
    }
    return false;
  }

  cleanup(): void {
    for (const [taskId, process] of this.processes) {
      process.kill('SIGTERM');
    }
    this.processes.clear();
  }
}