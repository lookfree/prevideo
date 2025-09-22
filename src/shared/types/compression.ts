/**
 * Video compression configuration types
 */

export type CompressionPreset = 
  | 'ultrafast'
  | 'superfast'
  | 'veryfast'
  | 'faster'
  | 'fast'
  | 'medium'
  | 'slow'
  | 'slower'
  | 'veryslow';

export type VideoResolution = 
  | '4K'
  | '2K'
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | '240p'
  | 'original';

export interface CompressionConfig {
  id: string;
  outputFormat: 'mp4' | 'webm' | 'mkv' | 'mov' | 'avi';
  resolution: VideoResolution;
  videoBitrate?: number; // kbps
  audioBitrate?: number; // kbps
  videoCodec?: string;
  audioCodec?: string;
  preset?: CompressionPreset;
  crf?: number; // Constant Rate Factor (0-51, lower = better quality)
  twoPass?: boolean;
  hardwareAcceleration?: boolean;
  targetFileSize?: number; // bytes
  maxFileSize?: number; // bytes
  fps?: number;
  startTime?: number; // seconds
  endTime?: number; // seconds
  removeAudio?: boolean;
  normalizeAudio?: boolean;
}

export interface CompressionTask {
  id: string;
  type: 'VIDEO_COMPRESSION' | 'FORMAT_CONVERSION' | 'AUDIO_EXTRACTION';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  estimatedTime?: number; // seconds
  elapsedTime?: number; // seconds
  inputFile: string;
  outputFile: string;
  config?: CompressionConfig;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CompressionResult {
  success: boolean;
  outputFile?: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage
  timeTaken: number; // seconds
  error?: string;
}

export interface StreamingOptimization {
  platform: 'YouTube' | 'Twitch' | 'TikTok' | 'Instagram' | 'Twitter' | 'Facebook';
  recommendedSettings: {
    resolution: VideoResolution;
    videoBitrate: number;
    audioBitrate: number;
    fps: number;
    codec: string;
    format: string;
  };
}