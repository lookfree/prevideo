/**
 * Custom hook for managing downloads
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { DownloadTask, DownloadOptions } from '../../shared/types/tasks';
import { VideoInfo } from '../../shared/types/video';

interface DownloadManagerState {
  tasks: DownloadTask[];
  activeTasks: DownloadTask[];
  queuedTasks: DownloadTask[];
  completedTasks: DownloadTask[];
  isLoading: boolean;
  error: string | null;
}

interface DownloadManagerActions {
  startDownload: (url: string, options: DownloadOptions) => Promise<void>;
  pauseDownload: (taskId: string) => Promise<void>;
  resumeDownload: (taskId: string) => Promise<void>;
  cancelDownload: (taskId: string) => Promise<void>;
  retryDownload: (taskId: string) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  getVideoInfo: (url: string) => Promise<VideoInfo | null>;
  refreshTasks: () => Promise<void>;
}

export function useDownloadManager(): DownloadManagerState & DownloadManagerActions {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<DownloadManagerState>({
    tasks: [],
    activeTasks: [],
    queuedTasks: [],
    completedTasks: [],
    isLoading: false,
    error: null
  });

  const progressListenerRef = useRef<(() => void) | null>(null);

  // Load tasks on mount
  useEffect(() => {
    refreshTasks();

    // Subscribe to progress updates
    const unsubscribe = subscribeToProgress();
    progressListenerRef.current = unsubscribe;

    return () => {
      if (progressListenerRef.current) {
        progressListenerRef.current();
      }
    };
  }, []);

  const refreshTasks = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await window.prevideo.tasks.getAllTasks();
      if (result.success) {
        categorizeTasks(result.data);
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || '加载任务失败',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setState(prev => ({
        ...prev,
        error: '加载任务失败',
        isLoading: false
      }));
    }
  }, []);

  const categorizeTasks = useCallback((tasks: DownloadTask[]) => {
    const active = tasks.filter(t =>
      t.status === 'downloading' ||
      t.status === 'processing' ||
      t.status === 'paused'
    );
    const queued = tasks.filter(t => t.status === 'queued');
    const completed = tasks.filter(t =>
      t.status === 'completed' ||
      t.status === 'failed' ||
      t.status === 'cancelled'
    );

    setState(prev => ({
      ...prev,
      tasks,
      activeTasks: active,
      queuedTasks: queued,
      completedTasks: completed,
      isLoading: false,
      error: null
    }));
  }, []);

  const subscribeToProgress = useCallback(() => {
    const handleProgress = (data: any) => {
      setState(prev => {
        const updatedTasks = prev.tasks.map(task =>
          task.id === data.taskId
            ? { ...task, ...data.task }
            : task
        );

        categorizeTasks(updatedTasks);
        return prev;
      });
    };

    return window.prevideo.video.onProgress(handleProgress);
  }, [categorizeTasks]);

  const startDownload = useCallback(async (url: string, options: DownloadOptions) => {
    try {
      const result = await window.prevideo.video.startDownload(url, options);
      if (result.success) {
        enqueueSnackbar('下载任务已添加', { variant: 'success' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '启动下载失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '启动下载失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const pauseDownload = useCallback(async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.pauseTask(taskId);
      if (result.success) {
        enqueueSnackbar('下载已暂停', { variant: 'info' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '暂停失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '暂停失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const resumeDownload = useCallback(async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.resumeTask(taskId);
      if (result.success) {
        enqueueSnackbar('下载已恢复', { variant: 'info' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '恢复失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '恢复失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const cancelDownload = useCallback(async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.cancelTask(taskId);
      if (result.success) {
        enqueueSnackbar('下载已取消', { variant: 'warning' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '取消失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '取消失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const retryDownload = useCallback(async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.retryTask(taskId);
      if (result.success) {
        enqueueSnackbar('重新开始下载', { variant: 'info' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '重试失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const removeTask = useCallback(async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.removeTask(taskId);
      if (result.success) {
        await refreshTasks();
      } else {
        throw new Error(result.error || '移除失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '移除失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const clearCompleted = useCallback(async () => {
    try {
      const result = await window.prevideo.tasks.clearCompletedTasks();
      if (result.success) {
        enqueueSnackbar('已清除完成的任务', { variant: 'success' });
        await refreshTasks();
      } else {
        throw new Error(result.error || '清除失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '清除失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, refreshTasks]);

  const getVideoInfo = useCallback(async (url: string): Promise<VideoInfo | null> => {
    try {
      const result = await window.prevideo.video.fetchInfo(url);
      if (result.success) {
        return result.data;
      } else {
        enqueueSnackbar(result.error || '获取视频信息失败', { variant: 'error' });
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch video info:', error);
      enqueueSnackbar('获取视频信息失败', { variant: 'error' });
      return null;
    }
  }, [enqueueSnackbar]);

  return {
    ...state,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
    removeTask,
    clearCompleted,
    getVideoInfo,
    refreshTasks
  };
}