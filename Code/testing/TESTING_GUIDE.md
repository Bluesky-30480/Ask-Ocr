# Quick Test Guide - Universal AI Assistant

## 🧪 Testing the Universal AI Assistant

### Prerequisites
1. ✅ Application is running
2. ✅ At least one AI provider configured (Ollama or OpenAI)

## 📝 Test Scenarios

### Test 1: Basic Activation
**Steps:**
1. Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
2. Floating window should appear
3. Should show "Unknown" or current app name

**Expected Result:**
- ✅ Window appears centered
- ✅ Context indicator shows current app
- ✅ Welcome message displayed

---

### Test 2: Context Detection - Browser
**Setup:**
1. Open a web browser (Chrome, Firefox, Edge)
2. Navigate to any webpage
3. Press `Ctrl+Shift+A`

**Expected Result:**
- ✅ Context shows: 🌐 + Browser name
- ✅ Assistant mode: "Web Research"
- ✅ Routing badge shows: `ocr_qa`

**Test Query:**
```
"Summarize this webpage"
```

**Expected Response:**
- Uses web research template
- Routes to available AI provider
- Returns summary (if content available)

---

### Test 3: Context Detection - Code Editor
**Setup:**
1. Open VS Code (or any code editor)
2. Open a code file
3. Press `Ctrl+Shift+A`

**Expected Result:**
- ✅ Context shows: 💻 + Editor name
- ✅ Assistant mode: "Code Assistant"
- ✅ Routing badge shows: `ocr_technical`

**Test Query:**
```
"Explain what a React component is"
```

**Expected Response:**
- Uses technical template
- Provides code-focused explanation

---

### Test 4: Math Content Detection
**Setup:**
1. Open any app
2. Press `Ctrl+Shift+A`

**Test Query:**
```
"What is ∫(x² + 2x + 1)dx ?"
```

**Expected Result:**
- ✅ Detects math symbols (∫)
- ✅ Routes to `ocr_math` template
- ✅ Provides LaTeX formatted answer
- ✅ Shows solution steps

---

### Test 5: Code Content Detection
**Setup:**
1. Open any app
2. Press `Ctrl+Shift+A`

**Test Query:**
```
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}

Explain this code
```

**Expected Result:**
- ✅ Detects code content (function keyword)
- ✅ Routes to `ocr_technical` template
- ✅ Provides code explanation

---

### Test 6: Provider Selection - Local
**Setup:**
1. Ensure Ollama is running: `ollama serve`
2. Ensure a model is installed: `ollama pull llama2`
3. Open assistant

**Test Query:**
```
"Hello, test message"
```

**Check Console:**
```javascript
// Should see:
AI Response from local/llama2: ...
```

**Expected Result:**
- ✅ Uses local Ollama
- ✅ No internet required
- ✅ Fast response (local processing)

---

### Test 7: Provider Fallback
**Setup:**
1. Stop Ollama: Close Ollama app
2. Configure OpenAI API key
3. Open assistant

**Test Query:**
```
"Test fallback to OpenAI"
```

**Expected Result:**
- ✅ Attempts local (fails)
- ✅ Falls back to OpenAI
- ✅ Response received
- ✅ Console shows fallback message

---

### Test 8: Settings Panel
**Steps:**
1. Open assistant (`Ctrl+Shift+A`)
2. Click ⚙️ Settings button
3. Verify provider status display

**Expected Result:**
- ✅ Modal opens
- ✅ Shows provider status (🟢/🔴)
- ✅ Can enter OpenAI API key
- ✅ Can test connections
- ✅ Can save settings

**Test Save:**
1. Enter API key: `sk-test123...`
2. Click "💾 Save Settings"
3. Reload page
4. Settings should persist

---

### Test 9: Message History
**Steps:**
1. Send multiple messages:
   - "Hello"
   - "What is AI?"
   - "How does it work?"

**Expected Result:**
- ✅ All messages shown in order
- ✅ User messages (right, gradient)
- ✅ Assistant messages (left, bordered)
- ✅ Timestamps displayed
- ✅ Auto-scrolls to latest

---

### Test 10: Window Controls
**Steps:**
1. Drag header → Move window
2. Click minimize → Should collapse
3. Click maximize → Should expand
4. Click close → Should hide

**Expected Result:**
- ✅ Dragging works smoothly
- ✅ Minimized shows only header
- ✅ Maximize restores full view
- ✅ Close hides window (not destroyed)

---

## 🔍 Debugging

### Check Provider Status
```javascript
// In browser console
const { universalAI } = await import('./services/ai/universal-ai.service');
const status = await universalAI.getProviderStatus();
console.log('Provider Status:', status);
// Expected: { local: true/false, openai: true/false, ... }
```

### Check Context Detection
```javascript
const { activeWindowContext } = await import('./services/context/active-window-context.service');
const context = activeWindowContext.getCurrentContext();
console.log('Current Context:', context);
// Should show: app type, name, window title, etc.
```

### Test Routing
```javascript
const { contextAwareRouting } = await import('./services/context/context-aware-routing.service');
const decision = contextAwareRouting.route(context, "test query");
console.log('Routing Decision:', decision);
// Shows: template, reason, confidence
```

## ⚠️ Common Issues

### Issue: "Ollama is not running"
**Fix:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### Issue: "OpenAI request failed"
**Check:**
- API key is valid (starts with `sk-`)
- Internet connection works
- No rate limits exceeded
- API key has credits

### Issue: Context shows "Unknown"
**Reasons:**
- App not in supported list
- Permissions not granted (macOS)
- Backend commands not registered

**Fix:**
```bash
# Rebuild Tauri backend
cd src-tauri
cargo build
```

### Issue: No response from AI
**Debug:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Verify provider status

## 📊 Performance Benchmarks

### Expected Timing
- **Context Detection**: < 10ms
- **Routing Decision**: < 5ms
- **Local AI (Ollama)**: 50-200ms first token
- **Cloud AI (OpenAI)**: 300-800ms first token
- **UI Update**: < 16ms (60fps)

### Memory Usage
- **Idle**: ~30MB
- **With History (10 msgs)**: ~35MB
- **Active Streaming**: ~40MB

## ✅ Success Criteria

All tests pass when:
- [x] Hotkey activates assistant
- [x] Context correctly detected
- [x] Routing selects appropriate template
- [x] AI providers work (local or cloud)
- [x] Fallback chain functions
- [x] UI responsive and smooth
- [x] Settings persist
- [x] No console errors
- [x] Memory usage stable

## 📸 Screenshots Expected

1. **Welcome Screen**: Empty history, context indicator
2. **Active Conversation**: Multiple messages, timestamps
3. **Settings Panel**: Provider status, API key input
4. **Context Detection**: Different icons for different apps
5. **Routing Display**: Template badge with confidence

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Mark "Integration" task as complete
2. ✅ Update documentation with findings
3. ✅ Create user tutorial video
4. ✅ Prepare for beta testing
5. ✅ Move to Settings Page development

If tests fail:
1. Document failure scenario
2. Check INTEGRATION_CHECKLIST.md
3. Review console errors
4. Fix bugs before proceeding
