# Testing Guide for Bug Fixes

## Prerequisites

1. Make sure both dev servers are running:
   ```bash
   # Terminal 1 - Frontend
   cd frontend
   npm run dev
   
   # Terminal 2 - Tauri
   npm run tauri:dev
   ```

2. Wait for both to fully start before testing

## Test 1: Keyboard Shortcut Recording

### Steps:
1. Open the app
2. Navigate to Settings → Keyboard Shortcuts
3. Find any shortcut (e.g., "Take Screenshot")
4. Click the "Record" button
5. Press a combination with letters/numbers:
   - Try: `Ctrl + A`
   - Try: `Ctrl + Shift + 5`
   - Try: `Alt + F1`
   - Try: `Ctrl + Alt + Z`

### Expected Result:
- ✅ All keys should be captured and displayed
- ✅ The shortcut should show: "Ctrl + A", "Ctrl + Shift + 5", etc.
- ✅ No more "only modifier keys" issue

### If It Fails:
- Check browser console for errors
- Verify the files were updated correctly
- Try refreshing the app

## Test 2: Region Capture

### Steps:
1. Click the "New OCR" button on the homepage
2. Wait for the overlay to appear

### Expected Result:
- ✅ Fullscreen dark overlay appears
- ✅ Instructions shown at bottom: "Click and drag to select a region • Press ESC to cancel"

### Steps (continued):
3. Click and drag to select a region
4. Watch the selection rectangle appear
5. See dimensions displayed (e.g., "300 × 200")
6. Release mouse button

### Expected Result:
- ✅ Selection is captured
- ✅ OCR processing starts
- ✅ Popup window appears with results

### Test ESC Key:
1. Click "New OCR" again
2. Press ESC key before selecting

### Expected Result:
- ✅ Overlay closes without capturing

## Test 3: Popup Window (OS-Level)

### Steps:
1. Complete an OCR capture (using region or fullscreen)
2. Wait for processing to complete

### Expected Result:
- ✅ A new window appears in the **bottom-right corner of your screen**
- ✅ Window is **outside the main app** (separate OS window)
- ✅ Window has a beautiful gradient purple background
- ✅ Window shows the OCR text
- ✅ Window is always on top of other windows

### Test Copy Button:
1. Click the "📋 Copy" button in the popup

### Expected Result:
- ✅ Toast message: "Copied to clipboard!"
- ✅ Text is in clipboard (paste somewhere to verify)

### Test Save Button:
1. Click the "💾 Save" button in the popup

### Expected Result:
- ✅ Toast message: "Saved to history!"
- ✅ Record saved to database

### Test Close:
1. Click the X button in top-right
   - OR -
2. Press ESC key

### Expected Result:
- ✅ Popup window closes

### Test Resize:
1. Drag the edges/corners of the popup window

### Expected Result:
- ✅ Window can be resized

## Test 4: Multiple Popups

### Steps:
1. Capture OCR result #1 → Popup appears
2. Don't close it
3. Capture OCR result #2 → Another popup appears
4. Don't close it
5. Capture OCR result #3 → Another popup appears

### Expected Result:
- ✅ Multiple popup windows can exist simultaneously
- ✅ Each shows different OCR results
- ⚠️ They may overlap (known limitation)

## Common Issues & Solutions

### Issue: "Region is required" error
**Solution**: This should be fixed. If you still see it, make sure you're using the updated code.

### Issue: Popup appears inside app instead of separate window
**Solution**: 
- Check if `create_ocr_popup` command is registered in `main.rs`
- Check browser console for errors
- Verify `popup.html` exists in `frontend/` directory

### Issue: Overlay doesn't appear
**Solution**:
- Check if `ScreenshotOverlay.css` exists
- Check browser console for errors
- Verify `showRegionSelector` state is being set

### Issue: Keys not recording
**Solution**:
- Clear browser cache
- Restart dev servers
- Check if the updated code is loaded

## Verification Checklist

- [ ] Keyboard shortcuts record alphabet keys (a-z)
- [ ] Keyboard shortcuts record number keys (0-9)
- [ ] Keyboard shortcuts record function keys (F1-F12)
- [ ] Region selector overlay appears
- [ ] Can select region by dragging
- [ ] ESC cancels region selection
- [ ] Popup appears as separate OS window
- [ ] Popup is in bottom-right corner
- [ ] Popup is always on top
- [ ] Copy button works
- [ ] Save button works
- [ ] Close button works
- [ ] ESC closes popup
- [ ] Multiple popups can exist

## Success Criteria

All items in the verification checklist should be checked ✅

If any fail, refer to the "Common Issues & Solutions" section or check the implementation files.
