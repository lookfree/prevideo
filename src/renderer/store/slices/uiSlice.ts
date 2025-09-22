/**
 * UI slice for Redux state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Dialog {
  id: string;
  type: 'confirm' | 'alert' | 'prompt';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  settingsOpen: boolean;
  activeTab: number;
  activeView: 'home' | 'history' | 'settings' | 'queue';
  notifications: Notification[];
  dialogs: Dialog[];
  loading: { [key: string]: boolean };
  errors: { [key: string]: string | null };
  dragOver: boolean;
  fullscreen: boolean;
  compactMode: boolean;
  selectedFiles: string[];
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    items: Array<{ label: string; action: string; icon?: string }>;
  } | null;
}

const initialState: UIState = {
  theme: 'dark',
  sidebarOpen: true,
  settingsOpen: false,
  activeTab: 0,
  activeView: 'home',
  notifications: [],
  dialogs: [],
  loading: {},
  errors: {},
  dragOver: false,
  fullscreen: false,
  compactMode: false,
  selectedFiles: [],
  contextMenu: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.settingsOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<number>) => {
      state.activeTab = action.payload;
    },
    setActiveView: (state, action: PayloadAction<'home' | 'history' | 'settings' | 'queue'>) => {
      state.activeView = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}`
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    addDialog: (state, action: PayloadAction<Omit<Dialog, 'id'>>) => {
      const dialog: Dialog = {
        ...action.payload,
        id: `dialog-${Date.now()}`
      };
      state.dialogs.push(dialog);
    },
    removeDialog: (state, action: PayloadAction<string>) => {
      state.dialogs = state.dialogs.filter(d => d.id !== action.payload);
    },
    clearDialogs: (state) => {
      state.dialogs = [];
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      const { key, value } = action.payload;
      if (value) {
        state.loading[key] = true;
      } else {
        delete state.loading[key];
      }
    },
    setError: (state, action: PayloadAction<{ key: string; value: string | null }>) => {
      const { key, value } = action.payload;
      if (value) {
        state.errors[key] = value;
      } else {
        delete state.errors[key];
      }
    },
    clearErrors: (state) => {
      state.errors = {};
    },
    setDragOver: (state, action: PayloadAction<boolean>) => {
      state.dragOver = action.payload;
    },
    toggleFullscreen: (state) => {
      state.fullscreen = !state.fullscreen;
    },
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.fullscreen = action.payload;
    },
    toggleCompactMode: (state) => {
      state.compactMode = !state.compactMode;
    },
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.compactMode = action.payload;
    },
    setSelectedFiles: (state, action: PayloadAction<string[]>) => {
      state.selectedFiles = action.payload;
    },
    addSelectedFile: (state, action: PayloadAction<string>) => {
      if (!state.selectedFiles.includes(action.payload)) {
        state.selectedFiles.push(action.payload);
      }
    },
    removeSelectedFile: (state, action: PayloadAction<string>) => {
      state.selectedFiles = state.selectedFiles.filter(f => f !== action.payload);
    },
    clearSelectedFiles: (state) => {
      state.selectedFiles = [];
    },
    showContextMenu: (state, action: PayloadAction<{
      x: number;
      y: number;
      items: Array<{ label: string; action: string; icon?: string }>;
    }>) => {
      state.contextMenu = {
        open: true,
        ...action.payload
      };
    },
    hideContextMenu: (state) => {
      state.contextMenu = null;
    }
  }
});

export const {
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setSettingsOpen,
  setActiveTab,
  setActiveView,
  addNotification,
  removeNotification,
  clearNotifications,
  addDialog,
  removeDialog,
  clearDialogs,
  setLoading,
  setError,
  clearErrors,
  setDragOver,
  toggleFullscreen,
  setFullscreen,
  toggleCompactMode,
  setCompactMode,
  setSelectedFiles,
  addSelectedFile,
  removeSelectedFile,
  clearSelectedFiles,
  showContextMenu,
  hideContextMenu
} = uiSlice.actions;

export default uiSlice.reducer;