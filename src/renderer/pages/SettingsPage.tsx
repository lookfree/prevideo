/**
 * Settings page component - full settings interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Button,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Subtitles as SubtitleIcon,
  VideoSettings as VideoIcon,
  NetworkCheck as NetworkIcon,
  Palette as ThemeIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Update as UpdateIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  RestoreOutlined as RestoreIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../shared/types/preferences';
import SubtitleSettings from '../components/SubtitleSettings';
import CompressionSettings from '../components/CompressionSettings';

type SettingsSection = 'general' | 'download' | 'subtitle' | 'compression' | 'network' | 'appearance' | 'storage' | 'update' | 'about';

const SettingsPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Storage statistics
  const [storageStats, setStorageStats] = useState({
    cacheSize: 0,
    tempSize: 0,
    historyCount: 0,
    totalDownloadSize: 0
  });

  // Update status
  const [updateStatus, setUpdateStatus] = useState({
    currentVersion: '1.0.0',
    latestVersion: null as string | null,
    updateAvailable: false,
    checking: false
  });

  useEffect(() => {
    loadPreferences();
    loadStorageStats();
    checkForUpdates();
  }, []);

  const loadPreferences = async () => {
    try {
      const result = await window.prevideo.settings.getPreferences();
      if (result.success) {
        setPreferences(result.data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      enqueueSnackbar('加载设置失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const result = await window.prevideo.system.getStorageInfo();
      if (result.success) {
        setStorageStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const checkForUpdates = async () => {
    setUpdateStatus(prev => ({ ...prev, checking: true }));
    try {
      const result = await window.prevideo.update.checkForUpdate();
      if (result.success) {
        setUpdateStatus(prev => ({
          ...prev,
          latestVersion: result.data.version,
          updateAvailable: result.data.available,
          checking: false
        }));
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setUpdateStatus(prev => ({ ...prev, checking: false }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.prevideo.settings.updatePreferences(preferences);
      if (result.success) {
        enqueueSnackbar('设置已保存', { variant: 'success' });
        setHasChanges(false);
      } else {
        enqueueSnackbar('保存设置失败', { variant: 'error' });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      enqueueSnackbar('保存设置失败', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('确定要恢复默认设置吗？')) {
      return;
    }

    setPreferences(DEFAULT_PREFERENCES);
    setHasChanges(true);
    enqueueSnackbar('已恢复默认设置，请保存以应用更改', { variant: 'info' });
  };

  const handleClearCache = async () => {
    try {
      const result = await window.prevideo.system.clearCache();
      if (result.success) {
        enqueueSnackbar('缓存已清除', { variant: 'success' });
        loadStorageStats();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      enqueueSnackbar('清除缓存失败', { variant: 'error' });
    }
  };

  const handleClearTemp = async () => {
    try {
      const result = await window.prevideo.system.clearTempFiles();
      if (result.success) {
        enqueueSnackbar('临时文件已清除', { variant: 'success' });
        loadStorageStats();
      }
    } catch (error) {
      console.error('Failed to clear temp files:', error);
      enqueueSnackbar('清除临时文件失败', { variant: 'error' });
    }
  };

  const handleExportSettings = async () => {
    try {
      const result = await window.prevideo.settings.exportSettings();
      if (result.success) {
        enqueueSnackbar(`设置已导出到 ${result.data}`, { variant: 'success' });
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      enqueueSnackbar('导出设置失败', { variant: 'error' });
    }
  };

  const handleImportSettings = async () => {
    try {
      const result = await window.prevideo.settings.importSettings();
      if (result.success) {
        enqueueSnackbar('设置已导入', { variant: 'success' });
        loadPreferences();
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      enqueueSnackbar('导入设置失败', { variant: 'error' });
    }
  };

  const menuItems = [
    { id: 'general', label: '常规', icon: <DownloadIcon /> },
    { id: 'download', label: '下载', icon: <DownloadIcon /> },
    { id: 'subtitle', label: '字幕', icon: <SubtitleIcon /> },
    { id: 'compression', label: '压缩', icon: <VideoIcon /> },
    { id: 'network', label: '网络', icon: <NetworkIcon /> },
    { id: 'appearance', label: '外观', icon: <ThemeIcon /> },
    { id: 'storage', label: '存储', icon: <StorageIcon /> },
    { id: 'update', label: '更新', icon: <UpdateIcon /> },
    { id: 'about', label: '关于', icon: <InfoIcon /> }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">
            设置
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
            >
              恢复默认
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              保存更改
            </Button>
          </Stack>
        </Box>

        {/* Content */}
        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper elevation={2}>
              <List>
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={activeSection === item.id}
                        onClick={() => setActiveSection(item.id as SettingsSection)}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            <Paper elevation={2} sx={{ p: 3, minHeight: 500 }}>
              {/* General Settings */}
              {activeSection === 'general' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    常规设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  <Alert severity="info" sx={{ mb: 3 }}>
                    配置视频下载的基本行为和默认选项。
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          快速设置
                        </Typography>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setActiveSection('download')}
                            endIcon={<ArrowIcon />}
                          >
                            配置下载选项
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setActiveSection('subtitle')}
                            endIcon={<ArrowIcon />}
                          >
                            配置字幕设置
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setActiveSection('compression')}
                            endIcon={<ArrowIcon />}
                          >
                            配置压缩设置
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          导入/导出设置
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            onClick={handleExportSettings}
                          >
                            导出设置
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleImportSettings}
                          >
                            导入设置
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Download Settings */}
              {activeSection === 'download' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    下载设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  {/* Reuse content from SettingsDialog */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    这些设置将应用于所有新的下载任务。
                  </Alert>
                </Box>
              )}

              {/* Subtitle Settings */}
              {activeSection === 'subtitle' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    字幕设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <SubtitleSettings
                    initialConfig={preferences.subtitleConfig}
                    onSave={(config) => {
                      setPreferences({ ...preferences, subtitleConfig: config });
                      setHasChanges(true);
                    }}
                  />
                </Box>
              )}

              {/* Compression Settings */}
              {activeSection === 'compression' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    压缩设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <CompressionSettings
                    initialConfig={preferences.compressionConfig}
                    onSave={(config) => {
                      setPreferences({ ...preferences, compressionConfig: config });
                      setHasChanges(true);
                    }}
                  />
                </Box>
              )}

              {/* Network Settings */}
              {activeSection === 'network' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    网络设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="info" sx={{ mb: 2 }}>
                    配置代理和网络相关选项。
                  </Alert>
                </Box>
              )}

              {/* Appearance Settings */}
              {activeSection === 'appearance' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    外观设置
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="info" sx={{ mb: 2 }}>
                    自定义应用程序的外观和显示选项。
                  </Alert>
                </Box>
              )}

              {/* Storage Settings */}
              {activeSection === 'storage' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    存储管理
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          缓存
                        </Typography>
                        <Typography variant="h4">
                          {formatBytes(storageStats.cacheSize)}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleClearCache}
                          sx={{ mt: 1 }}
                        >
                          清除缓存
                        </Button>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          临时文件
                        </Typography>
                        <Typography variant="h4">
                          {formatBytes(storageStats.tempSize)}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleClearTemp}
                          sx={{ mt: 1 }}
                        >
                          清除临时文件
                        </Button>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          历史记录
                        </Typography>
                        <Typography variant="h4">
                          {storageStats.historyCount} 条
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          总下载大小
                        </Typography>
                        <Typography variant="h4">
                          {formatBytes(storageStats.totalDownloadSize)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Update Settings */}
              {activeSection === 'update' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    更新
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      当前版本
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      v{updateStatus.currentVersion}
                    </Typography>

                    {updateStatus.checking ? (
                      <CircularProgress size={24} />
                    ) : updateStatus.updateAvailable ? (
                      <>
                        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                          新版本 v{updateStatus.latestVersion} 可用！
                        </Alert>
                        <Button variant="contained" color="primary">
                          立即更新
                        </Button>
                      </>
                    ) : (
                      <>
                        <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                          您正在使用最新版本
                        </Alert>
                        <Button variant="outlined" onClick={checkForUpdates}>
                          检查更新
                        </Button>
                      </>
                    )}
                  </Paper>
                </Box>
              )}

              {/* About */}
              {activeSection === 'about' && (
                <Box>
                  <Typography variant="h5" gutterBottom>
                    关于
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h3" gutterBottom>
                      PreVideo
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" paragraph>
                      版本 {updateStatus.currentVersion}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      一个功能强大的视频下载工具
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      支持双语字幕、视频压缩和批量下载
                    </Typography>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="body2" color="text.secondary">
                      基于 Electron、React、TypeScript 构建
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      使用 yt-dlp、ffmpeg、Whisper 等开源技术
                    </Typography>

                    <Alert severity="warning" sx={{ mt: 3, textAlign: 'left' }}>
                      <Typography variant="body2">
                        本软件仅供学习和个人使用。请遵守相关网站的服务条款和版权规定。
                        下载受版权保护的内容需要获得适当的授权。
                      </Typography>
                    </Alert>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Unsaved changes notification */}
        <Snackbar
          open={hasChanges}
          message="您有未保存的更改"
          action={
            <Button color="secondary" size="small" onClick={handleSave}>
              保存
            </Button>
          }
        />
      </Box>
    </Container>
  );
};

// Import missing function
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default SettingsPage;