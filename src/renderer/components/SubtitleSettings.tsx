/**
 * Subtitle settings component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Stack,
  TextField,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Slider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Subtitles as SubtitlesIcon,
  Language as LanguageIcon,
  Download as DownloadIcon,
  AutoAwesome as AutoAwesomeIcon,
  Translate as TranslateIcon,
  Settings as SettingsIcon,
  FormatColorText as FormatColorTextIcon,
  VerticalAlignTop as TopIcon,
  VerticalAlignBottom as BottomIcon,
  ViewColumn as SideBySideIcon,
  ViewStream as StackedIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  SubtitleGenerationOptions,
  EmbedSubtitleOptions,
  BilingualSubtitleConfig,
  SubtitleStyling
} from '../../shared/types/subtitle';

interface SubtitleSettingsProps {
  videoPath?: string;
  availableLanguages?: string[];
  onSubtitleGenerate?: (options: SubtitleGenerationOptions) => void;
  onBilingualCreate?: (config: BilingualSubtitleConfig) => void;
  onEmbedSubtitles?: (options: EmbedSubtitleOptions) => void;
}

const SubtitleSettings: React.FC<SubtitleSettingsProps> = ({
  videoPath,
  availableLanguages = [],
  onSubtitleGenerate,
  onBilingualCreate,
  onEmbedSubtitles
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // Generation settings
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [whisperModel, setWhisperModel] = useState<string>('base');
  const [detectLanguage, setDetectLanguage] = useState(true);
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
  const [translate, setTranslate] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');

  // Bilingual settings
  const [enableBilingual, setEnableBilingual] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState<string>('zh-CN');
  const [secondaryLanguage, setSecondaryLanguage] = useState<string>('en');
  const [layout, setLayout] = useState<'stacked' | 'side_by_side'>('stacked');

  // Styling settings
  const [primaryFontSize, setPrimaryFontSize] = useState<number>(24);
  const [secondaryFontSize, setSecondaryFontSize] = useState<number>(20);
  const [primaryColor, setPrimaryColor] = useState<string>('#FFFFFF');
  const [secondaryColor, setSecondaryColor] = useState<string>('#FFFF00');
  const [fontFamily, setFontFamily] = useState<string>('Microsoft YaHei');
  const [outline, setOutline] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.5);

  // Embed settings
  const [hardSub, setHardSub] = useState(false);

  // Available models
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    loadAvailableModels();
    loadUserPreferences();
  }, []);

  const loadAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const result = await window.prevideo.subtitle.listModels();
      if (result.success) {
        setAvailableModels(result.data);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const result = await window.prevideo.settings.getPreferences();
      if (result.success) {
        const prefs = result.data;
        setAutoGenerate(prefs.autoGenerateSubtitles);
        setPrimaryLanguage(prefs.defaultSubtitleLanguages?.[0] || 'zh-CN');
        setSecondaryLanguage(prefs.defaultSubtitleLanguages?.[1] || 'en');
        setLayout(prefs.subtitleLayout || 'stacked');

        if (prefs.subtitleStyling) {
          setPrimaryFontSize(prefs.subtitleStyling.fontSize || 24);
          setPrimaryColor(prefs.subtitleStyling.color || '#FFFFFF');
          setFontFamily(prefs.subtitleStyling.fontFamily || 'Microsoft YaHei');
          setBackgroundColor(prefs.subtitleStyling.backgroundColor || '#000000');
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleGenerateSubtitle = () => {
    if (!videoPath && !onSubtitleGenerate) {
      enqueueSnackbar('请先选择视频文件', { variant: 'warning' });
      return;
    }

    const options: SubtitleGenerationOptions = {
      language: detectLanguage ? undefined : sourceLanguage,
      model: whisperModel as any,
      translate,
      detectLanguage,
      task: translate ? 'translate' : 'transcribe',
      outputFormat: 'srt'
    };

    onSubtitleGenerate?.(options);
    enqueueSnackbar('开始生成字幕...', { variant: 'info' });
  };

  const handleCreateBilingual = () => {
    if (!enableBilingual) return;

    const config: BilingualSubtitleConfig = {
      primaryLanguage,
      secondaryLanguage,
      layout,
      primaryPosition: layout === 'stacked' ? 'bottom' : undefined,
      secondaryPosition: layout === 'stacked' ? 'top' : undefined,
      styling: {
        primaryFontSize,
        secondaryFontSize,
        primaryColor,
        secondaryColor,
        fontFamily,
        outline,
        shadow,
        backgroundColor,
        backgroundOpacity: backgroundOpacity / 100
      }
    };

    onBilingualCreate?.(config);
    enqueueSnackbar('创建双语字幕...', { variant: 'info' });
  };

  const handleDownloadModel = async (modelName: string) => {
    try {
      const result = await window.prevideo.subtitle.downloadModel(modelName);
      if (result.success) {
        enqueueSnackbar(`模型 ${modelName} 下载成功`, { variant: 'success' });
        await loadAvailableModels();
      } else {
        enqueueSnackbar(`模型下载失败: ${result.error}`, { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('模型下载失败', { variant: 'error' });
    }
  };

  const supportedLanguages = [
    { code: 'auto', name: '自动检测' },
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' }
  ];

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SubtitlesIcon />
          字幕设置
        </Typography>

        <Stack spacing={3}>
          {/* Auto Generation Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon fontSize="small" />
              自动生成字幕
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoGenerate}
                      onChange={(e) => setAutoGenerate(e.target.checked)}
                    />
                  }
                  label="当视频没有可用字幕时自动生成"
                />
              </Grid>

              {autoGenerate && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Whisper 模型</InputLabel>
                      <Select
                        value={whisperModel}
                        onChange={(e) => setWhisperModel(e.target.value)}
                        label="Whisper 模型"
                        disabled={loadingModels}
                        endAdornment={loadingModels && <CircularProgress size={20} />}
                      >
                        {availableModels.map((model) => (
                          <MenuItem key={model.name} value={model.name}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>{model.name}</span>
                              <Typography variant="caption" color="text.secondary">
                                {model.size}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>源语言</InputLabel>
                      <Select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        label="源语言"
                        disabled={detectLanguage}
                      >
                        {supportedLanguages.map((lang) => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={detectLanguage}
                            onChange={(e) => setDetectLanguage(e.target.checked)}
                          />
                        }
                        label="自动检测语言"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={translate}
                            onChange={(e) => setTranslate(e.target.checked)}
                          />
                        }
                        label="翻译为英语"
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={handleGenerateSubtitle}
                      disabled={!videoPath && !onSubtitleGenerate}
                    >
                      生成字幕
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Bilingual Subtitle Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TranslateIcon fontSize="small" />
              双语字幕
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableBilingual}
                      onChange={(e) => setEnableBilingual(e.target.checked)}
                    />
                  }
                  label="启用双语字幕"
                />
              </Grid>

              {enableBilingual && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>主字幕语言</InputLabel>
                      <Select
                        value={primaryLanguage}
                        onChange={(e) => setPrimaryLanguage(e.target.value)}
                        label="主字幕语言"
                      >
                        {availableLanguages.length > 0
                          ? availableLanguages.map((lang) => (
                              <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                            ))
                          : supportedLanguages.slice(1).map((lang) => (
                              <MenuItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </MenuItem>
                            ))
                        }
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>副字幕语言</InputLabel>
                      <Select
                        value={secondaryLanguage}
                        onChange={(e) => setSecondaryLanguage(e.target.value)}
                        label="副字幕语言"
                      >
                        {availableLanguages.length > 0
                          ? availableLanguages.map((lang) => (
                              <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                            ))
                          : supportedLanguages.slice(1).map((lang) => (
                              <MenuItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </MenuItem>
                            ))
                        }
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" gutterBottom>布局方式</Typography>
                    <ToggleButtonGroup
                      value={layout}
                      exclusive
                      onChange={(e, value) => value && setLayout(value)}
                      size="small"
                    >
                      <ToggleButton value="stacked">
                        <StackedIcon sx={{ mr: 1 }} />
                        上下排列
                      </ToggleButton>
                      <ToggleButton value="side_by_side">
                        <SideBySideIcon sx={{ mr: 1 }} />
                        左右并排
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider />

          {/* Styling Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormatColorTextIcon fontSize="small" />
              字幕样式
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom>主字幕大小</Typography>
                <Slider
                  value={primaryFontSize}
                  onChange={(e, value) => setPrimaryFontSize(value as number)}
                  min={12}
                  max={48}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 12, label: '12' },
                    { value: 24, label: '24' },
                    { value: 36, label: '36' },
                    { value: 48, label: '48' }
                  ]}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom>副字幕大小</Typography>
                <Slider
                  value={secondaryFontSize}
                  onChange={(e, value) => setSecondaryFontSize(value as number)}
                  min={12}
                  max={48}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 12, label: '12' },
                    { value: 24, label: '24' },
                    { value: 36, label: '36' },
                    { value: 48, label: '48' }
                  ]}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="主字幕颜色"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="副字幕颜色"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="背景颜色"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>字体</InputLabel>
                  <Select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    label="字体"
                  >
                    <MenuItem value="Microsoft YaHei">微软雅黑</MenuItem>
                    <MenuItem value="PingFang SC">苹方</MenuItem>
                    <MenuItem value="SimHei">黑体</MenuItem>
                    <MenuItem value="Arial">Arial</MenuItem>
                    <MenuItem value="Helvetica">Helvetica</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" gutterBottom>背景透明度</Typography>
                <Slider
                  value={backgroundOpacity}
                  onChange={(e, value) => setBackgroundOpacity(value as number)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={outline}
                        onChange={(e) => setOutline(e.target.checked)}
                      />
                    }
                    label="描边"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shadow}
                        onChange={(e) => setShadow(e.target.checked)}
                      />
                    }
                    label="阴影"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hardSub}
                        onChange={(e) => setHardSub(e.target.checked)}
                      />
                    }
                    label="硬字幕 (烧录到视频)"
                  />
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SubtitlesIcon />}
              onClick={handleCreateBilingual}
              disabled={!enableBilingual}
            >
              应用字幕设置
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default SubtitleSettings;