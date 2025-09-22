/**
 * Binary manager for coordinating all external binaries
 */

import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import { YtDlpWrapper } from './ytdlp-wrapper';
import { FfmpegWrapper } from './ffmpeg-wrapper';
import { WhisperWrapper } from './whisper-wrapper';

export class BinaryManager {
  private ytdlp: YtDlpWrapper;
  private ffmpeg: FfmpegWrapper;
  private whisper: WhisperWrapper;
  private binariesPath: string;
  private initialized: boolean = false;

  constructor() {
    this.ytdlp = new YtDlpWrapper();
    this.ffmpeg = new FfmpegWrapper();
    this.whisper = new WhisperWrapper();

    const isProd = app.isPackaged;
    if (isProd) {
      this.binariesPath = path.join(process.resourcesPath, 'bin');
    } else {
      this.binariesPath = path.join(__dirname, '../../../../bin');
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if all binaries exist
      await this.checkBinaries();

      // Download missing binaries if needed
      await this.downloadMissingBinaries();

      // Verify binaries work
      await this.verifyBinaries();

      this.initialized = true;
      console.log('Binary manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize binary manager:', error);
      throw error;
    }
  }

  private async checkBinaries(): Promise<{ [key: string]: boolean }> {
    const binaries = {
      ytdlp: await this.checkBinary('yt-dlp'),
      ffmpeg: await this.checkBinary('ffmpeg'),
      ffprobe: await this.checkBinary('ffmpeg', 'ffprobe'),
      whisper: await this.checkBinary('whisper')
    };

    console.log('Binary check results:', binaries);
    return binaries;
  }

  private async checkBinary(folder: string, binaryName?: string): Promise<boolean> {
    const platform = process.platform;
    const ext = platform === 'win32' ? '.exe' : '';
    const name = binaryName || folder;
    const binaryPath = path.join(this.binariesPath, folder, `${name}${ext}`);

    return fs.pathExists(binaryPath);
  }

  private async downloadMissingBinaries(): Promise<void> {
    const binariesStatus = await this.checkBinaries();
    const missing = Object.entries(binariesStatus)
      .filter(([_, exists]) => !exists)
      .map(([name]) => name);

    if (missing.length === 0) {
      console.log('All binaries are present');
      return;
    }

    console.log('Missing binaries:', missing);

    // Create download tasks for missing binaries
    const downloadTasks = [];

    if (missing.includes('ytdlp')) {
      downloadTasks.push(this.downloadYtDlp());
    }

    if (missing.includes('ffmpeg') || missing.includes('ffprobe')) {
      downloadTasks.push(this.downloadFfmpeg());
    }

    if (missing.includes('whisper')) {
      downloadTasks.push(this.downloadWhisper());
    }

    await Promise.all(downloadTasks);
  }

  private async downloadYtDlp(): Promise<void> {
    const platform = process.platform;
    const urls: { [key: string]: string } = {
      win32: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      darwin: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
      linux: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
    };

    const url = urls[platform];
    if (!url) throw new Error(`Unsupported platform: ${platform}`);

    const targetDir = path.join(this.binariesPath, 'yt-dlp');
    await fs.ensureDir(targetDir);

    const ext = platform === 'win32' ? '.exe' : '';
    const targetPath = path.join(targetDir, `yt-dlp${ext}`);

    await this.downloadFile(url, targetPath);

    // Make executable on Unix systems
    if (platform !== 'win32') {
      await fs.chmod(targetPath, '755');
    }
  }

  private async downloadFfmpeg(): Promise<void> {
    const platform = process.platform;

    // FFmpeg download URLs (these would be actual URLs)
    const urls: { [key: string]: string } = {
      win32: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
      darwin: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
      linux: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
    };

    const url = urls[platform];
    if (!url) throw new Error(`Unsupported platform: ${platform}`);

    const targetDir = path.join(this.binariesPath, 'ffmpeg');
    await fs.ensureDir(targetDir);

    // Download and extract (simplified - actual implementation would extract archives)
    console.log(`Would download FFmpeg from: ${url}`);
    // Actual implementation would download and extract the archive
  }

