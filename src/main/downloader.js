const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class VideoDownloader {
  constructor() {
    this.downloads = new Map();
  }

  // 获取视频信息
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        url
      ]);

      let output = '';
      let error = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        error += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve({
              id: info.id,
              title: info.title || 'Unknown',
              author: info.uploader || 'Unknown',
              duration: info.duration || 0,
              thumbnail: info.thumbnail,
              description: info.description || '',
              viewCount: info.view_count || 0,
              likeCount: info.like_count || 0,
              uploadDate: info.upload_date,
              url: url,
              availableFormats: this.parseFormats(info.formats),
              availableSubtitles: Object.keys(info.subtitles || {})
            });
          } catch (e) {
            reject(new Error('Failed to parse video info: ' + e.message));
          }
        } else {
          reject(new Error('Failed to get video info: ' + error));
        }
      });
    });
  }

  // 解析格式信息
  parseFormats(formats) {
    if (!formats) return [];

    return formats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
      .map(f => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        fps: f.fps,
        filesize: f.filesize || f.filesize_approx,
        quality: f.format_note || f.quality,
        vcodec: f.vcodec,
        acodec: f.acodec
      }))
      .slice(0, 10);
  }

  // 下载视频
  async downloadVideo(url, outputPath, options = {}) {
    const taskId = 'download_' + Date.now();

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 构建yt-dlp命令参数
    const args = [
      url,
      '-o', outputPath,
      '--no-playlist',
      '--progress',
      '--newline'
    ];

    // 添加质量选项
    if (options.quality) {
      if (options.quality === 'best') {
        args.push('-f', 'best');
      } else if (options.quality === '1080p') {
        args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]');
      } else if (options.quality === '720p') {
        args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]');
      } else if (options.quality === '480p') {
        args.push('-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]');
      }
    }

    // 如果需要字幕
    if (options.subtitle) {
      args.push('--write-sub', '--write-auto-sub', '--sub-lang', 'zh,en');
    }

    // 如果需要合并后处理
    if (options.merge) {
      args.push('--merge-output-format', 'mp4');
    }

    const process = spawn('yt-dlp', args);

    // 保存进程引用
    this.downloads.set(taskId, {
      process,
      url,
      outputPath,
      startTime: Date.now(),
      status: 'downloading'
    });

    // 返回任务信息和进程
    return {
      taskId,
      process,
      outputPath
    };
  }

  // 解析进度信息
  parseProgress(data) {
    const progressMatch = data.match(/\[download\]\s+(\d+\.?\d*)%/);
    const speedMatch = data.match(/at\s+([\d.]+\w+\/s)/);
    const etaMatch = data.match(/ETA\s+([\d:]+)/);

    if (progressMatch) {
      return {
        percent: parseFloat(progressMatch[1]),
        speed: speedMatch ? speedMatch[1] : null,
        eta: etaMatch ? etaMatch[1] : null
      };
    }

    return null;
  }

  // 取消下载
  cancelDownload(taskId) {
    const download = this.downloads.get(taskId);
    if (download && download.process) {
      download.process.kill('SIGTERM');
      this.downloads.delete(taskId);
      return true;
    }
    return false;
  }

  // 获取所有下载任务
  getAllDownloads() {
    return Array.from(this.downloads.entries()).map(([id, info]) => ({
      id,
      url: info.url,
      outputPath: info.outputPath,
      status: info.status,
      startTime: info.startTime
    }));
  }
}

module.exports = VideoDownloader;