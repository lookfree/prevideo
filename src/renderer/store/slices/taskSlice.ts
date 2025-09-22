/**
 * Task slice for Redux state management
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { DownloadTask, ProcessingTask } from '../../../shared/types/tasks';

interface TaskState {
  allTasks: (DownloadTask | ProcessingTask)[];
  activeTasks: (DownloadTask | ProcessingTask)[];
  queuedTasks: (DownloadTask | ProcessingTask)[];
  completedTasks: (DownloadTask | ProcessingTask)[];
  failedTasks: (DownloadTask | ProcessingTask)[];
  isLoading: boolean;
  error: string | null;
  taskProgress: { [taskId: string]: number };
  selectedTaskId: string | null;
}

const initialState: TaskState = {
  allTasks: [],
  activeTasks: [],
  queuedTasks: [],
  completedTasks: [],
  failedTasks: [],
  isLoading: false,
  error: null,
  taskProgress: {},
  selectedTaskId: null
};

// Async thunks
export const loadTasks = createAsyncThunk(
  'task/loadAll',
  async () => {
    const result = await window.prevideo.tasks.getAllTasks();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to load tasks');
    }
  }
);

export const retryTask = createAsyncThunk(
  'task/retry',
  async (taskId: string) => {
    const result = await window.prevideo.tasks.retryTask(taskId);
    if (result.success) {
      return taskId;
    } else {
      throw new Error(result.error || 'Failed to retry task');
    }
  }
);

export const removeTask = createAsyncThunk(
  'task/remove',
  async (taskId: string) => {
    const result = await window.prevideo.tasks.removeTask(taskId);
    if (result.success) {
      return taskId;
    } else {
      throw new Error(result.error || 'Failed to remove task');
    }
  }
);

export const clearCompletedTasks = createAsyncThunk(
  'task/clearCompleted',
  async () => {
    const result = await window.prevideo.tasks.clearCompletedTasks();
    if (result.success) {
      return true;
    } else {
      throw new Error(result.error || 'Failed to clear completed tasks');
    }
  }
);

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<(DownloadTask | ProcessingTask)[]>) => {
      state.allTasks = action.payload;
      state.activeTasks = action.payload.filter(t =>
        t.status === 'downloading' || t.status === 'processing' || t.status === 'paused'
      );
      state.queuedTasks = action.payload.filter(t => t.status === 'queued');
      state.completedTasks = action.payload.filter(t => t.status === 'completed');
      state.failedTasks = action.payload.filter(t => t.status === 'failed');
    },
    updateTaskStatus: (state, action: PayloadAction<{ taskId: string; status: string }>) => {
      const { taskId, status } = action.payload;
      const task = state.allTasks.find(t => t.id === taskId);
      if (task) {
        task.status = status as any;
        task.updatedAt = Date.now();

        // Re-categorize tasks
        state.activeTasks = state.allTasks.filter(t =>
          t.status === 'downloading' || t.status === 'processing' || t.status === 'paused'
        );
        state.queuedTasks = state.allTasks.filter(t => t.status === 'queued');
        state.completedTasks = state.allTasks.filter(t => t.status === 'completed');
        state.failedTasks = state.allTasks.filter(t => t.status === 'failed');
      }
    },
    updateTaskProgress: (state, action: PayloadAction<{
      taskId: string;
      progress: number;
      speed?: number;
      eta?: number;
    }>) => {
      const { taskId, progress, speed, eta } = action.payload;
      state.taskProgress[taskId] = progress;

      const task = state.allTasks.find(t => t.id === taskId);
      if (task) {
        task.progress = progress;
        if (speed !== undefined) (task as DownloadTask).speed = speed;
        if (eta !== undefined) (task as DownloadTask).eta = eta;
        task.updatedAt = Date.now();
      }
    },
    selectTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    addTask: (state, action: PayloadAction<DownloadTask | ProcessingTask>) => {
      const task = action.payload;
      state.allTasks.push(task);

      if (task.status === 'queued') {
        state.queuedTasks.push(task);
      } else if (task.status === 'downloading' || task.status === 'processing') {
        state.activeTasks.push(task);
      }
    },
    updateTask: (state, action: PayloadAction<Partial<DownloadTask | ProcessingTask> & { id: string }>) => {
      const index = state.allTasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.allTasks[index] = { ...state.allTasks[index], ...action.payload };
      }
    }
  },
  extraReducers: (builder) => {
    // Load tasks
    builder.addCase(loadTasks.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loadTasks.fulfilled, (state, action) => {
      state.isLoading = false;
      state.allTasks = action.payload;
      state.activeTasks = action.payload.filter(t =>
        t.status === 'downloading' || t.status === 'processing' || t.status === 'paused'
      );
      state.queuedTasks = action.payload.filter(t => t.status === 'queued');
      state.completedTasks = action.payload.filter(t => t.status === 'completed');
      state.failedTasks = action.payload.filter(t => t.status === 'failed');
    });
    builder.addCase(loadTasks.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to load tasks';
    });

    // Retry task
    builder.addCase(retryTask.fulfilled, (state, action) => {
      const taskId = action.payload;
      const task = state.allTasks.find(t => t.id === taskId);
      if (task) {
        task.status = task.type === 'download' ? 'downloading' : 'processing';
        task.progress = 0;
        task.lastError = undefined;

        // Re-categorize
        state.failedTasks = state.failedTasks.filter(t => t.id !== taskId);
        state.activeTasks.push(task);
      }
    });

    // Remove task
    builder.addCase(removeTask.fulfilled, (state, action) => {
      const taskId = action.payload;
      state.allTasks = state.allTasks.filter(t => t.id !== taskId);
      state.activeTasks = state.activeTasks.filter(t => t.id !== taskId);
      state.queuedTasks = state.queuedTasks.filter(t => t.id !== taskId);
      state.completedTasks = state.completedTasks.filter(t => t.id !== taskId);
      state.failedTasks = state.failedTasks.filter(t => t.id !== taskId);
      delete state.taskProgress[taskId];
    });

    // Clear completed
    builder.addCase(clearCompletedTasks.fulfilled, (state) => {
      const completedIds = state.completedTasks.map(t => t.id);
      state.allTasks = state.allTasks.filter(t => !completedIds.includes(t.id));
      state.completedTasks = [];
      completedIds.forEach(id => delete state.taskProgress[id]);
    });
  }
});

export const {
  setTasks,
  updateTaskStatus,
  updateTaskProgress,
  selectTask,
  addTask,
  updateTask
} = taskSlice.actions;

export default taskSlice.reducer;