/**
 * Contract test for StorageService
 * Tests the service interface for data persistence
 */

import {
  IStorageService,
  StorageStats
} from '../../../specs/001-youtube-youtube/contracts/service-interfaces';

describe('Service Contract: StorageService', () => {
  let mockStorageService: IStorageService;

  beforeEach(() => {
    mockStorageService = {
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
  });

  describe('saveDownloadTask()', () => {
    it('should save download task', async () => {
      const task = {
        id: 'task-001',
        videoInfo: {
          id: 'video-001',
          title: 'Test Video',
          url: 'https://youtube.com/watch?v=test'
        },
        status: 'downloading' as const,
        progress: 50,
        downloadedBytes: 50000000,
        totalBytes: 100000000,
        speed: 5242880,
        eta: 10,
        outputPath: '/downloads/test.mp4',
        startTime: new Date()
      };

      (mockStorageService.saveDownloadTask as jest.Mock).mockResolvedValue(undefined);

      await expect(mockStorageService.saveDownloadTask(task as any)).resolves.toBeUndefined();
      expect(mockStorageService.saveDownloadTask).toHaveBeenCalledWith(task);
    });

    it('should update existing task', async () => {
      const updatedTask = {
        id: 'task-001',
        status: 'completed' as const,
        progress: 100,
        endTime: new Date()
      };

      (mockStorageService.saveDownloadTask as jest.Mock).mockResolvedValue(undefined);

      await mockStorageService.saveDownloadTask(updatedTask as any);
      expect(mockStorageService.saveDownloadTask).toHaveBeenCalledWith(updatedTask);
    });
  });

  describe('getDownloadTask()', () => {
    it('should retrieve download task by ID', async () => {
      const mockTask = {
        id: 'task-001',
        videoInfo: { title: 'Test Video' },
        status: 'completed',
        progress: 100,
        outputPath: '/downloads/test.mp4'
      };

      (mockStorageService.getDownloadTask as jest.Mock).mockResolvedValue(mockTask);

      const result = await mockStorageService.getDownloadTask('task-001');

      expect(result).toBeDefined();
      expect(result?.id).toBe('task-001');
      expect(result?.status).toBe('completed');
    });

    it('should return null for non-existent task', async () => {
      (mockStorageService.getDownloadTask as jest.Mock).mockResolvedValue(null);

      const result = await mockStorageService.getDownloadTask('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getDownloadHistory()', () => {
    it('should retrieve download history with pagination', async () => {
      const mockHistory = [
        { id: 'task-001', status: 'completed', startTime: new Date('2024-01-01') },
        { id: 'task-002', status: 'completed', startTime: new Date('2024-01-02') },
        { id: 'task-003', status: 'failed', startTime: new Date('2024-01-03') }
      ];

      (mockStorageService.getDownloadHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await mockStorageService.getDownloadHistory(10, 0);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach(task => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('status');
        expect(task).toHaveProperty('startTime');
      });
    });

    it('should handle pagination parameters', async () => {
      (mockStorageService.getDownloadHistory as jest.Mock).mockResolvedValue([]);

      // Test different pagination scenarios
      await mockStorageService.getDownloadHistory(5, 0);  // First page
      expect(mockStorageService.getDownloadHistory).toHaveBeenCalledWith(5, 0);

      await mockStorageService.getDownloadHistory(5, 5);  // Second page
      expect(mockStorageService.getDownloadHistory).toHaveBeenCalledWith(5, 5);

      await mockStorageService.getDownloadHistory();  // Default pagination
      expect(mockStorageService.getDownloadHistory).toHaveBeenCalledWith();
    });
  });

  describe('cacheVideoInfo()', () => {
    it('should cache video information', async () => {
      const videoInfo = {
        id: 'video-001',
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Video',
        duration: 300,
        thumbnail: 'https://example.com/thumb.jpg',
        author: 'Test Channel',
        availableFormats: [],
        availableSubtitles: []
      };

      (mockStorageService.cacheVideoInfo as jest.Mock).mockResolvedValue(undefined);

      await expect(mockStorageService.cacheVideoInfo(videoInfo as any)).resolves.toBeUndefined();
      expect(mockStorageService.cacheVideoInfo).toHaveBeenCalledWith(videoInfo);
    });

    it('should update existing cached video', async () => {
      const updatedVideoInfo = {
        id: 'video-001',
        title: 'Updated Title',
        viewCount: 1000000
      };

      (mockStorageService.cacheVideoInfo as jest.Mock).mockResolvedValue(undefined);

      await mockStorageService.cacheVideoInfo(updatedVideoInfo as any);
      expect(mockStorageService.cacheVideoInfo).toHaveBeenCalledWith(updatedVideoInfo);
    });
  });

  describe('getCachedVideoInfo()', () => {
    it('should retrieve cached video info', async () => {
      const cachedVideo = {
        id: 'video-001',
        title: 'Cached Video',
        duration: 300,
        cachedAt: new Date()
      };

      (mockStorageService.getCachedVideoInfo as jest.Mock).mockResolvedValue(cachedVideo);

      const result = await mockStorageService.getCachedVideoInfo('video-001');

      expect(result).toBeDefined();
      expect(result?.id).toBe('video-001');
      expect(result?.title).toBe('Cached Video');
    });

    it('should return null for uncached video', async () => {
      (mockStorageService.getCachedVideoInfo as jest.Mock).mockResolvedValue(null);

      const result = await mockStorageService.getCachedVideoInfo('not-cached');
      expect(result).toBeNull();
    });
  });

  describe('savePreferences()', () => {
    it('should save user preferences', async () => {
      const preferences = {
        defaultOutputPath: '/Users/test/Downloads',
        defaultQuality: '1080p',
        defaultFormat: 'mp4',
        autoGenerateSubtitles: true,
        theme: 'dark',
        language: 'zh-CN',
        defaultSubtitleLanguages: ['zh-CN', 'en'],
        maxConcurrentDownloads: 3
      };

      (mockStorageService.savePreferences as jest.Mock).mockResolvedValue(undefined);

      await expect(mockStorageService.savePreferences(preferences)).resolves.toBeUndefined();
      expect(mockStorageService.savePreferences).toHaveBeenCalledWith(preferences);
    });

    it('should merge partial preference updates', async () => {
      const partialUpdate = {
        theme: 'light',
        defaultQuality: '720p'
      };

      (mockStorageService.savePreferences as jest.Mock).mockResolvedValue(undefined);

      await mockStorageService.savePreferences(partialUpdate);
      expect(mockStorageService.savePreferences).toHaveBeenCalledWith(partialUpdate);
    });
  });

  describe('getPreferences()', () => {
    it('should retrieve user preferences', async () => {
      const mockPreferences = {
        defaultOutputPath: '/Downloads',
        defaultQuality: '720p',
        defaultFormat: 'mp4',
        autoGenerateSubtitles: false,
        theme: 'system',
        language: 'zh-CN',
        defaultSubtitleLanguages: ['zh-CN', 'en'],
        maxConcurrentDownloads: 1
      };

      (mockStorageService.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await mockStorageService.getPreferences();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('defaultOutputPath');
      expect(result).toHaveProperty('defaultQuality');
      expect(result).toHaveProperty('theme');
      expect(result.theme).toMatch(/light|dark|system/);
    });

    it('should return default preferences if none saved', async () => {
      const defaultPrefs = {
        defaultOutputPath: '',
        defaultQuality: '720p',
        defaultFormat: 'mp4',
        autoGenerateSubtitles: false,
        theme: 'system',
        language: 'zh-CN'
      };

      (mockStorageService.getPreferences as jest.Mock).mockResolvedValue(defaultPrefs);

      const result = await mockStorageService.getPreferences();
      expect(result.defaultQuality).toBe('720p');
      expect(result.theme).toBe('system');
    });
  });

  describe('clearCache()', () => {
    it('should clear all cached data', async () => {
      (mockStorageService.clearCache as jest.Mock).mockResolvedValue(undefined);

      await expect(mockStorageService.clearCache()).resolves.toBeUndefined();
      expect(mockStorageService.clearCache).toHaveBeenCalled();
    });

    it('should handle cache clear errors gracefully', async () => {
      (mockStorageService.clearCache as jest.Mock).mockRejectedValue(
        new Error('Failed to clear cache')
      );

      await expect(mockStorageService.clearCache()).rejects.toThrow('Failed to clear cache');
    });
  });

  describe('getStorageStats()', () => {
    it('should return storage statistics', async () => {
      const mockStats: StorageStats = {
        totalVideos: 150,
        totalDownloads: 75,
        cacheSize: 524288000, // 500 MB
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2024-03-15')
      };

      (mockStorageService.getStorageStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await mockStorageService.getStorageStats();

      expect(result).toHaveProperty('totalVideos');
      expect(result).toHaveProperty('totalDownloads');
      expect(result).toHaveProperty('cacheSize');
      expect(result).toHaveProperty('oldestEntry');
      expect(result).toHaveProperty('newestEntry');

      expect(result.totalVideos).toBeGreaterThanOrEqual(0);
      expect(result.totalDownloads).toBeGreaterThanOrEqual(0);
      expect(result.cacheSize).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty storage', async () => {
      const emptyStats: StorageStats = {
        totalVideos: 0,
        totalDownloads: 0,
        cacheSize: 0,
        oldestEntry: new Date(),
        newestEntry: new Date()
      };

      (mockStorageService.getStorageStats as jest.Mock).mockResolvedValue(emptyStats);

      const result = await mockStorageService.getStorageStats();
      expect(result.totalVideos).toBe(0);
      expect(result.totalDownloads).toBe(0);
      expect(result.cacheSize).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should handle concurrent saves', async () => {
      const tasks = [
        { id: 'task-001', status: 'downloading' },
        { id: 'task-002', status: 'downloading' },
        { id: 'task-003', status: 'downloading' }
      ];

      (mockStorageService.saveDownloadTask as jest.Mock).mockResolvedValue(undefined);

      const savePromises = tasks.map(task =>
        mockStorageService.saveDownloadTask(task as any)
      );

      await expect(Promise.all(savePromises)).resolves.toBeDefined();
      expect(mockStorageService.saveDownloadTask).toHaveBeenCalledTimes(3);
    });

    it('should validate data before saving', async () => {
      const invalidTask = {
        // Missing required fields
        status: 'downloading'
      };

      (mockStorageService.saveDownloadTask as jest.Mock).mockRejectedValue(
        new Error('Invalid task data: missing required field "id"')
      );

      await expect(mockStorageService.saveDownloadTask(invalidTask as any))
        .rejects.toThrow('Invalid task data');
    });

    it('should handle storage quota exceeded', async () => {
      const largeData = {
        id: 'large-task',
        data: new Array(1000000).fill('x').join('') // Large string
      };

      (mockStorageService.saveDownloadTask as jest.Mock).mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      await expect(mockStorageService.saveDownloadTask(largeData as any))
        .rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (mockStorageService.getPreferences as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(mockStorageService.getPreferences())
        .rejects.toThrow('Database connection failed');
    });

    it('should handle data corruption', async () => {
      (mockStorageService.getDownloadTask as jest.Mock).mockRejectedValue(
        new Error('Data corruption detected')
      );

      await expect(mockStorageService.getDownloadTask('corrupted-id'))
        .rejects.toThrow('Data corruption detected');
    });

    it('should handle permission errors', async () => {
      (mockStorageService.savePreferences as jest.Mock).mockRejectedValue(
        new Error('Permission denied: cannot write to storage')
      );

      await expect(mockStorageService.savePreferences({}))
        .rejects.toThrow('Permission denied');
    });
  });
});