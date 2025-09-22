/**
 * Home page component - main download interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Fab,
  Badge,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Queue as QueueIcon
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import VideoInputForm from '../components/VideoInputForm';
import TaskList from '../components/TaskList';
import { DownloadOptions } from '../../shared/types/tasks';
import { useSnackbar } from 'notistack';

const HomePage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();

  const [showInput, setShowInput] = useState(true);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);

  useEffect(() => {
    // Load initial tasks
    loadTasks();

    // Subscribe to task updates
    const unsubscribe = subscribeToTaskUpdates();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTasks = async () => {
    try {
      const result = await window.prevideo.tasks.getAllTasks();
      if (result.success) {
        categorizeAndSetTasks(result.data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const subscribeToTaskUpdates = () => {
    const handleProgress = (data: any) => {
      // Update task progress
      updateTaskInList(data.taskId, data);
    };

    const unsubscribe = window.prevideo.video.onProgress(handleProgress);
    return unsubscribe;
  };

  const categorizeAndSetTasks = (tasks: any[]) => {
    const active = tasks.filter(t =>
      t.status === 'downloading' || t.status === 'processing' || t.status === 'paused'
    );
    const queued = tasks.filter(t => t.status === 'queued');
    const completed = tasks.filter(t =>
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );

    setActiveTasks(active);
    setQueuedTasks(queued);
    setCompletedTasks(completed);
  };

  const updateTaskInList = (taskId: string, updates: any) => {
    // Update task in appropriate list
    setActiveTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));
    setQueuedTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));
    setCompletedTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));

    // Re-categorize if status changed
    if (updates.status) {
      loadTasks();
    }
  };

  const handleStartDownload = async (url: string, options: DownloadOptions) => {
    try {
      const result = await window.prevideo.video.startDownload(url, options);
      if (result.success) {
        enqueueSnackbar('下载任务已添加', { variant: 'success' });
        setShowInput(false);
        loadTasks();
      } else {
        enqueueSnackbar(result.error || '启动下载失败', { variant: 'error' });
      }
    } catch (error) {
      console.error('Failed to start download:', error);
      enqueueSnackbar('启动下载失败', { variant: 'error' });
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.pauseTask(taskId);
      if (result.success) {
        enqueueSnackbar('任务已暂停', { variant: 'info' });
        updateTaskInList(taskId, { status: 'paused' });
      }
    } catch (error) {
      console.error('Failed to pause task:', error);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.resumeTask(taskId);
      if (result.success) {
        enqueueSnackbar('任务已恢复', { variant: 'info' });
        updateTaskInList(taskId, { status: 'downloading' });
      }
    } catch (error) {
      console.error('Failed to resume task:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.cancelTask(taskId);
      if (result.success) {
        enqueueSnackbar('任务已取消', { variant: 'warning' });
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.retryTask(taskId);
      if (result.success) {
        enqueueSnackbar('任务已重试', { variant: 'info' });
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.removeTask(taskId);
      if (result.success) {
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to remove task:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const result = await window.prevideo.tasks.clearCompletedTasks();
      if (result.success) {
        enqueueSnackbar('已清除完成的任务', { variant: 'success' });
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to clear completed tasks:', error);
    }
  };

  const handleShowInFolder = async (path: string) => {
    try {
      await window.prevideo.system.openPath(path);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const totalActiveTasks = activeTasks.length + queuedTasks.length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            视频下载
          </Typography>

          <Badge badgeContent={totalActiveTasks} color="primary">
            <QueueIcon />
          </Badge>
        </Box>

        {/* Input Form */}
        {showInput && (
          <Box sx={{ mb: 3 }}>
            <VideoInputForm onStartDownload={handleStartDownload} />
          </Box>
        )}

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              进行中的任务
            </Typography>
            <TaskList
              tasks={activeTasks}
              variant="detailed"
              onPauseTask={handlePauseTask}
              onResumeTask={handleResumeTask}
              onCancelTask={handleCancelTask}
              onRemoveTask={handleRemoveTask}
              onShowInFolder={handleShowInFolder}
            />
          </Box>
        )}

        {/* Queued Tasks */}
        {queuedTasks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              队列中的任务 ({queuedTasks.length})
            </Typography>
            <TaskList
              tasks={queuedTasks}
              variant="compact"
              onCancelTask={handleCancelTask}
              onRemoveTask={handleRemoveTask}
            />
          </Box>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                最近完成 ({completedTasks.length})
              </Typography>
              {completedTasks.some(t => t.status === 'completed') && (
                <Button
                  size="small"
                  onClick={handleClearCompleted}
                  startIcon={<ClearIcon />}
                >
                  清除已完成
                </Button>
              )}
            </Box>
            <TaskList
              tasks={completedTasks.slice(0, 5)}
              variant="compact"
              onRetryTask={handleRetryTask}
              onRemoveTask={handleRemoveTask}
              onShowInFolder={handleShowInFolder}
              onClearCompleted={handleClearCompleted}
            />
          </Box>
        )}

        {/* Empty State */}
        {activeTasks.length === 0 && queuedTasks.length === 0 && completedTasks.length === 0 && !showInput && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无下载任务
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              点击下方按钮开始新的下载
            </Typography>
          </Paper>
        )}

        {/* Floating Action Button */}
        {!showInput && (
          <Fab
            color="primary"
            aria-label="新建下载"
            onClick={() => setShowInput(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Tips */}
        {showInput && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              提示：支持YouTube、Bilibili、Vimeo等主流视频网站。可以同时下载多个视频，系统会自动排队处理。
            </Typography>
          </Alert>
        )}
      </Box>
    </Container>
  );
};

// Import missing components
const Button = require('@mui/material').Button;
const ClearIcon = require('@mui/icons-material').Clear;

export default HomePage;