use tauri::{AppHandle, Window, WindowBuilder, WindowUrl};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OcrResultData {
    pub text: String,
    pub language: String,
}

/// Create OCR result popup window in bottom-right corner
#[tauri::command]
pub async fn create_ocr_popup(
    app: AppHandle,
    result: OcrResultData,
) -> Result<(), String> {
    // Popup dimensions
    let popup_width = 400.0;
    let popup_height = 300.0;
    let margin = 20.0;

    // For now, use a fixed position in bottom-right
    // In a real implementation, you'd get the screen dimensions
    // For Windows, typical screen is 1920x1080
    let screen_width = 1920.0;
    let screen_height = 1080.0;

    // Calculate bottom-right position
    let x = screen_width - popup_width - margin;
    let y = screen_height - popup_height - margin - 40.0; // Extra margin for taskbar

    // Create unique window label
    let window_label = format!("ocr-popup-{}", chrono::Utc::now().timestamp_millis());

    // Build the popup window
    // Use "popup.html" for production, but handle dev server URL in development
    let window_url = WindowUrl::App("popup.html".into());
    
    let window = WindowBuilder::new(
        &app,
        window_label,
        window_url,
    )
    .title("OCR Result")
    .inner_size(popup_width, popup_height)
    .position(x, y)
    .resizable(true)
    .decorations(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .focused(true)
    .build()
    .map_err(|e| format!("Failed to create popup window: {}", e))?;

    // Store the OCR result in the window's state
    window
        .emit("ocr-result", &result)
        .map_err(|e| format!("Failed to emit OCR result: {}", e))?;

    Ok(())
}

/// Close a specific popup window
#[tauri::command]
pub async fn close_popup(window: Window) -> Result<(), String> {
    window
        .close()
        .map_err(|e| format!("Failed to close window: {}", e))
}
