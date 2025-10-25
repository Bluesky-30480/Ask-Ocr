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
│   └── icons/                # Application icons (all platforms)
├── shared/                    # Shared types and utilities
├── docs/                      # Project documentation
│   ├── ocr-decision.md       # OCR implementation decision document
│   └── tesseract-bundling.md # Tesseract.js offline bundling guide (NEW)
├── .git/                      # Git version control
├── .gitignore                 # Git ignore patterns
├── .prettierrc                # Prettier code formatting config
├── .prettierignore            # Files to ignore for Prettier
├── package.json               # Root project configuration
├── README.md                  # Project introduction and overview
├── Prompt.txt                 # Original project requirements
├── lists.md                   # Detailed task list and planning
├── structures.md              # This file - project structure documentation
├── tobefix.md                 # Issue tracking and error management
├── PROGRESS.md                # Development session summaries
└── PRIVACY_POLICY.md          # Privacy policy documentation (NEW Session 6)
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
│   │   │   ├── ocr.service.ts                   # OCR facade with caching
│   │   │   ├── tesseract-ocr.service.ts         # Tesseract.js implementation
│   │   │   ├── hybrid-ocr.service.ts            # Offline/online OCR (NEW Session 6)
│   │   │   └── screenshot-ocr-workflow.service.ts # Screenshot→OCR pipeline (NEW Session 6)
│   │   ├── shortcuts/        # Shortcut and screenshot services
│   │   │   ├── index.ts      # Service exports
│   │   │   ├── shortcut-manager.service.ts  # Global shortcut manager
│   │   │   └── screenshot-manager.service.ts # Screenshot capture
│   │   ├── security/         # Security and privacy (NEW Session 6)
│   │   │   ├── index.ts      # Security service exports
│   │   │   ├── encryption.service.ts        # AES-256-GCM encryption
│   │   │   ├── api-key-manager.service.ts   # Encrypted API key storage
│   │   │   ├── privacy-manager.service.ts   # Permission system
│   │   │   ├── data-upload-notifier.service.ts # Upload notifications
│   │   │   ├── privacy-settings.service.ts  # Offline-first settings
│   │   │   └── secure-cleanup.service.ts    # Secure data deletion
│   │   ├── platform/         # Cross-platform support (NEW Session 6)
│   │   │   ├── index.ts      # Platform service exports
│   │   │   ├── platform.service.ts          # OS detection & helpers
│   │   │   └── shortcut-mapper.service.ts   # Platform shortcuts (130+)
│   │   ├── system-tray/      # System tray integration (NEW Session 6)
│   │   │   ├── index.ts      # Tray service exports
│   │   │   └── system-tray.service.ts       # Tray icon & menu
│   │   ├── ai/               # AI integration (Session 5)
│   │   │   ├── index.ts      # AI service exports
│   │   │   ├── ai-manager.service.ts        # Multi-provider coordination
│   │   │   ├── openai-client.service.ts     # OpenAI API client
│   │   │   ├── perplexity-client.service.ts # Perplexity API client
│   │   │   └── prompt-templates.service.ts  # 7 prompt templates
│   │   ├── task-queue.service.ts # Async task queue manager
│   │   └── database.service.ts   # Database operations
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
- **Static Copy Plugin**: Bundles Tesseract.js worker and WASM files for offline OCR
  - Copies `worker.min.js` and `worker.min.js.map` to `dist/tessdata/`
  - Copies `tesseract-core.wasm.js` to `dist/`
  - Ensures OCR works in packaged .exe without internet

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

#### `frontend/src/services/ocr/hybrid-ocr.service.ts` (NEW - Session 6)
**Purpose**: Hybrid OCR service with offline-first strategy and online fallback.
- **Features**:
  - Three modes: offline (force local), online (force remote), auto (intelligent)
  - Network connectivity detection with 30s caching
  - Firewall detection for graceful degradation
  - Provider registration system for extensibility
  - Timeout protection (10s default)
- **Main Methods**:
  - `recognize(imageData, mode)`: Auto-select offline/online based on mode
  - `recognizeOffline(imageData)`: Force local Tesseract.js processing
  - `recognizeOnline(imageData)`: Try registered online providers
  - `registerOnlineProvider(provider)`: Add custom OCR provider
  - `checkOnlineAvailability()`: Test network with caching
- **Export**: Singleton instance `hybridOcr`

#### `frontend/src/services/screenshot-ocr-workflow.service.ts` (NEW - Session 6)
**Purpose**: End-to-end screenshot→OCR workflow with progress tracking.
- **Features**:
  - 5-stage progress tracking (capturing 10-30%, processing 40-80%, saving 90%, complete 100%)
  - Quick capture mode (one-line API)
  - Cancellation support for long operations
  - Auto-save to database
  - Error recovery
