/**
 * Redux store configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import downloadReducer from './slices/downloadSlice';
import taskReducer from './slices/taskSlice';
import uiReducer from './slices/uiSlice';
import preferencesReducer from './slices/preferencesSlice';

export const store = configureStore({
  reducer: {
    download: downloadReducer,
    task: taskReducer,
    ui: uiReducer,
    preferences: preferencesReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['download/updateProgress', 'task/updateTaskProgress'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.process'],
        // Ignore these paths in the state
        ignoredPaths: ['download.activeDownloads', 'task.processes']
      }
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;