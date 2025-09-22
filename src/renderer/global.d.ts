declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      video: {
        fetchInfo: (url: string) => Promise<any>;
        startDownload: (options: any) => Promise<any>;
        pauseDownload: (taskId: string) => Promise<void>;
        resumeDownload: (taskId: string) => Promise<void>;
        cancelDownload: (taskId: string) => Promise<void>;
        getProgress: (taskId: string) => Promise<any>;
        onProgress: (callback: (data: any) => void) => void;
      };
      subtitle: {
        generateAuto: (videoPath: string) => Promise<any>;
        translate: (subtitlePath: string, targetLang: string) => Promise<any>;
        mergeBilingual: (primary: string, secondary: string) => Promise<any>;
        onProgress: (callback: (data: any) => void) => void;
      };
      storage: {
        getSettings: () => Promise<any>;
        updateSettings: (settings: any) => Promise<any>;
        getTasks: () => Promise<any[]>;
        getTask: (taskId: string) => Promise<any>;
        deleteTask: (taskId: string) => Promise<void>;
        clearCompleted: () => Promise<void>;
      };
    };
    prevideo?: any;
  }
}

export {};