# Ask OCR - Component Architecture

## Application Structure

```
AppRouter (Main Navigation)
├── Breadcrumbs (when not on home)
│   ├── Home button
│   ├── Current view name
│   └── Close button
│
└── View Content
    ├── Homepage
    │   ├── Header
    │   │   ├── Title & Subtitle
    │   │   └── Settings Button
    │   │
    │   ├── Quick Actions
    │   │   ├── New OCR (Primary)
    │   │   ├── Quick Chat
    │   │   └── Today's Stats
    │   │
    │   ├── Statistics Grid
    │   │   ├── Total OCRs
    │   │   ├── Chat Sessions
    │   │   └── Connected Apps
    │   │
    │   └── History Section
    │       ├── Tabs (OCR, Chat, Apps)
    │       ├── Search Bar
    │       └── History List
    │           ├── OCR Items
    │           ├── Chat Items
    │           └── App Chat Groups
    │
    ├── SettingsPage
    │   ├── Sidebar
    │   │   ├── Header
    │   │   └── Navigation (7 sections)
    │   │       ├── General ⚙️
    │   │       ├── AI & Models 🤖
    │   │       ├── Keyboard ⌨️
    │   │       ├── Appearance 🎨
    │   │       ├── Popup Windows 🪟
    │   │       ├── Privacy 🔒
    │   │       └── Advanced 🔧
    │   │
    │   └── Content Area
    │       ├── GeneralSettings
    │       │   ├── Language Selection
    │       │   ├── Launch at Login
    │       │   ├── Minimize to Tray
    │       │   └── Notifications
    │       │
    │       ├── AISettings
    │       │   ├── Provider Status
    │       │   ├── Ollama Installation
    │       │   ├── Connection Testing
    │       │   ├── Default Provider
    │       │   └── OpenAI API Key
    │       │
    │       ├── KeyboardSettings
    │       │   ├── Shortcut List (6 default)
    │       │   ├── Live Recorder
    │       │   ├── Reset Button
    │       │   └── Tips Section
    │       │
    │       ├── AppearanceSettings
    │       │   ├── Theme Selector (Light/Dark/Auto)
    │       │   ├── Accent Color Palette (8 colors)
    │       │   ├── Font Size Slider
    │       │   ├── UI Density Selector
    │       │   ├── Transparency Slider
    │       │   └── Animations Toggle
    │       │
    │       ├── PopupCustomizationSettings
    │       │   ├── Window Type Selector (4 types)
    │       │   ├── Features Configuration
    │       │   ├── Custom Profiles
    │       │   └── Per-App Configuration
    │       │
    │       ├── PrivacySettings
    │       │   ├── Context Detection Toggle
    │       │   ├── Application Blacklist
    │       │   ├── Privacy Mode
    │       │   ├── Data Collection
    │       │   └── History Management
    │       │
    │       └── AdvancedSettings
    │           ├── Developer Mode
    │           ├── Performance Settings
    │           ├── OCR Advanced
    │           └── Settings Management
    │
    └── QuickChat
        ├── Sidebar
        │   ├── Header (+ New button)
        │   └── Sessions List
        │       └── Session Items
        │           ├── Title
        │           ├── Message Count
        │           └── Delete Button
        │
        └── Main Chat Area
            ├── Header
            │   ├── Model Selector
            │   └── Export Button
            │
            ├── Messages Area
            │   ├── Chat Messages
            │   │   ├── User Messages
            │   │   └── Assistant Messages
            │   └── Typing Indicator
            │
            └── Input Area
                ├── Textarea
                └── Send Button
```

## Service Layer

```
Services
├── AI Services
│   ├── universal-ai.service.ts
│   │   ├── initialize()
│   │   ├── sendRequest()
│   │   ├── getProviderStatus()
│   │   ├── testConnections()
│   │   └── chat() ⭐ NEW
│   │
│   ├── ollama-manager.service.ts
│   │   ├── getStatus()
│   │   ├── isOllamaRunning()
│   │   └── oneClickInstall()
│   │
│   ├── openai-client.service.ts
│   │   ├── initialize()
│   │   └── testConnection()
│   │
│   └── enhanced-prompt.service.ts
│       └── generatePrompt()
│
├── Context Services
│   ├── active-window-context.service.ts
│   │   └── getActiveContext()
│   │
│   └── context-aware-routing.service.ts
│       └── route()
│
└── Priority Strategy
    └── priority-strategy.service.ts
        └── selectProvider()
```

## Data Flow

