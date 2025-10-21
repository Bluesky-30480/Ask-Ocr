# OCR Implementation Decision Document

**Date**: 2025-10-21  
**Status**: Decision Made  
**Decision**: Start with Tesseract.js, add optional local backend later

---

## Evaluation Criteria

| Criteria | Tesseract.js (Frontend) | Local Backend (Python/Rust) |
|----------|-------------------------|------------------------------|
| **Installation** | Zero dependencies | Requires Python/Rust runtime |
| **Binary Size** | ~2MB worker files | +50-200MB (with models) |
| **Setup Complexity** | npm install | Complex (pytesseract/EasyOCR setup) |
| **Offline Capable** | ✅ Yes | ✅ Yes |
| **Performance** | Medium (JavaScript) | Fast (Native) |
| **Accuracy** | Good (Tesseract 4.0) | Better (EasyOCR, modern models) |
| **Multi-language** | ✅ 100+ languages | ✅ 80+ languages |
| **Chinese Support** | ✅ Good | ✅ Excellent |
| **English Support** | ✅ Excellent | ✅ Excellent |
| **Maintenance** | Easy | Complex |
| **UI Blocking** | Non-blocking (Web Worker) | Non-blocking (IPC) |
| **Development Speed** | Fast | Slow |

---

## Decision: Hybrid Approach

### Phase 1: Tesseract.js (Current)
**Why start here:**
- ✅ Zero installation friction for users
- ✅ Cross-platform by default (no native deps)
- ✅ Quick to implement and test
- ✅ Good enough accuracy for most use cases
- ✅ Smaller app bundle size
- ✅ Easier debugging and development

**Limitations:**
- Slower processing speed
- Slightly lower accuracy on complex layouts
- Limited advanced features

### Phase 2: Optional Local Backend (Future)
**When to implement:**
- User demands better accuracy
- Performance becomes a bottleneck
- Advanced features needed (table detection, etc.)

**Implementation plan:**
- Make it optional/downloadable
- Allow users to choose in settings
- Keep Tesseract.js as fallback
- Provide clear performance comparisons

---

## Technical Implementation Strategy

### Tesseract.js Integration
```typescript
// frontend/src/services/ocr/tesseract-ocr.ts
import Tesseract from 'tesseract.js';

// Use Web Worker to prevent UI blocking
const worker = await Tesseract.createWorker({
  logger: (m) => console.log(m), // Progress tracking
});

await worker.loadLanguage('eng+chi_sim');
await worker.initialize('eng+chi_sim');
const result = await worker.recognize(image);
```

### Async Task Queue
```typescript
// Prevent multiple OCR requests from blocking
class OcrTaskQueue {
  private queue: Task[] = [];
  private maxConcurrent = 2;
  
  async add(task: OcrTask): Promise<OcrResult> {
    // Priority queue with cancellation support
  }
}
```

### Future Local Backend
```rust
// src-tauri/src/ocr/mod.rs
#[tauri::command]
async fn ocr_local(image_path: String) -> Result<OcrResult, String> {
  // Call local Python/Rust OCR engine
  // Return structured result
}
```

---

## Performance Targets

| Operation | Tesseract.js | Local Backend |
|-----------|--------------|---------------|
| Small image (800x600) | 2-4 seconds | 0.5-1 second |
| Large image (1920x1080) | 5-8 seconds | 1-2 seconds |
| Full page document | 10-15 seconds | 2-4 seconds |

---

## Multi-language Support

### Priority Languages (Tesseract.js)
1. English (`eng`) - Default
2. Chinese Simplified (`chi_sim`)
3. Chinese Traditional (`chi_tra`)
4. Spanish (`spa`)
5. French (`fra`)
6. German (`deu`)
7. Japanese (`jpn`)
8. Korean (`kor`)

### Language Detection
- Use `langdetect` library or OpenAI API
- Auto-load appropriate Tesseract language pack
- Allow manual language selection in UI

---

## Optimization Strategies

### Image Preprocessing
```typescript
// Before OCR, enhance image quality
- Grayscale conversion
- Contrast enhancement
- Noise reduction
- Deskewing (straighten rotated text)
- Binarization (black/white threshold)
```

### Caching
- Cache OCR results by image hash
- Store in local database
- Avoid re-processing same image

### Progressive Loading
- Show partial results as they arrive
- Display confidence scores
- Allow user to trigger re-scan

---

## Conclusion

**Start simple, optimize later.** Tesseract.js provides the best balance of ease-of-use, performance, and accuracy for an MVP. We can add a local backend as an advanced option once we validate user demand.

---

*This decision can be revisited based on user feedback and performance metrics.*
