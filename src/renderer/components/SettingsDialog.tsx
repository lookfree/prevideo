/**
 * Settings dialog component
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  FormGroup,
  Typography,
  Divider,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Chip,
  Stack,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  RestoreOutlined as RestoreIcon,
  Language as LanguageIcon,
  Palette as ThemeIcon,
  Download as DownloadIcon,
  Subtitles as SubtitleIcon,
  VideoSettings as VideoIcon,
  NetworkCheck as ProxyIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../shared/types/preferences';
import SubtitleSettings from './SubtitleSettings';
import CompressionSettings from './CompressionSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Proxy settings
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyAuth, setProxyAuth] = useState(false);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  // Cookie paths
  const [cookiePaths, setCookiePaths] = useState<string[]>([]);
  const [newCookiePath, setNewCookiePath] = useState('');

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      const result = await window.prevideo.settings.getPreferences();
      if (result.success) {
        setPreferences(result.data);
        // Load proxy settings
        if (result.data.proxy) {
          setProxyEnabled(result.data.proxy.enabled);
          setProxyUrl(result.data.proxy.url || '');
          setProxyAuth(!!result.data.proxy.username);
          setProxyUsername(result.data.proxy.username || '');
          setProxyPassword(result.data.proxy.password || '');
        }
        // Load cookie paths
        setCookiePaths(result.data.cookiePaths || []);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      enqueueSnackbar('加载设置失败', { variant: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update proxy settings
      const updatedPreferences = {
        ...preferences,
        proxy: proxyEnabled ? {
          enabled: true,
          url: proxyUrl,
          username: proxyAuth ? proxyUsername : undefined,
          password: proxyAuth ? proxyPassword : undefined
        } : { enabled: false },
        cookiePaths
      };

      const result = await window.prevideo.settings.updatePreferences(updatedPreferences);
      if (result.success) {
        enqueueSnackbar('设置已保存', { variant: 'success' });
        setHasChanges(false);
        onClose();
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
    setPreferences(DEFAULT_PREFERENCES);
    setProxyEnabled(false);
    setProxyUrl('');
    setProxyAuth(false);
    setProxyUsername('');
    setProxyPassword('');
    setCookiePaths([]);
    setHasChanges(true);
  };

  const handleSelectDirectory = async (field: 'defaultOutputPath' | 'tempPath') => {
    try {
      const result = await window.prevideo.settings.selectDirectory();
      if (result.success) {
        setPreferences({ ...preferences, [field]: result.data });
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleAddCookiePath = async () => {
    if (newCookiePath) {
      setCookiePaths([...cookiePaths, newCookiePath]);
      setNewCookiePath('');
      setHasChanges(true);
    } else {
      // Select cookie file
      try {
        const result = await window.prevideo.settings.selectFile({
          filters: [
            { name: 'Cookie Files', extensions: ['txt', 'json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        if (result.success) {
          setCookiePaths([...cookiePaths, result.data]);
          setHasChanges(true);
        }
      } catch (error) {
        console.error('Failed to select cookie file:', error);
      }
    }
  };

  const handleRemoveCookiePath = (index: number) => {
    const newPaths = [...cookiePaths];
    newPaths.splice(index, 1);
    setCookiePaths(newPaths);
    setHasChanges(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">设置</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'hidden', p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<DownloadIcon />} label="下载" />
            <Tab icon={<SubtitleIcon />} label="字幕" />
            <Tab icon={<VideoIcon />} label="压缩" />
            <Tab icon={<ProxyIcon />} label="网络" />
            <Tab icon={<ThemeIcon />} label="外观" />
            <Tab icon={<InfoIcon />} label="关于" />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {/* Download Settings */}
          <TabPanel value={currentTab} index={0}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  默认下载路径
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={preferences.defaultOutputPath}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => handleSelectDirectory('defaultOutputPath')}>
                          <FolderIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  onChange={(e) => {
                    setPreferences({ ...preferences, defaultOutputPath: e.target.value });
                    setHasChanges(true);
                  }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  临时文件路径
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={preferences.tempPath}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => handleSelectDirectory('tempPath')}>
                          <FolderIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  onChange={(e) => {
                    setPreferences({ ...preferences, tempPath: e.target.value });
                    setHasChanges(true);
                  }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  默认视频质量
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={preferences.defaultQuality}
                    onChange={(e) => {
                      setPreferences({ ...preferences, defaultQuality: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="best">最佳质量</MenuItem>
                    <MenuItem value="2160p">4K (2160p)</MenuItem>
                    <MenuItem value="1440p">2K (1440p)</MenuItem>
                    <MenuItem value="1080p">全高清 (1080p)</MenuItem>
                    <MenuItem value="720p">高清 (720p)</MenuItem>
                    <MenuItem value="480p">标清 (480p)</MenuItem>
                    <MenuItem value="360p">流畅 (360p)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  默认输出格式
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={preferences.defaultFormat}
                    onChange={(e) => {
                      setPreferences({ ...preferences, defaultFormat: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="mp4">MP4</MenuItem>
                    <MenuItem value="webm">WebM</MenuItem>
                    <MenuItem value="mkv">MKV</MenuItem>
                    <MenuItem value="mov">MOV</MenuItem>
                    <MenuItem value="avi">AVI</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  下载选项
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.autoStartDownload}
                        onChange={(e) => {
                          setPreferences({ ...preferences, autoStartDownload: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="自动开始下载"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.enableResume}
                        onChange={(e) => {
                          setPreferences({ ...preferences, enableResume: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="启用断点续传"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.embedThumbnail}
                        onChange={(e) => {
                          setPreferences({ ...preferences, embedThumbnail: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="嵌入缩略图"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.embedMetadata}
                        onChange={(e) => {
                          setPreferences({ ...preferences, embedMetadata: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="嵌入元数据"
                  />
                </FormGroup>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  最大并发下载数
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={preferences.maxConcurrentDownloads}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      maxConcurrentDownloads: parseInt(e.target.value) || 3
                    });
                    setHasChanges(true);
                  }}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  速度限制 (KB/s，0为不限制)
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={preferences.rateLimit}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      rateLimit: parseInt(e.target.value) || 0
                    });
                    setHasChanges(true);
                  }}
                  inputProps={{ min: 0 }}
                />
              </Box>
            </Stack>
          </TabPanel>

          {/* Subtitle Settings */}
          <TabPanel value={currentTab} index={1}>
            <SubtitleSettings
              initialConfig={preferences.subtitleConfig}
              onSave={(config) => {
                setPreferences({ ...preferences, subtitleConfig: config });
                setHasChanges(true);
              }}
            />
          </TabPanel>

          {/* Compression Settings */}
          <TabPanel value={currentTab} index={2}>
            <CompressionSettings
              initialConfig={preferences.compressionConfig}
              onSave={(config) => {
                setPreferences({ ...preferences, compressionConfig: config });
                setHasChanges(true);
              }}
            />
          </TabPanel>

          {/* Network Settings */}
          <TabPanel value={currentTab} index={3}>
            <Stack spacing={3}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={proxyEnabled}
                      onChange={(e) => {
                        setProxyEnabled(e.target.checked);
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="启用代理"
                />
              </Box>

              {proxyEnabled && (
                <>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      代理地址
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="http://proxy.example.com:8080"
                      value={proxyUrl}
                      onChange={(e) => {
                        setProxyUrl(e.target.value);
                        setHasChanges(true);
                      }}
                    />
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={proxyAuth}
                          onChange={(e) => {
                            setProxyAuth(e.target.checked);
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="代理认证"
                    />
                  </Box>

                  {proxyAuth && (
                    <>
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          用户名
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          value={proxyUsername}
                          onChange={(e) => {
                            setProxyUsername(e.target.value);
                            setHasChanges(true);
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          密码
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="password"
                          value={proxyPassword}
                          onChange={(e) => {
                            setProxyPassword(e.target.value);
                            setHasChanges(true);
                          }}
                        />
                      </Box>
                    </>
                  )}
                </>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Cookie 文件
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                  添加Cookie文件以下载需要登录的视频
                </Typography>

                <List>
                  {cookiePaths.map((path, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={path.split('/').pop()}
                        secondary={path}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveCookiePath(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Cookie文件路径"
                    value={newCookiePath}
                    onChange={(e) => setNewCookiePath(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddCookiePath}
                    startIcon={<AddIcon />}
                  >
                    添加
                  </Button>
                </Box>
              </Box>
            </Stack>
          </TabPanel>

          {/* Appearance Settings */}
          <TabPanel value={currentTab} index={4}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  主题
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={preferences.theme}
                    onChange={(e) => {
                      setPreferences({ ...preferences, theme: e.target.value as any });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="light">浅色</MenuItem>
                    <MenuItem value="dark">深色</MenuItem>
                    <MenuItem value="system">跟随系统</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  语言
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={preferences.language}
                    onChange={(e) => {
                      setPreferences({ ...preferences, language: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="zh-CN">简体中文</MenuItem>
                    <MenuItem value="zh-TW">繁體中文</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="ja">日本語</MenuItem>
                    <MenuItem value="ko">한국어</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  显示选项
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.showNotifications}
                        onChange={(e) => {
                          setPreferences({ ...preferences, showNotifications: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="显示通知"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.minimizeToTray}
                        onChange={(e) => {
                          setPreferences({ ...preferences, minimizeToTray: e.target.checked });
                          setHasChanges(true);
                        }}
                      />
                    }
                    label="最小化到系统托盘"
                  />
                </FormGroup>
              </Box>
            </Stack>
          </TabPanel>

          {/* About */}
          <TabPanel value={currentTab} index={5}>
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                  PreVideo
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  版本 1.0.0
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  一个功能强大的视频下载工具，支持双语字幕和视频压缩
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Chip label="Electron" size="small" />
                  <Chip label="React" size="small" />
                  <Chip label="TypeScript" size="small" />
                  <Chip label="yt-dlp" size="small" />
                  <Chip label="ffmpeg" size="small" />
                </Stack>
              </Paper>

              <Alert severity="info">
                本软件基于开源技术构建，仅供学习和个人使用。请遵守相关网站的服务条款和版权规定。
              </Alert>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  快捷键
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="新建下载"
                      secondary="Ctrl/Cmd + N"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="打开设置"
                      secondary="Ctrl/Cmd + ,"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="退出应用"
                      secondary="Ctrl/Cmd + Q"
                    />
                  </ListItem>
                </List>
              </Box>
            </Stack>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} startIcon={<RestoreIcon />}>
          恢复默认
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges || saving}
          startIcon={<SaveIcon />}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;