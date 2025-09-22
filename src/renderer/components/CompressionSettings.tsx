/**
 * Video compression settings component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  RestoreOutlined as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  HighQuality as QualityIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { CompressionConfig, CompressionPreset, VideoCodec, AudioCodec } from '../../shared/types/compression';

interface CompressionSettingsProps {
  onSave?: (config: CompressionConfig) => void;
  initialConfig?: CompressionConfig;
  showPreview?: boolean;
}

const CompressionSettings: React.FC<CompressionSettingsProps> = ({
  onSave,
  initialConfig,
  showPreview = true
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Basic settings
  const [preset, setPreset] = useState<CompressionPreset>(
    initialConfig?.preset || CompressionPreset.BALANCED
  );
  const [customBitrate, setCustomBitrate] = useState<number>(
    initialConfig?.videoBitrate || 2000
  );
  const [resolution, setResolution] = useState<string>(
    initialConfig?.resolution || 'original'
  );
  const [fps, setFps] = useState<number>(
    initialConfig?.fps || 30
  );

  // Advanced settings
  const [videoCodec, setVideoCodec] = useState<VideoCodec>(
    initialConfig?.videoCodec || VideoCodec.H264
  );
  const [audioCodec, setAudioCodec] = useState<AudioCodec>(
    initialConfig?.audioCodec || AudioCodec.AAC
  );
  const [audioBitrate, setAudioBitrate] = useState<number>(
    initialConfig?.audioBitrate || 128
  );
  const [crf, setCrf] = useState<number>(
    initialConfig?.crf || 23
  );
  const [twoPass, setTwoPass] = useState<boolean>(
    initialConfig?.twoPass || false
  );
  const [hardwareAccel, setHardwareAccel] = useState<boolean>(
    initialConfig?.hardwareAcceleration || false
  );
  const [keepMetadata, setKeepMetadata] = useState<boolean>(
    initialConfig?.keepMetadata || true
  );

  // File size estimation
  const [estimatedSize, setEstimatedSize] = useState<string>('');
  const [compressionRatio, setCompressionRatio] = useState<number>(0);

  useEffect(() => {
    updateEstimation();
  }, [preset, customBitrate, resolution, fps, videoCodec, audioBitrate]);

  useEffect(() => {
    // Apply preset settings
    switch (preset) {
      case CompressionPreset.HIGH_QUALITY:
        setCustomBitrate(5000);
        setCrf(18);
        setAudioBitrate(192);
        setTwoPass(true);
        break;
      case CompressionPreset.BALANCED:
        setCustomBitrate(2000);
        setCrf(23);
        setAudioBitrate(128);
        setTwoPass(false);
        break;
      case CompressionPreset.SMALL_SIZE:
        setCustomBitrate(800);
        setCrf(28);
        setAudioBitrate(96);
        setTwoPass(false);
        break;
      case CompressionPreset.MOBILE:
        setCustomBitrate(1200);
        setCrf(25);
        setAudioBitrate(96);
        setResolution('720p');
        break;
      case CompressionPreset.WEB:
        setCustomBitrate(1500);
        setCrf(24);
        setAudioBitrate(128);
        setVideoCodec(VideoCodec.H264);
        break;
    }
  }, [preset]);

  const updateEstimation = () => {
    // Rough estimation based on bitrate and duration
    const videoBitrateKbps = customBitrate;
    const audioBitrateKbps = audioBitrate;
    const totalBitrateKbps = videoBitrateKbps + audioBitrateKbps;

    // Assume 10 minute video for estimation
    const durationSeconds = 600;
    const estimatedSizeBytes = (totalBitrateKbps * durationSeconds * 1000) / 8;
    const estimatedSizeMB = estimatedSizeBytes / (1024 * 1024);

    setEstimatedSize(`~${estimatedSizeMB.toFixed(0)} MB (10分钟视频)`);

    // Calculate compression ratio based on original size assumption
    const originalSizeMB = 500; // Assume original is 500MB for 10min
    const ratio = ((originalSizeMB - estimatedSizeMB) / originalSizeMB) * 100;
    setCompressionRatio(Math.max(0, ratio));
  };

  const handleSave = () => {
    const config: CompressionConfig = {
      preset,
      videoBitrate: customBitrate,
      audioBitrate,
      resolution,
      fps,
      videoCodec,
      audioCodec,
      crf,
      twoPass,
      hardwareAcceleration: hardwareAccel,
      keepMetadata,
      outputFormat: 'mp4'
    };

    onSave?.(config);
  };

  const handleReset = () => {
    setPreset(CompressionPreset.BALANCED);
    setCustomBitrate(2000);
    setResolution('original');
    setFps(30);
    setVideoCodec(VideoCodec.H264);
    setAudioCodec(AudioCodec.AAC);
    setAudioBitrate(128);
    setCrf(23);
    setTwoPass(false);
    setHardwareAccel(false);
    setKeepMetadata(true);
  };

  const getPresetInfo = (preset: CompressionPreset): { icon: React.ReactNode; description: string } => {
    switch (preset) {
      case CompressionPreset.HIGH_QUALITY:
        return {
          icon: <QualityIcon />,
          description: '最高质量，文件较大，适合收藏'
        };
      case CompressionPreset.BALANCED:
        return {
          icon: <SettingsIcon />,
          description: '平衡质量与大小，适合日常使用'
        };
      case CompressionPreset.SMALL_SIZE:
        return {
          icon: <StorageIcon />,
          description: '最小文件，质量降低，适合存储受限'
        };
      case CompressionPreset.MOBILE:
        return {
          icon: <SpeedIcon />,
          description: '移动设备优化，720p分辨率'
        };
      case CompressionPreset.WEB:
        return {
          icon: <SettingsIcon />,
          description: 'Web播放优化，兼容性最佳'
        };
      default:
        return {
          icon: <SettingsIcon />,
          description: '自定义设置'
        };
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">
          压缩设置
        </Typography>
        <IconButton onClick={handleReset} size="small">
          <Tooltip title="恢复默认">
            <RestoreIcon />
          </Tooltip>
        </IconButton>
      </Box>

      {/* Preset Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          压缩预设
        </Typography>
        <Grid container spacing={1}>
          {Object.values(CompressionPreset).map((p) => {
            const info = getPresetInfo(p);
            return (
              <Grid item xs={12} sm={6} md={4} key={p}>
                <Paper
                  variant={preset === p ? 'elevation' : 'outlined'}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: preset === p ? '2px solid' : undefined,
                    borderColor: 'primary.main',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onClick={() => setPreset(p)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {info.icon}
                    <Typography variant="subtitle2" sx={{ ml: 1 }}>
                      {p === CompressionPreset.HIGH_QUALITY && '高质量'}
                      {p === CompressionPreset.BALANCED && '平衡'}
                      {p === CompressionPreset.SMALL_SIZE && '小文件'}
                      {p === CompressionPreset.MOBILE && '移动设备'}
                      {p === CompressionPreset.WEB && 'Web优化'}
                      {p === CompressionPreset.CUSTOM && '自定义'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {info.description}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Basic Settings */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>分辨率</InputLabel>
            <Select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              label="分辨率"
            >
              <MenuItem value="original">原始分辨率</MenuItem>
              <MenuItem value="2160p">4K (2160p)</MenuItem>
              <MenuItem value="1440p">2K (1440p)</MenuItem>
              <MenuItem value="1080p">全高清 (1080p)</MenuItem>
              <MenuItem value="720p">高清 (720p)</MenuItem>
              <MenuItem value="480p">标清 (480p)</MenuItem>
              <MenuItem value="360p">流畅 (360p)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>帧率</InputLabel>
            <Select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              label="帧率"
            >
              <MenuItem value={0}>原始帧率</MenuItem>
              <MenuItem value={24}>24 fps</MenuItem>
              <MenuItem value={25}>25 fps</MenuItem>
              <MenuItem value={30}>30 fps</MenuItem>
              <MenuItem value={50}>50 fps</MenuItem>
              <MenuItem value={60}>60 fps</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Typography gutterBottom>
            视频码率: {customBitrate} kbps
          </Typography>
          <Slider
            value={customBitrate}
            onChange={(e, value) => setCustomBitrate(value as number)}
            min={100}
            max={10000}
            step={100}
            marks={[
              { value: 500, label: '500' },
              { value: 2000, label: '2000' },
              { value: 5000, label: '5000' },
              { value: 8000, label: '8000' }
            ]}
            valueLabelDisplay="auto"
          />
        </Grid>
      </Grid>

      {/* Advanced Settings */}
      <Box sx={{ mt: 3 }}>
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          size="small"
        >
          高级设置
        </Button>

        <Collapse in={showAdvanced}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>视频编码</InputLabel>
                  <Select
                    value={videoCodec}
                    onChange={(e) => setVideoCodec(e.target.value as VideoCodec)}
                    label="视频编码"
                  >
                    <MenuItem value={VideoCodec.H264}>H.264 (兼容性最佳)</MenuItem>
                    <MenuItem value={VideoCodec.H265}>H.265/HEVC (更高压缩率)</MenuItem>
                    <MenuItem value={VideoCodec.VP9}>VP9 (Web优化)</MenuItem>
                    <MenuItem value={VideoCodec.AV1}>AV1 (最新技术)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>音频编码</InputLabel>
                  <Select
                    value={audioCodec}
                    onChange={(e) => setAudioCodec(e.target.value as AudioCodec)}
                    label="音频编码"
                  >
                    <MenuItem value={AudioCodec.AAC}>AAC (推荐)</MenuItem>
                    <MenuItem value={AudioCodec.MP3}>MP3</MenuItem>
                    <MenuItem value={AudioCodec.OPUS}>Opus (高质量)</MenuItem>
                    <MenuItem value={AudioCodec.COPY}>复制原始音频</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  音频码率: {audioBitrate} kbps
                </Typography>
                <Slider
                  value={audioBitrate}
                  onChange={(e, value) => setAudioBitrate(value as number)}
                  min={32}
                  max={320}
                  step={32}
                  marks={[
                    { value: 64, label: '64' },
                    { value: 128, label: '128' },
                    { value: 192, label: '192' },
                    { value: 256, label: '256' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  CRF (质量因子): {crf}
                  <Tooltip title="数值越小质量越高，文件越大">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Slider
                  value={crf}
                  onChange={(e, value) => setCrf(value as number)}
                  min={0}
                  max={51}
                  step={1}
                  marks={[
                    { value: 0, label: '无损' },
                    { value: 18, label: '高' },
                    { value: 23, label: '推荐' },
                    { value: 28, label: '可接受' },
                    { value: 51, label: '最低' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={twoPass}
                      onChange={(e) => setTwoPass(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      两次编码
                      <Typography variant="caption" color="text.secondary" display="block">
                        提高质量但耗时更长
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={hardwareAccel}
                      onChange={(e) => setHardwareAccel(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      硬件加速
                      <Typography variant="caption" color="text.secondary" display="block">
                        使用GPU加速编码（需要兼容硬件）
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={keepMetadata}
                      onChange={(e) => setKeepMetadata(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      保留元数据
                      <Typography variant="caption" color="text.secondary" display="block">
                        保留原始视频的标题、作者等信息
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>

      {/* Preview */}
      {showPreview && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              预估信息
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip
                icon={<StorageIcon />}
                label={`预估大小: ${estimatedSize}`}
                variant="outlined"
                color="primary"
              />
              <Chip
                icon={<SpeedIcon />}
                label={`压缩率: ~${compressionRatio.toFixed(0)}%`}
                variant="outlined"
                color={compressionRatio > 50 ? 'success' : 'default'}
              />
              {twoPass && (
                <Chip
                  label="两次编码"
                  variant="outlined"
                  color="warning"
                />
              )}
              {hardwareAccel && (
                <Chip
                  label="硬件加速"
                  variant="outlined"
                  color="info"
                />
              )}
            </Stack>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            实际文件大小取决于视频内容复杂度和时长。预估值仅供参考。
          </Alert>
        </>
      )}

      {/* Save Button */}
      {onSave && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<SettingsIcon />}
          >
            保存设置
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default CompressionSettings;