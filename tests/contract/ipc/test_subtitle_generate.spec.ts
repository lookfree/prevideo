/**
 * Contract test for subtitle:generate IPC channel
 * Tests the contract for subtitle generation using Whisper
 */

import {
  IPC_CHANNELS,
  SubtitleGenerateRequest,
  SubtitleGenerateResponse
} from '../../../specs/001-youtube-youtube/contracts/ipc-channels';

describe('IPC Contract: subtitle:generate', () => {
  let mockIpcRenderer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const electron = require('electron');
    mockIpcRenderer = electron.ipcRenderer;
  });

  describe('Request Contract', () => {
    it('should accept valid subtitle generation request', () => {
      const validRequest: SubtitleGenerateRequest = {
        videoPath: '/downloads/video.mp4',
        language: 'en',
        model: 'base'
      };

      // Verify request structure
      expect(validRequest).toHaveProperty('videoPath');
      expect(validRequest).toHaveProperty('language');
      expect(validRequest).toHaveProperty('model');

      // Verify data types
      expect(typeof validRequest.videoPath).toBe('string');
      expect(typeof validRequest.language).toBe('string');
      expect(validRequest.model).toBeDefined();
    });

    it('should validate Whisper model options', () => {
      const validModels: Array<'tiny' | 'base' | 'small' | 'medium' | 'large'> = [
        'tiny',
        'base',
        'small',
        'medium',
        'large'
      ];

      validModels.forEach(model => {
        const request: SubtitleGenerateRequest = {
          videoPath: '/video.mp4',
          language: 'zh',
          model
        };

        expect(request.model).toBe(model);
        expect(validModels).toContain(request.model);
      });
    });

    it('should accept request without model (use default)', () => {
      const request: SubtitleGenerateRequest = {
        videoPath: '/video.mp4',
        language: 'en'
      };

      expect(request.model).toBeUndefined();
      expect(request).toHaveProperty('videoPath');
      expect(request).toHaveProperty('language');
    });

    it('should validate language codes', () => {
      const validLanguages = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ru', 'ar', 'hi'];

      validLanguages.forEach(language => {
        const request: SubtitleGenerateRequest = {
          videoPath: '/video.mp4',
          language
        };

        expect(request.language).toBe(language);
        expect(request.language.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Response Contract', () => {
    it('should return success response with subtitle path', () => {
      const response: SubtitleGenerateResponse = {
        success: true,
        subtitlePath: '/downloads/video.srt',
        language: 'en'
      };

      // Verify response structure
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('subtitlePath');
      expect(response).toHaveProperty('language');

      // Verify data types
      expect(response.success).toBe(true);
      expect(typeof response.subtitlePath).toBe('string');
      expect(typeof response.language).toBe('string');

      // Verify subtitle path format
      expect(response.subtitlePath).toMatch(/\.(srt|vtt|ass)$/);
    });

    it('should return error for missing video file', () => {
      const response: SubtitleGenerateResponse = {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Video file not found at specified path'
        }
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('FILE_NOT_FOUND');
      expect(response.subtitlePath).toBeUndefined();
      expect(response.language).toBeUndefined();
    });

    it('should return error for unsupported format', () => {
      const response: SubtitleGenerateResponse = {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: 'Video format is not supported for subtitle generation'
        }
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNSUPPORTED_FORMAT');
    });

    it('should return error for Whisper model failure', () => {
      const response: SubtitleGenerateResponse = {
        success: false,
        error: {
          code: 'MODEL_ERROR',
          message: 'Failed to load or execute Whisper model'
        }
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('MODEL_ERROR');
    });
  });

  describe('IPC Communication Contract', () => {
    it('should use correct channel name', () => {
      expect(IPC_CHANNELS.SUBTITLE_GENERATE).toBe('subtitle:generate');
    });

    it('should handle subtitle generation with progress', async () => {
      const request: SubtitleGenerateRequest = {
        videoPath: '/downloads/test-video.mp4',
        language: 'en',
        model: 'base'
      };

      // Mock successful generation
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        subtitlePath: '/downloads/test-video.srt',
        language: 'en'
      });

      const response = await mockIpcRenderer.invoke(
        IPC_CHANNELS.SUBTITLE_GENERATE,
        request
      );

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPC_CHANNELS.SUBTITLE_GENERATE,
        request
      );
      expect(response.success).toBe(true);
      expect(response.subtitlePath).toMatch(/\.srt$/);
    });

    it('should handle progress events during generation', () => {
      const progressHandler = jest.fn();
      mockIpcRenderer.on(IPC_CHANNELS.SUBTITLE_PROGRESS, progressHandler);

      // Verify handler registration
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.SUBTITLE_PROGRESS,
        progressHandler
      );

      // Expected progress event structure
      const progressEvent = {
        taskId: 'subtitle-001',
        progress: 50,
        currentTime: 150, // 150 seconds processed
        totalTime: 300, // 300 seconds total
        status: 'processing'
      };

      // Verify event structure
      expect(progressEvent).toHaveProperty('taskId');
      expect(progressEvent).toHaveProperty('progress');
      expect(progressEvent).toHaveProperty('currentTime');
      expect(progressEvent).toHaveProperty('totalTime');
      expect(progressEvent.progress).toBeGreaterThanOrEqual(0);
      expect(progressEvent.progress).toBeLessThanOrEqual(100);
    });

    it('should handle generation timeout', async () => {
      const request: SubtitleGenerateRequest = {
        videoPath: '/downloads/long-video.mp4',
        language: 'en',
        model: 'large'
      };

      // Mock timeout
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Generation timeout'));

      await expect(
        mockIpcRenderer.invoke(IPC_CHANNELS.SUBTITLE_GENERATE, request)
      ).rejects.toThrow('Generation timeout');
    });

    it('should support auto language detection', async () => {
      const request: SubtitleGenerateRequest = {
        videoPath: '/downloads/video.mp4',
        language: 'auto',
        model: 'base'
      };

      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        subtitlePath: '/downloads/video.srt',
        language: 'en' // Detected language
      });

      const response = await mockIpcRenderer.invoke(
        IPC_CHANNELS.SUBTITLE_GENERATE,
        request
      );

      expect(response.language).toBe('en'); // Should return detected language
    });
  });

  describe('Bilingual Subtitle Support', () => {
    it('should support generating multiple languages', async () => {
      const requests = [
        {
          videoPath: '/downloads/video.mp4',
          language: 'en',
          model: 'base' as const
        },
        {
          videoPath: '/downloads/video.mp4',
          language: 'zh',
          model: 'base' as const
        }
      ];

      const responses = await Promise.all(
        requests.map(async (req) => {
          mockIpcRenderer.invoke.mockResolvedValue({
            success: true,
            subtitlePath: `/downloads/video.${req.language}.srt`,
            language: req.language
          });

          return mockIpcRenderer.invoke(IPC_CHANNELS.SUBTITLE_GENERATE, req);
        })
      );

      expect(responses).toHaveLength(2);
      expect(responses[0].subtitlePath).toContain('.en.srt');
      expect(responses[1].subtitlePath).toContain('.zh.srt');
    });
  });
});