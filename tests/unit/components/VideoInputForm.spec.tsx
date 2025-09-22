/**
 * Unit tests for VideoInputForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import VideoInputForm from '../../../src/renderer/components/VideoInputForm';
import { VideoInfo } from '../../../src/shared/types/video';

// Mock window.prevideo API
const mockPrevideo = {
  video: {
    fetchInfo: jest.fn()
  },
  system: {
    readClipboard: jest.fn()
  },
  settings: {
    getPreferences: jest.fn(),
    selectDirectory: jest.fn()
  }
};

(global as any).window = {
  prevideo: mockPrevideo
};

const mockVideoInfo: VideoInfo = {
  id: 'test-video',
  title: 'Test Video Title',
  author: 'Test Author',
  duration: 300,
  thumbnail: 'https://example.com/thumb.jpg',
  description: 'Test description',
  viewCount: 1000,
  likeCount: 100,
  uploadDate: '2024-01-01',
  availableFormats: [
    { formatId: '22', extension: 'mp4', resolution: '720p', quality: '720p' }
  ],
  availableSubtitles: ['en', 'zh-CN']
};

describe('VideoInputForm', () => {
  const mockOnStartDownload = jest.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SnackbarProvider>
      {children}
    </SnackbarProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrevideo.settings.getPreferences.mockResolvedValue({
      success: true,
      data: {
        defaultOutputPath: '/downloads',
        defaultQuality: 'best',
        defaultFormat: 'mp4',
        defaultSubtitleLanguages: []
      }
    });
  });

  describe('URL Input', () => {
    it('should render URL input field', () => {
      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      expect(input).toBeInTheDocument();
    });

    it('should update URL on input change', async () => {
      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/) as HTMLInputElement;

      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      expect(input.value).toBe('https://youtube.com/watch?v=test');
    });

    it('should paste from clipboard', async () => {
      mockPrevideo.system.readClipboard.mockResolvedValue({
        data: { text: 'https://youtube.com/watch?v=clipboard' }
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const pasteButton = screen.getByRole('button', { name: /paste/i });
      fireEvent.click(pasteButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/) as HTMLInputElement;
        expect(input.value).toBe('https://youtube.com/watch?v=clipboard');
      });
    });

    it('should clear URL', async () => {
      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/) as HTMLInputElement;
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(input.value).toBe('');
    });
  });

  describe('Video Info Fetching', () => {
    it('should fetch video info on button click', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Video Title')).toBeInTheDocument();
        expect(screen.getByText('作者: Test Author')).toBeInTheDocument();
      });

      expect(mockPrevideo.video.fetchInfo).toHaveBeenCalledWith('https://youtube.com/watch?v=test');
    });

    it('should show error for invalid URL', async () => {
      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'invalid-url');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      // Should show snackbar error (mocked by notistack)
      expect(mockPrevideo.video.fetchInfo).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: false,
        error: 'Failed to fetch video info'
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(mockPrevideo.video.fetchInfo).toHaveBeenCalled();
      });
    });
  });

  describe('Download Options', () => {
    beforeEach(async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Video Title')).toBeInTheDocument();
      });
    });

    it('should show download options after fetching video info', () => {
      expect(screen.getByLabelText('视频质量')).toBeInTheDocument();
      expect(screen.getByLabelText('输出格式')).toBeInTheDocument();
      expect(screen.getByLabelText('输出路径')).toBeInTheDocument();
    });

    it('should select output directory', async () => {
      mockPrevideo.settings.selectDirectory.mockResolvedValue({
        success: true,
        data: '/new/path'
      });

      const folderButton = screen.getByRole('button', { name: /folder/i });
      fireEvent.click(folderButton);

      await waitFor(() => {
        const pathInput = screen.getByLabelText('输出路径') as HTMLInputElement;
        expect(pathInput.value).toBe('/new/path');
      });
    });

    it('should start download with selected options', async () => {
      const downloadButton = screen.getByText('开始下载');
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockOnStartDownload).toHaveBeenCalledWith(
          'https://youtube.com/watch?v=test',
          expect.objectContaining({
            quality: 'best',
            outputPath: '/downloads',
            preferredFormat: 'mp4'
          })
        );
      });
    });

    it('should disable download button without output path', async () => {
      const pathInput = screen.getByLabelText('输出路径') as HTMLInputElement;
      await userEvent.clear(pathInput);

      const downloadButton = screen.getByText('开始下载');
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Subtitle Selection', () => {
    it('should show available subtitles', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByLabelText('下载字幕')).toBeInTheDocument();
      });
    });
  });

  describe('Video Preview', () => {
    it('should display video thumbnail', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        const thumbnail = screen.getByAltText('Test Video Title');
        expect(thumbnail).toBeInTheDocument();
        expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumb.jpg');
      });
    });

    it('should display video duration', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('5:00')).toBeInTheDocument(); // 300 seconds = 5:00
      });
    });

    it('should display view count', async () => {
      mockPrevideo.video.fetchInfo.mockResolvedValue({
        success: true,
        data: mockVideoInfo
      });

      render(<VideoInputForm onStartDownload={mockOnStartDownload} />, { wrapper });

      const input = screen.getByPlaceholderText(/粘贴YouTube、Bilibili等视频链接/);
      await userEvent.type(input, 'https://youtube.com/watch?v=test');

      const fetchButton = screen.getByText('获取信息');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/观看次数.*1,000/)).toBeInTheDocument();
      });
    });
  });
});