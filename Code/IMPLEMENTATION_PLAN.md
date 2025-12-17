# Implementation Plan - Lists.md Tasks (Up to 21.3)

## Overview
This document outlines the implementation plan for completing tasks from lists.md up to task 21.3, focusing on:
1. 1-Click Ollama Installation
2. Universal Quick-Access AI Assistant (Tasks 21.1-21.3)

## Current Status Analysis

### Already Implemented
- ✅ Ollama detection system (`src-tauri/src/ollama/detector.rs`)
  - Check if Ollama is installed
  - Get Ollama installation path
  - Check if Ollama service is running
  - Start Ollama service

### Missing Components

#### 1. Ollama 1-Click Installer
**Status**: Partially implemented (detection only, no installer)
**Required**:
- Download Ollama installer
- Install Ollama with progress tracking
- Verify installation
- Auto-start Ollama service
- UI component for installation flow

#### 2. Task 21.1 - Global Hotkey Registration System
**Status**: Not implemented
**Required**:
- Customizable hotkey combinations
- Platform-specific key binding
- Conflict detection
- Hotkey recording interface
- Multiple hotkey profiles

#### 3. Task 21.2 - Floating Quick-Input Window
**Status**: Not implemented
**Required**:
- Always-on-top window
- Draggable and resizable
- Auto-hide on focus loss
- Blur/transparency effects
- Context indicator
- Compact/expanded modes

#### 4. Task 21.3 - Active Application Context Detection
**Status**: Partially implemented (basic detection exists)
**Required**:
- Real-time focused application detection
- Intelligent context extraction per app type
- Platform-specific integration (Win32, macOS Accessibility, Linux X11)
- Context caching
- Privacy controls

## Implementation Order

### Phase 1: Ollama 1-Click Installer (Priority: HIGH)
1. Create Rust installer module
2. Implement download with progress
3. Add installation logic
4. Create UI component
5. Integrate with settings page

### Phase 2: Global Hotkey System (Priority: CRITICAL)
1. Extend existing shortcut system
2. Add customizable hotkey recording
3. Implement conflict detection UI
4. Add hotkey profiles

### Phase 3: Floating Quick-Input Window (Priority: CRITICAL)
1. Create new Tauri window for quick input
2. Implement always-on-top behavior
3. Add drag/resize functionality
4. Create UI with context indicator
5. Implement auto-hide logic

### Phase 4: Context Detection (Priority: CRITICAL)
1. Implement platform-specific detection
2. Add context extraction per app type
3. Create context caching system
4. Add privacy controls
5. Integrate with quick-input window

## Detailed Task Breakdown

### 1. Ollama 1-Click Installer

#### Backend (Rust)
- [ ] Create `src-tauri/src/ollama/installer.rs`
  - [ ] Download Ollama installer from official URL
  - [ ] Show download progress
  - [ ] Verify download integrity (checksum)
  - [ ] Execute installer silently
  - [ ] Wait for installation completion
  - [ ] Verify installation success
  - [ ] Auto-start Ollama service
  - [ ] Handle errors gracefully

#### Frontend (React/TypeScript)
- [ ] Create `frontend/src/components/Settings/sections/OllamaInstaller.tsx`
  - [ ] Installation status display
  - [ ] Progress bar for download
  - [ ] Installation steps indicator
  - [ ] Error messages
  - [ ] Success confirmation
  - [ ] "Install Ollama" button
  - [ ] "Check Status" button

#### Integration
- [ ] Add installer commands to `src-tauri/src/main.rs`
- [ ] Integrate with AISettings component
- [ ] Add to settings page

### 2. Global Hotkey System (Task 21.1)

#### Backend (Rust)
- [ ] Extend `src-tauri/src/shortcuts/mod.rs`
  - [ ] Add customizable hotkey registration
  - [ ] Implement conflict detection
  - [ ] Add hotkey profiles support
  - [ ] Platform-specific key mapping

#### Frontend (React/TypeScript)
- [ ] Extend `frontend/src/components/ShortcutCustomizer/ShortcutCustomizer.tsx`
  - [ ] Add hotkey recording UI
  - [ ] Show conflict warnings
  - [ ] Profile management UI
  - [ ] Hotkey testing interface

### 3. Floating Quick-Input Window (Task 21.2)

#### Backend (Rust)
- [ ] Create `src-tauri/src/quick_input/mod.rs`
  - [ ] Window creation with always-on-top
  - [ ] Position management
  - [ ] Focus detection
  - [ ] Auto-hide logic

#### Frontend (React/TypeScript)
- [ ] Create `frontend/src/components/QuickInput/QuickInputWindow.tsx`
  - [ ] Input field with auto-focus
  - [ ] Context indicator badge
  - [ ] Compact/expanded mode toggle
  - [ ] Drag handle
  - [ ] Resize handles
  - [ ] Theme support

