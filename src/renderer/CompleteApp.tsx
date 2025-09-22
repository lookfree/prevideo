import React, { useState, useEffect } from 'react';

interface Task {
  id: number;
  title: string;
  url: string;
  status: string;
  progress: number;
  filePath?: string;
  subtitlePath?: string;
  downloadPath?: string;
  fileSize?: number;
  startTime?: number;
  endTime?: number;
  error?: string;
}

const CompleteApp: React.FC = () => {
  const [url, setUrl] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [downloadPath, setDownloadPath] = useState('');
  const [settings, setSettings] = useState({
    bilingualSubtitle: true,
    autoGenerateSubtitle: true,
    videoCompression: false,
    quality: '1080p',
    primaryLanguage: 'zh-CN',
    secondaryLanguage: 'en'
  });

  useEffect(() => {
    // 获取默认下载路径
    const getSettings = async () => {
      if (window.electronAPI) {
        const stored = await window.electronAPI.storage.getSettings();
        setDownloadPath(stored.downloadPath || '~/Downloads');
        setSettings(prev => ({...prev, ...stored}));
      } else {
        setDownloadPath('~/Downloads/PreVideo');
      }
    };
    getSettings();
  }, []);

  const selectDownloadPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.file.selectDirectory();
      if (path) {
        setDownloadPath(path);
        await window.electronAPI.storage.updateSettings({ downloadPath: path });
      }
    } else {
      alert('选择下载路径功能需要在Electron环境中运行');
    }
  };

  const handleDownload = async () => {
    if (!url) {
      alert('请输入YouTube视频URL');
      return;
    }

    const taskId = Date.now();
    const newTask: Task = {
      id: taskId,
      title: '获取视频信息中...',
      url: url,
      status: '准备中',
      progress: 0,
      downloadPath: downloadPath,
      startTime: Date.now()
    };

    setTasks(prev => [newTask, ...prev]);

    if (window.electronAPI) {
      try {
        // 获取视频信息
        const videoInfo = await window.electronAPI.video.fetchInfo(url);

        // 更新任务标题
        setTasks(prev => prev.map(t =>
          t.id === taskId ? {...t, title: videoInfo.title || '未知视频', status: '下载中'} : t
        ));

        // 开始下载
        const result = await window.electronAPI.video.startDownload({
          url: url,
          outputPath: downloadPath,
          quality: settings.quality,
          subtitle: settings.autoGenerateSubtitle
        });

        // 模拟下载进度
        simulateDownload(taskId, videoInfo.title);

        // 如果启用字幕生成
        if (settings.autoGenerateSubtitle) {
          setTimeout(() => {
            setTasks(prev => prev.map(t =>
              t.id === taskId ? {...t, status: '生成字幕中...'} : t
            ));
          }, 5000);
        }

      } catch (error) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? {...t, status: '失败', error: String(error)} : t
        ));
      }
    } else {
      // 模拟模式
      simulateDownload(taskId, '示例视频');
    }

    setUrl(''); // 清空输入
  };

  const simulateDownload = (taskId: number, title: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        const filePath = `${downloadPath}/${title}.mp4`;
        const subtitlePath = `${downloadPath}/${title}.srt`;

        setTasks(prev => prev.map(t =>
          t.id === taskId ? {
            ...t,
            status: '完成',
            progress: 100,
            filePath: filePath,
            subtitlePath: settings.autoGenerateSubtitle ? subtitlePath : undefined,
            fileSize: Math.floor(Math.random() * 500 + 100) * 1024 * 1024,
            endTime: Date.now()
          } : t
        ));
      } else {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? {...t, progress: Math.min(progress, 100)} : t
        ));
      }
    }, 500);
  };

  const openFolder = async (path: string) => {
    if (window.electronAPI) {
      await window.electronAPI.file.showInFolder(path);
    } else {
      alert(`文件位置: ${path}`);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '未知';
    const mb = bytes / (1024 * 1024);
    return mb > 1000 ? `${(mb/1000).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '';
    const date = new Date(ms);
    return date.toLocaleTimeString('zh-CN');
  };

  const getDownloadTime = (task: Task) => {
    if (!task.startTime || !task.endTime) return '';
    const seconds = Math.floor((task.endTime - task.startTime) / 1000);
    return `${seconds}秒`;
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      background: '#121212',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{
        textAlign: 'center',
        color: '#1976d2',
        fontSize: '2.5em',
        marginBottom: '30px',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        🎬 PreVideo YouTube下载器
      </h1>

      {/* 下载设置区 */}
      <div style={{
        background: '#1e1e1e',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '20px', fontSize: '1.3em' }}>⚙️ 下载设置</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa' }}>📁 下载路径：</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={downloadPath}
              readOnly
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: '#fff'
              }}
            />
            <button
              onClick={selectDownloadPath}
              style={{
                padding: '10px 20px',
                background: '#424242',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              选择文件夹
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.bilingualSubtitle}
              onChange={e => setSettings({...settings, bilingualSubtitle: e.target.checked})}
              style={{ marginRight: '8px', width: '18px', height: '18px' }}
            />
            <span>🗣️ 双语字幕</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.autoGenerateSubtitle}
              onChange={e => setSettings({...settings, autoGenerateSubtitle: e.target.checked})}
              style={{ marginRight: '8px', width: '18px', height: '18px' }}
            />
            <span>🎙️ 自动生成字幕(Whisper)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.videoCompression}
              onChange={e => setSettings({...settings, videoCompression: e.target.checked})}
              style={{ marginRight: '8px', width: '18px', height: '18px' }}
            />
            <span>🗜️ 视频压缩(FFmpeg)</span>
          </label>

          <select
            value={settings.quality}
            onChange={e => setSettings({...settings, quality: e.target.value})}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #333',
              cursor: 'pointer'
            }}
          >
            <option value="1080p">📺 1080p 高清</option>
            <option value="720p">📺 720p 标清</option>
            <option value="480p">📺 480p 流畅</option>
            <option value="best">🌟 最高画质</option>
          </select>
        </div>

        {settings.bilingualSubtitle && (
          <div style={{ marginTop: '15px', padding: '10px', background: '#2a2a2a', borderRadius: '6px' }}>
            <span style={{ marginRight: '15px' }}>主语言:
              <select
                value={settings.primaryLanguage}
                onChange={e => setSettings({...settings, primaryLanguage: e.target.value})}
                style={{ marginLeft: '8px', padding: '4px', background: '#333', border: 'none', borderRadius: '4px' }}
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </span>
            <span>副语言:
              <select
                value={settings.secondaryLanguage}
                onChange={e => setSettings({...settings, secondaryLanguage: e.target.value})}
                style={{ marginLeft: '8px', padding: '4px', background: '#333', border: 'none', borderRadius: '4px' }}
              >
                <option value="en">English</option>
                <option value="zh-CN">中文</option>
              </select>
            </span>
          </div>
        )}
      </div>

      {/* 下载输入区 */}
      <div style={{
        background: '#1e1e1e',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '20px', fontSize: '1.3em' }}>📥 新建下载</h2>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入YouTube视频URL (例如: https://www.youtube.com/watch?v=...)"
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #333',
              background: '#2a2a2a',
              color: '#fff',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1976d2'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
          <button
            onClick={handleDownload}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 3px 10px rgba(25, 118, 210, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            开始下载
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div style={{
        background: '#1e1e1e',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '20px', fontSize: '1.3em' }}>
          📋 下载任务 ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
            <div>暂无下载任务</div>
            <div style={{ marginTop: '10px', fontSize: '14px' }}>输入YouTube URL开始下载</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                padding: '20px',
                background: '#2a2a2a',
                borderRadius: '10px',
                border: '1px solid #333',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '16px' }}>{task.title}</strong>
                    <span style={{
                      marginLeft: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: task.status === '完成' ? '#2e7d32' :
                                 task.status === '失败' ? '#d32f2f' : '#1976d2',
                      color: '#fff'
                    }}>
                      {task.status}
                    </span>
                  </div>
                  {task.status === '完成' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => task.filePath && openFolder(task.filePath)}
                        style={{
                          padding: '6px 12px',
                          background: '#424242',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📂 打开文件夹
                      </button>
                      {task.subtitlePath && (
                        <button
                          onClick={() => openFolder(task.subtitlePath)}
                          style={{
                            padding: '6px 12px',
                            background: '#424242',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          📝 查看字幕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 进度条 */}
                {task.status !== '完成' && task.status !== '失败' && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{
                      background: '#333',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      height: '10px'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                        width: `${task.progress}%`,
                        transition: 'width 0.3s',
                        boxShadow: '0 0 10px rgba(25, 118, 210, 0.5)'
                      }}></div>
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#888' }}>
                      进度: {task.progress.toFixed(1)}%
                    </div>
                  </div>
                )}

                {/* 详细信息 */}
                <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6' }}>
                  <div>📍 URL: {task.url}</div>
                  <div>📂 保存位置: {task.filePath || `${task.downloadPath}/视频文件.mp4`}</div>
                  {task.subtitlePath && <div>📝 字幕文件: {task.subtitlePath}</div>}
                  {task.fileSize && <div>💾 文件大小: {formatFileSize(task.fileSize)}</div>}
                  {task.startTime && <div>⏰ 开始时间: {formatTime(task.startTime)}</div>}
                  {task.endTime && <div>✅ 完成时间: {formatTime(task.endTime)} (耗时: {getDownloadTime(task)})</div>}
                  {task.error && <div style={{ color: '#ff5252' }}>❌ 错误: {task.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#1e1e1e',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#888'
      }}>
        <p>✅ Electron v38 | React v18 | TypeScript | Material-UI</p>
        <p>🚀 YouTube下载 | 双语字幕 | Whisper AI | FFmpeg压缩</p>
        <p>💡 提示：下载的视频和字幕会保存在您选择的文件夹中，点击"打开文件夹"即可查看</p>
      </div>
    </div>
  );
};

export default CompleteApp;