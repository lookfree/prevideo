/**
 * Video-related type definitions
 */

export interface VideoFormat {
  formatId: string;
  quality: string;
  ext: string;
  fps: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  width?: number;
  height?: number;
  tbr?: number; // Total bitrate
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  duration: number; // seconds
  thumbnail: string;
  author: string;
  description?: string;
  uploadDate?: Date;
  viewCount?: number;
  likeCount?: number;
  availableFormats: VideoFormat[];
  availableSubtitles: string[]; // Language codes
  isLive?: boolean;
  isPrivate?: boolean;
  ageRestricted?: boolean;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioCodec: string;
  fileSize: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
  creationTime?: Date;
}

export type VideoQuality = '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p' | 'best' | 'worst';

export type VideoContainer = 'mp4' | 'webm' | 'mkv' | 'mov' | 'avi' | 'flv';

export interface VideoProcessingOptions {
  quality?: VideoQuality;
  format?: VideoContainer;
  audioOnly?: boolean;
  noAudio?: boolean;
  mergeOutputFormat?: string;
}