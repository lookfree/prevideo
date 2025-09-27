const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ImprovedVideoDownloader {
  constructor() {
    this.downloads = new Map();
    this.subtitleTasks = new Map();
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

  // 下载视频 - 改进版
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

    // 使用简单的格式选择，确保获取完整视频
    if (options.quality === '1080p') {
      args.push('-f', 'best[height<=1080]');
    } else if (options.quality === '720p') {
      args.push('-f', 'best[height<=720]');
    } else if (options.quality === '480p') {
      args.push('-f', 'best[height<=480]');
    } else {
      // 默认下载最佳质量
      args.push('-f', 'best');
    }

    // 字幕作为单独文件下载
    if (options.subtitle) {
      args.push('--write-subs');
      args.push('--write-auto-subs');
      args.push('--sub-langs', 'zh,en');
      // 不嵌入，保持独立
    }

    // 不需要重新编码，保持原始质量
    // 只有在必要时才合并

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

  // 生成字幕 - 独立任务
  async generateSubtitle(videoPath, options = {}) {
    const subtitleTaskId = 'subtitle_' + Date.now();

    // 模拟Whisper字幕生成
    // 在实际实现中，这里会调用Whisper API
    const subtitlePath = videoPath.replace('.mp4', '.srt');

    const subtitleTask = {
      id: subtitleTaskId,
      videoPath,
      subtitlePath,
      status: 'generating',
      progress: 0,
      startTime: Date.now()
    };

    this.subtitleTasks.set(subtitleTaskId, subtitleTask);

    // 返回字幕任务ID，可以独立追踪进度
    return {
      taskId: subtitleTaskId,
      subtitlePath
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

  // 获取字幕任务进度
  getSubtitleProgress(taskId) {
    const task = this.subtitleTasks.get(taskId);
    return task ? task.progress : 0;
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

  // 取消字幕生成
  cancelSubtitle(taskId) {
    const task = this.subtitleTasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      this.subtitleTasks.delete(taskId);
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

  // 获取所有字幕任务
  getAllSubtitleTasks() {
    return Array.from(this.subtitleTasks.entries()).map(([id, info]) => ({
      id,
      videoPath: info.videoPath,
      subtitlePath: info.subtitlePath,
      status: info.status,
      progress: info.progress,
      startTime: info.startTime
    }));
  }
}

module.exports = ImprovedVideoDownloader;