- **Main Methods**:
  - `captureAndProcess(mode, options)`: Full workflow with progress callback
  - `quickCapture(mode)`: Simple one-line screenshot + OCR
  - `cancel()`: Stop active workflow
- **Export**: Singleton instance `screenshotOcrWorkflow`

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

#### `frontend/src/services/shortcuts/shortcut-manager.service.ts`
**Purpose**: Frontend interface for global keyboard shortcut management.
- **Features**:
  - Register/unregister shortcuts via Tauri backend
  - Listen for shortcut trigger events
  - Callback system for shortcut actions
  - Default shortcut registration (Ctrl+Shift+S for screenshot, etc.)
  - Conflict detection before registration
- **Main Methods**:
  - `initialize()`: Setup event listeners
  - `register(id, accelerator, callback)`: Register new shortcut
  - `unregister(id)`: Remove shortcut
  - `getRegistered()`: List all shortcuts
  - `isAvailable(accelerator)`: Check if key combo is free
  - `update(id, newAccelerator)`: Change shortcut binding
  - `registerDefaults(callbacks)`: Setup default app shortcuts
  - `cleanup()`: Remove all shortcuts and listeners
- **Export**: Singleton `shortcutManager`
- **Events**: Listens for `shortcut-triggered` from Rust backend

#### `frontend/src/services/shortcuts/screenshot-manager.service.ts`
**Purpose**: Frontend interface for screenshot capture operations.
- **Features**:
  - Capture full screen, window, or region
  - Show/hide screenshot selection overlay
  - Event-based region selection
  - Base64 image data handling
- **Main Methods**:
  - `captureFullScreen()`: Capture entire screen
  - `captureWindow()`: Capture active window
  - `captureRegion(region)`: Capture specific area
  - `showOverlay(callback)`: Display selection UI
  - `hideOverlay()`: Close selection UI
  - `cleanup()`: Remove event listeners
- **Export**: Singleton `screenshotManager`
- **Returns**: ScreenshotResult with base64 image or error

#### `frontend/src/services/shortcuts/index.ts`
**Purpose**: Central export point for shortcut and screenshot services.
- Exports managers and related types
- Clean import interface for components

#### `frontend/src/services/database.service.ts` (NEW)
**Purpose**: Frontend interface for database operations via Tauri backend.
- **Features**:
  - Type-safe wrappers for all database commands
  - Error handling and logging
  - Helper methods for common operations
- **OCR Record Operations**:
  - `createOcrRecord(record)`: Save OCR result to database
  - `getOcrRecord(id)`: Retrieve specific record
  - `getAllOcrRecords(limit, offset)`: Get paginated history
  - `updateOcrRecord(id, record)`: Update summary, tags, AI answers
  - `deleteOcrRecord(id)`: Remove record
- **Model Record Operations**:
  - `createModelRecord(record)`: Register installed model
  - `getAllModelRecords()`: List all models
  - `deleteModelRecord(id)`: Remove model registration
- **Settings Operations**:
  - `setSetting(setting)`: Save or update setting (upsert)
  - `getSetting(key)`: Retrieve specific setting
  - `getAllSettings(category?)`: Get all or filtered settings
  - `deleteSetting(key)`: Remove setting
- **Helpers**:
  - `now()`: Get current timestamp
  - `createOcrRecordTemplate()`: Create record with defaults
  - `createSettingTemplate()`: Create setting with defaults
- **Export**: Singleton `databaseService`

#### `frontend/src/services/security/` (NEW - Session 6)
**Purpose**: Security and privacy services for API key encryption, permissions, and data protection.

##### `encryption.service.ts`
- **Purpose**: Web Crypto API encryption for sensitive data
- **Features**: AES-256-GCM encryption, PBKDF2 key derivation (100k iterations), random salt/IV
- **Methods**: `encrypt()`, `decrypt()`, `deriveKey()`, `hashPassword()`
- **Export**: `encryptionService`

##### `api-key-manager.service.ts`
- **Purpose**: Encrypted API key storage with master password
- **Features**: Master password protection, in-memory caching, auto-lock, password validation
- **Methods**: `setMasterPassword()`, `unlock()`, `storeApiKey()`, `getApiKey()`, `changeMasterPassword()`
- **Export**: `apiKeyManager`

