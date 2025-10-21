# Ask OCR - Project Structure Documentation

This document describes the complete file structure of the Ask OCR application and explains the purpose of each file and directory.

**Last Updated**: 2025-10-21  
**Project Version**: 0.1.0

---

## 📁 Project Overview

```
Ask_Ocr/
├── frontend/                  # React + TypeScript frontend application
├── src-tauri/                 # Rust backend with Tauri framework
├── shared/                    # Shared types and utilities
├── docs/                      # Project documentation
│   └── ocr-decision.md       # OCR implementation decision document
├── .git/                      # Git version control
├── .gitignore                 # Git ignore patterns
├── .prettierrc                # Prettier code formatting config
├── .prettierignore            # Files to ignore for Prettier
├── package.json               # Root project configuration
├── README.md                  # Project introduction and overview
├── Prompt.txt                 # Original project requirements
├── lists.md                   # Detailed task list and planning
└── structures.md              # This file - project structure documentation
```

---

## 🎨 Frontend Directory (`frontend/`)

The frontend is built with **React 18**, **TypeScript**, and **Vite** for fast development and optimized builds.

### File Structure

```
frontend/
├── public/                    # Static assets served as-is
│   └── vite.svg              # Vite logo
├── src/                       # Source code directory
│   ├── assets/               # Images, fonts, and other assets
│   │   └── react.svg         # React logo
│   ├── services/             # Business logic services
│   │   ├── ocr/              # OCR-related services
│   │   │   ├── index.ts      # OCR service exports
│   │   │   ├── ocr.service.ts           # OCR facade with caching
│   │   │   └── tesseract-ocr.service.ts # Tesseract.js implementation
│   │   └── task-queue.service.ts # Async task queue manager
│   ├── App.css               # App component styles
│   ├── App.tsx               # Main App component
│   ├── index.css             # Global styles
│   ├── main.tsx              # Application entry point
│   └── vite-env.d.ts         # Vite environment type definitions
├── node_modules/             # NPM dependencies (not in git)
├── .gitignore                # Frontend-specific git ignore
├── eslint.config.js          # ESLint configuration
├── index.html                # HTML entry point
├── package.json              # Frontend dependencies and scripts
├── package-lock.json         # Locked dependency versions
├── README.md                 # Frontend-specific documentation
├── tsconfig.json             # TypeScript project references
├── tsconfig.app.json         # App TypeScript configuration
├── tsconfig.node.json        # Node/build TypeScript configuration
└── vite.config.ts            # Vite bundler configuration
```

### Key Files Explained

#### `frontend/src/main.tsx`
**Purpose**: Application entry point that renders the React app to the DOM.
- Mounts the root React component
- Sets up React strict mode for development
- Will integrate Tauri API initialization

#### `frontend/src/App.tsx`
**Purpose**: Main application component that serves as the root of the component tree.
- Contains the main layout structure
- Will implement routing and state management
- Integrates with Tauri backend commands

#### `frontend/vite.config.ts`
**Purpose**: Vite bundler configuration optimized for Tauri.
- **Port Configuration**: Fixed port 5173 for Tauri communication
- **Build Targets**: Chrome 105 (Windows) and Safari 13 (macOS/Linux)
- **Path Aliases**: 
  - `@/*` maps to `./src/*` for cleaner imports
  - `@shared/*` maps to `../shared/*` for shared types
- **Environment Variables**: Exposes `VITE_` and `TAURI_` prefixed variables
- **Sourcemaps**: Enabled in debug mode for easier debugging

#### `frontend/tsconfig.app.json`
**Purpose**: TypeScript configuration for the application source code.
- **Strict Mode**: Enabled for maximum type safety
- **Target**: ES2022 for modern JavaScript features
- **Module Resolution**: Bundler mode for Vite compatibility
- **Path Aliases**: Matches Vite config for `@/*` and `@shared/*`
- **JSX**: Configured for React with automatic runtime

#### `frontend/package.json`
**Purpose**: Defines frontend dependencies, scripts, and project metadata.
- **Dependencies**: 
  - React 19: UI framework
  - Tauri API client: Desktop integration
  - Tesseract.js: OCR engine
- **Dev Dependencies**: TypeScript, Vite, ESLint, Prettier
- **Scripts**: 
  - `dev`: Start development server
  - `build`: Production build
  - `lint`: Run ESLint
  - `format`: Format code with Prettier

#### `frontend/src/services/ocr/tesseract-ocr.service.ts`
**Purpose**: Tesseract.js OCR implementation using Web Workers.
- **Features**:
  - Non-blocking OCR processing (runs in Web Worker)
  - Multi-language support (English, Chinese, Spanish, etc.)
  - Progress tracking and confidence scores
  - Language detection capability
  - Worker lifecycle management
