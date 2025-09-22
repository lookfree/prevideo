/**
 * History page component - download history viewer
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Alert,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  Replay as ReplayIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  VideoFile as VideoIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  DateRange as DateIcon,
  DeleteSweep as ClearAllIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DownloadTask } from '../../shared/types/tasks';
import { formatBytes, formatDuration, formatDateTime, formatDomain } from '../utils/format';

interface HistoryFilters {
  search: string;
  status: string;
  dateRange: string;
  source: string;
}

const HistoryPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [history, setHistory] = useState<DownloadTask[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    status: 'all',
    dateRange: 'all',
    source: 'all'
  });

  // Detail dialog
  const [selectedTask, setSelectedTask] = useState<DownloadTask | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, filters]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await window.prevideo.tasks.getHistory();
      if (result.success) {
        // Sort by date descending
        const sorted = result.data.sort((a: DownloadTask, b: DownloadTask) =>
          (b.endTime || b.startTime) - (a.endTime || a.startTime)
        );
        setHistory(sorted);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      enqueueSnackbar('加载历史记录失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.videoInfo.title.toLowerCase().includes(searchLower) ||
        task.videoInfo.author.toLowerCase().includes(searchLower) ||
        task.url.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const ranges: { [key: string]: number } = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      };

      const range = ranges[filters.dateRange];
      if (range) {
        filtered = filtered.filter(task =>
          (task.endTime || task.startTime) > now - range
        );
      }
    }

    // Source filter
    if (filters.source !== 'all') {
      filtered = filtered.filter(task => {
        const domain = formatDomain(task.url);
        return domain.includes(filters.source);
      });
    }

    setFilteredHistory(filtered);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRedownload = async (task: DownloadTask) => {
    try {
      const result = await window.prevideo.video.startDownload(task.url, {
        quality: task.metadata?.videoQuality || 'best',
        outputPath: task.outputPath.substring(0, task.outputPath.lastIndexOf('/')),
        subtitleLanguages: task.subtitles?.map(s => s.languageCode)
      });

      if (result.success) {
        enqueueSnackbar('重新下载已开始', { variant: 'success' });
      } else {
        enqueueSnackbar('启动下载失败', { variant: 'error' });
      }
    } catch (error) {
      console.error('Failed to re-download:', error);
      enqueueSnackbar('重新下载失败', { variant: 'error' });
    }
  };

  const handleDeleteRecord = async (taskId: string) => {
    try {
      const result = await window.prevideo.tasks.deleteFromHistory(taskId);
      if (result.success) {
        enqueueSnackbar('已删除记录', { variant: 'success' });
        setHistory(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      enqueueSnackbar('删除记录失败', { variant: 'error' });
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('确定要清除所有历史记录吗？此操作不可恢复。')) {
      return;
    }

    try {
      const result = await window.prevideo.tasks.clearHistory();
      if (result.success) {
        enqueueSnackbar('历史记录已清除', { variant: 'success' });
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      enqueueSnackbar('清除历史记录失败', { variant: 'error' });
    }
  };

  const handleShowInFolder = async (path: string) => {
    try {
      await window.prevideo.system.openPath(path);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleShowDetails = (task: DownloadTask) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'cancelled':
        return <CancelIcon color="warning" />;
      default:
        return <VideoIcon />;
    }
  };

  const getStatusColor = (status: string): "default" | "success" | "error" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return '完成';
      case 'failed': return '失败';
      case 'cancelled': return '取消';
      default: return status;
    }
  };

  // Get unique sources from history
  const sources = Array.from(new Set(history.map(task => formatDomain(task.url))));

  // Statistics
  const stats = {
    total: history.length,
    completed: history.filter(t => t.status === 'completed').length,
    failed: history.filter(t => t.status === 'failed').length,
    totalSize: history.reduce((sum, t) => sum + (t.totalBytes || 0), 0)
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            下载历史
          </Typography>

          {history.length > 0 && (
            <Button
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={handleClearHistory}
            >
              清除全部
            </Button>
          )}
        </Box>

        {/* Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">
                总下载数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                成功下载
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {stats.failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                失败下载
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {formatBytes(stats.totalSize)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总大小
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="搜索视频标题、作者或链接..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: filters.search && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setFilters({ ...filters, search: '' })}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="状态"
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="completed">完成</MenuItem>
                  <MenuItem value="failed">失败</MenuItem>
                  <MenuItem value="cancelled">取消</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>时间范围</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  label="时间范围"
                >
                  <MenuItem value="all">全部时间</MenuItem>
                  <MenuItem value="today">今天</MenuItem>
                  <MenuItem value="week">最近一周</MenuItem>
                  <MenuItem value="month">最近一月</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>来源</InputLabel>
                <Select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  label="来源"
                >
                  <MenuItem value="all">全部来源</MenuItem>
                  {sources.map(source => (
                    <MenuItem key={source} value={source}>{source}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>视频信息</TableCell>
                <TableCell>来源</TableCell>
                <TableCell>大小</TableCell>
                <TableCell>时长</TableCell>
                <TableCell>下载时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">加载中...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {filters.search || filters.status !== 'all' || filters.dateRange !== 'all' || filters.source !== 'all'
                        ? '没有符合条件的记录'
                        : '暂无下载历史'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((task) => (
                    <TableRow key={task.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {task.videoInfo.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.videoInfo.author}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatDomain(task.url)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {task.totalBytes ? formatBytes(task.totalBytes) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDuration(task.videoInfo.duration)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(task.endTime || task.startTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(task.status)}
                          label={getStatusText(task.status)}
                          size="small"
                          color={getStatusColor(task.status)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="查看详情">
                            <IconButton
                              size="small"
                              onClick={() => handleShowDetails(task)}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>

                          {task.status === 'completed' && (
                            <Tooltip title="打开文件夹">
                              <IconButton
                                size="small"
                                onClick={() => handleShowInFolder(task.outputPath)}
                              >
                                <FolderIcon />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="重新下载">
                            <IconButton
                              size="small"
                              onClick={() => handleRedownload(task)}
                            >
                              <ReplayIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="删除记录">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRecord(task.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredHistory.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="每页显示"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </TableContainer>

        {/* Detail Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          {selectedTask && (
            <>
              <DialogTitle>下载详情</DialogTitle>
              <DialogContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="标题"
                      secondary={selectedTask.videoInfo.title}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="作者"
                      secondary={selectedTask.videoInfo.author}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="链接"
                      secondary={selectedTask.url}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="输出路径"
                      secondary={selectedTask.outputPath}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="视频质量"
                      secondary={selectedTask.metadata?.videoQuality || '未知'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="格式"
                      secondary={selectedTask.metadata?.selectedFormat || 'mp4'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="开始时间"
                      secondary={formatDateTime(selectedTask.startTime)}
                    />
                  </ListItem>
                  {selectedTask.endTime && (
                    <ListItem>
                      <ListItemText
                        primary="完成时间"
                        secondary={formatDateTime(selectedTask.endTime)}
                      />
                    </ListItem>
                  )}
                  {selectedTask.lastError && (
                    <ListItem>
                      <Alert severity="error">
                        {selectedTask.lastError}
                      </Alert>
                    </ListItem>
                  )}
                </List>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailDialogOpen(false)}>
                  关闭
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Container>
  );
};

export default HistoryPage;