/**
 * Download progress component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  Grid,
  Tooltip,
  Collapse,
  Button,
  Stack
} from '@mui/material';
import {
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { DownloadTask, DownloadProgress as Progress } from '../../shared/types/tasks';
import { VideoInfo } from '../../shared/types/video';

interface DownloadProgressProps {
  task: DownloadTask;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRemove?: (taskId: string) => void;
  onShowInFolder?: (path: string) => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({
  task,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onShowInFolder
}) => {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = window.prevideo.video.onProgress((data) => {
      if (data.taskId === task.id) {
        setProgress(data.task as any);
      }
    });

    // Get initial progress
    fetchProgress();

    return () => {
      unsubscribe();
    };
  }, [task.id]);

  const fetchProgress = async () => {
    try {
      const result = await window.prevideo.video.getProgress(task.id);
      if (result.success) {
        setProgress(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const speed = formatBytes(bytesPerSecond);
    return speed + '/s';
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0 || !isFinite(seconds)) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'downloading': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'downloading': return '下载中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'paused': return '已暂停';
      case 'cancelled': return '已取消';
      case 'queued': return '队列中';
      default: return status;
    }
  };

  const handleAction = async (action: 'pause' | 'resume' | 'cancel' | 'remove') => {
    switch (action) {
      case 'pause':
        onPause?.(task.id);
        break;
      case 'resume':
        onResume?.(task.id);
        break;
      case 'cancel':
        onCancel?.(task.id);
        break;
      case 'remove':
        onRemove?.(task.id);
        break;
    }
  };

  const progressValue = progress?.progress || task.progress || 0;
  const isActive = task.status === 'downloading';
  const isPaused = task.status === 'paused';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap title={task.videoInfo.title}>
              {task.videoInfo.title}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={getStatusText(task.status)}
                size="small"
                color={getStatusColor(task.status)}
              />

              {isActive && progress && (
                <>
                  <Chip
                    icon={<SpeedIcon />}
                    label={formatSpeed(progress.speed)}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`ETA: ${formatTime(progress.eta)}`}
                    size="small"
                    variant="outlined"
                  />
                </>
              )}

              {progress && (
                <Chip
                  icon={<StorageIcon />}
                  label={`${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  进度: {progressValue.toFixed(1)}%
                </Typography>
                {task.resumable && isPaused && (
                  <Typography variant="caption" color="warning.main">
                    支持断点续传
                  </Typography>
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: isActive
                      ? 'linear-gradient(90deg, #1976d2, #42a5f5)'
                      : undefined
                  }
                }}
                color={getStatusColor(task.status)}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            {isActive && (
              <Tooltip title="暂停">
                <IconButton onClick={() => handleAction('pause')} size="small">
                  <PauseIcon />
                </IconButton>
              </Tooltip>
            )}

            {isPaused && (
              <Tooltip title="继续">
                <IconButton onClick={() => handleAction('resume')} size="small" color="primary">
                  <PlayIcon />
                </IconButton>
              </Tooltip>
            )}

            {(isActive || isPaused) && (
              <Tooltip title="取消">
                <IconButton onClick={() => handleAction('cancel')} size="small" color="error">
                  <StopIcon />
                </IconButton>
              </Tooltip>
            )}

            {isCompleted && (
              <>
                <Tooltip title="打开文件夹">
                  <IconButton
                    onClick={() => onShowInFolder?.(task.outputPath)}
                    size="small"
                  >
                    <FolderIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="移除">
                  <IconButton
                    onClick={() => handleAction('remove')}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {isFailed && (
              <Tooltip title="移除">
                <IconButton
                  onClick={() => handleAction('remove')}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}

            <IconButton
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  视频信息
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    作者: {task.videoInfo.author}
                  </Typography>
                  <Typography variant="body2">
                    时长: {formatTime(task.videoInfo.duration)}
                  </Typography>
                  <Typography variant="body2">
                    质量: {task.metadata?.videoQuality || '未知'}
                  </Typography>
                  <Typography variant="body2">
                    格式: {task.metadata?.selectedFormat || 'mp4'}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  下载详情
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    输出路径: {task.outputPath}
                  </Typography>
                  <Typography variant="body2">
                    开始时间: {new Date(task.startTime).toLocaleString()}
                  </Typography>
                  {task.endTime && (
                    <Typography variant="body2">
                      结束时间: {new Date(task.endTime).toLocaleString()}
                    </Typography>
                  )}
                  {task.lastError && (
                    <Typography variant="body2" color="error">
                      错误: {task.lastError}
                    </Typography>
                  )}
                </Stack>
              </Grid>

              {task.subtitles && task.subtitles.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    字幕
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {task.subtitles.map((sub, index) => (
                      <Chip
                        key={index}
                        label={`${sub.languageName} (${sub.format})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
              )}

              {task.failureHistory && task.failureHistory.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    失败历史
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {task.failureHistory.map((failure, index) => (
                      <Typography key={index} variant="body2" color="error">
                        {new Date(failure.timestamp).toLocaleTimeString()}: {failure.reason} (进度: {failure.progress}%)
                      </Typography>
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default DownloadProgress;