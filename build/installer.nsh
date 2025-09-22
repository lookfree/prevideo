; NSIS installer customizations

!macro preInit
  SetRegView 64
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "PreVideo Team"
!macroend

!macro customInstall
  ; Register URL protocol for prevideo://
  WriteRegStr HKCR "prevideo" "" "URL:PreVideo Protocol"
  WriteRegStr HKCR "prevideo" "URL Protocol" ""
  WriteRegStr HKCR "prevideo\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCR "prevideo\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Associate with video files (optional)
  ; WriteRegStr HKCR ".mp4\OpenWithProgids" "PreVideo.MP4" ""
  ; WriteRegStr HKCR "PreVideo.MP4" "" "MP4 Video File"
  ; WriteRegStr HKCR "PreVideo.MP4\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  ; WriteRegStr HKCR "PreVideo.MP4\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\PreVideo"
  CreateShortcut "$SMPROGRAMS\PreVideo\PreVideo.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  CreateShortcut "$SMPROGRAMS\PreVideo\Uninstall PreVideo.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
!macroend

!macro customUnInstall
  ; Remove URL protocol registration
  DeleteRegKey HKCR "prevideo"

  ; Remove file associations
  ; DeleteRegValue HKCR ".mp4\OpenWithProgids" "PreVideo.MP4"
  ; DeleteRegKey HKCR "PreVideo.MP4"

  ; Remove start menu shortcuts
  Delete "$SMPROGRAMS\PreVideo\PreVideo.lnk"
  Delete "$SMPROGRAMS\PreVideo\Uninstall PreVideo.lnk"
  RMDir "$SMPROGRAMS\PreVideo"

  ; Clean up app data
  RMDir /r "$APPDATA\prevideo"
  RMDir /r "$LOCALAPPDATA\prevideo"
!macroend

; Custom installer pages
!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

; Show custom license page
!macro customInit
  ; Add custom initialization code here
!macroend

; Language strings
LangString DESC_Section1 ${LANG_ENGLISH} "PreVideo main application"
LangString DESC_Section2 ${LANG_ENGLISH} "Binary dependencies (yt-dlp, FFmpeg, Whisper)"
LangString DESC_Section3 ${LANG_ENGLISH} "Desktop shortcuts"

LangString DESC_Section1 ${LANG_SIMPCHINESE} "PreVideo 主程序"
LangString DESC_Section2 ${LANG_SIMPCHINESE} "二进制依赖 (yt-dlp, FFmpeg, Whisper)"
LangString DESC_Section3 ${LANG_SIMPCHINESE} "桌面快捷方式"