- **Main Methods**:
  - `initialize(language)`: Load OCR worker with specific language
  - `recognize(imageData, options)`: Perform OCR on image
  - `detectLanguage(imageData)`: Auto-detect text language
  - `getSupportedLanguages()`: List available languages
  - `terminate()`: Cleanup worker resources
- **Performance**: 2-8 seconds for typical screenshots
- **Export**: Singleton instance `tesseractOcr`

#### `frontend/src/services/ocr/ocr.service.ts`
**Purpose**: High-level OCR service facade with caching and task management.
- **Features**:
  - LRU caching of OCR results (up to 50 entries)
  - Integration with task queue for controlled concurrency
  - Automatic cache key generation from image data
  - Queue status monitoring
  - Task cancellation support
- **Main Methods**:
  - `processImage(imageData, options)`: OCR with caching and queuing
  - `cancelPending()`: Cancel all queued OCR tasks
  - `clearCache()`: Remove cached results
  - `getCacheStats()`: Get cache usage information
  - `cleanup()`: Full resource cleanup
- **Why**: Prevents memory issues and UI blocking from multiple concurrent OCR operations
- **Export**: Singleton instance `ocrService`

#### `frontend/src/services/task-queue.service.ts`
**Purpose**: Priority-based async task queue with cancellation and timeout support.
- **Features**:
  - Configurable concurrency limit (default: 2 for OCR)
  - Priority-based task scheduling (higher priority first)
  - Task cancellation via AbortSignal
  - Automatic timeout handling
  - Task status tracking (pending/running/completed/failed/cancelled)
  - Queue statistics and monitoring
- **Main Methods**:
  - `add(type, executor, options)`: Add task to queue
  - `cancel(taskId)`: Cancel specific task
  - `cancelByType(type)`: Cancel all tasks of a type
  - `getStatus()`: Get queue statistics
  - `clear()`: Clear all pending tasks
- **Instances**:
  - `ocrTaskQueue`: 2 concurrent, 60s timeout (for OCR operations)
  - `generalTaskQueue`: 4 concurrent, 30s timeout (for other tasks)
- **Why**: Prevents browser from freezing when processing multiple OCR requests

#### `frontend/src/services/ocr/index.ts`
**Purpose**: Central export point for OCR services.
- Exports all OCR-related services and types
- Provides clean public API for components to import

---

## ⚙️ Backend Directory (`src-tauri/`)

The backend is built with **Rust** and the **Tauri framework** for native desktop functionality.

### File Structure

```
src-tauri/
├── src/                       # Rust source code
│   └── main.rs               # Main Rust entry point
├── target/                    # Compiled Rust binaries (not in git)
├── icons/                     # Application icons (to be added)
├── Cargo.toml                # Rust package manifest
├── Cargo.lock                # Locked Rust dependency versions
├── build.rs                  # Build script for Tauri
└── tauri.conf.json           # Tauri configuration
```

### Key Files Explained

#### `src-tauri/src/main.rs`
**Purpose**: Main Rust application entry point.
- Initializes the Tauri application
- Registers command handlers that can be called from frontend
- **Current Commands**:
  - `greet(name)`: Example command that returns a greeting message
- **Future Features**:
  - OCR processing commands
  - Screenshot capture functionality
  - File system operations
  - Global shortcut registration
  - System tray integration

#### `src-tauri/Cargo.toml`
**Purpose**: Rust package manifest defining dependencies and metadata.
- **Package Info**: Name, version, description, license
- **Dependencies**:
  - `tauri`: Core Tauri framework with extensive feature flags
  - `serde`: Serialization/deserialization for data transfer
  - `serde_json`: JSON support
- **Feature Flags Enabled**:
  - `dialog-all`: File dialogs (open, save)
  - `fs-all`: File system operations
  - `global-shortcut-all`: Register global keyboard shortcuts
  - `notification-all`: System notifications
  - `shell-open`: Open URLs/files in default applications
  - `system-tray`: System tray icon and menu
  - `window-all`: Complete window management API

#### `src-tauri/build.rs`
**Purpose**: Build script that runs before compilation.
- Invokes `tauri_build::build()` to generate necessary code
- Handles platform-specific build configurations
- Processes icon resources

#### `src-tauri/tauri.conf.json`
**Purpose**: Comprehensive Tauri application configuration.

