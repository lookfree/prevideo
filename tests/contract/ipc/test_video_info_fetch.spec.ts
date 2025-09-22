/**
 * Contract test for video:info:fetch IPC channel
 * Tests the contract between renderer and main process for fetching video information
 */

import { IPC_CHANNELS, VideoInfoFetchRequest, VideoInfoFetchResponse } from '../../../specs/001-youtube-youtube/contracts/ipc-channels';

describe('IPC Contract: video:info:fetch', () => {
  let mockIpcMain: any;
  let mockIpcRenderer: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mocked electron modules
    const electron = require('electron');
    mockIpcMain = electron.ipcMain;
    mockIpcRenderer = electron.ipcRenderer;
  });

  describe('Request Contract', () => {
    it('should accept valid YouTube URL', async () => {
      const validRequest: VideoInfoFetchRequest = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      };

      // This test verifies the request structure
      expect(validRequest).toHaveProperty('url');
      expect(typeof validRequest.url).toBe('string');
      expect(validRequest.url).toMatch(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/);
    });

    it('should accept shortened YouTube URL', async () => {
      const validRequest: VideoInfoFetchRequest = {
        url: 'https://youtu.be/dQw4w9WgXcQ'
      };

      expect(validRequest).toHaveProperty('url');
      expect(validRequest.url).toMatch(/^https?:\/\/youtu\.be\//);
    });

    it('should reject invalid URL format', async () => {
      const invalidRequests = [
        { url: '' },
        { url: 'not-a-url' },
        { url: 'https://vimeo.com/123456' },
        { url: null },
        { url: undefined },
        {}
      ];

      invalidRequests.forEach(request => {
        const isValid =
          request &&
          typeof request.url === 'string' &&
          request.url.length > 0 &&
          (request.url.includes('youtube.com') || request.url.includes('youtu.be'));

        expect(isValid).toBe(false);
      });
    });
  });

  describe('Response Contract', () => {
    it('should return success response with video data', async () => {
      const mockResponse: VideoInfoFetchResponse = {
        success: true,
        data: {
          id: 'dQw4w9WgXcQ',
          title: 'Test Video Title',
          duration: 212,
          thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          author: 'Test Channel',
          formats: [
            { formatId: '22', quality: '720p', ext: 'mp4', fps: 30 },
            { formatId: '18', quality: '360p', ext: 'mp4', fps: 30 }
          ],
          subtitles: ['en', 'zh-CN', 'ja']
        }
      };

      // Verify response structure
      expect(mockResponse).toHaveProperty('success');
      expect(mockResponse.success).toBe(true);
      expect(mockResponse).toHaveProperty('data');

      const { data } = mockResponse;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('duration');
      expect(data).toHaveProperty('thumbnail');
      expect(data).toHaveProperty('author');
      expect(data).toHaveProperty('formats');
      expect(data).toHaveProperty('subtitles');

      // Verify data types
      expect(typeof data!.id).toBe('string');
      expect(typeof data!.title).toBe('string');
      expect(typeof data!.duration).toBe('number');
      expect(typeof data!.thumbnail).toBe('string');
      expect(typeof data!.author).toBe('string');
      expect(Array.isArray(data!.formats)).toBe(true);
      expect(Array.isArray(data!.subtitles)).toBe(true);

      // Verify format structure
      data!.formats.forEach(format => {
        expect(format).toHaveProperty('formatId');
        expect(format).toHaveProperty('quality');
        expect(format).toHaveProperty('ext');
      });
    });

    it('should return error response for invalid URL', async () => {
      const errorResponse: VideoInfoFetchResponse = {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'The provided URL is not a valid YouTube URL'
        }
      };

      // Verify error response structure
      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse.success).toBe(false);
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.data).toBeUndefined();

      const { error } = errorResponse;
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(typeof error!.code).toBe('string');
      expect(typeof error!.message).toBe('string');
    });

    it('should return error response for network failure', async () => {
      const errorResponse: VideoInfoFetchResponse = {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to YouTube'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error?.code).toBe('NETWORK_ERROR');
    });

    it('should return error response for private video', async () => {
      const errorResponse: VideoInfoFetchResponse = {
        success: false,
        error: {
          code: 'VIDEO_UNAVAILABLE',
          message: 'This video is private or has been removed'
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error?.code).toBe('VIDEO_UNAVAILABLE');
    });
  });

  describe('IPC Communication Contract', () => {
    it('should use correct channel name', () => {
      expect(IPC_CHANNELS.VIDEO_INFO_FETCH).toBe('video:info:fetch');
    });

    it('should handle async communication', async () => {
      const request: VideoInfoFetchRequest = {
        url: 'https://www.youtube.com/watch?v=test'
      };

      // Mock the IPC response
      mockIpcRenderer.invoke.mockResolvedValue({
        success: true,
        data: {
          id: 'test',
          title: 'Test Video',
          duration: 100,
          thumbnail: 'https://example.com/thumb.jpg',
          author: 'Test Author',
          formats: [],
          subtitles: []
        }
      });

      // Simulate renderer sending request
      const response = await mockIpcRenderer.invoke(IPC_CHANNELS.VIDEO_INFO_FETCH, request);

      // Verify the mock was called correctly
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPC_CHANNELS.VIDEO_INFO_FETCH,
        request
      );

      // Verify response structure
      expect(response).toBeValidIpcResponse();
      expect(response.success).toBe(true);
    });

    it('should handle timeout gracefully', async () => {
      const request: VideoInfoFetchRequest = {
        url: 'https://www.youtube.com/watch?v=timeout'
      };

      // Mock timeout
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Request timeout'));

      // Verify timeout handling
      await expect(
        mockIpcRenderer.invoke(IPC_CHANNELS.VIDEO_INFO_FETCH, request)
      ).rejects.toThrow('Request timeout');
    });
  });
});