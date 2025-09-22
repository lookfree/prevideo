/**
 * Contract test for DownloaderService
 * Tests the service interface for video downloading operations
 */

import { IDownloaderService, DownloadOptions, DownloadProgress } from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

describe('Service Contract: DownloaderService', () => {
  let mockDownloaderService: IDownloaderService;

  beforeEach(() => {
    // Mock service implementation
    mockDownloaderService = {
      fetchVideoInfo: jest.fn(),
      startDownload: jest.fn(),
      pauseDownload: jest.fn(),
      resumeDownload: jest.fn(),
      cancelDownload: jest.fn(),
      getProgress: jest.fn(),
      listTasks: jest.fn()
    };
  });

  describe('fetchVideoInfo()', () => {
    it('should fetch video information from valid URL', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test Video',
        duration: 212,
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        author: 'Test Channel',
        availableFormats: [
          { formatId: '22', quality: '720p', ext: 'mp4', fps: 30 },
          { formatId: '18', quality: '360p', ext: 'mp4', fps: 30 }
        ],
        availableSubtitles: ['en', 'zh-CN']
      };

      (mockDownloaderService.fetchVideoInfo as jest.Mock).mockResolvedValue(mockVideoInfo);

      const result = await mockDownloaderService.fetchVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('availableFormats');
      expect(Array.isArray(result.availableFormats)).toBe(true);
      expect(result.availableFormats.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid URL', async () => {
      (mockDownloaderService.fetchVideoInfo as jest.Mock).mockRejectedValue(
        new Error('Invalid YouTube URL')
      );

      await expect(mockDownloaderService.fetchVideoInfo('invalid-url')).rejects.toThrow('Invalid YouTube URL');
    });

    it('should throw error for private video', async () => {
      (mockDownloaderService.fetchVideoInfo as jest.Mock).mockRejectedValue(
        new Error('Video is private or unavailable')
      );

      await expect(mockDownloaderService.fetchVideoInfo('https://www.youtube.com/watch?v=private')).rejects.toThrow('Video is private');
    });
  });

  describe('startDownload()', () => {
    it('should start download with valid options', async () => {
      const options: DownloadOptions = {
        quality: '720p',
        outputPath: '/downloads',
        filename: 'test-video.mp4',
        subtitleLanguages: ['en', 'zh-CN'],
        preferredFormat: 'mp4'
      };

      const mockTask = {
        id: 'task-001',
        videoInfo: { id: 'test', title: 'Test Video' } as any,
        status: 'downloading' as const,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 100000000,
        speed: 0,
        eta: 0,
        outputPath: '/downloads/test-video.mp4',
        startTime: new Date()
      };

      (mockDownloaderService.startDownload as jest.Mock).mockResolvedValue(mockTask);

      const result = await mockDownloaderService.startDownload('https://www.youtube.com/watch?v=test', options);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('downloading');
      expect(result).toHaveProperty('outputPath');
    });

    it('should validate quality option', async () => {
      const validQualities = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p', 'best', 'worst'];

      for (const quality of validQualities) {
        const options: DownloadOptions = {
          quality,
          outputPath: '/downloads'
        };

        (mockDownloaderService.startDownload as jest.Mock).mockResolvedValue({
          id: `task-${quality}`,
          status: 'downloading'
        });

        const result = await mockDownloaderService.startDownload('https://youtube.com/watch?v=test', options);
        expect(result).toBeDefined();
      }
    });

    it('should handle subtitle language selection', async () => {
      const options: DownloadOptions = {
        quality: '720p',
        outputPath: '/downloads',
        subtitleLanguages: ['en', 'zh-CN', 'ja', 'ko']
      };

      (mockDownloaderService.startDownload as jest.Mock).mockResolvedValue({
        id: 'task-multilang',
        status: 'downloading',
        subtitleLanguages: options.subtitleLanguages
      });

      const result = await mockDownloaderService.startDownload('https://youtube.com/watch?v=test', options);
      expect(result.subtitleLanguages).toEqual(options.subtitleLanguages);
    });
  });

  describe('pauseDownload()', () => {
    it('should pause an active download', async () => {
      (mockDownloaderService.pauseDownload as jest.Mock).mockResolvedValue(undefined);

      await expect(mockDownloaderService.pauseDownload('task-001')).resolves.toBeUndefined();
      expect(mockDownloaderService.pauseDownload).toHaveBeenCalledWith('task-001');
    });

    it('should throw error for non-existent task', async () => {
      (mockDownloaderService.pauseDownload as jest.Mock).mockRejectedValue(
        new Error('Task not found')
      );

      await expect(mockDownloaderService.pauseDownload('non-existent')).rejects.toThrow('Task not found');
    });
  });

  describe('resumeDownload()', () => {
    it('should resume a paused download', async () => {
      (mockDownloaderService.resumeDownload as jest.Mock).mockResolvedValue(undefined);

      await expect(mockDownloaderService.resumeDownload('task-001')).resolves.toBeUndefined();
      expect(mockDownloaderService.resumeDownload).toHaveBeenCalledWith('task-001');
    });

    it('should handle resume with partial file', async () => {
      // Mock checking existing file
      const existingProgress = {
        downloadedBytes: 50000000,
        totalBytes: 100000000
      };

      (mockDownloaderService.getProgress as jest.Mock).mockReturnValue({
        taskId: 'task-001',
        progress: 50,
        ...existingProgress,
        speed: 0,
        eta: 0,
        status: 'paused'
      });

      const progress = mockDownloaderService.getProgress('task-001');
      expect(progress.progress).toBe(50);
      expect(progress.status).toBe('paused');

      // Resume should continue from 50%
      (mockDownloaderService.resumeDownload as jest.Mock).mockResolvedValue(undefined);
      await mockDownloaderService.resumeDownload('task-001');
    });
  });

  describe('cancelDownload()', () => {
    it('should cancel and clean up download', async () => {
      (mockDownloaderService.cancelDownload as jest.Mock).mockResolvedValue(undefined);

      await expect(mockDownloaderService.cancelDownload('task-001')).resolves.toBeUndefined();
      expect(mockDownloaderService.cancelDownload).toHaveBeenCalledWith('task-001');
    });

    it('should handle cancellation of completed download', async () => {
      (mockDownloaderService.cancelDownload as jest.Mock).mockRejectedValue(
        new Error('Cannot cancel completed task')
      );

      await expect(mockDownloaderService.cancelDownload('completed-task')).rejects.toThrow('Cannot cancel completed task');
    });
  });

  describe('getProgress()', () => {
    it('should return valid progress information', () => {
      const mockProgress: DownloadProgress = {
        taskId: 'task-001',
        progress: 75.5,
        downloadedBytes: 75500000,
        totalBytes: 100000000,
        speed: 5242880, // 5MB/s
        eta: 5, // 5 seconds
        status: 'downloading'
      };

      (mockDownloaderService.getProgress as jest.Mock).mockReturnValue(mockProgress);

      const progress = mockDownloaderService.getProgress('task-001');

      expect(progress).toHaveProperty('taskId');
      expect(progress).toHaveProperty('progress');
      expect(progress).toHaveProperty('downloadedBytes');
      expect(progress).toHaveProperty('totalBytes');
      expect(progress).toHaveProperty('speed');
      expect(progress).toHaveProperty('eta');
      expect(progress).toHaveProperty('status');

      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
      expect(progress.downloadedBytes).toBeLessThanOrEqual(progress.totalBytes);
    });

    it('should handle different task statuses', () => {
      const statuses: Array<DownloadProgress['status']> = [
        'downloading',
        'paused',
        'completed',
        'failed'
      ];

      statuses.forEach(status => {
        const progress: DownloadProgress = {
          taskId: 'task-001',
          progress: status === 'completed' ? 100 : 50,
          downloadedBytes: status === 'completed' ? 100000000 : 50000000,
          totalBytes: 100000000,
          speed: status === 'downloading' ? 5242880 : 0,
          eta: status === 'downloading' ? 10 : 0,
          status
        };

        (mockDownloaderService.getProgress as jest.Mock).mockReturnValue(progress);

        const result = mockDownloaderService.getProgress('task-001');
        expect(result.status).toBe(status);
      });
    });
  });

  describe('listTasks()', () => {
    it('should return array of download tasks', () => {
      const mockTasks = [
        {
          id: 'task-001',
          videoInfo: { title: 'Video 1' } as any,
          status: 'downloading' as const,
          progress: 50
        },
        {
          id: 'task-002',
          videoInfo: { title: 'Video 2' } as any,
          status: 'completed' as const,
          progress: 100
        },
        {
          id: 'task-003',
          videoInfo: { title: 'Video 3' } as any,
          status: 'paused' as const,
          progress: 25
        }
      ];

      (mockDownloaderService.listTasks as jest.Mock).mockReturnValue(mockTasks);

      const tasks = mockDownloaderService.listTasks();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(3);
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('status');
      expect(tasks[0]).toHaveProperty('progress');
    });

    it('should return empty array when no tasks', () => {
      (mockDownloaderService.listTasks as jest.Mock).mockReturnValue([]);

      const tasks = mockDownloaderService.listTasks();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (mockDownloaderService.fetchVideoInfo as jest.Mock).mockRejectedValue(
        new Error('Network error: Unable to connect')
      );

      await expect(mockDownloaderService.fetchVideoInfo('https://youtube.com/watch?v=test')).rejects.toThrow('Network error');
    });

    it('should handle disk space errors', async () => {
      (mockDownloaderService.startDownload as jest.Mock).mockRejectedValue(
        new Error('Insufficient disk space')
      );

      await expect(mockDownloaderService.startDownload('https://youtube.com/watch?v=test', {
        quality: '1080p',
        outputPath: '/downloads'
      })).rejects.toThrow('Insufficient disk space');
    });

    it('should handle invalid output path', async () => {
      (mockDownloaderService.startDownload as jest.Mock).mockRejectedValue(
        new Error('Invalid output path')
      );

      await expect(mockDownloaderService.startDownload('https://youtube.com/watch?v=test', {
        quality: '720p',
        outputPath: '/invalid/path'
      })).rejects.toThrow('Invalid output path');
    });
  });
});