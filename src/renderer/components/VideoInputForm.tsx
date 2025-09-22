/**
 * Video input form component
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Collapse,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentPaste as PasteIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { VideoInfo } from '../../shared/types/video';
import { DownloadOptions } from '../../shared/types/tasks';

interface VideoInputFormProps {
  onStartDownload: (url: string, options: DownloadOptions) => Promise<void>;
}

const VideoInputForm: React.FC<VideoInputFormProps> = ({ onStartDownload }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // Download options
  const [quality, setQuality] = useState<string>('best');
  const [outputPath, setOutputPath] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>([]);
  const [format, setFormat] = useState<string>('mp4');

  const handlePaste = async () => {
    try {
      const clipboard = await window.prevideo.system.readClipboard();
      if (clipboard.data?.text) {
        setUrl(clipboard.data.text);
        enqueueSnackbar('已粘贴链接', { variant: 'info' });
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleClear = () => {
    setUrl('');
    setVideoInfo(null);
    setShowOptions(false);
  };

  const validateUrl = (url: string): boolean => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|bilibili\.com)/;
    return pattern.test(url);
  };

  const fetchVideoInfo = async () => {
    if (!url) {
      enqueueSnackbar('请输入视频链接', { variant: 'warning' });
      return;
    }

    if (!validateUrl(url)) {
      enqueueSnackbar('不支持的视频链接', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const result = await window.prevideo.video.fetchInfo(url);
      if (result.success) {
        setVideoInfo(result.data);
        setShowOptions(true);

        // Load default output path
        const preferences = await window.prevideo.settings.getPreferences();
        if (preferences.success) {
          setOutputPath(preferences.data.defaultOutputPath);
          setQuality(preferences.data.defaultQuality);
          setFormat(preferences.data.defaultFormat);
          setSubtitleLanguages(preferences.data.defaultSubtitleLanguages || []);
        }

        enqueueSnackbar('视频信息获取成功', { variant: 'success' });
      } else {
        enqueueSnackbar(result.error || '获取视频信息失败', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('获取视频信息失败', { variant: 'error' });
      console.error('Failed to fetch video info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutputPath = async () => {
    try {
      const result = await window.prevideo.settings.selectDirectory();
      if (result.success) {
        setOutputPath(result.data);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    const options: DownloadOptions = {
      quality,
      outputPath,
      filename: filename || undefined,
      subtitleLanguages: subtitleLanguages.length > 0 ? subtitleLanguages : undefined,
      preferredFormat: format
    };

    try {
      await onStartDownload(url, options);
      enqueueSnackbar('下载任务已开始', { variant: 'success' });
      handleClear();
    } catch (error) {
      enqueueSnackbar('启动下载失败', { variant: 'error' });
      console.error('Failed to start download:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '未知';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          输入视频链接
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="粘贴YouTube、Bilibili等视频链接..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchVideoInfo();
              }
            }}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <>
                  <IconButton onClick={handlePaste} size="small" disabled={loading}>
                    <PasteIcon />
                  </IconButton>
                  {url && (
                    <IconButton onClick={handleClear} size="small" disabled={loading}>
                      <ClearIcon />
                    </IconButton>
                  )}
                </>
              )
            }}
          />
          <Button
            variant="contained"
            onClick={fetchVideoInfo}
            disabled={loading || !url}
            startIcon={loading ? <CircularProgress size={20} /> : <InfoIcon />}
          >
            获取信息
          </Button>
        </Box>

        <Collapse in={!!videoInfo && showOptions}>
          {videoInfo && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    {videoInfo.thumbnail && (
                      <Box className="video-thumbnail">
                        <img src={videoInfo.thumbnail} alt={videoInfo.title} />
                        <span className="video-duration">
                          {formatDuration(videoInfo.duration)}
                        </span>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom className="text-ellipsis">
                      {videoInfo.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      作者: {videoInfo.author}
                    </Typography>
                    {videoInfo.viewCount && (
                      <Typography variant="body2" color="text.secondary">
                        观看次数: {videoInfo.viewCount.toLocaleString()}
                      </Typography>
                    )}
                    {videoInfo.availableFormats.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          label={`${videoInfo.availableFormats.length} 个可用格式`}
                          size="small"
                          color="primary"
                        />
                        {videoInfo.availableSubtitles.length > 0 && (
                          <Chip
                            label={`${videoInfo.availableSubtitles.length} 种字幕`}
                            size="small"
                            color="secondary"
                          />
                        )}
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                下载选项
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>视频质量</InputLabel>
                    <Select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      label="视频质量"
                    >
                      <MenuItem value="best">最佳质量</MenuItem>
                      <MenuItem value="2160p">4K (2160p)</MenuItem>
                      <MenuItem value="1440p">2K (1440p)</MenuItem>
                      <MenuItem value="1080p">全高清 (1080p)</MenuItem>
                      <MenuItem value="720p">高清 (720p)</MenuItem>
                      <MenuItem value="480p">标清 (480p)</MenuItem>
                      <MenuItem value="360p">流畅 (360p)</MenuItem>
                      <MenuItem value="worst">最小文件</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>输出格式</InputLabel>
                    <Select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      label="输出格式"
                    >
                      <MenuItem value="mp4">MP4</MenuItem>
                      <MenuItem value="webm">WebM</MenuItem>
                      <MenuItem value="mkv">MKV</MenuItem>
                      <MenuItem value="mov">MOV</MenuItem>
                      <MenuItem value="avi">AVI</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="输出路径"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <IconButton onClick={handleSelectOutputPath} size="small">
                            <FolderIcon />
                          </IconButton>
                        )
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="文件名 (可选)"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="留空使用原始标题"
                  />
                </Grid>

                {videoInfo.availableSubtitles.length > 0 && (
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>下载字幕</InputLabel>
                      <Select
                        multiple
                        value={subtitleLanguages}
                        onChange={(e) => setSubtitleLanguages(e.target.value as string[])}
                        label="下载字幕"
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {videoInfo.availableSubtitles.map((lang) => (
                          <MenuItem key={lang} value={lang}>
                            {lang}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowOptions(false)}
                    >
                      取消
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleDownload}
                      startIcon={<DownloadIcon />}
                      disabled={!outputPath}
                    >
                      开始下载
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
};

export default VideoInputForm;