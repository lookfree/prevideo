/**
 * Main App component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Paper,
  useTheme
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
  Queue as QueueIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import SettingsDialog from './components/SettingsDialog';

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
      id={`app-tabpanel-${index}`}
      aria-labelledby={`app-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `app-tab-${index}`,
    'aria-controls': `app-tabpanel-${index}`,
  };
}

const App: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [currentTab, setCurrentTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Load initial settings
    loadSettings();

    // Setup menu event listeners
    setupMenuListeners();

    return () => {
      // Cleanup listeners
      cleanupMenuListeners();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const preferences = await window.prevideo.settings.getPreferences();
      // Dispatch to store
      console.log('Loaded preferences:', preferences);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const setupMenuListeners = () => {
    // Listen for menu commands
    const menuHandlers = {
      'menu:new-download': () => setCurrentTab(0),
      'menu:open-download-folder': openDownloadFolder,
      'menu:show-shortcuts': showShortcuts,
      'open-preferences': () => setSettingsOpen(true),
      'open-about': showAbout,
    };

    // Register listeners (would need actual implementation)
    console.log('Menu listeners setup');
  };

  const cleanupMenuListeners = () => {
    // Remove listeners
    console.log('Menu listeners cleaned up');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const openDownloadFolder = async () => {
    try {
      const preferences = await window.prevideo.settings.getPreferences();
      await window.prevideo.system.openPath(preferences.data.defaultOutputPath);
    } catch (error) {
      console.error('Failed to open download folder:', error);
    }
  };

  const showShortcuts = () => {
    // Show shortcuts dialog
    console.log('Show shortcuts');
  };

  const showAbout = () => {
    // Show about dialog
    console.log('Show about');
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            PreVideo
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ flexGrow: 1 }}
          >
            <Tab label="下载" {...a11yProps(0)} />
            <Tab label="历史" {...a11yProps(1)} icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="队列" {...a11yProps(2)} icon={<QueueIcon />} iconPosition="start" />
          </Tabs>

          <IconButton
            color="inherit"
            onClick={openDownloadFolder}
            title="打开下载目录"
          >
            <FolderIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={currentTab} index={0}>
          <HomePage />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <HistoryPage />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <Box>队列管理页面</Box>
        </TabPanel>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};

export default App;