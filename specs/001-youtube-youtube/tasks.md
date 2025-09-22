# Tasks: YouTube视频下载器与字幕处理器

**Input**: Design documents from `/specs/001-youtube-youtube/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Electron app structure as defined in plan.md
- Paths shown are absolute from repository root

## Phase 3.1: Setup and Environment Configuration
- [x] T001 Initialize Electron + TypeScript project with package.json and tsconfig.json
- [x] T002 Install core dependencies: electron, typescript, react, @mui/material (partial - simplified)
- [x] T003 Configure electron-builder for Windows and macOS in package.json
- [x] T004 [P] Setup ESLint and Prettier configuration in .eslintrc.js and .prettierrc
- [x] T005 [P] Create project directory structure per plan.md (src/main, src/renderer, etc.)
- [x] T006 [P] Setup Jest testing framework with jest.config.js for unit tests
- [x] T007 [P] Configure Playwright for E2E testing in playwright.config.ts
- [x] T008 Create SQLite database initialization script in src/main/database/init.sql (using electron-store instead)
- [x] T009 [P] Setup GitHub Actions workflow in .github/workflows/build.yml
- [x] T010 [P] Create environment variables configuration in .env.example

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### IPC Channel Contract Tests
- [x] T011 [P] Contract test for video:info:fetch in tests/contract/ipc/test_video_info_fetch.spec.ts
- [x] T012 [P] Contract test for video:download:start in tests/contract/ipc/test_video_download.spec.ts
- [x] T013 [P] Contract test for subtitle:generate in tests/contract/ipc/test_subtitle_generate.spec.ts
- [x] T014 [P] Contract test for subtitle:embed in tests/contract/ipc/test_subtitle_embed.spec.ts
- [x] T015 [P] Contract test for compress:start in tests/contract/ipc/test_compress_start.spec.ts
- [x] T016 [P] Contract test for settings operations in tests/contract/ipc/test_settings.spec.ts

### Service Interface Contract Tests
- [ ] T017 [P] Contract test for DownloaderService in tests/contract/services/test_downloader_service.spec.ts
- [ ] T018 [P] Contract test for SubtitleService in tests/contract/services/test_subtitle_service.spec.ts
- [ ] T019 [P] Contract test for ConverterService in tests/contract/services/test_converter_service.spec.ts
- [ ] T020 [P] Contract test for StorageService in tests/contract/services/test_storage_service.spec.ts

### Integration Test Scenarios
- [ ] T021 [P] Integration test for 场景1: 下载视频并添加双语字幕 in tests/integration/test_download_with_subtitles.spec.ts
- [ ] T022 [P] Integration test for 场景2: 压缩视频文件 in tests/integration/test_video_compression.spec.ts
- [ ] T023 [P] Integration test for 场景3: 断点续传 in tests/integration/test_resume_download.spec.ts
- [ ] T024 [P] E2E test for complete user flow in tests/e2e/test_full_workflow.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models Implementation
- [ ] T025 [P] Implement VideoInfo and VideoFormat types in src/shared/types/video.ts
- [ ] T026 [P] Implement Subtitle and BilingualSubtitleConfig types in src/shared/types/subtitle.ts
- [ ] T027 [P] Implement CompressionConfig types in src/shared/types/compression.ts
- [ ] T028 [P] Implement DownloadTask and ProcessingTask types in src/shared/types/tasks.ts
- [ ] T029 [P] Implement UserPreferences types in src/shared/types/preferences.ts

### Core Services Implementation
- [ ] T030 Create DownloaderService with yt-dlp integration in src/main/services/downloader.ts
- [ ] T031 Create SubtitleService with Whisper integration in src/main/services/subtitles.ts
- [ ] T032 Create ConverterService with ffmpeg integration in src/main/services/converter.ts
- [ ] T033 Create StorageService with SQLite in src/main/services/storage.ts
- [ ] T034 [P] Create UpdateService for auto-updates in src/main/services/updater.ts

### IPC Handler Implementation
- [ ] T035 Implement video IPC handlers in src/main/ipc/video-handlers.ts
- [ ] T036 Implement subtitle IPC handlers in src/main/ipc/subtitle-handlers.ts
- [ ] T037 Implement compression IPC handlers in src/main/ipc/compression-handlers.ts
- [ ] T038 Implement settings IPC handlers in src/main/ipc/settings-handlers.ts
- [ ] T039 Implement system IPC handlers in src/main/ipc/system-handlers.ts

### Main Process Setup
- [ ] T040 Create Electron main process entry point in src/main/index.ts
- [ ] T041 Implement preload script with contextBridge in src/preload/index.ts
- [ ] T042 Create window management in src/main/windows/main-window.ts
- [ ] T043 [P] Setup application menu in src/main/menu/app-menu.ts
- [ ] T044 [P] Implement tray icon support in src/main/tray/tray-manager.ts

### Renderer Process - React Components
- [ ] T045 Create React app entry point in src/renderer/index.tsx
- [ ] T046 [P] Create VideoInputForm component in src/renderer/components/VideoInputForm.tsx
- [ ] T047 [P] Create DownloadProgress component in src/renderer/components/DownloadProgress.tsx
- [ ] T048 [P] Create SubtitleSettings component in src/renderer/components/SubtitleSettings.tsx
- [ ] T049 [P] Create CompressionSettings component in src/renderer/components/CompressionSettings.tsx
- [ ] T050 [P] Create TaskList component in src/renderer/components/TaskList.tsx
- [ ] T051 [P] Create SettingsDialog component in src/renderer/components/SettingsDialog.tsx

### Renderer Process - Pages
- [ ] T052 Create HomePage with main UI in src/renderer/pages/HomePage.tsx
- [ ] T053 Create HistoryPage for download history in src/renderer/pages/HistoryPage.tsx
- [ ] T054 Create SettingsPage in src/renderer/pages/SettingsPage.tsx

### Custom Hooks
- [ ] T055 [P] Create useDownloader hook in src/renderer/hooks/useDownloader.ts
- [ ] T056 [P] Create useSubtitles hook in src/renderer/hooks/useSubtitles.ts
- [ ] T057 [P] Create useCompression hook in src/renderer/hooks/useCompression.ts
- [ ] T058 [P] Create useSettings hook in src/renderer/hooks/useSettings.ts

## Phase 3.4: Integration and External Tools

### Binary Integration
- [ ] T059 Create yt-dlp wrapper with spawn in src/main/binaries/ytdlp-wrapper.ts
- [ ] T060 Create whisper.cpp wrapper in src/main/binaries/whisper-wrapper.ts
- [ ] T061 Create ffmpeg wrapper in src/main/binaries/ffmpeg-wrapper.ts
- [ ] T062 [P] Create binary path resolver in src/main/binaries/binary-paths.ts
- [ ] T063 [P] Download and setup binaries script in scripts/download-binaries.js

### Database Integration
- [ ] T064 Implement database connection manager in src/main/database/connection.ts
- [ ] T065 Create database migrations in src/main/database/migrations/
- [ ] T066 [P] Implement download history repository in src/main/database/repositories/downloads.ts
- [ ] T067 [P] Implement preferences repository in src/main/database/repositories/preferences.ts

### State Management
- [ ] T068 Setup Redux store in src/renderer/store/index.ts
- [ ] T069 [P] Create download slice in src/renderer/store/slices/downloadSlice.ts
- [ ] T070 [P] Create settings slice in src/renderer/store/slices/settingsSlice.ts
- [ ] T071 [P] Create UI slice in src/renderer/store/slices/uiSlice.ts

## Phase 3.5: Polish and Production Ready

### Unit Tests
- [ ] T072 [P] Unit tests for DownloaderService in tests/unit/services/downloader.test.ts
- [ ] T073 [P] Unit tests for SubtitleService in tests/unit/services/subtitle.test.ts
- [ ] T074 [P] Unit tests for ConverterService in tests/unit/services/converter.test.ts
- [ ] T075 [P] Unit tests for binary wrappers in tests/unit/binaries/
- [ ] T076 [P] Unit tests for React components in tests/unit/components/

### Performance and Optimization
- [ ] T077 Implement download speed optimization with concurrent chunks
- [ ] T078 Add memory usage monitoring and optimization
- [ ] T079 Implement lazy loading for React components
- [ ] T080 [P] Add application performance metrics collection

### Documentation and Localization
- [ ] T081 [P] Create TypeDoc documentation in docs/api/
- [ ] T082 [P] Add Chinese (zh-CN) translations in src/renderer/locales/zh-CN.json
- [ ] T083 [P] Create user manual with screenshots in docs/user-manual/
- [ ] T084 [P] Update README.md with setup and usage instructions

### Build and Distribution
- [ ] T085 Configure Windows NSIS installer in build/installers/windows/
- [ ] T086 Configure macOS DMG settings in build/installers/mac/
- [ ] T087 Setup code signing for Windows in build/scripts/sign-win.js
- [ ] T088 Setup notarization for macOS in build/scripts/notarize-mac.js
- [ ] T089 Create release automation script in scripts/release.js

### Final Validation
- [ ] T090 Run full test suite and ensure >80% coverage
- [ ] T091 Performance validation: Download speed >5MB/s
- [ ] T092 Performance validation: Subtitle generation <30s/minute
- [ ] T093 Performance validation: UI response <100ms
- [ ] T094 Memory validation: Usage <500MB
- [ ] T095 Cross-platform testing on Windows 10/11
- [ ] T096 Cross-platform testing on macOS 10.14+
- [ ] T097 Security audit with npm audit and Snyk
- [ ] T098 Accessibility testing with screen readers
- [ ] T099 Create demo video and upload to GitHub
- [ ] T100 Final build and publish to GitHub Releases

## Dependencies
- Setup (T001-T010) must complete first
- All tests (T011-T024) before implementation (T025-T071)
- Core models (T025-T029) before services (T030-T034)
- Services before IPC handlers (T035-T039)
- Main process (T040-T044) before renderer (T045-T058)
- Binary integration (T059-T063) can run parallel with UI development
- Polish phase (T072-T100) only after core implementation

## Parallel Execution Examples

### Launch all contract tests together:
```typescript
// Run T011-T020 in parallel
Task: "Contract test for video:info:fetch in tests/contract/ipc/test_video_info_fetch.spec.ts"
Task: "Contract test for video:download:start in tests/contract/ipc/test_video_download.spec.ts"
Task: "Contract test for subtitle:generate in tests/contract/ipc/test_subtitle_generate.spec.ts"
Task: "Contract test for subtitle:embed in tests/contract/ipc/test_subtitle_embed.spec.ts"
Task: "Contract test for compress:start in tests/contract/ipc/test_compress_start.spec.ts"
// ... continue for all [P] marked tests
```

### Launch all type definitions together:
```typescript
// Run T025-T029 in parallel
Task: "Implement VideoInfo and VideoFormat types in src/shared/types/video.ts"
Task: "Implement Subtitle and BilingualSubtitleConfig types in src/shared/types/subtitle.ts"
Task: "Implement CompressionConfig types in src/shared/types/compression.ts"
Task: "Implement DownloadTask and ProcessingTask types in src/shared/types/tasks.ts"
Task: "Implement UserPreferences types in src/shared/types/preferences.ts"
```

### Launch all React components together:
```typescript
// Run T046-T051 in parallel
Task: "Create VideoInputForm component in src/renderer/components/VideoInputForm.tsx"
Task: "Create DownloadProgress component in src/renderer/components/DownloadProgress.tsx"
Task: "Create SubtitleSettings component in src/renderer/components/SubtitleSettings.tsx"
// ... continue for all [P] marked components
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task or task group
- Use TypeScript strict mode throughout
- Follow Material-UI design patterns
- Ensure Chinese localization from the start
- Test on both Windows and macOS regularly

## Task Generation Rules Applied
1. **From Contracts**:
   - ipc-channels.ts → 6 IPC contract test tasks
   - service-interfaces.ts → 4 service contract test tasks

2. **From Data Model**:
   - 7 entities → 5 type definition tasks (grouped related types)
   - Database schema → storage service and repositories

3. **From User Stories**:
   - 3 main scenarios → 3 integration tests
   - Full workflow → 1 E2E test

4. **From Technical Stack**:
   - Electron + React → main/renderer separation
   - TypeScript → type definitions first
   - Material-UI → component-based UI

## Validation Checklist
- [x] All contracts have corresponding tests (T011-T020)
- [x] All entities have model tasks (T025-T029)
- [x] All tests come before implementation
- [x] Parallel tasks truly independent ([P] marked correctly)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Total tasks: 100 (comprehensive coverage)

---
*Tasks generated: 2025-09-21 | Based on plan.md tech stack*