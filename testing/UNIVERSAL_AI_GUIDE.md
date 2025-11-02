# Universal AI Assistant - Setup & Usage Guide

## 🎯 Overview

The Universal AI Assistant is a **context-aware** floating AI helper that automatically adapts to your active application. It intelligently routes your queries to the most appropriate AI model based on what you're working on.

## ✨ Features

### Context Detection
- **13 Application Types Supported:**
  - 🌐 Browsers (Chrome, Firefox, Edge, Safari)
  - 💻 Code Editors (VS Code, IntelliJ, Sublime)
  - 📝 Office Apps (Word, Excel, PowerPoint)
  - ✉️ Email Clients (Outlook, Thunderbird)
  - 📄 PDF Readers
  - 📁 File Explorers
  - ⚡ Terminals (PowerShell, Bash, Zsh)
  - And more!

- **Platform Support:**
  - ✅ Windows (Win32 APIs)
  - ✅ macOS (NSWorkspace, Accessibility API)
  - ✅ Linux (X11)

### Intelligent Routing
The assistant automatically selects the best AI template based on:
- Active application type
- Content analysis (math, code, academic keywords)
- User query intent
- Available AI providers

**Routing Examples:**
- Browser → `ocr_qa` (Web research & Q&A)
- Code Editor → `ocr_technical` (Programming assistance)
- Word → `ocr_business` (Business writing)
- PDF Reader → `ocr_academic` (Research & analysis)
- Math content → `ocr_math` (LaTeX conversion)

### AI Provider Support
- **Local (Ollama)**: Privacy-first, runs on your machine
- **OpenAI**: GPT models with cloud API
- **Custom Models**: Import your own GGUF/GGML models
- **Perplexity**: (Coming soon)

## 🚀 Quick Start

### 1. Install Ollama (Optional - for local AI)

**Windows:**
```powershell
# Download from https://ollama.com/download
# Or use winget
winget install Ollama.Ollama
```

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Pull a model:**
```bash
ollama pull llama2
# or
ollama pull mistral
ollama pull codellama
```

### 2. Configure OpenAI (Optional - for cloud AI)

1. Get API key from https://platform.openai.com/api-keys
2. Open Universal Assistant (`Ctrl+Shift+A`)
3. Click ⚙️ Settings button
4. Enter your API key
5. Click "💾 Save Settings"

### 3. Launch the Assistant

**Keyboard Shortcut:**
```
Ctrl+Shift+A (Windows/Linux)
Cmd+Shift+A (macOS)
```

## 💡 Usage Examples

### Example 1: Web Research
```
1. Open your browser
2. Press Ctrl+Shift+A
3. Context detected: "🌐 Web Research"
4. Ask: "Summarize this article"
   → Routes to ocr_qa template
```

### Example 2: Code Help
```
1. Open VS Code
2. Select some code
3. Press Ctrl+Shift+A
4. Context detected: "💻 Code Assistant"
5. Ask: "Explain this function"
   → Routes to ocr_technical template
```

### Example 3: Document Writing
```
1. Open Word
2. Press Ctrl+Shift+A
3. Context detected: "📝 Writing Helper"
4. Ask: "Improve this paragraph"
   → Routes to ocr_business template
```

## ⚙️ Configuration

### AI Provider Priority

The assistant uses this fallback chain:
1. **Local (Ollama)** - If running
2. **OpenAI** - If API key configured
3. **Custom Models** - If imported
4. **Perplexity** - If configured

Override in settings or force provider per request.

### Privacy Settings

Configure which apps to monitor:
```typescript
// In active-window-context.service.ts
const options = {
  disabledApps: ['Password Manager', 'Banking App'],
  privacyMode: true, // Disable sensitive data capture
  refreshRate: 100, // ms between updates
};
```

### Template Customization

Add custom routing rules:
```typescript
// In context-aware-routing.service.ts
contextAwareRouting.addRule({
  appTypes: ['browser'],
  condition: (ctx) => ctx.windowTitle.includes('GitHub'),
  template: 'ocr_technical',
  priority: 95,
  reason: 'GitHub detected - using code template',
});
```

## 🎨 UI Features

