/**
 * Renderer process entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { zhCN } from '@mui/material/locale';
// import { SnackbarProvider } from 'notistack';
// import { store } from './store';
// import App from './App';
// import SimpleApp from './SimpleApp';
import CompleteApp from './CompleteApp';
import './index.css';

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Microsoft YaHei"',
      '"PingFang SC"',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
  },
}, zhCN);

// Get root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// Create root
const root = ReactDOM.createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <CompleteApp />
  </React.StrictMode>
);

// Hot module replacement for development
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              autoHideDuration={5000}
            >
              <NextApp />
            </SnackbarProvider>
          </ThemeProvider>
        </Provider>
      </React.StrictMode>
    );
  });
}

// Handle theme changes from main process
window.prevideo?.settings.onThemeChanged((theme: string) => {
  // Implement theme change logic
  console.log('Theme changed to:', theme);
});

// Handle language changes from main process
window.prevideo?.settings.onLanguageChanged((language: string) => {
  // Implement language change logic
  console.log('Language changed to:', language);
});

// Handle update notifications
window.prevideo?.system.onUpdateDownloaded((updateInfo: any) => {
  // Show update notification
  console.log('Update downloaded:', updateInfo);
});

// Prevent drag and drop on the window
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

// Export for HMR
export default root;