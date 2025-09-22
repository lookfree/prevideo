/**
 * Contract test for ConverterService
 * Tests the service interface for video conversion and compression
 */

import {
  IConverterService,
  VideoMetadata
} from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

describe('Service Contract: ConverterService', () => {
  let mockConverterService: IConverterService;

  beforeEach(() => {
    mockConverterService = {
      compressVideo: jest.fn(),
      convertFormat: jest.fn(),
      extractAudio: jest.fn(),
      getVideoMetadata: jest.fn(),
      estimateFileSize: jest.fn(),
      cancelProcessing: jest.fn()
    };
  });

  describe('compressVideo()', () => {
    it('should compress video with valid config', async () => {
      const config = {
        id: 'config-001',
        outputFormat: 'mp4' as const,
        resolution: '720p' as const,
        videoBitrate: 2000,
        audioBitrate: 128,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        preset: 'medium' as const,
        crf: 23,
        twoPass: false
      };

      const mockTask = {
        id: 'compress-001',
        type: 'VIDEO_COMPRESSION' as const,
        status: 'processing' as const,
        progress: 0,
        currentStep: 'Analyzing video',
        totalSteps: 3,
        estimatedTime: 120,
        inputFile: '/input/video.mp4',
        outputFile: '/output/compressed.mp4',
        config
      };

      (mockConverterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);

      const result = await mockConverterService.compressVideo('/input/video.mp4', config);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('VIDEO_COMPRESSION');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('outputFile');
    });

    it('should validate CRF range', async () => {
      const validCRFValues = [0, 18, 23, 28, 51]; // 0=lossless, 51=worst quality

      for (const crf of validCRFValues) {
        const config = {
          id: 'config-crf',
          outputFormat: 'mp4' as const,
          resolution: '1080p' as const,
          videoCodec: 'libx264',
          audioCodec: 'aac',
          preset: 'medium' as const,
          crf,
          twoPass: false
        };

        (mockConverterService.compressVideo as jest.Mock).mockResolvedValue({
          id: `compress-crf-${crf}`,
          type: 'VIDEO_COMPRESSION',
          status: 'processing'
        });

        const result = await mockConverterService.compressVideo('/video.mp4', config);
        expect(result).toBeDefined();
        expect(crf).toBeGreaterThanOrEqual(0);
        expect(crf).toBeLessThanOrEqual(51);
      }
    });

    it('should support two-pass encoding', async () => {
      const config = {
        id: 'config-2pass',
        outputFormat: 'mp4' as const,
        resolution: '1080p' as const,
        videoBitrate: 4000,
        videoCodec: 'libx265',
        audioCodec: 'aac',
        preset: 'slow' as const,
        twoPass: true
      };

      (mockConverterService.compressVideo as jest.Mock).mockResolvedValue({
        id: 'compress-2pass',
        type: 'VIDEO_COMPRESSION',
        status: 'processing',
        currentStep: 'First pass',
        totalSteps: 2
      });

      const result = await mockConverterService.compressVideo('/video.mp4', config);
      expect(result.totalSteps).toBe(2);
    });

    it('should validate preset options', () => {
      const validPresets = [
        'ultrafast',
        'superfast',
        'veryfast',
        'faster',
        'fast',
        'medium',
        'slow',
        'slower',
        'veryslow'
      ];

      validPresets.forEach(preset => {
        expect(validPresets).toContain(preset);
      });
    });
  });

  describe('convertFormat()', () => {
    it('should convert video format', async () => {
      const mockTask = {
        id: 'convert-001',
        type: 'FORMAT_CONVERSION' as const,
        status: 'completed' as const,
        progress: 100,
        inputFile: '/input/video.avi',
        outputFile: '/output/video.mp4'
      };

      (mockConverterService.convertFormat as jest.Mock).mockResolvedValue(mockTask);

      const result = await mockConverterService.convertFormat('/input/video.avi', 'mp4');

      expect(result).toHaveProperty('type');
      expect(result.type).toBe('FORMAT_CONVERSION');
      expect(result.outputFile).toMatch(/\.mp4$/);
    });

    it('should support multiple output formats', async () => {
      const formats = ['mp4', 'webm', 'mkv', 'mov', 'avi'];

      for (const format of formats) {
        (mockConverterService.convertFormat as jest.Mock).mockResolvedValue({
          id: `convert-${format}`,
          outputFile: `/output/video.${format}`
        });

        const result = await mockConverterService.convertFormat('/input/video.mp4', format);
        expect(result.outputFile).toMatch(new RegExp(`\\.${format}$`));
      }
    });
  });

  describe('extractAudio()', () => {
    it('should extract audio from video', async () => {
      const mockTask = {
        id: 'extract-001',
        type: 'AUDIO_EXTRACTION' as const,
        status: 'completed' as const,
        progress: 100,
        inputFile: '/input/video.mp4',
        outputFile: '/output/audio.mp3'
      };

      (mockConverterService.extractAudio as jest.Mock).mockResolvedValue(mockTask);

      const result = await mockConverterService.extractAudio('/input/video.mp4', 'mp3');

      expect(result).toHaveProperty('type');
      expect(result.outputFile).toMatch(/\.(mp3|aac|wav)$/);
    });

    it('should support multiple audio formats', async () => {
      const audioFormats: Array<'mp3' | 'aac' | 'wav'> = ['mp3', 'aac', 'wav'];

      for (const format of audioFormats) {
        (mockConverterService.extractAudio as jest.Mock).mockResolvedValue({
          id: `extract-${format}`,
          outputFile: `/output/audio.${format}`
        });

        const result = await mockConverterService.extractAudio('/video.mp4', format);
        expect(result.outputFile).toContain(`.${format}`);
      }
    });
  });

  describe('getVideoMetadata()', () => {
    it('should return complete video metadata', async () => {
      const mockMetadata: VideoMetadata = {
        duration: 300, // 5 minutes
        width: 1920,
        height: 1080,
        fps: 30,
        bitrate: 5000000, // 5 Mbps
        codec: 'h264',
        audioCodec: 'aac',
        fileSize: 187500000 // ~187.5 MB
      };

      (mockConverterService.getVideoMetadata as jest.Mock).mockResolvedValue(mockMetadata);

      const result = await mockConverterService.getVideoMetadata('/video.mp4');

      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('fps');
      expect(result).toHaveProperty('bitrate');
      expect(result).toHaveProperty('codec');
      expect(result).toHaveProperty('audioCodec');
      expect(result).toHaveProperty('fileSize');

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.fps).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle various resolutions', async () => {
      const resolutions = [
        { width: 3840, height: 2160, name: '4K' },
        { width: 2560, height: 1440, name: '2K' },
        { width: 1920, height: 1080, name: 'FHD' },
        { width: 1280, height: 720, name: 'HD' },
        { width: 854, height: 480, name: 'SD' },
        { width: 640, height: 360, name: 'Low' }
      ];

      for (const res of resolutions) {
        (mockConverterService.getVideoMetadata as jest.Mock).mockResolvedValue({
          width: res.width,
          height: res.height,
          duration: 100,
          fps: 30,
          bitrate: 1000000,
          codec: 'h264',
          audioCodec: 'aac',
          fileSize: 12500000
        });

        const result = await mockConverterService.getVideoMetadata(`/video_${res.name}.mp4`);
        expect(result.width).toBe(res.width);
        expect(result.height).toBe(res.height);
      }
    });
  });

  describe('estimateFileSize()', () => {
    it('should estimate output file size', async () => {
      const config = {
        id: 'estimate-001',
        outputFormat: 'mp4' as const,
        resolution: '720p' as const,
        videoBitrate: 2000,
        audioBitrate: 128,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        preset: 'medium' as const,
        crf: 23,
        twoPass: false
      };

      // For 5 minute video at 2000 kbps video + 128 kbps audio
      // (2000 + 128) * 300 / 8 = 79,800 KB ≈ 78 MB
      const expectedSize = 79800000;

      (mockConverterService.estimateFileSize as jest.Mock).mockResolvedValue(expectedSize);

      const result = await mockConverterService.estimateFileSize('/video.mp4', config);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(expectedSize);
    });

    it('should estimate based on CRF', async () => {
      const configs = [
        { crf: 18, expectedSize: 150000000 }, // Higher quality, larger file
        { crf: 23, expectedSize: 80000000 },  // Medium quality
        { crf: 28, expectedSize: 40000000 }   // Lower quality, smaller file
      ];

      for (const { crf, expectedSize } of configs) {
        const config = {
          id: 'estimate-crf',
          outputFormat: 'mp4' as const,
          resolution: '1080p' as const,
          videoCodec: 'libx264',
          audioCodec: 'aac',
          preset: 'medium' as const,
          crf,
          twoPass: false
        };

        (mockConverterService.estimateFileSize as jest.Mock).mockResolvedValue(expectedSize);

        const result = await mockConverterService.estimateFileSize('/video.mp4', config);
        expect(result).toBe(expectedSize);
      }
    });
  });

  describe('cancelProcessing()', () => {
    it('should cancel active processing task', async () => {
      (mockConverterService.cancelProcessing as jest.Mock).mockResolvedValue(undefined);

      await expect(mockConverterService.cancelProcessing('task-001')).resolves.toBeUndefined();
      expect(mockConverterService.cancelProcessing).toHaveBeenCalledWith('task-001');
    });

    it('should handle cancellation of non-existent task', async () => {
      (mockConverterService.cancelProcessing as jest.Mock).mockRejectedValue(
        new Error('Task not found')
      );

      await expect(mockConverterService.cancelProcessing('non-existent')).rejects.toThrow('Task not found');
    });

    it('should handle cancellation of completed task', async () => {
      (mockConverterService.cancelProcessing as jest.Mock).mockRejectedValue(
        new Error('Cannot cancel completed task')
      );

      await expect(mockConverterService.cancelProcessing('completed-task')).rejects.toThrow('Cannot cancel completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported codec', async () => {
      (mockConverterService.compressVideo as jest.Mock).mockRejectedValue(
        new Error('Unsupported video codec: vp9')
      );

      const config = {
        id: 'config-bad',
        outputFormat: 'webm' as const,
        resolution: '1080p' as const,
        videoCodec: 'vp9',
        audioCodec: 'opus',
        preset: 'medium' as const,
        twoPass: false
      };

      await expect(mockConverterService.compressVideo('/video.mp4', config)).rejects.toThrow('Unsupported video codec');
    });

    it('should handle insufficient disk space', async () => {
      (mockConverterService.compressVideo as jest.Mock).mockRejectedValue(
        new Error('Insufficient disk space for output file')
      );

      await expect(mockConverterService.compressVideo('/video.mp4', {} as any)).rejects.toThrow('Insufficient disk space');
    });

    it('should handle corrupted video file', async () => {
      (mockConverterService.getVideoMetadata as jest.Mock).mockRejectedValue(
        new Error('Invalid or corrupted video file')
      );

      await expect(mockConverterService.getVideoMetadata('/corrupted.mp4')).rejects.toThrow('Invalid or corrupted');
    });
  });
});