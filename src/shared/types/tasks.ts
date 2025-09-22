/**
 * Task-related type definitions
 */

import { VideoInfo } from './video';
import { Subtitle } from './subtitle';
import { CompressionConfig } from './compression';

export type TaskStatus = 
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadTask {
  id: string;
  videoInfo: VideoInfo;
  status: TaskStatus;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // seconds
  outputPath: string;
  startTime: Date;
  endTime?: Date;
  resumable?: boolean;
  chunkSize?: number;
  partialFilePath?: string;
  checksum?: string;
  lastCheckpoint?: Date;
  pauseReason?: string;
  lastError?: string;
  resumePosition?: number;
  resumeTime?: Date;
  failureHistory?: FailureRecord[];
  metadata?: TaskMetadata;
  outputFiles?: string[];
  subtitles?: Subtitle[];
}

export interface ProcessingTask {
  id: string;
  type: 'SUBTITLE_GENERATION' | 'SUBTITLE_EMBEDDING' | 'VIDEO_COMPRESSION' | 'FORMAT_CONVERSION';
  status: TaskStatus;
  progress: number;
  inputFile: string;
  outputFile: string;
  config?: CompressionConfig | any;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface FailureRecord {
  timestamp: Date;
  progress: number;
  reason: string;
  errorCode?: string;
}

export interface TaskMetadata {
  videoTitle: string;
  videoAuthor: string;
  videoDuration: number;
  videoQuality: string;
  selectedFormat: string;
  subtitleLanguages?: string[];
  downloadStartTime: Date;
  userPreferences?: {
    outputPath: string;
    autoGenerateSubtitles: boolean;
    embedSubtitles: boolean;
    compressVideo?: boolean;
    compressionSettings?: CompressionConfig;
  };
}

export interface DownloadOptions {
  quality?: string;
  outputPath: string;
  filename?: string;
  subtitleLanguages?: string[];
  preferredFormat?: string;
  enableResume?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  chunkSize?: number;
  parallelChunks?: number;
}

export interface DownloadProgress {
  taskId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  status: TaskStatus;
}

export interface TaskQueue {
  id: string;
  name: string;
  tasks: (DownloadTask | ProcessingTask)[];
  maxConcurrent: number;
  currentlyProcessing: number;
  autoStart: boolean;
  priority: 'high' | 'normal' | 'low';
  createdAt: Date;
  updatedAt: Date;
}