```
User Interaction
    │
    ├─── Settings Change
    │    ├─> React State Update
    │    ├─> LocalStorage Save
    │    └─> CSS Variables Update (for appearance)
    │
    ├─── Quick Chat Message
    │    ├─> QuickChat Component
    │    ├─> universalAI.chat()
    │    ├─> UniversalAIService.sendRequest()
    │    ├─> Provider (Ollama/OpenAI)
    │    ├─> Response
    │    ├─> State Update
    │    └─> LocalStorage Save (session)
    │
    ├─── Navigation
    │    ├─> AppRouter State Change
    │    ├─> Breadcrumb Update
    │    └─> View Switch
    │
    └─── New OCR (future)
         ├─> Tauri Command
         ├─> Screenshot Capture
         ├─> OCR Processing
         ├─> Universal AI Processing
         └─> Results Display
```

## State Management

```
Component State (React useState)
├── AppRouter
│   ├── currentView: 'home' | 'settings' | 'quickchat'
│   └── breadcrumbs: string[]
│
├── Homepage
│   ├── activeTab: 'ocr' | 'chats' | 'apps'
│   ├── ocrHistory: OcrHistoryItem[]
│   ├── chatHistory: ChatHistoryItem[]
│   ├── appChats: AppChat[]
│   ├── searchQuery: string
│   └── stats: { totalOcrs, totalChats, totalApps, todayOcrs }
│
├── SettingsPage
│   └── activeSection: 'general' | 'ai' | 'keyboard' | ...
│
├── QuickChat
│   ├── sessions: ChatSession[]
│   ├── currentSessionId: string | null
│   ├── messages: Message[]
│   ├── inputText: string
│   ├── isLoading: boolean
│   └── selectedModel: 'local' | 'openai' | 'perplexity'
│
└── Settings Sections (each has own state)
    └── Values + loading states

LocalStorage
├── Settings
│   ├── app_language
│   ├── auto_start
│   ├── minimize_to_tray
│   ├── notifications
│   ├── openai_api_key
│   ├── default_ai_provider
│   ├── keyboard_shortcuts
│   ├── appearance_theme
│   ├── appearance_accent_color
│   ├── popup_profiles
│   ├── popup_app_configs
│   ├── privacy_blacklisted_apps
│   └── advanced_*
│
├── History
│   ├── ocr_history
│   ├── chat_history
│   └── app_chats
│
└── Quick Chat
    └── quick_chat_sessions
```

## File Structure

```
frontend/src/components/
├── AppRouter/
│   ├── AppRouter.tsx
│   └── AppRouter.css
│
├── Homepage/
│   ├── Homepage.tsx
│   └── Homepage.css
│
├── Settings/
│   ├── SettingsPage.tsx
│   ├── SettingsPage.css
│   └── sections/
│       ├── index.ts ⭐ NEW
│       ├── GeneralSettings.tsx
│       ├── AISettings.tsx
│       ├── KeyboardSettings.tsx
│       ├── AppearanceSettings.tsx
│       ├── PopupCustomizationSettings.tsx
│       ├── PrivacySettings.tsx
│       └── AdvancedSettings.tsx
│
└── QuickChat/
    ├── QuickChat.tsx
    └── QuickChat.css
```

## Integration Points

```
Frontend ←→ Backend (Tauri)
├── Screenshot Capture (future)
│   └── invoke('start_screenshot_capture')
│
├── Context Detection
│   └── invoke('get_active_window_context')
│
└── File System (future)
    ├── invoke('save_ocr_result')
    └── invoke('export_chat')

Frontend ←→ AI Services
├── Ollama (Local)
│   └── HTTP: http://localhost:11434/api/generate
│
├── OpenAI (Remote)
│   └── HTTPS: api.openai.com/v1/chat/completions
│
└── Perplexity (Future)
    └── HTTPS: api.perplexity.ai

Frontend ←→ LocalStorage
├── Settings (all sections)
├── History (OCR, Chat, App)
└── Quick Chat (sessions)
```

## Component Communication

```
Props Flow (Top-Down)
AppRouter
  ├─> Homepage { onOpenSettings, onOpenQuickChat, onNewOcr }
  ├─> SettingsPage (no props)
  └─> QuickChat (no props)

Callback Flow (Bottom-Up)
Homepage
  ├─> onOpenSettings() → AppRouter.navigateTo('settings')
  ├─> onOpenQuickChat() → AppRouter.navigateTo('quickchat')
  └─> onNewOcr() → Trigger screenshot

Service Calls (Anywhere)
Any Component
  ├─> universalAI.chat()
  ├─> universalAI.getProviderStatus()
  ├─> ollamaManager.getStatus()
  └─> ollamaManager.oneClickInstall()
```

---

This architecture provides:
- ✅ **Clean separation** of concerns
- ✅ **Reusable components**
- ✅ **Type-safe** props and state
- ✅ **Flexible navigation**
- ✅ **Service abstraction**
- ✅ **Persistent state**
