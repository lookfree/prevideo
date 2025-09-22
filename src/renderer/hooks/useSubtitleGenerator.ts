/**
 * Custom hook for subtitle generation
 */

import { useState, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { SubtitleConfig, GeneratedSubtitle } from '../../shared/types/subtitle';

interface SubtitleGeneratorState {
  isGenerating: boolean;
  progress: number;
  currentFile: string | null;
  error: string | null;
  generatedSubtitles: GeneratedSubtitle[];
}

interface SubtitleGeneratorActions {
  generateSubtitles: (videoPath: string, config: SubtitleConfig) => Promise<GeneratedSubtitle[]>;
  embedSubtitles: (videoPath: string, subtitles: GeneratedSubtitle[], outputPath: string) => Promise<void>;
  cancelGeneration: () => void;
  clearError: () => void;
}

export function useSubtitleGenerator(): SubtitleGeneratorState & SubtitleGeneratorActions {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<SubtitleGeneratorState>({
    isGenerating: false,
    progress: 0,
    currentFile: null,
    error: null,
    generatedSubtitles: []
  });

  const generateSubtitles = useCallback(async (
    videoPath: string,
    config: SubtitleConfig
  ): Promise<GeneratedSubtitle[]> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      currentFile: videoPath,
      error: null
    }));

    try {
      // Subscribe to progress updates
      const unsubscribe = window.prevideo.subtitle.onProgress((data) => {
        setState(prev => ({
          ...prev,
          progress: data.progress
        }));
      });

      const result = await window.prevideo.subtitle.generate(videoPath, config);

      unsubscribe();

      if (result.success) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          progress: 100,
          generatedSubtitles: result.data,
          currentFile: null
        }));

        enqueueSnackbar(`生成了 ${result.data.length} 个字幕文件`, { variant: 'success' });
        return result.data;
      } else {
        throw new Error(result.error || '字幕生成失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '字幕生成失败';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 0,
        error: message,
        currentFile: null
      }));
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const embedSubtitles = useCallback(async (
    videoPath: string,
    subtitles: GeneratedSubtitle[],
    outputPath: string
  ): Promise<void> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      currentFile: videoPath,
      error: null
    }));

    try {
      const result = await window.prevideo.subtitle.embed(videoPath, subtitles, outputPath);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          currentFile: null
        }));
        enqueueSnackbar('字幕嵌入成功', { variant: 'success' });
      } else {
        throw new Error(result.error || '字幕嵌入失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '字幕嵌入失败';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: message,
        currentFile: null
      }));
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const cancelGeneration = useCallback(() => {
    // Send cancel signal to backend
    window.prevideo.subtitle.cancel();

    setState(prev => ({
      ...prev,
      isGenerating: false,
      progress: 0,
      currentFile: null
    }));

    enqueueSnackbar('字幕生成已取消', { variant: 'info' });
  }, [enqueueSnackbar]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    generateSubtitles,
    embedSubtitles,
    cancelGeneration,
    clearError
  };
}