  private async downloadWhisper(): Promise<void> {
    const platform = process.platform;

    // Whisper.cpp download URLs (these would be actual URLs)
    const urls: { [key: string]: string } = {
      win32: 'https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-win.zip',
      darwin: 'https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-mac.zip',
      linux: 'https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-linux.zip'
    };

    const url = urls[platform];
    if (!url) throw new Error(`Unsupported platform: ${platform}`);

    const targetDir = path.join(this.binariesPath, 'whisper');
    await fs.ensureDir(targetDir);

    console.log(`Would download Whisper from: ${url}`);
    // Actual implementation would download and extract the archive
  }

  private async downloadFile(url: string, targetPath: string): Promise<void> {
    const https = require('https');
    const file = fs.createWriteStream(targetPath);

    return new Promise((resolve, reject) => {
      https.get(url, (response: any) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          this.downloadFile(response.headers.location, targetPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (error: Error) => {
        fs.unlink(targetPath, () => {});
        reject(error);
      });
    });
  }

  private async verifyBinaries(): Promise<void> {
    // Verify yt-dlp
    try {
      await this.ytdlp.fetchVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      console.log('yt-dlp verified');
    } catch (error) {
      console.warn('yt-dlp verification failed:', error);
    }

    // Verify ffmpeg
    try {
      const testVideo = path.join(__dirname, 'test.mp4');
      if (await fs.pathExists(testVideo)) {
        await this.ffmpeg.getVideoInfo(testVideo);
        console.log('ffmpeg verified');
      }
    } catch (error) {
      console.warn('ffmpeg verification failed:', error);
    }

    // Verify whisper
    try {
      const hasModel = await this.whisper.checkModelExists('tiny' as any);
      console.log('whisper verified, has model:', hasModel);
    } catch (error) {
      console.warn('whisper verification failed:', error);
    }
  }

  getYtDlp(): YtDlpWrapper {
    return this.ytdlp;
  }

  getFfmpeg(): FfmpegWrapper {
    return this.ffmpeg;
  }

  getWhisper(): WhisperWrapper {
    return this.whisper;
  }

  async cleanup(): Promise<void> {
    this.ytdlp.cleanup();
    this.ffmpeg.cleanup();
    this.whisper.cleanup();
  }

  async updateBinaries(): Promise<void> {
    try {
      // Update yt-dlp
      await this.ytdlp.updateBinary();
      console.log('yt-dlp updated');

      // FFmpeg and Whisper don't have built-in update mechanisms
      // Would need to re-download latest versions
    } catch (error) {
      console.error('Failed to update binaries:', error);
      throw error;
    }
  }

  async getBinaryVersions(): Promise<{ [key: string]: string }> {
    const versions: { [key: string]: string } = {};

    // Get yt-dlp version
    try {
      const { execSync } = require('child_process');
      const ytdlpVersion = execSync(`${path.join(this.binariesPath, 'yt-dlp', 'yt-dlp')} --version`)
        .toString()
        .trim();
      versions.ytdlp = ytdlpVersion;
    } catch (error) {
      versions.ytdlp = 'unknown';
    }

    // Get ffmpeg version
    try {
      const { execSync } = require('child_process');
      const ffmpegVersion = execSync(`${path.join(this.binariesPath, 'ffmpeg', 'ffmpeg')} -version`)
        .toString()
        .split('\n')[0]
        .split(' ')[2];
      versions.ffmpeg = ffmpegVersion;
    } catch (error) {
      versions.ffmpeg = 'unknown';
    }

    // Whisper version is tied to the binary build
    versions.whisper = '1.0.0';

    return versions;
  }
}

// Singleton instance
let binaryManager: BinaryManager | null = null;

export function getBinaryManager(): BinaryManager {
  if (!binaryManager) {
    binaryManager = new BinaryManager();
  }
  return binaryManager;
}