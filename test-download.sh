#!/bin/bash

# 测试YouTube视频下载
echo "测试YouTube视频下载..."

# 测试URL（一个短视频）
URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
OUTPUT_DIR="$HOME/Downloads/test-video"

# 创建测试目录
mkdir -p "$OUTPUT_DIR"

echo "下载目录: $OUTPUT_DIR"
echo "----------------------------------------"

# 测试1: 下载完整视频（包含音频）
echo "测试1: 下载完整视频（720p，包含音频）"
yt-dlp "$URL" \
  -o "$OUTPUT_DIR/test-complete.mp4" \
  -S "res:720,ext:mp4" \
  --no-playlist

echo "----------------------------------------"

# 测试2: 下载视频并嵌入字幕
echo "测试2: 下载视频并下载字幕"
yt-dlp "$URL" \
  -o "$OUTPUT_DIR/test-with-subtitle.mp4" \
  -S "res:720,ext:mp4" \
  --write-subs \
  --write-auto-subs \
  --sub-langs "en,zh" \
  --embed-subs \
  --no-playlist

echo "----------------------------------------"
echo "下载完成！请检查文件："
ls -la "$OUTPUT_DIR"

echo "----------------------------------------"
echo "使用ffprobe检查视频流："
ffprobe -v error -show_streams "$OUTPUT_DIR/test-complete.mp4" 2>&1 | grep -E "codec_type|codec_name"