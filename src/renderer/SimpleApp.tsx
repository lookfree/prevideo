import React, { useState } from 'react';

const SimpleApp: React.FC = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('就绪');
  const [tasks, setTasks] = useState<any[]>([]);

  const handleDownload = async () => {
    if (!url) {
      alert('请输入YouTube视频URL');
      return;
    }

    setStatus('正在获取视频信息...');

    // 调用Electron API
    if (window.electronAPI) {
      try {
        const videoInfo = await window.electronAPI.video.fetchInfo(url);
        console.log('视频信息:', videoInfo);

        const newTask = {
          id: Date.now(),
          title: videoInfo.title || '未知视频',
          url: url,
          status: '下载中',
          progress: 0
        };

        setTasks([...tasks, newTask]);
        setStatus(`开始下载: ${videoInfo.title}`);

        // 开始下载
        const result = await window.electronAPI.video.startDownload({
          url: url,
          outputPath: '~/Downloads',
          quality: '1080p'
        });

        console.log('下载结果:', result);
      } catch (error) {
        console.error('错误:', error);
        setStatus('下载失败');
      }
    } else {
      // 模拟下载
      const newTask = {
        id: Date.now(),
        title: '示例视频',
        url: url,
        status: '下载中',
        progress: 0
      };
      setTasks([...tasks, newTask]);
      setStatus('模拟下载中...');

      // 模拟进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setTasks(prev => prev.map(t =>
          t.id === newTask.id ? {...t, progress} : t
        ));
        if (progress >= 100) {
          clearInterval(interval);
          setTasks(prev => prev.map(t =>
            t.id === newTask.id ? {...t, status: '完成', progress: 100} : t
          ));
          setStatus('下载完成！');
        }
      }, 500);
    }
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: '#1e1e1e',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{
        textAlign: 'center',
        color: '#1976d2',
        fontSize: '2.5em',
        marginBottom: '30px'
      }}>
        🎬 PreVideo YouTube下载器
      </h1>

      <div style={{
        background: '#2a2a2a',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '20px' }}>📥 下载新视频</h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入YouTube视频URL..."
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              borderRadius: '6px',
              border: '2px solid #1976d2',
              background: '#333',
              color: '#fff'
            }}
          />
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            开始下载
          </button>
        </div>

        <div style={{
          padding: '10px',
          background: '#333',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          <strong>状态：</strong> {status}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '8px' }} />
            <span>双语字幕</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '8px' }} />
            <span>自动生成字幕</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" style={{ marginRight: '8px' }} />
            <span>视频压缩</span>
          </label>
          <select style={{
            padding: '8px',
            borderRadius: '4px',
            background: '#333',
            color: '#fff',
            border: '1px solid #555'
          }}>
            <option>1080p</option>
            <option>720p</option>
            <option>480p</option>
          </select>
        </div>
      </div>

      <div style={{
        background: '#2a2a2a',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: '#1976d2', marginBottom: '20px' }}>📋 下载任务</h2>

        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666'
          }}>
            暂无下载任务
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                padding: '15px',
                background: '#333',
                borderRadius: '8px',
                border: '1px solid #444'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>{task.title}</strong>
                  <span style={{
                    color: task.status === '完成' ? '#4caf50' : '#1976d2'
                  }}>{task.status}</span>
                </div>
                <div style={{ background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '8px',
                    background: '#1976d2',
                    width: `${task.progress}%`,
                    transition: 'width 0.3s'
                  }}></div>
                </div>
                <div style={{ marginTop: '5px', fontSize: '14px', color: '#888' }}>
                  {task.url}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#2a2a2a',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#888'
      }}>
        <p>✅ Electron v38.1.2 | React v18 | TypeScript | Material-UI</p>
        <p>🚀 功能：YouTube下载 | 双语字幕 | Whisper生成 | FFmpeg压缩</p>
      </div>
    </div>
  );
};

export default SimpleApp;