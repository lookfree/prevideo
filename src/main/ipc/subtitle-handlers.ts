/**
 * Subtitle-related IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SubtitleService } from '../services/subtitles';
import { StorageService } from '../services/storage';
import {
  Subtitle,
  SubtitleInfo,
  SubtitleGenerationOptions,
  EmbedSubtitleOptions,
  BilingualSubtitleConfig
} from '../../shared/types/subtitle';

export class SubtitleHandlers {
  private subtitleService: SubtitleService;
  private storageService: StorageService;

  constructor(subtitleService: SubtitleService, storageService: StorageService) {
    this.subtitleService = subtitleService;
    this.storageService = storageService;
    this.registerHandlers();
    this.setupEventForwarding();
  }

  private registerHandlers(): void {
    // List available subtitles for video
    ipcMain.handle('subtitle:list', async (event: IpcMainInvokeEvent, videoUrl: string) => {
      try {
        const subtitles = await this.subtitleService.listAvailableSubtitles(videoUrl);
        return { success: true, data: subtitles };
      } catch (error: any) {
        console.error('Failed to list subtitles:', error);
        return { success: false, error: error.message };
      }
    });

    // Download subtitle
    ipcMain.handle('subtitle:download', async (
      event: IpcMainInvokeEvent,
      videoUrl: string,
      language: string,
      format: 'srt' | 'vtt' | 'ass' = 'srt'
    ) => {
      try {
        const subtitle = await this.subtitleService.downloadSubtitle(videoUrl, language, format);
        return { success: true, data: subtitle };
      } catch (error: any) {
        console.error('Failed to download subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Generate subtitle using Whisper
    ipcMain.handle('subtitle:generate', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      options: SubtitleGenerationOptions
    ) => {
      try {
        // Use user preferences if not specified
        const preferences = await this.storageService.getPreferences();

        const mergedOptions: SubtitleGenerationOptions = {
          language: options.language || preferences.language,
          model: options.model || 'base',
          translate: options.translate || false,
          detectLanguage: options.detectLanguage || !options.language,
          task: options.task || 'transcribe',
          outputFormat: options.outputFormat || 'srt'
        };

        const subtitle = await this.subtitleService.generateSubtitle(videoPath, mergedOptions);
        return { success: true, data: subtitle };
      } catch (error: any) {
        console.error('Failed to generate subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Embed subtitles into video
    ipcMain.handle('subtitle:embed', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      options: EmbedSubtitleOptions
    ) => {
      try {
        const task = await this.subtitleService.embedSubtitles(videoPath, options);
        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to embed subtitles:', error);
        return { success: false, error: error.message };
      }
    });

    // Create bilingual subtitles
    ipcMain.handle('subtitle:bilingual:create', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      config: BilingualSubtitleConfig
    ) => {
      try {
        // Download or generate both subtitles
        const primarySubtitle = await this.getOrGenerateSubtitle(
          videoPath,
          config.primaryLanguage
        );

        const secondarySubtitle = await this.getOrGenerateSubtitle(
          videoPath,
          config.secondaryLanguage
        );

        // Create embed options
        const embedOptions: EmbedSubtitleOptions = {
          primarySubtitle,
          secondarySubtitle,
          layout: config.layout,
          styling: config.styling,
          outputPath: videoPath.replace(
            path.extname(videoPath),
            `-bilingual-${config.primaryLanguage}-${config.secondaryLanguage}${path.extname(videoPath)}`
          ),
          hardSub: true
        };

        const task = await this.subtitleService.embedSubtitles(videoPath, embedOptions);
        return { success: true, data: task };
      } catch (error: any) {
        console.error('Failed to create bilingual subtitles:', error);
        return { success: false, error: error.message };
      }
    });

    // Convert subtitle format
    ipcMain.handle('subtitle:convert', async (
      event: IpcMainInvokeEvent,
      subtitle: Subtitle,
      targetFormat: 'srt' | 'vtt' | 'ass'
    ) => {
      try {
        const converted = await this.subtitleService.convertFormat(subtitle, targetFormat);
        return { success: true, data: converted };
      } catch (error: any) {
        console.error('Failed to convert subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Save subtitle to file
    ipcMain.handle('subtitle:save', async (
      event: IpcMainInvokeEvent,
      subtitle: Subtitle,
      filePath: string
    ) => {
      try {
        fs.writeFileSync(filePath, subtitle.content, 'utf-8');
        return { success: true, data: filePath };
      } catch (error: any) {
        console.error('Failed to save subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Load subtitle from file
    ipcMain.handle('subtitle:load', async (
      event: IpcMainInvokeEvent,
      filePath: string
    ) => {
      try {
        if (!fs.existsSync(filePath)) {
          throw new Error('Subtitle file not found');
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const format = path.extname(filePath).substring(1) as 'srt' | 'vtt' | 'ass';

        const subtitle: Subtitle = {
          id: `loaded-${Date.now()}`,
          videoId: 'unknown',
          language: this.detectLanguageFromPath(filePath),
          languageName: '',
          format,
          content,
          isAutoGenerated: false
        };

        return { success: true, data: subtitle };
      } catch (error: any) {
        console.error('Failed to load subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Sync subtitle timing
    ipcMain.handle('subtitle:sync', async (
      event: IpcMainInvokeEvent,
      subtitle: Subtitle,
      offsetMs: number
    ) => {
      try {
        const synced = this.syncSubtitleTiming(subtitle, offsetMs);
        return { success: true, data: synced };
      } catch (error: any) {
        console.error('Failed to sync subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Translate subtitle
    ipcMain.handle('subtitle:translate', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      sourceLanguage: string,
      targetLanguage: string
    ) => {
      try {
        // Use Whisper to translate
        const options: SubtitleGenerationOptions = {
          language: targetLanguage,
          model: 'base',
          translate: true,
          task: 'translate',
          outputFormat: 'srt'
        };

        const translated = await this.subtitleService.generateSubtitle(videoPath, options);
        return { success: true, data: translated };
      } catch (error: any) {
        console.error('Failed to translate subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Extract subtitles from video
    ipcMain.handle('subtitle:extract', async (
      event: IpcMainInvokeEvent,
      videoPath: string,
      streamIndex: number = 0
    ) => {
      try {
        const subtitle = await this.extractSubtitleFromVideo(videoPath, streamIndex);
        return { success: true, data: subtitle };
      } catch (error: any) {
        console.error('Failed to extract subtitle:', error);
        return { success: false, error: error.message };
      }
    });

    // Get subtitle preview
    ipcMain.handle('subtitle:preview', async (
      event: IpcMainInvokeEvent,
      subtitle: Subtitle,
      startTime: number,
      endTime: number
    ) => {
      try {
        const preview = this.getSubtitlePreview(subtitle, startTime, endTime);
        return { success: true, data: preview };
      } catch (error: any) {
        console.error('Failed to get subtitle preview:', error);
        return { success: false, error: error.message };
      }
    });

    // Get Whisper models
    ipcMain.handle('subtitle:models:list', async (event: IpcMainInvokeEvent) => {
      try {
        const models = [
          { name: 'tiny', size: '39 MB', languages: 'All', quality: 'Fastest, lower accuracy' },
          { name: 'base', size: '74 MB', languages: 'All', quality: 'Fast, good accuracy' },
          { name: 'small', size: '244 MB', languages: 'All', quality: 'Balanced speed and accuracy' },
          { name: 'medium', size: '769 MB', languages: 'All', quality: 'Slower, better accuracy' },
          { name: 'large', size: '1550 MB', languages: 'All', quality: 'Slowest, best accuracy' }
        ];

        return { success: true, data: models };
      } catch (error: any) {
        console.error('Failed to list models:', error);
        return { success: false, error: error.message };
      }
    });

    // Download Whisper model
    ipcMain.handle('subtitle:model:download', async (
      event: IpcMainInvokeEvent,
      modelName: string
    ) => {
      try {
        // Implementation would download the model
        // For now, return success
        return { success: true, data: { model: modelName, path: `/models/${modelName}.bin` } };
      } catch (error: any) {
        console.error('Failed to download model:', error);
        return { success: false, error: error.message };
      }
    });
  }

  private setupEventForwarding(): void {
    // Forward subtitle generation progress
    this.subtitleService.on('subtitle-progress', (taskId: string, task: any) => {
      this.sendToAllWindows('subtitle:generation:progress', { taskId, task });
    });

    // Forward embed progress
    this.subtitleService.on('embed-progress', (taskId: string, task: any) => {
      this.sendToAllWindows('subtitle:embed:progress', { taskId, task });
    });
  }

  private async getOrGenerateSubtitle(
    videoPath: string,
    language: string
  ): Promise<Subtitle> {
    // Try to download first
    try {
      const videoUrl = this.getVideoUrlFromPath(videoPath);
      if (videoUrl) {
        return await this.subtitleService.downloadSubtitle(videoUrl, language);
      }
    } catch (error) {
      console.log(`Could not download subtitle for ${language}, generating instead`);
    }

    // Generate if download fails
    const options: SubtitleGenerationOptions = {
      language,
      model: 'base',
      outputFormat: 'srt'
    };

    return await this.subtitleService.generateSubtitle(videoPath, options);
  }

  private getVideoUrlFromPath(videoPath: string): string | null {
    // Try to extract URL from filename or metadata
    // This is a simplified implementation
    const filename = path.basename(videoPath);
    const match = filename.match(/\[([^\]]+)\]/);
    return match ? match[1] : null;
  }

  private detectLanguageFromPath(filePath: string): string {
    const filename = path.basename(filePath);
    const langCodes = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt', 'it'];

    for (const code of langCodes) {
      if (filename.includes(code)) {
        return code;
      }
    }

    return 'unknown';
  }

  private syncSubtitleTiming(subtitle: Subtitle, offsetMs: number): Subtitle {
    const lines = subtitle.content.split('\n');
    const synced: string[] = [];

    for (const line of lines) {
      if (subtitle.format === 'srt') {
        // Match SRT timestamp format
        const match = line.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        if (match) {
          const start = this.adjustTimestamp(match[1], offsetMs);
          const end = this.adjustTimestamp(match[2], offsetMs);
          synced.push(`${start} --> ${end}`);
        } else {
          synced.push(line);
        }
      } else if (subtitle.format === 'vtt') {
        // Match VTT timestamp format
        const match = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (match) {
          const start = this.adjustTimestamp(match[1].replace('.', ','), offsetMs).replace(',', '.');
          const end = this.adjustTimestamp(match[2].replace('.', ','), offsetMs).replace(',', '.');
          synced.push(`${start} --> ${end}`);
        } else {
          synced.push(line);
        }
      } else {
        synced.push(line);
      }
    }

    return {
      ...subtitle,
      content: synced.join('\n')
    };
  }

  private adjustTimestamp(timestamp: string, offsetMs: number): string {
    const parts = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!parts) return timestamp;

    const hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const seconds = parseInt(parts[3]);
    const milliseconds = parseInt(parts[4]);

    let totalMs = hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
    totalMs += offsetMs;

    // Ensure non-negative
    totalMs = Math.max(0, totalMs);

    const newHours = Math.floor(totalMs / 3600000);
    totalMs %= 3600000;
    const newMinutes = Math.floor(totalMs / 60000);
    totalMs %= 60000;
    const newSeconds = Math.floor(totalMs / 1000);
    const newMs = totalMs % 1000;

    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')},${String(newMs).padStart(3, '0')}`;
  }

  private async extractSubtitleFromVideo(videoPath: string, streamIndex: number): Promise<Subtitle> {
    // This would use ffmpeg to extract embedded subtitles
    // Simplified implementation
    const { spawn } = require('child_process');
    const outputPath = path.join('/tmp', `extracted-${Date.now()}.srt`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-map', `0:s:${streamIndex}`,
        '-c:s', 'srt',
        outputPath
      ]);

      ffmpeg.on('close', (code: number) => {
        if (code === 0) {
          const content = fs.readFileSync(outputPath, 'utf-8');
          fs.unlinkSync(outputPath);

          const subtitle: Subtitle = {
            id: `extracted-${Date.now()}`,
            videoId: path.basename(videoPath),
            language: 'unknown',
            languageName: 'Extracted',
            format: 'srt',
            content,
            isAutoGenerated: false
          };

          resolve(subtitle);
        } else {
          reject(new Error('Failed to extract subtitle'));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private getSubtitlePreview(subtitle: Subtitle, startTime: number, endTime: number): string {
    if (!subtitle.timestamps || subtitle.timestamps.length === 0) {
      return '';
    }

    const relevantTimestamps = subtitle.timestamps.filter(
      ts => ts.startTime >= startTime && ts.endTime <= endTime
    );

    return relevantTimestamps.map(ts => ts.text).join('\n');
  }

  private sendToAllWindows(channel: string, data: any): void {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  destroy(): void {
    this.subtitleService.removeAllListeners();
  }
}