use tauri::{AppHandle, Window, WindowBuilder, WindowUrl, Manager};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrResultData {
    pub text: String,
    pub language: String,
}

/// Create OCR result popup window in bottom-right corner
#[tauri::command]
pub async fn create_ocr_popup(
    app: AppHandle,
    result: Option<OcrResultData>,
    progress: Option<OcrProgressData>,
) -> Result<String, String> {
    // Popup dimensions
    let popup_width = 400.0;
    let popup_height = 300.0;
    let margin = 20.0;

    // Get primary monitor to calculate position
    let monitor = app.windows().values().next()
        .and_then(|w| w.primary_monitor().ok().flatten());

    let (screen_width, screen_height) = if let Some(monitor) = monitor {
        let size = monitor.size();
        let scale_factor = monitor.scale_factor();
        // Convert physical pixels to logical pixels for positioning
        ((size.width as f64 / scale_factor), (size.height as f64 / scale_factor))
    } else {
        (1920.0, 1080.0) // Fallback
    };

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
        window_label.clone(),
        window_url,
    )
    .title("OCR Result")
    .inner_size(popup_width, popup_height)
    .position(x, y)
    .resizable(true)
    .decorations(false) // Frameless window
    .transparent(true) // Allow transparency
    .always_on_top(true)
    .skip_taskbar(false)
    .focused(true)
    .build()
    .map_err(|e| format!("Failed to create popup window: {}", e))?;

    // Store the OCR result in the window's state if provided
    // Wait a bit for window to be ready (load HTML/JS)
    // This is crucial so that the window can register event listeners before we send events
    println!("[Rust] create_ocr_popup: Window created, waiting 1s for load...");
    std::thread::sleep(std::time::Duration::from_millis(1000));
    println!("[Rust] create_ocr_popup: Wait complete. Emitting events...");

    if let Some(prog) = progress {
        println!("[Rust] create_ocr_popup: Emitting initial progress: {:?}", prog.stage);
        // Try emit
        if let Err(e) = window.emit("ocr-progress", &prog) {
            println!("[Rust] Failed to emit progress: {}", e);
        }
        // Also try eval for robustness
        if let Ok(json) = serde_json::to_string(&prog) {
            let js = format!("if(window.receiveProgress) window.receiveProgress({})", json);
            let _ = window.eval(&js);
        }
    }

    if let Some(res) = result {
        println!("[Rust] create_ocr_popup: Emitting initial result: {} chars", res.text.len());
        // Try emit
        if let Err(e) = window.emit("ocr-result", &res) {
            println!("[Rust] Failed to emit result: {}", e);
        }
        // Also try eval
        if let Ok(json) = serde_json::to_string(&res) {
            let js = format!("if(window.receiveResult) window.receiveResult({})", json);
            let _ = window.eval(&js);
        }
    }

    println!("[Rust] create_ocr_popup: Events emitted. Returning label.");
    Ok(window_label)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrProgressData {
    pub stage: String,
    pub progress: f64,
    pub message: String,
}

/// Update an existing popup window with progress or result
#[tauri::command]
pub async fn update_ocr_popup(
    app: AppHandle,
    label: String,
    progress: Option<OcrProgressData>,
    result: Option<OcrResultData>,
) -> Result<(), String> {
    if let Some(window) = app.get_window(&label) {
        if let Some(prog) = progress {
            println!("[Rust] update_ocr_popup: Emitting progress: {:?}", prog.stage);
            // Try emit
            let _ = window.emit("ocr-progress", &prog);
            // Try eval
            if let Ok(json) = serde_json::to_string(&prog) {
                let js = format!("if(window.receiveProgress) window.receiveProgress({})", json);
                let _ = window.eval(&js);
            }
        }
        
        if let Some(res) = result {
            println!("[Rust] update_ocr_popup: Emitting result: {} chars", res.text.len());
            // Try emit
            let _ = window.emit("ocr-result", &res);
            // Try eval
            if let Ok(json) = serde_json::to_string(&res) {
                let js = format!("if(window.receiveResult) window.receiveResult({})", json);
                let _ = window.eval(&js);
            }
        }
        Ok(())
    } else {
        println!("[Rust] update_ocr_popup: Window {} not found!", label);
        Err(format!("Window {} not found", label))
    }
}

/// Close a specific popup window
#[tauri::command]
pub async fn close_popup(window: Window) -> Result<(), String> {
    window
        .close()
        .map_err(|e| format!("Failed to close window: {}", e))
}
