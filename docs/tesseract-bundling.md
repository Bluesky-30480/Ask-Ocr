# Tesseract.js Bundling Strategy for Offline EXE

**Purpose**: Ensure OCR works offline in packaged .exe without internet connection  
**Priority**: 🔴 CRITICAL - Required before first release  
**Last Updated**: 2025-10-21

---

## Problem

Tesseract.js by default downloads language data files (.traineddata) and worker files from CDN at runtime. This won't work in a packaged desktop app without internet connection.

---

## Solution Overview

Bundle all required Tesseract.js assets into the application:
1. **Language files** (.traineddata) - OCR language models
2. **Worker files** (worker.min.js) - Web Worker scripts
3. **Core files** (tesseract-core.wasm.js) - WASM engine

---

## Implementation Plan

### Phase 1: Bundle Language Files (CRITICAL)

#### 1.1 Download Language Files
Download .traineddata files for supported languages:
- English (eng.traineddata) - ~10MB
- Chinese Simplified (chi_sim.traineddata) - ~25MB
- Chinese Traditional (chi_tra.traineddata) - ~24MB
- Japanese (jpn.traineddata) - ~15MB
- Korean (kor.traineddata) - ~12MB
- Spanish (spa.traineddata) - ~10MB
- French (fra.traineddata) - ~9MB
- German (deu.traineddata) - ~9MB

Source: https://github.com/naptha/tessdata/tree/gh-pages/4.0.0

#### 1.2 Store in Tauri Resources
```
src-tauri/
└── resources/
    └── tessdata/
        ├── eng.traineddata
        ├── chi_sim.traineddata
        ├── chi_tra.traineddata
        ├── jpn.traineddata
        ├── kor.traineddata
        ├── spa.traineddata
        ├── fra.traineddata
        └── deu.traineddata
```

#### 1.3 Update tauri.conf.json
```json
{
  "tauri": {
    "bundle": {
      "resources": [
        "resources/tessdata/*"
      ]
    }
  }
}
```

#### 1.4 Configure Tesseract.js to Use Local Files
In `frontend/src/services/ocr/tesseract-ocr.service.ts`:

```typescript
import { resolveResource } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';

async initialize(language = 'eng'): Promise<void> {
  // Get resource path
  const langPath = await resolveResource(`resources/tessdata/${language}.traineddata`);
  const langUrl = convertFileSrc(langPath);
  
  // Create worker with local language file
  this.worker = await createWorker(language, undefined, {
    langPath: dirname(langUrl), // Directory containing .traineddata files
    logger: (m) => console.log('[Tesseract]', m),
  });
}
```

---

### Phase 2: Bundle Worker Files

#### 2.1 Copy Worker Files to Public
Tesseract.js worker files need to be accessible via HTTP:

```bash
# Copy from node_modules to public directory
cp node_modules/tesseract.js/dist/worker.min.js frontend/public/
cp node_modules/tesseract.js/dist/worker.min.js.map frontend/public/
```

Or use Vite to copy during build (in `vite.config.ts`):
```typescript
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/tesseract.js/dist/worker.min.js*',
          dest: 'tessdata'
        }
      ]
    })
  ]
});
```

#### 2.2 Configure Worker Path
```typescript
this.worker = await createWorker(language, undefined, {
  workerPath: '/tessdata/worker.min.js',
  langPath: langUrl,
  logger: (m) => console.log('[Tesseract]', m),
});
```

---

### Phase 3: Bundle Core WASM Files

#### 3.1 Copy Core Files
```bash
cp node_modules/tesseract.js-core/tesseract-core.wasm.js frontend/public/
```

#### 3.2 Configure Core Path
```typescript
this.worker = await createWorker(language, undefined, {
  corePath: '/tesseract-core.wasm.js',
  workerPath: '/tessdata/worker.min.js',
  langPath: langUrl,
  logger: (m) => console.log('[Tesseract]', m),
});
```

---

## Alternative: Vite Plugin Approach

Use `vite-plugin-static-copy` to automate copying:

```bash
npm install -D vite-plugin-static-copy
```

