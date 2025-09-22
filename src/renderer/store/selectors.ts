/**
 * Redux selectors for accessing state
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './index';
import { DownloadTask, ProcessingTask } from '../../shared/types/tasks';

// Download selectors
export const selectVideoInfo = (state: RootState) => state.download.videoInfo;
export const selectIsLoadingInfo = (state: RootState) => state.download.isLoadingInfo;
export const selectInfoError = (state: RootState) => state.download.infoError;
export const selectActiveDownloads = (state: RootState) => state.download.activeDownloads;
export const selectQueuedDownloads = (state: RootState) => state.download.queuedDownloads;
export const selectCompletedDownloads = (state: RootState) => state.download.completedDownloads;

export const selectDownloadProgress = createSelector(
  [(state: RootState) => state.download.downloadProgress],
  (progress) => progress
);

export const selectDownloadSpeed = createSelector(
  [(state: RootState) => state.download.downloadSpeed],
  (speed) => speed
);

export const selectTotalActiveDownloads = createSelector(
  [selectActiveDownloads, selectQueuedDownloads],
  (active, queued) => active.length + queued.length
);

// Task selectors
export const selectAllTasks = (state: RootState) => state.task.allTasks;
export const selectActiveTasks = (state: RootState) => state.task.activeTasks;
export const selectQueuedTasks = (state: RootState) => state.task.queuedTasks;
export const selectCompletedTasks = (state: RootState) => state.task.completedTasks;
export const selectFailedTasks = (state: RootState) => state.task.failedTasks;
export const selectTasksLoading = (state: RootState) => state.task.isLoading;
export const selectTasksError = (state: RootState) => state.task.error;
export const selectSelectedTaskId = (state: RootState) => state.task.selectedTaskId;

export const selectSelectedTask = createSelector(
  [selectAllTasks, selectSelectedTaskId],
  (tasks, selectedId) => selectedId ? tasks.find(t => t.id === selectedId) : null
);

export const selectDownloadTasks = createSelector(
  [selectAllTasks],
  (tasks) => tasks.filter(t => t.type === 'download') as DownloadTask[]
);

export const selectProcessingTasks = createSelector(
  [selectAllTasks],
  (tasks) => tasks.filter(t => t.type === 'processing') as ProcessingTask[]
);

export const selectTaskStatistics = createSelector(
  [selectAllTasks],
  (tasks) => ({
    total: tasks.length,
    active: tasks.filter(t => t.status === 'downloading' || t.status === 'processing').length,
    queued: tasks.filter(t => t.status === 'queued').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    paused: tasks.filter(t => t.status === 'paused').length
  })
);

// UI selectors
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectSettingsOpen = (state: RootState) => state.ui.settingsOpen;
export const selectActiveTab = (state: RootState) => state.ui.activeTab;
export const selectActiveView = (state: RootState) => state.ui.activeView;
export const selectNotifications = (state: RootState) => state.ui.notifications;
export const selectDialogs = (state: RootState) => state.ui.dialogs;
export const selectUILoading = (state: RootState) => state.ui.loading;
export const selectUIErrors = (state: RootState) => state.ui.errors;
export const selectDragOver = (state: RootState) => state.ui.dragOver;
export const selectFullscreen = (state: RootState) => state.ui.fullscreen;
export const selectCompactMode = (state: RootState) => state.ui.compactMode;
export const selectSelectedFiles = (state: RootState) => state.ui.selectedFiles;
export const selectContextMenu = (state: RootState) => state.ui.contextMenu;

export const selectIsAnyLoading = createSelector(
  [selectUILoading],
  (loading) => Object.keys(loading).length > 0
);

export const selectHasErrors = createSelector(
  [selectUIErrors],
  (errors) => Object.keys(errors).some(key => errors[key] !== null)
);

// Preferences selectors
export const selectPreferences = (state: RootState) => state.preferences.preferences;
export const selectPreferencesLoading = (state: RootState) => state.preferences.isLoading;
export const selectPreferencesSaving = (state: RootState) => state.preferences.isSaving;
export const selectPreferencesHasChanges = (state: RootState) => state.preferences.hasChanges;
export const selectPreferencesError = (state: RootState) => state.preferences.error;

export const selectDefaultOutputPath = createSelector(
  [selectPreferences],
  (preferences) => preferences.defaultOutputPath
);

export const selectDefaultQuality = createSelector(
  [selectPreferences],
  (preferences) => preferences.defaultQuality
);

export const selectDefaultFormat = createSelector(
  [selectPreferences],
  (preferences) => preferences.defaultFormat
);

export const selectMaxConcurrentDownloads = createSelector(
  [selectPreferences],
  (preferences) => preferences.maxConcurrentDownloads
);

export const selectSubtitleConfig = createSelector(
  [selectPreferences],
  (preferences) => preferences.subtitleConfig
);

export const selectCompressionConfig = createSelector(
  [selectPreferences],
  (preferences) => preferences.compressionConfig
);

// Combined selectors
export const selectCanStartNewDownload = createSelector(
  [selectActiveTasks, selectMaxConcurrentDownloads],
  (activeTasks, maxConcurrent) => {
    const runningCount = activeTasks.filter(t =>
      t.status === 'downloading' || t.status === 'processing'
    ).length;
    return runningCount < maxConcurrent;
  }
);

export const selectNextQueuedTask = createSelector(
  [selectQueuedTasks],
  (queuedTasks) => queuedTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || null
);

export const selectRecentCompletedTasks = createSelector(
  [selectCompletedTasks],
  (completedTasks) => completedTasks
    .sort((a, b) => (b.endTime || b.updatedAt || 0) - (a.endTime || a.updatedAt || 0))
    .slice(0, 5)
);