/**
 * Download slice for Redux state management
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { VideoInfo } from '../../../shared/types/video';
import { DownloadTask, DownloadOptions } from '../../../shared/types/tasks';

interface DownloadState {
  videoInfo: VideoInfo | null;
  isLoadingInfo: boolean;
  infoError: string | null;
  activeDownloads: DownloadTask[];
  queuedDownloads: DownloadTask[];
  completedDownloads: DownloadTask[];
  downloadProgress: { [taskId: string]: number };
  downloadSpeed: { [taskId: string]: number };
  downloadEta: { [taskId: string]: number };
}

const initialState: DownloadState = {
  videoInfo: null,
  isLoadingInfo: false,
  infoError: null,
  activeDownloads: [],
  queuedDownloads: [],
  completedDownloads: [],
  downloadProgress: {},
  downloadSpeed: {},
  downloadEta: {}
};

// Async thunks
export const fetchVideoInfo = createAsyncThunk(
  'download/fetchInfo',
  async (url: string) => {
    const result = await window.prevideo.video.fetchInfo(url);
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to fetch video info');
    }
  }
);

export const startDownload = createAsyncThunk(
  'download/start',
  async ({ url, options }: { url: string; options: DownloadOptions }) => {
    const result = await window.prevideo.video.startDownload(url, options);
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to start download');
    }
  }
);

export const pauseDownload = createAsyncThunk(
  'download/pause',
  async (taskId: string) => {
    const result = await window.prevideo.tasks.pauseTask(taskId);
    if (result.success) {
      return taskId;
    } else {
      throw new Error(result.error || 'Failed to pause download');
    }
  }
);

export const resumeDownload = createAsyncThunk(
  'download/resume',
  async (taskId: string) => {
    const result = await window.prevideo.tasks.resumeTask(taskId);
    if (result.success) {
      return taskId;
    } else {
      throw new Error(result.error || 'Failed to resume download');
    }
  }
);

export const cancelDownload = createAsyncThunk(
  'download/cancel',
  async (taskId: string) => {
    const result = await window.prevideo.tasks.cancelTask(taskId);
    if (result.success) {
      return taskId;
    } else {
      throw new Error(result.error || 'Failed to cancel download');
    }
  }
);

const downloadSlice = createSlice({
  name: 'download',
  initialState,
  reducers: {
    clearVideoInfo: (state) => {
      state.videoInfo = null;
      state.infoError = null;
    },
    updateProgress: (state, action: PayloadAction<{
      taskId: string;
      progress: number;
      speed?: number;
      eta?: number;
    }>) => {
      const { taskId, progress, speed, eta } = action.payload;
      state.downloadProgress[taskId] = progress;
      if (speed !== undefined) state.downloadSpeed[taskId] = speed;
      if (eta !== undefined) state.downloadEta[taskId] = eta;

      // Update task in active downloads
      const task = state.activeDownloads.find(t => t.id === taskId);
      if (task) {
        task.progress = progress;
        if (speed !== undefined) task.speed = speed;
        if (eta !== undefined) task.eta = eta;
      }
    },
    moveToActive: (state, action: PayloadAction<DownloadTask>) => {
      const task = action.payload;
      state.queuedDownloads = state.queuedDownloads.filter(t => t.id !== task.id);
      state.activeDownloads.push(task);
    },
    moveToCompleted: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const task = state.activeDownloads.find(t => t.id === taskId);
      if (task) {
        state.activeDownloads = state.activeDownloads.filter(t => t.id !== taskId);
        task.status = 'completed';
        task.endTime = Date.now();
        state.completedDownloads.push(task);
      }
    },
    removeFromCompleted: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      state.completedDownloads = state.completedDownloads.filter(t => t.id !== taskId);
    },
    clearCompleted: (state) => {
      state.completedDownloads = [];
    },
    setActiveDownloads: (state, action: PayloadAction<DownloadTask[]>) => {
      state.activeDownloads = action.payload;
    },
    setQueuedDownloads: (state, action: PayloadAction<DownloadTask[]>) => {
      state.queuedDownloads = action.payload;
    },
    setCompletedDownloads: (state, action: PayloadAction<DownloadTask[]>) => {
      state.completedDownloads = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch video info
    builder.addCase(fetchVideoInfo.pending, (state) => {
      state.isLoadingInfo = true;
      state.infoError = null;
    });
    builder.addCase(fetchVideoInfo.fulfilled, (state, action) => {
      state.isLoadingInfo = false;
      state.videoInfo = action.payload;
    });
    builder.addCase(fetchVideoInfo.rejected, (state, action) => {
      state.isLoadingInfo = false;
      state.infoError = action.error.message || 'Failed to fetch video info';
    });

    // Start download
    builder.addCase(startDownload.fulfilled, (state, action) => {
      const task = action.payload;
      state.queuedDownloads.push(task);
    });

    // Pause download
    builder.addCase(pauseDownload.fulfilled, (state, action) => {
      const taskId = action.payload;
      const task = state.activeDownloads.find(t => t.id === taskId);
      if (task) {
        task.status = 'paused';
      }
    });

    // Resume download
    builder.addCase(resumeDownload.fulfilled, (state, action) => {
      const taskId = action.payload;
      const task = state.activeDownloads.find(t => t.id === taskId);
      if (task) {
        task.status = 'downloading';
      }
    });

    // Cancel download
    builder.addCase(cancelDownload.fulfilled, (state, action) => {
      const taskId = action.payload;
      state.activeDownloads = state.activeDownloads.filter(t => t.id !== taskId);
      state.queuedDownloads = state.queuedDownloads.filter(t => t.id !== taskId);
    });
  }
});

export const {
  clearVideoInfo,
  updateProgress,
  moveToActive,
  moveToCompleted,
  removeFromCompleted,
  clearCompleted,
  setActiveDownloads,
  setQueuedDownloads,
  setCompletedDownloads
} = downloadSlice.actions;

export default downloadSlice.reducer;