### Floating Window
- **Draggable**: Click and drag the header
- **Resizable**: (Coming soon)
- **Always-on-top**: Stays above other windows
- **Auto-hide**: Hide on focus loss

### Context Indicator
Shows current app and AI mode:
```
🌐 Google Chrome
   Web Research
```

### Routing Display
```
[ocr_qa] 85% confident
```

### Message History
- Conversation memory
- Timestamps
- User/assistant messages
- Auto-scroll to latest

## 🔧 Troubleshooting

### "Ollama is not running"
```bash
# Start Ollama service
ollama serve

# Or on Windows, start Ollama from Start menu
```

### "OpenAI request failed"
- Check API key is valid
- Verify internet connection
- Check OpenAI service status
- Review rate limits

### "No providers available"
- Install and start Ollama, OR
- Configure OpenAI API key
- Check provider status in settings

### Context not detected
- Grant accessibility permissions (macOS)
- Run as administrator (Windows)
- Check app is in supported list

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Universal Assistant UI Component      │
│   - Floating window                     │
│   - Context indicator                   │
│   - Message history                     │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │  Universal AI   │
        │    Service      │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Ollama │  │OpenAI  │  │Custom  │
│ Local  │  │ Cloud  │  │ Models │
└────────┘  └────────┘  └────────┘
```

### Service Flow

1. **Context Detection** (100ms refresh)
   - Platform-specific APIs detect active window
   - Extract app type, window title, selected text
   - Monitor for changes

2. **Intelligent Routing**
   - Map app type → template
   - Analyze content (math/code/academic)
   - Apply priority rules
   - Select best template

3. **Prompt Generation**
   - Load enhanced template
   - Inject context variables
   - Add conversation history
   - Format for AI provider

4. **Provider Selection**
   - Check local-first strategy
   - Validate provider availability
   - Select optimal model
   - Build fallback chain

5. **AI Request**
   - Send to selected provider
   - Handle streaming (if supported)
   - Process response
   - Update conversation

## 📊 Performance

- **Context Detection**: ~5ms per check
- **Routing Decision**: ~1ms
- **Ollama (Local)**: 10-100ms first token
- **OpenAI (Cloud)**: 200-500ms first token
- **Memory Usage**: ~50MB (assistant only)

## 🔐 Privacy & Security

### Data Handling
- Context detection runs **locally**
- No data sent without explicit query
- Local AI models = complete privacy
- OpenAI: Review their privacy policy

### Sensitive Apps
Configure apps to ignore:
```typescript
disabledApps: [
  'password',
  'bank',
  'wallet',
  'keepass',
]
```

### Storage
- API keys: localStorage (encrypted recommended)
- Conversation: In-memory only
- Settings: Local database

## 🛣️ Roadmap

- [ ] Real streaming support
- [ ] Voice input/output
- [ ] Multi-language UI
- [ ] Browser extension integration
- [ ] Mobile companion app
- [ ] Shared context across devices
- [ ] Plugin system

## 📝 API Reference

### UniversalAIService

```typescript
// Send request
const response = await universalAI.sendRequest({
  query: "Your question",
  context: applicationContext,
  ocrText?: "OCR extracted text",
  forceProvider?: 'local' | 'openai',
  forceTemplate?: 'ocr_technical',
});

// Streaming
await universalAI.sendStreamingRequest(request, (chunk) => {
  console.log(chunk.content);
});

// Check status
const status = await universalAI.getProviderStatus();
// { local: true, openai: true, custom: false }
```

### Context Detection

```typescript
// Start monitoring
await activeWindowContext.startMonitoring();

// Get current context
const context = activeWindowContext.getCurrentContext();

// Listen for changes
activeWindowContext.addListener((newContext) => {
  console.log('App changed:', newContext.name);
});

// Stop monitoring
activeWindowContext.stopMonitoring();
```

### Routing Service

```typescript
// Route based on context
const decision = contextAwareRouting.route(context, query);
// { template: 'ocr_qa', reason: '...', confidence: 0.9 }

// Generate prompt
const prompts = await contextAwareRouting.generateContextAwarePrompt(
  context,
  query,
  ocrText
);
```

## 🤝 Contributing

See `lists.md` for current tasks and priorities.

## 📄 License

MIT License - See LICENSE file for details.
