import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Link,
  Box,
  Alert,
  IconButton
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose, isFirstTime = false }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 加载已保存的API Key
    if (open && window.electronAPI) {
      loadApiKey();
    }
  }, [open]);

  const loadApiKey = async () => {
    try {
      const settings = await window.electronAPI.storage.getSettings();
      if (settings.deepseekApiKey) {
        setApiKey(settings.deepseekApiKey);
      }
    } catch (error) {
      console.error('加载API Key失败:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('请输入API Key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('API Key格式不正确，应以 sk- 开头');
      return;
    }

    try {
      // 保存到存储
      await window.electronAPI.storage.updateSettings({
        deepseekApiKey: apiKey.trim()
      });

      setSuccess(true);
      setError('');

      // 延迟关闭对话框
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (error) {
      setError('保存失败，请重试');
      console.error('保存API Key失败:', error);
    }
  };

  const handleCancel = () => {
    if (isFirstTime && !apiKey) {
      setError('首次使用需要配置API Key才能使用字幕翻译功能');
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isFirstTime}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SettingsIcon sx={{ mr: 1 }} />
          {isFirstTime ? '欢迎使用PreVideo - 配置DeepSeek API' : 'DeepSeek API 设置'}
        </Box>
      </DialogTitle>

      <DialogContent>
        {isFirstTime && (
          <Alert severity="info" sx={{ mb: 2 }}>
            首次使用需要配置DeepSeek API Key才能使用中文字幕翻译功能
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2 }}>
          DeepSeek API 用于将英文字幕高质量翻译成中文。
          您需要先获取API Key才能使用翻译功能。
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            如何获取API Key：
          </Typography>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>访问 <Link href="https://platform.deepseek.com/" target="_blank">DeepSeek Platform</Link></li>
            <li>注册或登录账号</li>
            <li>在控制台创建API Key</li>
            <li>复制API Key到下方输入框</li>
          </ol>
        </Box>

        <TextField
          fullWidth
          label="DeepSeek API Key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError('');
          }}
          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          type={showApiKey ? 'text' : 'password'}
          error={!!error}
          helperText={error || '请输入您的DeepSeek API Key'}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => setShowApiKey(!showApiKey)}
                edge="end"
                size="small"
              >
                {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            )
          }}
        />

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            API Key 保存成功！
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          提示：API Key 将安全地保存在本地，不会上传到任何服务器。
        </Typography>
      </DialogContent>

      <DialogActions>
        {!isFirstTime && (
          <Button onClick={handleCancel} color="inherit">
            取消
          </Button>
        )}
        <Button onClick={handleSave} variant="contained" disabled={!apiKey.trim()}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;