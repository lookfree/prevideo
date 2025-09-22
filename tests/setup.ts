/**
 * Jest test setup file
 * Configure test environment and global mocks
 */

// Mock Electron APIs
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    send: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  },
  app: {
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'PreVideo Downloader'),
    isPackaged: false,
    quit: jest.fn(),
    relaunch: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
    showErrorBox: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    webContents: {
      send: jest.fn(),
      openDevTools: jest.fn()
    }
  }))
}));

// Mock child_process for external binary calls
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execFile: jest.fn(),
  fork: jest.fn()
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.APP_PORT = '3001';

// Global test utilities
global.createMockVideoInfo = () => ({
  id: 'test-video-id',
  url: 'https://www.youtube.com/watch?v=test',
  title: 'Test Video',
  duration: 300,
  thumbnail: 'https://example.com/thumbnail.jpg',
  author: 'Test Channel',
  availableFormats: [
    { formatId: '22', quality: '720p', ext: 'mp4', fps: 30 },
    { formatId: '18', quality: '360p', ext: 'mp4', fps: 30 }
  ],
  availableSubtitles: ['en', 'zh-CN']
});

global.createMockDownloadTask = () => ({
  id: 'task-001',
  videoInfo: global.createMockVideoInfo(),
  status: 'pending',
  progress: 0,
  downloadedBytes: 0,
  totalBytes: 1000000,
  speed: 0,
  eta: 0,
  outputPath: '/downloads/test-video.mp4',
  startTime: new Date()
});

// Extend Jest matchers
expect.extend({
  toBeValidIpcResponse(received) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'success' in received &&
      typeof received.success === 'boolean';

    return {
      pass,
      message: () => pass
        ? `expected ${JSON.stringify(received)} not to be a valid IPC response`
        : `expected ${JSON.stringify(received)} to be a valid IPC response with 'success' property`
    };
  }
});

// TypeScript declaration for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidIpcResponse(): R;
    }
  }

  var createMockVideoInfo: () => any;
  var createMockDownloadTask: () => any;
}