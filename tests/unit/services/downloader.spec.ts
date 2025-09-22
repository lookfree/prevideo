/**
 * Unit tests for DownloaderService
 */

import { DownloaderService } from '../../../src/main/services/downloader';
import { YtDlpWrapper } from '../../../src/main/binaries/ytdlp-wrapper';
import { VideoInfo } from '../../../src/shared/types/video';

jest.mock('../../../src/main/binaries/ytdlp-wrapper');

describe('DownloaderService', () => {
  let service: DownloaderService;
  let mockYtdlp: jest.Mocked<YtDlpWrapper>;

  beforeEach(() => {
    mockYtdlp = new YtDlpWrapper() as jest.Mocked<YtDlpWrapper>;
    service = new DownloaderService();
    (service as any).ytdlp = mockYtdlp;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchVideoInfo', () => {
    it('should fetch video info successfully', async () => {
      const mockVideoInfo: VideoInfo = {
        id: 'test-id',
        title: 'Test Video',
        author: 'Test Author',
        duration: 120,
        thumbnail: 'https://example.com/thumb.jpg',
        description: 'Test description',
        viewCount: 1000,
        likeCount: 100,
        uploadDate: '2024-01-01',
        availableFormats: [],
        availableSubtitles: []
      };

      mockYtdlp.fetchVideoInfo.mockResolvedValue(mockVideoInfo);

      const result = await service.fetchVideoInfo('https://example.com/video');

      expect(result).toEqual(mockVideoInfo);
      expect(mockYtdlp.fetchVideoInfo).toHaveBeenCalledWith('https://example.com/video');
    });

    it('should handle fetch error gracefully', async () => {
      const error = new Error('Failed to fetch');
      mockYtdlp.fetchVideoInfo.mockRejectedValue(error);

      await expect(service.fetchVideoInfo('https://example.com/video'))
        .rejects.toThrow('Failed to fetch');
    });

    it('should validate URL before fetching', async () => {
      await expect(service.fetchVideoInfo('invalid-url'))
        .rejects.toThrow('Invalid URL');
    });
  });

  describe('startDownload', () => {
    it('should start download with default options', async () => {
      const mockTask = {
        taskId: 'task-123',
        process: {} as any
      };

      mockYtdlp.download.mockResolvedValue(mockTask);

      const result = await service.startDownload(
        'https://example.com/video',
        '/output/path.mp4'
      );

      expect(result.taskId).toBe('task-123');
      expect(mockYtdlp.download).toHaveBeenCalledWith(
        'https://example.com/video',
        '/output/path.mp4',
        expect.objectContaining({
          quality: 'best',
          format: 'mp4'
        })
      );
    });

    it('should start download with custom options', async () => {
      const mockTask = {
        taskId: 'task-456',
        process: {} as any
      };

      mockYtdlp.download.mockResolvedValue(mockTask);

      const options = {
        quality: '1080p',
        format: 'webm',
        subtitleLanguages: ['en', 'zh-CN']
      };

      const result = await service.startDownload(
        'https://example.com/video',
        '/output/path.webm',
        options
      );

      expect(result.taskId).toBe('task-456');
      expect(mockYtdlp.download).toHaveBeenCalledWith(
        'https://example.com/video',
        '/output/path.webm',
        expect.objectContaining({
          quality: '1080p',
          format: 'webm',
          subtitles: ['en', 'zh-CN']
        })
      );
    });

    it('should handle progress updates', async () => {
      const progressCallback = jest.fn();
      const mockTask = {
        taskId: 'task-789',
        process: {
          stdout: {
            on: (event: string, callback: Function) => {
              if (event === 'data') {
                // Simulate progress data
                callback(Buffer.from('[download]  50.0%'));
              }
            }
          }
        } as any
      };

      mockYtdlp.download.mockImplementation((url, output, options) => {
        if (options?.onProgress) {
          options.onProgress({
            taskId: 'task-789',
            progress: 50.0,
            speed: '2.5MB/s',
            eta: '00:30'
          });
        }
        return Promise.resolve(mockTask);
      });

      const result = await service.startDownload(
        'https://example.com/video',
        '/output/path.mp4',
        { onProgress: progressCallback }
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-789',
          progress: 50.0
        })
      );
    });
  });

  describe('pauseDownload', () => {
    it('should pause active download', async () => {
      const taskId = 'task-123';
      service.addActiveDownload(taskId, {} as any);

      const result = await service.pauseDownload(taskId);

      expect(result).toBe(true);
      expect(service.isDownloadActive(taskId)).toBe(false);
    });

    it('should return false for non-existent task', async () => {
      const result = await service.pauseDownload('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('resumeDownload', () => {
    it('should resume paused download', async () => {
      const mockTask = {
        taskId: 'task-123',
        process: {} as any
      };

      mockYtdlp.download.mockResolvedValue(mockTask);

      const result = await service.resumeDownload(
        'task-123',
        'https://example.com/video',
        '/output/path.mp4',
        { resumeFrom: 1024 * 1024 } // 1MB
      );

      expect(result).toBe(true);
      expect(mockYtdlp.download).toHaveBeenCalled();
    });
  });

  describe('cancelDownload', () => {
    it('should cancel active download', () => {
      mockYtdlp.cancelDownload.mockReturnValue(true);

      const result = service.cancelDownload('task-123');

      expect(result).toBe(true);
      expect(mockYtdlp.cancelDownload).toHaveBeenCalledWith('task-123');
    });

    it('should return false for non-existent task', () => {
      mockYtdlp.cancelDownload.mockReturnValue(false);

      const result = service.cancelDownload('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getActiveDownloads', () => {
    it('should return list of active downloads', () => {
      service.addActiveDownload('task-1', { url: 'url1' } as any);
      service.addActiveDownload('task-2', { url: 'url2' } as any);

      const active = service.getActiveDownloads();

      expect(active).toHaveLength(2);
      expect(active).toContain('task-1');
      expect(active).toContain('task-2');
    });

    it('should return empty array when no active downloads', () => {
      const active = service.getActiveDownloads();
      expect(active).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', () => {
      mockYtdlp.cleanup.mockImplementation(() => {});

      service.cleanup();

      expect(mockYtdlp.cleanup).toHaveBeenCalled();
    });
  });
});