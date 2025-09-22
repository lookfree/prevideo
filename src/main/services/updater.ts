/**
 * UpdateService - Handles application auto-updates
 */

import { app, autoUpdater, dialog } from 'electron';
import { EventEmitter } from 'events';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageService } from './storage';

interface UpdateInfo {
  version: string;
  releaseDate: Date;
  releaseNotes: string;
  downloadUrl: string;
  fileSize: number;
  sha256: string;
  mandatory: boolean;
}

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export class UpdateService extends EventEmitter {
  private storageService: StorageService;
  private updateServerUrl: string;
  private autoDownload: boolean;
  private allowPrerelease: boolean;
  private updateCheckInterval: number; // milliseconds
  private checkTimer: NodeJS.Timeout | null = null;
  private currentVersion: string;
  private platform: string;
  private arch: string;

  constructor(storageService: StorageService, updateServerUrl?: string) {
    super();
    this.storageService = storageService;
    this.updateServerUrl = updateServerUrl || 'https://api.github.com/repos/yourusername/prevideo/releases';
    this.autoDownload = true;
    this.allowPrerelease = false;
    this.updateCheckInterval = 4 * 60 * 60 * 1000; // 4 hours
    this.currentVersion = app.getVersion();
    this.platform = process.platform;
    this.arch = process.arch;

    this.initializeAutoUpdater();
  }

  private initializeAutoUpdater(): void {
    if (process.platform === 'darwin' || process.platform === 'win32') {
      // Use built-in autoUpdater for macOS and Windows
      if (this.updateServerUrl) {
        const feedUrl = this.getFeedUrl();
        autoUpdater.setFeedURL({ url: feedUrl });
      }

      autoUpdater.on('error', (error) => {
        this.emit('error', error);
        console.error('Auto-updater error:', error);
      });

      autoUpdater.on('checking-for-update', () => {
        this.emit('checking-for-update');
      });

      autoUpdater.on('update-available', () => {
        this.emit('update-available');
      });

      autoUpdater.on('update-not-available', () => {
        this.emit('update-not-available');
      });

      autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        this.emit('update-downloaded', { releaseNotes, releaseName });
      });

      autoUpdater.on('before-quit-for-update', () => {
        this.emit('before-quit-for-update');
      });
    }
  }

  private getFeedUrl(): string {
    // Construct feed URL based on platform
    const baseUrl = this.updateServerUrl.replace('/releases', '/releases/latest/download');

    if (this.platform === 'darwin') {
      return `${baseUrl}/latest-mac.yml`;
    } else if (this.platform === 'win32') {
      return `${baseUrl}/latest.yml`;
    } else {
      return this.updateServerUrl;
    }
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      this.emit('checking-for-update');

      const settings = await this.storageService.getAppSettings();
      const updateChannel = settings.updateChannel || 'stable';

      // For GitHub releases
      const latestRelease = await this.fetchLatestRelease(updateChannel);

      if (!latestRelease) {
        this.emit('update-not-available');
        return null;
      }

      const updateInfo = this.parseReleaseInfo(latestRelease);

      if (this.isNewerVersion(updateInfo.version)) {
        this.emit('update-available', updateInfo);

        // Save last update check time
        await this.storageService.updateAppSettings({
          lastUpdateCheck: new Date()
        });

        if (this.autoDownload) {
          await this.downloadUpdate(updateInfo);
        }

        return updateInfo;
      } else {
        this.emit('update-not-available');
        return null;
      }
    } catch (error) {
      this.emit('error', error);
      console.error('Failed to check for updates:', error);
      return null;
    }
  }

  private async fetchLatestRelease(channel: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = this.updateServerUrl + (channel === 'beta' ? '?prerelease=true' : '/latest');

      https.get(url, {
        headers: {
          'User-Agent': `PreVideo/${this.currentVersion}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const releases = JSON.parse(data);

            // If fetching all releases, filter based on channel
            if (Array.isArray(releases)) {
              const filtered = releases.filter(r => {
                if (channel === 'stable') {
                  return !r.prerelease && !r.draft;
                } else if (channel === 'beta') {
                  return r.prerelease && !r.draft;
                } else {
                  return !r.draft;
                }
              });

              resolve(filtered[0] || null);
            } else {
              resolve(releases);
            }
          } catch (error) {
            reject(new Error(`Failed to parse release data: ${error}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to fetch release: ${error}`));
      });
    });
  }

  private parseReleaseInfo(release: any): UpdateInfo {
    // Find appropriate asset for current platform
    const assetName = this.getAssetNameForPlatform();
    const asset = release.assets?.find((a: any) =>
      a.name.toLowerCase().includes(assetName)
    );

    return {
      version: release.tag_name.replace('v', ''),
      releaseDate: new Date(release.published_at),
      releaseNotes: release.body || '',
      downloadUrl: asset?.browser_download_url || '',
      fileSize: asset?.size || 0,
      sha256: '', // Would need to fetch from separate checksum file
      mandatory: release.name?.includes('[MANDATORY]') || false
    };
  }

  private getAssetNameForPlatform(): string {
    const platformMap: { [key: string]: string } = {
      'darwin-x64': 'mac',
      'darwin-arm64': 'mac-arm64',
      'win32-x64': 'win',
      'win32-ia32': 'win-ia32',
      'linux-x64': 'linux'
    };

    return platformMap[`${this.platform}-${this.arch}`] || this.platform;
  }

  private isNewerVersion(version: string): boolean {
    const current = this.parseVersion(this.currentVersion);
    const latest = this.parseVersion(version);

    if (latest.major > current.major) return true;
    if (latest.major < current.major) return false;

    if (latest.minor > current.minor) return true;
    if (latest.minor < current.minor) return false;

    return latest.patch > current.patch;
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.replace('v', '').split('.');
    return {
      major: parseInt(parts[0]) || 0,
      minor: parseInt(parts[1]) || 0,
      patch: parseInt(parts[2]) || 0
    };
  }

  async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
    if (!updateInfo.downloadUrl) {
      throw new Error('No download URL available');
    }

    this.emit('download-progress', { percent: 0, transferred: 0, total: updateInfo.fileSize });

    return new Promise((resolve, reject) => {
      const tempPath = path.join(app.getPath('temp'), `prevideo-update-${updateInfo.version}.tmp`);
      const file = fs.createWriteStream(tempPath);
      let downloadedBytes = 0;
      const startTime = Date.now();

      https.get(updateInfo.downloadUrl, (response) => {
        const totalBytes = parseInt(response.headers['content-length'] || '0');

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          file.write(chunk);

          const progress: UpdateProgress = {
            bytesPerSecond: downloadedBytes / ((Date.now() - startTime) / 1000),
            percent: (downloadedBytes / totalBytes) * 100,
            transferred: downloadedBytes,
            total: totalBytes
          };

          this.emit('download-progress', progress);
        });

        response.on('end', () => {
          file.end();

          // Verify checksum if available
          if (updateInfo.sha256) {
            const fileBuffer = fs.readFileSync(tempPath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const hex = hashSum.digest('hex');

            if (hex !== updateInfo.sha256) {
              fs.unlinkSync(tempPath);
              reject(new Error('Checksum verification failed'));
              return;
            }
          }

          // Move to final location
          const finalPath = path.join(app.getPath('userData'), 'updates', `prevideo-${updateInfo.version}.exe`);
          const updateDir = path.dirname(finalPath);

          if (!fs.existsSync(updateDir)) {
            fs.mkdirSync(updateDir, { recursive: true });
          }

          fs.renameSync(tempPath, finalPath);

          this.emit('update-downloaded', updateInfo);
          resolve();
        });
      }).on('error', (error) => {
        file.close();
        fs.unlinkSync(tempPath);
        reject(new Error(`Failed to download update: ${error}`));
      });
    });
  }

  async installUpdate(updateInfo: UpdateInfo): Promise<void> {
    if (process.platform === 'darwin' || process.platform === 'win32') {
      // Use built-in autoUpdater
      autoUpdater.quitAndInstall();
    } else {
      // Manual installation for Linux
      const updatePath = path.join(app.getPath('userData'), 'updates', `prevideo-${updateInfo.version}.AppImage`);

      if (!fs.existsSync(updatePath)) {
        throw new Error('Update file not found');
      }

      // Make executable on Linux
      if (process.platform === 'linux') {
        fs.chmodSync(updatePath, '755');
      }

      // Show dialog to user
      const choice = dialog.showMessageBoxSync({
        type: 'info',
        title: '更新已下载',
        message: `版本 ${updateInfo.version} 已下载完成。是否现在安装？`,
        buttons: ['立即安装', '稍后安装'],
        defaultId: 0
      });

      if (choice === 0) {
        // Launch installer and quit app
        const { spawn } = require('child_process');
        spawn(updatePath, [], {
          detached: true,
          stdio: 'ignore'
        }).unref();

        app.quit();
      }
    }
  }

  startAutoUpdateCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    // Initial check
    this.checkForUpdates();

    // Set up periodic checks
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckInterval);
  }

  stopAutoUpdateCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  async setUpdateSettings(settings: {
    autoDownload?: boolean;
    allowPrerelease?: boolean;
    updateChannel?: 'stable' | 'beta' | 'dev';
  }): Promise<void> {
    if (settings.autoDownload !== undefined) {
      this.autoDownload = settings.autoDownload;
    }

    if (settings.allowPrerelease !== undefined) {
      this.allowPrerelease = settings.allowPrerelease;
    }

    if (settings.updateChannel) {
      await this.storageService.updateAppSettings({
        updateChannel: settings.updateChannel
      });
    }
  }

  async getUpdateHistory(): Promise<any[]> {
    // Fetch update history from storage or API
    try {
      const response = await this.fetchReleases(10);
      return response.map((release: any) => ({
        version: release.tag_name,
        date: release.published_at,
        notes: release.body,
        prerelease: release.prerelease
      }));
    } catch (error) {
      console.error('Failed to fetch update history:', error);
      return [];
    }
  }

  private async fetchReleases(limit: number = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const url = `${this.updateServerUrl}?per_page=${limit}`;

      https.get(url, {
        headers: {
          'User-Agent': `PreVideo/${this.currentVersion}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const releases = JSON.parse(data);
            resolve(Array.isArray(releases) ? releases : []);
          } catch (error) {
            reject(new Error(`Failed to parse releases: ${error}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to fetch releases: ${error}`));
      });
    });
  }

  // Check if running in development
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  }

  // Get update feed URL for testing
  getUpdateFeedUrl(): string {
    return this.updateServerUrl;
  }

  // Set custom update server (for enterprise deployments)
  setUpdateServer(url: string): void {
    this.updateServerUrl = url;
    if (process.platform === 'darwin' || process.platform === 'win32') {
      autoUpdater.setFeedURL({ url: this.getFeedUrl() });
    }
  }
}