##### `privacy-manager.service.ts`
- **Purpose**: User privacy permissions and consent tracking
- **Features**: 7 permission types, grant/revoke system, consent versioning, offline mode
- **Methods**: `grantPermission()`, `revokePermission()`, `hasPermission()`, `acceptPrivacyPolicy()`
- **Export**: `privacyManager`

##### `data-upload-notifier.service.ts`
- **Purpose**: Notifications for data uploads to remote services
- **Features**: Toast/system notifications, upload history, statistics, confirmation dialogs
- **Methods**: `notify()`, `getHistory()`, `getStatistics()`, `requestUploadConfirmation()`
- **Export**: `dataUploadNotifier`

##### `privacy-settings.service.ts`
- **Purpose**: Offline-first privacy settings management
- **Features**: Default offline mode, granular controls, import/export, feature-gating
- **Methods**: `updateSettings()`, `enableOfflineMode()`, `resetToDefaults()`, `exportSettings()`
- **Export**: `privacySettingsService`

##### `secure-cleanup.service.ts`
- **Purpose**: Secure data deletion on uninstall
- **Features**: Full/partial cleanup, secure wiping, auto-cleanup scheduling
- **Methods**: `fullCleanup()`, `cleanup(options)`, `exportData()`, `scheduleAutoCleanup()`
- **Export**: `secureDataCleanupService`

#### `frontend/src/services/platform/` (NEW - Session 6)
**Purpose**: Cross-platform compatibility for Windows/macOS/Linux.

##### `platform.service.ts`
- **Purpose**: Platform detection and OS-specific helpers
- **Features**: OS detection, platform paths, modifier keys (Ctrl/Cmd), feature detection
- **Methods**: `isWindows()`, `isMacOS()`, `getModifierKey()`, `getAppDataPath()`, `supportsFeature()`
- **Export**: `platformService`

##### `shortcut-mapper.service.ts`
- **Purpose**: Platform-specific keyboard shortcuts (130+ mappings)
- **Features**: Global/window/editor categories, conflict detection, Tauri format conversion
- **Methods**: `getShortcut(id)`, `getAllShortcuts()`, `hasConflict()`, `toTauriFormat()`
- **Export**: `shortcutMapper`

#### `frontend/src/services/system-tray/` (NEW - Session 6)
**Purpose**: System tray integration.

##### `system-tray.service.ts`
- **Purpose**: Tray icon and menu management
- **Features**: Tray initialization, offline toggle, window show/hide, tooltip management
- **Methods**: `initialize()`, `toggleOfflineMode()`, `setTooltip()`, `showWindow()`, `hideWindow()`
- **Export**: `systemTrayService`

---

## ⚙️ Backend Directory (`src-tauri/`)

The backend is built with **Rust** and the **Tauri framework** for native desktop functionality.

### File Structure

```
src-tauri/
├── src/                       # Rust source code
│   ├── shortcuts/            # Global shortcut management
│   │   └── mod.rs            # Shortcut registration and handling
│   ├── screenshot/           # Screenshot capture module
│   │   └── mod.rs            # Screenshot commands
│   ├── database/             # SQLite database module (NEW)
│   │   └── mod.rs            # Database schema and CRUD operations
│   └── main.rs               # Main Rust entry point
├── target/                    # Compiled Rust binaries (not in git)
├── icons/                     # Application icons (multi-platform)
│   ├── 32x32.png             # Small icon
│   ├── 128x128.png           # Medium icon
│   ├── 128x128@2x.png        # Retina medium icon
│   ├── icon.icns             # macOS icon bundle
│   ├── icon.ico              # Windows icon
│   ├── icon.png              # System tray icon
│   └── Square*.png           # Windows Store icons
├── Cargo.toml                # Rust package manifest
├── Cargo.lock                # Locked Rust dependency versions
├── build.rs                  # Build script for Tauri
└── tauri.conf.json           # Tauri configuration
```

### Key Files Explained

#### `src-tauri/src/main.rs`
**Purpose**: Main Rust application entry point.
- Initializes the Tauri application
- Manages application state (ShortcutState)
- Registers all command handlers that can be called from frontend
- **Registered Commands**:
  - `greet(name)`: Example greeting command
  - Shortcut commands: register, unregister, get_registered, etc.
  - Screenshot commands: capture_fullscreen, capture_window, capture_region, etc.
- **Modules**: shortcuts, screenshot

#### `src-tauri/src/shortcuts/mod.rs`
**Purpose**: Global keyboard shortcut management.
- **Features**:
  - Register/unregister global shortcuts via OS APIs
  - Shortcut conflict detection (checks if already registered)
  - Maintain shortcut state across app lifecycle
  - Emit events to frontend when shortcuts are triggered