#### HTML Page
- [ ] Create `frontend/quick-input.html`
  - [ ] Minimal standalone page
  - [ ] Load QuickInputWindow component
  - [ ] Handle Tauri events

### 4. Context Detection (Task 21.3)

#### Backend (Rust)
- [ ] Create `src-tauri/src/context/detector.rs`
  - [ ] Windows: Win32 API integration
  - [ ] macOS: Accessibility API integration
  - [ ] Linux: X11/Wayland integration
  - [ ] Get focused window info
  - [ ] Extract window title, process name
  - [ ] Get selected text (if available)

#### Frontend (React/TypeScript)
- [ ] Create `frontend/src/services/context/context-detection.service.ts`
  - [ ] Poll for active window changes
  - [ ] Cache context data
  - [ ] Classify application type
  - [ ] Extract relevant context
  - [ ] Privacy filtering

#### Integration
- [ ] Connect context to quick-input window
- [ ] Show context indicator
- [ ] Adapt AI prompts based on context

## File Structure

```
src-tauri/src/
├── ollama/
│   ├── mod.rs (existing)
│   ├── detector.rs (existing)
│   └── installer.rs (NEW)
├── shortcuts/
│   └── mod.rs (extend)
├── quick_input/
│   └── mod.rs (NEW)
└── context/
    └── detector.rs (extend existing)

frontend/src/
├── components/
│   ├── Settings/sections/
│   │   └── OllamaInstaller.tsx (NEW)
│   ├── ShortcutCustomizer/
│   │   └── ShortcutCustomizer.tsx (extend)
│   └── QuickInput/
│       └── QuickInputWindow.tsx (NEW)
└── services/
    └── context/
        └── context-detection.service.ts (NEW)

frontend/
└── quick-input.html (NEW)
```

## Dependencies

### Rust Crates (add to Cargo.toml)
```toml
reqwest = { version = "0.11", features = ["stream"] }
tokio = { version = "1", features = ["full"] }
sha2 = "0.10"  # For checksum verification
```

### Frontend Packages (already available)
- @tauri-apps/api
- React
- TypeScript

## Testing Plan

### Ollama Installer
1. Test download on slow connection
2. Test installation on clean system
3. Test installation when Ollama already exists
4. Test error handling (network failure, disk space, permissions)
5. Test on Windows, macOS, Linux

### Global Hotkey
1. Test hotkey registration
2. Test conflict detection
3. Test hotkey recording
4. Test platform-specific keys (Cmd on macOS, Win on Windows)
5. Test multiple profiles

### Quick-Input Window
1. Test window creation
2. Test always-on-top behavior
3. Test drag and resize
4. Test auto-hide
5. Test theme switching
6. Test on multiple monitors

### Context Detection
1. Test detection in different apps (browser, IDE, Office, file explorer)
2. Test context extraction accuracy
3. Test performance (< 10ms latency)
4. Test privacy controls
5. Test on all platforms

## Timeline Estimate

- **Phase 1 (Ollama Installer)**: 4-6 hours
- **Phase 2 (Global Hotkey)**: 3-4 hours
- **Phase 3 (Quick-Input Window)**: 6-8 hours
- **Phase 4 (Context Detection)**: 8-10 hours

**Total**: 21-28 hours

## Success Criteria

### Ollama Installer
- ✅ User can install Ollama with one click
- ✅ Progress is shown during download and installation
- ✅ Installation is verified
- ✅ Ollama service starts automatically
- ✅ Errors are handled gracefully

### Global Hotkey
- ✅ User can customize hotkeys
- ✅ Conflicts are detected and warned
- ✅ Hotkeys work across all platforms
- ✅ Multiple profiles supported

### Quick-Input Window
- ✅ Window appears on hotkey press
- ✅ Window is always on top
- ✅ Window can be dragged and resized
- ✅ Window auto-hides when focus is lost
- ✅ Context indicator shows current app

### Context Detection
- ✅ Detects focused application in real-time
- ✅ Extracts relevant context per app type
- ✅ Works on Windows, macOS, Linux
- ✅ Performance < 10ms per check
- ✅ Privacy controls work

## Next Steps

1. Start with Phase 1 (Ollama Installer) as it's the most requested feature
2. Implement backend first, then frontend
3. Test thoroughly on target platform
4. Move to Phase 2 once Phase 1 is complete
5. Continue sequentially through phases

## Notes

- Ollama installer URLs:
  - Windows: https://ollama.com/download/OllamaSetup.exe
  - macOS: https://ollama.com/download/Ollama-darwin.zip
  - Linux: curl script from https://ollama.com/install.sh

- Context detection requires platform-specific permissions:
  - Windows: No special permissions
  - macOS: Accessibility permissions required
  - Linux: X11 or Wayland access

- Quick-input window should be lightweight (< 50MB memory)
- Context detection should be non-blocking (async)
