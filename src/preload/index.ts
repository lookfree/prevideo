/**
 * Preload script - Exposes safe APIs to renderer process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { VideoInfo } from '../shared/types/video';
import { DownloadTask, DownloadOptions, DownloadProgress } from '../shared/types/tasks';
import {
  Subtitle,
  SubtitleInfo,
  SubtitleGenerationOptions,
  EmbedSubtitleOptions,
  BilingualSubtitleConfig
} from '../shared/types/subtitle';
import { CompressionConfig, CompressionTask } from '../shared/types/compression';
import { UserPreferences, AppSettings, StorageStats } from '../shared/types/preferences';

// API exposed to renderer
const prevideoAPI = {
  // Video API
  video: {
    fetchInfo: (url: string) =>
      ipcRenderer.invoke('video:info:fetch', url),

    startDownload: (url: string, options: DownloadOptions) =>
      ipcRenderer.invoke('video:download:start', url, options),

    pauseDownload: (taskId: string) =>
      ipcRenderer.invoke('video:download:pause', taskId),

    resumeDownload: (taskId: string) =>
      ipcRenderer.invoke('video:download:resume', taskId),

    cancelDownload: (taskId: string) =>
      ipcRenderer.invoke('video:download:cancel', taskId),

    getProgress: (taskId: string) =>
      ipcRenderer.invoke('video:download:progress', taskId),

    listTasks: () =>
      ipcRenderer.invoke('video:tasks:list'),

    getHistory: (limit?: number, offset?: number) =>
      ipcRenderer.invoke('video:history:get', limit, offset),

    clearHistory: () =>
      ipcRenderer.invoke('video:history:clear'),

    batchDownload: (urls: string[], options: DownloadOptions) =>
      ipcRenderer.invoke('video:download:batch', urls, options),

    validateUrl: (url: string) =>
      ipcRenderer.invoke('video:url:validate', url),

    getSupportedSites: () =>
      ipcRenderer.invoke('video:sites:supported'),

    // Event listeners
    onProgress: (callback: (data: { taskId: string; task: DownloadTask }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('video:download:progress:update', listener);
      return () => ipcRenderer.removeListener('video:download:progress:update', listener);
    },

    onComplete: (callback: (data: { taskId: string; task: DownloadTask }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('video:download:complete', listener);
      return () => ipcRenderer.removeListener('video:download:complete', listener);
    },

    onError: (callback: (data: { taskId: string; error: string }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('video:download:error', listener);
      return () => ipcRenderer.removeListener('video:download:error', listener);
    }
  },

  // Subtitle API
  subtitle: {
    list: (videoUrl: string) =>
      ipcRenderer.invoke('subtitle:list', videoUrl),

    download: (videoUrl: string, language: string, format?: 'srt' | 'vtt' | 'ass') =>
      ipcRenderer.invoke('subtitle:download', videoUrl, language, format),

    generate: (videoPath: string, options: SubtitleGenerationOptions) =>
      ipcRenderer.invoke('subtitle:generate', videoPath, options),

    embed: (videoPath: string, options: EmbedSubtitleOptions) =>
      ipcRenderer.invoke('subtitle:embed', videoPath, options),

    createBilingual: (videoPath: string, config: BilingualSubtitleConfig) =>
      ipcRenderer.invoke('subtitle:bilingual:create', videoPath, config),

    convert: (subtitle: Subtitle, targetFormat: 'srt' | 'vtt' | 'ass') =>
      ipcRenderer.invoke('subtitle:convert', subtitle, targetFormat),

    save: (subtitle: Subtitle, filePath: string) =>
      ipcRenderer.invoke('subtitle:save', subtitle, filePath),

    load: (filePath: string) =>
      ipcRenderer.invoke('subtitle:load', filePath),

    sync: (subtitle: Subtitle, offsetMs: number) =>
      ipcRenderer.invoke('subtitle:sync', subtitle, offsetMs),

    translate: (videoPath: string, sourceLanguage: string, targetLanguage: string) =>
      ipcRenderer.invoke('subtitle:translate', videoPath, sourceLanguage, targetLanguage),

    extract: (videoPath: string, streamIndex?: number) =>
      ipcRenderer.invoke('subtitle:extract', videoPath, streamIndex),

    preview: (subtitle: Subtitle, startTime: number, endTime: number) =>
      ipcRenderer.invoke('subtitle:preview', subtitle, startTime, endTime),

    listModels: () =>
      ipcRenderer.invoke('subtitle:models:list'),

    downloadModel: (modelName: string) =>
      ipcRenderer.invoke('subtitle:model:download', modelName),

    // Event listeners
    onGenerationProgress: (callback: (data: { taskId: string; task: any }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('subtitle:generation:progress', listener);
      return () => ipcRenderer.removeListener('subtitle:generation:progress', listener);
    },

    onEmbedProgress: (callback: (data: { taskId: string; task: any }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('subtitle:embed:progress', listener);
      return () => ipcRenderer.removeListener('subtitle:embed:progress', listener);
    }
  },

  // Compression API
  compression: {
    start: (inputPath: string, config: CompressionConfig) =>
      ipcRenderer.invoke('compress:start', inputPath, config),

    cancel: (taskId: string) =>
      ipcRenderer.invoke('compress:cancel', taskId),

    convert: (inputPath: string, outputFormat: string) =>
      ipcRenderer.invoke('compress:convert', inputPath, outputFormat),

    extractAudio: (inputPath: string, format: 'mp3' | 'aac' | 'wav') =>
      ipcRenderer.invoke('compress:extract-audio', inputPath, format),

    getMetadata: (videoPath: string) =>
      ipcRenderer.invoke('compress:metadata', videoPath),

    estimate: (videoPath: string, config: CompressionConfig) =>
      ipcRenderer.invoke('compress:estimate', videoPath, config),

    batch: (files: Array<{ inputPath: string; config: CompressionConfig }>) =>
      ipcRenderer.invoke('compress:batch', files),

    recommend: (videoPath: string, targetSize: number) =>
      ipcRenderer.invoke('compress:recommend', videoPath, targetSize),

    platformOptimize: (platform: string) =>
      ipcRenderer.invoke('compress:platform-optimize', platform),

    createGif: (videoPath: string, options: any) =>
      ipcRenderer.invoke('compress:create-gif', videoPath, options),

    createThumbnail: (videoPath: string, timestamp?: number) =>
      ipcRenderer.invoke('compress:create-thumbnail', videoPath, timestamp),

    trim: (videoPath: string, startTime: number, endTime: number) =>
      ipcRenderer.invoke('compress:trim', videoPath, startTime, endTime),

    listPresets: () =>
      ipcRenderer.invoke('compress:presets:list'),

    // Event listeners
    onProgress: (callback: (data: { taskId: string; task: CompressionTask }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('compress:progress', listener);
      return () => ipcRenderer.removeListener('compress:progress', listener);
    },

    onComplete: (callback: (data: { taskId: string; task: CompressionTask }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('compress:complete', listener);
      return () => ipcRenderer.removeListener('compress:complete', listener);
    },

    onError: (callback: (data: { taskId: string; error: string }) => void) => {
      const listener = (event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('compress:error', listener);
      return () => ipcRenderer.removeListener('compress:error', listener);
    }
  },

  // Settings API
  settings: {
    getPreferences: () =>
      ipcRenderer.invoke('settings:preferences:get'),

    savePreferences: (preferences: Partial<UserPreferences>) =>
      ipcRenderer.invoke('settings:preferences:save', preferences),

    resetPreferences: () =>
      ipcRenderer.invoke('settings:preferences:reset'),

    selectDirectory: () =>
      ipcRenderer.invoke('settings:select-directory'),

    getAppSettings: () =>
      ipcRenderer.invoke('settings:app:get'),

    updateAppSettings: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke('settings:app:update', settings),

    getStorageStats: () =>
      ipcRenderer.invoke('settings:storage:stats'),

    clearCache: () =>
      ipcRenderer.invoke('settings:storage:clear-cache'),

    clearAllData: () =>
      ipcRenderer.invoke('settings:storage:clear-all'),

    exportData: () =>
      ipcRenderer.invoke('settings:data:export'),

    importData: () =>
      ipcRenderer.invoke('settings:data:import'),

    setProxy: (proxyUrl: string | null) =>
      ipcRenderer.invoke('settings:proxy:set', proxyUrl),

    getSystemInfo: () =>
      ipcRenderer.invoke('settings:system:info'),

    openLogs: () =>
      ipcRenderer.invoke('settings:logs:open'),

    checkForUpdates: () =>
      ipcRenderer.invoke('settings:update:check'),

    installUpdate: (updateInfo: any) =>
      ipcRenderer.invoke('settings:update:install', updateInfo),

    getUpdateHistory: () =>
      ipcRenderer.invoke('settings:update:history'),

    setFfmpegPath: (path?: string) =>
      ipcRenderer.invoke('settings:ffmpeg:path', path),

    setWhisperModelPath: (path?: string) =>
      ipcRenderer.invoke('settings:whisper:model-path', path),

    resetWindow: () =>
      ipcRenderer.invoke('settings:window:reset'),

    // Event listeners
    onThemeChanged: (callback: (theme: string) => void) => {
      const listener = (event: IpcRendererEvent, theme: string) => callback(theme);
      ipcRenderer.on('theme-changed', listener);
      return () => ipcRenderer.removeListener('theme-changed', listener);
    },

    onLanguageChanged: (callback: (language: string) => void) => {
      const listener = (event: IpcRendererEvent, language: string) => callback(language);
      ipcRenderer.on('language-changed', listener);
      return () => ipcRenderer.removeListener('language-changed', listener);
    }
  },

  // System API
  system: {
    openUrl: (url: string) =>
      ipcRenderer.invoke('system:open-url', url),

    openPath: (path: string) =>
      ipcRenderer.invoke('system:open-path', path),

    showInFolder: (path: string) =>
      ipcRenderer.invoke('system:show-in-folder', path),

    trash: (path: string) =>
      ipcRenderer.invoke('system:trash', path),

    copyToClipboard: (data: { text?: string; image?: string }) =>
      ipcRenderer.invoke('system:clipboard:write', data),

    readClipboard: () =>
      ipcRenderer.invoke('system:clipboard:read'),

    getInfo: () =>
      ipcRenderer.invoke('system:info'),

    getDiskUsage: (path?: string) =>
      ipcRenderer.invoke('system:disk-usage', path),

    checkNetwork: () =>
      ipcRenderer.invoke('system:network:check'),

    preventSleep: (prevent: boolean) =>
      ipcRenderer.invoke('system:prevent-sleep', prevent),

    getPaths: () =>
      ipcRenderer.invoke('system:paths'),

    createShortcut: () =>
      ipcRenderer.invoke('system:create-shortcut'),

    isAdmin: () =>
      ipcRenderer.invoke('system:is-admin'),

    restart: () =>
      ipcRenderer.invoke('system:restart'),

    checkDependencies: () =>
      ipcRenderer.invoke('system:dependencies:check'),

    installDependency: (dependency: string) =>
      ipcRenderer.invoke('system:dependency:install', dependency),

    showNotification: (options: { title: string; body: string; icon?: string; sound?: boolean }) =>
      ipcRenderer.invoke('system:notification', options),

    setBadge: (count: number) =>
      ipcRenderer.invoke('system:badge:set', count),

    getFileInfo: (path: string) =>
      ipcRenderer.invoke('system:file:info', path),

    // Event listeners
    onUpdateDownloaded: (callback: (updateInfo: any) => void) => {
      const listener = (event: IpcRendererEvent, updateInfo: any) => callback(updateInfo);
      ipcRenderer.on('update-downloaded', listener);
      return () => ipcRenderer.removeListener('update-downloaded', listener);
    },

    onOpenPreferences: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('open-preferences', listener);
      return () => ipcRenderer.removeListener('open-preferences', listener);
    },

    onOpenAbout: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('open-about', listener);
      return () => ipcRenderer.removeListener('open-about', listener);
    }
  }
};

// Expose API to renderer
contextBridge.exposeInMainWorld('prevideo', prevideoAPI);

// Type definitions for TypeScript
export type PreVideoAPI = typeof prevideoAPI;

declare global {
  interface Window {
    prevideo: PreVideoAPI;
  }
}