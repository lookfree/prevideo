/**
 * Custom hook for user preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../shared/types/preferences';

interface PreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  error: string | null;
}

interface PreferencesActions {
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  savePreferences: () => Promise<void>;
  resetPreferences: () => void;
  reloadPreferences: () => Promise<void>;
  exportPreferences: () => Promise<void>;
  importPreferences: () => Promise<void>;
}

export function usePreferences(): PreferencesState & PreferencesActions {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<PreferencesState>({
    preferences: DEFAULT_PREFERENCES,
    isLoading: true,
    isSaving: false,
    hasChanges: false,
    error: null
  });

  // Load preferences on mount
  useEffect(() => {
    reloadPreferences();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasChanges) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasChanges]);

  const reloadPreferences = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await window.prevideo.settings.getPreferences();
      if (result.success) {
        setState(prev => ({
          ...prev,
          preferences: result.data,
          isLoading: false,
          hasChanges: false,
          error: null
        }));
      } else {
        throw new Error(result.error || '加载设置失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载设置失败';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message
      }));
      enqueueSnackbar(message, { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
      hasChanges: true
    }));
  }, []);

  const savePreferences = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const result = await window.prevideo.settings.updatePreferences(state.preferences);
      if (result.success) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          hasChanges: false,
          error: null
        }));
        enqueueSnackbar('设置已保存', { variant: 'success' });
      } else {
        throw new Error(result.error || '保存设置失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存设置失败';
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: message
      }));
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [state.preferences, enqueueSnackbar]);

  const resetPreferences = useCallback(() => {
    setState(prev => ({
      ...prev,
      preferences: DEFAULT_PREFERENCES,
      hasChanges: true
    }));
    enqueueSnackbar('已恢复默认设置，请保存以应用更改', { variant: 'info' });
  }, [enqueueSnackbar]);

  const exportPreferences = useCallback(async () => {
    try {
      const result = await window.prevideo.settings.exportSettings();
      if (result.success) {
        enqueueSnackbar(`设置已导出到 ${result.data}`, { variant: 'success' });
      } else {
        throw new Error(result.error || '导出设置失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出设置失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const importPreferences = useCallback(async () => {
    try {
      const result = await window.prevideo.settings.importSettings();
      if (result.success) {
        await reloadPreferences();
        enqueueSnackbar('设置已导入', { variant: 'success' });
      } else {
        throw new Error(result.error || '导入设置失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入设置失败';
      enqueueSnackbar(message, { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar, reloadPreferences]);

  return {
    ...state,
    updatePreferences,
    savePreferences,
    resetPreferences,
    reloadPreferences,
    exportPreferences,
    importPreferences
  };
}