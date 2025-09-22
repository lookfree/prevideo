# Implementation Plan: YouTube视频下载器与字幕处理器

**Branch**: `001-youtube-youtube` | **Date**: 2025-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-youtube-youtube/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
开发一个基于Electron的桌面应用程序，用于下载YouTube视频、自动生成或嵌入双语字幕，并提供视频压缩功能。系统将使用yt-dlp进行视频下载，Whisper进行字幕生成，ffmpeg进行视频处理和压缩，支持断点续传和多种输出格式。

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: Electron, yt-dlp, OpenAI Whisper, ffmpeg, electron-builder
**Storage**: 本地文件系统 + SQLite (用于任务状态和用户偏好)
**Testing**: Jest + Playwright (E2E测试)
**Target Platform**: Windows, macOS, Linux 桌面应用
**Project Type**: single (Electron桌面应用，含主进程和渲染进程)
**Performance Goals**: 下载速度 >5MB/s, 字幕生成 <30s/分钟视频, UI响应 <100ms
**Constraints**: <200ms UI响应时间, <500MB内存占用, 支持大文件(>4GB)
**Scale/Scope**: 个人使用, 单任务处理, 预计日活用户 <1000

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Code Quality First
- 使用TypeScript确保类型安全
- ESLint + Prettier进行代码规范
- 清晰的模块化架构（主进程/渲染进程分离）

### ✅ II. Test-Driven Development (NON-NEGOTIABLE)
- 单元测试覆盖核心业务逻辑
- 集成测试覆盖视频下载、字幕生成流程
- E2E测试覆盖用户交互场景

### ✅ III. User Experience Consistency
- 统一的Material Design风格
- 实时进度反馈
- 错误信息本地化（中文）
- 键盘快捷键支持

### ✅ IV. Performance by Design
- 视频下载使用流式处理
- 字幕生成使用Worker线程
- UI响应时间 <100ms
- 内存占用 <500MB

### ✅ V. Security as Foundation
- URL输入验证和清理
- 文件路径安全检查
- 进程间通信使用contextBridge
- 定期更新依赖项

### ✅ VI. Documentation Standards
- API文档使用TypeDoc
- 用户手册包含截图
- 架构决策记录(ADR)

### ✅ VII. Continuous Integration
- GitHub Actions自动构建
- 自动化测试运行
- electron-builder自动打包

## Project Structure

### Documentation (this feature)
```
specs/001-youtube-youtube/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Electron应用结构
src/
├── main/               # 主进程
│   ├── services/       # 业务服务
│   │   ├── downloader.ts    # yt-dlp封装
│   │   ├── subtitles.ts     # Whisper封装
│   │   └── converter.ts     # ffmpeg封装
│   ├── ipc/           # IPC处理
│   └── index.ts       # 主进程入口
├── renderer/          # 渲染进程
│   ├── components/    # React组件
│   ├── pages/        # 页面组件
│   ├── hooks/        # 自定义Hooks
│   └── index.tsx     # 渲染进程入口
├── shared/           # 共享代码
│   ├── types/        # TypeScript类型定义
│   └── constants/    # 常量定义
└── preload/          # 预加载脚本
    └── index.ts

tests/
├── unit/            # 单元测试
├── integration/     # 集成测试
└── e2e/            # 端到端测试

resources/          # 应用资源
├── icons/         # 应用图标
└── binaries/      # 外部二进制文件
    ├── yt-dlp/
    ├── ffmpeg/
    └── whisper/
```

**Structure Decision**: Single project (Electron桌面应用)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Electron最佳实践和安全配置
   - yt-dlp Node.js集成方式
   - Whisper本地部署和性能优化
   - ffmpeg双语字幕嵌入参数
   - 断点续传实现策略

2. **Generate and dispatch research agents**:
   ```
   Task: "Research Electron security best practices and contextBridge usage"
   Task: "Find yt-dlp Node.js wrapper libraries and断点续传实现"
   Task: "Research Whisper deployment options (Python binding vs API)"
   Task: "Find ffmpeg parameters for bilingual subtitle embedding"
   Task: "Research SQLite integration with Electron for task persistence"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - VideoInfo: 视频元数据
   - Subtitle: 字幕数据
   - CompressionConfig: 压缩配置
   - DownloadTask: 下载任务状态
   - UserPreferences: 用户偏好设置

2. **Generate API contracts** from functional requirements:
   - IPC通道定义 (主进程<->渲染进程)
   - 服务层接口定义
   - 事件总线契约

3. **Generate contract tests** from contracts:
   - IPC通道测试
   - 服务接口测试
   - 事件处理测试

4. **Extract test scenarios** from user stories:
   - 下载视频场景
   - 生成字幕场景
   - 压缩视频场景
   - 错误处理场景

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add Electron + TypeScript context
   - Update recent changes
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- 环境设置任务 (Electron, TypeScript配置)
- 外部工具集成任务 (yt-dlp, Whisper, ffmpeg)
- 核心功能实现任务 (下载、字幕、压缩)
- UI组件开发任务
- 测试编写任务

**Ordering Strategy**:
- TDD order: 测试先于实现
- 依赖顺序: 环境 → 工具集成 → 核心功能 → UI
- 标记 [P] 并行任务

**Estimated Output**: 30-35个有序任务

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

无违规项，所有原则均已满足。

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (无)

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*