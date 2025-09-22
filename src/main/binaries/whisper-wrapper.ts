/**
 * Whisper.cpp binary wrapper for subtitle generation
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { app } from 'electron';
import { SubtitleConfig, WhisperModel } from '../../shared/types/subtitle';

export class WhisperWrapper {
  private binaryPath: string;
  private modelsPath: string;
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    const isProd = app.isPackaged;

    if (isProd) {
      const resourcePath = process.resourcesPath;
      this.binaryPath = path.join(resourcePath, 'bin', 'whisper', this.getBinaryName());
      this.modelsPath = path.join(resourcePath, 'models', 'whisper');
    } else {
      this.binaryPath = path.join(__dirname, '../../../../bin', 'whisper', this.getBinaryName());
      this.modelsPath = path.join(__dirname, '../../../../models', 'whisper');
    }

    this.ensureBinaryExecutable();
    this.ensureModelsDirectory();
  }

  private getBinaryName(): string {
    return process.platform === 'win32' ? 'whisper.exe' : 'whisper';
  }

  private ensureBinaryExecutable(): void {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(this.binaryPath, '755');
      } catch (error) {
        console.error('Failed to make whisper executable:', error);
      }
    }
  }

  private ensureModelsDirectory(): void {
    fs.ensureDirSync(this.modelsPath);
  }

  private getModelPath(model: WhisperModel): string {
    const modelFiles: { [key in WhisperModel]: string } = {
      [WhisperModel.TINY]: 'ggml-tiny.bin',
      [WhisperModel.BASE]: 'ggml-base.bin',
      [WhisperModel.SMALL]: 'ggml-small.bin',
      [WhisperModel.MEDIUM]: 'ggml-medium.bin',
      [WhisperModel.LARGE]: 'ggml-large.bin'
    };

    return path.join(this.modelsPath, modelFiles[model]);
  }

  async downloadModel(model: WhisperModel, onProgress?: (progress: number) => void): Promise<void> {
    const modelPath = this.getModelPath(model);

    // Check if model already exists
    if (await fs.pathExists(modelPath)) {
      console.log(`Model ${model} already exists`);
      return;
    }

    // Model URLs (these would be actual URLs to model files)
    const modelUrls: { [key in WhisperModel]: string } = {
      [WhisperModel.TINY]: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      [WhisperModel.BASE]: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      [WhisperModel.SMALL]: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
      [WhisperModel.MEDIUM]: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
      [WhisperModel.LARGE]: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin'
    };

    const url = modelUrls[model];

    // Download model using Node.js https
    const https = require('https');
    const file = fs.createWriteStream(modelPath);

    return new Promise((resolve, reject) => {
      https.get(url, (response: any) => {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.pipe(file);

        response.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length;
          if (onProgress && totalSize) {
            const progress = (downloadedSize / totalSize) * 100;
            onProgress(progress);
          }
        });

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (error: Error) => {
        fs.unlink(modelPath, () => {});
        reject(error);
      });
    });
  }

  async generateSubtitles(
    audioPath: string,
    config: SubtitleConfig,
    onProgress?: (progress: any) => void
  ): Promise<{ taskId: string; outputPath: string }> {
    const taskId = `whisper-${Date.now()}`;

    // Ensure model is downloaded
    await this.downloadModel(config.whisperModel);

    const modelPath = this.getModelPath(config.whisperModel);
    const outputDir = path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));

    const args: string[] = [
      '-m', modelPath,
      '-f', audioPath
    ];

    // Language
    if (config.language && config.language !== 'auto') {
      args.push('-l', config.language);
    } else {
      args.push('--auto-detect');
    }

    // Output format
    const outputFormat = config.format || 'srt';
    args.push('--output-format', outputFormat);

    // Output file
    const outputPath = path.join(outputDir, `${baseName}.${config.language || 'auto'}.${outputFormat}`);
    args.push('-o', outputPath);

    // Translation (if target language is different)
    if (config.targetLanguage && config.targetLanguage !== config.language) {
      args.push('--translate');
      args.push('--translate-to', config.targetLanguage);
    }

    // Number of threads
    args.push('-t', '4');

    // Verbose for progress tracking
    args.push('--verbose');

    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);
      this.processes.set(taskId, process);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();

        // Parse progress from stderr
        const progressMatch = stderr.match(/Progress:\s+(\d+)%/);
        if (progressMatch && onProgress) {
          onProgress({
            taskId,
            progress: parseInt(progressMatch[1]),
            status: 'processing'
          });
        }
      });

      process.on('close', (code) => {
        this.processes.delete(taskId);

        if (code === 0) {
          resolve({ taskId, outputPath });
        } else {
          reject(new Error(`Whisper failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        this.processes.delete(taskId);
        reject(error);
      });
    });
  }

  async transcribeWithTimestamps(
    audioPath: string,
    language: string = 'auto'
  ): Promise<Array<{ start: number; end: number; text: string }>> {
    const modelPath = this.getModelPath(WhisperModel.BASE);
    const outputPath = path.join(path.dirname(audioPath), `transcript-${Date.now()}.json`);

    const args = [
      '-m', modelPath,
      '-f', audioPath,
      '-l', language === 'auto' ? 'auto' : language,
      '--output-format', 'json',
      '-o', outputPath
    ];

    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const jsonData = await fs.readJson(outputPath);
            const segments = jsonData.segments || [];
            await fs.remove(outputPath); // Clean up temp file
            resolve(segments);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Transcription failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async detectLanguage(audioPath: string): Promise<string> {
    const modelPath = this.getModelPath(WhisperModel.TINY);

    const args = [
      '-m', modelPath,
      '-f', audioPath,
      '--detect-language'
    ];

    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);
      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Parse detected language from output
          const langMatch = stdout.match(/Detected language: (\w+)/);
          if (langMatch) {
            resolve(langMatch[1]);
          } else {
            resolve('unknown');
          }
        } else {
          reject(new Error(`Language detection failed with code ${code}`));
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

  async checkModelExists(model: WhisperModel): Promise<boolean> {
    const modelPath = this.getModelPath(model);
    return fs.pathExists(modelPath);
  }

  async getModelSize(model: WhisperModel): Promise<number> {
    const modelPath = this.getModelPath(model);
    if (await fs.pathExists(modelPath)) {
      const stats = await fs.stat(modelPath);
      return stats.size;
    }
    return 0;
  }

  cleanup(): void {
    for (const [taskId, process] of this.processes) {
      process.kill('SIGTERM');
    }
    this.processes.clear();
  }
}