```typescript
// vite.config.ts
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // Copy worker files
        {
          src: 'node_modules/tesseract.js/dist/worker.min.js*',
          dest: 'tessdata'
        },
        // Copy core WASM
        {
          src: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
          dest: ''
        }
      ]
    })
  ]
});
```

---

## Testing Checklist

### Development Testing
- [ ] OCR works in dev mode (`npm run tauri dev`)
- [ ] Language switching works without internet
- [ ] Worker loads from local files
- [ ] No 404 errors in console for .traineddata files

### Production Testing
- [ ] Build app (`npm run tauri build`)
- [ ] Disconnect from internet
- [ ] Run packaged .exe
- [ ] Test OCR with all bundled languages
- [ ] Verify no network requests in console
- [ ] Check app size (should be ~150-200MB with all languages)

---

## File Size Considerations

| Component | Size | Notes |
|-----------|------|-------|
| Base app | ~50MB | Tauri + React + deps |
| English lang | ~10MB | Essential |
| CJK langs (3) | ~64MB | Chinese + Japanese + Korean |
| European langs (4) | ~37MB | Spanish, French, German, Italian |
| Worker + Core | ~2MB | JavaScript and WASM |
| **Total** | **~163MB** | All 8 languages |

### Optimization Options
1. **Minimal Build**: English only (~62MB total)
2. **CJK Build**: English + Chinese + Japanese + Korean (~126MB)
3. **Full Build**: All 8 languages (~163MB)
4. **On-Demand Download**: User downloads languages in-app after install

---

## Implementation Priority

1. ✅ **High Priority** (Before v0.1.0):
   - Bundle English language file
   - Bundle worker and core files
   - Test in packaged app offline
   
2. 🔄 **Medium Priority** (Before v0.2.0):
   - Bundle CJK language files (Chinese, Japanese, Korean)
   - Add language management UI
   - Implement on-demand language download
   
3. ⏳ **Low Priority** (Future):
   - Bundle all European languages
   - Compressed language files
   - Language pack installer

---

## Code Example: Complete Implementation

```typescript
// frontend/src/services/ocr/tesseract-ocr.service.ts
import { createWorker, PSM } from 'tesseract.js';
import type { Worker, RecognizeResult } from 'tesseract.js';
import { resolveResource } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';

export class TesseractOcrService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguage = 'eng';

  async initialize(language = 'eng'): Promise<void> {
    if (this.isInitialized && this.currentLanguage === language) {
      return;
    }

    try {
      if (this.worker) {
        await this.worker.terminate();
      }

      // Get local language file path
      const resourcePath = await resolveResource(`resources/tessdata/${language}.traineddata`);
      const langUrl = convertFileSrc(resourcePath);
      const langDir = langUrl.substring(0, langUrl.lastIndexOf('/'));

      // Create worker with local resources
      this.worker = await createWorker(language, undefined, {
        langPath: langDir,
        corePath: '/tesseract-core.wasm.js',
        workerPath: '/tessdata/worker.min.js',
        gzip: false, // Local files are not gzipped
        logger: (m) => console.log('[Tesseract]', m),
      });

      this.isInitialized = true;
      this.currentLanguage = language;
      
      console.log(`✅ Tesseract OCR initialized with language: ${language} (offline mode)`);
    } catch (error) {
      console.error('❌ Failed to initialize Tesseract:', error);
      throw new Error(`OCR initialization failed: ${error}`);
    }
  }

  async recognize(imageData: string | File): Promise<RecognizeResult> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const result = await this.worker.recognize(imageData);
      return result;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}
```

---

## Related Files

- `frontend/src/services/ocr/tesseract-ocr.service.ts` - OCR service implementation
- `frontend/vite.config.ts` - Vite bundler configuration
- `src-tauri/tauri.conf.json` - Tauri app configuration
- `src-tauri/resources/tessdata/` - Language data directory
- `tobefix.md` - Issue tracking (Item #5)

---

## References

- Tesseract.js Documentation: https://tesseract.projectnaptha.com/
- Trained Data Files: https://github.com/naptha/tessdata
- Tauri Resources: https://tauri.app/v1/guides/features/resources
- Vite Static Assets: https://vitejs.dev/guide/assets.html
