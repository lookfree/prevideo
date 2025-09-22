/**
 * Unit tests for useDownloadManager hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { useDownloadManager } from '../../../src/renderer/hooks/useDownloadManager';
import downloadReducer from '../../../src/renderer/store/slices/downloadSlice';
import taskReducer from '../../../src/renderer/store/slices/taskSlice';

// Mock window.prevideo API
const mockPrevideo = {
  video: {
    fetchInfo: jest.fn(),
    startDownload: jest.fn(),
    onProgress: jest.fn()
  },
  tasks: {
    getAllTasks: jest.fn(),
    pauseTask: jest.fn(),
    resumeTask: jest.fn(),
    cancelTask: jest.fn(),
    retryTask: jest.fn(),
    removeTask: jest.fn(),
    clearCompletedTasks: jest.fn()
  }
};

(global as any).window = {
  prevideo: mockPrevideo
};

describe('useDownloadManager', () => {
  let store: any;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <SnackbarProvider>
        {children}
      </SnackbarProvider>
    </Provider>
  );

  beforeEach(() => {
    store = configureStore({
      reducer: {
        download: downloadReducer,
        task: taskReducer
      }
    });

    // Reset mocks
    jest.clearAllMocks();
    mockPrevideo.tasks.getAllTasks.mockResolvedValue({
      success: true,
      data: []
    });
    mockPrevideo.video.onProgress.mockReturnValue(() => {});
  });

  describe('initialization', () => {
    it('should load tasks on mount', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          type: 'download',
          status: 'downloading',
          videoInfo: { title: 'Video 1' }
        },
        {
          id: 'task-2',
          type: 'download',
          status: 'queued',
          videoInfo: { title: 'Video 2' }
        }
      ];

      mockPrevideo.tasks.getAllTasks.mockResolvedValue({
        success: true,
        data: mockTasks
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.activeTasks).toHaveLength(1);
      expect(result.current.queuedTasks).toHaveLength(1);
    });

    it('should handle load error', async () => {
      mockPrevideo.tasks.getAllTasks.mockResolvedValue({
        success: false,
        error: 'Failed to load'
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load');
      expect(result.current.tasks).toHaveLength(0);
    });
  });

  describe('startDownload', () => {
    it('should start a new download', async () => {
      mockPrevideo.video.startDownload.mockResolvedValue({
        success: true,
        data: { id: 'new-task', status: 'queued' }
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await act(async () => {
        await result.current.startDownload('https://example.com/video', {
          quality: 'best',
          outputPath: '/downloads'
        });
      });

      expect(mockPrevideo.video.startDownload).toHaveBeenCalledWith(
        'https://example.com/video',
        expect.objectContaining({
          quality: 'best',
          outputPath: '/downloads'
        })
      );

      expect(mockPrevideo.tasks.getAllTasks).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should handle download error', async () => {
      mockPrevideo.video.startDownload.mockResolvedValue({
        success: false,
        error: 'Download failed'
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await expect(
        result.current.startDownload('https://example.com/video', {
          outputPath: '/downloads'
        })
      ).rejects.toThrow('Download failed');
    });
  });

  describe('pauseDownload', () => {
    it('should pause an active download', async () => {
      mockPrevideo.tasks.pauseTask.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await act(async () => {
        await result.current.pauseDownload('task-1');
      });

      expect(mockPrevideo.tasks.pauseTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('resumeDownload', () => {
    it('should resume a paused download', async () => {
      mockPrevideo.tasks.resumeTask.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await act(async () => {
        await result.current.resumeDownload('task-1');
      });

      expect(mockPrevideo.tasks.resumeTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('cancelDownload', () => {
    it('should cancel a download', async () => {
      mockPrevideo.tasks.cancelTask.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await act(async () => {
        await result.current.cancelDownload('task-1');
      });

      expect(mockPrevideo.tasks.cancelTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('getVideoInfo', () => {
    it('should fetch video info', async () => {
      const mockVideoInfo = {
        id: 'video-1',
        title: 'Test Video',
        author: 'Test Author',
        duration: 120
      };

      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      const info = await result.current.getVideoInfo('https://example.com/video');

      expect(info).toEqual(mockVideoInfo);
      expect(mockPrevideo.video.fetchInfo).toHaveBeenCalledWith('https://example.com/video');
    });

    it('should return null on fetch error', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      const info = await result.current.getVideoInfo('https://example.com/video');

      expect(info).toBeNull();
    });
  });

  describe('progress updates', () => {
    it('should subscribe to progress updates', async () => {
      let progressCallback: Function | null = null;

      mockPrevideo.video.onProgress.mockImplementation((callback) => {
        progressCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      const mockTasks = [{
        id: 'task-1',
        type: 'download',
        status: 'downloading',
        progress: 0,
        videoInfo: { title: 'Video 1' }
      }];

      mockPrevideo.tasks.getAllTasks.mockResolvedValue({
        success: true,
        data: mockTasks
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      // Simulate progress update
      act(() => {
        if (progressCallback) {
          progressCallback({
            taskId: 'task-1',
            task: { progress: 50 }
          });
        }
      });

      // Progress updates should trigger state updates
      expect(mockPrevideo.video.onProgress).toHaveBeenCalled();
    });
  });

  describe('clearCompleted', () => {
    it('should clear completed tasks', async () => {
      mockPrevideo.tasks.clearCompletedTasks.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useDownloadManager(), { wrapper });

      await act(async () => {
        await result.current.clearCompleted();
      });

      expect(mockPrevideo.tasks.clearCompletedTasks).toHaveBeenCalled();
      expect(mockPrevideo.tasks.getAllTasks).toHaveBeenCalled(); // Should refresh
    });
  });
});