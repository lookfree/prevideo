/**
 * User preferences and settings types
 */

import { VideoQuality, VideoContainer } from './video';
import { CompressionPreset } from './compression';

export interface UserPreferences {
  // Download settings
  defaultOutputPath: string;
  defaultQuality: VideoQuality;
  defaultFormat: VideoContainer;
  autoStartDownload: boolean;
  maxConcurrentDownloads: number;
  enableNotifications: boolean;
  
  // Subtitle settings
  autoGenerateSubtitles: boolean;
  defaultSubtitleLanguages: string[];
  embedSubtitles: boolean;
  subtitleLayout: 'stacked' | 'side_by_side';
  subtitleStyling?: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    fontFamily: string;
  };
  
  // Compression settings
  autoCompress: boolean;
  compressionPreset: CompressionPreset;
  targetFileSize?: number; // MB
  preserveQuality: boolean;
  
  // UI settings
  theme: 'light' | 'dark' | 'system';
  language: string; // ISO 639-1 code
  showAdvancedOptions: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  
  // Network settings
  proxyEnabled: boolean;
  proxyUrl?: string;
  bandwidthLimit?: number; // KB/s
  retryAttempts: number;
  connectionTimeout: number; // seconds
  
  // Storage settings
  autoCleanup: boolean;
  cleanupAge: number; // days
  maxCacheSize: number; // MB
  keepHistory: boolean;
  historyDuration: number; // days
  
  // Advanced settings
  ffmpegPath?: string;
  ytdlpPath?: string;
  whisperModelPath?: string;
  hardwareAcceleration: boolean;
  debugMode: boolean;
}

export interface AppSettings {
  version: string;
  firstRun: boolean;
  lastUpdateCheck: Date;
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta' | 'dev';
  telemetryEnabled: boolean;
  crashReporting: boolean;
  windowState?: {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
  };
}

export interface StorageStats {
  totalVideos: number;
  totalDownloads: number;
  totalCompressions?: number;
  totalSpaceSaved?: number;
  cacheSize: number;
  oldestEntry: Date;
  newestEntry: Date;
}

export interface PreferencesState {
  userPreferences: UserPreferences;
  appSettings: AppSettings;
  storageStats: StorageStats;
  lastSaved: Date;
  isDirty: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultOutputPath: '',
  defaultQuality: '720p',
  defaultFormat: 'mp4',
  autoStartDownload: false,
  maxConcurrentDownloads: 2,
  enableNotifications: true,
  autoGenerateSubtitles: false,
  defaultSubtitleLanguages: ['zh-CN', 'en'],
  embedSubtitles: false,
  subtitleLayout: 'stacked',
  autoCompress: false,
  compressionPreset: 'medium',
  preserveQuality: true,
  theme: 'system',
  language: 'zh-CN',
  showAdvancedOptions: false,
  minimizeToTray: true,
  startMinimized: false,
  proxyEnabled: false,
  retryAttempts: 3,
  connectionTimeout: 30,
  autoCleanup: false,
  cleanupAge: 30,
  maxCacheSize: 1000,
  keepHistory: true,
  historyDuration: 90,
  hardwareAcceleration: false,
  debugMode: false
};