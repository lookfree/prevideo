/**
 * IPC Channel Contracts for Electron Main-Renderer Communication
 * 定义主进程和渲染进程之间的通信契约
 */

// ============= Channel Names =============
export const IPC_CHANNELS = {
  // Video Operations
  VIDEO_INFO_FETCH: 'video:info:fetch',
  VIDEO_DOWNLOAD_START: 'video:download:start',
  VIDEO_DOWNLOAD_PAUSE: 'video:download:pause',
  VIDEO_DOWNLOAD_RESUME: 'video:download:resume',
  VIDEO_DOWNLOAD_CANCEL: 'video:download:cancel',
  VIDEO_DOWNLOAD_PROGRESS: 'video:download:progress',
  VIDEO_DOWNLOAD_COMPLETE: 'video:download:complete',
  VIDEO_DOWNLOAD_ERROR: 'video:download:error',

  // Subtitle Operations
  SUBTITLE_LIST: 'subtitle:list',
  SUBTITLE_DOWNLOAD: 'subtitle:download',
  SUBTITLE_GENERATE: 'subtitle:generate',
  SUBTITLE_EMBED: 'subtitle:embed',
  SUBTITLE_PROGRESS: 'subtitle:progress',

  // Compression Operations
  COMPRESS_START: 'compress:start',
  COMPRESS_CANCEL: 'compress:cancel',
  COMPRESS_PROGRESS: 'compress:progress',
  COMPRESS_COMPLETE: 'compress:complete',

  // File Operations
  FILE_SELECT_OUTPUT: 'file:select:output',
  FILE_OPEN_FOLDER: 'file:open:folder',
  FILE_DELETE: 'file:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',

  // System
  SYSTEM_INFO: 'system:info',
  SYSTEM_CHECK_UPDATE: 'system:check:update',
  SYSTEM_INSTALL_UPDATE: 'system:install:update'
} as const;

// ============= Request/Response Types =============

// Video Info Fetch
export interface VideoInfoFetchRequest {
  url: string;
}

export interface VideoInfoFetchResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    author: string;
    formats: VideoFormat[];
    subtitles: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

// Video Download
export interface VideoDownloadStartRequest {
  url: string;
  quality: string;
  outputPath: string;
  subtitleLanguages?: string[];
}

export interface VideoDownloadProgressEvent {
  taskId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

// Subtitle Generation
export interface SubtitleGenerateRequest {
  videoPath: string;
  language: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
}

export interface SubtitleGenerateResponse {
  success: boolean;
  subtitlePath?: string;
  language?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Compression
export interface CompressionStartRequest {
  inputPath: string;
  outputPath: string;
  config: {
    format: 'mp4' | 'webm' | 'mkv';
    resolution: '2160p' | '1080p' | '720p' | '480p' | '360p' | 'original';
    videoBitrate?: number;
    audioBitrate?: number;
    preset?: string;
    crf?: number;
  };
  subtitles?: {
    primary: string;
    secondary?: string;
    config: BilingualSubtitleConfig;
  };
}

export interface CompressionProgressEvent {
  taskId: string;
  progress: number;
  currentTime: number;
  totalTime: number;
  speed: string;
  estimatedSize: number;
}

// Settings
export interface SettingsGetResponse {
  defaultOutputPath: string;
  defaultQuality: string;
  defaultFormat: string;
  autoGenerateSubtitles: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  [key: string]: any;
}

export interface SettingsUpdateRequest {
  [key: string]: any;
}

// System Info
export interface SystemInfoResponse {
  platform: 'win32' | 'darwin' | 'linux';
  version: string;
  diskSpace: {
    free: number;
    total: number;
  };
  memory: {
    used: number;
    total: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
}

// ============= Helper Types =============

interface VideoFormat {
  formatId: string;
  quality: string;
  ext: string;
  fileSize?: number;
  fps?: number;
}

interface BilingualSubtitleConfig {
  primaryLanguage: string;
  secondaryLanguage: string;
  layout: 'stacked' | 'side_by_side';
  primaryFontSize: number;
  secondaryFontSize: number;
}

// ============= Type Guards =============

export function isVideoInfoFetchRequest(data: any): data is VideoInfoFetchRequest {
  return typeof data?.url === 'string';
}

export function isVideoDownloadStartRequest(data: any): data is VideoDownloadStartRequest {
  return (
    typeof data?.url === 'string' &&
    typeof data?.quality === 'string' &&
    typeof data?.outputPath === 'string'
  );
}

export function isCompressionStartRequest(data: any): data is CompressionStartRequest {
  return (
    typeof data?.inputPath === 'string' &&
    typeof data?.outputPath === 'string' &&
    typeof data?.config === 'object'
  );
}

// ============= Contract Tests (TDD) =============

/**
 * These tests should be written BEFORE implementation
 * They define the expected behavior of IPC communication
 */
export const IPC_CONTRACT_TESTS = {
  'video:info:fetch': {
    validRequest: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    invalidRequest: { url: '' },
    expectedResponse: {
      success: true,
      data: {
        id: expect.any(String),
        title: expect.any(String),
        duration: expect.any(Number),
        thumbnail: expect.any(String),
        author: expect.any(String),
        formats: expect.arrayContaining([
          expect.objectContaining({
            formatId: expect.any(String),
            quality: expect.any(String),
            ext: expect.any(String)
          })
        ]),
        subtitles: expect.any(Array)
      }
    }
  },

  'video:download:start': {
    validRequest: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      quality: '720p',
      outputPath: '/path/to/output',
      subtitleLanguages: ['en', 'zh-CN']
    },
    expectedEvents: [
      'video:download:progress',
      'video:download:complete'
    ]
  },

  'subtitle:generate': {
    validRequest: {
      videoPath: '/path/to/video.mp4',
      language: 'en',
      model: 'base'
    },
    expectedResponse: {
      success: true,
      subtitlePath: expect.stringMatching(/\.srt$/),
      language: 'en'
    }
  },

  'compress:start': {
    validRequest: {
      inputPath: '/path/to/input.mp4',
      outputPath: '/path/to/output.mp4',
      config: {
        format: 'mp4',
        resolution: '720p',
        crf: 23,
        preset: 'medium'
      }
    },
    expectedEvents: [
      'compress:progress',
      'compress:complete'
    ]
  }
};