- **Commands**:
  - `register_shortcut`: Register new global shortcut
  - `unregister_shortcut`: Remove specific shortcut
  - `unregister_all_shortcuts`: Clear all shortcuts
  - `get_registered_shortcuts`: List active shortcuts
  - `is_shortcut_available`: Check if accelerator is free
  - `update_shortcut`: Change shortcut key binding
- **State**: Uses Mutex-protected HashMap to track shortcuts
- **Events**: Emits `shortcut-triggered` with shortcut ID

#### `src-tauri/src/screenshot/mod.rs`
**Purpose**: Screenshot capture functionality (placeholder for implementation).
- **Features** (to be implemented):
  - Full screen capture
  - Active window capture
  - Region selection capture
  - Screenshot overlay window management
- **Commands**:
  - `capture_fullscreen`: Capture entire screen
  - `capture_window`: Capture active window
  - `capture_region`: Capture specific area
  - `show_screenshot_overlay`: Display selection UI
  - `hide_screenshot_overlay`: Close selection UI
- **Returns**: ScreenshotResult with base64 image data
- **TODO**: Integrate screenshots-rs crate for actual capture

#### `src-tauri/src/database/mod.rs` (NEW)
**Purpose**: SQLite database module for local data storage.
- **Database**: Single SQLite file at `%APPDATA%/AskOCR/askocr.db`
- **Tables**:
  - `ocr_record`: Stores all OCR results with text, language, timestamps, AI answers
  - `model_record`: Tracks installed AI models with paths, versions, hashes
  - `settings`: Key-value store for app preferences (shortcuts, API keys, theme)
- **Indexes**: Performance indexes on timestamp, language, and setting keys
- **Commands** (15 total):
  - OCR Records: create, get, get_all (with pagination), update, delete
  - Model Records: create, get_all, delete
  - Settings: set (upsert), get, get_all (with category filter), delete
- **Data Models**: OcrRecord, ModelRecord, Setting with full field definitions
- **Thread Safety**: Uses Mutex for connection safety
- **Auto-Initialization**: Creates tables and indexes on first run

#### `src-tauri/Cargo.toml`
**Purpose**: Rust package manifest defining dependencies and metadata.
- **Package Info**: Name, version, description, license
- **Dependencies**:
  - `tauri`: Core Tauri framework with extensive feature flags
  - `serde`: Serialization/deserialization for data transfer
  - `serde_json`: JSON support
  - `rusqlite`: SQLite database with bundled SQLite engine (NEW)
  - `chrono`: Date and time handling with serde support (NEW)
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

### `docs/tesseract-bundling.md` (NEW)
**Purpose**: Comprehensive guide for bundling Tesseract.js for offline EXE support.
- **Problem**: Tesseract.js downloads language files at runtime from CDN
- **Solution**: Bundle all assets (language files, workers, WASM) into app
- **Implementation Guide**:
  - Phase 1: Language files (.traineddata) - Download and bundle in Tauri resources
  - Phase 2: Worker files - Copy to public directory via Vite plugin
  - Phase 3: Core WASM - Bundle tesseract-core.wasm.js
- **File Size Analysis**: Documents size for different language packs
- **Testing Checklist**: Dev and production testing procedures
- **Code Examples**: Complete implementation with path resolution
- **Priority Levels**: High (English), Medium (CJK), Low (all languages)
- **Critical for Release**: Must implement before packaging .exe

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
2. ✅ OCR Core Implementation - **COMPLETED**
   - ✅ OCR approach evaluation and documentation
   - ✅ Tesseract.js service implementation
   - ✅ Async task queue system
   - ⏳ Language file bundling for offline support (before release)
3. 🔄 Screenshot Capture System - **IN PROGRESS**
   - ✅ Global shortcut system (Rust + Frontend)
   - ✅ Screenshot commands architecture
   - ⏳ Actual screenshot capture implementation
   - ⏳ Screenshot overlay UI
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
- ✅ Shared types defined (OCR, AI, Settings, Screenshots, etc.)
- ✅ OCR service layer implemented (Tesseract.js + caching)
- ✅ Task queue system for async operations
- ✅ Global shortcut system (Rust backend + Frontend service)
- ✅ Screenshot command architecture (backend placeholder)
- ✅ Shortcut conflict detection
- ⚠️ TypeScript warnings to fix (see tobefix.md)
- ⚠️ Need to run `npm install` in frontend/
- ⏳ Frontend UI components pending
- ⏳ Actual screenshot capture implementation (need screenshots-rs)
- ⏳ Screenshot overlay UI pending

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
