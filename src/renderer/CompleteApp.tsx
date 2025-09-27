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
  // 字幕生成相关
  subtitleStatus?: string;
  subtitleProgress?: number;
  subtitleCurrent?: number;
  subtitleTotal?: number;
  generatingSubtitle?: boolean;
  // 处理阶段
  stage?: 'fetching' | 'downloading' | 'merging' | 'subtitle' | 'finalizing' | 'completed';
  stageMessage?: string;
  // 实时进度
  downloadSpeed?: string;
  downloadEta?: string;
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

    // 监听IPC事件
    if (window.electronAPI?.on) {
      // 监听下载进度
      window.electronAPI.on('download-progress', (event: any, data: any) => {
        setTasks(prev => prev.map(t =>
          t.id === data.taskId ? {
            ...t,
            progress: data.progress || t.progress,
            stage: data.stage || t.stage,
            status: data.status || t.status,
            downloadSpeed: data.speed,
            downloadEta: data.eta
          } : t
        ));
      });

      // 监听字幕开始
      window.electronAPI.on?.('subtitle-start', (event: any, data: any) => {
        setTasks(prev => prev.map(t =>
          t.id === data.taskId ? {
            ...t,
            generatingSubtitle: true,
            stage: 'subtitle',
            status: data.status || '生成字幕中...'
          } : t
        ));
      });

      // 监听字幕进度
      window.electronAPI.on?.('subtitle-progress', (event: any, data: any) => {
        setTasks(prev => prev.map(t =>
          t.id === data.taskId ? {
            ...t,
            subtitleProgress: data.percent,
            subtitleCurrent: data.current,
            subtitleTotal: data.total,
            subtitleStatus: data.status,
            stage: data.stage || t.stage
          } : t
        ));
      });

      // 监听下载完成
      window.electronAPI.on?.('download-complete', (event: any, data: any) => {
        setTasks(prev => prev.map(t =>
          t.id === data.taskId ? {
            ...t,
            status: '完成',
            stage: 'completed',
            filePath: data.filePath,
            subtitlePath: data.subtitlePath,
            endTime: Date.now(),
            generatingSubtitle: false
          } : t
        ));
      });
    }
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
      startTime: Date.now(),
      stage: 'fetching',
      stageMessage: '正在连接YouTube服务器...'
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
          subtitle: settings.autoGenerateSubtitle,
          taskId: taskId  // 传递taskId以便后端发送正确的事件
        });

        // 不再使用模拟，让真实的IPC事件更新UI
        console.log('开始下载任务:', result);

      } catch (error) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? {...t, status: '失败', error: String(error)} : t
        ));
      }
    } else {
      // 没有Electron环境时的模拟模式
      console.warn('在非Electron环境下运行，使用模拟模式');
      simulateDownload(taskId, '示例视频');
    }

    setUrl(''); // 清空输入
  };

  const simulateDownload = (taskId: number, title: string) => {
    // 阶段0: 获取视频信息
    setTasks(prev => prev.map(t =>
      t.id === taskId ? {
        ...t,
        stage: 'fetching',
        stageMessage: '🔍 正在获取视频信息和可用格式...'
      } : t
    ));

    setTimeout(() => {
      // 阶段1: 下载视频流和音频流
      let progress = 0;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? {
          ...t,
          stage: 'downloading',
          stageMessage: '📥 正在从YouTube服务器下载视频和音频流...'
        } : t
      ));

      const downloadInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;

        if (progress >= 100) {
          progress = 100;
          clearInterval(downloadInterval);

          // 阶段2: 合并音视频
          setTasks(prev => prev.map(t =>
            t.id === taskId ? {
              ...t,
              status: '合并中',
              progress: 100,
              stage: 'merging',
              stageMessage: '🔄 正在使用FFmpeg合并音频和视频流，确保音视频同步...'
            } : t
          ));

          // 模拟合并过程
          setTimeout(() => {
            const filePath = `${downloadPath}/${title}.mp4`;

            setTasks(prev => prev.map(t =>
              t.id === taskId ? {
                ...t,
                status: '处理中',
                filePath: filePath,
                fileSize: Math.floor(Math.random() * 500 + 100) * 1024 * 1024,
                stage: 'merging',
                stageMessage: '🔧 音视频合并中，请耐心等待...'
              } : t
            ));

            // 如果启用字幕生成，开始字幕任务
            if (settings.autoGenerateSubtitle) {
              // 阶段3: 字幕生成
              setTimeout(() => {
                setTasks(prev => prev.map(t =>
                  t.id === taskId ? {
                    ...t,
                    generatingSubtitle: true,
                    subtitleStatus: '初始化 Whisper AI...',
                    subtitleProgress: 0,
                    stage: 'subtitle',
                    stageMessage: '📝 正在使用Whisper AI识别语音并生成字幕...'
                  } : t
                ));

            // 模拟字幕生成进度
            let subtitleProgress = 0;
            const subtitleInterval = setInterval(() => {
              subtitleProgress += Math.random() * 20 + 10;

              if (subtitleProgress >= 100) {
                subtitleProgress = 100;
                clearInterval(subtitleInterval);

                // 阶段4: 最终处理
                setTasks(prev => prev.map(t =>
                  t.id === taskId ? {
                    ...t,
                    stage: 'finalizing',
                    stageMessage: '✨ 正在进行最终优化和文件整理...',
                    subtitleProgress: 100
                  } : t
                ));

                setTimeout(() => {
                  // 所有处理完成
                  setTasks(prev => prev.map(t =>
                    t.id === taskId ? {
                      ...t,
                      status: '完成',
                      generatingSubtitle: false,
                      subtitleStatus: '字幕生成完成',
                      subtitleProgress: 100,
                      subtitlePath: `${downloadPath}/${title}.srt`,
                      endTime: Date.now(),
                      stage: 'completed',
                      stageMessage: '✅ 视频已准备就绪，包含音频和字幕，可以播放！'
                    } : t
                  ));
                }, 2000);
              } else {
                // 更新字幕进度
                setTasks(prev => prev.map(t =>
                  t.id === taskId ? {
                    ...t,
                    subtitleProgress: Math.min(subtitleProgress, 100),
                    subtitleStatus: subtitleProgress < 20 ? '正在分析音频...' :
                                    subtitleProgress < 50 ? '正在识别语音...' :
                                    subtitleProgress < 80 ? '正在生成字幕...' :
                                    '正在优化时间轴...'
                  } : t
                ));
              }
            }, 800);
          }, 3000);
            } else {
              // 不生成字幕，进入最终处理
              setTimeout(() => {
                setTasks(prev => prev.map(t =>
                  t.id === taskId ? {
                    ...t,
                    stage: 'finalizing',
                    stageMessage: '✨ 正在优化视频文件...'
                  } : t
                ));

                setTimeout(() => {
                  setTasks(prev => prev.map(t =>
                    t.id === taskId ? {
                      ...t,
                      status: '完成',
                      endTime: Date.now(),
                      stage: 'completed',
                      stageMessage: '✅ 视频已准备就绪，可以播放！'
                    } : t
                  ));
                }, 2000);
              }, 2000);
            }
          }, 3000);
        } else {
          // 更新视频下载进度
          setTasks(prev => prev.map(t =>
            t.id === taskId ? {...t, progress: Math.min(progress, 100)} : t
          ));
        }
      }, 500);
    }, 3000);
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
      padding: '10px',
      background: '#121212',
      color: '#fff',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>

      <h1 style={{
        textAlign: 'center',
        color: '#1976d2',
        fontSize: '1.8em',
        margin: '5px 0',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        🎬 PreVideo YouTube下载器
      </h1>

      {/* 下载输入区 - 单独一行 */}
      <div style={{
        flex: '0 0 auto',
        marginBottom: '10px',
        background: '#1e1e1e',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="🔗 输入或粘贴 YouTube 视频链接（例如：https://www.youtube.com/watch?v=...）"
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              borderRadius: '6px',
              border: '2px solid #333',
              background: '#2a2a2a',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#1976d2'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 30px',
              fontSize: '14px',
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 3px 10px rgba(25, 118, 210, 0.4)',
              transition: 'transform 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📥 开始下载
          </button>
        </div>
      </div>

      {/* 设置区域 */}
      <div style={{
        flex: '0 0 auto',
        marginBottom: '10px',
        background: '#1e1e1e',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 下载路径 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1', minWidth: '300px' }}>
            <label style={{ color: '#aaa', fontSize: '0.9em', whiteSpace: 'nowrap' }}>📁 下载路径:</label>
            <input
              type="text"
              value={downloadPath}
              readOnly
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #333',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '0.85em'
              }}
            />
            <button
              onClick={selectDownloadPath}
              style={{
                padding: '6px 12px',
                background: '#424242',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85em'
              }}
            >
              选择
            </button>
          </div>

          {/* 视频质量 */}
          <select
            value={settings.quality}
            onChange={e => setSettings({...settings, quality: e.target.value})}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #333',
              cursor: 'pointer',
              fontSize: '0.85em'
            }}
          >
            <option value="1080p">📺 1080p</option>
            <option value="720p">📺 720p</option>
            <option value="480p">📺 480p</option>
            <option value="best">🌟 最高</option>
          </select>

          {/* 复选框选项 */}
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85em' }}>
            <input
              type="checkbox"
              checked={settings.bilingualSubtitle}
              onChange={e => setSettings({...settings, bilingualSubtitle: e.target.checked})}
              style={{ marginRight: '6px' }}
            />
            <span>🗣️ 双语字幕</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85em' }}>
            <input
              type="checkbox"
              checked={settings.autoGenerateSubtitle}
              onChange={e => setSettings({...settings, autoGenerateSubtitle: e.target.checked})}
              style={{ marginRight: '6px' }}
            />
            <span>🎙️ 自动字幕</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85em' }}>
            <input
              type="checkbox"
              checked={settings.videoCompression}
              onChange={e => setSettings({...settings, videoCompression: e.target.checked})}
              style={{ marginRight: '6px' }}
            />
            <span>🗜️ 压缩视频</span>
          </label>

          {/* 语言选项 - 条件显示 */}
          {settings.bilingualSubtitle && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#aaa', fontSize: '0.85em' }}>主语言:</span>
                <select
                  value={settings.primaryLanguage}
                  onChange={e => setSettings({...settings, primaryLanguage: e.target.value})}
                  style={{
                    padding: '4px 8px',
                    background: '#2a2a2a',
                    color: '#fff',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="zh-CN" style={{background: '#2a2a2a', color: '#fff'}}>中文</option>
                  <option value="en" style={{background: '#2a2a2a', color: '#fff'}}>English</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#aaa', fontSize: '0.85em' }}>副语言:</span>
                <select
                  value={settings.secondaryLanguage}
                  onChange={e => setSettings({...settings, secondaryLanguage: e.target.value})}
                  style={{
                    padding: '4px 8px',
                    background: '#2a2a2a',
                    color: '#fff',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="en" style={{background: '#2a2a2a', color: '#fff'}}>English</option>
                  <option value="zh-CN" style={{background: '#2a2a2a', color: '#fff'}}>中文</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 任务列表 - 可滚动区域 */}
      <div style={{
        background: '#1e1e1e',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '10px', fontSize: '1.1em' }}>
          📋 下载任务 ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '15px' }}>📭</div>
            <div style={{ fontSize: '14px' }}>暂无下载任务</div>
            <div style={{ marginTop: '5px', fontSize: '12px' }}>输入YouTube URL开始下载</div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
            flex: '1',
            paddingRight: '5px'
          }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                padding: '12px',
                background: '#2a2a2a',
                borderRadius: '6px',
                border: '1px solid #333',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '14px' }}>{task.title}</strong>
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

                {/* 处理阶段状态 */}
                {task.stage && task.stage !== 'completed' && (
                  <div style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#fff',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4caf50',
                        animation: 'pulse 1.5s infinite'
                      }}></span>
                      当前阶段: {{
                        'fetching': '🔍 获取视频信息',
                        'downloading': '📥 下载视频流',
                        'merging': '🔄 合并音视频',
                        'subtitle': '📝 生成字幕',
                        'finalizing': '✨ 最终处理'
                      }[task.stage] || task.stage}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#b3d9ff',
                      marginTop: '4px'
                    }}>
                      {task.stageMessage || '处理中...'}
                    </div>
                  </div>
                )}

                {/* 进度条 */}
                {task.status !== '完成' && task.status !== '失败' && (
                  <div style={{ marginBottom: '10px' }}>
                    {/* 整体进度概览 */}
                    <div style={{
                      padding: '10px',
                      background: 'rgba(25, 118, 210, 0.1)',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      border: '1px solid rgba(25, 118, 210, 0.3)'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                        📊 整体进度
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: task.stage === 'downloading' ? '#1976d2' :
                                     task.progress > 0 ? '#4caf50' : '#666'
                        }}>
                          1. 下载视频 {task.progress > 0 ? `✓ ${task.progress.toFixed(0)}%` : ''}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: task.stage === 'merging' ? '#1976d2' :
                                     task.stage && ['subtitle', 'finalizing', 'completed'].includes(task.stage) ? '#4caf50' : '#666'
                        }}>
                          2. 合并音视频 {task.stage === 'merging' ? '处理中...' : ''}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: task.stage === 'subtitle' ? '#1976d2' :
                                     task.subtitleProgress === 100 ? '#4caf50' : '#666'
                        }}>
                          3. 翻译字幕 {task.subtitleCurrent ? `${task.subtitleCurrent}/${task.subtitleTotal}` : ''}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: task.stage === 'finalizing' ? '#1976d2' :
                                     task.stage === 'completed' ? '#4caf50' : '#666'
                        }}>
                          4. 嵌入字幕
                        </span>
                      </div>
                    </div>

                    {/* 视频下载进度 */}
                    {task.stage === 'downloading' && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                          📥 视频下载进度 {task.downloadSpeed && `• ${task.downloadSpeed}`} {task.downloadEta && `• 剩余 ${task.downloadEta}`}
                        </div>
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
                          {task.progress.toFixed(1)}% 已完成
                        </div>
                      </div>
                    )}

                    {/* 字幕翻译进度 */}
                    {(task.generatingSubtitle || task.stage === 'subtitle') && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                          🌐 字幕翻译进度 (DeepSeek AI)
                          {task.subtitleCurrent && task.subtitleTotal &&
                            ` • 已翻译 ${task.subtitleCurrent}/${task.subtitleTotal} 条`}
                        </div>
                        <div style={{
                          background: '#333',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          height: '10px'
                        }}>
                          <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                            width: `${task.subtitleProgress || 0}%`,
                            transition: 'width 0.3s',
                            boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)'
                          }}></div>
                        </div>
                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#888' }}>
                          {task.subtitleStatus || '正在翻译字幕...'} - {(task.subtitleProgress || 0).toFixed(1)}%
                        </div>
                      </div>
                    )}

                    {/* 处理状态提示 */}
                    {task.stage === 'merging' && (
                      <div style={{
                        padding: '8px',
                        background: 'rgba(255, 152, 0, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 152, 0, 0.3)',
                        fontSize: '12px',
                        color: '#ff9800'
                      }}>
                        🔄 正在使用 FFmpeg 合并音视频流，请稍候...
                      </div>
                    )}

                    {task.stage === 'finalizing' && (
                      <div style={{
                        padding: '8px',
                        background: 'rgba(156, 39, 176, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(156, 39, 176, 0.3)',
                        fontSize: '12px',
                        color: '#9c27b0'
                      }}>
                        ✨ 正在嵌入字幕到视频文件，即将完成...
                      </div>
                    )}
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
        marginTop: '10px',
        padding: '8px',
        background: '#1e1e1e',
        borderRadius: '6px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#888',
        flex: '0 0 auto'
      }}>
        <span>✅ Electron v38 | React v18 | YouTube下载 | DeepSeek翻译 | FFmpeg嵌入字幕</span>
      </div>
    </div>
  );
};

export default CompleteApp;