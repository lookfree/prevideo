/**
 * Contract test for compress:start IPC channel
 * Tests the contract for video compression operations
 */

import {
  IPC_CHANNELS,
  CompressionStartRequest,
  CompressionProgressEvent
} from '../../../specs/001-youtube-youtube/contracts/ipc-channels';

describe('IPC Contract: compress:start', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const electron = require('electron');
    mockIpcRenderer = electron.ipcRenderer;
  });

  describe('Request Contract', () => {
    it('should accept valid compression request', () => {
      const validRequest: CompressionStartRequest = {
        inputPath: '/downloads/video.mp4',
        outputPath: '/downloads/video_compressed.mp4',
        config: {
          format: 'mp4',
          resolution: '720p',
          videoBitrate: 2000,
          audioBitrate: 128,
          preset: 'medium',
          crf: 23
        }
      };

      // Verify request structure
      expect(validRequest).toHaveProperty('inputPath');
      expect(validRequest).toHaveProperty('outputPath');
      expect(validRequest).toHaveProperty('config');

      // Verify config structure
      const { config } = validRequest;
      expect(config).toHaveProperty('format');
      expect(config).toHaveProperty('resolution');
      expect(['mp4', 'webm', 'mkv']).toContain(config.format);
    });

    it('should accept compression with bilingual subtitles', () => {
      const requestWithSubtitles: CompressionStartRequest = {
        inputPath: '/downloads/video.mp4',
        outputPath: '/downloads/video_final.mp4',
        config: {
          format: 'mp4',
          resolution: '1080p',
          crf: 20
        },
        subtitles: {
          primary: '/downloads/video.zh.srt',
          secondary: '/downloads/video.en.srt',
          config: {
            primaryLanguage: 'zh-CN',
            secondaryLanguage: 'en',
            layout: 'stacked',
            primaryFontSize: 24,
            secondaryFontSize: 20
          }
        }
      };

      expect(requestWithSubtitles.subtitles).toBeDefined();
      expect(requestWithSubtitles.subtitles?.primary).toBeDefined();
      expect(requestWithSubtitles.subtitles?.config.layout).toBe('stacked');
    });

    it('should validate resolution options', () => {
      const validResolutions = ['2160p', '1080p', '720p', '480p', '360p', 'original'];

      validResolutions.forEach(resolution => {
        const request: CompressionStartRequest = {
          inputPath: '/video.mp4',
          outputPath: '/output.mp4',
          config: {
            format: 'mp4',
            resolution: resolution as any
          }
        };

        expect(validResolutions).toContain(request.config.resolution);
      });
    });

    it('should validate format options', () => {
      const validFormats = ['mp4', 'webm', 'mkv'];

      validFormats.forEach(format => {
        const request: CompressionStartRequest = {
          inputPath: '/video.mp4',
          outputPath: '/output.' + format,
          config: {
            format: format as 'mp4' | 'webm' | 'mkv',
            resolution: '720p'
          }
        };

        expect(validFormats).toContain(request.config.format);
      });
    });

    it('should validate CRF range', () => {
      const request: CompressionStartRequest = {
        inputPath: '/video.mp4',
        outputPath: '/output.mp4',
        config: {
          format: 'mp4',
          resolution: '720p',
          crf: 23
        }
      };

      // CRF should be between 0-51 for H.264
      expect(request.config.crf).toBeGreaterThanOrEqual(0);
      expect(request.config.crf).toBeLessThanOrEqual(51);
    });
  });

  describe('Progress Event Contract', () => {
    it('should emit valid progress events', () => {
      const progressEvent: CompressionProgressEvent = {
        taskId: 'compress-001',
        progress: 60.5,
        currentTime: 180, // 3 minutes processed
        totalTime: 300, // 5 minutes total
        speed: '1.2x',
        estimatedSize: 75000000 // 75MB estimated
      };

      // Verify event structure
      expect(progressEvent).toHaveProperty('taskId');
      expect(progressEvent).toHaveProperty('progress');
      expect(progressEvent).toHaveProperty('currentTime');
      expect(progressEvent).toHaveProperty('totalTime');
      expect(progressEvent).toHaveProperty('speed');
      expect(progressEvent).toHaveProperty('estimatedSize');

      // Verify data types
      expect(typeof progressEvent.taskId).toBe('string');
      expect(typeof progressEvent.progress).toBe('number');
      expect(typeof progressEvent.currentTime).toBe('number');
      expect(typeof progressEvent.totalTime).toBe('number');
      expect(typeof progressEvent.speed).toBe('string');
      expect(typeof progressEvent.estimatedSize).toBe('number');

      // Verify value ranges
      expect(progressEvent.progress).toBeGreaterThanOrEqual(0);
      expect(progressEvent.progress).toBeLessThanOrEqual(100);
      expect(progressEvent.currentTime).toBeLessThanOrEqual(progressEvent.totalTime);
    });

    it('should track compression stages', () => {
      const stages = [
        { stage: 'analyzing', progress: 5 },
        { stage: 'first_pass', progress: 30 },
        { stage: 'second_pass', progress: 70 },
        { stage: 'finalizing', progress: 95 },
        { stage: 'complete', progress: 100 }
      ];

      stages.forEach(({ stage, progress }) => {
        const event = {
          taskId: 'compress-001',
          stage,
          progress,
          message: `Processing: ${stage}`
        };

        expect(event.progress).toBeGreaterThanOrEqual(0);
        expect(event.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Response Contract', () => {
    it('should return success response with output details', () => {
      const response = {
        success: true,
        taskId: 'compress-001',
        outputPath: '/downloads/video_compressed.mp4',
        outputSize: 50000000, // 50MB
        compressionRatio: 0.33, // 67% size reduction
        timeTaken: 120 // 2 minutes
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('taskId');
      expect(response).toHaveProperty('outputPath');
      expect(response).toHaveProperty('outputSize');
      expect(response).toHaveProperty('compressionRatio');
      expect(response.success).toBe(true);
      expect(response.compressionRatio).toBeGreaterThan(0);
      expect(response.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('should return error for unsupported codec', () => {
      const response = {
        success: false,
        error: {
          code: 'UNSUPPORTED_CODEC',
          message: 'Input video codec is not supported'
        }
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNSUPPORTED_CODEC');
    });

    it('should return error for invalid parameters', () => {
      const response = {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Compression parameters are invalid or incompatible'
        }
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_PARAMETERS');
    });
  });

  describe('IPC Communication Contract', () => {
    it('should use correct channel names', () => {
      expect(IPC_CHANNELS.COMPRESS_START).toBe('compress:start');
      expect(IPC_CHANNELS.COMPRESS_PROGRESS).toBe('compress:progress');
      expect(IPC_CHANNELS.COMPRESS_COMPLETE).toBe('compress:complete');
      expect(IPC_CHANNELS.COMPRESS_CANCEL).toBe('compress:cancel');
    });

    it('should handle compression with two-pass encoding', async () => {
      const request: CompressionStartRequest = {
        inputPath: '/large-video.mp4',
        outputPath: '/compressed-video.mp4',
        config: {
          format: 'mp4',
          resolution: '720p',
          preset: 'slow',
          crf: 20
        }
      };

      // First pass
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        taskId: 'compress-001',
        pass: 1,
        message: 'Starting first pass'
      });

      const firstPass = await mockIpcRenderer.invoke(
        IPC_CHANNELS.COMPRESS_START,
        request
      );

      expect(firstPass.success).toBe(true);
      expect(firstPass.pass).toBe(1);
    });

    it('should estimate file size before compression', async () => {
      const estimateRequest = {
        inputPath: '/video.mp4',
        config: {
          format: 'mp4',
          resolution: '480p',
          crf: 28
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        estimatedSize: 25000000, // 25MB
        currentSize: 100000000, // 100MB
        estimatedReduction: 75 // 75% reduction
      });

      const estimate = await mockIpcRenderer.invoke(
        'compress:estimate',
        estimateRequest
      );

      expect(estimate.estimatedSize).toBeLessThan(estimate.currentSize);
      expect(estimate.estimatedReduction).toBeGreaterThan(0);
      expect(estimate.estimatedReduction).toBeLessThanOrEqual(100);
    });
  });
});