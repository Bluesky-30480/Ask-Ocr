# To Be Fixed - Issues and Warnings

**Last Updated**: 2025-10-21

---

## 🔴 Critical Errors

### 1. Missing tesseract.js dependency
**File**: `frontend/src/services/ocr/tesseract-ocr.service.ts:7`  
**Error**: Cannot find module 'tesseract.js' or its corresponding type declarations.  
**Fix**: Run `npm install` in frontend directory to install tesseract.js  
**Status**: ⏳ Pending - need to run npm install

---

## 🟡 TypeScript Warnings

### 2. Implicit any type for logger parameter
**File**: `frontend/src/services/ocr/tesseract-ocr.service.ts:43`  
**Warning**: Parameter 'm' implicitly has an 'any' type  
**Fix**: Add explicit type annotation: `logger: (m: any) => {` or use proper Tesseract logger type  
**Status**: ⏳ To be fixed

### 3. Unused variable 'result'
**File**: `frontend/src/services/ocr/tesseract-ocr.service.ts:141`  
**Warning**: 'result' is declared but its value is never read  
**Fix**: Remove unused variable or use it for language detection logic  
**Status**: ⏳ To be fixed

### 4. Unused import 'AsyncTaskStatus'
**File**: `frontend/src/services/task-queue.service.ts:6`  
**Warning**: 'AsyncTaskStatus' is declared but never used  
**Fix**: Remove from import or use in type annotations  
**Status**: ⏳ To be fixed

---

## 📦 EXE Packaging Considerations

### 5. Tesseract.js Language Data Bundling
**Issue**: Tesseract.js downloads language data at runtime - won't work in packaged EXE without network  
**Impact**: Critical - OCR won't work offline in packaged app  
**Fix Required**:
- Bundle language files (.traineddata) into the app package
- Configure Tesseract.js to use local language files from app resources
- Add language files to Tauri's resources directory
- Set custom `langPath` and `corePath` in Tesseract worker config  
**Status**: 🔴 CRITICAL - Must fix before packaging

### 6. Tesseract Worker Files
**Issue**: Tesseract.js uses web workers that need to be properly bundled  
**Impact**: Medium - Workers may not load in packaged app  
**Fix Required**:
- Ensure worker files are included in Vite build
- Configure proper worker paths for production
- Test in packaged environment  
**Status**: ⚠️ To verify in production build

---

## 🎯 Architecture Notes for EXE Users

### Requirements for Smooth EXE Experience:
1. ✅ **No Python/Node.js runtime required** - Using Tesseract.js (pure JavaScript)
2. ⏳ **Pre-bundle OCR language files** - Include common languages in installer
3. ⏳ **Self-contained models** - AI models should be downloadable within app
4. ⏳ **One-click install** - No manual setup steps for users
5. ⏳ **Offline-first** - Core OCR must work without internet
6. ⏳ **Auto-updater** - Seamless updates without reinstalling

### Model Management for EXE:
- Store models in `%APPDATA%\AskOCR\models\` (Windows) or `~/Library/Application Support/AskOCR/models/` (macOS)
- Provide in-app model downloader with progress bars
- Verify model integrity with SHA-256 hashes
- Allow model deletion to free space
- Clear error messages if model loading fails

---

## 📝 Development TODOs

### Before Next Commit:
- [ ] Fix TypeScript warnings (items 2, 3, 4)
- [ ] Document Tesseract.js bundling strategy
- [ ] Test if npm install resolves tesseract.js error

### Before First Release:
- [ ] Bundle Tesseract.js language files
- [ ] Configure Tesseract for offline operation
- [ ] Test packaged EXE on clean Windows machine
- [ ] Test packaged app on clean macOS machine
- [ ] Create installer with all dependencies

---

## 🔍 Testing Checklist for Packaged App

- [ ] OCR works without internet connection
- [ ] Language switching works in offline mode
- [ ] App starts without external dependencies
- [ ] File paths work correctly (not referencing dev paths)
- [ ] Models download and install successfully
- [ ] Global shortcuts register properly
- [ ] System tray icon displays correctly
- [ ] App persists settings between restarts

---

*This document tracks all issues to be resolved. Update after each fix.*
