/**
 * Custom hook for video compression
 */

import { useState, useCallback, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { CompressionConfig, CompressionResult } from '../../shared/types/compression';

interface VideoCompressorState {
  isCompressing: boolean;
  progress: number;
  currentFile: string | null;
  estimatedTime: number;
  compressionRate: number;
  error: string | null;
  result: CompressionResult | null;
}

interface VideoCompressorActions {
  compressVideo: (inputPath: string, outputPath: string, config: CompressionConfig) => Promise<CompressionResult>;
  cancelCompression: () => void;
  estimateSize: (inputPath: string, config: CompressionConfig) => Promise<number>;
  clearError: () => void;
}

export function useVideoCompressor(): VideoCompressorState & VideoCompressorActions {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<VideoCompressorState>({
    isCompressing: false,
    progress: 0,
    currentFile: null,
    estimatedTime: 0,
    compressionRate: 0,
    error: null,
    result: null
  });

  const compressionTaskRef = useRef<string | null>(null);

  const compressVideo = useCallback(async (
    inputPath: string,
    outputPath: string,
    config: CompressionConfig
  ): Promise<CompressionResult> => {
    setState(prev => ({
      ...prev,
      isCompressing: true,
      progress: 0,
      currentFile: inputPath,
      estimatedTime: 0,
      compressionRate: 0,
      error: null,
      result: null
    }));

    try {
      // Subscribe to progress updates
      const unsubscribe = window.prevideo.compression.onProgress((data) => {
        setState(prev => ({
          ...prev,
          progress: data.progress,
          estimatedTime: data.eta,
          compressionRate: data.compressionRate
        }));
      });

      const result = await window.prevideo.compression.compress(inputPath, outputPath, config);

      unsubscribe();

      if (result.success) {
        const compressionResult: CompressionResult = {
          inputSize: result.data.inputSize,
          outputSize: result.data.outputSize,
          compressionRatio: result.data.compressionRatio,
          duration: result.data.duration,
          outputPath: result.data.outputPath
        };

        setState(prev => ({
          ...prev,
          isCompressing: false,
          progress: 100,
          currentFile: null,
          result: compressionResult
        }));

        const savedMB = ((compressionResult.inputSize - compressionResult.outputSize) / (1024 * 1024)).toFixed(1);
        enqueueSnackbar(
          `压缩完成！节省了 ${savedMB} MB (${(compressionResult.compressionRatio * 100).toFixed(1)}%)`,
          { variant: 'success' }
        );

        return compressionResult;
      } else {
        throw new Error(result.error || '视频压缩失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '视频压缩失败';
      setState(prev => ({
        ...prev,
        isCompressing: false,
        progress: 0,
        currentFile: null,
        error: message
      }));
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const cancelCompression = useCallback(() => {
    if (compressionTaskRef.current) {
      window.prevideo.compression.cancel(compressionTaskRef.current);
      compressionTaskRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isCompressing: false,
      progress: 0,
      currentFile: null,
      estimatedTime: 0,
      compressionRate: 0
    }));

    enqueueSnackbar('压缩已取消', { variant: 'info' });
  }, [enqueueSnackbar]);

  const estimateSize = useCallback(async (
    inputPath: string,
    config: CompressionConfig
  ): Promise<number> => {
    try {
      const result = await window.prevideo.compression.estimateSize(inputPath, config);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '估算失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '估算文件大小失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    compressVideo,
    cancelCompression,
    estimateSize,
    clearError
  };
}