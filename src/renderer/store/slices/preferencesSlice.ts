/**
 * Preferences slice for Redux state management
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserPreferences, DEFAULT_PREFERENCES } from '../../../shared/types/preferences';

interface PreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  error: string | null;
}

const initialState: PreferencesState = {
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  isSaving: false,
  hasChanges: false,
  error: null
};

// Async thunks
export const loadPreferences = createAsyncThunk(
  'preferences/load',
  async () => {
    const result = await window.prevideo.settings.getPreferences();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to load preferences');
    }
  }
);

export const savePreferences = createAsyncThunk(
  'preferences/save',
  async (preferences: UserPreferences) => {
    const result = await window.prevideo.settings.updatePreferences(preferences);
    if (result.success) {
      return preferences;
    } else {
      throw new Error(result.error || 'Failed to save preferences');
    }
  }
);

export const resetPreferences = createAsyncThunk(
  'preferences/reset',
  async () => {
    const result = await window.prevideo.settings.resetPreferences();
    if (result.success) {
      return DEFAULT_PREFERENCES;
    } else {
      throw new Error(result.error || 'Failed to reset preferences');
    }
  }
);

export const exportSettings = createAsyncThunk(
  'preferences/export',
  async () => {
    const result = await window.prevideo.settings.exportSettings();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to export settings');
    }
  }
);

export const importSettings = createAsyncThunk(
  'preferences/import',
  async () => {
    const result = await window.prevideo.settings.importSettings();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to import settings');
    }
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    updatePreference: <K extends keyof UserPreferences>(
      state: PreferencesState,
      action: PayloadAction<{ key: K; value: UserPreferences[K] }>
    ) => {
      const { key, value } = action.payload;
      (state.preferences as any)[key] = value;
      state.hasChanges = true;
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
      state.hasChanges = true;
    },
    setHasChanges: (state, action: PayloadAction<boolean>) => {
      state.hasChanges = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Load preferences
    builder.addCase(loadPreferences.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loadPreferences.fulfilled, (state, action) => {
      state.isLoading = false;
      state.preferences = action.payload;
      state.hasChanges = false;
    });
    builder.addCase(loadPreferences.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to load preferences';
    });

    // Save preferences
    builder.addCase(savePreferences.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(savePreferences.fulfilled, (state, action) => {
      state.isSaving = false;
      state.preferences = action.payload;
      state.hasChanges = false;
    });
    builder.addCase(savePreferences.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.error.message || 'Failed to save preferences';
    });

    // Reset preferences
    builder.addCase(resetPreferences.fulfilled, (state, action) => {
      state.preferences = action.payload;
      state.hasChanges = true;
    });

    // Export settings
    builder.addCase(exportSettings.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to export settings';
    });

    // Import settings
    builder.addCase(importSettings.fulfilled, (state, action) => {
      state.preferences = action.payload;
      state.hasChanges = false;
    });
    builder.addCase(importSettings.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to import settings';
    });
  }
});

export const {
  updatePreference,
  updatePreferences,
  setHasChanges,
  clearError
} = preferencesSlice.actions;

export default preferencesSlice.reducer;