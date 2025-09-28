const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Storage {
  constructor() {
    // 使用应用的用户数据目录存储设置
    this.userDataPath = app.getPath('userData');
    this.settingsPath = path.join(this.userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  // 加载设置
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }

    // 返回默认设置
    return {
      downloadPath: app.getPath('downloads'),
      bilingualSubtitle: true,
      autoGenerateSubtitle: true,
      videoCompression: false,
      quality: '1080p',
      primaryLanguage: 'zh-CN',
      secondaryLanguage: 'en',
      deepseekApiKey: '' // DeepSeek API Key
    };
  }

  // 保存设置
  saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  }

  // 获取设置
  getSettings() {
    return this.settings;
  }

  // 获取单个设置项
  get(key) {
    return this.settings[key];
  }

  // 设置单个设置项
  set(key, value) {
    this.settings[key] = value;
    return this.saveSettings(this.settings);
  }

  // 获取DeepSeek API Key
  getDeepSeekApiKey() {
    return this.settings.deepseekApiKey || '';
  }

  // 设置DeepSeek API Key
  setDeepSeekApiKey(apiKey) {
    return this.set('deepseekApiKey', apiKey);
  }
}

// 单例模式
let storageInstance = null;

module.exports = {
  getStorage: () => {
    if (!storageInstance) {
      storageInstance = new Storage();
    }
    return storageInstance;
  }
};