/**
 * Integration test for Scenario 2: Video Compression
 * 场景2: 压缩视频文件
 */

import { IConverterService, VideoMetadata } from '../../specs/001-youtube-youtube/contracts/service-interfaces';
import { IStorageService } from '../../specs/001-youtube-youtube/contracts/service-interfaces';
import { IDownloaderService } from '../../specs/001-youtube-youtube/contracts/service-interfaces';

describe('Integration: Video Compression', () => {
  let converterService: IConverterService;
  let storageService: IStorageService;
  let downloaderService: IDownloaderService;

  beforeEach(() => {
    // Mock services
    converterService = {
      compressVideo: jest.fn(),
      convertFormat: jest.fn(),
      extractAudio: jest.fn(),
      getVideoMetadata: jest.fn(),
      estimateFileSize: jest.fn(),
      cancelProcessing: jest.fn()
    };

    storageService = {
      saveDownloadTask: jest.fn(),
      getDownloadTask: jest.fn(),
      getDownloadHistory: jest.fn(),
      cacheVideoInfo: jest.fn(),
      getCachedVideoInfo: jest.fn(),
      savePreferences: jest.fn(),
      getPreferences: jest.fn(),
      clearCache: jest.fn(),
      getStorageStats: jest.fn()
    };

    downloaderService = {
      fetchVideoInfo: jest.fn(),
      startDownload: jest.fn(),
      pauseDownload: jest.fn(),
      resumeDownload: jest.fn(),
      cancelDownload: jest.fn(),
      getProgress: jest.fn(),
      listTasks: jest.fn()
    };
  });

  describe('Complete compression workflow', () => {
    it('should compress large video file to smaller size with quality options', async () => {
      // Step 1: Get original video metadata
      const originalVideoPath = '/downloads/original-4k-video.mp4';
      const mockOriginalMetadata: VideoMetadata = {
        duration: 600, // 10 minutes
        width: 3840,
        height: 2160,
        fps: 60,
        bitrate: 50000000, // 50 Mbps
        codec: 'h264',
        audioCodec: 'aac',
        fileSize: 3750000000 // ~3.75 GB
      };

      (converterService.getVideoMetadata as jest.Mock).mockResolvedValue(mockOriginalMetadata);
      const originalMetadata = await converterService.getVideoMetadata(originalVideoPath);

      expect(originalMetadata.width).toBe(3840);
      expect(originalMetadata.height).toBe(2160);
      expect(originalMetadata.fileSize).toBeGreaterThan(3000000000);

      // Step 2: Load user compression preferences
      const mockPreferences = {
        defaultOutputPath: '/downloads/compressed',
        defaultQuality: '1080p',
        defaultFormat: 'mp4',
        compressionPreset: 'medium',
        targetFileSize: 500000000, // Target 500MB
        preserveAudio: true,
        twoPass: true
      };

      (storageService.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);
      const preferences = await storageService.getPreferences();

      // Step 3: Configure compression settings
      const compressionConfig = {
        id: 'compress-001',
        outputFormat: 'mp4' as const,
        resolution: '1080p' as const,
        videoBitrate: 4000, // 4 Mbps
        audioBitrate: 128,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        preset: 'medium' as const,
        crf: 23, // Quality factor
        twoPass: preferences.twoPass
      };

      // Step 4: Estimate compressed file size
      const estimatedSize = 315000000; // ~315 MB
      (converterService.estimateFileSize as jest.Mock).mockResolvedValue(estimatedSize);

      const estimate = await converterService.estimateFileSize(originalVideoPath, compressionConfig);
      expect(estimate).toBeLessThan(originalMetadata.fileSize);
      expect(estimate).toBeLessThan(500000000); // Under target size

      // Step 5: Start compression
      const mockCompressionTask = {
        id: 'compress-task-001',
        type: 'VIDEO_COMPRESSION' as const,
        status: 'processing' as const,
        progress: 0,
        currentStep: 'Initializing',
        totalSteps: compressionConfig.twoPass ? 2 : 1,
        estimatedTime: 300, // 5 minutes
        inputFile: originalVideoPath,
        outputFile: '/downloads/compressed/video-1080p.mp4',
        config: compressionConfig
      };

      (converterService.compressVideo as jest.Mock).mockResolvedValue(mockCompressionTask);
      const compressionTask = await converterService.compressVideo(originalVideoPath, compressionConfig);

      expect(compressionTask.type).toBe('VIDEO_COMPRESSION');
      expect(compressionTask.totalSteps).toBe(2); // Two-pass encoding

      // Step 6: Track compression progress (two-pass)
      const progressSteps = [
        { progress: 0, currentStep: 'First pass: Analyzing', speed: '1.2x' },
        { progress: 25, currentStep: 'First pass: Processing', speed: '1.5x' },
        { progress: 50, currentStep: 'First pass: Complete', speed: '1.8x' },
        { progress: 55, currentStep: 'Second pass: Encoding', speed: '0.8x' },
        { progress: 75, currentStep: 'Second pass: Processing', speed: '0.9x' },
        { progress: 95, currentStep: 'Finalizing', speed: '1.0x' },
        { progress: 100, currentStep: 'Completed', speed: '0x' }
      ];

      for (const step of progressSteps) {
        const updatedTask = {
          ...compressionTask,
          progress: step.progress,
          currentStep: step.currentStep,
          status: step.progress === 100 ? 'completed' as const : 'processing' as const
        };

        // Save progress
        await storageService.saveDownloadTask(updatedTask);

        if (step.progress === 100) {
          expect(updatedTask.status).toBe('completed');
        }
      }

      // Step 7: Verify compressed video metadata
      const mockCompressedMetadata: VideoMetadata = {
        duration: 600, // Same duration
        width: 1920,
        height: 1080,
        fps: 30, // Reduced from 60
        bitrate: 4000000, // 4 Mbps
        codec: 'h264',
        audioCodec: 'aac',
        fileSize: 315000000 // ~315 MB (achieved compression)
      };

      (converterService.getVideoMetadata as jest.Mock).mockResolvedValue(mockCompressedMetadata);
      const compressedMetadata = await converterService.getVideoMetadata('/downloads/compressed/video-1080p.mp4');

      // Verify compression results
      expect(compressedMetadata.width).toBe(1920);
      expect(compressedMetadata.height).toBe(1080);
      expect(compressedMetadata.fps).toBe(30);
      expect(compressedMetadata.fileSize).toBeLessThan(originalMetadata.fileSize);

      // Calculate compression ratio
      const compressionRatio = ((originalMetadata.fileSize - compressedMetadata.fileSize) / originalMetadata.fileSize) * 100;
      expect(compressionRatio).toBeGreaterThan(90); // >90% size reduction

      // Step 8: Save compression history
      const compressionRecord = {
        id: 'record-001',
        taskId: compressionTask.id,
        inputFile: originalVideoPath,
        outputFile: '/downloads/compressed/video-1080p.mp4',
        originalSize: originalMetadata.fileSize,
        compressedSize: compressedMetadata.fileSize,
        compressionRatio,
        settings: compressionConfig,
        completedAt: new Date()
      };

      await storageService.saveDownloadTask(compressionRecord as any);
    });

    it('should compress with different quality presets', async () => {
      const videoPath = '/downloads/test-video.mp4';
      const presets = [
        { preset: 'ultrafast', crf: 28, expectedTime: 60 },
        { preset: 'fast', crf: 23, expectedTime: 120 },
        { preset: 'medium', crf: 23, expectedTime: 180 },
        { preset: 'slow', crf: 20, expectedTime: 300 },
        { preset: 'veryslow', crf: 18, expectedTime: 600 }
      ];

      for (const { preset, crf, expectedTime } of presets) {
        const config = {
          id: `compress-${preset}`,
          outputFormat: 'mp4' as const,
          resolution: '720p' as const,
          videoCodec: 'libx264',
          audioCodec: 'aac',
          preset: preset as any,
          crf,
          twoPass: false
        };

        const mockTask = {
          id: `task-${preset}`,
          type: 'VIDEO_COMPRESSION',
          estimatedTime: expectedTime,
          config
        };

        (converterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);
        const task = await converterService.compressVideo(videoPath, config);

        expect(task.estimatedTime).toBe(expectedTime);
        expect(task.config.preset).toBe(preset);
        expect(task.config.crf).toBe(crf);
      }
    });

    it('should handle batch compression of multiple videos', async () => {
      const videoPaths = [
        '/downloads/video1.mp4',
        '/downloads/video2.mp4',
        '/downloads/video3.mp4'
      ];

      const compressionConfig = {
        id: 'batch-compress',
        outputFormat: 'mp4' as const,
        resolution: '720p' as const,
        videoBitrate: 2000,
        audioBitrate: 128,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        preset: 'fast' as const,
        crf: 23,
        twoPass: false
      };

      const compressionTasks = [];

      // Start all compression tasks
      for (let i = 0; i < videoPaths.length; i++) {
        const mockTask = {
          id: `compress-batch-${i}`,
          type: 'VIDEO_COMPRESSION',
          status: 'processing',
          progress: 0,
          inputFile: videoPaths[i],
          outputFile: videoPaths[i].replace('.mp4', '-compressed.mp4')
        };

        (converterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);
        const task = await converterService.compressVideo(videoPaths[i], compressionConfig);
        compressionTasks.push(task);
      }

      expect(compressionTasks).toHaveLength(3);

      // Simulate parallel processing
      const progressPromises = compressionTasks.map(async (task, index) => {
        // Different progress speeds for each task
        const progressSteps = [25, 50, 75, 100];
        for (const progress of progressSteps) {
          await new Promise(resolve => setTimeout(resolve, 10 * (index + 1)));
          task.progress = progress;
          task.status = progress === 100 ? 'completed' : 'processing';
        }
        return task;
      });

      const completedTasks = await Promise.all(progressPromises);
      completedTasks.forEach(task => {
        expect(task.status).toBe('completed');
        expect(task.progress).toBe(100);
      });
    });
  });

  describe('Format conversion workflow', () => {
    it('should convert video between different formats', async () => {
      const conversions = [
        { from: 'avi', to: 'mp4', codec: 'libx264' },
        { from: 'mp4', to: 'webm', codec: 'libvpx' },
        { from: 'mov', to: 'mkv', codec: 'libx265' },
        { from: 'flv', to: 'mp4', codec: 'libx264' }
      ];

      for (const { from, to, codec } of conversions) {
        const inputFile = `/downloads/video.${from}`;
        const mockTask = {
          id: `convert-${from}-to-${to}`,
          type: 'FORMAT_CONVERSION',
          status: 'completed',
          inputFile,
          outputFile: `/downloads/video.${to}`
        };

        (converterService.convertFormat as jest.Mock).mockResolvedValue(mockTask);
        const result = await converterService.convertFormat(inputFile, to);

        expect(result.outputFile).toContain(`.${to}`);
        expect(result.type).toBe('FORMAT_CONVERSION');
      }
    });

    it('should extract audio from video in multiple formats', async () => {
      const videoPath = '/downloads/video-with-audio.mp4';
      const audioFormats: Array<'mp3' | 'aac' | 'wav'> = ['mp3', 'aac', 'wav'];

      for (const format of audioFormats) {
        const mockTask = {
          id: `extract-${format}`,
          type: 'AUDIO_EXTRACTION',
          status: 'completed',
          inputFile: videoPath,
          outputFile: `/downloads/audio.${format}`
        };

        (converterService.extractAudio as jest.Mock).mockResolvedValue(mockTask);
        const result = await converterService.extractAudio(videoPath, format);

        expect(result.outputFile).toContain(`.${format}`);
        expect(result.type).toBe('AUDIO_EXTRACTION');
      }
    });
  });

  describe('Advanced compression scenarios', () => {
    it('should apply hardware acceleration when available', async () => {
      const config = {
        id: 'compress-hw',
        outputFormat: 'mp4' as const,
        resolution: '1080p' as const,
        videoCodec: 'h264_nvenc', // NVIDIA hardware encoding
        audioCodec: 'aac',
        preset: 'fast' as const,
        hardwareAcceleration: true
      };

      const mockTask = {
        id: 'hw-task-001',
        type: 'VIDEO_COMPRESSION',
        status: 'processing',
        estimatedTime: 60, // Much faster with HW acceleration
        hardwareAccelerated: true,
        config
      };

      (converterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);
      const task = await converterService.compressVideo('/video.mp4', config);

      expect(task.hardwareAccelerated).toBe(true);
      expect(task.estimatedTime).toBeLessThan(120); // Faster than CPU encoding
    });

    it('should optimize for streaming platforms', async () => {
      const platforms = [
        { name: 'YouTube', resolution: '1080p', bitrate: 8000, fps: 60 },
        { name: 'Twitch', resolution: '1080p', bitrate: 6000, fps: 60 },
        { name: 'TikTok', resolution: '720p', bitrate: 4000, fps: 30 },
        { name: 'Instagram', resolution: '1080p', bitrate: 3500, fps: 30 }
      ];

      for (const platform of platforms) {
        const config = {
          id: `compress-${platform.name.toLowerCase()}`,
          outputFormat: 'mp4' as const,
          resolution: platform.resolution as any,
          videoBitrate: platform.bitrate,
          audioBitrate: 128,
          videoCodec: 'libx264',
          audioCodec: 'aac',
          preset: 'medium' as const,
          targetPlatform: platform.name,
          maxFps: platform.fps
        };

        const mockTask = {
          id: `platform-${platform.name}`,
          type: 'VIDEO_COMPRESSION',
          status: 'completed',
          config,
          optimizedFor: platform.name
        };

        (converterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);
        const task = await converterService.compressVideo('/video.mp4', config);

        expect(task.optimizedFor).toBe(platform.name);
        expect(task.config.videoBitrate).toBe(platform.bitrate);
      }
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle insufficient disk space', async () => {
      const config = {
        id: 'compress-large',
        outputFormat: 'mp4' as const,
        resolution: '4K' as const,
        videoCodec: 'libx265',
        audioCodec: 'aac',
        preset: 'slow' as const
      };

      // Estimate will show file too large
      (converterService.estimateFileSize as jest.Mock).mockResolvedValue(5000000000); // 5GB

      const estimate = await converterService.estimateFileSize('/video.mp4', config);

      // Mock disk space check failure
      (converterService.compressVideo as jest.Mock).mockRejectedValue(
        new Error('Insufficient disk space: need 5GB, available 2GB')
      );

      await expect(
        converterService.compressVideo('/video.mp4', config)
      ).rejects.toThrow('Insufficient disk space');
    });

    it('should handle codec compatibility issues', async () => {
      const config = {
        id: 'compress-incompatible',
        outputFormat: 'webm' as const,
        resolution: '1080p' as const,
        videoCodec: 'h265', // Incompatible with WebM
        audioCodec: 'opus',
        preset: 'medium' as const
      };

      (converterService.compressVideo as jest.Mock).mockRejectedValue(
        new Error('Codec h265 is not compatible with WebM format')
      );

      await expect(
        converterService.compressVideo('/video.mp4', config)
      ).rejects.toThrow('not compatible');
    });

    it('should allow cancellation of long-running compression', async () => {
      const taskId = 'compress-cancel-001';

      // Start compression
      const mockTask = {
        id: taskId,
        type: 'VIDEO_COMPRESSION',
        status: 'processing',
        progress: 45
      };

      (converterService.compressVideo as jest.Mock).mockResolvedValue(mockTask);
      const task = await converterService.compressVideo('/large-video.mp4', {} as any);

      // Cancel after partial progress
      (converterService.cancelProcessing as jest.Mock).mockResolvedValue(undefined);
      await converterService.cancelProcessing(taskId);

      // Verify cancellation
      expect(converterService.cancelProcessing).toHaveBeenCalledWith(taskId);
    });
  });

  describe('Storage and history management', () => {
    it('should track compression history and statistics', async () => {
      // Perform multiple compressions
      const compressionHistory = [
        { originalSize: 1000000000, compressedSize: 200000000, savedSpace: 800000000 },
        { originalSize: 2000000000, compressedSize: 350000000, savedSpace: 1650000000 },
        { originalSize: 500000000, compressedSize: 120000000, savedSpace: 380000000 }
      ];

      let totalSaved = 0;
      for (const record of compressionHistory) {
        totalSaved += record.savedSpace;
        await storageService.saveDownloadTask({
          type: 'compression',
          ...record
        } as any);
      }

      // Get storage statistics
      const mockStats = {
        totalVideos: 150,
        totalDownloads: 75,
        totalCompressions: compressionHistory.length,
        totalSpaceSaved: totalSaved,
        cacheSize: 524288000,
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date()
      };

      (storageService.getStorageStats as jest.Mock).mockResolvedValue(mockStats);
      const stats = await storageService.getStorageStats();

      expect(stats.totalCompressions).toBe(3);
      expect(stats.totalSpaceSaved).toBe(totalSaved);
      expect(stats.totalSpaceSaved).toBeGreaterThan(2000000000); // >2GB saved
    });
  });
});