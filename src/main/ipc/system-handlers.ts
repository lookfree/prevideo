/**
 * System-related IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent, app, shell, clipboard, nativeImage, dialog, powerSaveBlocker } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemHandlers {
  private powerSaveBlockerId: number | null = null;

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Open external URL
    ipcMain.handle('system:open-url', async (
      event: IpcMainInvokeEvent,
      url: string
    ) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to open URL:', error);
        return { success: false, error: error.message };
      }
    });

    // Open file or folder in system
    ipcMain.handle('system:open-path', async (
      event: IpcMainInvokeEvent,
      filePath: string
    ) => {
      try {
        if (!fs.existsSync(filePath)) {
          throw new Error('Path does not exist');
        }

        await shell.openPath(filePath);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to open path:', error);
        return { success: false, error: error.message };
      }
    });

    // Show file in folder
    ipcMain.handle('system:show-in-folder', async (
      event: IpcMainInvokeEvent,
      filePath: string
    ) => {
      try {
        if (!fs.existsSync(filePath)) {
          throw new Error('File does not exist');
        }

        shell.showItemInFolder(filePath);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to show in folder:', error);
        return { success: false, error: error.message };
      }
    });

    // Move file to trash
    ipcMain.handle('system:trash', async (
      event: IpcMainInvokeEvent,
      filePath: string
    ) => {
      try {
        await shell.trashItem(filePath);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to move to trash:', error);
        return { success: false, error: error.message };
      }
    });

    // Copy to clipboard
    ipcMain.handle('system:clipboard:write', async (
      event: IpcMainInvokeEvent,
      data: { text?: string; image?: string }
    ) => {
      try {
        if (data.text) {
          clipboard.writeText(data.text);
        } else if (data.image) {
          const image = nativeImage.createFromPath(data.image);
          clipboard.writeImage(image);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to write to clipboard:', error);
        return { success: false, error: error.message };
      }
    });

    // Read from clipboard
    ipcMain.handle('system:clipboard:read', async (event: IpcMainInvokeEvent) => {
      try {
        const text = clipboard.readText();
        const image = clipboard.readImage();

        return {
          success: true,
          data: {
            text,
            hasImage: !image.isEmpty()
          }
        };
      } catch (error: any) {
        console.error('Failed to read clipboard:', error);
        return { success: false, error: error.message };
      }
    });

    // Get system information
    ipcMain.handle('system:info', async (event: IpcMainInvokeEvent) => {
      try {
        const info = {
          platform: process.platform,
          arch: process.arch,
          version: os.release(),
          hostname: os.hostname(),
          cpus: os.cpus(),
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          uptime: os.uptime(),
          userInfo: os.userInfo(),
          networkInterfaces: os.networkInterfaces(),
          homeDir: os.homedir(),
          tmpDir: os.tmpdir()
        };

        return { success: true, data: info };
      } catch (error: any) {
        console.error('Failed to get system info:', error);
        return { success: false, error: error.message };
      }
    });

    // Get disk usage
    ipcMain.handle('system:disk-usage', async (
      event: IpcMainInvokeEvent,
      diskPath?: string
    ) => {
      try {
        const targetPath = diskPath || app.getPath('home');

        if (process.platform === 'win32') {
          const { stdout } = await execAsync(`wmic logicaldisk get size,freespace,caption`);
          const lines = stdout.trim().split('\n').slice(1);
          const disks = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              drive: parts[0],
              free: parseInt(parts[1] || '0'),
              total: parseInt(parts[2] || '0')
            };
          });

          return { success: true, data: disks };
        } else {
          const { stdout } = await execAsync(`df -k "${targetPath}"`);
          const lines = stdout.trim().split('\n').slice(1);
          const parts = lines[0].split(/\s+/);

          return {
            success: true,
            data: {
              filesystem: parts[0],
              total: parseInt(parts[1]) * 1024,
              used: parseInt(parts[2]) * 1024,
              available: parseInt(parts[3]) * 1024,
              mountPoint: parts[5] || parts[4]
            }
          };
        }
      } catch (error: any) {
        console.error('Failed to get disk usage:', error);
        return { success: false, error: error.message };
      }
    });

    // Check network status
    ipcMain.handle('system:network:check', async (event: IpcMainInvokeEvent) => {
      try {
        const interfaces = os.networkInterfaces();
        const isOnline = Object.values(interfaces).some(iface =>
          iface?.some(addr => !addr.internal && addr.family === 'IPv4')
        );

        // Try to ping a reliable server
        let canReachInternet = false;
        if (isOnline) {
          try {
            const { stdout } = await execAsync(
              process.platform === 'win32'
                ? 'ping -n 1 8.8.8.8'
                : 'ping -c 1 8.8.8.8'
            );
            canReachInternet = !stdout.includes('unreachable') && !stdout.includes('100% packet loss');
          } catch {
            canReachInternet = false;
          }
        }

        return {
          success: true,
          data: {
            isOnline,
            canReachInternet,
            interfaces: Object.entries(interfaces).map(([name, addrs]) => ({
              name,
              addresses: addrs
            }))
          }
        };
      } catch (error: any) {
        console.error('Failed to check network:', error);
        return { success: false, error: error.message };
      }
    });

    // Prevent system sleep
    ipcMain.handle('system:prevent-sleep', async (
      event: IpcMainInvokeEvent,
      prevent: boolean
    ) => {
      try {
        if (prevent && this.powerSaveBlockerId === null) {
          this.powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
        } else if (!prevent && this.powerSaveBlockerId !== null) {
          powerSaveBlocker.stop(this.powerSaveBlockerId);
          this.powerSaveBlockerId = null;
        }

        return { success: true, data: { preventing: prevent } };
      } catch (error: any) {
        console.error('Failed to prevent sleep:', error);
        return { success: false, error: error.message };
      }
    });

    // Get app paths
    ipcMain.handle('system:paths', async (event: IpcMainInvokeEvent) => {
      try {
        const paths = {
          home: app.getPath('home'),
          appData: app.getPath('appData'),
          userData: app.getPath('userData'),
          temp: app.getPath('temp'),
          desktop: app.getPath('desktop'),
          documents: app.getPath('documents'),
          downloads: app.getPath('downloads'),
          music: app.getPath('music'),
          pictures: app.getPath('pictures'),
          videos: app.getPath('videos'),
          logs: app.getPath('logs'),
          exe: app.getPath('exe')
        };

        return { success: true, data: paths };
      } catch (error: any) {
        console.error('Failed to get paths:', error);
        return { success: false, error: error.message };
      }
    });

    // Create desktop shortcut
    ipcMain.handle('system:create-shortcut', async (event: IpcMainInvokeEvent) => {
      try {
        if (process.platform === 'win32') {
          const shortcutPath = path.join(app.getPath('desktop'), 'PreVideo.lnk');
          const targetPath = app.getPath('exe');

          shell.writeShortcutLink(shortcutPath, 'create', {
            target: targetPath,
            cwd: path.dirname(targetPath),
            description: 'PreVideo - YouTube视频下载器'
          });

          return { success: true, data: shortcutPath };
        } else if (process.platform === 'darwin') {
          // macOS alias
          const { stdout } = await execAsync(
            `osascript -e 'tell application "Finder" to make alias file to POSIX file "${app.getPath('exe')}" at desktop'`
          );

          return { success: true, data: stdout };
        } else {
          // Linux desktop file
          const desktopFile = `[Desktop Entry]
Name=PreVideo
Comment=YouTube Video Downloader
Exec=${app.getPath('exe')}
Icon=${path.join(app.getAppPath(), 'assets/icon.png')}
Terminal=false
Type=Application
Categories=AudioVideo;`;

          const desktopPath = path.join(app.getPath('desktop'), 'prevideo.desktop');
          fs.writeFileSync(desktopPath, desktopFile);
          fs.chmodSync(desktopPath, '755');

          return { success: true, data: desktopPath };
        }
      } catch (error: any) {
        console.error('Failed to create shortcut:', error);
        return { success: false, error: error.message };
      }
    });

    // Check if running as admin
    ipcMain.handle('system:is-admin', async (event: IpcMainInvokeEvent) => {
      try {
        let isAdmin = false;

        if (process.platform === 'win32') {
          try {
            await execAsync('net session');
            isAdmin = true;
          } catch {
            isAdmin = false;
          }
        } else {
          isAdmin = process.getuid ? process.getuid() === 0 : false;
        }

        return { success: true, data: isAdmin };
      } catch (error: any) {
        console.error('Failed to check admin status:', error);
        return { success: false, error: error.message };
      }
    });

    // Restart app
    ipcMain.handle('system:restart', async (event: IpcMainInvokeEvent) => {
      try {
        app.relaunch();
        app.exit(0);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to restart app:', error);
        return { success: false, error: error.message };
      }
    });

    // Get installed dependencies
    ipcMain.handle('system:dependencies:check', async (event: IpcMainInvokeEvent) => {
      try {
        const dependencies = {
          ffmpeg: false,
          ytdlp: false,
          whisper: false
        };

        // Check ffmpeg
        try {
          const { stdout } = await execAsync('ffmpeg -version');
          dependencies.ffmpeg = stdout.includes('ffmpeg version');
        } catch {
          dependencies.ffmpeg = false;
        }

        // Check yt-dlp
        try {
          const { stdout } = await execAsync('yt-dlp --version');
          dependencies.ytdlp = !!stdout;
        } catch {
          dependencies.ytdlp = false;
        }

        // Check whisper
        try {
          const { stdout } = await execAsync('whisper --help');
          dependencies.whisper = stdout.includes('whisper');
        } catch {
          dependencies.whisper = false;
        }

        return { success: true, data: dependencies };
      } catch (error: any) {
        console.error('Failed to check dependencies:', error);
        return { success: false, error: error.message };
      }
    });

    // Install missing dependency
    ipcMain.handle('system:dependency:install', async (
      event: IpcMainInvokeEvent,
      dependency: string
    ) => {
      try {
        const installCommands: { [key: string]: { [key: string]: string } } = {
          ffmpeg: {
            darwin: 'brew install ffmpeg',
            win32: 'winget install ffmpeg',
            linux: 'sudo apt-get install ffmpeg'
          },
          ytdlp: {
            darwin: 'brew install yt-dlp',
            win32: 'pip install yt-dlp',
            linux: 'pip install yt-dlp'
          },
          whisper: {
            darwin: 'brew install whisper-cpp',
            win32: 'pip install openai-whisper',
            linux: 'pip install openai-whisper'
          }
        };

        const command = installCommands[dependency]?.[process.platform];
        if (!command) {
          throw new Error(`No install command for ${dependency} on ${process.platform}`);
        }

        // Show installation dialog
        const result = await dialog.showMessageBox({
          type: 'info',
          title: '安装依赖',
          message: `需要安装 ${dependency}。将执行以下命令：\n\n${command}\n\n是否继续？`,
          buttons: ['取消', '安装'],
          defaultId: 1
        });

        if (result.response === 1) {
          const { stdout, stderr } = await execAsync(command);
          return { success: true, data: { stdout, stderr } };
        }

        return { success: false, error: 'Installation cancelled' };
      } catch (error: any) {
        console.error('Failed to install dependency:', error);
        return { success: false, error: error.message };
      }
    });

    // Show notification
    ipcMain.handle('system:notification', async (
      event: IpcMainInvokeEvent,
      options: {
        title: string;
        body: string;
        icon?: string;
        sound?: boolean;
      }
    ) => {
      try {
        const { Notification } = require('electron');

        if (Notification.isSupported()) {
          const notification = new Notification({
            title: options.title,
            body: options.body,
            icon: options.icon || path.join(app.getAppPath(), 'assets/icon.png'),
            silent: !options.sound
          });

          notification.show();

          return { success: true };
        }

        return { success: false, error: 'Notifications not supported' };
      } catch (error: any) {
        console.error('Failed to show notification:', error);
        return { success: false, error: error.message };
      }
    });

    // Set badge count (macOS/Linux)
    ipcMain.handle('system:badge:set', async (
      event: IpcMainInvokeEvent,
      count: number
    ) => {
      try {
        if (process.platform === 'darwin' || process.platform === 'linux') {
          app.setBadgeCount(count);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Failed to set badge:', error);
        return { success: false, error: error.message };
      }
    });

    // Get file info
    ipcMain.handle('system:file:info', async (
      event: IpcMainInvokeEvent,
      filePath: string
    ) => {
      try {
        const stats = fs.statSync(filePath);
        const fileInfo = {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          permissions: stats.mode
        };

        return { success: true, data: fileInfo };
      } catch (error: any) {
        console.error('Failed to get file info:', error);
        return { success: false, error: error.message };
      }
    });
  }

  destroy(): void {
    // Stop preventing sleep if active
    if (this.powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(this.powerSaveBlockerId);
      this.powerSaveBlockerId = null;
    }
  }
}