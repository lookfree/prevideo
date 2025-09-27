const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class SimpleVideoDownloader {
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
              url: url
            });
          } catch (e) {
            console.error('解析视频信息失败:', e.message);
            console.error('原始输出:', output);
            reject(new Error('Failed to parse video info: ' + e.message));
          }
        } else {
          console.error('yt-dlp 错误输出:', error);
          reject(new Error('Failed to get video info: ' + (error || 'Unknown error')));
        }
      });
    });
  }

  // 简化的下载方法 - 确保音视频正常
  async downloadVideo(url, outputPath, options = {}) {
    const taskId = 'download_' + Date.now();

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 使用最简单的参数，让yt-dlp自动处理
    const args = [
      url,
      '-o', outputPath,
      '--no-playlist',
      '--force-overwrites'  // 如果文件存在则覆盖
    ];

    // 质量选择 - 使用最简单的格式
    if (options.quality === '1080p') {
      args.push('-f', 'best[height<=1080][ext=mp4]/best[height<=1080]/best');
    } else if (options.quality === '720p') {
      args.push('-f', 'best[height<=720][ext=mp4]/best[height<=720]/best');
    } else if (options.quality === '480p') {
      args.push('-f', 'best[height<=480][ext=mp4]/best[height<=480]/best');
    } else {
      // 默认选择最佳质量
      args.push('-f', 'best[ext=mp4]/best');
    }

    // 字幕选项 - 先下载字幕文件，后续翻译并嵌入
    if (options.subtitle) {
      args.push('--write-auto-subs');      // 下载自动生成的字幕
      args.push('--sub-langs', 'en');      // 下载英文字幕
      args.push('--convert-subs', 'srt');  // 转换为SRT格式
      // 暂不嵌入，等翻译后再嵌入
    }

    // 显示进度
    args.push('--progress');
    args.push('--newline');

    console.log('执行命令: yt-dlp', args.join(' '));

    const process = spawn('yt-dlp', args);

    // 保存进程引用
    this.downloads.set(taskId, {
      process,
      url,
      outputPath,
      startTime: Date.now(),
      status: 'downloading'
    });

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
}

module.exports = SimpleVideoDownloader;