**Build Configuration**:
- `beforeDevCommand`: Starts Vite dev server before launching
- `beforeBuildCommand`: Builds frontend before bundling
- `devPath`: Points to Vite dev server (http://localhost:5173)
- `distDir`: Points to built frontend files

**Package Configuration**:
- Product name: "Ask OCR"
- Version synced with project version

**Allowlist (Security)**:
- Whitelist of enabled Tauri APIs for security
- **Enabled APIs**:
  - Dialog: File open/save dialogs
  - File System: Read/write with scope restrictions
  - Global Shortcuts: Register hotkeys
  - Notifications: System notifications
  - Shell: Open external links
  - Window: Complete window control
- **Disabled**: APIs not needed are disabled by default

**Bundle Configuration**:
- Category: Productivity
- Identifier: `com.askocr.app`
- Target platforms: All (Windows, macOS, Linux)
- Icon paths for different platforms

**Window Configuration**:
- Default size: 1200x720
- Minimum size: 800x600
- Resizable, centered, with decorations

**System Tray**:
- Icon path and template configuration
- Will provide quick access menu

**File System Scopes**:
- `$APPDATA/*`: Application data directory
- `$RESOURCE/*`: Application resources
- Prevents unauthorized file access

---

## 🔗 Shared Directory (`shared/`)

Contains TypeScript type definitions and utilities shared between frontend and backend.

### File Structure

```
shared/
└── types/
    └── index.ts              # All TypeScript type definitions
```

### Key Files Explained

#### `shared/types/index.ts`
**Purpose**: Central type definition file for the entire application.

**Type Categories**:

1. **OCR Types** (`OcrResult`, `OcrRequest`)
   - Structure for OCR results including text, language, confidence
   - Request format for OCR operations

2. **AI Integration Types** (`AiAnswer`, `SourceLink`, `AiRequest`)
   - AI responses from OpenAI, Perplexity, or local models
   - Source attribution for research results
   - Request types for different AI operations

3. **Model Management Types** (`ModelRecord`, `ModelDownloadProgress`)
   - Local AI model metadata and status
   - Download progress tracking

4. **Settings Types** (`AppSettings`, `ShortcutConfig`, `ApiKeysConfig`, etc.)
   - User preferences and configuration
   - Keyboard shortcuts (customizable)
   - API keys (to be encrypted)
   - OCR settings (language, mode)
   - Privacy settings (local mode, consent, cleanup)

5. **Screenshot Types** (`ScreenshotRegion`, `ScreenshotRequest`, `ScreenshotResult`)
   - Screenshot capture parameters
   - Region selection data

6. **UI State Types** (`ModalTab`, `LoadingState`, `ErrorState`)
   - Frontend UI state management
   - Loading and error states

7. **Export Types** (`ExportOptions`, `ExportResult`)
   - File export configurations
   - Export result status

8. **Database Types** (`DatabaseSchema`)
   - Structure for local data storage

9. **Utility Types** (`AsyncTask`, `AsyncTaskStatus`)
   - Background task management
   - Task queue implementation

**Usage**:
- Import in frontend: `import { OcrResult } from '@shared/types';`
- Ensures type consistency across the application
- Single source of truth for data structures

---

## 🔧 Configuration Files (Root)

### `.gitignore`
**Purpose**: Specifies files and directories Git should ignore.
- **Ignored**:
  - `node_modules/`: NPM dependencies
  - `target/`: Rust build artifacts
  - `dist/`: Build outputs
  - `.env*`: Environment variables and secrets
  - `*.db`, `*.sqlite*`: Local databases
  - `user-data/`, `history/`, `models/`: User-generated content
  - API keys and sensitive files
  - OS-specific files (Thumbs.db, .DS_Store)

### `.prettierrc`
**Purpose**: Prettier code formatter configuration.
- **Settings**:
  - Semicolons: Enabled
  - Single quotes: Enabled
  - Print width: 100 characters
  - Tab width: 2 spaces
  - Trailing commas: ES5 compatible
  - Auto line endings for cross-platform

### `docs/ocr-decision.md`
**Purpose**: Documents the OCR implementation approach decision.
- Compares Tesseract.js vs local backend OCR
- Evaluation criteria: performance, accuracy, setup complexity, size
- **Decision**: Hybrid approach - start with Tesseract.js, add optional local backend later
- Technical implementation strategy and optimization plans
- Performance targets and language support details
- **Why**: Provides rationale for architectural decisions

### `.prettierignore`
**Purpose**: Files that Prettier should not format.
- Ignores: node_modules, dist, build outputs, logs, Tauri/Rust artifacts

### `package.json` (Root)
**Purpose**: Root project configuration and scripts.
- **Scripts**:
  - `dev`: Runs frontend dev server
  - `build`: Builds frontend
  - `tauri:dev`: Launches Tauri dev mode
  - `tauri:build`: Creates production build
  - `setup`: Installs all dependencies

### `README.md`
**Purpose**: Project introduction and quick start guide.
- Features overview
- Tech stack summary
- Installation and development instructions

### `Prompt.txt`
**Purpose**: Original comprehensive project requirements document.
- Contains all feature specifications
- Design requirements
- Architecture guidelines
- Used as reference for development

### `lists.md`
**Purpose**: Detailed task breakdown and project planning.
- **Structure**:
  - 🔴 CORE: Foundation tasks (highest priority)
  - 🟢 FEATURES: Core functionality
  - 🔵 UI: User experience
  - 🟡 ADDITIONAL: Nice-to-have features
- ~250+ tasks across 30 sections
- Checkbox format for progress tracking

### `structures.md` (This File)
**Purpose**: Complete project structure documentation.
- Explains every file and directory
- Documents architecture decisions
- Serves as onboarding reference
- Auto-updated as project evolves

---

## 🚀 Development Workflow

### Starting Development

1. **Install Dependencies**:
   ```bash
   npm run setup
   ```

2. **Start Dev Mode**:
   ```bash
   npm run tauri:dev
   ```
   This will:
   - Start Vite dev server on port 5173
   - Compile Rust backend
   - Launch desktop application with hot reload

### Building for Production

```bash
npm run tauri:build
```
- Creates optimized production build
- Generates platform-specific installers
- Output in `src-tauri/target/release/bundle/`

### Code Quality

- **Type Checking**: `cd frontend && npm run type-check`
- **Linting**: `cd frontend && npm run lint`
- **Formatting**: `cd frontend && npm run format`

---

## 📊 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI components and state management |
| Language | TypeScript | Type safety and better DX |
| Bundler | Vite 5 | Fast development and optimized builds |
| Backend | Rust | Native performance and system integration |
| Framework | Tauri 1.5 | Desktop app framework |
| Styling | Tailwind CSS | Utility-first CSS (to be added) |
| OCR | Tesseract.js | JavaScript OCR engine |
| AI | OpenAI/Perplexity | Cloud AI services |

---

## 🗺️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ UI Components│  │ State Manager│  │ Tauri API Hook│  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │           │
│         └────────────────┴───────────────────┘           │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │ IPC (Commands/Events)
┌──────────────────────────┼───────────────────────────────┐
│                          │                               │
│                     Tauri Core                           │
│  ┌──────────────┐  ┌────▼─────────┐  ┌───────────────┐  │
│  │Window Manager│  │Command Handler│  │System Tray    │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │Global Hotkeys│  │  File System │  │  Notifications│  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                    Native OS APIs
```

---

## 📝 Next Steps

### Immediate Tasks (From lists.md - CORE)
1. ✅ Project Architecture & Setup - **COMPLETED**
2. 🔄 OCR Core Implementation - **IN PROGRESS**
   - ✅ OCR approach evaluation and documentation
   - ✅ Tesseract.js service implementation
   - ✅ Async task queue system
   - ⏳ Language file bundling for offline support
3. ⏳ Screenshot Capture System - **NEXT**
4. ⏳ Local Data Storage
5. ⏳ AI Integration Core
6. ⏳ Security & Privacy
7. ⏳ Cross-Platform Compatibility

### Current Status
- ✅ Git repository initialized
- ✅ Project structure created (frontend/, src-tauri/, shared/, docs/)
- ✅ Tauri + React configured with proper build pipeline
- ✅ TypeScript strict mode enabled with path aliases
- ✅ Build pipeline configured for Windows/macOS
- ✅ Shared types defined (OCR, AI, Settings, etc.)
- ✅ OCR service layer implemented (Tesseract.js)
- ✅ Task queue system for async operations
- ✅ LRU caching for OCR results
- ⚠️ TypeScript warnings to fix (see tobefix.md)
- ⏳ Frontend UI components pending
- ⏳ Backend Tauri commands pending
- ⏳ Screenshot capture pending
- ⏳ Global shortcuts pending

### Important Notes for Production
- 🔴 **Critical**: Must bundle Tesseract.js language files for offline EXE
- 🔴 **Critical**: Configure worker paths for packaged environment
- ⚠️ **Important**: Test on clean machine without dev dependencies

---

## 🔄 Maintenance

This document should be updated when:
- New files or directories are added
- Architecture decisions are made
- Configuration changes significantly
- New modules or features are implemented

**Automation**: Consider setting up a pre-commit hook to remind updating this file.

---

*This document is maintained as part of the Ask OCR project.*
*For questions or clarifications, refer to Prompt.txt or lists.md.*
