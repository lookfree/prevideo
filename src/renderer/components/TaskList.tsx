/**
 * Task list component for displaying download and processing tasks
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Menu,
  MenuItem,
  Divider,
  Alert,
  LinearProgress,
  Collapse,
  Stack,
  Badge,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  Download as DownloadIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  Schedule as QueuedIcon,
  CloudDownload as ActiveIcon,
  PauseCircle as PausedIcon,
  Cancel as CancelledIcon,
  Replay as RetryIcon,
  DeleteSweep as ClearAllIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { DownloadTask, ProcessingTask, TaskStatus } from '../../shared/types/tasks';
import { formatFileSize as formatBytes, formatDuration, formatSpeed } from '../utils/format';
import DownloadProgress from './DownloadProgress';

interface TaskListProps {
  tasks: (DownloadTask | ProcessingTask)[];
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onRemoveTask?: (taskId: string) => void;
  onClearCompleted?: () => void;
  onShowInFolder?: (path: string) => void;
  variant?: 'compact' | 'detailed';
}

type TaskFilter = 'all' | 'active' | 'completed' | 'failed' | 'queued';
type TaskSort = 'newest' | 'oldest' | 'name' | 'size' | 'progress';

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onRetryTask,
  onRemoveTask,
  onClearCompleted,
  onShowInFolder,
  variant = 'compact'
}) => {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('newest');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'active':
        return task.status === 'downloading' || task.status === 'processing';
      case 'completed':
        return task.status === 'completed';
      case 'failed':
        return task.status === 'failed';
      case 'queued':
        return task.status === 'queued';
      default:
        return true;
    }
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sort) {
      case 'newest':
        return b.startTime - a.startTime;
      case 'oldest':
        return a.startTime - b.startTime;
      case 'name':
        return a.videoInfo.title.localeCompare(b.videoInfo.title);
      case 'size':
        return (b.totalBytes || 0) - (a.totalBytes || 0);
      case 'progress':
        return (b.progress || 0) - (a.progress || 0);
      default:
        return 0;
    }
  });

  // Count tasks by status
  const taskCounts = {
    all: tasks.length,
    active: tasks.filter(t => t.status === 'downloading' || t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    queued: tasks.filter(t => t.status === 'queued').length
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, taskId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(taskId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTask(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedTask) return;

    switch (action) {
      case 'pause':
        onPauseTask?.(selectedTask);
        break;
      case 'resume':
        onResumeTask?.(selectedTask);
        break;
      case 'cancel':
        onCancelTask?.(selectedTask);
        break;
      case 'retry':
        onRetryTask?.(selectedTask);
        break;
      case 'remove':
        onRemoveTask?.(selectedTask);
        break;
      case 'folder':
        const task = tasks.find(t => t.id === selectedTask);
        if (task) onShowInFolder?.(task.outputPath);
        break;
    }
    handleMenuClose();
  };

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'downloading':
      case 'processing':
        return <ActiveIcon color="primary" />;
      case 'completed':
        return <CompleteIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'queued':
        return <QueuedIcon color="action" />;
      case 'paused':
        return <PausedIcon color="warning" />;
      case 'cancelled':
        return <CancelledIcon color="disabled" />;
      default:
        return <DownloadIcon />;
    }
  };

  const getStatusColor = (status: TaskStatus): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'downloading':
      case 'processing':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'paused':
        return 'warning';
      case 'queued':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: TaskStatus): string => {
    switch (status) {
      case 'downloading': return '下载中';
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'paused': return '已暂停';
      case 'queued': return '队列中';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  if (variant === 'detailed') {
    return (
      <Box>
        {sortedTasks.map(task => (
          <DownloadProgress
            key={task.id}
            task={task as DownloadTask}
            onPause={onPauseTask}
            onResume={onResumeTask}
            onCancel={onCancelTask}
            onRemove={onRemoveTask}
            onShowInFolder={onShowInFolder}
          />
        ))}
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          任务列表
        </Typography>

        <Stack direction="row" spacing={1}>
          {/* Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>筛选</InputLabel>
            <Select
              value={filter}
              onChange={(e: SelectChangeEvent) => setFilter(e.target.value as TaskFilter)}
              label="筛选"
            >
              <MenuItem value="all">
                <Badge badgeContent={taskCounts.all} color="default">
                  全部
                </Badge>
              </MenuItem>
              <MenuItem value="active">
                <Badge badgeContent={taskCounts.active} color="primary">
                  进行中
                </Badge>
              </MenuItem>
              <MenuItem value="completed">
                <Badge badgeContent={taskCounts.completed} color="success">
                  已完成
                </Badge>
              </MenuItem>
              <MenuItem value="failed">
                <Badge badgeContent={taskCounts.failed} color="error">
                  失败
                </Badge>
              </MenuItem>
              <MenuItem value="queued">
                <Badge badgeContent={taskCounts.queued} color="info">
                  队列
                </Badge>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>排序</InputLabel>
            <Select
              value={sort}
              onChange={(e: SelectChangeEvent) => setSort(e.target.value as TaskSort)}
              label="排序"
            >
              <MenuItem value="newest">最新</MenuItem>
              <MenuItem value="oldest">最旧</MenuItem>
              <MenuItem value="name">名称</MenuItem>
              <MenuItem value="size">大小</MenuItem>
              <MenuItem value="progress">进度</MenuItem>
            </Select>
          </FormControl>

          {/* Clear completed */}
          {taskCounts.completed > 0 && (
            <Tooltip title="清除已完成">
              <IconButton onClick={onClearCompleted} size="small">
                <ClearAllIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {filter === 'all' ? '暂无任务' : `暂无${getStatusText(filter as any)}任务`}
          </Typography>
        </Box>
      ) : (
        <List>
          {sortedTasks.map((task, index) => (
            <React.Fragment key={task.id}>
              {index > 0 && <Divider />}
              <ListItem
                onClick={() => toggleTaskExpanded(task.id)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <ListItemIcon>
                  {getStatusIcon(task.status)}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" noWrap sx={{ flex: 1 }}>
                        {task.videoInfo.title}
                      </Typography>
                      <Chip
                        label={getStatusText(task.status)}
                        size="small"
                        color={getStatusColor(task.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {task.type === 'download' ? '视频下载' : '视频处理'}
                        </Typography>
                        {task.progress !== undefined && (
                          <Typography variant="caption">
                            {task.progress.toFixed(1)}%
                          </Typography>
                        )}
                        {task.speed && (
                          <Typography variant="caption">
                            {formatSpeed(task.speed)}
                          </Typography>
                        )}
                        {task.eta && (
                          <Typography variant="caption">
                            剩余: {formatDuration(task.eta)}
                          </Typography>
                        )}
                      </Box>

                      {/* Progress Bar */}
                      {(task.status === 'downloading' || task.status === 'processing') && (
                        <LinearProgress
                          variant="determinate"
                          value={task.progress || 0}
                          sx={{ mt: 1, height: 4, borderRadius: 2 }}
                        />
                      )}

                      {/* Expanded Details */}
                      <Collapse in={expandedTasks.has(task.id)}>
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                输出路径: {task.outputPath}
                              </Typography>
                            </Grid>
                            {task.totalBytes && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  大小: {formatBytes(task.downloadedBytes || 0)} / {formatBytes(task.totalBytes)}
                                </Typography>
                              </Grid>
                            )}
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                开始时间: {new Date(task.startTime).toLocaleString()}
                              </Typography>
                            </Grid>
                            {task.endTime && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  完成时间: {new Date(task.endTime).toLocaleString()}
                                </Typography>
                              </Grid>
                            )}
                            {task.lastError && (
                              <Grid item xs={12}>
                                <Alert severity="error" sx={{ py: 0 }}>
                                  <Typography variant="caption">
                                    {task.lastError}
                                  </Typography>
                                </Alert>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuClick(e, task.id);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTask && (() => {
          const task = tasks.find(t => t.id === selectedTask);
          if (!task) return null;

          return (
            <>
              {task.status === 'downloading' && (
                <MenuItem onClick={() => handleMenuAction('pause')}>
                  <ListItemIcon>
                    <PauseIcon />
                  </ListItemIcon>
                  <ListItemText>暂停</ListItemText>
                </MenuItem>
              )}

              {task.status === 'paused' && (
                <MenuItem onClick={() => handleMenuAction('resume')}>
                  <ListItemIcon>
                    <PlayIcon />
                  </ListItemIcon>
                  <ListItemText>继续</ListItemText>
                </MenuItem>
              )}

              {(task.status === 'downloading' || task.status === 'processing' || task.status === 'queued') && (
                <MenuItem onClick={() => handleMenuAction('cancel')}>
                  <ListItemIcon>
                    <StopIcon />
                  </ListItemIcon>
                  <ListItemText>取消</ListItemText>
                </MenuItem>
              )}

              {task.status === 'failed' && (
                <MenuItem onClick={() => handleMenuAction('retry')}>
                  <ListItemIcon>
                    <RetryIcon />
                  </ListItemIcon>
                  <ListItemText>重试</ListItemText>
                </MenuItem>
              )}

              {task.status === 'completed' && (
                <MenuItem onClick={() => handleMenuAction('folder')}>
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText>打开文件夹</ListItemText>
                </MenuItem>
              )}

              <Divider />

              <MenuItem onClick={() => handleMenuAction('remove')}>
                <ListItemIcon>
                  <DeleteIcon />
                </ListItemIcon>
                <ListItemText>移除</ListItemText>
              </MenuItem>
            </>
          );
        })()}
      </Menu>
    </Paper>
  );
};

// Add format utilities if not already in utils
const Grid = Box; // Temporary alias, should import from MUI

export default TaskList;