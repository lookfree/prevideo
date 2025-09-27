const fs = require('fs');
const path = require('path');
const https = require('https');

class SubtitleTranslator {
  constructor() {
    this.apiKey = 'sk-a09327e7aa804834a31861a1eb9ac3d3';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  // 解析 SRT 字幕文件
  parseSRT(content) {
    const subtitles = [];
    const blocks = content.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0]);
        const time = lines[1];
        const text = lines.slice(2).join('\n');

        subtitles.push({
          index,
          time,
          text
        });
      }
    }

    return subtitles;
  }

  // 生成 SRT 格式
  generateSRT(subtitles) {
    return subtitles.map(sub =>
      `${sub.index}\n${sub.time}\n${sub.text}`
    ).join('\n\n') + '\n';
  }

  // 批量翻译文本
  async translateBatch(texts) {
    const prompt = `请将以下英文字幕翻译成中文，保持原有的格式和换行，只返回翻译后的文本，不要添加任何额外说明：

${texts.map((text, i) => `[${i}] ${text}`).join('\n')}`;

    const requestData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的字幕翻译助手，擅长将英文字幕翻译成通俗易懂的中文。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.choices && response.choices[0]) {
              const translatedText = response.choices[0].message.content;
              // 解析翻译结果
              const translations = {};
              const lines = translatedText.split('\n');
              for (const line of lines) {
                const match = line.match(/\[(\d+)\]\s*(.*)/);
                if (match) {
                  translations[parseInt(match[1])] = match[2];
                }
              }
              resolve(translations);
            } else {
              reject(new Error('Invalid API response'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestData);
      req.end();
    });
  }

  // 翻译 SRT 文件
  async translateSRTFile(inputPath, outputPath) {
    try {
      console.log('读取字幕文件:', inputPath);
      const content = fs.readFileSync(inputPath, 'utf8');
      const subtitles = this.parseSRT(content);

      console.log(`解析到 ${subtitles.length} 条字幕`);

      // 批量翻译（每批50条）
      const batchSize = 50;
      const translatedSubtitles = [];

      for (let i = 0; i < subtitles.length; i += batchSize) {
        const batch = subtitles.slice(i, Math.min(i + batchSize, subtitles.length));
        const texts = batch.map(sub => sub.text);

        console.log(`翻译第 ${i + 1}-${Math.min(i + batchSize, subtitles.length)} 条字幕...`);

        try {
          const translations = await this.translateBatch(texts);

          // 更新字幕文本
          batch.forEach((sub, index) => {
            translatedSubtitles.push({
              ...sub,
              text: translations[index] || sub.text
            });
          });

          // 避免 API 限流
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('翻译批次失败:', error.message);
          // 如果翻译失败，保留原文
          translatedSubtitles.push(...batch);
        }
      }

      // 生成翻译后的 SRT
      const translatedSRT = this.generateSRT(translatedSubtitles);
      fs.writeFileSync(outputPath, translatedSRT, 'utf8');

      console.log('字幕翻译完成:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('翻译字幕失败:', error);
      throw error;
    }
  }

  // 生成双语字幕（带进度回调）
  async createBilingualSRT(englishPath, outputPath, progressCallback) {
    try {
      const content = fs.readFileSync(englishPath, 'utf8');
      const subtitles = this.parseSRT(content);

      console.log(`生成双语字幕，共 ${subtitles.length} 条`);

      const batchSize = 50;  // 增加到每批50条，加快翻译速度
      const bilingualSubtitles = [];

      for (let i = 0; i < subtitles.length; i += batchSize) {
        const batch = subtitles.slice(i, Math.min(i + batchSize, subtitles.length));
        const texts = batch.map(sub => sub.text);

        const currentEnd = Math.min(i + batchSize, subtitles.length);
        console.log(`翻译第 ${i + 1}-${currentEnd} 条...`);

        // 发送进度
        if (progressCallback) {
          progressCallback(currentEnd, subtitles.length);
        }

        try {
          const translations = await this.translateBatch(texts);

          batch.forEach((sub, index) => {
            const chineseText = translations[index] || sub.text;
            bilingualSubtitles.push({
              ...sub,
              text: `${chineseText}\n${sub.text}` // 中文在上，英文在下
            });
          });

          await new Promise(resolve => setTimeout(resolve, 500));  // 减少延迟到500ms
        } catch (error) {
          console.error('翻译批次失败:', error.message);
          bilingualSubtitles.push(...batch);
        }
      }

      const bilingualSRT = this.generateSRT(bilingualSubtitles);
      fs.writeFileSync(outputPath, bilingualSRT, 'utf8');

      console.log('双语字幕生成完成:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('生成双语字幕失败:', error);
      throw error;
    }
  }
}

module.exports = SubtitleTranslator;