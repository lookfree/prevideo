/**
 * E2E test for complete user workflow
 * Tests the entire application flow from UI to final output
 */

import { test, expect, Page, ElectronApplication } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';

describe('E2E: Complete User Workflow', () => {
  let app: ElectronApplication;
  let page: Page;

  beforeAll(async () => {
    // Launch Electron app
    app = await electron.launch({
      args: [path.join(__dirname, '../../src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the main window
    page = await app.firstWindow();

    // Wait for app to be ready
    await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Complete workflow: Download, subtitle, compress', () => {
    test('should complete full workflow from URL input to final output', async () => {
      // Step 1: Navigate to main page
      await page.waitForSelector('[data-testid="video-input-form"]', { state: 'visible' });

      // Step 2: Enter YouTube URL
      const urlInput = await page.locator('[data-testid="url-input"]');
      await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      // Step 3: Click fetch info button
      const fetchButton = await page.locator('[data-testid="fetch-info-button"]');
      await fetchButton.click();

      // Step 4: Wait for video info to load
      await page.waitForSelector('[data-testid="video-info-card"]', {
        state: 'visible',
        timeout: 30000
      });

      // Verify video information displayed
      const videoTitle = await page.locator('[data-testid="video-title"]');
      await expect(videoTitle).toBeVisible();
      await expect(videoTitle).toContainText('Rick Astley');

      const videoDuration = await page.locator('[data-testid="video-duration"]');
      await expect(videoDuration).toBeVisible();

      // Step 5: Select quality
      const qualitySelect = await page.locator('[data-testid="quality-select"]');
      await qualitySelect.selectOption('720p');

      // Step 6: Configure bilingual subtitles
      const subtitleCheckbox = await page.locator('[data-testid="enable-subtitles"]');
      await subtitleCheckbox.check();

      // Select primary language (Chinese)
      const primaryLangSelect = await page.locator('[data-testid="primary-subtitle-lang"]');
      await primaryLangSelect.selectOption('zh-CN');

      // Select secondary language (English)
      const secondaryLangSelect = await page.locator('[data-testid="secondary-subtitle-lang"]');
      await secondaryLangSelect.selectOption('en');

      // Choose subtitle layout
      const layoutRadio = await page.locator('[data-testid="subtitle-layout-stacked"]');
      await layoutRadio.check();

      // Step 7: Configure compression
      const compressionCheckbox = await page.locator('[data-testid="enable-compression"]');
      await compressionCheckbox.check();

      const compressionPreset = await page.locator('[data-testid="compression-preset"]');
      await compressionPreset.selectOption('medium');

      const targetSize = await page.locator('[data-testid="target-file-size"]');
      await targetSize.fill('100'); // 100MB target

      // Step 8: Set output path
      const outputPathInput = await page.locator('[data-testid="output-path"]');
      const defaultPath = await outputPathInput.inputValue();
      expect(defaultPath).toBeTruthy();

      // Step 9: Start download
      const downloadButton = await page.locator('[data-testid="start-download-button"]');
      await downloadButton.click();

      // Step 10: Monitor progress
      await page.waitForSelector('[data-testid="progress-bar"]', { state: 'visible' });

      // Wait for various stages
      const progressStages = [
        { stage: 'downloading', text: '下载中' },
        { stage: 'subtitles', text: '处理字幕' },
        { stage: 'compressing', text: '压缩视频' },
        { stage: 'completed', text: '完成' }
      ];

      for (const { stage, text } of progressStages) {
        const stageIndicator = await page.locator(`[data-testid="stage-${stage}"]`);
        await expect(stageIndicator).toContainText(text, { timeout: 300000 });
      }

      // Step 11: Verify completion
      const completionNotification = await page.locator('[data-testid="completion-notification"]');
      await expect(completionNotification).toBeVisible();
      await expect(completionNotification).toContainText('下载完成');

      // Check output files listed
      const outputFilesList = await page.locator('[data-testid="output-files-list"]');
      await expect(outputFilesList).toBeVisible();

      const fileItems = await outputFilesList.locator('[data-testid="output-file-item"]').all();
      expect(fileItems.length).toBeGreaterThan(0);

      // Verify final video with subtitles exists
      const finalVideoItem = await page.locator('[data-testid="final-video-with-subs"]');
      await expect(finalVideoItem).toBeVisible();
      await expect(finalVideoItem).toContainText('.mp4');

      // Step 12: Open output folder
      const openFolderButton = await page.locator('[data-testid="open-output-folder"]');
      await openFolderButton.click();

      // Verify folder opened (mock in test environment)
      // In real app, this would open system file explorer
    });

    test('should handle errors gracefully and allow retry', async () => {
      // Test with invalid URL
      const urlInput = await page.locator('[data-testid="url-input"]');
      await urlInput.fill('https://invalid-url-that-does-not-exist.com/video');

      const fetchButton = await page.locator('[data-testid="fetch-info-button"]');
      await fetchButton.click();

      // Wait for error message
      const errorMessage = await page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText('无法获取视频信息');

      // Retry button should be available
      const retryButton = await page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();

      // Clear and try with valid URL
      await urlInput.clear();
      await urlInput.fill('https://www.youtube.com/watch?v=valid-video');
      await retryButton.click();
    });

    test('should support drag and drop for local files', async () => {
      // Navigate to local file processing
      const localFileTab = await page.locator('[data-testid="local-file-tab"]');
      await localFileTab.click();

      // Get drop zone
      const dropZone = await page.locator('[data-testid="file-drop-zone"]');
      await expect(dropZone).toBeVisible();

      // Simulate file drop (mock file in test)
      const filePath = '/test/videos/sample.mp4';
      await page.evaluate(([dropZoneSelector, path]) => {
        const dropZone = document.querySelector(dropZoneSelector as string) as HTMLElement;
        const dataTransfer = new DataTransfer();
        const file = new File(['video content'], 'sample.mp4', { type: 'video/mp4' });

        Object.defineProperty(file, 'path', { value: path });
        dataTransfer.items.add(file);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer
        });

        dropZone?.dispatchEvent(dropEvent);
      }, ['[data-testid="file-drop-zone"]', filePath]);

      // Verify file loaded
      const fileInfo = await page.locator('[data-testid="local-file-info"]');
      await expect(fileInfo).toBeVisible();
      await expect(fileInfo).toContainText('sample.mp4');
    });
  });

  describe('User preferences and settings', () => {
    test('should save and restore user preferences', async () => {
      // Open settings
      const settingsButton = await page.locator('[data-testid="settings-button"]');
      await settingsButton.click();

      const settingsDialog = await page.locator('[data-testid="settings-dialog"]');
      await expect(settingsDialog).toBeVisible();

      // Change default quality
      const defaultQuality = await page.locator('[data-testid="default-quality-select"]');
      await defaultQuality.selectOption('1080p');

      // Change default output path
      const defaultOutputPath = await page.locator('[data-testid="default-output-path"]');
      await defaultOutputPath.clear();
      await defaultOutputPath.fill('/Users/test/Videos');

      // Enable auto-subtitle generation
      const autoSubtitleToggle = await page.locator('[data-testid="auto-subtitle-toggle"]');
      await autoSubtitleToggle.check();

      // Set subtitle languages
      const subtitleLangs = await page.locator('[data-testid="default-subtitle-langs"]');
      await subtitleLangs.selectOption(['zh-CN', 'en']);

      // Change theme
      const themeSelect = await page.locator('[data-testid="theme-select"]');
      await themeSelect.selectOption('dark');

      // Save settings
      const saveButton = await page.locator('[data-testid="save-settings-button"]');
      await saveButton.click();

      // Close dialog
      const closeButton = await page.locator('[data-testid="close-settings-button"]');
      await closeButton.click();

      // Verify theme applied
      const appContainer = await page.locator('#app');
      await expect(appContainer).toHaveClass(/dark-theme/);

      // Reload app and verify settings persisted
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });

      // Open settings again
      await settingsButton.click();
      await expect(settingsDialog).toBeVisible();

      // Verify saved values
      const savedQuality = await defaultQuality.inputValue();
      expect(savedQuality).toBe('1080p');

      const savedPath = await defaultOutputPath.inputValue();
      expect(savedPath).toBe('/Users/test/Videos');

      const autoSubtitleChecked = await autoSubtitleToggle.isChecked();
      expect(autoSubtitleChecked).toBe(true);
    });
  });

  describe('Download queue management', () => {
    test('should manage multiple downloads in queue', async () => {
      // Add first video to queue
      const urlInput1 = await page.locator('[data-testid="url-input"]');
      await urlInput1.fill('https://www.youtube.com/watch?v=video1');

      const addToQueueButton = await page.locator('[data-testid="add-to-queue-button"]');
      await addToQueueButton.click();

      // Add second video
      await urlInput1.clear();
      await urlInput1.fill('https://www.youtube.com/watch?v=video2');
      await addToQueueButton.click();

      // Add third video
      await urlInput1.clear();
      await urlInput1.fill('https://www.youtube.com/watch?v=video3');
      await addToQueueButton.click();

      // Open queue view
      const queueTab = await page.locator('[data-testid="queue-tab"]');
      await queueTab.click();

      // Verify queue items
      const queueList = await page.locator('[data-testid="download-queue-list"]');
      await expect(queueList).toBeVisible();

      const queueItems = await queueList.locator('[data-testid="queue-item"]').all();
      expect(queueItems.length).toBe(3);

      // Start queue processing
      const startQueueButton = await page.locator('[data-testid="start-queue-button"]');
      await startQueueButton.click();

      // Monitor queue progress
      const activeDownload = await page.locator('[data-testid="active-download"]');
      await expect(activeDownload).toBeVisible();

      // Pause queue
      const pauseQueueButton = await page.locator('[data-testid="pause-queue-button"]');
      await pauseQueueButton.click();

      const queueStatus = await page.locator('[data-testid="queue-status"]');
      await expect(queueStatus).toContainText('暂停');

      // Resume queue
      const resumeQueueButton = await page.locator('[data-testid="resume-queue-button"]');
      await resumeQueueButton.click();
      await expect(queueStatus).toContainText('处理中');

      // Remove item from queue
      const removeButton = await queueItems[2].locator('[data-testid="remove-from-queue"]');
      await removeButton.click();

      // Confirm removal
      const confirmRemove = await page.locator('[data-testid="confirm-remove-button"]');
      await confirmRemove.click();

      // Verify item removed
      const updatedQueueItems = await queueList.locator('[data-testid="queue-item"]').all();
      expect(updatedQueueItems.length).toBe(2);
    });
  });

  describe('History and statistics', () => {
    test('should display download history and statistics', async () => {
      // Navigate to history
      const historyTab = await page.locator('[data-testid="history-tab"]');
      await historyTab.click();

      // Wait for history to load
      const historyList = await page.locator('[data-testid="history-list"]');
      await expect(historyList).toBeVisible();

      // Check history items
      const historyItems = await historyList.locator('[data-testid="history-item"]').all();
      expect(historyItems.length).toBeGreaterThan(0);

      // View statistics
      const statsButton = await page.locator('[data-testid="view-statistics-button"]');
      await statsButton.click();

      const statsDialog = await page.locator('[data-testid="statistics-dialog"]');
      await expect(statsDialog).toBeVisible();

      // Verify statistics displayed
      const totalDownloads = await page.locator('[data-testid="stat-total-downloads"]');
      await expect(totalDownloads).toBeVisible();

      const totalSize = await page.locator('[data-testid="stat-total-size"]');
      await expect(totalSize).toBeVisible();

      const avgSpeed = await page.locator('[data-testid="stat-avg-speed"]');
      await expect(avgSpeed).toBeVisible();

      // Clear history
      const clearHistoryButton = await page.locator('[data-testid="clear-history-button"]');
      await clearHistoryButton.click();

      // Confirm clear
      const confirmClearButton = await page.locator('[data-testid="confirm-clear-history"]');
      await confirmClearButton.click();

      // Verify history cleared
      const emptyMessage = await page.locator('[data-testid="history-empty-message"]');
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText('暂无下载历史');
    });
  });

  describe('Keyboard shortcuts and accessibility', () => {
    test('should support keyboard navigation and shortcuts', async () => {
      // Test keyboard shortcuts
      await page.keyboard.press('Control+N'); // New download
      const urlInput = await page.locator('[data-testid="url-input"]');
      await expect(urlInput).toBeFocused();

      await page.keyboard.press('Control+,'); // Open settings
      const settingsDialog = await page.locator('[data-testid="settings-dialog"]');
      await expect(settingsDialog).toBeVisible();

      await page.keyboard.press('Escape'); // Close dialog
      await expect(settingsDialog).not.toBeVisible();

      await page.keyboard.press('Control+H'); // Open history
      const historyTab = await page.locator('[data-testid="history-tab"]');
      await expect(historyTab).toHaveAttribute('aria-selected', 'true');

      // Tab navigation
      await page.keyboard.press('Tab');
      const firstFocusable = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(firstFocusable).toBeTruthy();

      // Arrow key navigation in lists
      const downloadList = await page.locator('[data-testid="download-list"]');
      await downloadList.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter'); // Select item
    });

    test('should be accessible with screen reader', async () => {
      // Check ARIA labels
      const mainRegion = await page.locator('[role="main"]');
      await expect(mainRegion).toHaveAttribute('aria-label', '主要内容');

      const navRegion = await page.locator('[role="navigation"]');
      await expect(navRegion).toHaveAttribute('aria-label', '主导航');

      // Check form labels
      const urlInput = await page.locator('[data-testid="url-input"]');
      const urlLabel = await page.locator(`label[for="${await urlInput.getAttribute('id')}"]`);
      await expect(urlLabel).toBeVisible();

      // Check button accessibility
      const downloadButton = await page.locator('[data-testid="start-download-button"]');
      await expect(downloadButton).toHaveAttribute('aria-label', '开始下载');

      // Check progress accessibility
      const progressBar = await page.locator('[role="progressbar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});